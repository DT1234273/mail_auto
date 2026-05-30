import { GoogleGenAI } from '@google/genai';
import { AuditResult, Lead, OutreachDraft } from '../types';
import { analyzeWithPageSpeed } from './pagespeed';

const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set.");
  return new GoogleGenAI({ apiKey });
};

export async function analyzeWebsiteAndGenerateAudit(websiteUrl: string, category: string, rawPageText?: string): Promise<AuditResult> {
  const ai = getAiClient();
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
  ssl: boolean, mobile_friendly: boolean, responsive: boolean, contact_form: boolean,
  speed_score: number (0-100), mobile_score: number (0-100),
  seo_score: number (0-100), accessibility_score: number (0-100),
  online_booking: boolean, online_admission: boolean, customer_portal: boolean,
  ai_chatbot: boolean, automation_features: boolean,
  overall_score: number (0-100),
  issues_found: string[],
  recommendations: string[]
}
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const result = JSON.parse(response.text || "{}");
    return result as AuditResult;
  } catch (err) {
    console.error("Gemini Audit Error:", err);
    throw new Error("Failed to generate audit via AI.");
  }
}

export async function generateOutreachProposal(lead: Lead, audit: AuditResult): Promise<OutreachDraft> {
  const ai = getAiClient();
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

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    }
  });

  const result = JSON.parse(response.text || "{}");
  return result as OutreachDraft;
}

// Simulated Search for leads using Gemini if real API is missing
export async function discoverLeadsWithGemini(category: string, city: string): Promise<Lead[]> {
  const ai = getAiClient();
  const prompt = `
Generate 3 realistic, but synthetic business leads for the completely automated CRM demo.
Category: ${category}
City: ${city}

Return exactly a JSON array matching this interface:
[{
  "business_name": "string",
  "category": "${category}",
  "city": "${city}",
  "website": "string (e.g. https://www...)",
  "email": "string",
  "phone": "string"
}]
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    }
  });

  const parsed = JSON.parse(response.text || "[]");
  return parsed as Lead[];
}
