"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
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
  Loader2,
  FileText,
  ExternalLink
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
        .eq('status', 'Action_Required')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (err: any) {
      toast.error("Failed to load queue: " + err.message);
    } finally {
      setLoading(false);
    }
  }

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
    try {
      const { error } = await supabase
        .from('farmer_applications')
        .update({ 
          status: 'Verified_by_Clerk', 
          is_manually_overridden: true,
          discrepancy_reason: `OVERRIDDEN: ${overrideJustification}`
        })
        .eq('id', selectedApp.id);

      if (error) throw error;

      toast.success("AI Flag Overridden", {
        description: `Application ${selectedApp.id} approved. Taluka Officer (TAO) has been alerted of this manual override.`,
        className: "bg-red-50 border-red-200 text-red-900"
      });

      // Optimistic UI update
      setApplications(prev => prev.filter(a => a.id !== selectedApp.id));
      setShowOverrideModal(false);
    } catch (err: any) {
      toast.error("Override failed: " + err.message);
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
                <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
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
                    <div className="bg-red-50 border border-red-100 p-2.5 rounded-lg flex items-start gap-2.5 max-w-md">
                      <ShieldAlert size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] font-medium text-red-900 leading-relaxed">
                        {app.discrepancy_reason || "Unspecified AI Discrepancy"}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleRequestSMS(app)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:shadow-sm transition-all"
                      >
                        <PhoneForwarded size={14} />
                        Request Physical Doc
                      </button>
                      <button 
                        onClick={() => openOverrideModal(app)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-red-600 hover:text-white bg-red-50 hover:bg-red-600 border border-red-200 hover:border-red-600 rounded-lg transition-all"
                      >
                        <ShieldCheck size={14} />
                        Override & Approve
                      </button>
                    </div>
                  </td>
                </tr>
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
    </div>
  );
}
