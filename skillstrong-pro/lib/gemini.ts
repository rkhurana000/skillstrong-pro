import { GoogleGenerativeAI } from '@google/generative-ai';
const modelName=process.env.GEMINI_MODEL||'gemini-1.5-flash';
export async function callGeminiJSON(userText:string, sysPrompt:string){
  const k=process.env.GEMINI_API_KEY; if(!k) throw new Error('GEMINI_API_KEY missing');
  const genAI=new GoogleGenerativeAI(k);
  const model=genAI.getGenerativeModel({model:modelName});
  const res=await model.generateContent({contents:[{role:'user',parts:[{text:userText}]}],systemInstruction:{text:sysPrompt},generationConfig:{responseMimeType:'application/json'}} as any);
  const t=res.response.text(); try{return JSON.parse(t);}catch{return{answer:t,buttons:[],nav:[],facts:[]}};
}
