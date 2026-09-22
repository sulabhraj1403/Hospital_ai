// OpenRouter script + scene-plan generator.
// Required Vercel environment variable: OPENROUTER_API_KEY

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}

function cleanJsonText(content) {
  let text = String(content || "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start >= 0 && end > start) {
    text = text.slice(start, end + 1);
  }

  return text;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  try {
    const body = req.body || {};
    const topic = String(body.topic || "").trim();
    const language = body.language ?? "Hindi";
    const sceneCount = body.sceneCount ?? body.count ?? 6;
    const secondsPerScene = body.secondsPerScene ?? body.seconds ?? 5;

    if (!topic) {
      return res.status(400).json({ error: "Topic required" });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "OPENROUTER_API_KEY is not configured in Vercel."
      });
    }

    const count = Math.max(3, Math.min(8, Number(sceneCount) || 6));
    const seconds = Math.max(3, Math.min(10, Number(secondsPerScene) || 5));

    const systemPrompt = `
You are a professional medical awareness video scriptwriter for Major Hospital,
Dhaka, East Champaran, Bihar, India.

Create accurate, easy-to-understand medical awareness content.
Do not diagnose an individual patient.
Do not make unsupported medical claims.
Keep the wording suitable for a short vertical social-media video.

Create exactly ${count} main scenes.
The requested scene duration is ${seconds} seconds.
The application adds the hospital end card separately.

Return ONLY valid JSON with this exact structure:
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

The scenes array MUST contain exactly ${count} items.
`;

    const userPrompt = `
Topic: ${topic}
Language: ${language}

Create a concise medical-awareness video script and ${count} scene plan.
Use ${language} naturally.
For Hindi, use clear Hindi for a general Indian audience and keep common medical terms in English when appropriate.

For each visualPrompt, describe a realistic, medically appropriate vertical 9:16 scene.
Do not put text, logos, hospital names, phone numbers, or watermarks inside generated images.
Use professional, clinically appropriate people and clothing.
Do not use provocative, sexually suggestive, glamour, revealing, or unnecessarily attractive poses of girls or women.
Prefer anatomy illustrations, doctors, patients in normal medical settings, or neutral clinical visuals when a person is not necessary.
`;

    // These are current free OpenRouter routes. The first is specifically medical;
    // the second is a smaller high-throughput NVIDIA route; the router is the final fallback.
    // We use short per-request timeouts so a stalled free provider cannot consume
    // the entire Vercel function lifetime and produce FUNCTION_INVOCATION_TIMEOUT.
    const models = [
      { id: "inclusionai/ling-3.0-flash-sante:free", timeout: 15000 },
      { id: "nvidia/nemotron-3.5-lightning:free", timeout: 15000 },
      { id: "openrouter/free", timeout: 10000 }
    ];

    let lastError = null;
    let successfulData = null;
    let usedModel = null;

    const origin =
      req.headers?.origin ||
      `https://${req.headers?.host || process.env.VERCEL_URL || "major-hospital-ai-video.vercel.app"}`;

    for (const candidate of models) {
      try {
        const response = await fetchWithTimeout(
          OPENROUTER_URL,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": origin,
              "X-Title": "Major Hospital AI Video Creator"
            },
            body: JSON.stringify({
              model: candidate.id,
              messages: [
                { role: "system", content: systemPrompt.trim() },
                { role: "user", content: userPrompt.trim() }
              ],
              temperature: 0.4,
              max_tokens: 2200
              // Do not send response_format here: several current free models
              // support JSON instruction but do not expose response_format.
            })
          },
          candidate.timeout
        );

        const raw = await response.text();

        if (!response.ok) {
          let detail = raw;
          try {
            const parsed = JSON.parse(raw);
            detail =
              parsed?.error?.message ||
              (typeof parsed?.error === "string" ? parsed.error : null) ||
              parsed?.message ||
              raw;
          } catch {}

          lastError = new Error(`${response.status}: ${detail}`);
          console.warn(`OpenRouter model failed: ${candidate.id}`, lastError.message);
          continue;
        }

        try {
          successfulData = JSON.parse(raw);
          usedModel = candidate.id;
          break;
        } catch {
          lastError = new Error(`OpenRouter returned invalid API JSON from ${candidate.id}.`);
        }
      } catch (err) {
        if (err?.name === "AbortError") {
          lastError = new Error(`${candidate.id} timed out after ${candidate.timeout / 1000}s`);
        } else {
          lastError = err;
        }
        console.warn(`OpenRouter request failed: ${candidate.id}`, lastError?.message || String(lastError));
      }
    }

    if (!successfulData) {
      return res.status(502).json({
        error:
          `AI script service did not respond in time. Please try Generate again. Last error: ${lastError?.message || "unknown error"}`
      });
    }

    console.log("OpenRouter model used:", usedModel);

    let content = successfulData?.choices?.[0]?.message?.content;

    if (Array.isArray(content)) {
      content = content
        .map(part => typeof part === "string" ? part : (part?.text || ""))
        .join("");
    }

    if (!content) {
      throw new Error("OpenRouter returned no script content.");
    }

    let result;
    try {
      result = JSON.parse(cleanJsonText(content));
    } catch {
      throw new Error("OpenRouter did not return the required JSON format.");
    }

    if (!Array.isArray(result.scenes)) {
      throw new Error("OpenRouter response is missing scenes.");
    }

    result.scenes = result.scenes.slice(0, count).map((scene, index) => ({
      title: String(scene?.title || `Scene ${index + 1}`).trim(),
      caption: String(scene?.caption || "").trim(),
      visualPrompt: String(
        scene?.visualPrompt || scene?.visual || scene?.imagePrompt || ""
      ).trim()
    }));

    // If a model accidentally returns fewer scenes, don't send a malformed plan
    // to the image generator. Report the real problem instead.
    if (result.scenes.length !== count) {
      throw new Error(
        `AI returned ${result.scenes.length} scenes; ${count} were required. Please try again.`
      );
    }

    const missingPrompt = result.scenes.findIndex(s => !s.visualPrompt);
    if (missingPrompt !== -1) {
      throw new Error(`AI returned no visual prompt for scene ${missingPrompt + 1}. Please try again.`);
    }

    return res.status(200).json(result);
  } catch (e) {
    console.error("OpenRouter script error:", e);
    return res.status(500).json({
      error: e?.message || "Script generation failed"
    });
  }
}
