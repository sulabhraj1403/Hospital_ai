// Major Hospital AI Video Creator
// Browser-side video assembly with a same-origin FFmpeg worker.

const $ = id => document.getElementById(id);

let stopped = false;
let scenes = [];
let musicInfo = null;
let currentVideoUrl = null;

function status(message, progress = null) {
  const statusEl = $("status");
  const barEl = $("bar");
  if (statusEl) statusEl.textContent = message;
  if (barEl && progress !== null) {
    barEl.style.width = `${Math.max(0, Math.min(100, progress))}%`;
  }
}

function dataUrl(mime, base64) {
  return `data:${mime};base64,${base64}`;
}

async function jsonPost(url, body) {
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(body)
    });
  } catch (error) {
    throw new Error(`Network error while calling ${url}: ${error.message || error}`);
  }

  const raw = await response.text();
  let payload = {};

  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error(`Server returned ${response.status}: ${raw.slice(0, 300)}`);
  }

  if (!response.ok) {
    throw new Error(
      payload.error ||
      payload.message ||
      `Server error (${response.status})`
    );
  }

  return payload;
}

async function getMusic(topic) {
  const q = encodeURIComponent(`instrumental music ${topic}`);
  const api =
    `https://commons.wikimedia.org/w/api.php?action=query&generator=search` +
    `&gsrsearch=${q}&gsrnamespace=6&gsrlimit=10&prop=imageinfo` +
    `&iiprop=url|extmetadata&format=json&origin=*`;

  try {
    const response = await fetch(api);
    if (!response.ok) return null;

    const json = await response.json();
    const pages = Object.values(json.query?.pages || {});

    const audio = pages.find(page =>
      /\.(mp3|ogg|oga|wav)$/i.test(page.imageinfo?.[0]?.url || "")
    );

    if (!audio) return null;

    const info = audio.imageinfo[0];
    const metadata = info.extmetadata || {};

    return {
      url: info.url,
      title: metadata.ObjectName?.value || audio.title,
      artist: metadata.Artist?.value || "",
      license: metadata.LicenseShortName?.value || "See source",
      source:
        "https://commons.wikimedia.org/wiki/" +
        encodeURIComponent(audio.title.replace(/^File:/, "File:"))
    };
  } catch {
    return null;
  }
}

async function blobFromUrl(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Music download failed.");
  return await response.blob();
}

function wrapText(ctx, text, maxWidth) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];

  const lines = [];
  let line = words[0];

  for (let i = 1; i < words.length; i++) {
    const test = `${line} ${words[i]}`;
    if (ctx.measureText(test).width <= maxWidth) {
      line = test;
    } else {
      lines.push(line);
      line = words[i];
    }
  }
  lines.push(line);
  return lines;
}

function drawRoundedRect(ctx, x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function makeEndCard() {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser.");

  const hospitalText =
    localStorage.getItem("hospitalText") ||
    "Major Hospital • Dhaka, East Champaran";

  ctx.fillStyle = "#f7f9fc";
  ctx.fillRect(0, 0, 1080, 1920);

  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#d8e0ec";
  ctx.lineWidth = 5;
  drawRoundedRect(ctx, 70, 180, 940, 1560, 48);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#1769e0";
  ctx.beginPath();
  ctx.arc(540, 480, 115, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 28;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(500, 480);
  ctx.lineTo(580, 480);
  ctx.moveTo(540, 440);
  ctx.lineTo(540, 520);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = "#172033";
  ctx.font = "700 82px Arial, sans-serif";
  ctx.fillText("Major Hospital", 540, 760);

  const hospitalLines = (() => {
    ctx.font = "600 43px Arial, sans-serif";
    return wrapText(ctx, hospitalText, 760).slice(0, 2);
  })();

  ctx.fillStyle = "#1769e0";
  ctx.font = "600 43px Arial, sans-serif";
  hospitalLines.forEach((line, index) =>
    ctx.fillText(line, 540, 850 + index * 58)
  );

  const doctorY = 850 + hospitalLines.length * 58 + 30;
  ctx.fillStyle = "#39465a";
  ctx.font = "38px Arial, sans-serif";
  ctx.fillText("Major (Dr.) Ratish Kumar", 540, doctorY);

  ctx.font = "38px Arial, sans-serif";
  ctx.fillText("Orthopaedic Surgeon", 540, doctorY + 75);

  ctx.strokeStyle = "#d8e0ec";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(250, doctorY + 160);
  ctx.lineTo(830, doctorY + 160);
  ctx.stroke();

  ctx.fillStyle = "#596579";
  ctx.font = "32px Arial, sans-serif";
  ctx.fillText("Dhaka, East Champaran, Bihar", 540, doctorY + 245);

  ctx.fillStyle = "#172033";
  ctx.font = "600 36px Arial, sans-serif";
  ctx.fillText("Orthopaedic Care & Medical Awareness", 540, 1370);

  ctx.fillStyle = "#697386";
  ctx.font = "30px Arial, sans-serif";
  const disclaimer = wrapText(
    ctx,
    "Consult a qualified doctor for personal medical advice.",
    760
  );
  disclaimer.forEach((line, index) =>
    ctx.fillText(line, 540, 1450 + index * 42)
  );

  return canvas.toDataURL("image/png");
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not prepare an image for video export."));
    img.src = src;
  });
}

