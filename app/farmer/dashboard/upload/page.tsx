"use client";

import React, { useState, useCallback } from "react";
import { 
  FileText, 
  Upload, 
  CheckCircle2, 
  Loader2, 
  X,
  AlertTriangle,
  FileCheck
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { uploadDocumentAction } from "@/app/actions/farmer-actions";
import { useLanguage } from "@/context/LanguageContext";
import { LanguageSwitcherMinimal } from "@/components/LanguageSwitcher";

const STANDARD_DOCS = [
  "7/12 Extract",
  "8A Holding",
  "Aadhaar Card",
  "Bank Passbook Copy",
  "Caste Certificate",
  "Income Certificate"
];

const DOC_TRANSLATIONS: Record<string, Record<string, string>> = {
  "7/12 Extract": { EN: "7/12 Extract", MR: "७/१२ उतारा" },
  "8A Holding": { EN: "8A Holding", MR: "८अ उतारा" },
  "Aadhaar Card": { EN: "Aadhaar Card", MR: "आधार कार्ड" },
  "Bank Passbook Copy": { EN: "Bank Passbook Copy", MR: "बँक पासबुक" },
  "Caste Certificate": { EN: "Caste Certificate", MR: "जातीचा दाखला" },
  "Income Certificate": { EN: "Income Certificate", MR: "उत्पन्नाचा दाखला" }
};

export default function UploadDocumentsPage() {
  const { lang, t } = useLanguage();
  
  // Local state to track newly selected files before uploading
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [uploadStatus, setUploadStatus] = useState<Record<string, "idle" | "uploading" | "success" | "error">>({});
  
  // Read existing profile documents from local storage to display what's already uploaded
  const [profileDocs, setProfileDocs] = useState<Record<string, string>>(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("farmer_profile_docs");
      return stored ? JSON.parse(stored) : {};
    }
    return {};
  });

  const saveToProfile = (docName: string, url: string) => {
    const updated = { ...profileDocs, [docName]: url };
    setProfileDocs(updated);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("farmer_profile_docs", JSON.stringify(updated));
    }
  };

  const removeDoc = (docName: string) => {
    const updated = { ...profileDocs };
    delete updated[docName];
    setProfileDocs(updated);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("farmer_profile_docs", JSON.stringify(updated));
    }
    setFiles(prev => ({ ...prev, [docName]: null }));
    setUploadStatus(prev => ({ ...prev, [docName]: "idle" }));
  };

  const handleUpload = async (docName: string) => {
    const file = files[docName];
    if (!file) return;

    setUploadStatus(prev => ({ ...prev, [docName]: "uploading" }));

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_PROFILE_${docName.replace(/\s+/g, '_')}.${fileExt}`;
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', fileName);
      
      const uploadResult = await uploadDocumentAction(formData);

      if (!uploadResult.success) throw new Error(uploadResult.error);

      saveToProfile(docName, uploadResult.publicUrl!);
      setUploadStatus(prev => ({ ...prev, [docName]: "success" }));
      toast.success(`${docName} uploaded and saved to profile!`);
    } catch (err: any) {
      console.error("Upload Error:", err);
      setUploadStatus(prev => ({ ...prev, [docName]: "error" }));
      toast.error(`Failed to upload ${docName}. ${err.message}`);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between border-b border-[#1B4332] pb-2 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            {lang === "EN" ? "My Documents (Locker)" : "माझी कागदपत्रे"}
          </h2>
          <p className="text-sm text-gray-500">
            {lang === "EN" 
              ? "Upload your documents once and reuse them for scheme applications." 
              : "तुमची कागदपत्रे एकदाच अपलोड करा आणि योजनांच्या अर्जांसाठी ती पुन्हा वापरा."}
          </p>
        </div>
        <LanguageSwitcherMinimal />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {STANDARD_DOCS.map((doc) => {
          const isUploaded = !!profileDocs[doc];
          
          return (
            <div key={doc} className={`bg-white border-2 rounded-2xl transition-all duration-300 overflow-hidden flex flex-col ${isUploaded ? "border-[#1B4332] shadow-md" : "border-gray-100 shadow-sm"}`}>
              <div className="p-5 flex justify-between items-start bg-gray-50 border-b border-gray-100">
                <div className="flex flex-col gap-1">
                  <h4 className="text-base font-bold text-gray-800">{DOC_TRANSLATIONS[doc]?.[lang] || doc}</h4>
                </div>
                {isUploaded && (
                  <div className="bg-[#1B4332] text-white p-1 rounded-full shadow-sm flex items-center gap-1 px-3 py-1">
                    <CheckCircle2 size={16} />
                    <span className="text-xs font-bold">{lang === "EN" ? "Uploaded" : "अपलोड केले"}</span>
                  </div>
                )}
              </div>

              <div className="p-5 flex-1 flex flex-col gap-4">
                {isUploaded ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded border border-green-100 shadow-sm">
                        <FileCheck className="text-green-600" size={24} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-800">{doc} Saved</span>
                        <a href={profileDocs[doc]} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
                          View Document
                        </a>
                      </div>
                    </div>
                    <button onClick={() => removeDoc(doc)} className="p-2 text-gray-400 hover:text-red-500 bg-white rounded-full border shadow-sm transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <DocumentUploader
                    docName={doc}
                    lang={lang}
                    file={files[doc] || null}
                    status={uploadStatus[doc] || "idle"}
                    onFileSelect={(f) => setFiles(prev => ({ ...prev, [doc]: f }))}
                    onFileRemove={() => {
                      setFiles(prev => ({ ...prev, [doc]: null }));
                      setUploadStatus(prev => ({ ...prev, [doc]: "idle" }));
                    }}
                    onSubmit={() => handleUpload(doc)}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DocumentUploader({ docName, lang, file, status, onFileSelect, onFileRemove, onSubmit }: any) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) onFileSelect(acceptedFiles[0]);
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    disabled: status === "success" || status === "uploading",
    accept: { 'application/pdf': ['.pdf'], 'image/*': ['.jpeg', '.jpg', '.png'] }
  });

  return (
    <div className="flex flex-col gap-3">
      {!file ? (
        <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${isDragActive ? "border-[#1B4332] bg-[#1B4332]/5" : "border-gray-200 hover:border-gray-300 bg-gray-50"}`}>
          <input {...getInputProps()} />
          <Upload className="text-gray-400" size={20} />
          <p className="text-xs font-bold text-gray-600">{lang === "EN" ? "Click or Drag & Drop" : "क्लिक करा किंवा ड्रॅग आणि ड्रॉप करा"}</p>
        </div>
      ) : (
        <div className="border rounded-xl p-3 flex items-center justify-between bg-white shadow-sm">
          <div className="flex items-center gap-2 overflow-hidden">
            <FileText className="text-[#1B4332]" size={16} />
            <span className="text-xs font-bold text-gray-700 truncate">{file.name}</span>
          </div>
          {status !== "uploading" && (
            <button onClick={onFileRemove} className="p-1 text-gray-400 hover:text-red-500 transition-colors"><X size={14} /></button>
          )}
        </div>
      )}

      {file && (
        <button 
          disabled={status === "uploading"}
          onClick={onSubmit}
          className="w-full mt-2 bg-[#1B4332] text-white py-2 rounded-lg text-xs font-bold hover:bg-[#274e3d] transition-colors flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {status === "uploading" ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {status === "uploading" ? (lang === "EN" ? "Uploading..." : "अपलोड होत आहे...") : (lang === "EN" ? "Save to Profile" : "प्रोफाइलमध्ये सेव्ह करा")}
        </button>
      )}
    </div>
  );
}
