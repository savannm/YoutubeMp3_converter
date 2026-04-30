const express = require('express');
const { spawn } = require('child_process');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const app = express();

app.use(cors());
app.use(express.json());

// Serve static files from the 'client' directory
app.use(express.static(path.join(__dirname, '../client')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.get('/download', (req, res) => {
    const videoURL = req.query.url;
    if (!videoURL) return res.status(400).send('URL is required');

    // Set headers so the browser treats it as a file download
    res.header('Content-Disposition', 'attachment; filename="audio.mp3"');

    // Update the spawn command to stream to stdout
    const cookiesPath = path.join(__dirname, '../cookies.txt');
    const args = [
        // '--impersonate', 'chrome',
        // '--extractor-args', 'youtube:player_client=web_safari',
        '-x',
        '--audio-format', 'mp3',
        '--audio-quality', '9',
        '-o', '-',
        videoURL
    ];

    // Automatically use cookies if the file exists
    if (fs.existsSync(cookiesPath)) {
        args.unshift('--cookies', cookiesPath);
        console.log('Using cookies.txt for authentication');
    }

    const process = spawn('yt-dlp', args);

    process.stdout.pipe(res);

    process.stderr.on('data', (data) => {
        console.log(`Debug: ${data}`);
    });
});

// Change line 40 in server/server.js
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
