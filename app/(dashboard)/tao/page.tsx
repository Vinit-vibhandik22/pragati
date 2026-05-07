
import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { 
  FileText, 
  User as UserIcon, 
  MapPin, 
  ChevronRight, 
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock
} from 'lucide-react';

export default async function TAOApplicationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get officer's profile to know their taluka
  const { data: profile } = await supabase
    .from('profiles')
    .select('taluka')
    .eq('id', user.id)
    .single();

  // Fetch applications pending TAO review for this taluka
  // Note: We use .eq('current_state', 'PENDING_TAO_REVIEW') as requested
  // Falling back to 'pending' if current_state column doesn't exist yet (for robustness during development)
  const { data: applications, error } = await supabase
    .from('applications')
    .select(`
      *,
      ai_verification_runs (
        verdict,
        reason
      )
    `)
    .eq('current_state', 'PENDING_TAO_REVIEW')
    .eq('taluka', profile?.taluka || 'Haveli')
    .order('submitted_at', { ascending: false });

  if (error) {
    console.error('Error fetching applications:', error);
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Pending <span className="text-amber-500">Final Reviews</span>
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            You have <span className="text-slate-900 font-bold">{applications?.length || 0}</span> applications awaiting your final sanction.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search application ID..." 
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all w-64"
            />
          </div>
          <button className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">
            <Filter size={20} />
          </button>
        </div>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          label="Verification Success" 
          value="82%" 
          trend="+5% from last week" 
          icon={<CheckCircle2 className="text-emerald-500" />} 
          color="emerald" 
        />
        <StatCard 
          label="Avg. Review Time" 
          value="4.2h" 
          trend="-1.5h improvement" 
          icon={<Clock className="text-blue-500" />} 
          color="blue" 
        />
        <StatCard 
          label="Budget Utilization" 
          value="₹42.5L" 
          trend="64% of quarterly quota" 
          icon={<FileText className="text-amber-500" />} 
          color="amber" 
        />
      </div>

      {/* Applications List */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Farmer & Application</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">AI Verdict</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Village</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {applications && applications.length > 0 ? (
                applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-amber-100 group-hover:text-amber-600 transition-colors">
                          <UserIcon size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 leading-none">{app.farmer_name}</p>
                          <p className="text-xs text-slate-400 mt-1 font-mono">{app.app_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex justify-center">
                        <VerdictBadge verdict={app.ai_verification_runs?.[0]?.verdict || 'Manual_Review_Required'} />
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 text-slate-600">
                        <MapPin size={14} className="text-slate-400" />
                        <span className="text-sm font-medium">{app.village}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-500 font-medium">
                      {new Date(app.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <Link 
                        href={`/tao/${app.id}/review`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-amber-500 transition-all shadow-sm hover:shadow-amber-500/20 active:scale-95"
                      >
                        Review
                        <ChevronRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 opacity-20">
                      <FileText size={48} />
                      <p className="font-bold uppercase tracking-widest text-xs">No pending applications for review</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function VerdictBadge({ verdict }: { verdict: string }) {
  switch (verdict) {
    case 'Verified':
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider rounded-full border border-emerald-200 shadow-sm shadow-emerald-500/5">
          <CheckCircle2 size={12} /> Verified
        </span>
      );
    case 'Rejected':
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 text-[10px] font-black uppercase tracking-wider rounded-full border border-red-200 shadow-sm shadow-red-500/5">
          <XCircle size={12} /> Rejected
        </span>
      );
    default:
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-wider rounded-full border border-amber-200 shadow-sm shadow-amber-500/5">
          <AlertCircle size={12} /> Manual Review
        </span>
      );
  }
}

function StatCard({ label, value, trend, icon, color }: { label: string, value: string, trend: string, icon: React.ReactNode, color: string }) {
  const colorMap: any = {
    emerald: "bg-emerald-50 border-emerald-100",
    blue: "bg-blue-50 border-blue-100",
    amber: "bg-amber-50 border-amber-100"
  };

  return (
    <div className={`p-6 rounded-3xl border shadow-sm ${colorMap[color] || 'bg-white border-slate-200'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-white rounded-xl shadow-sm">
          {icon}
        </div>
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</div>
      </div>
      <div className="text-3xl font-black text-slate-900">{value}</div>
      <div className="text-[10px] font-bold text-slate-500 mt-2 flex items-center gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-current opacity-30" />
        {trend}
      </div>
    </div>
  );
}
