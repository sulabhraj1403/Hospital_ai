// OpenRouter script + scene-plan generator.
// Required Vercel environment variable:
//   OPENROUTER_API_KEY
//
// Uses OpenRouter's free-model router. The API key remains server-side.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  try {
    const {
      topic,
      language = "Hindi",
      sceneCount = 6,
      secondsPerScene = 5
    } = req.body || {};

    if (!topic || !String(topic).trim()) {
      return res.status(400).json({ error: "Topic required" });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "OPENROUTER_API_KEY is not configured in Vercel."
      });
    }

    const count = Math.max(3, Math.min(10, Number(sceneCount) || 6));
    const seconds = Math.max(3, Math.min(10, Number(secondsPerScene) || 5));

    const systemPrompt = `
You are a professional medical awareness video scriptwriter for Major Hospital,
Dhaka, East Champaran, Bihar, India.

Create accurate, easy-to-understand medical awareness content.
Do not diagnose an individual patient. Do not make unsupported medical claims.
Keep the wording suitable for a short vertical social-media video.

The final video must contain exactly ${count} main scenes.
Each scene should have a clear visual description that can be used as an AI-image prompt.
The requested scene duration is ${seconds} seconds.

The hospital end card is added separately by the application, so DO NOT create an
extra hospital/end-card scene.

Return ONLY valid JSON in this exact structure:
{
  "title": "string",
  "voiceover": "string",
  "scenes": [
    {
      "title": "string",
      "caption": "string",
      "visualPrompt": "string"
    }
  ]
}

The scenes array must contain exactly ${count} items.
`;

    const userPrompt = `
Topic: ${String(topic).trim()}
Language: ${language}

Write the complete short-video script and ${count} scene plan.
Use ${language} naturally. For Hindi, use clear Hindi suitable for a general
Indian audience; keep common medical terms in English where they are normally
understood.

For each visualPrompt, describe a realistic, medically appropriate vertical
9:16 scene. Do not put text, logos, hospital names, phone numbers, or watermarks
inside the generated image.
`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://major-hospital-ai-video.vercel.app",
        "X-Title": "Major Hospital AI Video Creator"
      },
      body: JSON.stringify({
        model: "openrouter/free",
        messages: [
          { role: "system", content: systemPrompt.trim() },
          { role: "user", content: userPrompt.trim() }
        ],
        temperature: 0.7,
        max_tokens: 3500
      })
    });

    const raw = await response.text();

    if (!response.ok) {
      let detail = raw;
      try {
        const parsed = JSON.parse(raw);
        detail =
          parsed?.error?.message ||
          parsed?.error ||
          parsed?.message ||
          raw;
      } catch {}

      throw new Error(`OpenRouter ${response.status}: ${detail}`);
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error("OpenRouter returned invalid JSON.");
    }

    let content = data?.choices?.[0]?.message?.content;

    if (Array.isArray(content)) {
      content = content
        .map(part => typeof part === "string" ? part : (part?.text || ""))
        .join("");
    }

    if (!content) {
      throw new Error("OpenRouter returned no script content.");
    }

    // Some free models may wrap JSON in markdown fences.
    content = String(content)
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let result;
    try {
      result = JSON.parse(content);
    } catch {
      // Recover JSON if a model added a small amount of surrounding text.
      const start = content.indexOf("{");
      const end = content.lastIndexOf("}");
      if (start >= 0 && end > start) {
        result = JSON.parse(content.slice(start, end + 1));
      } else {
        throw new Error("OpenRouter did not return the required JSON format.");
      }
    }

    if (!Array.isArray(result.scenes)) {
      throw new Error("OpenRouter response is missing scenes.");
    }

    // Keep the frontend contract stable and enforce the requested count.
    result.scenes = result.scenes.slice(0, count);

    if (result.scenes.length !== count) {
      throw new Error(
        `OpenRouter returned ${result.scenes.length} scenes; ${count} were required.`
      );
    }

    result.scenes = result.scenes.map((scene, index) => ({
      title: String(scene?.title || `Scene ${index + 1}`),
      caption: String(scene?.caption || ""),
      visualPrompt: String(
        scene?.visualPrompt ||
        scene?.visual ||
        scene?.imagePrompt ||
        ""
      )
    }));

    return res.status(200).json(result);
  } catch (e) {
    console.error("OpenRouter script error:", e);

    return res.status(500).json({
      error: e?.message || "Script generation failed"
    });
  }
}
