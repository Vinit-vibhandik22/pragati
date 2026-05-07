"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  Loader2, 
  Timer, 
  AlertCircle,
  FileCheck,
  ShieldCheck,
  ArrowLeft
} from "lucide-react";
import { toast } from "sonner";
import { AiVerdictCard } from "@/components/ai-verdict-card";
import { uploadAndVerifyDocuments } from "@/app/actions/ks-actions";
import Link from "next/link";

const DOC_TYPES = [
  { id: "7/12 Extract", label: "7/12 Extract", labelMR: "७/१२ उतारा" },
  { id: "8A Ledger", label: "8A Ledger", labelMR: "८अ उतारा" },
  { id: "Caste Certificate", label: "Caste Certificate", labelMR: "जातीचा दाखला" },
  { id: "Income Certificate", label: "Income Certificate", labelMR: "उत्पन्नाचा दाखला" }
];

export default function DocumentUploadPage() {
  const params = useParams();
  const applicationId = params?.id as string;

  const [files, setFiles] = useState<Record<string, File | null>>({
    "7/12 Extract": null,
    "8A Ledger": null,
    "Caste Certificate": null,
    "Income Certificate": null
  });

  const [previews, setPreviews] = useState<Record<string, string | null>>({
    "7/12 Extract": null,
    "8A Ledger": null,
    "Caste Certificate": null,
    "Income Certificate": null
  });

  const [isUploading, setIsUploading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [verdict, setVerdict] = useState<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const cameraInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (isUploading) {
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isUploading]);

  const handleFileChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${id}: File too large. Max 10MB.`);
        return;
      }
      setFiles((prev) => ({ ...prev, [id]: file }));
      
      // Create preview
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreviews((prev) => ({ ...prev, [id]: url }));
      } else {
        setPreviews((prev) => ({ ...prev, [id]: null }));
      }
    }
  };

  const removeFile = (id: string) => {
    if (previews[id]) {
      URL.revokeObjectURL(previews[id]!);
    }
    setFiles((prev) => ({ ...prev, [id]: null }));
    setPreviews((prev) => ({ ...prev, [id]: null }));
  };

  const isAllSelected = Object.values(files).every((f) => f !== null);

  const handleSubmit = async () => {
    if (!isAllSelected) return;

    setIsUploading(true);
    setElapsedTime(0);
    setVerdict(null);
    toast.info("Starting AI Verification Pipeline...");

    try {
      const formData = new FormData();
      // Important: Use the same order as DOC_TYPES for Gemini payload labeling
      DOC_TYPES.forEach((doc) => {
        const file = files[doc.id];
        if (file) formData.append(doc.id, file);
      });

      const result = await uploadAndVerifyDocuments(applicationId, formData);

      if (result.success) {
        setVerdict(result);
        toast.success("AI Verification Complete!");
      } else {
        toast.error(result.error || "AI service unavailable. Application marked for manual review.");
        setVerdict({
          verdict: 'Manual_Review_Required',
          reason: result.error || 'AI service returned an error during processing.',
          extractedData: null
        });
      }
    } catch (err: any) {
      console.error("Submit Error:", err);
      toast.error("Critical failure in verification pipeline.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 pb-24">
      <div className="mb-8 flex items-center justify-between">
        <Link 
          href={`/applications/${applicationId}`}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Application
        </Link>
        <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
          <ShieldCheck size={14} className="text-blue-600" />
          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">KS Verification Desk</span>
        </div>
      </div>

      <div className="mb-10">
        <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
          <FileCheck className="text-[#1B4332]" size={32} />
          Document Upload & AI Audit
        </h1>
        <p className="text-gray-500 mt-2">
          Upload or scan all 4 required Marathi documents for real-time AI verification.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {DOC_TYPES.map((doc) => (
          <div 
            key={doc.id} 
            className={`p-5 rounded-3xl border-2 transition-all ${files[doc.id] ? 'border-green-500 bg-green-50/30' : 'border-gray-100 bg-white hover:border-gray-200 shadow-sm'}`}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-gray-800 leading-tight">{doc.label}</h3>
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{doc.labelMR}</p>
              </div>
              {files[doc.id] && <CheckCircle2 className="text-green-600 shadow-sm" size={24} />}
            </div>

            {!files[doc.id] ? (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => fileInputRefs.current[doc.id]?.click()}
                  className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl p-4 cursor-pointer hover:bg-gray-50 hover:border-blue-400 transition-all group"
                  disabled={isUploading}
                >
                  <Upload className="text-gray-400 mb-2 group-hover:text-blue-500 transition-colors" size={24} />
                  <span className="text-[10px] font-bold text-gray-600 uppercase">Upload File</span>
                  <input 
                    ref={(el) => (fileInputRefs.current[doc.id] = el)}
                    type="file" 
                    className="hidden" 
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFileChange(doc.id, e)}
                  />
                </button>

                <button
                  onClick={() => cameraInputRefs.current[doc.id]?.click()}
                  className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl p-4 cursor-pointer hover:bg-gray-50 hover:border-amber-400 transition-all group"
                  disabled={isUploading}
                >
                  <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">📷</div>
                  <span className="text-[10px] font-bold text-gray-600 uppercase text-center">Scan / स्कॅन करा</span>
                  <input 
                    ref={(el) => (cameraInputRefs.current[doc.id] = el)}
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handleFileChange(doc.id, e)}
                  />
                </button>
              </div>
            ) : (
              <div className="bg-white p-2 rounded-2xl border border-green-100 shadow-sm">
                <div className="flex items-center gap-4">
                  {previews[doc.id] ? (
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0">
                      <img src={previews[doc.id]!} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center flex-shrink-0">
                      <FileText className="text-gray-400" size={24} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-700 truncate">{files[doc.id]?.name}</p>
                    <p className="text-[10px] text-gray-400">Ready for processing</p>
                    <button 
                      onClick={() => removeFile(doc.id)}
                      className="mt-1 text-[10px] font-black text-red-500 uppercase tracking-tighter hover:underline"
                      disabled={isUploading}
                    >
                      Remove & Retake
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-6 py-8 border-t border-gray-100">
        {!isUploading ? (
          <button
            onClick={handleSubmit}
            disabled={!isAllSelected || isUploading}
            className={`px-12 py-4 rounded-2xl font-black text-lg shadow-xl transition-all transform hover:scale-105 active:scale-95 flex items-center gap-3
              ${isAllSelected 
                ? "bg-[#1B4332] text-white" 
                : "bg-gray-100 text-gray-300 cursor-not-allowed shadow-none"}`}
          >
            <ShieldCheck size={24} />
            Submit for AI Verification
          </button>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Loader2 className="animate-spin text-[#1B4332]" size={64} strokeWidth={3} />
              <div className="absolute inset-0 flex items-center justify-center">
                <Timer size={24} className="text-[#1B4332] opacity-20" />
              </div>
            </div>
            <div className="text-center">
              <h4 className="text-xl font-bold text-gray-800 animate-pulse">AI Verification in progress...</h4>
              <p className="text-sm font-mono text-gray-500 mt-1">{elapsedTime}s elapsed</p>
            </div>
          </div>
        )}
      </div>

      {verdict && !isUploading && (
        <AiVerdictCard 
          verdict={verdict.verdict}
          reason={verdict.reason}
          extractedData={verdict.extractedData}
          failureReasons={verdict.failureReasons}
        />
      )}

      {/* Connection Tip */}
      <div className="mt-12 bg-gray-50 p-4 rounded-xl border border-gray-200 flex gap-4">
        <AlertCircle className="text-gray-400 flex-shrink-0" size={20} />
        <p className="text-xs text-gray-500 leading-relaxed">
          <strong>Note:</strong> This verification uses Gemini 1.5 Flash Vision to audit Marathi land records. 
          Ensure all documents are clearly visible and names match the farmer profile exactly for automated approval.
        </p>
      </div>
    </div>
  );
}
