"use client";

import Link from "next/link";
import { 
  Sprout, 
  ShieldCheck, 
  FileSearch, 
  Zap, 
  Users, 
  Briefcase, 
  Building2, 
  UserCog,
  ArrowRight,
  Shield,
  Search,
  ChevronRight,
  Info
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { LanguageSwitcherMinimal } from "@/components/LanguageSwitcher";

export default function Home() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Top Banner - Government Style */}
      <div className="bg-slate-900 text-white py-2 px-4 text-[10px] uppercase tracking-[0.2em] font-bold text-center border-b border-white/10">
        {t('official_portal')}
      </div>

      {/* Navigation / Header */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2 rounded-xl shadow-lg shadow-emerald-600/20">
              <Sprout className="text-white h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tighter leading-none">PRAGATI AI</h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{t('transparency_growth')}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcherMinimal />
            <div className="hidden md:flex items-center gap-8">
              <a href="#about" className="text-sm font-semibold text-slate-600 hover:text-emerald-600 transition-colors">{t('about_platform')}</a>
              <a href="#features" className="text-sm font-semibold text-slate-600 hover:text-emerald-600 transition-colors">{t('verification_ai')}</a>
              <Link 
                href="/farmer/apply" 
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-5 py-2.5 rounded-full transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2 group"
              >
                {t('apply_subsidy')}
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section id="about" className="relative pt-20 pb-32 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-40" 
               style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #e2e8f0 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider mb-8 border border-emerald-100 animate-in fade-in slide-in-from-bottom-4">
                <Zap size={14} className="animate-pulse" />
                {t('ai_driven_engine')}
              </div>
              <h2 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight leading-[0.95] mb-8">
                {t('hero_title')}
              </h2>
              <p className="text-lg md:text-xl text-slate-600 leading-relaxed mb-10 max-w-2xl font-medium">
                {t('hero_desc')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/farmer/apply" className="bg-slate-900 hover:bg-black text-white text-lg font-bold px-8 py-4 rounded-2xl transition-all shadow-2xl flex items-center justify-center gap-3 active:scale-95">
                  {t('start_application')}
                  <ChevronRight size={20} />
                </Link>
                <div className="flex items-center gap-4 px-6 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
                  <ShieldCheck className="text-emerald-500" size={24} />
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-400 uppercase leading-none">{t('security_status')}</p>
                    <p className="text-sm font-bold text-slate-900 mt-1">{t('audit_log_active')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section id="features" className="py-24 bg-white border-y border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                  <Search size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">{t('ai_verification')}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  {t('ai_verification_desc')}
                </p>
              </div>
              <div className="space-y-4">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                  <Shield size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">{t('audit_trail')}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  {t('audit_trail_desc')}
                </p>
              </div>
              <div className="space-y-4">
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                  <Zap size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">{t('seamless_dbt')}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  {t('seamless_dbt_desc')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Stakeholder Portals */}
        <section className="py-32 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="mb-16">
              <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight uppercase italic">{t('stakeholder_access')}</h2>
              <div className="h-1.5 w-24 bg-emerald-600 mx-auto rounded-full" />
              <p className="text-slate-500 mt-6 font-semibold uppercase tracking-widest text-xs">Secure login required for administrative access</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Farmer Card */}
              <Link href="/farmer/apply" className="group relative bg-white border border-slate-200 rounded-[32px] p-8 text-left transition-all hover:border-emerald-500 hover:shadow-2xl hover:-translate-y-2 overflow-hidden shadow-sm">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Users size={80} />
                </div>
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <Users size={28} />
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-2">{t('farmer_portal')}</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-medium mb-6">Apply for schemes, track fund status, and upload documents.</p>
                <div className="flex items-center text-emerald-600 text-xs font-black uppercase tracking-widest gap-2">
                  Apply Now <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              {/* Clerk Card */}
              <Link href="/clerk/queue" className="group relative bg-white border border-slate-200 rounded-[32px] p-8 text-left transition-all hover:border-slate-800 hover:shadow-2xl hover:-translate-y-2 overflow-hidden shadow-sm">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Briefcase size={80} />
                </div>
                <div className="w-14 h-14 bg-slate-100 text-slate-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                  <Briefcase size={28} />
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-2">{t('clerk_desk')}</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-medium mb-6">Review flagged applications, run AI audits, and verify docs.</p>
                <div className="flex items-center text-slate-900 text-xs font-black uppercase tracking-widest gap-2">
                  Process Queue <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              {/* TAO Card */}
              <Link href="/tao/dashboard" className="group relative bg-white border border-slate-200 rounded-[32px] p-8 text-left transition-all hover:border-blue-600 hover:shadow-2xl hover:-translate-y-2 overflow-hidden shadow-sm">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Building2 size={80} />
                </div>
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Building2 size={28} />
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-2">{t('tao_dashboard_label')}</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-medium mb-6">Taluka Agriculture Officer panel for digital signing & sanctioning.</p>
                <div className="flex items-center text-blue-600 text-xs font-black uppercase tracking-widest gap-2">
                  Officer Login <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              {/* Officer Card */}
              <Link href="/officer" className="group relative bg-white border border-slate-200 rounded-[32px] p-8 text-left transition-all hover:border-amber-500 hover:shadow-2xl hover:-translate-y-2 overflow-hidden shadow-sm">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  <UserCog size={80} />
                </div>
                <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                  <UserCog size={28} />
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-2">{t('admin_control')}</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-medium mb-6">High-level insights, district KPIs, and system-wide audit reports.</p>
                <div className="flex items-center text-amber-600 text-xs font-black uppercase tracking-widest gap-2">
                  Global Dashboard <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-3">
              <Sprout className="text-emerald-600 h-5 w-5" />
              <span className="font-black text-slate-900 tracking-tighter">PRAGATI AI</span>
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              © 2026 PRAGATI AI Transparency Unit. All Rights Reserved.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-xs font-bold text-slate-500 hover:text-slate-900 uppercase tracking-wider">Privacy Policy</a>
              <a href="#" className="text-xs font-bold text-slate-500 hover:text-slate-900 uppercase tracking-wider">Helpdesk</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
