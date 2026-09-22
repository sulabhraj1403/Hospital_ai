// OpenRouter script + scene-plan generator.
// Required Vercel environment variable:
// OPENROUTER_API_KEY

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "POST only"
    });
  }

  try {

    const body = req.body || {};
    const topic = body.topic;
    const language = body.language ?? "Hindi";

    // Accept both the current names and the older client names so the
    // endpoint remains compatible with previous deployed versions.
    const sceneCount = body.sceneCount ?? body.count ?? 6;
    const secondsPerScene = body.secondsPerScene ?? body.seconds ?? 5;


    if (!topic || !String(topic).trim()) {
      return res.status(400).json({
        error: "Topic required"
      });
    }


    const apiKey =
      process.env.OPENROUTER_API_KEY;


    if (!apiKey) {
      return res.status(500).json({
        error:
          "OPENROUTER_API_KEY is not configured in Vercel."
      });
    }


    const count =
      Math.max(
        3,
        Math.min(
          10,
          Number(sceneCount) || 6
        )
      );


    const seconds =
      Math.max(
        3,
        Math.min(
          10,
          Number(secondsPerScene) || 5
        )
      );


    const systemPrompt = `
You are a professional medical awareness video scriptwriter for Major Hospital,
Dhaka, East Champaran, Bihar, India.

Create accurate, easy-to-understand medical awareness content.
Do not diagnose an individual patient.
Do not make unsupported medical claims.
Keep the wording suitable for a short vertical social-media video.

The final video must contain exactly ${count} main scenes.

Each scene should have a clear visual description that can be used as an AI-image prompt.

The requested scene duration is ${seconds} seconds.

The hospital end card is added separately by the application,
so DO NOT create an extra hospital/end-card scene.

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

Use ${language} naturally.

For Hindi, use clear Hindi suitable for a general
Indian audience; keep common medical terms in English
where they are normally understood.

For each visualPrompt, describe a realistic,
medically appropriate vertical 9:16 scene.

Do not put text, logos, hospital names, phone numbers,
or watermarks inside the generated image.

Use professional, clinically appropriate people and clothing.

Do not use provocative, sexually suggestive, glamour,
revealing, or unnecessarily attractive poses of girls or women.

Prefer anatomy illustrations, doctors, patients in normal
medical settings, or neutral clinical visuals when a person
is not necessary.
`;


    // OpenRouter's free router.
    const models = [
      "openrouter/free"
    ];


    let raw = "";
    let lastError = null;
    let usedModel = null;


    for (const model of models) {

      try {

        const response =
          await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
              method: "POST",

              headers: {
                "Authorization":
                  `Bearer ${apiKey}`,

                "Content-Type":
                  "application/json",

                "HTTP-Referer":
                  (req.headers?.origin ||
                   `https://${req.headers?.host || process.env.VERCEL_URL || "major-hospital-ai-video.vercel.app"}`),

                "X-Title":
                  "Major Hospital AI Video Creator"
              },


              body: JSON.stringify({

                model,

                messages: [
                  {
                    role: "system",
                    content:
                      systemPrompt.trim()
                  },

                  {
                    role: "user",
                    content:
                      userPrompt.trim()
                  }
                ],

                temperature: 0.7,

                max_tokens: 3500,

                response_format: {
                  type: "json_object"
                }
              })
            }
          );


        raw =
          await response.text();


        if (response.ok) {

          usedModel = model;

          break;
        }


        let detail = raw;


        try {

          const parsed =
            JSON.parse(raw);

          detail =
            parsed?.error?.message ||

            (
              typeof parsed?.error === "string"
                ? parsed.error
                : null
            ) ||

            parsed?.message ||

            (
              parsed?.error
                ? JSON.stringify(parsed.error)
                : null
            ) ||

            raw;

        } catch {}


        lastError =
          new Error(
            `${response.status}: ${detail}`
          );


        console.warn(
          `OpenRouter model failed: ${model}`,
          lastError?.message ||
          String(lastError)
        );


        if (
          ![
            400,
            401,
            403,
            404,
            408,
            409,
            429,
            500,
            502,
            503,
            504
          ].includes(response.status)
        ) {
          throw lastError;
        }


      } catch (err) {

        lastError = err;

        console.warn(
          `OpenRouter request failed: ${model}`,
          err?.message ||
          JSON.stringify(err)
        );
      }
    }


    if (!usedModel) {

      throw new Error(
        `All free AI models are temporarily unavailable. Last error: ${
          lastError?.message ||
          "unknown error"
        }`
      );
    }


    console.log(
      "OpenRouter model used:",
      usedModel
    );


    let data;


    try {

      data =
        JSON.parse(raw);

    } catch {

      throw new Error(
        "OpenRouter returned invalid JSON."
      );
    }


    let content =
      data?.choices?.[0]?.message?.content;


    if (Array.isArray(content)) {

      content =
        content
          .map(part =>
            typeof part === "string"
              ? part
              : (part?.text || "")
          )
          .join("");
    }


    if (!content) {

      throw new Error(
        "OpenRouter returned no script content."
      );
    }


    content =
      String(content)
        .replace(
          /^```json\s*/i,
          ""
        )
        .replace(
          /^```\s*/i,
          ""
        )
        .replace(
          /\s*```$/i,
          ""
        )
        .trim();


    let result;


    try {

      result =
        JSON.parse(content);

    } catch {

      const start =
        content.indexOf("{");

      const end =
        content.lastIndexOf("}");


      if (
        start >= 0 &&
        end > start
      ) {

        result =
          JSON.parse(
            content.slice(
              start,
              end + 1
            )
          );

      } else {

        throw new Error(
          "OpenRouter did not return the required JSON format."
        );
      }
    }


    if (!Array.isArray(result.scenes)) {

      throw new Error(
        "OpenRouter response is missing scenes."
      );
    }


    result.scenes =
      result.scenes.slice(
        0,
        count
      );


    if (
      result.scenes.length !== count
    ) {

      throw new Error(
        `OpenRouter returned ${result.scenes.length} scenes; ${count} were required.`
      );
    }


    result.scenes =
      result.scenes.map(
        (scene, index) => ({

          title:
            String(
              scene?.title ||
              `Scene ${index + 1}`
            ),

          caption:
            String(
              scene?.caption || ""
            ),

          visualPrompt:
            String(
              scene?.visualPrompt ||
              scene?.visual ||
              scene?.imagePrompt ||
              ""
            ).trim()
        })
      );


    return res.status(200).json(
      result
    );


  } catch (e) {

    console.error(
      "OpenRouter script error:",
      e
    );


    return res.status(500).json({

      error:
        e?.message ||
        "Script generation failed"

    });
  }
}