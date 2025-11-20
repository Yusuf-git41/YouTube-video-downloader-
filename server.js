const express = require('express');
const cors = require('cors');
const ytdl = require('ytdl-core');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Ensure downloads directory exists
const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir);
}

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Get video information
app.get('/video-info', async (req, res) => {
    try {
        const videoURL = req.query.url;
        
        if (!videoURL) {
            return res.status(400).json({ error: 'URL is required' });
        }

        if (!ytdl.validateURL(videoURL)) {
            return res.status(400).json({ error: 'Invalid YouTube URL' });
        }

        const info = await ytdl.getInfo(videoURL);
        const videoDetails = info.videoDetails;
        
        const formats = info.formats
            .filter(format => format.hasVideo || format.hasAudio)
            .map(format => ({
                quality: format.qualityLabel || 'audio',
                container: format.container,
                hasVideo: format.hasVideo,
                hasAudio: format.hasAudio,
                itag: format.itag,
                contentLength: format.contentLength
            }));

        const videoInfo = {
            title: videoDetails.title,
            duration: videoDetails.lengthSeconds,
            thumbnail: videoDetails.thumbnails[0].url,
            author: videoDetails.author.name,
            formats: formats
        };

        res.json(videoInfo);

    } catch (error) {
        console.error('Error getting video info:', error);
        res.status(500).json({ error: 'Failed to get video information' });
    }
});

// Download video
app.get('/download', async (req, res) => {
    try {
        const videoURL = req.query.url;
        const quality = req.query.quality || 'highest';
        const format = req.query.format || 'mp4';

        if (!videoURL) {
            return res.status(400).json({ error: 'URL is required' });
        }

        if (!ytdl.validateURL(videoURL)) {
            return res.status(400).json({ error: 'Invalid YouTube URL' });
        }

        const info = await ytdl.getInfo(videoURL);
        const videoTitle = info.videoDetails.title.replace(/[^a-zA-Z0-9 ]/g, '');
        
        let downloadOptions = { quality: quality };
        
        // Set specific format if requested
        if (format === 'mp4') {
            downloadOptions.filter = format => format.container === 'mp4' && format.hasVideo;
        } else if (format === 'audio') {
            downloadOptions.filter = 'audioonly';
        }

        res.header('Content-Disposition', `attachment; filename="${videoTitle}.${format === 'audio' ? 'mp3' : 'mp4'}"`);
        
        ytdl(videoURL, downloadOptions).pipe(res);

    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Download failed' });
    }
});

// Progressive download with format selection
app.get('/download-progressive', async (req, res) => {
    try {
        const videoURL = req.query.url;
        const itag = parseInt(req.query.itag);

        if (!videoURL || !itag) {
            return res.status(400).json({ error: 'URL and itag are required' });
        }

        if (!ytdl.validateURL(videoURL)) {
            return res.status(400).json({ error: 'Invalid YouTube URL' });
        }

        const info = await ytdl.getInfo(videoURL);
        const videoTitle = info.videoDetails.title.replace(/[^a-zA-Z0-9 ]/g, '');
        const format = ytdl.chooseFormat(info.formats, { quality: itag });

        if (!format) {
            return res.status(400).json({ error: 'Requested format not available' });
        }

        const fileExtension = format.container === 'mp4' ? 'mp4' : 
                             format.container === 'webm' ? 'webm' : 'mp4';

        res.header('Content-Disposition', `attachment; filename="${videoTitle}.${fileExtension}"`);
        
        ytdl.downloadFromInfo(info, { format: format }).pipe(res);

    } catch (error) {
        console.error('Progressive download error:', error);
        res.status(500).json({ error: 'Download failed' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 YouTube Downloader running at http://localhost:${PORT}`);
    console.log(`📁 Downloads will be saved in: ${downloadsDir}`);
});