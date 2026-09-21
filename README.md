# Major Hospital AI Video Creator

Vercel-hosted web app for creating vertical medical-awareness videos.

## Architecture

- **OpenRouter** generates the script and scene prompts.
- **Pollinations AI** generates scene images.
- **Browser FFmpeg** creates the vertical MP4.
- **Vercel API functions** keep API keys server-side.

## Project structure

```text
index.html
styles.css
app.js
package.json
vercel.json

api/
  script.js
  image.js
```

## Environment variables

Add these in Vercel → Project Settings → Environment Variables:

```text
OPENROUTER_API_KEY=your_openrouter_key
POLLINATIONS_API_KEY=your_pollinations_key
```

This version does **not** use Google Gemini. Remove any old `GEMINI_API_KEY` variable.

## Deployment

1. Replace the old `package.json`, `.env.example`, and `README.md` with these versions.
2. Verify that the deployed repository contains the current `api/script.js` and `api/image.js`.
3. Commit and push the changes to GitHub.
4. Redeploy in Vercel.
5. Test script generation and image generation.

## Image generation

The scene prompts are intended for professional medical-awareness content. They avoid provocative or sexually suggestive imagery and favor doctors, patients in normal clinical settings, and medically appropriate anatomical/educational visuals.
