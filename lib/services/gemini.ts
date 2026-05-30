import { GoogleGenAI } from '@google/genai';
import { AuditResult, Lead, OutreachDraft } from '../types';
import { analyzeWithPageSpeed } from './pagespeed';

async function generateAiContent(prompt: string, enableSearch = false): Promise<string> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY Missing");

    const ai = new GoogleGenAI({ apiKey });
    const config: any = {};
    
    if (enableSearch) {
      config.tools = [{ googleSearch: {} }];
    } else {
      config.responseMimeType = "application/json";
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config
    });

    return response.text || "{}";
  } catch (err: any) {
    console.log("Using primary backup AI service.");
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
    let rawJson = text || "{}";
    if (rawJson.includes("\`\`\`json")) {
      rawJson = rawJson.replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "").trim();
    }
    return JSON.parse(rawJson) as AuditResult;
  } catch (err) {
    console.error("Audit Generation Error:", err);
    throw new Error("Failed to generate audit via AI.");
  }
}

export async function generateOutreachProposal(lead: Lead, audit: AuditResult): Promise<OutreachDraft> {
  const prompt = `
You are Dharamveer, a Web Developer specializing in modern websites, automation systems, and digital platforms.
You are pitching a website redesign and automation upgrade to a prospect.
Lead details:
- Business: ${lead.business_name}
- Category: ${lead.category}
- City: ${lead.city}

Audit Details (Score: ${audit.overall_score}/100):
Issues: ${audit.issues_found.join(', ')}
Recommendations: ${audit.recommendations.join(', ')}

Write a highly personalized, compelling, and professional cold email pitch addressed to the management of ${lead.business_name}.
The tone should be varied, natural, and highly professional - do not always use the exact same predictable format.

IMPORTANT: You MUST dynamically incorporate their specific audit results into the email body.
Explicitly mention the exact issues you found (e.g. mobile responsiveness, missing online booking, slow speed) and how you can fix them to help them get more customers. Make them understand exactly what is missing from their current setup and how fixing it will benefit them directly.

Include a personalized section detailing these missing features/issues and exactly what advanced automation features you propose for them.

You MUST include this exact Portfolio & Previous Work section in your email:
<strong>Portfolio & Previous Work:</strong><br>
<ul>
  <li><a href="https://casaarthiai.in/">Casaarthi AI</a></li>
  <li><a href="https://cronbuilder-eight.vercel.app/">Cron Builder</a></li>
  <li><a href="https://fatooratools-olive.vercel.app/">Fatoora Tools</a></li>
  <li><a href="https://nzheatpumpguide.thakordharamveer.workers.dev/">NZ Heat Pump Guide</a></li>
  <li><a href="https://nzsolarguide.thakordharamveer.workers.dev/">NZ Solar Guide</a></li>
</ul>

Offer them a free prototype homepage evaluation.

Close the email professionally:
Warm Regards,<br>
<strong>Dharamveer</strong><br>
Web Developer<br>
Email: <a href="mailto:thakordharamveer@gmail.com">thakordharamveer@gmail.com</a><br><br>

DO NOT omit the "Portfolio & Previous Work" list. Write the body purely in HTML format.

Return exactly a JSON object matching this TypeScript interface:
{
  "subject": "The email subject line",
  "body": "The HTML formatted email body"
}
`;

  const text = await generateAiContent(prompt);
  let rawJson = text || "{}";
  if (rawJson.includes("\`\`\`json")) {
    rawJson = rawJson.replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "").trim();
  }
  return JSON.parse(rawJson) as OutreachDraft;
}

export async function discoverLeadsWithGemini(category: string, city: string): Promise<Lead[]> {
  const prompt = `
Please perform a deep web search to find 3 ACTUAL, REAL, currently operating small-to-medium business leads in the exact category: "${category}" and city: "${city}".

CRITICAL INSTRUCTIONS FOR FINDING REAL EMAILS:
1. ONLY provide REAL, publicly verified contact email addresses. DO NOT GUESS.
2. DO NOT hallucinate standard emails (like info@, admin@, customercare@) unless you have confirmed they actually exist for that business.
3. If you cannot find a verified email for a business, SKIP IT and find another business instead.
4. Target local or mid-sized businesses, not massive national chains, to ensure higher deliverability to decision-makers.

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

  const text = await generateAiContent(prompt, true);
  let rawJson = text || "{}";
  if (rawJson.includes("\`\`\`json")) {
    rawJson = rawJson.replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "").trim();
  } else if (rawJson.includes("\`\`\`")) {
    rawJson = rawJson.replace(/\`\`\`/g, "").trim();
  }
  const parsed = JSON.parse(rawJson);
  return (parsed.leads || parsed) as Lead[];
}
