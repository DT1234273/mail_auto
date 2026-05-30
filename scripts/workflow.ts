import 'dotenv/config'; // Loads .env if running locally
import { discoverLeadsWithGemini, analyzeWebsiteAndGenerateAudit, generateOutreachProposal } from '../lib/services/gemini';
import { saveLead, saveAudit, saveOutreach } from '../lib/services/supabase';
import { sendTelegramNotification } from '../lib/services/telegram';
import { sendEmail } from '../lib/services/email';

const CATEGORY_ROTATION = [
  "Schools, Colleges, Universities, Coaching Institutes",
  "Hospitals, Clinics, Dental Clinics",
  "Restaurants, Hotels, Cafes",
  "Gyms, Fitness Centers, Yoga Studios",
  "Real Estate, Builders, Architects",
  "CA Firms, Law Firms, Consultants",
  "Retail Stores, Electronics Stores, Furniture Stores"
];

async function runWorkflow() {
  console.log("🚀 Automation Workflow Started...");

  try {
    const dayIndex = new Date().getDay(); 
    const category = CATEGORY_ROTATION[dayIndex % 7];
    console.log(`🎯 Day ${dayIndex}: Target Category is "${category}"`);

    console.log(`🔍 Searching for leads in category: ${category}`);
    const leads = await discoverLeadsWithGemini(category, "New Delhi"); 
    console.log(`✅ Discovered ${leads.length} potential leads.`);

    let auditsCompleted = 0;
    let emailsDrafted = 0;
    let emailsSent = 0;

    for (const lead of leads) {
      console.log(`\n---------------------------------`);
      console.log(`🏢 Processing: ${lead.business_name} (${lead.website})`);

      const leadId = await saveLead(lead);

      console.log(`🩺 Auditing website: ${lead.website}`);
      const audit = await analyzeWebsiteAndGenerateAudit(lead.website, lead.category);
      await saveAudit(leadId, audit);
      auditsCompleted++;

      console.log(`✍️ Drafting outreach for: ${lead.business_name}`);
      const outreachDraft = await generateOutreachProposal(lead, audit);
      await saveOutreach(leadId, outreachDraft);
      emailsDrafted++;

      if (lead.email) {
        console.log(`📧 Sending email to: ${lead.email}`);
        const sent = await sendEmail(lead.email, outreachDraft.subject, outreachDraft.body);
        if (sent) emailsSent++;
      } else {
        console.log(`⚠️ No public email found for ${lead.business_name}. Queued in DB.`);
      }
    }

    const reportMessage = `
🗓 **Daily Workflow Complete**
Category: ${category}
Leads Processed: ${leads.length}
Audits Completed: ${auditsCompleted}
Emails Drafted: ${emailsDrafted}
Emails Sent: ${emailsSent}
    `;
    await sendTelegramNotification(reportMessage);
    
    console.log("\n✅ Workflow finished successfully.");

  } catch (error: any) {
    console.error("\n❌ Workflow Error:", error);
    await sendTelegramNotification(`⚠️ **Workflow Failed**: ${error.message}`);
    process.exit(1);
  }
}

runWorkflow();
