import express from 'express';
import { getUploadedFile } from './upload';
import { processDocumentWithStandardLangExtract, saveResultToFile } from '../services/standardLangExtractService';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();

// Process document endpoint
router.post('/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    
    // Get uploaded file from memory
    const uploadedFile = getUploadedFile(fileId);
    
    if (!uploadedFile) {
      return res.status(404).json({ error: 'File not found or expired' });
    }
    
    // Check for API key
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ 
        error: 'API key not configured. Please set GEMINI_API_KEY in .env file' 
      });
    }
    
    // Convert buffer to text
    let documentText = '';
    
    if (uploadedFile.mimeType.includes('text')) {
      documentText = uploadedFile.buffer.toString('utf-8');
    } else {
      // For PDFs and DOCX, we would need additional libraries
      // For now, we'll return an error for non-text files
      return res.status(400).json({ 
        error: 'Currently only text files are supported. PDF and DOCX support coming soon.' 
      });
    }
    
    // Process with standard LangExtract using Gemini
    const result = await processDocumentWithStandardLangExtract(
      documentText,
      uploadedFile.originalName
    );
    
    // Save to results folder
    const savedFilename = await saveResultToFile(result, uploadedFile.originalName);
    
    res.json({
      success: true,
      filename: savedFilename,
      result
    });
  } catch (error) {
    console.error('Processing error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to process document'
    });
  }
});

// Get list of processed results
router.get('/results', async (req, res) => {
  try {
    const resultsDir = path.join(__dirname, '../../../results');
    const files = await fs.readdir(resultsDir);
    
    const results = await Promise.all(
      files
        .filter(f => f.endsWith('.json'))
        .map(async (filename) => {
          const filepath = path.join(resultsDir, filename);
          const stats = await fs.stat(filepath);
          const fileType = filename.startsWith('RAW_') ? 'raw' : 
                          filename.startsWith('FORMATTED_') ? 'formatted' : 'legacy';
          return {
            filename,
            type: fileType,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime
          };
        })
    );
    
    res.json(results.sort((a, b) => b.created.getTime() - a.created.getTime()));
  } catch (error) {
    console.error('Error listing results:', error);
    res.status(500).json({ error: 'Failed to list results' });
  }
});

// Get specific result
router.get('/results/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filepath = path.join(__dirname, '../../../results', filename);
    
    const content = await fs.readFile(filepath, 'utf-8');
    res.json(JSON.parse(content));
  } catch (error) {
    console.error('Error reading result:', error);
    res.status(404).json({ error: 'Result file not found' });
  }
});

export default router;