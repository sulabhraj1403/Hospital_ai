# Major Hospital AI Video Creator

A mobile-friendly website for generating vertical medical-awareness videos.

## Architecture

- Browser UI: `index.html`, `app.js`, `styles.css`
- Secure Gemini calls: `/api/script.js` and `/api/image.js`
- Gemini text model: `gemini-2.5-flash`
- Gemini native image generation: `gemini-2.5-flash-image`
- Background music: searches Wikimedia Commons for audio files and displays the license/source
- Video assembly: FFmpeg.wasm in the browser
- Output: MP4, vertical 9:16

## Deploy on Vercel from a phone

1. Create a GitHub repository and upload this folder.
2. Import the repository into Vercel.
3. In Vercel: Project Settings → Environment Variables.
4. Add `GEMINI_API_KEY` with a NEW Gemini API key.
5. Redeploy.
6. Open the Vercel URL on your phone.

The key is never put into browser JavaScript.

## Important

The Gemini key previously shared in chat should be revoked/rotated before deployment. Never commit a real key to GitHub.

The first image model used here is `gemini-2.5-flash-image`. Google currently lists this model as deprecated with a shutdown date of October 2, 2026, so the image model should be changed to a currently supported Nano Banana image model before that date. Check Google's model/pricing pages when deploying.

## Limitations

- Video assembly happens on the phone browser and can be memory-intensive for long videos.
- Wikimedia music search may not always find a suitable audio file. The video can still be generated without music.
- FFmpeg.wasm is loaded from jsDelivr, so the first video generation needs an internet connection.
