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
  const hasWebsite = websiteUrl && websiteUrl.trim() !== "";
  const pageSpeedData = hasWebsite ? await analyzeWithPageSpeed(websiteUrl) : null;
  
  const prompt = hasWebsite ? `
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
` : `
You are evaluating a business in the category: ${category}.
This business currently DOES NOT HAVE A WEBSITE. They only operate offline or via basic social media.

Please perform a simulated business audit based on the fact that they have zero web presence.
Determine why they desperately need:
- A Professional Website
- Online Booking / Admissions
- AI Chatbot
- Automation Features
- Customer Portal

Return exactly a JSON object matching this TypeScript interface. Set all website-specific boolean flags (ssl, responsive) to false and scores to 0.
{
  "ssl": false, "mobile_friendly": false, "responsive": false, "contact_form": false,
  "speed_score": 0, "mobile_score": 0,
  "seo_score": 0, "accessibility_score": 0,
  "online_booking": false, "online_admission": false, "customer_portal": false,
  "ai_chatbot": false, "automation_features": false,
  "overall_score": 0,
  "issues_found": ["No professional website exists", "Missed online visibility", ...etc],
  "recommendations": ["Build a professional website", "Setup online booking", ...etc]
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
  const hasWebsite = lead.website && lead.website.trim() !== "";
  const auditDetails = hasWebsite 
    ? `Audit Details (Score: ${audit.overall_score}/100):\nIssues: ${audit.issues_found.join(', ')}\nRecommendations: ${audit.recommendations.join(', ')}`
    : `Audit Details: The business currently has NO PROFESSIONAL WEBSITE.\nIssues: ${audit.issues_found.join(', ')}\nRecommendations: ${audit.recommendations.join(', ')}`;
  
  const pitchContext = hasWebsite 
    ? "You are pitching a website redesign and automation upgrade to a prospect who already has a website."
    : "You are pitching a brand new, highly professional website and automation system to a prospect who CURRENTLY DOES NOT HAVE A WEBSITE.";

  const prompt = `
You are Dharamveer, a Web Developer specializing in modern websites, automation systems, and digital platforms.
${pitchContext}
Lead details:
- Business: ${lead.business_name}
- Category: ${lead.category}
- City: ${lead.city}

${auditDetails}

Write a highly personalized, compelling, and professional cold email pitch addressed to the management of ${lead.business_name}.
Every email MUST be uniquely structured and freshly worded so it does not feel templated. Use varied greetings, opening hooks, and transitions.

IMPORTANT: You MUST dynamically incorporate their specific situation into the email body.
If they do not have a website, emphasize the massive lost opportunity and how a new modern website will bring them credibility and customers. If they have a website, explicitly mention the exact issues you found (e.g. mobile responsiveness, missing online booking, slow speed) and how you can fix them.

To ensure the email is highly scannable and professional, you MUST use HTML formatting effectively:
- Use <strong>bold text</strong> to highlight key metrics, specific missing features, and the primary benefits you offer.
- Use clean HTML bullet points (<ul><li>...</li></ul>) to clearly list out the exact issues/missing features in their current setup AND the specific advanced automation features you propose to solve them.

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
Please perform a deep web search to find 4 ACTUAL, REAL, currently operating small-to-medium business leads in the exact category: "${category}" and city: "${city}".

CRUCIAL INSTRUCTION (50/50 RATIO):
- Find 2 businesses that ALREADY HAVE an existing, live website (for an upgrade/redesign pitch).
- Find 2 businesses that DO NOT HAVE a website but physically exist (e.g., local shops, stores, schools with only a Facebook page or Google Maps listing but no actual website link) (for a new website creation pitch).

CRITICAL INSTRUCTIONS FOR FINDING REAL EMAILS (99% ACCURACY REQUIRED):
1. EVERY SINGLE LEAD (including those without websites) MUST HAVE A REAL, VERIFIED EMAIL ADDRESS.
2. For businesses without websites, find their email from their Facebook Page, Yelp, or Google Business listing.
3. You MUST find real contact email addresses. DO NOT GUESS OR INVENT EMAILS.
4. If an email address cannot be confirmed verifiable online, YOU MUST SKIP THAT BUSINESS and find another one. Keep searching until you find 4 businesses that ALL have verified email addresses.
5. Target local or mid-sized businesses.

Return exactly a JSON object matching this interface:
{
  "leads": [
    {
      "business_name": "string",
      "category": "${category}",
      "city": "${city}",
      "website": "string (The actual URL, or empty string '' if they do NOT have a website)",
      "email": "string (MUST BE A VALID EMAIL ADDRESS - DO NOT LEAVE EMPTY)",
      "email_source_url": "string (The URL where you found the email to prove it is real)",
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
