// FREE replacement for the previous Gemini image-generation endpoint.
// This version does NOT call a paid Gemini image model.
// It searches Wikimedia Commons for an openly licensed image and returns it
// in the same format expected by the existing app.js.

function cleanQuery(prompt) {
  // Turn the Gemini-generated image prompt into a short Commons search query.
  return String(prompt || "")
    .replace(/vertical|9:16|photorealistic|medical-awareness|clean|professional/gi, " ")
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 12)
    .join(" ");
}

function allowed(info) {
  const md = info.extmetadata || {};
  const license = String(
    md.LicenseShortName?.value ||
    md.License?.value ||
    ""
  ).toLowerCase();

  // Prefer explicit Creative Commons/public-domain licenses.
  return (
    license.includes("cc by") ||
    license.includes("cc0") ||
    license.includes("public domain") ||
    license.includes("pd")
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "POST only" });

  try {
    const prompt = String(req.body?.prompt || "");
    if (!prompt)
      return res.status(400).json({ error: "Prompt required" });

    const query = cleanQuery(prompt);

    const api =
      "https://commons.wikimedia.org/w/api.php" +
      "?action=query" +
      "&generator=search" +
      "&gsrnamespace=6" +
      "&gsrlimit=20" +
      "&prop=imageinfo" +
      "&iiprop=url|mime|extmetadata" +
      "&iiurlwidth=1080" +
      "&format=json" +
      "&origin=*"+
      "&gsrsearch=" + encodeURIComponent(query);

    const response = await fetch(api);
    if (!response.ok)
      throw new Error("Wikimedia Commons search failed");

    const data = await response.json();
    const pages = Object.values(data.query?.pages || {});

    // Prefer licensed images and common web image formats.
    const candidates = pages
      .filter(p => p.imageinfo?.[0]?.url)
      .filter(p => {
        const mime = p.imageinfo[0].mime || "";
        return /^image\/(jpeg|jpg|png|webp)$/i.test(mime);
      })
      .filter(p => allowed(p.imageinfo[0]))
      .map(p => ({
        page: p,
        info: p.imageinfo[0]
      }));

    if (!candidates.length)
      throw new Error("No suitable free image was found for this scene. Try a broader topic.");

    // Pick the first licensed candidate. The server downloads it so the
    // browser does not need to deal with Wikimedia CORS/hotlinking.
    const chosen = candidates[0];
    const img = await fetch(chosen.info.url);
    if (!img.ok) throw new Error("Could not download selected image");

    const mime = chosen.info.mime || "image/jpeg";
    const bytes = Buffer.from(await img.arrayBuffer());
    const imageBase64 = bytes.toString("base64");

    const md = chosen.info.extmetadata || {};
    const title = String(chosen.page.title || "").replace(/^File:/, "");
    const artist = String(md.Artist?.value || "").replace(/<[^>]+>/g, "");
    const license = String(
      md.LicenseShortName?.value ||
      md.License?.value ||
      "See source"
    ).replace(/<[^>]+>/g, "");

    const source =
      "https://commons.wikimedia.org/wiki/" +
      encodeURIComponent(chosen.page.title);

    return res.status(200).json({
      mimeType: mime,
      imageBase64,
      source,
      title,
      artist,
      license
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      error: e.message || "Free image search failed"
    });
  }
}