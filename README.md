<<<<<<< HEAD
# YoutubeMp3_converter
=======


//this extraction app requires yt-dlp  and FFMPEG
-x: Stands for extract audio. It tells the tool to discard the video data.
--audio-format mp3: Explicitly sets the output to MP3.
--audio-quality 0: Sets the VBR (Variable Bit Rate) to the highest quality (0 is best, 9 is worst).

//run server: node server

//youtube rip
yt-dlp -x --audio-format mp3 --audio-quality 9 "youtube link"


//if already have video file
ffmpeg -i video.mp4 -vn -acodec libmp3lame -q:a 2 output.mp3
>>>>>>> d42fa08 (update v1 youtube converter)


Go to Railway.app:
Click "New Project" -> "Deploy from GitHub repo".
Select your YoutubeMp3_converter repo.
Railway will see the Dockerfile and automatically install everything.
Go to Render.com:
Click "New" -> "Web Service".
Connect your GitHub and select the repo.
Under "Runtime", select Docker.