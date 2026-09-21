import {GoogleGenAI} from "@google/genai";

export default async function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({error:"POST only"});
  try{
    const prompt=String(req.body?.prompt||"");
    if(!prompt) return res.status(400).json({error:"Prompt required"});
    const ai=new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY});
    const r=await ai.models.generateContent({
      model:"gemini-2.5-flash-image",
      contents:prompt+" Create a clean vertical 9:16 medical-awareness visual. No logos, no fake phone numbers, no watermark, no readable text unless explicitly requested."
    });
    for(const part of (r.candidates?.[0]?.content?.parts||[])){
      if(part.inlineData?.data){
        return res.status(200).json({mimeType:part.inlineData.mimeType||"image/png",imageBase64:part.inlineData.data});
      }
    }
    throw Error("Gemini did not return an image");
  }catch(e){res.status(500).json({error:e.message||"Image generation failed"})}
}