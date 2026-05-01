"use client";

import React from 'react';
import Link from 'next/link';
import { 
  ShieldAlert, 
  User, 
  LogOut,
  LayoutDashboard,
  FileCheck,
  Search,
  Map as MapIcon,
  Bell,
  Settings,
  ChevronRight
} from 'lucide-react';

export default function TAOLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Red Warning Banner */}
      <div className="bg-red-600 text-white py-1 px-4 text-center text-[10px] font-bold tracking-widest uppercase z-50">
        DEMO ENVIRONMENT ONLY - FOR PRAGATI AI HACKATHON TESTING. NOT AN OFFICIAL GOVERNMENT WEBSITE.
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-950 text-white hidden md:flex flex-col border-r border-slate-800">
          <div className="p-6 border-b border-white/10 bg-slate-900/30">
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <ShieldAlert className="text-amber-400" size={24} />
              PRAGATI <span className="text-amber-400 text-xs font-mono">TAO</span>
            </h1>
            <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-tighter font-medium">Taluka Agriculture Officer</p>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <div className="pb-2 px-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Command Center</div>
            <Link href="/tao/dashboard" className="flex items-center gap-3 px-3 py-2 text-sm text-white bg-amber-400/10 border-l-2 border-amber-400 rounded-r-lg font-medium">
              <LayoutDashboard size={18} className="text-amber-400" />
              Main Command
            </Link>
            <Link href="#" className="flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
              <FileCheck size={18} />
              Sanctioned List
            </Link>
            <Link href="#" className="flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
              <MapIcon size={18} />
              Taluka Geospatial Map
            </Link>
            
            <div className="pt-6 pb-2 px-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Administration</div>
            <Link href="#" className="flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
              <Search size={18} />
              Farmer Search
            </Link>
            <Link href="#" className="flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
              <Settings size={18} />
              System Settings
            </Link>
          </nav>

          <div className="p-4 border-t border-white/10 bg-black/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-400/10 border border-amber-400/30 flex items-center justify-center">
                <User size={20} className="text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">A. Kulkarni</p>
                <p className="text-[10px] text-slate-500 truncate">Taluka: Haveli (Pune)</p>
              </div>
            </div>
            <Link href="/" className="flex items-center justify-center gap-2 w-full py-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-900 hover:bg-red-950/50 rounded-lg transition-all">
              <LogOut size={14} />
              Exit Command
            </Link>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-slate-400">
                <span className="text-xs">Administration</span>
                <ChevronRight size={12} />
                <span className="text-xs font-bold text-slate-900">Final Approval Queue</span>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="relative group">
                <Bell size={20} className="text-slate-400 group-hover:text-slate-900 cursor-pointer transition-colors" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] flex items-center justify-center rounded-full border-2 border-white font-bold animate-bounce">5</span>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div className="text-right">
                <p className="text-xs font-bold text-slate-900">Taluka Officer Panel</p>
                <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-tighter">System Health: Secure</p>
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
