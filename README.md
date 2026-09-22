# Major Hospital AI Video Creator

Vercel-hosted web app for creating vertical medical-awareness videos.

## Architecture

- OpenRouter generates the script and scene prompts.
- Pollinations AI generates scene images.
- Browser-side FFmpeg creates the vertical MP4.
- API keys stay on the Vercel server.
- A same-origin FFmpeg worker is included under `static/ffmpeg/`.

## Environment variables

Set these in Vercel:

```text
OPENROUTER_API_KEY=your_openrouter_key
POLLINATIONS_API_KEY=your_pollinations_key
```

Do not commit `.env` or API keys.

## Important FFmpeg setup

The frontend uses `@ffmpeg/ffmpeg@0.12.10` with `@ffmpeg/core@0.12.6`.
The root worker (`static/ffmpeg/worker.js`) is served from the same origin to avoid
the cross-origin Worker problem that occurs when the default CDN worker is used.

## Video behavior

- 5–7 main scenes can be selected.
- 4–7 seconds per scene can be selected.
- The application adds one mandatory Major Hospital end card.
- Captions are burned into scene frames in the browser when the Captions checkbox is enabled.
- All frames are normalized to 1080×1920 before MP4 creation.
- Background music is optional and is searched from Wikimedia Commons.

## Deployment

Push the whole repository to GitHub and deploy/redeploy it on Vercel.
After a new deployment, do a hard refresh before testing.

The visual prompts are designed for professional medical-awareness content and avoid
provocative or sexually suggestive imagery.
