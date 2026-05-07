
import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { AiVerdictCard } from '@/components/ai-verdict-card';
import { ReviewForm } from '@/components/tao/ReviewForm';
import { 
  ArrowLeft, 
  User, 
  MapPin, 
  FileText, 
  ShieldAlert, 
  TrendingUp,
  Droplets,
  CreditCard,
  Building,
  Calendar
} from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TAOReviewPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Fetch application detail
  const { data: application } = await supabase
    .from('applications')
    .select('*')
    .eq('id', id)
    .single();

  if (!application) notFound();

  // Fetch AI verification run
  const { data: aiRun } = await supabase
    .from('ai_verification_runs')
    .select('*')
    .eq('application_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Fetch Taluka Data (GSDA Zone)
  const { data: talukaData } = await supabase
    .from('talukas')
    .select('*')
    .eq('name', application.taluka)
    .single();

  // Fetch Budget Allocation
  const { data: budget } = await supabase
    .from('budget_allocations')
    .select('*')
    .eq('taluka_id', talukaData?.id)
    .eq('scheme_id', application.scheme_name || 'PM-KISAN')
    .single();

  const isZoneHighRisk = ['CRITICAL', 'OVER_EXPLOITED', 'DARK_ZONE'].includes(talukaData?.groundwater_zone || '');

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Top Nav */}
      <div className="flex items-center justify-between">
        <Link href="/tao" className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors font-bold text-sm group">
          <div className="p-2 bg-white rounded-xl border border-slate-200 group-hover:border-slate-400 transition-all">
            <ArrowLeft size={16} />
          </div>
          Back to Queue
        </Link>
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-full border border-amber-200 text-[10px] font-black uppercase tracking-widest">
          <ShieldAlert size={14} /> Final Sanction Authority Review
        </div>
      </div>

      {/* GSDA Warning Banner */}
      {isZoneHighRisk && (
        <div className="bg-red-600 text-white p-4 rounded-2xl flex items-center gap-4 shadow-lg shadow-red-600/20 animate-pulse">
          <div className="p-2 bg-white/20 rounded-xl">
            <Droplets size={24} />
          </div>
          <div>
            <h4 className="font-black uppercase tracking-tight text-sm">Critical Groundwater Alert (GSDA Zone)</h4>
            <p className="text-xs opacity-90 font-medium">This taluka ({application.taluka}) is categorized as <span className="underline font-bold">{talukaData?.groundwater_zone}</span>. Verify water-intensive scheme eligibility strictly.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Data & Stats */}
        <div className="lg:col-span-2 space-y-8">
          {/* AI Verdict */}
          <section>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 px-2">AI Verification Audit</h2>
            <AiVerdictCard 
              verdict={aiRun?.verdict || 'Manual_Review_Required'}
              reason={aiRun?.reason || 'System performed automated cross-verification of document fields against registry data.'}
              extractedData={aiRun?.extracted_data || null}
            />
          </section>

          {/* Farmer & Application Details */}
          <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <User size={14} /> Official Records
              </h3>
              <span className="text-[10px] font-bold text-slate-400">ID: {application.app_id}</span>
            </div>
            <div className="p-8 grid grid-cols-2 gap-y-8 gap-x-12">
              <DetailItem label="Farmer Name" value={application.farmer_name} icon={<User className="text-slate-400" size={16} />} />
              <DetailItem label="Aadhaar (Last 4)" value={application.aadhaar_last4 || 'N/A'} icon={<ShieldAlert className="text-slate-400" size={16} />} />
              <DetailItem label="Location" value={`${application.village}, ${application.taluka}`} icon={<MapPin className="text-slate-400" size={16} />} />
              <DetailItem label="Scheme Applied" value={application.scheme_name || 'N/A'} icon={<FileText className="text-slate-400" size={16} />} />
              <DetailItem label="Claimed Amount" value={application.claimed_amount ? `₹${application.claimed_amount.toLocaleString('en-IN')}` : 'N/A'} icon={<TrendingUp className="text-slate-400" size={16} />} />
              <DetailItem label="Submission Date" value={new Date(application.submitted_at).toLocaleDateString('en-IN', { dateStyle: 'long' })} icon={<Calendar className="text-slate-400" size={16} />} />
            </div>
          </section>
        </div>

        {/* Right Column: Context & Action */}
        <div className="space-y-8">
          {/* Budget Info */}
          <section className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl shadow-slate-900/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
              <CreditCard size={120} />
            </div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-6 flex items-center gap-2">
              <Building size={14} /> SCSP Budget Control
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-white/60 mb-1">Remaining for {application.scheme_name || 'Scheme'}</p>
                <p className="text-3xl font-black">₹{(budget?.remaining_budget || 0).toLocaleString('en-IN')}</p>
              </div>
              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-400 transition-all duration-1000" 
                  style={{ width: `${Math.min(100, ((budget?.spent_budget || 0) / (budget?.total_budget || 1)) * 100)}%` }} 
                />
              </div>
              <p className="text-[10px] font-bold text-white/40">
                FY {budget?.fiscal_year || '2024-25'} • Total Allocation: ₹{(budget?.total_budget || 0).toLocaleString('en-IN')}
              </p>
            </div>
          </section>

          {/* Action Form */}
          <section>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 px-2">Decision Execution</h2>
            <ReviewForm applicationId={id} />
          </section>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        {icon}
        {label}
      </div>
      <div className="text-sm font-bold text-slate-900">{value}</div>
    </div>
  );
}
