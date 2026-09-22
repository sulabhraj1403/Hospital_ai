// OpenRouter script + scene-plan generator.
// Required Vercel environment variable:
//   OPENROUTER_API_KEY

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
Do not diagnose an individual patient and do not make unsupported medical claims.

Create exactly ${count} main scenes. The hospital end card is added separately.

IMPORTANT:
Return ONLY one valid JSON object.
Do not use Markdown.
Do not use code fences.
Do not write any explanation before or after the JSON.

Required JSON structure:
{
  "title": "short video title",
  "voiceover": "complete short-video voiceover",
  "scenes": [
    {
      "title": "scene title",
      "caption": "short caption",
      "visualPrompt": "realistic vertical 9:16 image prompt"
    }
  ]
}

The scenes array MUST contain exactly ${count} objects.

For every visualPrompt:
- realistic medical awareness scene
- vertical 9:16 composition
- medically appropriate
- normal professional clothing
- normal clinical/patient setting
- no sexualized, glamour, provocative or revealing people
- no unnecessary emphasis on attractiveness
- no text, logos, hospital names, phone numbers or watermarks in the generated image
`;

    const userPrompt = `
Topic: ${String(topic).trim()}
Language: ${language}

Create the short medical-awareness video script with exactly ${count} scenes.
The requested duration is ${seconds} seconds per scene.

Use ${language} naturally. For Hindi, use clear Hindi suitable for a general
Indian audience while keeping common medical terms in English where appropriate.
`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    let response;

    try {
      response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://hospital-ai-eight.vercel.app",
            "X-Title": "Major Hospital AI Video Creator"
          },
          body: JSON.stringify({
            model: "openrouter/free",
            messages: [
              { role: "system", content: systemPrompt.trim() },
              { role: "user", content: userPrompt.trim() }
            ],
            temperature: 0.2,
            max_tokens: 2600,

            // JSON object mode is intentionally used instead of json_schema.
            // It is supported by a broader range of free models routed by
            // OpenRouter and avoids the empty-content problem seen previously.
            response_format: {
              type: "json_object"
            }
          })
        }
      );
    } catch (err) {
      if (err?.name === "AbortError") {
        throw new Error("OpenRouter request timed out. Please try again.");
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }

    const raw = await response.text();

    if (!response.ok) {
      let detail = raw;

      try {
        const parsed = JSON.parse(raw);
        detail =
          parsed?.error?.message ||
          parsed?.error?.metadata?.raw ||
          parsed?.message ||
          raw;
      } catch {}

      throw new Error(`OpenRouter ${response.status}: ${detail}`);
    }

    let data;

    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error("OpenRouter returned an invalid API response.");
    }

    const choice = data?.choices?.[0];

    if (!choice) {
      throw new Error("OpenRouter returned no choices.");
    }

    const message = choice?.message || {};

    // Different OpenRouter providers can represent content slightly
    // differently, so handle all common non-streaming forms.
    let content = message.content;

    if (Array.isArray(content)) {
      content = content
        .map(part => {
          if (typeof part === "string") return part;
          return part?.text || part?.content || "";
        })
        .join("");
    }

    if (content && typeof content === "object") {
      content = content.text || content.content || "";
    }

    // Some providers may place generated text in a text field.
    if (!content && typeof choice.text === "string") {
      content = choice.text;
    }

    if (!content) {
      const finishReason = choice.finish_reason || "unknown";
      throw new Error(
        `OpenRouter returned no script content (finish reason: ${finishReason}).`
      );
    }

    content = String(content)
      .replace(/^\uFEFF/, "")
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let result;

    try {
      result = JSON.parse(content);
    } catch {
      // Recover a JSON object if a provider added a small amount of text.
      const start = content.indexOf("{");
      const end = content.lastIndexOf("}");

      if (start >= 0 && end > start) {
        try {
          result = JSON.parse(content.slice(start, end + 1));
        } catch {
          throw new Error(
            "OpenRouter returned text, but it was not valid JSON."
          );
        }
      } else {
        throw new Error(
          "OpenRouter did not return the required JSON format."
        );
      }
    }

    if (!result || typeof result !== "object") {
      throw new Error("OpenRouter returned an invalid script object.");
    }

    if (!Array.isArray(result.scenes)) {
      throw new Error("OpenRouter response is missing scenes.");
    }

    if (result.scenes.length !== count) {
      throw new Error(
        `OpenRouter returned ${result.scenes.length} scenes; ${count} were required.`
      );
    }

    result.scenes = result.scenes.map((scene, index) => ({
      title: String(scene?.title || `Scene ${index + 1}`).trim(),
      caption: String(scene?.caption || "").trim(),
      visualPrompt: String(
        scene?.visualPrompt ||
        scene?.visual ||
        scene?.imagePrompt ||
        ""
      ).trim()
    }));

    const missing = result.scenes.findIndex(
      scene => !scene.visualPrompt
    );

    if (missing !== -1) {
      throw new Error(
        `Scene ${missing + 1} has no visual prompt.`
      );
    }

    return res.status(200).json({
      title: String(result.title || "").trim(),
      voiceover: String(result.voiceover || "").trim(),
      scenes: result.scenes
    });

  } catch (e) {
    console.error("OpenRouter script error:", e);

    return res.status(500).json({
      error: e?.message || "Script generation failed"
    });
  }
}
