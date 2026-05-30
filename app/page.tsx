'use client';

import { useState } from 'react';
import { 
  Bot, 
  Send, 
  CheckCircle2, 
  Clock, 
  BarChart, 
  Users, 
  Settings,
  Mail,
  Zap,
  Activity
} from 'lucide-react';

export default function AgentDashboard() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  const runWorkflow = async () => {
    setRunning(true);
    setLogs(["Initializing daily workflow sequence..."]);
    setResult(null);

    try {
      const res = await fetch('/api/workflow', { method: 'POST' });
      const data = await res.json();
      setResult(data);
      if (data.logs) setLogs(data.logs);
    } catch (err: any) {
      setLogs(prev => [...prev, `Critical Error: ${err.message}`]);
    }

    setRunning(false);
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-sm tracking-tight text-gray-900">Casaarthi Agent</h1>
            <p className="text-xs text-gray-500">Autonomous CRM</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${activeTab === 'overview' ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
          >
            <Activity className="w-4 h-4" /> Overview
          </button>
          <button 
            onClick={() => setActiveTab('leads')}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${activeTab === 'leads' ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
          >
            <Users className="w-4 h-4" /> Leads Network
          </button>
          <button 
            onClick={() => setActiveTab('campaigns')}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${activeTab === 'campaigns' ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
          >
            <Mail className="w-4 h-4" /> Email Outreach
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${activeTab === 'settings' ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
          >
            <Settings className="w-4 h-4" /> Configuration
          </button>
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button
            onClick={runWorkflow}
            disabled={running}
            className="w-full flex items-center justify-center gap-2 bg-black text-white px-4 py-2 text-sm font-medium rounded-md shadow-sm hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {running ? <Clock className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {running ? 'Executing...' : 'Run Daily Workflow'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="px-8 py-6 border-b border-gray-200 bg-white shadow-sm sticky top-0 z-10">
          <h2 className="text-xl font-semibold text-gray-900 tracking-tight">System Terminal & Dashboard</h2>
          <p className="text-sm text-gray-500 mt-1">Monitor the daily autonomous workflow execution.</p>
        </header>

        <div className="p-8 max-w-5xl mx-auto space-y-8">
          
          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between text-gray-500 mb-3">
                <span className="text-xs font-medium uppercase tracking-wider">Leads Processed</span>
                <Users className="w-4 h-4" />
              </div>
              <div className="text-3xl font-semibold text-gray-900">
                {result?.leads_processed || "0"}
              </div>
            </div>
            
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between text-gray-500 mb-3">
                <span className="text-xs font-medium uppercase tracking-wider">Audits Run</span>
                <BarChart className="w-4 h-4" />
              </div>
              <div className="text-3xl font-semibold text-gray-900">
                {result?.audits_completed || "0"}
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between text-gray-500 mb-3">
                <span className="text-xs font-medium uppercase tracking-wider">Mails Drafted</span>
                <Send className="w-4 h-4" />
              </div>
              <div className="text-3xl font-semibold text-gray-900">
                {result?.emails_drafted || "0"}
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between text-emerald-600 mb-3">
                <span className="text-xs font-medium uppercase tracking-wider">Mails Sent</span>
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="text-3xl font-semibold text-gray-900">
                {result?.emails_sent || "0"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            <div className="md:col-span-2 space-y-4">
              <h3 className="text-sm font-medium text-gray-900 uppercase tracking-tight">System Output Logs</h3>
              <div className="bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-800 h-96 overflow-y-auto font-mono text-xs shadow-inner">
                {logs.length === 0 ? (
                  <div className="text-gray-500 h-full flex flex-col items-center justify-center text-center">
                    <Activity className="w-8 h-8 text-gray-700 mb-3" />
                    <p>System idling.</p>
                    <p>Click "Run Daily Workflow" to initialize automation sequence.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {logs.map((log, idx) => (
                      <div key={idx} className="flex gap-3 text-gray-300">
                        <span className="text-emerald-500 font-semibold px-2 border-r border-gray-700 select-none whitespace-nowrap">
                          {new Date().toISOString().substring(11,19)}
                        </span>
                        <span className={log.includes('Error') ? 'text-red-400' : 'text-gray-100'}>
                          {log}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900 uppercase tracking-tight">Active Configurations</h3>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden text-sm">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-gray-600">Bot Logic</span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                  </span>
                </div>
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-gray-600">Model Engine</span>
                  <span className="text-gray-900 font-mono text-xs">gemini-2.5-flash</span>
                </div>
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-gray-600">Search Strategy</span>
                  <span className="text-gray-900 font-mono text-xs">Synthetic AI Proxy</span>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <span className="text-gray-600">Target User</span>
                  <span className="text-gray-900 font-medium">Dharamveer</span>
                </div>
              </div>

              {result && result.success && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mt-4 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h4 className="text-sm font-semibold text-emerald-900 mb-1 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Workflow Completed
                  </h4>
                  <p className="text-xs text-emerald-700 leading-relaxed">
                    Successfully processed Category: <strong className="font-semibold text-emerald-900">{result.category}</strong>. Secure persistence via Supabase invoked. Outreach emails queued.
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
