'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  FileText, 
  CheckCircle, 
  XCircle, 
  Search, 
  Clock, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

export default function TalathiDashboard() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchApplications();
  }, []);

  async function fetchApplications() {
    setLoading(true);
    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        farmer:farmers(full_name_marathi, survey_number),
        latest_ai_run:ai_verification_runs(*)
      `)
      .eq('current_state', 'PENDING_TALATHI_CONSENT');

    if (error) {
      toast.error('Failed to fetch applications');
    } else {
      setApplications(data || []);
    }
    setLoading(false);
  }

  async function handleAction(appId: string, action: 'approved' | 'rejected') {
    const remarks = prompt('Enter remarks (optional):') || '';
    
    try {
      const res = await fetch('/api/applications/l1-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: appId,
          action,
          remarks,
          samaik_patra_stamp_verified: true,
          samaik_patra_stamp_value: '100'
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Application ${action === 'approved' ? 'approved' : 'rejected'} successfully`);
        fetchApplications();
      } else {
        toast.error(data.error);
      }
    } catch (err) {
      toast.error('Failed to process action');
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <ShieldCheck className="text-emerald-600" />
              Talathi Dashboard (Village Accountant)
            </h1>
            <p className="text-slate-500 text-sm font-medium">Pending Joint Owner Consent & Samaik Patra Verification</p>
          </div>
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
            <Clock className="text-orange-500 animate-pulse" size={18} />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Queue: {applications.length} Pending</span>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : applications.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300">
            <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-slate-300" />
            </div>
            <h3 className="font-bold text-slate-800">All Clear!</h3>
            <p className="text-slate-500 text-sm">No applications pending your consent in this village.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {applications.map(app => (
              <div key={app.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center gap-6">
                  <div className="h-14 w-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                    <FileText size={28} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900">{app.application_number}</h3>
                    <p className="text-sm text-slate-500 font-medium">{app.farmer?.full_name_marathi} | Survey: {app.survey_number}</p>
                    <div className="mt-2 flex gap-2">
                      <span className="bg-blue-50 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                        AI Verdict: {app.latest_ai_run?.verdict || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handleAction(app.id, 'rejected')}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <XCircle size={18} />
                    Reject
                  </button>
                  <button 
                    onClick={() => handleAction(app.id, 'approved')}
                    className="flex items-center gap-2 px-8 py-3 rounded-2xl font-bold text-sm bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                  >
                    <CheckCircle size={18} />
                    Approve Samaik Patra
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
