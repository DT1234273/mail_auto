import 'dotenv/config'; // Loads .env if running locally
import { discoverLeadsWithGemini, analyzeWebsiteAndGenerateAudit, generateOutreachProposal } from '../lib/services/gemini';
import { saveLead, saveAudit, saveOutreach, hasEmailBeenProcessed } from '../lib/services/supabase';
import { sendTelegramNotification } from '../lib/services/telegram';
import { sendEmail } from '../lib/services/email';

async function runWorkflow() {
  console.log("🚀 Automation Workflow Started...");

  try {
    console.log("🎯 Commencing global deep research for high-value prospects...");

    let emailsSent = 0;
    let auditsCompleted = 0;
    let emailsDrafted = 0;
    let totalLeadsDiscovered = 0;
    let searchCycle = 0;

    while (emailsSent < 7 && searchCycle < 10) {
      searchCycle++;
      console.log(`\n=================================`);
      console.log(`🔍 SEARCH CYCLE ${searchCycle} (Need ${7 - emailsSent} more successful emails)...`);
      const leads = await discoverLeadsWithGemini(); 
      console.log(`✅ Discovered ${leads.length} potential leads in this cycle.`);
      totalLeadsDiscovered += leads.length;

      for (const lead of leads) {
        if (emailsSent >= 7) break; // Finished our daily quota

        console.log(`\n---------------------------------`);
        console.log(`🏢 Processing: ${lead.business_name} (${lead.website || 'No website'}) in ${lead.city}, ${lead.country} (Lang: ${lead.language})`);

        if (!lead.email) {
          console.log(`⚠️ AI did not provide a verifiable email for ${lead.business_name}. Skipping.`);
          continue;
        }

        const alreadyEmailed = await hasEmailBeenProcessed(lead.email);
        if (alreadyEmailed) {
          console.log(`⏭️ Skipping ${lead.business_name} - Email ${lead.email} already processed.`);
          continue;
        }

        const leadId = await saveLead(lead);

        console.log(`🩺 Auditing online presence: ${lead.website || 'N/A'}`);
        const audit = await analyzeWebsiteAndGenerateAudit(lead.website || "", lead.category);
        await saveAudit(leadId, audit);
        auditsCompleted++;

        console.log(`✍️ Drafting outreach for: ${lead.business_name} in English`);
        const outreachDraft = await generateOutreachProposal(lead, audit);
        await saveOutreach(leadId, outreachDraft);
        emailsDrafted++;

        const targetEmail = lead.email;
        if (!targetEmail || targetEmail.trim() === "" || !targetEmail.includes("@") || targetEmail.toLowerCase().includes("not found")) {
          console.log(`⚠️ No verified email address found for ${lead.business_name}. Draft saved, skipping sending to prevent bounces.`);
        } else {
          console.log(`📧 Sending email to: ${targetEmail}`);
          const sent = await sendEmail(targetEmail, outreachDraft.subject, outreachDraft.body);
          if (sent) {
            emailsSent++;
            console.log(`✅ Sent email successfully to ${targetEmail} (${emailsSent}/7)`);
            
            if (emailsSent < 7) {
              console.log(`⏳ Waiting for 30 minutes before sending the next email (Rate limiting / Bouncing prevention)...`);
              // 30 minutes = 30 * 60 * 1000 = 1800000 ms
              await new Promise(resolve => setTimeout(resolve, 30 * 60 * 1000));
            }
          }
        }
      }
    }

    const reportMessage = `
🗓 **Daily Workflow Complete**
Category: Global Broad Search
Search Cycles Used: ${searchCycle}
Leads Processed: ${totalLeadsDiscovered}
Audits Completed: ${auditsCompleted}
Emails Drafted: ${emailsDrafted}
Emails Sent: ${emailsSent}/7
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
