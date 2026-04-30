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

    const cookiesPath = path.join(__dirname, '../cookies.txt');

    // Helper to add stealth flags safely
    const addStealthFlags = (argsArray) => {
        argsArray.push('--extractor-args', 'youtube:player_client=android,web');
        argsArray.push('--no-check-certificates');
        argsArray.push('--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    };

    // 1. Fetch the video title first
    let filename = 'audio.mp3';
    try {
        const { execSync } = require('child_process');
        const titleArgs = [`"${videoURL}"`, '--get-title', '--no-warnings'];
        if (fs.existsSync(cookiesPath)) titleArgs.unshift('--cookies', `"${cookiesPath}"`);
        addStealthFlags(titleArgs);
        
        const title = execSync(`yt-dlp ${titleArgs.join(' ')}`).toString().trim();
        if (title) {
            // Sanitize filename: remove characters that aren't allowed in filenames
            filename = `${title.replace(/[/\\?%*:|"<>]/g, '_')}.mp3`;
        }
    } catch (err) {
        console.log('Error fetching title:', err.message);
    }

    // Set headers with the dynamic filename
    res.header('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'audio/mpeg');

    // yt-dlp: Get the best audio and pipe it to ffmpeg
    const ytDlpArgs = [
        '--quiet',
        '--no-warnings',
        '-f', 'bestaudio',
        '-o', '-',
        videoURL
    ];
    addStealthFlags(ytDlpArgs);

    if (fs.existsSync(cookiesPath)) {
        ytDlpArgs.unshift('--cookies', cookiesPath);
        console.log('Using cookies.txt for authentication');
    }

    // Start yt-dlp
    const ytDlp = spawn('yt-dlp', ytDlpArgs);

    // Start ffmpeg: Take input from pipe:0 (yt-dlp) and send mp3 to pipe:1 (browser)
    const ffmpeg = spawn('ffmpeg', [
        '-i', 'pipe:0',
        '-f', 'mp3',
        '-acodec', 'libmp3lame',
        '-ab', '128k',
        '-ar', '44100',
        'pipe:1'
    ]);

    // Connect the pipes
    ytDlp.stdout.pipe(ffmpeg.stdin);
    ffmpeg.stdout.pipe(res);

    // Error handling
    ytDlp.stderr.on('data', (data) => console.log(`yt-dlp error: ${data}`));
    ffmpeg.stderr.on('data', (data) => console.log(`ffmpeg error: ${data}`));

    // Ensure processes are killed when request is finished
    res.on('close', () => {
        ytDlp.kill();
        ffmpeg.kill();
    });
});

// Change line 40 in server/server.js
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
