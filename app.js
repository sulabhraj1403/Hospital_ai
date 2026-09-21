const $=id=>document.getElementById(id);
let stopped=false, scenes=[], musicInfo=null;

$("settingsBtn").onclick=()=>$("settings").classList.remove("hidden");
$("closeSettings").onclick=()=>$("settings").classList.add("hidden");
$("saveSettings").onclick=()=>{localStorage.hospitalText=$("hospitalText").value;$("settings").classList.add("hidden")};
$("hospitalText").value=localStorage.hospitalText||$("hospitalText").value;

function status(t,p=null){$("status").textContent=t;if(p!==null)$("bar").style.width=p+"%"}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
function dataUrl(mime,b64){return `data:${mime};base64,${b64}`}

async function jsonPost(url,body){
  const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  const j=await r.json(); if(!r.ok) throw new Error(j.error||"Server error"); return j;
}

async function getMusic(topic){
  // Wikimedia Commons public API: search for CC/free instrumental music.
  const q=encodeURIComponent(`instrumental music ${topic}`);
  const api=`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${q}&gsrnamespace=6&gsrlimit=10&prop=imageinfo&iiprop=url|extmetadata&format=json&origin=*`;
  try{
    const j=await fetch(api).then(r=>r.json());
    const pages=Object.values(j.query?.pages||{});
    const audio=pages.find(p=>/\.(mp3|ogg|oga|wav)$/i.test(p.imageinfo?.[0]?.url||""));
    if(!audio) return null;
    const ii=audio.imageinfo[0], md=ii.extmetadata||{};
    return {url:ii.url,title:md.ObjectName?.value||audio.title,artist:md.Artist?.value||"",license:md.LicenseShortName?.value||"See source",source:"https://commons.wikimedia.org/wiki/"+encodeURIComponent(audio.title.replace(/^File:/,"File:"))};
  }catch(e){return null}
}

async function blobFromUrl(url){const r=await fetch(url);if(!r.ok)throw Error("Music download failed");return await r.blob()}

async function makeVideo(images, seconds, captions, musicBlob){
  const {FFmpeg}=window.FFmpeg, {fetchFile,toBlobURL}=window.FFmpegUtil;
  const ff=new FFmpeg();
  ff.on("progress",({progress})=>status("Assembling MP4…",80+Math.round(progress*19)));
  const base="https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd";
  await ff.load({coreURL:await toBlobURL(base+"/ffmpeg-core.js","text/javascript"),wasmURL:await toBlobURL(base+"/ffmpeg-core.wasm","application/wasm")});
  for(let i=0;i<images.length;i++){
    await ff.writeFile(`img${i}.png`,await fetchFile(images[i]));
  }
  const args=[];
  for(let i=0;i<images.length;i++) args.push("-loop","1","-t",String(seconds),"-i",`img${i}.png`);
  if(musicBlob){await ff.writeFile("music",await fetchFile(musicBlob));args.push("-stream_loop","-1","-i","music")}
  args.push("-filter_complex",`concat=n=${images.length}:v=1:a=0,format=yuv420p[v]`);
  if(musicBlob) args.push("-map","[v]","-map",`${images.length}:a:0`,"-shortest");
  else args.push("-map","[v]");
  args.push("-r","30","-c:v","libx264","-preset","veryfast","-movflags","+faststart","video.mp4");
  await ff.exec(args);
  const data=await ff.readFile("video.mp4");
  return new Blob([data.buffer],{type:"video/mp4"});
}

$("stop").onclick=()=>{stopped=true;status("Stopping…")};

$("generate").onclick=async()=>{
  stopped=false;$("generate").disabled=true;$("stop").classList.remove("hidden");
  $("resultCard").classList.add("hidden");$("scenesCard").classList.add("hidden");$("scenes").innerHTML="";
  try{
    const topic=$("topic").value.trim(); if(!topic) throw Error("Enter a topic first.");
    const count=+$("sceneCount").value, seconds=+$("seconds").value, language=$("language").value;
    status("Creating script and scene plan…",3);
    const plan=await jsonPost("/api/script",{topic,language,count,hospital:localStorage.hospitalText||"Major Hospital, Dhaka, East Champaran"});
    scenes=plan.scenes||[];
    $("scenesCard").classList.remove("hidden");
    for(let i=0;i<scenes.length;i++){
      if(stopped)throw Error("Stopped");
      status(`Generating scene ${i+1} of ${scenes.length}…`,5+Math.round(i/scenes.length*55));
      const r=await jsonPost("/api/image",{prompt:scenes[i].imagePrompt});
      scenes[i].image=dataUrl(r.mimeType,r.imageBase64);
      const div=document.createElement("div");div.className="scene";
      div.innerHTML=`<img src="${scenes[i].image}"><div><h3>${i+1}. ${esc(scenes[i].title)}</h3><p>${esc(scenes[i].caption||"")}</p></div>`;
      $("scenes").appendChild(div);
    }
    let mb=null;
    if($("music").checked){
      status("Finding suitable background music…",63);
      musicInfo=await getMusic(topic);
      if(musicInfo){try{mb=await blobFromUrl(musicInfo.url)}catch(e){mb=null}}
    }
    status("Building vertical MP4…",80);
    const blob=await makeVideo(scenes.map(x=>x.image),seconds,$("captions").checked,mb);
    const url=URL.createObjectURL(blob);
    $("preview").src=url;$("download").href=url;$("download").download="major-hospital-video.mp4";
    $("credits").innerHTML=musicInfo?`Music: ${esc(strip(musicInfo.title))}${musicInfo.artist?" — "+strip(musicInfo.artist):""}. License: ${esc(musicInfo.license)}. <a href="${musicInfo.source}" target="_blank" rel="noopener">Source</a>`:"No music track was found; video created without background music.";
    $("resultCard").classList.remove("hidden");status("Video ready.",100);
  }catch(e){status(e.message||"Something went wrong.");alert(e.message||"Something went wrong.");}
  finally{$("generate").disabled=false;$("stop").classList.add("hidden")}
};

function esc(s){return String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function strip(s){return String(s||"").replace(/<[^>]+>/g,"")}

