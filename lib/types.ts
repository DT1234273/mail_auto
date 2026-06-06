export interface Lead {
  id?: string;
  business_name: string;
  category: string;
  city: string;
  country: string;
  language: string;
  website: string;
  email: string | null;
  email_source_url?: string;
  phone: string | null;
  status?: 'discovered' | 'audited' | 'drafted' | 'sent' | 'replied';
  created_at?: string;
}

export interface AuditResult {
  ssl: boolean;
  mobile_friendly: boolean;
  responsive: boolean;
  contact_form: boolean;
  speed_score: number;
  mobile_score: number;
  seo_score: number;
  accessibility_score: number;
  online_booking: boolean;
  online_admission: boolean;
  customer_portal: boolean;
  ai_chatbot: boolean;
  automation_features: boolean;
  overall_score: number;
  issues_found: string[];
  recommendations: string[];
}

export interface OutreachDraft {
  subject: string;
  body: string;
}

export interface WorkflowResult {
  success: boolean;
  date: string;
  category: string;
  leads_processed: number;
  audits_completed: number;
  emails_drafted: number;
  emails_sent: number;
  logs: string[];
}
