const fs = require('fs'); // Import File System

app.get('/download', (req, res) => {
    const videoURL = req.query.url;
    if (!videoURL) return res.status(400).send('URL is required');

    // Create a unique filename in the /tmp directory
    const outputFilePath = path.join('/tmp', `audio-${Date.now()}.mp3`);

    const process = spawn('yt-dlp', [
        '-x',
        '--audio-format', 'mp3',
        '--audio-quality', '9',
        '-o', outputFilePath, // Save to the /tmp path instead of stdout
        videoURL
    ]);

    process.on('close', (code) => {
        if (code === 0) {
            // Once the conversion is finished, send the file to the user
            res.download(outputFilePath, 'audio.mp3', (err) => {
                if (err) console.error("Download Error:", err);
                
                // CRITICAL: Delete the file after sending to keep /tmp clean
                fs.unlink(outputFilePath, (err) => {
                    if (err) console.error("Cleanup Error:", err);
                });
            });
        } else {
            res.status(500).send('Conversion failed');
        }
    });

    process.stderr.on('data', (data) => {
        console.log(`Debug: ${data}`);
    });
});