async function renderSceneFrame(scene, useCaptions) {
  if (!useCaptions || !scene.caption) return scene.image;

  const source = await loadImage(scene.image);
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser.");

  // Cover the frame while preserving the image aspect ratio.
  const sourceRatio = source.width / source.height;
  const targetRatio = canvas.width / canvas.height;
  let sx = 0, sy = 0, sw = source.width, sh = source.height;

  if (sourceRatio > targetRatio) {
    sw = source.height * targetRatio;
    sx = (source.width - sw) / 2;
  } else if (sourceRatio < targetRatio) {
    sh = source.width / targetRatio;
    sy = (source.height - sh) / 2;
  }

  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

  const margin = 55;
  const maxWidth = canvas.width - margin * 2;
  const fontSize = 42;
  const lineHeight = 54;

  ctx.font = `700 ${fontSize}px Arial, sans-serif`;
  const lines = wrapText(ctx, scene.caption, maxWidth - 50).slice(0, 4);
  const boxHeight = Math.max(120, lines.length * lineHeight + 50);
  const boxY = canvas.height - boxHeight - 55;

  ctx.fillStyle = "rgba(0,0,0,0.68)";
  drawRoundedRect(ctx, margin, boxY, maxWidth, boxHeight, 28);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  lines.forEach((line, index) => {
    ctx.fillText(
      line,
      canvas.width / 2,
      boxY + 32 + lineHeight / 2 + index * lineHeight
    );
  });

  return canvas.toDataURL("image/png");
}

async function makeVideo(images, seconds, musicBlob) {
  const FFmpegClass = window.FFmpeg?.FFmpeg;
  const fetchFile = window.FFmpegUtil?.fetchFile;
  const toBlobURL = window.FFmpegUtil?.toBlobURL;

  if (!FFmpegClass || !fetchFile || !toBlobURL) {
    throw new Error(
      "FFmpeg did not load in the browser. Check your internet connection and refresh the page."
    );
  }

  const ff = new FFmpegClass();

  try {
    ff.on("progress", ({ progress }) => {
      status(
        "Assembling MP4…",
        80 + Math.round(Math.max(0, Math.min(1, progress)) * 19)
      );
    });

    // @ffmpeg/ffmpeg 0.12.10 is paired with @ffmpeg/core 0.12.6 here.
    const base = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd";

    const [coreURL, wasmURL] = await Promise.all([
      toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
      toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm")
    ]);

    // The root worker is served by the same Vercel origin. This avoids the
    // cross-origin Worker problem from the default CDN worker URL.
    const classWorkerURL = new URL(
      "/static/ffmpeg/worker.js",
      window.location.origin
    ).href;

    await ff.load({
      coreURL,
      wasmURL,
      classWorkerURL
    });

    for (let i = 0; i < images.length; i++) {
      if (stopped) throw new Error("Stopped");
      await ff.writeFile(
        `img${i}.png`,
        await fetchFile(images[i])
      );
    }

    const args = [];

    for (let i = 0; i < images.length; i++) {
      args.push(
        "-framerate", "30",
        "-loop", "1",
        "-t", String(seconds),
        "-i", `img${i}.png`
      );
    }

    if (musicBlob) {
      await ff.writeFile("music", await fetchFile(musicBlob));
      args.push("-stream_loop", "-1", "-i", "music");
    }

    const filters = images.map((_, i) =>
      `[${i}:v]scale=1080:1920:force_original_aspect_ratio=decrease,` +
      `pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,format=yuv420p[v${i}]`
    ).join(";");

    const concatInputs = images.map((_, i) => `[v${i}]`).join("");

    args.push(
      "-filter_complex",
      `${filters};${concatInputs}concat=n=${images.length}:v=1:a=0[v]`,
      "-map", "[v]"
    );

    if (musicBlob) {
      args.push(
        "-map", `${images.length}:a:0`,
        "-shortest"
      );
    }

    args.push(
      "-r", "30",
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      "video.mp4"
    );

    await ff.exec(args);

    const data = await ff.readFile("video.mp4");
    return new Blob([data], {type: "video/mp4"});
  } finally {
    try {
      ff.terminate();
    } catch {}
  }
}

