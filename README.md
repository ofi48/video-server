# Video Processing Server

Backend server for video processing and media comparison.

## Setup

1. Create a new repository in GitHub with these files
2. Deploy to Railway:
   - Click "Add Service" in Railway
   - Select "Deploy from GitHub repo" 
   - Connect your GitHub account
   - Select this repository
   - Railway will automatically detect Node.js and deploy

## Endpoints

- `GET /` - Health check
- `POST /process-video` - Process video files
- `POST /compare-media` - Compare two media files

## Environment

The server runs on the PORT environment variable (Railway sets this automatically).

## FFmpeg

Railway includes FFmpeg by default, so video processing should work out of the box.
