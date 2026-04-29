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

    // Run yt-dlp and pipe the output directly to the browser response
    const process = spawn('yt-dlp', [
        '-x',
        '--audio-format', 'mp3',
        '--audio-quality', '9',
        '-o', './music/%(title)s.%(ext)s', // Output
        videoURL
    ]);

    process.stdout.pipe(res);

    process.stderr.on('data', (data) => {
        console.log(`Debug: ${data}`);
    });
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));