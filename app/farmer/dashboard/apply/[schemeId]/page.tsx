"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import { 
  FileText, 
  Upload, 
  CheckCircle2, 
  Loader2, 
  ArrowRight,
  ShieldCheck,
  Search,
  X,
  FileCheck,
  Globe,
  AlertTriangle
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { processDocumentAudit, uploadDocumentAction } from "@/app/actions/farmer-actions";

const SCHEMES_DATA: Record<string, any> = {
  "mechanization": {
    name: { EN: "State Agriculture Mechanization Scheme", MR: "राज्य कृषी यांत्रिकीकरण योजना" },
    workflow: "Farmers apply for tractors or power tillers to increase farm productivity through modern machinery.",
    documents: ["7/12 Extract", "8A Holding", "Aadhaar Card", "Bank Passbook Copy"],
    icon: <Search className="text-blue-500" />
  },
  "micro-irrigation": {
    name: { EN: "Pradhan Mantri Krishi Sinchayee Yojana (Micro-irrigation)", MR: "पंतप्रधान कृषी सिंचन योजना (ठिबक सिंचन)" },
    workflow: "Subsidies for installing water-efficient drip and sprinkler irrigation systems on farm lands.",
    documents: ["7/12 Extract", "8A Holding", "Aadhaar Card"],
    icon: <CheckCircle2 className="text-green-500" />
  },
  "ambedkar-yojana": {
    name: { EN: "Dr. Babasaheb Ambedkar Krushi Swavalamban Yojana", MR: "डॉ. बाबासाहेब आंबेडकर कृषी स्वावलंबन योजना" },
    workflow: "Dedicated scheme providing various agricultural assets exclusively for SC/ST category farmers.",
    documents: ["7/12 Extract", "8A Holding", "Aadhaar Card", "Caste Certificate"],
    icon: <ShieldCheck className="text-purple-500" />
  },
  "phalbaag": {
    name: { EN: "Bhausaheb Fundkar Phalbaag Lagvad Yojana", MR: "भाऊसाहेब फुंडकर फळबाग लागवड योजना" },
    workflow: "Encouraging the planting of fruit orchards (Horticulture) to diversify farmer income.",
    documents: ["7/12 Extract", "8A Holding", "Aadhaar Card"],
    icon: <FileText className="text-orange-500" />
  },
  "farm-pond": {
    name: { EN: "Individual Farm Pond (Shet Tale)", MR: "वैयक्तिक शेततळे" },
    workflow: "Government provides subsidies to dig a pond on the farmer's land to store rainwater for irrigation.",
    documents: ["7/12 Extract", "8A Holding", "Aadhaar Card"],
    icon: <Search className="text-cyan-500" />
  }
};

const DOC_TRANSLATIONS: Record<string, Record<string, string>> = {
  "7/12 Extract": { EN: "7/12 Extract", MR: "७/१२ उतारा" },
  "8A Holding": { EN: "8A Holding", MR: "८अ उतारा" },
  "Aadhaar Card": { EN: "Aadhaar Card", MR: "आधार कार्ड" },
  "Bank Passbook Copy": { EN: "Bank Passbook Copy", MR: "बँक पासबुक" },
  "Caste Certificate": { EN: "Caste Certificate", MR: "जातीचा दाखला" }
};

