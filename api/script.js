// OpenRouter script + scene-plan generator.
// Required Vercel environment variable:
//   OPENROUTER_API_KEY
//
// Uses OpenRouter's free-model router with structured JSON output.

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

Create exactly ${count} main scenes.
Each scene needs a clear visual description suitable for an AI image generator.
The requested scene duration is ${seconds} seconds.

The hospital end card is added separately by the application.
DO NOT create an extra hospital/end-card scene.

Use the requested language naturally. For Hindi, use clear Hindi suitable for
a general Indian audience and keep common medical terms in English where normally understood.

For visualPrompt:
- realistic, medically appropriate vertical 9:16 scene
- normal professional clothing and medical settings
- no sexualized, glamour, provocative, revealing or unnecessarily attractive people
- no text, logos, hospital names, phone numbers or watermarks inside the image
`;

    const userPrompt = `
Topic: ${String(topic).trim()}
Language: ${language}

Create the complete short-video script and exactly ${count} scenes.
Each scene should have:
1. title
2. short caption
3. visualPrompt
`;

    const schema = {
      type: "object",
      additionalProperties: false,
      properties: {
        title: {
          type: "string",
          description: "Short title of the medical awareness video."
        },
        voiceover: {
          type: "string",
          description: "Complete short-video voiceover in the requested language."
        },
        scenes: {
          type: "array",
          minItems: count,
          maxItems: count,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: {
                type: "string",
                description: "Short title for this scene."
              },
              caption: {
                type: "string",
                description: "Short on-screen caption for this scene."
              },
              visualPrompt: {
                type: "string",
                description: "Detailed realistic vertical 9:16 AI-image prompt."
              }
            },
            required: ["title", "caption", "visualPrompt"]
          }
        }
      },
      required: ["title", "voiceover", "scenes"]
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

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
            temperature: 0.4,
            max_tokens: 3000,
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "medical_video_plan",
                strict: true,
                schema
              }
            },
            provider: {
              require_parameters: true,
              allow_fallbacks: true
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

    const message = data?.choices?.[0]?.message;

    if (message?.refusal) {
      throw new Error(`OpenRouter refused the request: ${message.refusal}`);
    }

    let content = message?.content;

    // Some providers return content as an array of text parts.
    if (Array.isArray(content)) {
      content = content
        .map(part => {
          if (typeof part === "string") return part;
          return part?.text || "";
        })
        .join("");
    }

    if (content && typeof content === "object") {
      content = content.text || content.content || "";
    }

    if (!content) {
      throw new Error("OpenRouter returned no script content.");
    }

    content = String(content).trim();

    // Structured output should already be valid JSON, but retain safe
    // compatibility with providers that add markdown fences.
    content = content
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let result;

    try {
      result = JSON.parse(content);
    } catch {
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
      title: String(scene?.title || `Scene ${index + 1}`),
      caption: String(scene?.caption || ""),
      visualPrompt: String(
        scene?.visualPrompt ||
        scene?.visual ||
        scene?.imagePrompt ||
        ""
      ).trim()
    }));

    const missingPrompt = result.scenes.findIndex(
      scene => !scene.visualPrompt
    );

    if (missingPrompt !== -1) {
      throw new Error(
        `Scene ${missingPrompt + 1} has no visual prompt.`
      );
    }

    return res.status(200).json({
      title: String(result.title || ""),
      voiceover: String(result.voiceover || ""),
      scenes: result.scenes
    });

  } catch (e) {
    console.error("OpenRouter script error:", e);

    return res.status(500).json({
      error: e?.message || "Script generation failed"
    });
  }
}
