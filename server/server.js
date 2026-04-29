const express = require('express');
const { spawn } = require('child_process');
const cors = require('cors');
const path = require('path');
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
    const process = spawn('yt-dlp', [
           '--impersonate', 'chrome', // Mimics a Chrome browser
    '--extractor-args', 'youtube:player_client=web_safari', // Spoofs Safari
        '-x',
        '--audio-format', 'mp3',
        '--audio-quality', '9',
        '-o', '-', // The '-' tells yt-dlp to output to stdout
        videoURL
    ]);

    process.stdout.pipe(res);

    process.stderr.on('data', (data) => {
        console.log(`Debug: ${data}`);
    });
});

// Change line 40 in server/server.js
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
