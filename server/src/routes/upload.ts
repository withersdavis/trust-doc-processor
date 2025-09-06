import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

const router = express.Router();

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Only .txt files are allowed`));
    }
  }
});

// Temporary storage for uploaded files
const uploadedFiles = new Map<string, { buffer: Buffer; originalName: string; mimeType: string }>();

// Upload endpoint
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Generate unique file ID
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store file in memory temporarily
    uploadedFiles.set(fileId, {
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype
    });

    // Also save file to disk for serving later
    const uploadsDir = path.join(__dirname, '../../../uploads');
    await fs.mkdir(uploadsDir, { recursive: true });
    
    const ext = path.extname(req.file.originalname);
    const fileName = `${fileId}${ext}`;
    const filePath = path.join(uploadsDir, fileName);
    
    await fs.writeFile(filePath, req.file.buffer);

    // Clean up old files after 15 minutes
    setTimeout(async () => {
      uploadedFiles.delete(fileId);
      try {
        await fs.unlink(filePath);
      } catch (err) {
        console.error('Error deleting file:', err);
      }
    }, 15 * 60 * 1000);

    res.json({
      fileId,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
      message: 'File uploaded successfully'
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Get uploaded file (for processing)
export function getUploadedFile(fileId: string) {
  return uploadedFiles.get(fileId);
}

export default router;