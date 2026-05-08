"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  Upload, 
  Loader2, 
  AlertCircle,
  Receipt,
  FileSpreadsheet
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/context/LanguageContext";

interface Application {
  id: string;
  scheme_name: string;
  status: string;
  created_at: string;
  document_urls: string[];
}

export default function ApplicationHistoryPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  
  const { language } = useLanguage();
  const lang = language === "English" ? "EN" : "MR";
  const supabase = createClient();

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      // For demo, get farmerId from localStorage like in apply page
      const stored = window.localStorage.getItem('farmer_profile');
      let farmerName = "Farmer";
      let aadhaar = "0000";
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.name) farmerName = parsed.name;
          if (parsed.aadhaar) aadhaar = parsed.aadhaar;
        } catch (e) {}
      }
      const farmerId = `FARMER_${farmerName.replace(/\s+/g, '_').toUpperCase()}_${aadhaar.slice(-4)}`;

      const { data, error } = await supabase
        .from('farmer_applications')
        .select('*')
        .eq('farmer_id', farmerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (err: any) {
      toast.error("Failed to load applications: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentUpload = async (appId: string, docType: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingDoc(`${appId}-${docType}`);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${appId}_${docType}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('schemes')
        .upload(fileName, file);

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('schemes')
        .getPublicUrl(fileName);

      const publicUrl = publicUrlData.publicUrl;

      // Update the database with the new URL
      const columnToUpdate = docType === 'Quotation' ? 'quotation_url' : 'receipt_url';
      
      const { error: updateError } = await supabase
        .from('farmer_applications')
        .update({ [columnToUpdate]: publicUrl })
        .eq('id', appId);

      if (updateError) throw updateError;

      toast.success(`${docType} uploaded successfully!`);
      
    } catch (err: any) {
      toast.error(`Failed to upload ${docType}: ` + err.message);
    } finally {
      setUploadingDoc(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-gray-400">
        <Loader2 className="animate-spin" size={40} />
        <p className="text-sm font-bold uppercase tracking-wider">{lang === "EN" ? "Loading Applications..." : "अर्ज लोड करत आहे..."}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <div className="border-b border-[#1B4332] pb-2">
        <h2 className="text-2xl font-bold text-gray-800">
          {lang === "EN" ? "Application History" : "अर्जाचा इतिहास"}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {lang === "EN" ? "Track your applied schemes and upload pending documents." : "तुमच्या लागू केलेल्या योजनांचा मागोवा घ्या आणि प्रलंबित कागदपत्रे अपलोड करा."}
        </p>
      </div>

      {applications.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-16 text-center flex flex-col items-center gap-4">
          <FileText size={48} className="text-gray-300" />
          <h3 className="text-xl font-bold text-gray-700">{lang === "EN" ? "No Applications Found" : "कोणतेही अर्ज आढळले नाहीत"}</h3>
          <p className="text-sm text-gray-500 max-w-sm">
            {lang === "EN" ? "You have not applied for any schemes yet. Visit the 'Apply' section to start." : "तुम्ही अद्याप कोणत्याही योजनेसाठी अर्ज केलेला नाही. सुरू करण्यासाठी 'अर्ज करा' विभागात जा."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {applications.map((app) => (
            <div key={app.id} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col gap-4 transition-all hover:shadow-md">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-[#1B4332]">{app.scheme_name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500 font-mono">ID: {app.id.substring(0, 8)}...</span>
                    <span className="text-gray-300">•</span>
                    <span className="text-xs text-gray-500">{new Date(app.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div>
                  {app.status === 'Verified_by_Clerk' || app.status === 'Approved' ? (
                    <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-lg font-bold text-sm border border-green-200">
                      <CheckCircle2 size={18} />
                      {lang === "EN" ? "Approved by Clerk" : "कारकुनाकडून मंजूर"}
                    </div>
                  ) : app.status === 'Rejected' ? (
                    <div className="flex items-center gap-2 bg-red-50 text-red-700 px-4 py-2 rounded-lg font-bold text-sm border border-red-200">
                      <AlertCircle size={18} />
                      {lang === "EN" ? "Rejected" : "नाकारले"}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-yellow-50 text-yellow-700 px-4 py-2 rounded-lg font-bold text-sm border border-yellow-200">
                      <Clock size={18} />
                      {lang === "EN" ? "Pending Review" : "पुनरावलोकनासाठी प्रलंबित"}
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Section if Approved */}
              {(app.status === 'Verified_by_Clerk' || app.status === 'Approved') && (
                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-5 mt-2">
                  <h4 className="font-bold text-blue-900 text-sm mb-3">
                    {lang === "EN" ? "Action Required: Upload Quotation & Payment Receipt" : "कृती आवश्यक: कोटेशन आणि पेमेंट पावती अपलोड करा"}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Quotation Upload */}
                    <div className="bg-white border border-blue-100 p-4 rounded-lg shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-lg text-blue-700">
                          <FileSpreadsheet size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-800">{lang === "EN" ? "Dealer Quotation" : "डीलर कोटेशन"}</p>
                          <p className="text-[10px] text-gray-500">{lang === "EN" ? "PDF or Image" : "PDF किंवा इमेज"}</p>
                        </div>
                      </div>
                      <div>
                        <input 
                          type="file" 
                          id={`quotation-${app.id}`} 
                          className="hidden" 
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleDocumentUpload(app.id, 'Quotation', e)}
                        />
                        <label 
                          htmlFor={`quotation-${app.id}`}
                          className="flex items-center gap-2 px-4 py-2 bg-[#1B4332] text-white rounded-lg text-xs font-bold cursor-pointer hover:bg-[#274e3d] transition-colors"
                        >
                          {uploadingDoc === `${app.id}-Quotation` ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                          {lang === "EN" ? "Upload" : "अपलोड करा"}
                        </label>
                      </div>
                    </div>

                    {/* Receipt Upload */}
                    <div className="bg-white border border-blue-100 p-4 rounded-lg shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-lg text-blue-700">
                          <Receipt size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-800">{lang === "EN" ? "Payment Receipt (GST)" : "पेमेंट पावती (GST सह)"}</p>
                          <p className="text-[10px] text-gray-500">{lang === "EN" ? "Must include GST No." : "GST क्रमांक असणे आवश्यक आहे"}</p>
                        </div>
                      </div>
                      <div>
                        <input 
                          type="file" 
                          id={`receipt-${app.id}`} 
                          className="hidden" 
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleDocumentUpload(app.id, 'Receipt', e)}
                        />
                        <label 
                          htmlFor={`receipt-${app.id}`}
                          className="flex items-center gap-2 px-4 py-2 bg-[#1B4332] text-white rounded-lg text-xs font-bold cursor-pointer hover:bg-[#274e3d] transition-colors"
                        >
                          {uploadingDoc === `${app.id}-Receipt` ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                          {lang === "EN" ? "Upload" : "अपलोड करा"}
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
