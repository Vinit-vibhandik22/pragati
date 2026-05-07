
"use client";

import React from 'react';
import { Check, AlertCircle, XCircle } from 'lucide-react';
import { useLanguage } from '@/context/language-context';

interface ApplicationTimelineProps {
  currentState: string;
}

const STEPS = [
  { id: 1, key: 'step1' },
  { id: 2, key: 'step2' },
  { id: 3, key: 'step3' },
  { id: 4, key: 'step4' },
  { id: 5, key: 'step5' },
  { id: 6, key: 'step6' },
];

export function ApplicationTimeline({ currentState }: ApplicationTimelineProps) {
  const { t } = useLanguage();

  const getActiveStep = (state: string) => {
    switch (state) {
      case 'DRAFT':
      case 'PENDING_DOCUMENTS':
        return 1;
      case 'PENDING_AI_VERIFICATION':
      case 'AI_VERIFIED':
      case 'AI_REJECTED':
      case 'PENDING_MANUAL_REVIEW':
        return 2;
      case 'PENDING_TALATHI_CONSENT':
      case 'PENDING_GRAM_SEVAK_CERT':
      case 'L1_COMPLETE':
        return 3;
      case 'PENDING_L2_FIELD_VISIT':
      case 'L2_REPORT_SUBMITTED':
        return 4;
      case 'PENDING_TAO_REVIEW':
      case 'TAO_REJECTED':
        return 5;
      case 'TAO_APPROVED':
      case 'SCHEME_COMPLETE':
        return 6;
      default:
        return 1;
    }
  };

  const currentStepIndex = getActiveStep(currentState);
  const isRejected = currentState.includes('REJECTED');

  return (
    <div className="w-full py-8">
      <div className="relative flex justify-between">
        {/* Connection Line */}
        <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 -translate-y-1/2 z-0" />
        <div 
          className="absolute top-1/2 left-0 h-1 bg-emerald-500 -translate-y-1/2 z-0 transition-all duration-1000" 
          style={{ width: `${((currentStepIndex - 1) / (STEPS.length - 1)) * 100}%` }}
        />

        {/* Steps */}
        {STEPS.map((step) => {
          const isCompleted = step.id < currentStepIndex;
          const isActive = step.id === currentStepIndex;
          const isError = isActive && isRejected;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center gap-3">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all duration-500 
                  ${isCompleted ? 'bg-emerald-500 border-emerald-100 text-white' : 
                    isActive ? (isError ? 'bg-red-500 border-red-100 text-white animate-pulse' : 'bg-white border-blue-500 text-blue-500 shadow-lg shadow-blue-500/20') : 
                    'bg-white border-slate-100 text-slate-300'}`}
              >
                {isCompleted ? <Check size={20} strokeWidth={3} /> : 
                 isError ? <XCircle size={20} strokeWidth={3} /> :
                 isActive ? <div className="w-2.5 h-2.5 bg-current rounded-full animate-ping" /> : 
                 <span className="text-xs font-black">{step.id}</span>}
              </div>
              <div className="text-center">
                <p className={`text-[10px] font-black uppercase tracking-tighter max-w-[80px] leading-tight transition-colors
                  ${isActive ? (isError ? 'text-red-600' : 'text-blue-600') : isCompleted ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {t(step.key)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {isRejected && (
        <div className="mt-8 bg-red-50 border-2 border-red-100 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="p-2 bg-red-500 rounded-xl text-white shadow-lg shadow-red-500/20">
            <XCircle size={20} />
          </div>
          <div>
            <h4 className="font-black text-red-600 uppercase tracking-tight text-sm">✗ Rejected ({isRejected ? (currentState.includes('AI') ? 'AI Audit' : 'Officer Review') : ''})</h4>
            <p className="text-xs text-red-500 font-medium italic">Application has been flagged for critical issues and halted.</p>
          </div>
        </div>
      )}
    </div>
  );
}
