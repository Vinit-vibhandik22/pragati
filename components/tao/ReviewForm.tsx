
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { submitTaoReview } from '@/app/actions/tao-review';
import { toast } from 'sonner';
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  AlertCircle,
  MessageSquare
} from 'lucide-react';

interface ReviewFormProps {
  applicationId: string;
}

export function ReviewForm({ applicationId }: ReviewFormProps) {
  const router = useRouter();
  const [remarks, setRemarks] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (verdict: 'APPROVED' | 'REJECTED') => {
    if (!remarks || remarks.trim().length < 5) {
      setError('Please provide detailed remarks (minimum 5 characters)');
      return;
    }

    setError(null);
    setIsPending(true);

    const formData = new FormData();
    formData.append('applicationId', applicationId);
    formData.append('verdict', verdict);
    formData.append('remarks', remarks);

    const result = await submitTaoReview(formData);

    if (result.error) {
      toast.error(result.error);
      setError(result.error);
      setIsPending(false);
    } else {
      if (verdict === 'APPROVED') {
        toast.success(`Application Approved! Sanction Order: ${result.sanctionOrderNumber}`);
      } else {
        toast.success('Application Rejected');
      }
      router.push('/tao');
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 block flex items-center gap-2">
          <MessageSquare size={14} /> Review Remarks (Mandatory)
        </label>
        <textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Enter detailed reason for approval or rejection. Mention specific document findings or budget constraints if applicable."
          className={`w-full min-h-[120px] p-4 bg-slate-50 border ${error ? 'border-red-500' : 'border-slate-200'} rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all`}
        />
        {error && <p className="text-xs text-red-600 font-bold mt-2 flex items-center gap-1"><AlertCircle size={12} /> {error}</p>}
      </div>

      <div className="flex items-center gap-4">
        <button
          disabled={isPending}
          onClick={() => handleAction('REJECTED')}
          className="flex-1 flex items-center justify-center gap-2 py-4 bg-white border-2 border-red-200 text-red-600 font-black uppercase tracking-widest rounded-2xl hover:bg-red-50 transition-all disabled:opacity-50 active:scale-95"
        >
          {isPending ? <Loader2 className="animate-spin" /> : <XCircle size={18} />}
          Reject Application
        </button>
        
        <button
          disabled={isPending}
          onClick={() => handleAction('APPROVED')}
          className="flex-[2] flex items-center justify-center gap-2 py-4 bg-slate-900 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-emerald-600 transition-all shadow-lg hover:shadow-emerald-500/20 disabled:opacity-50 active:scale-95"
        >
          {isPending ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={18} />}
          Approve & Issue Sanction
        </button>
      </div>
    </div>
  );
}