export default function SchemeApplicationPage() {
  const params = useParams();
  const schemeId = params?.schemeId as string;
  const scheme = SCHEMES_DATA[schemeId];

  const [isSubmittingAll, setIsSubmittingAll] = useState(false);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [uploadStatus, setUploadStatus] = useState<Record<string, "idle" | "uploading" | "success" | "error">>({});
  const [uploadedUrls, setUploadedUrls] = useState<Record<string, string>>({});
  const [errorMessages, setErrorMessages] = useState<Record<string, string>>({});
  const [lang, setLang] = useState<"EN" | "MR">("EN");
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  const supabase = createClient();

  useEffect(() => {
    // Use the official client to check connection (more reliable than raw fetch)
    const checkConnection = async () => {
      try {
        const { error } = await supabase.from('farmer_applications').select('id', { count: 'exact', head: true }).limit(1);
        // If there's no error, or the error isn't a connection error (like RLS/missing table), we are connected
        if (error && error.message.includes("failed to fetch")) {
          setIsConnected(false);
        } else {
          setIsConnected(true);
        }
      } catch (e) {
        setIsConnected(false);
      }
    };
    checkConnection();
  }, [supabase]);

  if (!scheme) {
    return <div className="p-8 text-center text-gray-500">Scheme not found.</div>;
  }

  const handleIndividualSubmit = async (docName: string) => {
    const file = files[docName];
    if (!file) {
      toast.error(`Please select a file for ${docName}`);
      return;
    }

    setUploadStatus(prev => ({ ...prev, [docName]: "uploading" }));
    setErrorMessages(prev => ({ ...prev, [docName]: "" }));

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${schemeId}_${docName.replace(/\s+/g, '_')}.${fileExt}`;
      
      // Convert file to base64 for server action (bypasses RLS via Admin Client)
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.readAsDataURL(file);
      });
      
      const base64Data = await base64Promise;
      const uploadResult = await uploadDocumentAction(fileName, base64Data, file.type);

      if (!uploadResult.success) throw new Error(uploadResult.error);

      setUploadedUrls(prev => ({ ...prev, [docName]: uploadResult.publicUrl! }));
      setUploadStatus(prev => ({ ...prev, [docName]: "success" }));
      toast.success(`${docName} uploaded and synced to database!`);
    } catch (err: any) {
      console.error("Upload Error:", err);
      setUploadStatus(prev => ({ ...prev, [docName]: "error" }));
      setErrorMessages(prev => ({ ...prev, [docName]: err.message || "Upload failed. Check bucket permissions." }));
      toast.error(`Failed to upload ${docName}. ${err.message}`);
    }
  };

  const handleFinalSubmit = async () => {
    setIsSubmittingAll(true);
    
    try {
      const { data, error } = await supabase
        .from('farmer_applications')
        .insert([{
          scheme_id: schemeId,
          scheme_name: scheme.name[lang],
          document_urls: Object.values(uploadedUrls),
          status: 'Pending'
        }])
        .select('id')
        .single();

      if (error) throw error;
      const appId = data.id;

      toast.success("Application Created!", {
        description: `ID: ${appId}. Starting AI Audit...`
      });

      // Trigger AI Audit for relevant documents (Single Batch Call to Gemini 1.5 Flash)
      const auditFormData = new FormData();
      let hasAuditDocs = false;
      
      for (const [docName, file] of Object.entries(files)) {
        if (file && (docName === "7/12 Extract" || docName === "8A Holding" || docName === "Caste Certificate" || docName === "Income Certificate")) {
          auditFormData.append('files', file);
          auditFormData.append('types', docName);
          hasAuditDocs = true;
        }
      }

      if (hasAuditDocs) {
        toast.promise(processDocumentAudit(appId, auditFormData), {
          loading: `Auditing documents with Gemini 1.5 Flash...`,
          success: (res: any) => {
            if (res.verdict === 'Verified') return `Documents Verified by AI!`;
            return `AI Review: ${res.verdict}. ${res.reason}`;
          },
          error: `Failed to audit documents`
        });
      }
      
      // Reset state after success
      setTimeout(() => {
        window.location.href = "/farmer/dashboard/profile";
      }, 5000);

    } catch (err: any) {
      console.error("Final Submit Error:", err);
      toast.error("Failed to submit final application. " + err.message);
    } finally {
      setIsSubmittingAll(false);
    }
  };

  const allSubmitted = scheme.documents.every((doc: string) => uploadStatus[doc] === "success");

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      {/* Connection Warning */}
      {isConnected === false && (
        <div className="bg-red-50 border-2 border-red-200 p-4 rounded-xl flex items-center gap-4 text-red-700 shadow-sm">
          <AlertTriangle size={24} className="flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-bold text-sm">Supabase Connection Error</h4>
            <p className="text-xs">Unable to reach Supabase. Please check your internet connection and .env.local keys.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-100 shadow-inner text-2xl">
            {scheme.icon}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">{scheme.name[lang]}</h2>
            <p className="text-xs text-gray-400">{lang === "EN" ? "Direct Real-time Supabase Integration" : "थेट रिअल-टाइम सुपाबेस एकत्रीकरण"}</p>
          </div>
        </div>
        <button 
          onClick={() => setLang(lang === "EN" ? "MR" : "EN")}
          className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs font-bold transition-all border border-gray-200"
        >
          <Globe size={14} className="text-[#1B4332]" />
          {lang === "EN" ? "मराठी" : "English"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {scheme.documents.map((doc: string) => (
          <DocumentUploadCard 
            key={doc}
            docName={doc}
            lang={lang}
            file={files[doc] || null}
            status={uploadStatus[doc] || "idle"}
            errorMessage={errorMessages[doc]}
            onFileSelect={(file: File) => setFiles(prev => ({ ...prev, [doc]: file }))}
            onFileRemove={() => {
              setFiles(prev => ({ ...prev, [doc]: null }));
              setUploadStatus(prev => ({ ...prev, [doc]: "idle" }));
              setErrorMessages(prev => ({ ...prev, [doc]: "" }));
            }}
            onSubmit={() => handleIndividualSubmit(doc)}
          />
        ))}
      </div>

      {/* Global Submit */}
      <div className="mt-8 flex flex-col items-center gap-4 bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
        <div className="flex items-center gap-3 mb-2">
          <FileCheck className={allSubmitted ? "text-green-500" : "text-gray-300"} size={32} />
          <div className="h-2 w-48 bg-gray-100 rounded-full overflow-hidden shadow-inner">
            <div 
              className="h-full bg-green-500 transition-all duration-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" 
              style={{ width: `${(Object.values(uploadStatus).filter(s => s === "success").length / scheme.documents.length) * 100}%` }}
            ></div>
          </div>
        </div>
        
        <button 
          onClick={handleFinalSubmit}
          disabled={!allSubmitted || isSubmittingAll}
          className={`px-12 py-4 rounded-xl font-bold text-lg flex items-center gap-3 transition-all transform
            ${allSubmitted 
              ? "bg-[#1B4332] text-white shadow-xl hover:scale-105 active:scale-95" 
              : "bg-gray-100 text-gray-400 cursor-not-allowed shadow-inner"}`}
        >
          {isSubmittingAll ? <Loader2 className="animate-spin" /> : <ArrowRight />}
          {lang === "EN" ? "Submit Final Application" : "अंतिम अर्ज सादर करा"}
        </button>
      </div>
    </div>
  );
}

interface DocumentUploadCardProps {
  docName: string;
  lang: "EN" | "MR";
  file: File | null;
  status: "idle" | "uploading" | "success" | "error";
  errorMessage?: string;
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  onSubmit: () => void;
}

function DocumentUploadCard({ 
  docName, 
  lang, 
  file, 
  status, 
  errorMessage, 
  onFileSelect, 
  onFileRemove, 
  onSubmit 
}: DocumentUploadCardProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    disabled: status === "success" || status === "uploading",
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpeg', '.jpg', '.png']
    }
  });

  return (
    <div className={`bg-white border-2 rounded-2xl transition-all duration-300 overflow-hidden flex flex-col
      ${status === "success" ? "border-green-500 shadow-md bg-green-50/5" : 
        status === "error" ? "border-red-500 shadow-md bg-red-50/5" : "border-gray-100 hover:border-[#1B4332]/30 shadow-sm"}`}>
      
      <div className="p-5 flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{lang === "EN" ? "Required Document" : "आवश्यक कागदपत्र"}</span>
          <h4 className="text-lg font-bold text-gray-800">{DOC_TRANSLATIONS[docName]?.[lang] || docName}</h4>
        </div>
        {status === "success" && (
          <div className="bg-green-500 text-white p-1 rounded-full animate-bounce shadow-lg">
            <CheckCircle2 size={24} />
          </div>
        )}
        {status === "error" && (
          <div className="bg-red-500 text-white p-1 rounded-full shadow-lg">
            <X size={24} />
          </div>
        )}
      </div>

      <div className="px-5 pb-5 flex-1">
        {!file ? (
          <div 
            {...getRootProps()} 
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all
              ${isDragActive ? "border-[#1B4332] bg-[#1B4332]/5" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"}`}
          >
            <input {...getInputProps()} />
            <div className="h-12 w-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400">
              <Upload size={24} />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-gray-700">{lang === "EN" ? "Click or Drag & Drop" : "क्लिक करा किंवा ड्रॅग आणि ड्रॉप करा"}</p>
              <p className="text-[10px] text-gray-400">PDF, JPG, PNG (Max 5MB)</p>
            </div>
          </div>
        ) : (
          <div className={`border rounded-xl p-4 flex items-center justify-between shadow-inner
            ${status === "success" ? "bg-green-100/50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="p-2 bg-white rounded border border-gray-100 shadow-sm">
                <FileText className={status === "success" ? "text-green-600" : "text-[#1B4332]"} size={20} />
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs font-bold text-gray-700 truncate">{file.name}</span>
                <span className="text-[10px] text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
            </div>
            {status !== "success" && status !== "uploading" && (
              <button onClick={onFileRemove} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                <X size={18} />
              </button>
            )}
          </div>
        )}
        
        {errorMessage && (
          <div className="mt-3 text-[10px] text-red-600 bg-red-50 p-2 rounded border border-red-100 flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
              {errorMessage}
            </div>
            {errorMessage.includes("security policy") && (
              <div className="bg-white p-2 rounded border border-red-200 font-mono text-[9px] leading-tight">
                <strong>Fix:</strong> Run SQL policy to allow 'INSERT' on 'schemes' bucket.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-gray-50 px-5 py-4 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
           {status === "uploading" && <Loader2 className="animate-spin text-[#1B4332]" size={16} />}
           <span className={`text-[11px] font-bold uppercase tracking-tight
             ${status === "success" ? "text-green-600" : status === "error" ? "text-red-600" : "text-gray-400"}`}>
             {status === "success" ? (lang === "EN" ? "Synced to Supabase" : "डेटाबेसमध्ये समाविष्ट") : 
              status === "uploading" ? (lang === "EN" ? "Uploading..." : "अपलोड होत आहे...") : 
              status === "error" ? (lang === "EN" ? "Upload Failed" : "अपलोड अयशस्वी") :
              (lang === "EN" ? "Awaiting Submission" : "सबमिशनची प्रतीक्षा")}
           </span>
        </div>
        
        {status !== "success" && (
          <button 
            disabled={!file || status === "uploading"}
            onClick={onSubmit}
            className={`px-6 py-2 rounded-lg font-bold text-xs transition-all shadow-sm
              ${file && status !== "uploading"
                ? "bg-[#1B4332] text-white hover:bg-[#274e3d] active:scale-95" 
                : "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"}`}
          >
            {lang === "EN" ? "Submit Document" : "दस्तऐवज सबमिट करा"}
          </button>
        )}
      </div>
    </div>
  );
}
