"use client";

import React, { useEffect, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { LanguageSwitcherMinimal } from "@/components/LanguageSwitcher";
import { FarmerProfile } from "@/types";
import { preFilterSchemes, Scheme, MissingInfoScheme } from "@/lib/schemes";
import { ShieldCheck, Info, ArrowRight, AlertCircle, Sparkles } from "lucide-react";
import Link from "next/link";

export default function SchemesEligibilityPage() {
  const { lang, t } = useLanguage();
  const [profile, setProfile] = useState<FarmerProfile>({ name: "Farmer", district: "Unknown" });
  const [eligibleSchemes, setEligibleSchemes] = useState<Scheme[]>([]);
  const [missingInfoSchemes, setMissingInfoSchemes] = useState<MissingInfoScheme[]>([]);
  
  useEffect(() => {
    // Read the extracted profile data from localStorage
    const stored = window.localStorage.getItem('farmer_profile_data');
    let pData: FarmerProfile = { name: "Farmer", district: "Unknown" };
    if (stored) {
      try {
        pData = { ...pData, ...JSON.parse(stored) };
      } catch (e) {}
    }
    setProfile(pData);
    
    // Calculate eligibility
    const { eligible, missingInfo } = preFilterSchemes(pData);
    setEligibleSchemes(eligible);
    setMissingInfoSchemes(missingInfo);
  }, []);

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-12">
      <div className="flex items-center justify-between border-b border-[#1B4332] pb-2 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Sparkles className="text-[#1B4332]" size={24} />
            {lang === "EN" ? "Scheme Eligibility Engine" : "योजना पात्रता इंजिन"}
          </h2>
          <p className="text-sm text-gray-500">
            {lang === "EN" 
              ? "Based on the documents in your locker, here are the schemes you qualify for." 
              : "तुमच्या लॉकरमधील कागदपत्रांच्या आधारे, तुम्ही पात्र असलेल्या योजना खालीलप्रमाणे आहेत."}
          </p>
        </div>
        <LanguageSwitcherMinimal />
      </div>

      {/* Profile Overview */}
      <div className="bg-white border rounded-xl p-5 shadow-sm flex flex-wrap gap-4 items-center">
        <div className="text-sm font-bold text-gray-600 mr-4">
          {lang === "EN" ? "Extracted Profile:" : "काढलेली प्रोफाइल:"}
        </div>
        <div className="flex gap-4 flex-wrap">
          <div className="bg-gray-50 px-3 py-1.5 rounded-md border text-sm">
            <span className="text-gray-500 text-xs block">{lang === "EN" ? "Land Size" : "जमिनीचे क्षेत्र"}</span>
            <span className="font-bold text-[#1B4332]">
              {profile.landSizeHectares ? `${profile.landSizeHectares} Ha` : (lang === "EN" ? "Unknown" : "अज्ञात")}
            </span>
          </div>
          <div className="bg-gray-50 px-3 py-1.5 rounded-md border text-sm">
            <span className="text-gray-500 text-xs block">{lang === "EN" ? "Category" : "वर्ग"}</span>
            <span className="font-bold text-[#1B4332]">
              {profile.caste ? profile.caste : (lang === "EN" ? "Unknown" : "अज्ञात")}
            </span>
          </div>
        </div>
        <Link href="/farmer/dashboard/upload" className="ml-auto text-xs text-blue-600 hover:underline">
          {lang === "EN" ? "Upload more documents to update profile →" : "प्रोफाइल अपडेट करण्यासाठी आणखी कागदपत्रे अपलोड करा →"}
        </Link>
      </div>

      {/* Eligible Schemes */}
      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <ShieldCheck className="text-green-600" />
          {lang === "EN" ? "Eligible Schemes" : "पात्र योजना"}
          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">{eligibleSchemes.length}</span>
        </h3>
        
        {eligibleSchemes.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed rounded-xl bg-gray-50">
            <p className="text-gray-500">{lang === "EN" ? "No eligible schemes found based on current data." : "सध्याच्या डेटावर आधारित कोणत्याही पात्र योजना आढळल्या नाहीत."}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {eligibleSchemes.map(scheme => (
              <div key={scheme.id} className="border-2 border-green-200 bg-green-50/30 rounded-xl p-5 hover:shadow-md transition-all flex flex-col h-full">
                <div className="mb-2">
                  <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded uppercase tracking-wider mb-2 inline-block">
                    {scheme.department}
                  </span>
                  <h4 className="font-bold text-gray-900 text-lg leading-tight">
                    {lang === "EN" ? scheme.name : scheme.nameMarathi}
                  </h4>
                </div>
                <p className="text-sm text-gray-700 mb-4 flex-1">{scheme.benefit}</p>
                
                <div className="flex items-center justify-between mt-auto border-t border-green-100 pt-4">
                  <div className="text-sm">
                    <span className="text-gray-500 text-xs block">{lang === "EN" ? "Max Benefit" : "कमाल लाभ"}</span>
                    <span className="font-bold text-[#1B4332]">{scheme.benefitAmount}</span>
                  </div>
                  <Link 
                    href={`/farmer/dashboard/apply/${scheme.id}`}
                    className="flex items-center gap-2 bg-[#1B4332] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#274e3d] transition-colors"
                  >
                    {lang === "EN" ? "Apply Now" : "आता अर्ज करा"} <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Missing Info Schemes */}
      {missingInfoSchemes.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Info className="text-blue-600" />
            {lang === "EN" ? "Potential Matches (More Info Needed)" : "संभाव्य जुळण्या (अधिक माहिती आवश्यक)"}
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {missingInfoSchemes.map(scheme => (
              <div key={scheme.id} className="border border-blue-200 bg-blue-50/50 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-gray-900">{scheme.name}</h4>
                  <div className="flex items-center gap-2 mt-2 text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-md border border-amber-200 inline-flex">
                    <AlertCircle size={16} />
                    <span>
                      {lang === "EN" ? "We need your " : "आम्हाला तुमचे "} 
                      <strong className="font-bold">{scheme.missingDocs.join(" or ")}</strong> 
                      {lang === "EN" ? " to verify eligibility." : " आवश्यक आहे."}
                    </span>
                  </div>
                </div>
                <Link 
                  href="/farmer/dashboard/upload"
                  className="whitespace-nowrap flex items-center justify-center gap-2 bg-white border border-blue-300 text-blue-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-50 transition-colors"
                >
                  {lang === "EN" ? "Upload Document" : "कागदपत्र अपलोड करा"} <ArrowRight size={16} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
