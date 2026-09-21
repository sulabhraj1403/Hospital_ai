// Pollinations AI image-generation endpoint.
// Replace the previous Wikimedia/Gemini image endpoint with this file.
// Required Vercel environment variable:
//   POLLINATIONS_API_KEY
//
// The key stays server-side and is never sent to the browser.

function cleanPrompt(prompt) {
  return String(prompt || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 6000);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  try {
    const prompt = cleanPrompt(req.body?.prompt);

    if (!prompt) {
      return res.status(400).json({ error: "Prompt required" });
    }

    const apiKey = process.env.POLLINATIONS_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "POLLINATIONS_API_KEY is not configured in Vercel."
      });
    }

    // FLUX Schnell is intended for fast image generation.
    // 768x1365 keeps the vertical 9:16 composition while reducing
    // generation size/time; FFmpeg scales it to the final video size.
    const params = new URLSearchParams({
      model: "flux",
      width: "768",
      height: "1365",
      nologo: "true"
    });

    const url =
      "https://gen.pollinations.ai/image/" +
      encodeURIComponent(prompt) +
      "?" +
      params.toString();

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "image/jpeg,image/png,image/webp,image/svg+xml"
      }
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      let message = `Pollinations image generation failed (${response.status})`;

      try {
        const parsed = JSON.parse(body);
        if (parsed.error) message += `: ${parsed.error}`;
        else if (parsed.message) message += `: ${parsed.message}`;
      } catch {
        if (body) message += `: ${body.slice(0, 300)}`;
      }

      throw new Error(message);
    }

    const contentType =
      (response.headers.get("content-type") || "image/jpeg")
        .split(";")[0]
        .trim();

    const bytes = Buffer.from(await response.arrayBuffer());

    if (!bytes.length) {
      throw new Error("Pollinations returned an empty image.");
    }

    return res.status(200).json({
      mimeType: contentType,
      imageBase64: bytes.toString("base64"),
      source: "Pollinations AI",
      title: "AI-generated scene image",
      artist: "Pollinations AI",
      license: "See Pollinations terms and the selected model/provider terms"
    });
  } catch (e) {
    console.error("Pollinations image error:", e);

    return res.status(500).json({
      error: e?.message || "Image generation failed"
    });
  }
}
