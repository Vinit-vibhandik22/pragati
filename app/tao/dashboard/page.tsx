"use client";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  AlertTriangle, 
  CheckCircle2, 
  FileCheck, 
  ShieldAlert, 
  ShieldCheck, 
  XCircle,
  Loader2,
  TrendingUp,
  Users,
  ShieldHalf,
  ArrowRight,
  GanttChartSquare,
  Lock,
  UserCheck,
  AlertCircle,
  RefreshCcw,
  Inbox
} from 'lucide-react';
import { toast } from 'sonner';

interface Application {
  id: string;
  farmer_id: string;
  scheme_name: string;
  status: string;
  discrepancy_reason: string;
  is_manually_overridden: boolean;
  document_urls: string[];
  created_at: string;
}

export default function TAODashboard() {
  const [cleanQueue, setCleanQueue] = useState<Application[]>([]);
  const [riskQueue, setRiskQueue] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchQueues();
  }, []);

  async function fetchQueues() {
    setLoading(true);
    try {
      // Fetch Clean Queue (Verified by AI - Standard path)
      const { data: clean, error: cleanError } = await supabase
        .from('farmer_applications')
        .select('*')
        .eq('status', 'Verified_by_AI')
        .order('created_at', { ascending: false });

      // Fetch Risk Queue (All Clerk actions: Overridden OR Direct Approvals)
      const { data: risk, error: riskError } = await supabase
        .from('farmer_applications')
        .select('*')
        .eq('status', 'Verified_by_Clerk')
        .order('created_at', { ascending: false });

      if (cleanError) throw cleanError;
      if (riskError) throw riskError;

      setCleanQueue(clean || []);
      setRiskQueue(risk || []);
    } catch (err: any) {
      toast.error("Failed to sync queues: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleSanction = async (app: Application) => {
    setIsProcessing(app.id);
    // Simulate digital signature generation
    await new Promise(r => setTimeout(r, 1500));
    
    try {
      const { error } = await supabase
        .from('farmer_applications')
        .update({ status: 'Sanctioned' })
        .eq('id', app.id);

      if (error) throw error;
      
      toast.success("Digitally Signed & Sanctioned", {
        description: `Funds for ${app.farmer_id} scheduled for DBT transfer.`,
        icon: <Lock className="text-emerald-500" />
      });
      setCleanQueue(prev => prev.filter(a => a.id !== app.id));
    } catch (err: any) {
      toast.error("Sanctioning failed: " + err.message);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleRejectInvestigate = async (app: Application) => {
    setIsProcessing(app.id);
    try {
      const { error } = await supabase
        .from('farmer_applications')
        .update({ status: 'Rejected_for_Investigation' })
        .eq('id', app.id);

      if (error) throw error;
      
      toast.error("Application Rejected", {
        description: `Alert sent to State Audit Cell for Clerk investigation.`,
        icon: <ShieldAlert />
      });
      setRiskQueue(prev => prev.filter(a => a.id !== app.id));
    } catch (err: any) {
      toast.error("Action failed: " + err.message);
    } finally {
      setIsProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
        <Loader2 className="animate-spin text-amber-500" size={40} />
        <p className="text-sm font-medium animate-pulse">Syncing Command Center Data...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Users size={20} />
            </div>
            <TrendingUp size={16} className="text-emerald-500" />
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase mt-4 tracking-wider">Total Processed Today</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">142</p>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all border-l-4 border-l-emerald-500">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <UserCheck size={20} />
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase mt-4 tracking-wider">Clean Approvals</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{cleanQueue.length}</p>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <ShieldHalf size={20} />
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase mt-4 tracking-wider">Awaiting Audit</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{riskQueue.length}</p>
        </div>

        <div className="bg-red-600 p-6 rounded-2xl shadow-xl shadow-red-600/20 animate-pulse border-2 border-red-400">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
            <AlertTriangle size={20} />
          </div>
          <p className="text-xs font-bold text-red-100 uppercase mt-4 tracking-wider">High-Risk Overrides</p>
          <p className="text-3xl font-bold text-white mt-1">{riskQueue.length}</p>
        </div>
      </div>

      {/* Map Placeholder */}
      <div className="bg-slate-900 rounded-3xl p-8 h-48 relative overflow-hidden flex items-center justify-center border border-slate-800 shadow-2xl">
        <div className="absolute inset-0 opacity-10 pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
        <div className="text-center space-y-3 relative z-10">
          <GanttChartSquare size={32} className="text-amber-400 mx-auto animate-pulse" />
          <h3 className="text-slate-100 font-bold tracking-tight">Taluka Application Density Map</h3>
          <p className="text-slate-500 text-xs uppercase tracking-[0.3em] font-medium">Map Module Loading / भू-नकाशा प्रगत...</p>
        </div>
      </div>

      {/* Split Queue View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: Clean Queue */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="text-emerald-500" size={20} />
              <h3 className="font-bold text-slate-900 uppercase tracking-wider text-sm">Clean Queue (AI Verified)</h3>
            </div>
            <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-full">{cleanQueue.length} Ready</span>
          </div>

          <div className="space-y-4">
            {cleanQueue.length === 0 ? (
              <div className="bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-3xl p-10 flex flex-col items-center text-center animate-in fade-in duration-500">
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-slate-300 mb-4 shadow-sm">
                  <Inbox size={24} />
                </div>
                <h4 className="text-sm font-bold text-slate-600">No Clean Approvals</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-[200px]">AI has not yet auto-verified any new applications for this taluka.</p>
              </div>
            ) : (
              cleanQueue.map(app => (
                <div key={app.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      {app.farmer_id}
                      <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">ID:{app.id.split('-')[0]}</span>
                    </p>
                    <p className="text-xs text-slate-500">{app.scheme_name}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="h-1 w-24 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 w-[94%]" />
                      </div>
                      <span className="text-[9px] font-bold text-emerald-600">94% AI CONFIDENCE</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleSanction(app)}
                    disabled={!!isProcessing}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-600/10 active:scale-95"
                  >
                    {isProcessing === app.id ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                    Digitally Sign & Sanction
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Risk Queue */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-red-200 pb-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="text-red-600" size={20} />
              <h3 className="font-bold text-red-900 uppercase tracking-wider text-sm">High-Risk Audit (Manual Overrides)</h3>
            </div>
            <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2.5 py-1 rounded-full animate-pulse">{riskQueue.length} Critical</span>
          </div>

          <div className="space-y-4">
            {riskQueue.length === 0 ? (
              <div className="bg-red-50/30 border-2 border-dashed border-red-100 rounded-3xl p-10 flex flex-col items-center text-center animate-in fade-in duration-500">
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-red-200 mb-4 shadow-sm">
                  <ShieldCheck size={24} />
                </div>
                <h4 className="text-sm font-bold text-red-900/60">No Risk Exceptions</h4>
                <p className="text-xs text-red-400 mt-1 max-w-[200px]">Clerks have not pushed any manual overrides for your review today.</p>
              </div>
            ) : (
              riskQueue.map(app => (
                <div key={app.id} className="bg-white border-2 border-red-100 rounded-2xl p-0 overflow-hidden shadow-lg shadow-red-600/5 hover:border-red-300 transition-all">
                  <div className="bg-red-50 px-5 py-3 border-b border-red-100 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-red-600 flex items-center gap-1.5">
                      <AlertCircle size={12} />
                      AI FLAG DETECTED - OVERRIDDEN BY CLERK
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Risk Index: 88/100</span>
                  </div>
                  
                  <div className="p-5 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{app.farmer_id}</p>
                        <p className="text-xs text-slate-500">{app.scheme_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Original Discrepancy</p>
                        <p className="text-[10px] text-red-700 font-medium italic mt-1">{app.discrepancy_reason?.split('OVERRIDDEN:')[0] || "Suspicious Document Activity"}</p>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                      <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2">
                        <Users size={12} />
                        Clerk Justification (C. Deshmukh)
                      </p>
                      <p className="text-[11px] text-slate-700 mt-1.5 leading-relaxed font-medium">
                        "{app.discrepancy_reason?.split('OVERRIDDEN: ')[1] || "Physical documents verified during on-site taluka visit."}"
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <button 
                        onClick={() => handleSanction(app)}
                        disabled={!!isProcessing}
                        className="flex-1 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
                      >
                        Accept Risk & Sanction
                      </button>
                      <button 
                        onClick={() => handleRejectInvestigate(app)}
                        disabled={!!isProcessing}
                        className="flex-1 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-md shadow-red-600/10 flex items-center justify-center gap-2"
                      >
                        {isProcessing === app.id ? <Loader2 size={12} className="animate-spin" /> : <ShieldAlert size={12} />}
                        Reject & Investigate Clerk
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
