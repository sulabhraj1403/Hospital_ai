import {GoogleGenAI} from "@google/genai";

export default async function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"POST only"});
  try{
    const {topic,language="Hindi",count=6,hospital="Major Hospital, Dhaka, East Champaran"}=req.body||{};
    if(!topic) return res.status(400).json({error:"Topic is required"});
    const ai=new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY});
    const prompt=`Create a short medical-awareness vertical video plan for ${hospital}.
Topic: ${topic}
Language: ${language}
Exactly ${count} scenes.
Return ONLY valid JSON with this shape:
{"title":"...","scenes":[{"title":"...","caption":"short on-screen caption","imagePrompt":"detailed photorealistic vertical 9:16 image prompt"}]}
Make the information educational, cautious and non-diagnostic. Avoid claiming a specific patient has a condition. Do not put phone numbers or invented doctors into images. The final scene should be a simple professional hospital call-to-action.`;
    const r=await ai.models.generateContent({model:"gemini-2.5-flash",contents:prompt,config:{responseMimeType:"application/json"}});
    let text=r.text||"";
    text=text.replace(/^```json\s*/,"").replace(/```$/,"").trim();
    const data=JSON.parse(text);
    if(!Array.isArray(data.scenes)||data.scenes.length!==Number(count)) throw Error("Invalid scene plan");
    res.status(200).json(data);
  }catch(e){res.status(500).json({error:e.message||"Gemini request failed"})}
}