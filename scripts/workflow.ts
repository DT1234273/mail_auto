import 'dotenv/config'; // Loads .env if running locally
import { discoverLeadsWithGemini, analyzeWebsiteAndGenerateAudit, generateOutreachProposal } from '../lib/services/gemini';
import { saveLead, saveAudit, saveOutreach, hasEmailBeenProcessed } from '../lib/services/supabase';
import { sendTelegramNotification } from '../lib/services/telegram';
import { sendEmail } from '../lib/services/email';

async function runWorkflow() {
  console.log("🚀 Automation Workflow Started...");

  try {
    console.log("🎯 Commencing global deep research for high-value prospects...");

    console.log("🔍 Searching for leads globally (highest need, highest success probability)...");
    const leads = await discoverLeadsWithGemini(); 
    console.log(`✅ Discovered ${leads.length} potential leads.`);

    let auditsCompleted = 0;
    let emailsDrafted = 0;
    let emailsSent = 0;

    for (const lead of leads) {
      console.log(`\n---------------------------------`);
      console.log(`🏢 Processing: ${lead.business_name} (${lead.website || 'No website'}) in ${lead.city}, ${lead.country} (Lang: ${lead.language})`);

      if (lead.email) {
        const alreadyEmailed = await hasEmailBeenProcessed(lead.email);
        if (alreadyEmailed) {
          console.log(`⏭️ Skipping ${lead.business_name} - Email ${lead.email} already processed.`);
          continue;
        }
      }

      const leadId = await saveLead(lead);

      console.log(`🩺 Auditing online presence: ${lead.website || 'N/A'}`);
      const audit = await analyzeWebsiteAndGenerateAudit(lead.website || "", lead.category);
      await saveAudit(leadId, audit);
      auditsCompleted++;

      console.log(`✍️ Drafting outreach for: ${lead.business_name} in ${lead.language || 'English'}`);
      const outreachDraft = await generateOutreachProposal(lead, audit);
      await saveOutreach(leadId, outreachDraft);
      emailsDrafted++;

      const targetEmail = lead.email;
      if (!targetEmail || targetEmail.trim() === "" || !targetEmail.includes("@") || targetEmail.toLowerCase().includes("not found")) {
        console.log(`⚠️ No verified email address found for ${lead.business_name}. Draft saved, skipping sending to prevent bounces.`);
      } else {
        console.log(`📧 Sending email to: ${targetEmail}`);
        const sent = await sendEmail(targetEmail, outreachDraft.subject, outreachDraft.body);
        if (sent) emailsSent++;
      }
    }

    const reportMessage = `
🗓 **Daily Workflow Complete**
Category: Global Broad Search
Leads Processed: ${leads.length}
Audits Completed: ${auditsCompleted}
Emails Drafted: ${emailsDrafted}
Emails Sent: ${emailsSent}
    `;
    await sendTelegramNotification(reportMessage);
    
    console.log("\n✅ Workflow finished successfully.");

  } catch (error: any) {
    console.error("\n❌ Workflow Error:", error);
    const errorMessage = error?.message || String(error);
    await sendTelegramNotification(`⚠️ Workflow Failed: ${errorMessage}`);
    process.exit(1);
  }
}

runWorkflow();
