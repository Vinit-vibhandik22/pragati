"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  FileSearch, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  FileText,
  BadgeCheck,
  Ban,
  Receipt,
  FileSpreadsheet
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/context/LanguageContext";

export default function Phase3QueuePage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditingAppId, setAuditingAppId] = useState<string | null>(null);
  const [auditFailedAppIds, setAuditFailedAppIds] = useState<string[]>([]);
  
  const { language } = useLanguage();
  const lang = language === "en" ? "EN" : "MR";
  const supabase = createClient();

  useEffect(() => {
    fetchApplications();
    
    // Subscribe to realtime changes
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'farmer_applications' },
        (payload) => {
          fetchApplications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('farmer_applications')
        .select('*')
        .eq('status', 'Pending_Phase_3')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (err: any) {
      toast.error("Failed to fetch applications");
    } finally {
      setLoading(false);
    }
  };

  const handleRunAudit = async (app: any) => {
    setAuditingAppId(app.id);
    const toastId = toast.loading("Running Pragati AI Phase 3 Audit...");
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 seconds timeout

    try {
      // Mock farmer name extraction since we don't have a profile table linked directly in this demo
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
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      // Save the audit result
      const { error: updateError } = await supabase
        .from('farmer_applications')
        .update({
          discrepancy_reason: JSON.stringify(result.audit) // Reusing this field to store audit result for demo
        })
        .eq('id', app.id);

      if (updateError) throw updateError;
      
      toast.success("AI Audit Complete", { id: toastId });
      // Remove from failed apps if it previously failed but now succeeded
      setAuditFailedAppIds(prev => prev.filter(id => id !== app.id));
      fetchApplications(); // refresh to show audit results

    } catch (err: any) {
      clearTimeout(timeoutId);
      // Silently fail, unlock the approve button, and dismiss the loading toast
      toast.dismiss(toastId);
      setAuditFailedAppIds(prev => [...prev, app.id]);
    } finally {
      setAuditingAppId(null);
    }
  };

  const handleFinalApprove = async (appId: string) => {
    try {
      // Preserve the AI audit JSON in discrepancy_reason so TAO can see it
      const { error } = await supabase
        .from('farmer_applications')
        .update({ status: 'Sent_to_TAO' })
        .eq('id', appId);

      if (error) throw error;
      toast.success("Application approved and sent to TAO!");
      fetchApplications();
    } catch (err: any) {
      toast.error("Failed to approve application");
    }
  };

  const handleReject = async (app: any) => {
    try {
      // Preserve the AI audit result as the rejection reason so the farmer can see it
      let reason = app.discrepancy_reason || null;
      // If the audit result doesn't already exist, store a generic reason
      if (!reason) {
        reason = JSON.stringify({ flag: 'CLERK_REJECTED', reason: 'Application was rejected by the Clerk during Phase 3 review.' });
      }

      const { error } = await supabase
        .from('farmer_applications')
        .update({ status: 'Rejected', discrepancy_reason: reason })
        .eq('id', app.id);

      if (error) throw error;
      toast.success("Application rejected");
      fetchApplications();
    } catch (err: any) {
      toast.error("Failed to reject application");
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-emerald-600" size={40} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Phase 3 Audits (Quotations & Receipts)</h1>
          <p className="text-slate-500">Review final documents before sending to TAO for disbursement.</p>
        </div>
        <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg font-bold border border-emerald-200">
          {applications.length} Pending Reviews
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-16 text-center flex flex-col items-center">
          <FileSearch size={48} className="text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-700">Queue is empty</h3>
          <p className="text-slate-500">No phase 3 documents pending review.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {applications.map((app) => {
            let aiResult = null;
            if (app.discrepancy_reason) {
              try {
                aiResult = JSON.parse(app.discrepancy_reason);
              } catch (e) {}
            }

            return (
              <div key={app.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col gap-4">
                <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">{app.scheme_name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">{app.farmer_id}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-sm font-bold text-emerald-600">Sub: {app.subsidy_reason}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleReject(app)}
                      className="px-4 py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
                    >
                      Reject
                    </button>
                    <button 
                      onClick={() => handleFinalApprove(app.id)}
                      disabled={!aiResult && !auditFailedAppIds.includes(app.id)}
                      className={`px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors shadow-sm ${(!aiResult && !auditFailedAppIds.includes(app.id)) ? 'bg-slate-300 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                      title={(!aiResult && !auditFailedAppIds.includes(app.id)) ? "You must run the Deep Audit before approving" : "Approve and send to TAO"}
                    >
                      {(!aiResult && auditFailedAppIds.includes(app.id)) ? "Force Approve (Audit Failed)" : "Approve & Send to TAO"}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                    <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><FileSpreadsheet size={16}/> Documents</h4>
                    <div className="space-y-2">
                      <a href={app.quotation_url} target="_blank" rel="noreferrer" className="flex items-center justify-between bg-white p-3 rounded border border-slate-200 hover:border-blue-300 transition-colors">
                        <span className="text-sm font-medium text-slate-700">Dealer Quotation</span>
                        <span className="text-xs text-blue-600 font-bold">View</span>
                      </a>
                      <a href={app.receipt_url} target="_blank" rel="noreferrer" className="flex items-center justify-between bg-white p-3 rounded border border-slate-200 hover:border-blue-300 transition-colors">
                        <span className="text-sm font-medium text-slate-700">GST Payment Receipt</span>
                        <span className="text-xs text-blue-600 font-bold">View</span>
                      </a>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-slate-700 flex items-center gap-2"><BadgeCheck size={16}/> Pragati AI Audit</h4>
                      {!aiResult && (
                        <button 
                          onClick={() => handleRunAudit(app)}
                          disabled={auditingAppId === app.id}
                          className="px-3 py-1 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2"
                        >
                          {auditingAppId === app.id ? <Loader2 size={12} className="animate-spin" /> : "Run Deep Audit"}
                        </button>
                      )}
                    </div>
                    
                    {aiResult ? (
                      <div className={`flex-1 rounded-lg border p-4 ${aiResult.verdict === 'Verified' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                        <div className="flex items-start gap-3">
                          {aiResult.verdict === 'Verified' ? <CheckCircle2 className="text-emerald-600 shrink-0" /> : <Ban className="text-red-600 shrink-0" />}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`font-bold ${aiResult.verdict === 'Verified' ? 'text-emerald-700' : 'text-red-700'}`}>
                                {aiResult.verdict === 'Verified' ? 'CLEAN: Documents Verified' : 'FLAGGED'}
                              </span>
                              {aiResult.flag && aiResult.flag !== 'CLEAN' && (
                                <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded font-mono tracking-wider">{aiResult.flag}</span>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 mt-1">{aiResult.reason}</p>
                            
                            {aiResult.extractedDetails && (
                              <div className="mt-3 bg-white/50 p-2 rounded border border-white/40 text-xs">
                                <ul className="space-y-1">
                                  <li><span className="font-semibold text-slate-500">Name:</span> {aiResult.extractedDetails.farmerNameOnDoc}</li>
                                  <li><span className="font-semibold text-slate-500">GST:</span> {aiResult.extractedDetails.gstNumber}</li>
                                  <li><span className="font-semibold text-slate-500">Quotation Item:</span> {aiResult.extractedDetails.quotationItem}</li>
                                  <li><span className="font-semibold text-slate-500">Receipt Item:</span> {aiResult.extractedDetails.receiptItem}</li>
                                  <li><span className="font-semibold text-slate-500">Quoted Price:</span> {aiResult.extractedDetails.quotedPrice}</li>
                                  <li><span className="font-semibold text-slate-500">Receipt Amount:</span> {aiResult.extractedDetails.receiptPrice}</li>
                                  <li><span className="font-semibold text-slate-500">7/12 Land:</span> {aiResult.extractedDetails.landHolding712}</li>
                                  <li><span className="font-semibold text-slate-500">8A Land:</span> {aiResult.extractedDetails.landHolding8A}</li>
                                  <li><span className="font-semibold text-slate-500">Crop Type (7/12):</span> {aiResult.extractedDetails.cropType}</li>
                                  <li><span className="font-semibold text-slate-500">Water Source (7/12):</span> {aiResult.extractedDetails.waterSourceOn712}</li>
                                  <li><span className="font-semibold text-slate-500">Water Source Check:</span> <span className={`font-bold text-[10px] px-1.5 py-0.5 rounded ${aiResult.extractedDetails.waterSourceCheck === 'PASS' ? 'bg-emerald-100 text-emerald-700' : aiResult.extractedDetails.waterSourceCheck === 'FAIL' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>{aiResult.extractedDetails.waterSourceCheck || '-'}</span></li>
                                  <li><span className="font-semibold text-slate-500">Caste:</span> {aiResult.extractedDetails.casteDetected}</li>
                                  <li><span className="font-semibold text-slate-500">Aadhaar:</span> {aiResult.extractedDetails.aadhaarValid}</li>
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2 p-4 border border-dashed border-slate-300 rounded-lg">
                        <FileSearch size={24} />
                        <span className="text-xs text-center">Run AI Audit to verify GST, Name, and Subsidy compatibility</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
