'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  Briefcase, 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  Clock, 
  BarChart3,
  Award,
  Zap,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

export default function TAODashboard() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);
  const [auditingAppId, setAuditingAppId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchApplications();
  }, []);

  async function fetchApplications() {
    setLoading(true);
    const { data, error } = await supabase
      .from('farmer_applications')
      .select('*')
      .eq('status', 'Sent_to_TAO');

    if (error) {
      console.error(error);
      toast.error('Failed to fetch applications: ' + error.message);
    } else {
      setApplications(data || []);
    }
    setLoading(false);
  }

  const handleRunAudit = async (app: any) => {
    setAuditingAppId(app.id);
    const toastId = toast.loading("Running Pragati AI Deep Audit...");
    try {
      const farmerNameMatch = app.farmer_id.match(/FARMER_(.*?)_\d{4}/);
      const farmerName = farmerNameMatch ? farmerNameMatch[1].replace(/_/g, ' ') : "Farmer";

      const response = await fetch('/api/phase3-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: app.id,
          quotationUrl: app.quotation_url,
          receiptUrl: app.receipt_url,
          documentUrls: app.document_urls,
          farmerName: farmerName,
          subsidyReason: app.subsidy_reason || app.scheme_name
        })
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      const { error: updateError } = await supabase
        .from('farmer_applications')
        .update({
          discrepancy_reason: JSON.stringify(result.audit)
        })
        .eq('id', app.id);

      if (updateError) throw updateError;
      
      toast.success("AI Audit Complete", { id: toastId });
      fetchApplications();

    } catch (err: any) {
      toast.error(`Audit Failed: ${err.message}`, { id: toastId });
    } finally {
      setAuditingAppId(null);
    }
  };

  async function handleFinalApproval(appId: string) {
    if (!confirm('Are you sure you want to GRANT FINAL SANCTION for this application?')) return;

    try {
      const { error } = await supabase
        .from('farmer_applications')
        .update({ status: 'Approved' })
        .eq('id', appId);
        
      if (error) throw error;
      
      toast.success('Final Sanction Granted! Budget Released.');
      fetchApplications();
    } catch (err) {
      toast.error('Failed to process sanction');
    }
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5] p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-[#1B4332] text-white text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-widest">State Admin</span>
              <span className="h-1 w-1 bg-slate-400 rounded-full"></span>
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Taluka Agriculture Office</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
              <Award className="text-[#1B4332]" size={32} />
              Pre-Sanction Approval Desk
            </h1>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
              <div className="h-10 w-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                <DollarSign size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Taluka Budget Left</p>
                <p className="text-lg font-black text-slate-900">₹42.50 L</p>
              </div>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="h-10 w-10 border-4 border-[#1B4332] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : applications.length === 0 ? (
          <div className="bg-white rounded-[2rem] p-16 text-center border border-slate-200 shadow-xl shadow-slate-200/50">
            <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="text-emerald-500" size={40} />
            </div>
            <h3 className="text-2xl font-black text-slate-900">Workspace Optimized</h3>
            <p className="text-slate-500 font-medium">No pending pre-sanctions. All applications have been processed.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {applications.map(app => {
              const farmerNameMatch = app.farmer_id.match(/FARMER_(.*?)_\d{4}/);
              const farmerName = farmerNameMatch ? farmerNameMatch[1].replace(/_/g, ' ') : "Farmer";
              const isExpanded = expandedAppId === app.id;
              
              let aiResult = null;
              if (app.discrepancy_reason) {
                try {
                  aiResult = JSON.parse(app.discrepancy_reason);
                } catch(e) {}
              }
              const isClean = !aiResult || aiResult.verdict === 'Verified';

              let phase1AiResult = null;
              if (app.extracted_text) {
                try {
                  phase1AiResult = JSON.parse(app.extracted_text);
                } catch(e) {}
              }
              const isPhase1Clean = !phase1AiResult || phase1AiResult.overall_verdict === 'Safe' || phase1AiResult.overall_verdict === 'Verified_by_AI';

              
              return (
              <div key={app.id} className="bg-white rounded-[2rem] p-8 shadow-xl shadow-slate-200/40 border border-white flex flex-col gap-6 group hover:border-[#1B4332]/20 transition-all">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-xs font-black text-[#1B4332] bg-[#1B4332]/5 px-3 py-1 rounded-full border border-[#1B4332]/10">
                        APP-{app.id.substring(0, 6).toUpperCase()}
                      </span>
                      <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                        <Clock size={12} /> {new Date(app.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <h3 className="text-2xl font-black text-slate-900 mb-1">{farmerName}</h3>
                    <p className="text-slate-500 font-medium mb-6">Scheme: {app.scheme_name} | Subsidy: {app.subsidy_reason}</p>
                    
                    <div className="flex flex-wrap gap-3">
                      <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${isClean ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                        {isClean ? <CheckCircle size={14} className="text-emerald-500" /> : <AlertTriangle size={14} className="text-red-500" />}
                        <span className={`text-xs font-bold ${isClean ? 'text-emerald-700' : 'text-red-700'}`}>
                          AI: {isClean ? 'CLEAN' : 'FLAGGED'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                        <CheckCircle size={14} className="text-emerald-500" />
                        <span className="text-xs font-bold text-slate-700">Phase 3: Verified</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-4">
                    <div className="text-right flex items-center gap-4">
                      <button 
                        onClick={() => setExpandedAppId(isExpanded ? null : app.id)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors"
                      >
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </button>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                        <p className="text-2xl font-black text-[#1B4332]">Pending TAO</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-3 w-full md:w-auto mt-2">
                      <button className="flex-1 md:flex-none px-6 py-4 rounded-2xl font-black text-sm text-red-600 hover:bg-red-50 transition-all">
                        Query Application
                      </button>
                      <button 
                        onClick={() => handleFinalApproval(app.id)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-black text-sm bg-[#1B4332] text-white hover:bg-[#2D6A4F] shadow-2xl shadow-[#1B4332]/30 transition-all active:scale-95"
                      >
                        <Award size={20} />
                        Grant Final Sanction
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-2 fade-in">
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                      <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                        <FileText size={18} className="text-slate-500"/> Submitted Documents
                      </h4>
                      <div className="space-y-3">
                        {app.document_urls && app.document_urls.length > 0 && app.document_urls.map((url: string, index: number) => {
                          // Try to extract a readable name, e.g., 'Aadhaar' or '7-12' from the URL, otherwise use a fallback
                          const fileNameRaw = url.split('/').pop() || '';
                          const cleanName = fileNameRaw.includes('_') ? fileNameRaw.split('_').slice(2).join('_').split('.')[0] : `Initial Document ${index + 1}`;
                          const displayTitle = cleanName.length > 2 ? cleanName.replace(/-/g, ' ') : `Initial Document ${index + 1}`;

                          return (
                            <a key={index} href={url} target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 transition-colors group/link">
                              <span className="text-sm font-bold text-slate-700 capitalize">{displayTitle}</span>
                              <span className="text-xs font-black text-blue-600 group-hover/link:underline">VIEW</span>
                            </a>
                          );
                        })}
                        {app.quotation_url ? (
                          <a href={app.quotation_url} target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 transition-colors group/link">
                            <span className="text-sm font-bold text-slate-700">Dealer Quotation</span>
                            <span className="text-xs font-black text-blue-600 group-hover/link:underline">VIEW</span>
                          </a>
                        ) : (
                          <div className="p-4 bg-white rounded-xl border border-slate-200 text-slate-400 text-sm italic">No quotation uploaded</div>
                        )}
                        {app.receipt_url ? (
                          <a href={app.receipt_url} target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-300 transition-colors group/link">
                            <span className="text-sm font-bold text-slate-700">GST Payment Receipt</span>
                            <span className="text-xs font-black text-blue-600 group-hover/link:underline">VIEW</span>
                          </a>
                        ) : (
                          <div className="p-4 bg-white rounded-xl border border-slate-200 text-slate-400 text-sm italic">No receipt uploaded</div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-6">
                      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-bold text-slate-800 flex items-center gap-2">
                            <Zap size={18} className="text-amber-500"/> Phase 3 AI Audit Details
                          </h4>
                          <button 
                            onClick={() => handleRunAudit(app)}
                            disabled={auditingAppId === app.id}
                            className="px-3 py-1 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2"
                          >
                            {auditingAppId === app.id ? <Loader2 size={12} className="animate-spin" /> : "Run AI Audit"}
                          </button>
                        </div>
                        {aiResult ? (
                          <div className="space-y-4">
                            <div className={`p-4 rounded-xl border ${isClean ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                              <p className="text-sm font-medium">{aiResult.reason}</p>
                            </div>
                            
                            {aiResult.extractedDetails && (
                              <div className="bg-white p-4 rounded-xl border border-slate-200 text-sm">
                                <h5 className="font-bold text-slate-600 mb-2 uppercase text-[10px] tracking-widest">Extracted Information</h5>
                                <ul className="space-y-2">
                                  <li className="flex justify-between border-b border-slate-50 pb-1"><span className="text-slate-500">Name on Doc:</span> <span className="font-medium text-slate-800">{aiResult.extractedDetails.farmerNameOnDoc || '-'}</span></li>
                                  <li className="flex justify-between border-b border-slate-50 pb-1"><span className="text-slate-500">GST:</span> <span className="font-medium text-slate-800">{aiResult.extractedDetails.gstNumber || '-'}</span></li>
                                  <li className="flex justify-between border-b border-slate-50 pb-1"><span className="text-slate-500">Quotation Item:</span> <span className="font-medium text-slate-800 text-right max-w-[150px] truncate">{aiResult.extractedDetails.quotationItem || '-'}</span></li>
                                  <li className="flex justify-between border-b border-slate-50 pb-1"><span className="text-slate-500">Receipt Item:</span> <span className="font-medium text-slate-800 text-right max-w-[150px] truncate">{aiResult.extractedDetails.receiptItem || '-'}</span></li>
                                  <li className="flex justify-between border-b border-slate-50 pb-1"><span className="text-slate-500">Quoted Price:</span> <span className="font-medium text-slate-800">{aiResult.extractedDetails.quotedPrice || '-'}</span></li>
                                  <li className="flex justify-between border-b border-slate-50 pb-1"><span className="text-slate-500">Receipt Amount:</span> <span className="font-medium text-slate-800">{aiResult.extractedDetails.receiptPrice || '-'}</span></li>
                                  <li className="flex justify-between border-b border-slate-50 pb-1"><span className="text-slate-500">7/12 Land:</span> <span className="font-medium text-slate-800">{aiResult.extractedDetails.landHolding712 || '-'}</span></li>
                                  <li className="flex justify-between border-b border-slate-50 pb-1"><span className="text-slate-500">8A Land:</span> <span className="font-medium text-slate-800">{aiResult.extractedDetails.landHolding8A || '-'}</span></li>
                                  <li className="flex justify-between border-b border-slate-50 pb-1"><span className="text-slate-500">Crop Type (7/12):</span> <span className="font-medium text-slate-800">{aiResult.extractedDetails.cropType || '-'}</span></li>
                                  <li className="flex justify-between border-b border-slate-50 pb-1"><span className="text-slate-500">Water Source (7/12):</span> <span className="font-medium text-slate-800">{aiResult.extractedDetails.waterSourceOn712 || '-'}</span></li>
                                  <li className="flex justify-between border-b border-slate-50 pb-1"><span className="text-slate-500">Water Source Check:</span> <span className={`font-bold text-xs px-2 py-0.5 rounded-full ${aiResult.extractedDetails.waterSourceCheck === 'PASS' ? 'bg-emerald-100 text-emerald-700' : aiResult.extractedDetails.waterSourceCheck === 'FAIL' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>{aiResult.extractedDetails.waterSourceCheck || '-'}</span></li>
                                  <li className="flex justify-between border-b border-slate-50 pb-1"><span className="text-slate-500">Caste Detected:</span> <span className="font-medium text-slate-800">{aiResult.extractedDetails.casteDetected || '-'}</span></li>
                                  <li className="flex justify-between"><span className="text-slate-500">Aadhaar Valid:</span> <span className="font-medium text-slate-800">{aiResult.extractedDetails.aadhaarValid || '-'}</span></li>
                                </ul>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-4 text-slate-400 gap-3">
                            <CheckCircle size={32} className="text-slate-300" />
                            <span className="text-sm">No Phase 3 audit results saved.</span>
                          </div>
                        )}
                      </div>

                      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                          <Zap size={18} className="text-blue-500"/> Phase 1 AI Audit (Initial Docs)
                        </h4>
                        {phase1AiResult ? (
                          <div className="space-y-4">
                            <div className={`p-4 rounded-xl border ${isPhase1Clean ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                              <p className="text-sm font-medium">Overall Verdict: {phase1AiResult.overall_verdict}</p>
                            </div>
                            
                            {phase1AiResult.document_evaluations && phase1AiResult.document_evaluations.length > 0 && (
                              <div className="bg-white p-4 rounded-xl border border-slate-200 text-sm space-y-3">
                                {phase1AiResult.document_evaluations.map((doc: any, i: number) => (
                                  <div key={i} className="border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                                    <h5 className="font-bold text-slate-700 capitalize flex items-center justify-between">
                                      {doc.document_name}
                                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${doc.status === 'Safe' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{doc.status}</span>
                                    </h5>
                                    <p className="text-xs text-slate-500 mt-1">{doc.clerk_explanation}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-4 text-slate-400 gap-3">
                            <CheckCircle size={32} className="text-slate-300" />
                            <span className="text-sm">No Phase 1 audit results saved.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )})}
          </div>
        )}
      </div>
    </div>
  );
}
