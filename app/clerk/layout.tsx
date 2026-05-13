"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  AlertTriangle, 
  CheckCircle2, 
  FileSearch, 
  MessageSquare, 
  ShieldAlert, 
  User, 
  LogOut,
  LayoutDashboard,
  ClipboardList,
  Bell
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { LanguageSwitcherMinimal } from '@/components/LanguageSwitcher';
import { useLanguage } from '@/context/LanguageContext';

export default function ClerkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { t } = useLanguage();

  // Store the clerk's ID in localStorage so child pages can read it
  // for attributing actions in the database. Change this value when
  // real auth is implemented (replace with the authenticated user's ID).
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!localStorage.getItem('clerk_id')) {
        localStorage.setItem('clerk_id', 'CLERK_DESHMUKH');
      }
      if (!localStorage.getItem('clerk_name')) {
        localStorage.setItem('clerk_name', 'C. Deshmukh');
      }
    }
  }, []);

  const handleLogout = () => {
    // Clear any local state if needed (for demo purpose)
    localStorage.clear();
    sessionStorage.clear();
    toast.success("Logging out of PRAGATI...", { duration: 1000 });
    setTimeout(() => router.push('/login'), 1000);
  };

  const handleNotificationClick = () => {
    toast.info("No new notifications", {
      description: "You are up to date with all exception flags."
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Red Warning Banner */}
      <div className="bg-red-600 text-white py-1 px-4 text-center text-[10px] font-bold tracking-widest uppercase z-50">
        DEMO ENVIRONMENT ONLY - FOR PRAGATI AI HACKATHON TESTING. NOT AN OFFICIAL GOVERNMENT WEBSITE.
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900 text-white hidden md:flex flex-col border-r border-slate-800">
          <div className="p-6 border-b border-slate-800 bg-slate-900/50">
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <ShieldAlert className="text-emerald-500" size={24} />
              PRAGATI <span className="text-emerald-500 text-xs font-mono">CLERK</span>
            </h1>
            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-tighter font-medium">Exception Handling Desk</p>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <div className="pb-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('main_menu')}</div>
            <Link href="/clerk/queue" className="flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
              <LayoutDashboard size={18} />
              {t('dashboard')}
            </Link>
            <Link href="/clerk/queue" className="flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
              <ClipboardList size={18} />
              {t('exception_queue')}
            </Link>
            <Link href="/clerk/phase3" className="flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
              <FileSearch size={18} />
              Phase 3 Audits
            </Link>
            
            <div className="pt-6 pb-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('tools')}</div>
            <Link href="#" className="flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
              <FileSearch size={18} />
              {t('verify_documents')}
            </Link>
            <Link href="#" className="flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
              <MessageSquare size={18} />
              {t('sms_communications')}
            </Link>
          </nav>

          <div className="p-4 border-t border-slate-800 bg-slate-950">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
                <User size={20} className="text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">C. Deshmukh</p>
                <p className="text-[10px] text-slate-500 truncate">{t('senior_clerk')} (Pune)</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full py-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-red-900/40 rounded-lg transition-all"
            >
              <LogOut size={14} />
              {t('sign_out')}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10 shadow-sm">
            <div className="flex items-center gap-4">
              <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wider">{t('queue_label')}: <span className="text-slate-900">{t('exception_handling')}</span></h2>
              <div className="h-4 w-px bg-slate-200" />
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {t('live_feed')}
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <LanguageSwitcherMinimal />
              <div className="relative group" onClick={handleNotificationClick}>
                <Bell size={20} className="text-slate-400 group-hover:text-slate-900 cursor-pointer transition-colors" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] flex items-center justify-center rounded-full border-2 border-white font-bold">3</span>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-900">May 01, 2026</p>
                <p className="text-[10px] text-slate-500">{t('taluka')}: Purandar</p>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
