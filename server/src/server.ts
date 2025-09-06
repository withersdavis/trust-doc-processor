import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs/promises';
import uploadRouter from './routes/upload';
import processRouter from './routes/process';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure results directory exists
async function ensureResultsDir() {
  const resultsDir = path.join(__dirname, '../../results');
  try {
    await fs.access(resultsDir);
  } catch {
    await fs.mkdir(resultsDir, { recursive: true });
  }
}

// Routes
app.use('/api/upload', uploadRouter);
app.use('/api/process', processRouter);

// Serve original text files
app.get('/api/files/:fileId/text', async (req, res) => {
  try {
    const { fileId } = req.params;
    const uploadsDir = path.join(__dirname, '../../uploads');
    
    // Find the file with this ID
    const files = await fs.readdir(uploadsDir);
    const matchingFile = files.find(file => file.startsWith(fileId));
    
    if (!matchingFile) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const filePath = path.join(uploadsDir, matchingFile);
    
    // Check if file exists
    await fs.access(filePath);
    
    // Read and send the text file
    const content = await fs.readFile(filePath, 'utf-8');
    res.setHeader('Content-Type', 'text/plain');
    res.send(content);
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).json({ error: 'Failed to serve file' });
  }
});

// Serve JSON result files
app.get('/api/results/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const resultsDir = path.join(__dirname, '../../results');
    const filePath = path.join(resultsDir, filename);
    
    // Check if file exists
    await fs.access(filePath);
    
    // Read and send the JSON file
    const content = await fs.readFile(filePath, 'utf-8');
    const json = JSON.parse(content);
    res.json(json);
  } catch (error) {
    console.error('Error serving result file:', error);
    res.status(500).json({ error: 'Failed to serve result file' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
async function startServer() {
  await ensureResultsDir();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api`);
  });
}

startServer().catch(console.error);