/**
 * Standard LangExtract Service with Python
 * 
 * This service calls the Python LangExtract implementation
 * for document extraction, following the templates and parameters
 * defined in the /lib folder.
 */

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

export interface ProcessingResult {
  metadata: {
    processed_date: string;
    original_filename: string;
    processing_time_ms: number;
  };
  extraction: {
    Basic_Information: any;
    Summary: any;
    Details: any;
  };
  citations: any[];
}

/**
 * Save processing result to file
 */
export async function saveResultToFile(result: ProcessingResult, originalFilename: string): Promise<string> {
  const resultsDir = path.join(__dirname, '../../../results');
  
  // Ensure results directory exists
  await fs.mkdir(resultsDir, { recursive: true });
  
  // Generate filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const baseFilename = path.basename(originalFilename, path.extname(originalFilename));
  const resultFilename = `${baseFilename}_${timestamp}.json`;
  const resultPath = path.join(resultsDir, resultFilename);
  
  // Save result to file
  await fs.writeFile(resultPath, JSON.stringify(result, null, 2));
  
  return resultPath;
}

/**
 * Process document using Python LangExtract with Gemini
 */
export async function processDocumentWithStandardLangExtract(
  documentText: string,
  filename: string
): Promise<ProcessingResult> {
  const startTime = Date.now();
  
  return new Promise((resolve, reject) => {
    // Path to Python script (using absolute paths)
    const pythonScriptPath = '/Users/w/Downloads/apps/s3/python/langextract_service.py';
    const pythonPath = '/Users/w/Downloads/apps/s3/venv/bin/python';
    
    // Spawn Python process
    const pythonProcess = spawn(pythonPath, [pythonScriptPath]);
    
    let outputData = '';
    let errorData = '';
    
    // Handle stdout data
    pythonProcess.stdout.on('data', (data) => {
      outputData += data.toString();
    });
    
    // Handle stderr data
    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
    });
    
    // Handle process close
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('Python process error:', errorData);
        reject(new Error(`Python process exited with code ${code}: ${errorData}`));
        return;
      }
      
      try {
        const result = JSON.parse(outputData);
        
        // Check for errors from Python
        if (result.error) {
          reject(new Error(result.error));
          return;
        }
        
        // Format the result
        const processingResult: ProcessingResult = {
          metadata: {
            processed_date: new Date().toISOString(),
            original_filename: filename,
            processing_time_ms: Date.now() - startTime
          },
          extraction: {
            Basic_Information: result.Basic_Information || {},
            Summary: result.Summary || {},
            Details: result.Details || {}
          },
          citations: result.citations || []
        };
        
        resolve(processingResult);
      } catch (err) {
        console.error('Failed to parse Python output:', outputData);
        reject(new Error(`Failed to parse Python output: ${err}`));
      }
    });
    
    // Handle process error
    pythonProcess.on('error', (err) => {
      reject(new Error(`Failed to start Python process: ${err}`));
    });
    
    // Send input data with optional instructions
    const inputData = {
      document_text: documentText,
      api_key: process.env.GEMINI_API_KEY,
      instructions: null // Can be customized if needed
    };
    
    pythonProcess.stdin.write(JSON.stringify(inputData));
    pythonProcess.stdin.end();
  });
}