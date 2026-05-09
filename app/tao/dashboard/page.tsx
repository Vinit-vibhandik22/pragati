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
  Zap
} from 'lucide-react';
import { toast } from 'sonner';

export default function TAODashboard() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
      toast.error('Failed to fetch applications');
    } else {
      setApplications(data || []);
    }
    setLoading(false);
  }

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
              
              return (
              <div key={app.id} className="bg-white rounded-[2rem] p-8 shadow-xl shadow-slate-200/40 border border-white flex flex-col md:flex-row md:items-center justify-between gap-8 group hover:border-[#1B4332]/20 transition-all">
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
                    <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                      <Zap size={14} className="text-amber-500" />
                      <span className="text-xs font-bold text-slate-700">AI: CLEAN</span>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                      <CheckCircle size={14} className="text-emerald-500" />
                      <span className="text-xs font-bold text-slate-700">Phase 3: Verified</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-4">
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                    <p className="text-2xl font-black text-[#1B4332]">Pending TAO</p>
                  </div>
                  
                  <div className="flex gap-3 w-full md:w-auto">
                    <button className="flex-1 md:flex-none px-6 py-4 rounded-2xl font-black text-sm text-red-600 hover:bg-red-50 transition-all">
                      Query Application
                    </button>
                    <button 
                      onClick={() => handleFinalApproval(app.id)}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 px-10 py-4 rounded-2xl font-black text-sm bg-[#1B4332] text-white hover:bg-[#2D6A4F] shadow-2xl shadow-[#1B4332]/30 transition-all active:scale-95"
                    >
                      <Award size={20} />
                      Grant Final Sanction
                    </button>
                  </div>
                </div>
              </div>
            )})}
          </div>
        )}
      </div>
    </div>
  );
}
