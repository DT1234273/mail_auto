import { NextResponse } from 'next/server';
import { discoverLeadsWithGemini, analyzeWebsiteAndGenerateAudit, generateOutreachProposal } from '@/lib/services/gemini';
import { saveLead, saveAudit, saveOutreach, hasEmailBeenProcessed } from '@/lib/services/supabase';
import { sendTelegramNotification } from '@/lib/services/telegram';
import { sendEmail } from '@/lib/services/email';
import { WorkflowResult } from '@/lib/types';

export async function POST() {
  const logs: string[] = [];
  const log = (msg: string) => {
    console.log(msg);
    logs.push(msg);
  };

  try {
    log("Workflow triggered. Commencing global deep research for high-value prospects...");

    // 1. Discover candidate organizations & Collect Data globally
    log("Searching for leads globally (highest need, highest success probability)...");
    const leads = await discoverLeadsWithGemini();
    log(`Discovered ${leads.length} potential leads.`);

    let auditsCompleted = 0;
    let emailsDrafted = 0;
    let emailsSent = 0;

    for (const lead of leads) {
      log(`Processing: ${lead.business_name} (${lead.website || 'No website'}) in ${lead.city}, ${lead.country} (Language: ${lead.language})`);

      // 4 & 5. Remove Duplicates / Skip checked is handled safely by Supabase constraints or standard logic
      if (lead.email) {
        const alreadyEmailed = await hasEmailBeenProcessed(lead.email);
        if (alreadyEmailed) {
          log(`Skipping ${lead.business_name} - Email ${lead.email} already processed.`);
          continue;
        }
      }
      
      const leadId = await saveLead(lead);

      // 6, 7 & 8. Audit website
      log(`Auditing online presence for: ${lead.business_name}`);
      const audit = await analyzeWebsiteAndGenerateAudit(lead.website || "", lead.category);
      await saveAudit(leadId, audit);
      auditsCompleted++;

      // 9, 10 & 11. Generate recommendation & draft outreach in local language
      log(`Drafting outreach for: ${lead.business_name} in ${lead.language || 'English'}`);
      const outreachDraft = await generateOutreachProposal(lead, audit);
      await saveOutreach(leadId, outreachDraft);
      emailsDrafted++;

      // 12. Send Email (or queue)
      let targetEmail = lead.email;
      if (!targetEmail || targetEmail.trim() === "" || !targetEmail.includes("@") || targetEmail.toLowerCase().includes("not found")) {
        log(`No verified email found for ${lead.business_name}. Draft saved in DB, but skipping actual email sending to avoid bounces.`);
      } else {
        log(`Sending email target to: ${targetEmail}`);
        const sent = await sendEmail(targetEmail, outreachDraft.subject, outreachDraft.body);
        if (sent) emailsSent++;
      }
    }

    // 13 & 14. Report
    const reportMessage = `
🗓 **Daily Workflow Complete**
Category: Global Broad Search
Leads Processed: ${leads.length}
Audits Completed: ${auditsCompleted}
Emails Drafted: ${emailsDrafted}
Emails Sent: ${emailsSent}
    `;
    await sendTelegramNotification(reportMessage);
    log("Workflow finished successfully.");

    const result: WorkflowResult = {
      success: true,
      date: new Date().toISOString(),
      category: "Global Broad Search",
      leads_processed: leads.length,
      audits_completed: auditsCompleted,
      emails_drafted: emailsDrafted,
      emails_sent: emailsSent,
      logs
    };

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("Workflow Error:", error);
    await sendTelegramNotification(`⚠️ **Workflow Failed**: ${error.message}`);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      logs
    }, { status: 500 });
  }
}
