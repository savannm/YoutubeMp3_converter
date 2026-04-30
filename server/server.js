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
        // Use the 'TV' client which often has much lower security
        argsArray.push('--extractor-args', 'youtube:player_client=tv');
        argsArray.push('--no-check-certificates');
        argsArray.push('--no-warnings');
        argsArray.push('--user-agent', 'Mozilla/5.0 (SMART-TV; LINUX; Tizen 5.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.106.1.10.1 Safari/537.36');
    };

    // 1. Fetch the video title first
    let filename = 'audio.mp3';
    try {
        const { spawnSync } = require('child_process');
        const titleArgs = ['--get-title', '--no-warnings', videoURL];
        if (fs.existsSync(cookiesPath)) titleArgs.unshift('--cookies', cookiesPath);
        addStealthFlags(titleArgs);

        const result = spawnSync('yt-dlp', titleArgs);
        const title = result.stdout.toString().trim();

        if (title) {
            filename = `${title.replace(/[/\\?%*:|"<>]/g, '_')}.mp3`;
            console.log('Downloading:', title);
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

    // Error handling with logging
    ytDlp.stderr.on('data', (data) => {
        const msg = data.toString();
        console.error(`yt-dlp ERROR: ${msg}`);
        if (msg.includes('Sign in to confirm')) {
            console.error('CRITICAL: YouTube is still blocking Render IP.');
        }
    });

    ffmpeg.stderr.on('data', (data) => {
        if (!data.toString().includes('frame=')) { // Ignore progress logs
            console.log(`ffmpeg info: ${data}`);
        }
    });

    ytDlp.on('close', (code) => {
        if (code !== 0) console.log(`yt-dlp process exited with code ${code}`);
    });

    // Ensure processes are killed when request is finished
    res.on('close', () => {
        ytDlp.kill();
        ffmpeg.kill();
    });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
