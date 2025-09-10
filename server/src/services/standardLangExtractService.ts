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
  original_langextract?: {
    extractions: any[];
    metadata: any;
  };
}

/**
 * Save processing result to file - creates two separate files:
 * 1. RAW_[filename]_[timestamp].json - contains original LangExtract output
 * 2. FORMATTED_[filename]_[timestamp].json - contains transformed/formatted output
 */
export async function saveResultToFile(result: ProcessingResult, originalFilename: string): Promise<string> {
  const resultsDir = path.join(__dirname, '../../../results');

  // Ensure results directory exists
  await fs.mkdir(resultsDir, { recursive: true });

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const baseFilename = path.basename(originalFilename, path.extname(originalFilename));

  // Save RAW LangExtract output if available
  if (result.original_langextract) {
    const rawFilename = `RAW_${baseFilename}_${timestamp}.json`;
    const rawPath = path.join(resultsDir, rawFilename);
    await fs.writeFile(rawPath, JSON.stringify(result.original_langextract, null, 2));
  }

  // Create formatted result without the original_langextract field
  const formattedResult = {
    metadata: result.metadata,
    extraction: result.extraction,
    citations: result.citations
  };

  // Save FORMATTED output
  const formattedFilename = `FORMATTED_${baseFilename}_${timestamp}.json`;
  const formattedPath = path.join(resultsDir, formattedFilename);
  await fs.writeFile(formattedPath, JSON.stringify(formattedResult, null, 2));

  return formattedPath;
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
    // Path to Python script (using project-relative paths)
    const pythonScriptPath = path.join(__dirname, '../../../python/langextract_service.py');
    const pythonPath = 'python3';

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

        // Handle both new structure (with original) and old structure
        let extraction, citations, originalLangextract;

        if (result.transformed) {
          // New structure with both original and transformed
          extraction = {
            Basic_Information: result.transformed.Basic_Information || {},
            Summary: result.transformed.Summary || {},
            Details: result.transformed.Details || {}
          };
          citations = result.transformed.citations || [];
          originalLangextract = result.original_langextract;
        } else {
          // Old structure (backwards compatibility)
          extraction = {
            Basic_Information: result.Basic_Information || {},
            Summary: result.Summary || {},
            Details: result.Details || {}
          };
          citations = result.citations || [];
        }

        // Format the result
        const processingResult: ProcessingResult = {
          metadata: {
            processed_date: new Date().toISOString(),
            original_filename: filename,
            processing_time_ms: Date.now() - startTime
          },
          extraction,
          citations,
          ...(originalLangextract && { original_langextract: originalLangextract })
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