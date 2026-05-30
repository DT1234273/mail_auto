import { GoogleGenAI } from '@google/genai';
import { AuditResult, Lead, OutreachDraft } from '../types';
import { analyzeWithPageSpeed } from './pagespeed';

async function generateAiContent(prompt: string): Promise<string> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY Missing");

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    return response.text || "{}";
  } catch (err: any) {
    console.warn("⚠️ Gemini request failed or missing key. Falling back to Llama-3.3-70B on Groq...");
    return await callLlamaFallback(prompt);
  }
}

async function callLlamaFallback(prompt: string): Promise<string> {
  const groqKey = process.env.GROQ_API_KEY || "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";
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${groqKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ "role": "user", "content": prompt }],
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Groq API Error:", errText);
    throw new Error(`Fallback AI failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export async function analyzeWebsiteAndGenerateAudit(websiteUrl: string, category: string, rawPageText?: string): Promise<AuditResult> {
  const pageSpeedData = await analyzeWithPageSpeed(websiteUrl);
  
  const prompt = `
You are evaluating a website for a business in the category: ${category}.
URL: ${websiteUrl}
Real PageSpeed Mobile Score: ${pageSpeedData ? pageSpeedData.mobile_score : 'N/A (Estimate it)'}
Scraped Content Snippet: ${rawPageText || "N/A"}

Please perform a simulated technical and business audit based on the provided URL context and standard industry expectations for this type of business.
Determine if they typically need, or appear to lack:
- Online Booking / Admissions
- AI Chatbot
- Automation Features
- Customer Portal

Return exactly a JSON object matching this TypeScript interface:
{
  "ssl": boolean, "mobile_friendly": boolean, "responsive": boolean, "contact_form": boolean,
  "speed_score": number, "mobile_score": number,
  "seo_score": number, "accessibility_score": number,
  "online_booking": boolean, "online_admission": boolean, "customer_portal": boolean,
  "ai_chatbot": boolean, "automation_features": boolean,
  "overall_score": number,
  "issues_found": ["string array"],
  "recommendations": ["string array"]
}
`;

  try {
    const text = await generateAiContent(prompt);
    return JSON.parse(text) as AuditResult;
  } catch (err) {
    console.error("Audit Generation Error:", err);
    throw new Error("Failed to generate audit via AI.");
  }
}

export async function generateOutreachProposal(lead: Lead, audit: AuditResult): Promise<OutreachDraft> {
  const prompt = `
You are Dharamveer, a Web Developer. You specialize in building robust apps like Casa Saarthi AI and Fatoora Tools.
You are pitching a website redesign, automation upgrade, or AI chatbot integration to a prospect.
Lead details:
- Business: ${lead.business_name}
- Category: ${lead.category}
- City: ${lead.city}

Audit Details (Score: ${audit.overall_score}/100):
Issues: ${audit.issues_found.join(', ')}
Recommendations: ${audit.recommendations.join(', ')}

Write a highly personalized, compelling, and professional cold email pitch. 
No placeholder text like "[Your Phone Number]" - sign off as "Dharamveer, Web Developer".

Return exactly a JSON object matching this TypeScript interface:
{
  "subject": "The email subject line",
  "body": "The plain text email body"
}
`;

  const text = await generateAiContent(prompt);
  return JSON.parse(text) as OutreachDraft;
}

export async function discoverLeadsWithGemini(category: string, city: string): Promise<Lead[]> {
  const prompt = `
Generate 3 realistic, but synthetic business leads for the completely automated CRM demo.
Category: ${category}
City: ${city}

Return exactly a JSON object matching this interface:
{
  "leads": [
    {
      "business_name": "string",
      "category": "${category}",
      "city": "${city}",
      "website": "string (e.g. https://www...)",
      "email": "string",
      "phone": "string"
    }
  ]
}
`;

  const text = await generateAiContent(prompt);
  const parsed = JSON.parse(text || "{}");
  return (parsed.leads || parsed) as Lead[];
}
