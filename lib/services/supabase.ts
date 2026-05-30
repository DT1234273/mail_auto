import { createClient } from '@supabase/supabase-js';
import { Lead, AuditResult, OutreachDraft } from '../types';

const getSupabase = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key || !url.startsWith('http')) {
    console.warn("Supabase credentials missing or invalid. Mocking DB operations.");
    return null;
  }
  try {
    return createClient(url, key);
  } catch (err: any) {
    console.warn("Supabase client creation failed, mocking DB operations:", err.message);
    return null;
  }
};

export async function saveLead(lead: Lead): Promise<string> {
  const supabase = getSupabase();
  if (!supabase) return `mock-lead-id-${Date.now()}`;

  const { data, error } = await supabase.from('leads').insert([lead]).select().single();
  if (error) {
    console.error("Supabase insert lead error:", error);
    throw new Error(error.message);
  }
  return data.id;
}

export async function saveAudit(leadId: string, audit: AuditResult) {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase.from('audits').insert([{
    lead_id: leadId,
    audit_score: audit.overall_score,
    issues_found: audit.issues_found,
    recommendations: audit.recommendations,
    full_audit_json: audit
  }]);
  
  if (error) console.error("Supabase insert audit error:", error);
}

export async function saveOutreach(leadId: string, draft: OutreachDraft) {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase.from('outreach').insert([{
    lead_id: leadId,
    subject: draft.subject,
    body: draft.body,
    status: 'drafted'
  }]);
  
  if (error) console.error("Supabase insert outreach error:", error);
}

export async function getLeadsFromDb(): Promise<any[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(50);
  if (error) {
    console.error("Supabase fetch leads error:", error);
    return [];
  }
  return data || [];
}
