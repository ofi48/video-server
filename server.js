const express = require('express');
const multer = require('multer');
const cors = require('cors');
const ffmpeg = require('fluent-ffmpeg');

// Configurar FFmpeg paths para Railway
if (process.env.FFMPEG_PATH) {
  ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
}
if (process.env.FFPROBE_PATH) {
  ffmpeg.setFfprobePath(process.env.FFPROBE_PATH);
}

// Configuración directa para Railway (donde FFmpeg está en /bin/)
ffmpeg.setFfmpegPath('/bin/ffmpeg');
ffmpeg.setFfprobePath('/bin/ffprobe');

const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    fs.ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit
  }
});

// Static files
app.use('/processed', express.static(path.join(__dirname, 'processed')));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Video Processing Server is running',
    endpoints: ['/process-video', '/compare-media']
  });
});

// Video processing endpoint
app.post('/process-video', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    const inputPath = req.file.path;
    const outputDir = path.join(__dirname, 'processed');
    fs.ensureDirSync(outputDir);
    
    const outputPath = path.join(outputDir, `processed-${uuidv4()}.mp4`);
    
    // Basic video processing example
    ffmpeg(inputPath)
      .outputOptions([
        '-c:v libx264',
        '-crf 23',
        '-preset medium',
        '-c:a aac',
        '-b:a 128k'
      ])
      .output(outputPath)
      .on('end', () => {
        // Clean up input file
        fs.remove(inputPath);
        
        const publicUrl = `${req.protocol}://${req.get('host')}/processed/${path.basename(outputPath)}`;
        res.json({ 
          success: true, 
          videoUrl: publicUrl,
          message: 'Video processed successfully'
        });
      })
      .on('error', (err) => {
        console.error('FFmpeg error:', err);
        fs.remove(inputPath);
        res.status(500).json({ error: 'Video processing failed' });
      })
      .run();

  } catch (error) {
    console.error('Processing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Media comparison endpoint
app.post('/compare-media', upload.fields([
  { name: 'file1', maxCount: 1 },
  { name: 'file2', maxCount: 1 }
]), async (req, res) => {
  try {
    if (!req.files || !req.files.file1 || !req.files.file2) {
      return res.status(400).json({ error: 'Two files are required for comparison' });
    }

    const file1Path = req.files.file1[0].path;
    const file2Path = req.files.file2[0].path;

    // Basic comparison logic (you can implement more sophisticated comparison)
    const file1Stats = fs.statSync(file1Path);
    const file2Stats = fs.statSync(file2Path);
    
    const similarity = file1Stats.size === file2Stats.size ? 100 : 
      Math.max(0, 100 - Math.abs(file1Stats.size - file2Stats.size) / Math.max(file1Stats.size, file2Stats.size) * 100);

    // Clean up files
    fs.remove(file1Path);
    fs.remove(file2Path);

    res.json({
      success: true,
      similarity: Math.round(similarity),
      message: 'Files compared successfully'
    });

  } catch (error) {
    console.error('Comparison error:', error);
    res.status(500).json({ error: 'Comparison failed' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
