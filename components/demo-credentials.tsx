
"use client";

import React, { useState } from 'react';
import { Key, ChevronUp, ChevronDown, User, Shield, Info } from 'lucide-react';

export function DemoCredentialsCard() {
  const [isOpen, setIsOpen] = useState(false);
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  if (!isDemoMode) return null;

  const credentials = [
    { role: 'Clerk (KS)', email: 'ks@pragati.demo', pass: 'Demo@1234' },
    { role: 'Talathi', email: 'talathi@pragati.demo', pass: 'Demo@1234' },
    { role: 'Gram Sevak', email: 'gramsevak@pragati.demo', pass: 'Demo@1234' },
    { role: 'TAO', email: 'tao@pragati.demo', pass: 'Demo@1234' },
    { role: 'Farmer View', email: 'farmer@pragati.demo', pass: 'Demo@1234' },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-[9999] animate-in slide-in-from-right-10 duration-500">
      <div className={`bg-slate-900 text-white rounded-3xl border border-white/10 shadow-2xl transition-all duration-500 overflow-hidden ${isOpen ? 'w-80' : 'w-14 h-14'}`}>
        {!isOpen ? (
          <button 
            onClick={() => setIsOpen(true)}
            className="w-full h-full flex items-center justify-center hover:bg-white/5 transition-colors"
            title="Show Demo Credentials"
          >
            <Key size={24} className="text-amber-400" />
          </button>
        ) : (
          <div className="flex flex-col">
            <div className="p-4 bg-white/5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-amber-400" />
                <span className="font-black uppercase tracking-widest text-[10px]">Demo Command Center</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/10 rounded-lg">
                <ChevronDown size={18} />
              </button>
            </div>
            
            <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex gap-3">
                <Info size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-blue-100 font-medium leading-relaxed">
                  Use these credentials to test role-specific workflows in the demo environment.
                </p>
              </div>

              {credentials.map((cred, idx) => (
                <div key={idx} className="group">
                  <div className="flex items-center justify-between mb-1.5 px-1">
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{cred.role}</span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(cred.email);
                        // Optional: show a mini toast or feedback
                      }}
                      className="text-[9px] font-bold text-amber-400 hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Copy Email
                    </button>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 border border-white/5 hover:border-amber-400/30 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <User size={12} className="text-white/20" />
                      <span className="text-xs font-mono text-white/80">{cred.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Key size={12} className="text-white/20" />
                      <span className="text-xs font-mono text-white/80">{cred.pass}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-amber-400 text-slate-900 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest">Hackathon Demo Mode Active</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
