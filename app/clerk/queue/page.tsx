"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { updateApplicationStatus, executeBulkRouting } from '@/app/actions/clerk-actions';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Eye, 
  History, 
  Info, 
  PhoneForwarded, 
  ShieldAlert, 
  ShieldCheck, 
  XCircle,
  FileText,
  ExternalLink,
  Bot,
  ClipboardCheck,
  Terminal,
  Search,
  Loader2,
  Microscope,
  Check,
  Clock,
  Pause,
  X
} from 'lucide-react';
import { toast } from 'sonner';

interface Application {
  id: string;
  farmer_id: string;
  scheme_name: string;
  status: string;
  discrepancy_reason: string;
  document_urls: string[];
  created_at: string;
}

export default function ClerkQueuePage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideJustification, setOverrideJustification] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAiBatchProcessing, setIsAiBatchProcessing] = useState(false);
  const [auditingAppId, setAuditingAppId] = useState<string | null>(null);
  const [auditResults, setAuditResults] = useState<Record<string, any>>({});
  const [selectedDocInfo, setSelectedDocInfo] = useState<any>(null);
  
  // Human-in-the-Loop Batch UI state
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchEvaluations, setBatchEvaluations] = useState<any[]>([]);
  const [clerkDecisions, setClerkDecisions] = useState<Record<string, 'Approve' | 'Hold' | 'Reject'>>({});
  const [isBulkExecuting, setIsBulkExecuting] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchExceptions();
  }, []);

  async function fetchExceptions() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('farmer_applications')
        .select('*')
        .in('status', ['Action_Required', 'Pending'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (err: any) {
      toast.error("Failed to load queue: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleTriggerAIBatch = async () => {
    setIsAiBatchProcessing(true);
    try {
      const res = await fetch('/api/run-ai-batch', { method: 'POST' });
      let data;
      if (!res.ok && res.status === 405) {
        const fallbackRes = await fetch('/api/run-ai-batch');
        if (!fallbackRes.ok) throw new Error(`API returned ${fallbackRes.status}`);
        data = await fallbackRes.json();
      } else if (!res.ok) {
        throw new Error(`API returned ${res.status}`);
      } else {
        data = await res.json();
      }

      if (data.evaluations && data.evaluations.length > 0) {
        setBatchEvaluations(data.evaluations);
        setClerkDecisions({});
        setShowBatchModal(true);
      } else {
        toast.info("No pending applications to process.");
      }
    } catch (err: any) {
      toast.error("Failed to trigger AI Batch: " + err.message);
    } finally {
      setIsAiBatchProcessing(false);
    }
  };

  const handleExecuteBulkRouting = async () => {
    if (Object.keys(clerkDecisions).length !== batchEvaluations.length) {
      toast.error("Please make a decision for all applications before confirming.");
      return;
    }

    setIsBulkExecuting(true);
    try {
      const decisions = batchEvaluations.map(ev => {
        const decision = clerkDecisions[ev.id];
        let finalStatus = 'Pending';
        let reason = ev.discrepancy_reason;

        if (decision === 'Approve') {
          finalStatus = 'Verified_by_Clerk';
          reason = null; 
        } else if (decision === 'Hold') {
          finalStatus = 'Action_Required';
          reason = reason || 'Manually held by clerk for supervision';
        } else if (decision === 'Reject') {
          finalStatus = 'Rejected';
          reason = reason || 'Rejected during manual review';
        }

        return {
          id: ev.id,
          status: finalStatus,
          reason: reason
        };
      });

      const res = await executeBulkRouting(decisions);
      if (!res.success) throw new Error(res.error);

      toast.success("Batch Routing Executed!", {
        description: `Successfully processed ${decisions.length} applications.`,
        icon: <CheckCircle2 className="text-emerald-500" />
      });

      setShowBatchModal(false);
      setBatchEvaluations([]);
      setClerkDecisions({});
      await fetchExceptions();
    } catch (err: any) {
      toast.error("Bulk Routing Failed: " + err.message);
    } finally {
      setIsBulkExecuting(false);
    }
  };

  const handleDeepAudit = async (appId: string) => {
    if (auditResults[appId]) return;
    setAuditingAppId(appId);
    try {
      const response = await fetch('/api/deep-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ application_id: appId })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      
      setAuditResults(prev => ({ ...prev, [appId]: data.audit_report }));
      toast.success("Deep AI Audit Complete", { icon: <Microscope className="text-emerald-500" /> });
    } catch (err: any) {
      toast.error("Audit Failed: " + err.message);
    } finally {
      setAuditingAppId(null);
    }
  };

  const handleRequestSMS = (app: Application) => {
    toast.success(`Request Sent to ${app.farmer_id}`, {
      description: "SMS sent to farmer requesting physical 7/12 document for manual audit.",
      icon: <PhoneForwarded className="text-emerald-500" />,
    });
  };

  const openOverrideModal = (app: Application) => {
    setSelectedApp(app);
    setShowOverrideModal(true);
    setOverrideJustification("");
  };

  const handleOverrideApprove = async () => {
    if (!selectedApp) return;
    if (overrideJustification.length < 10) {
      toast.error("Please provide a valid justification (min 10 chars) for the TAO audit log.");
      return;
    }

    setIsProcessing(true);
    const applicationId = selectedApp.id;
    try {
      const result = await updateApplicationStatus(
        applicationId, 
        'Verified_by_Clerk', 
        `OVERRIDDEN: ${overrideJustification}`
      );

      if (!result.success) throw new Error(result.error);

      toast.success("AI Flag Overridden", {
        description: `Application ${applicationId} approved. Taluka Officer (TAO) has been alerted of this manual override.`,
        className: "bg-red-50 border-red-200 text-red-900"
      });

      // Update local state to strictly remove item from queue
      setApplications(prev => prev.filter(a => a.id !== applicationId));
      setShowOverrideModal(false);
      // router.refresh() removed to prevent Server Component race conditions duplicating state
    } catch (err: any) {
      toast.error("Override failed: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDirectApprove = async (app: Application) => {
    const confirmApprove = window.confirm("Are you sure you want to approve this application without a justification note?");
    if (!confirmApprove) return;

    setIsProcessing(true);
    const applicationId = app.id;
    try {
      const result = await updateApplicationStatus(
        applicationId, 
        'Verified_by_Clerk', 
        'DIRECT_APPROVAL: Verified by Clerk visually'
      );

      if (!result.success) throw new Error(result.error);

      toast.success("Application Approved", {
        description: `Status for ${app.farmer_id} updated to 'Verified_by_Clerk'.`,
        icon: <CheckCircle2 className="text-emerald-500" />
      });

      // Strictly filter out the approved application
      setApplications(prev => prev.filter(a => a.id !== applicationId));
      // router.refresh() removed to prevent Server Component race conditions duplicating state

    } catch (err: any) {
      toast.error("Approval failed: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
        <Loader2 className="animate-spin" size={40} />
        <p className="text-sm font-medium animate-pulse">Syncing with PRAGATI Vault...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex items-end justify-between border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Exception Queue</h1>
          <p className="text-sm text-slate-500 mt-1">Pending AI-Flagged applications requiring manual clerk intervention.</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-red-50 flex items-center justify-center text-red-600">
              <AlertTriangle size={18} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 leading-none">Total Flags</p>
              <p className="text-lg font-bold text-slate-900 leading-none mt-1">{applications.length}</p>
            </div>
          </div>
          <button 
            onClick={fetchExceptions}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-all"
          >
            <History size={14} />
            Refresh Queue
          </button>
          <button 
            onClick={handleTriggerAIBatch}
            disabled={isAiBatchProcessing}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isAiBatchProcessing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Bot size={14} />
            )}
            {isAiBatchProcessing ? "AI Engine Processing..." : "Trigger AI Batch Processor (Demo)"}
          </button>
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-20 text-center flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
            <CheckCircle2 size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Queue is Clear!</h3>
          <p className="text-sm text-slate-500 max-w-xs">No pending exceptions found. All AI-flagged applications have been resolved.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Application Detail</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">AI Discrepancy Reason</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {applications.map((app) => (
                <React.Fragment key={app.id}>
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <FileText size={14} className="text-slate-400" />
                        {app.farmer_id}
                      </span>
                      <span className="text-xs text-slate-500 mt-1">{app.scheme_name}</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">{new Date(app.created_at).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    {app.status === 'Pending' ? (
                      <div className="bg-amber-50 border border-amber-100 p-2.5 rounded-lg flex items-start gap-2.5 max-w-md">
                        <Clock size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-[11px] font-medium text-amber-800 leading-relaxed">
                          Awaiting AI Batch Processing — Run &quot;Trigger AI Batch Processor&quot; to classify this application.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-red-50 border border-red-100 p-2.5 rounded-lg flex items-start gap-2.5 max-w-md">
                        <ShieldAlert size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-[11px] font-medium text-red-900 leading-relaxed">
                          {app.discrepancy_reason || "Unspecified AI Discrepancy"}
                        </p>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button 
                        onClick={() => handleDeepAudit(app.id)}
                        disabled={auditingAppId === app.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 border border-indigo-200 hover:border-indigo-600 rounded-lg transition-all"
                      >
                        {auditingAppId === app.id ? <Loader2 size={14} className="animate-spin" /> : <ClipboardCheck size={14} />}
                        {auditingAppId === app.id ? "Analyzing Document..." : "Verify with AI Audit"}
                      </button>
                      <button 
                        onClick={() => handleRequestSMS(app)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:shadow-sm transition-all"
                      >
                        <PhoneForwarded size={14} />
                        Request Physical Doc
                      </button>
                      <button 
                        onClick={() => handleDirectApprove(app)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-emerald-600 hover:text-white bg-emerald-50 hover:bg-emerald-600 border border-emerald-200 hover:border-emerald-600 rounded-lg transition-all"
                      >
                        <Check size={14} />
                        Approve
                      </button>
                      <button 
                        onClick={() => openOverrideModal(app)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-red-600 hover:text-white bg-red-50 hover:bg-red-600 border border-red-200 hover:border-red-600 rounded-lg transition-all"
                      >
                        <ShieldCheck size={14} />
                        Override
                      </button>
                    </div>
                  </td>
                </tr>
                {(auditResults[app.id] || auditingAppId === app.id) && (
                  <tr>
                    <td colSpan={3} className="px-6 pb-6 pt-0 bg-white">
                      <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-2">
                         <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-3">
                            <div className="flex items-center gap-2 text-slate-700">
                               <ClipboardCheck size={16} className="text-indigo-600" />
                               <span className="font-bold text-xs uppercase tracking-tight">AI Audit Verification Report</span>
                            </div>
                            {auditResults[app.id] && (
                               <button 
                                 onClick={() => setAuditResults(prev => {
                                   const newRes = {...prev};
                                   delete newRes[app.id];
                                   return newRes;
                                 })}
                                 className="text-slate-400 hover:text-slate-600 flex items-center gap-1 text-[11px] font-medium transition-colors"
                               >
                                 <XCircle size={14} /> Close Report
                               </button>
                            )}
                         </div>
                         {auditingAppId === app.id ? (
                            <div className="flex items-center gap-3 py-4 text-slate-500">
                              <Loader2 size={18} className="animate-spin text-indigo-500" />
                              <p className="text-xs font-medium italic">PRAGATI AI is currently cross-referencing document data with scheme criteria...</p>
                            </div>
                         ) : auditResults[app.id] && typeof auditResults[app.id] === 'object' ? (
                            <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-inner">
                              <div className="bg-slate-50/50 px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${auditResults[app.id].overall_verdict === 'Safe' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                    Overall Verdict: <span className={auditResults[app.id].overall_verdict === 'Safe' ? 'text-emerald-600' : 'text-red-600'}>
                                      {auditResults[app.id].overall_verdict}
                                    </span>
                                  </span>
                                </div>
                              </div>
                              
                              <div className="p-2 space-y-1">
                                {auditResults[app.id].document_evaluations?.map((doc: any, idx: number) => (
                                  <div key={idx} className="group flex items-center justify-between p-3 hover:bg-slate-50/80 rounded-xl transition-all border border-transparent hover:border-slate-200/60 bg-white/50 mb-1 last:mb-0">
                                    <div className="flex items-center gap-4">
                                      {doc.status === 'Safe' ? (
                                        <div className="bg-emerald-100/80 text-emerald-600 p-2 rounded-lg shadow-sm">
                                          <Check size={14} strokeWidth={3} />
                                        </div>
                                      ) : (
                                        <div className="bg-red-100/80 text-red-600 p-2 rounded-lg shadow-sm">
                                          <X size={14} strokeWidth={3} />
                                        </div>
                                      )}
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <p className="text-xs font-bold text-slate-800">{doc.document_name}</p>
                                          <a 
                                            href={app.document_urls && app.document_urls[idx] ? app.document_urls[idx] : "#"} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                                            title="View Original Document"
                                            onClick={(e) => {
                                              if (!app.document_urls || !app.document_urls[idx]) {
                                                e.preventDefault();
                                                toast.info("This is a demo record. No physical document available for viewing.");
                                              }
                                            }}
                                          >
                                            <Eye size={13} />
                                          </a>
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-tighter">Status: {doc.status}</p>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                      <div className="relative group/info">
                                        <button 
                                          onClick={() => setSelectedDocInfo({ ...doc, appId: app.id })}
                                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/50 rounded-lg transition-all border border-transparent hover:border-indigo-100"
                                        >
                                          <Info size={16} />
                                        </button>
                                        
                                        {/* Hover Tooltip (Short Summary) */}
                                        <div className="absolute right-0 bottom-full mb-2 w-56 bg-slate-900 text-white p-3 rounded-xl shadow-2xl opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all z-[60] pointer-events-none transform translate-y-1 group-hover/info:translate-y-0">
                                          <p className="text-[10px] leading-relaxed text-slate-300">
                                            <span className="font-bold text-white block mb-1">Quick Summary</span>
                                            {doc.clerk_explanation.length > 80 ? doc.clerk_explanation.substring(0, 80) + "..." : doc.clerk_explanation}
                                          </p>
                                          <p className="text-[9px] text-indigo-400 mt-2 font-bold animate-pulse">Click for full report →</p>
                                          <div className="absolute -bottom-1 right-4 w-2 h-2 bg-slate-900 rotate-45"></div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                         ) : auditResults[app.id] && typeof auditResults[app.id] === 'string' ? (
                            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                              <div className="flex items-center gap-2 text-amber-800 mb-2">
                                <AlertTriangle size={16} />
                                <span className="text-xs font-bold uppercase tracking-wider">Legacy Audit Format</span>
                              </div>
                              <p className="text-xs text-amber-700 leading-relaxed mb-3">
                                This report was generated using the old text-based protocol. To see the new structured visual dashboard, please re-run the audit.
                              </p>
                              <button 
                                onClick={() => {
                                  setAuditResults(prev => {
                                    const next = {...prev};
                                    delete next[app.id];
                                    return next;
                                  });
                                  handleDeepAudit(app.id);
                                }}
                                className="px-3 py-1.5 bg-amber-600 text-white text-[10px] font-bold rounded-lg shadow-sm hover:bg-amber-700 transition-all"
                              >
                                Re-Audit with New Protocol
                              </button>
                            </div>
                         ) : null}
                         <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-400">
                            <Search size={12} />
                            <span>Verified by PRAGATI Deep Audit (Gemini 2.5 Flash) | Point-wise Decision Verdict</span>
                         </div>
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Override Confirmation Modal */}
      {showOverrideModal && selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-red-600 p-6 flex flex-col items-center text-center text-white">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mb-4 border-2 border-white/40">
                <ShieldAlert size={32} />
              </div>
              <h3 className="text-xl font-bold">Override AI Protocol?</h3>
              <p className="text-sm text-red-100 mt-2">
                WARNING: Bypassing the AI flag will mark this file as manually overridden and trigger a high-risk alert to the Taluka Officer (TAO).
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-2">Audit Justification (Required)</label>
                <textarea 
                  value={overrideJustification}
                  onChange={(e) => setOverrideJustification(e.target.value)}
                  placeholder="Explain why the AI flag is being ignored (e.g., Physical document verified, OCR misread name)..."
                  className="w-full h-24 p-3 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none outline-none transition-all"
                />
              </div>

              <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex items-start gap-3">
                <Info size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                <p className="text-[10px] text-slate-500 leading-relaxed italic">
                  Note: Your IP address and Clerk ID (C. Deshmukh) will be attached to this override for transparency.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setShowOverrideModal(false)}
                  className="flex-1 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleOverrideApprove}
                  disabled={isProcessing}
                  className="flex-1 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-lg shadow-red-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                >
                  {isProcessing && <Loader2 size={14} className="animate-spin" />}
                  Confirm Override
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Human-in-the-Loop AI Batch Review Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-slate-900 p-6 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                  <Bot size={24} className="text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">AI Batch Evaluation Review</h3>
                  <p className="text-sm text-slate-300">Human-in-the-Loop Supervision Required</p>
                </div>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-center">
                <p className="text-[10px] uppercase font-bold text-slate-400">Total Processed</p>
                <p className="text-xl font-bold text-white leading-none mt-1">{batchEvaluations.length}</p>
              </div>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
              <div className="space-y-4">
                {batchEvaluations.map((app) => (
                  <div key={app.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                          <FileText size={14} className="text-slate-400" />
                          {app.farmer_id}
                        </span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                          {app.scheme_name}
                        </span>
                      </div>
                      
                      <div className="mt-2">
                        {app.verdict === 'Safe to pass & no suspicion' ? (
                          <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded text-xs font-medium">
                            <CheckCircle2 size={12} />
                            AI Verdict: {app.verdict}
                          </div>
                        ) : app.verdict === 'Needs manual supervision' ? (
                          <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded text-xs font-medium">
                            <AlertTriangle size={12} />
                            AI Verdict: {app.verdict}
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded text-xs font-medium">
                            <ShieldAlert size={12} />
                            AI Verdict: {app.verdict}
                          </div>
                        )}
                        
                        {app.discrepancy_reason && (
                          <p className="text-[11px] text-slate-500 mt-1.5 max-w-lg">
                            <span className="font-semibold text-slate-700">Reason:</span> {app.discrepancy_reason}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Decision Controls */}
                    <div className="flex gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                      <button
                        onClick={() => setClerkDecisions(prev => ({ ...prev, [app.id]: 'Approve' }))}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold transition-all ${
                          clerkDecisions[app.id] === 'Approve' 
                            ? 'bg-emerald-500 text-white shadow-sm' 
                            : 'text-slate-500 hover:bg-emerald-50 hover:text-emerald-600'
                        }`}
                      >
                        <Check size={14} /> Approve
                      </button>
                      <button
                        onClick={() => setClerkDecisions(prev => ({ ...prev, [app.id]: 'Hold' }))}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold transition-all ${
                          clerkDecisions[app.id] === 'Hold' 
                            ? 'bg-amber-500 text-white shadow-sm' 
                            : 'text-slate-500 hover:bg-amber-50 hover:text-amber-600'
                        }`}
                      >
                        <Pause size={14} /> Hold
                      </button>
                      <button
                        onClick={() => setClerkDecisions(prev => ({ ...prev, [app.id]: 'Reject' }))}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold transition-all ${
                          clerkDecisions[app.id] === 'Reject' 
                            ? 'bg-red-500 text-white shadow-sm' 
                            : 'text-slate-500 hover:bg-red-50 hover:text-red-600'
                        }`}
                      >
                        <X size={14} /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer (Sticky) */}
            <div className="bg-white border-t border-slate-200 p-6 flex items-center justify-between shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <div className="flex -space-x-2 mr-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center border border-white text-emerald-600 z-30"><Check size={10} /></div>
                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center border border-white text-amber-600 z-20"><Pause size={10} /></div>
                  <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center border border-white text-red-600 z-10"><X size={10} /></div>
                </div>
                <span className="font-medium text-slate-700">{Object.keys(clerkDecisions).length}</span> 
                of <span className="font-medium text-slate-700">{batchEvaluations.length}</span> decided
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setShowBatchModal(false);
                    setBatchEvaluations([]);
                  }}
                  disabled={isBulkExecuting}
                  className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all"
                >
                  Discard Batch
                </button>
                <button 
                  onClick={handleExecuteBulkRouting}
                  disabled={isBulkExecuting || Object.keys(clerkDecisions).length !== batchEvaluations.length}
                  className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-500 rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  {isBulkExecuting ? <Loader2 size={16} className="animate-spin" /> : <ClipboardCheck size={16} />}
                  Confirm & Execute Routing
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Audit Detail Modal */}
      {selectedDocInfo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
            <div className="bg-indigo-600 p-6 text-white relative">
              <button 
                onClick={() => setSelectedDocInfo(null)}
                className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${selectedDocInfo.status === 'Safe' ? 'bg-emerald-500' : 'bg-red-500'} shadow-lg`}>
                  <ShieldAlert size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold opacity-80 uppercase tracking-widest">Document Audit Verdict</p>
                  <h3 className="text-2xl font-black">{selectedDocInfo.document_name}</h3>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh]">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-indigo-600">
                  <Terminal size={18} />
                  <h4 className="font-bold text-sm uppercase tracking-wider">Technical AI Verdict</h4>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-inner">
                  <p className="text-slate-700 leading-relaxed font-medium">
                    {selectedDocInfo.clerk_explanation}
                  </p>
                </div>
              </div>

              {selectedDocInfo.cross_document_impact && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-red-600">
                    <ShieldAlert size={18} />
                    <h4 className="font-bold text-sm uppercase tracking-wider">Cross-Document Impact</h4>
                  </div>
                  <div className="bg-red-50 p-6 rounded-2xl border border-red-100 shadow-sm">
                    <p className="text-red-900 leading-relaxed italic font-medium">
                      {selectedDocInfo.cross_document_impact}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4 pt-4">
                <button 
                  onClick={() => setSelectedDocInfo(null)}
                  className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 active:scale-95"
                >
                  Confirm & Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