function esc(value) {
  return String(value || "").replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[m]));
}

function strip(value) {
  return String(value || "").replace(/<[^>]+>/g, "");
}

function showError(error) {
  const message = error?.message || String(error) || "Something went wrong.";
  console.error(error);
  status(message);
  alert(message);
}

function initApp() {
  const required = [
    "settingsBtn", "settings", "closeSettings", "saveSettings",
    "hospitalText", "stop", "generate", "topic", "sceneCount",
    "seconds", "language", "scenesCard", "scenes", "resultCard",
    "preview", "download", "credits", "status", "bar",
    "music", "captions"
  ];

  const missing = required.filter(id => !$(id));
  if (missing.length) {
    const message = `App setup error. Missing HTML element(s): ${missing.join(", ")}`;
    console.error(message);
    alert(message);
    return;
  }

  $("settingsBtn").onclick = () => $("settings").classList.remove("hidden");
  $("closeSettings").onclick = () => $("settings").classList.add("hidden");

  $("saveSettings").onclick = () => {
    localStorage.setItem("hospitalText", $("hospitalText").value.trim());
    $("settings").classList.add("hidden");
    status("Settings saved.");
  };

  $("hospitalText").value =
    localStorage.getItem("hospitalText") ||
    "Major Hospital • Dhaka, East Champaran";

  $("stop").onclick = () => {
    stopped = true;
    status("Stopping…");
  };

  $("generate").onclick = async () => {
    stopped = false;
    $("generate").disabled = true;
    $("stop").classList.remove("hidden");
    $("resultCard").classList.add("hidden");
    $("scenesCard").classList.add("hidden");
    $("scenes").innerHTML = "";

    if (currentVideoUrl) {
      URL.revokeObjectURL(currentVideoUrl);
      currentVideoUrl = null;
    }

    try {
      const topic = $("topic").value.trim();
      if (!topic) throw new Error("Enter a topic first.");

      const count = Math.max(
        3,
        Math.min(10, Number($("sceneCount").value) || 6)
      );
      const seconds = Math.max(
        3,
        Math.min(10, Number($("seconds").value) || 5)
      );
      const language = $("language").value;

      status("Creating script and scene plan…", 3);

      const plan = await jsonPost("/api/script", {
        topic,
        language,
        sceneCount: count,
        secondsPerScene: seconds,
        hospital:
          $("hospitalText").value.trim() ||
          "Major Hospital, Dhaka, East Champaran"
      });

      scenes = Array.isArray(plan.scenes) ? plan.scenes : [];

      if (scenes.length !== count) {
        throw new Error(
          `Script API returned ${scenes.length} scenes instead of ${count}.`
        );
      }

      $("scenesCard").classList.remove("hidden");

      for (let i = 0; i < scenes.length; i++) {
        if (stopped) throw new Error("Stopped");

        status(
          `Generating scene ${i + 1} of ${scenes.length}…`,
          5 + Math.round((i / scenes.length) * 50)
        );

        const prompt =
          String(
            scenes[i].visualPrompt ||
            scenes[i].imagePrompt ||
            scenes[i].visual ||
            ""
          ).trim();

        if (!prompt) {
          throw new Error(`Scene ${i + 1} has no visual prompt.`);
        }

        const imageResult = await jsonPost("/api/image", {prompt});

        if (!imageResult.imageBase64 || !imageResult.mimeType) {
          throw new Error(`Image API returned no image for scene ${i + 1}.`);
        }

        scenes[i].image = dataUrl(
          imageResult.mimeType,
          imageResult.imageBase64
        );

        const previewDiv = document.createElement("div");
        previewDiv.className = "scene";

        const img = document.createElement("img");
        img.src = scenes[i].image;
        img.alt = scenes[i].title || `Scene ${i + 1}`;

        const textDiv = document.createElement("div");

        const titleEl = document.createElement("h3");
        titleEl.textContent =
          `${i + 1}. ${scenes[i].title || `Scene ${i + 1}`}`;

        const captionEl = document.createElement("p");
        captionEl.textContent = scenes[i].caption || "";

        textDiv.appendChild(titleEl);
        textDiv.appendChild(captionEl);
        previewDiv.appendChild(img);
        previewDiv.appendChild(textDiv);
        $("scenes").appendChild(previewDiv);
      }

      const endCard = {
        title: "Major Hospital — End Card",
        caption:
          "Major Hospital • Major (Dr.) Ratish Kumar • Orthopaedic Surgeon",
        image: makeEndCard()
      };

      scenes.push(endCard);

      const endDiv = document.createElement("div");
      endDiv.className = "scene";

      const endImg = document.createElement("img");
      endImg.src = endCard.image;
      endImg.alt = "Major Hospital end card";

      const endText = document.createElement("div");
      const endTitle = document.createElement("h3");
      endTitle.textContent = `${scenes.length}. ${endCard.title}`;
      const endCaption = document.createElement("p");
      endCaption.textContent = endCard.caption;

      endText.appendChild(endTitle);
      endText.appendChild(endCaption);
      endDiv.appendChild(endImg);
      endDiv.appendChild(endText);
      $("scenes").appendChild(endDiv);

      const videoFrames = [];
      const useCaptions = $("captions").checked;

      if (useCaptions) {
        status("Preparing captions…", 63);

        for (let i = 0; i < scenes.length; i++) {
          if (stopped) throw new Error("Stopped");
          videoFrames.push(
            await renderSceneFrame(
              scenes[i],
              i < scenes.length - 1
            )
          );
        }
      } else {
        videoFrames.push(...scenes.map(scene => scene.image));
      }

      let musicBlob = null;
      musicInfo = null;

      if ($("music").checked) {
        status("Finding suitable background music…", 70);
        musicInfo = await getMusic(topic);

        if (musicInfo) {
          try {
            musicBlob = await blobFromUrl(musicInfo.url);
          } catch {
            musicInfo = null;
            musicBlob = null;
          }
        }
      }

      status("Building vertical MP4…", 80);

      const videoBlob = await makeVideo(
        videoFrames,
        seconds,
        musicBlob
      );

      currentVideoUrl = URL.createObjectURL(videoBlob);

      $("preview").src = currentVideoUrl;
      $("download").href = currentVideoUrl;
      $("download").download = "major-hospital-video.mp4";

      if (musicInfo) {
        $("credits").innerHTML =
          `Music: ${esc(strip(musicInfo.title))}` +
          `${musicInfo.artist ? ` — ${esc(strip(musicInfo.artist))}` : ""}. ` +
          `License: ${esc(strip(musicInfo.license))}. ` +
          `<a href="${esc(musicInfo.source)}" target="_blank" rel="noopener">Source</a>`;
      } else {
        $("credits").textContent =
          "No music track was found; video created without background music.";
      }

      $("resultCard").classList.remove("hidden");
      status("Video ready.", 100);

    } catch (error) {
      showError(error);
    } finally {
      $("generate").disabled = false;
      $("stop").classList.add("hidden");
    }
  };

  // Helpful diagnostic instead of a silent failure if CDN libraries fail to load.
  if (!window.FFmpeg?.FFmpeg || !window.FFmpegUtil?.fetchFile) {
    status("Ready. FFmpeg library is still loading or unavailable.");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp, {once: true});
} else {
  initApp();
}
