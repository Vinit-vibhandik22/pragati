"use client";

import React, { useState } from "react";
import { User, Phone, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ProfilePage() {
  const [isUpdatingMobile, setIsUpdatingMobile] = useState(false);
  const [mobileNo, setMobileNo] = useState("9876543210");
  const [isEditingMobile, setIsEditingMobile] = useState(false);

  const handleUpdateMobile = () => {
    if (isEditingMobile) {
      if (mobileNo.length !== 10) {
        toast.error("Invalid mobile number. Must be 10 digits.");
        return;
      }
      setIsUpdatingMobile(true);
      setTimeout(() => {
        setIsUpdatingMobile(false);
        setIsEditingMobile(false);
        toast.success("Mobile number updated and verified!");
      }, 1500);
    } else {
      setIsEditingMobile(true);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Profile Completeness */}
      <div className="w-full">
        <div className="flex justify-center mb-1">
          <span className="text-[13px] font-bold text-gray-700">Profile Completeness <span className="text-[#B91C1C]">50%</span></span>
        </div>
        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
          <div className="bg-[#B91C1C] h-full" style={{ width: "50%" }}></div>
        </div>
      </div>

      {/* Header Info Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-gray-100 pb-6 gap-6">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Personal Information</h3>
          <div className="h-0.5 w-12 bg-[#1B4332]"></div>
        </div>
        
        <div className="flex items-center gap-12">
          <div className="flex flex-col items-center gap-2">
            <div className="h-14 w-14 bg-sky-400 rounded-full flex items-center justify-center text-white border-4 border-sky-50 shadow-sm">
              <User size={32} />
            </div>
            <div className="h-0.5 w-full bg-sky-200"></div>
          </div>
          
          <div className="flex flex-col items-center gap-2 opacity-30">
            <div className="h-14 w-14 border-2 border-gray-300 rounded-full flex items-center justify-center text-gray-300">
               <span className="font-bold text-xs">Caste</span>
            </div>
            <div className="h-0.5 w-full bg-gray-100"></div>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <section>
        <div className="flex items-center justify-between border-b border-[#1B4332] pb-1 mb-6">
          <h2 className="text-xl font-bold text-gray-800">Personal Information</h2>
          <span className="text-xs text-red-500 italic">All * marks fields are mandatory</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
          <ProfileField label="Farmer ID" value="FMR20241020" required />
          <ProfileField label="Aadhaar Number" value="XXXXXXXX7181" required />
          <ProfileField label="Farmer Name" value="Mangulkar Sameer Sandeep" required />
          
          <div className="flex flex-col gap-1">
            <label className="text-[13px] font-bold text-gray-700">Mobile Number <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              {isEditingMobile ? (
                <input 
                  type="text" 
                  value={mobileNo}
                  onChange={(e) => setMobileNo(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="flex-1 px-3 py-2 bg-white border border-[#1B4332] rounded text-[13px] text-gray-700 focus:outline-none"
                  autoFocus
                />
              ) : (
                <div className="flex-1 px-3 py-2 bg-gray-100 border border-gray-200 rounded text-[13px] text-gray-700">{mobileNo}</div>
              )}
              
              <button 
                onClick={handleUpdateMobile}
                disabled={isUpdatingMobile}
                className={`text-white text-[12px] font-bold px-4 py-1 rounded transition-all flex items-center gap-2
                  ${isEditingMobile ? "bg-[#1B4332]" : "bg-[#5CB85C]"}`}
              >
                {isUpdatingMobile ? <Loader2 className="animate-spin" size={14} /> : (isEditingMobile ? <Check size={14} /> : null)}
                {isUpdatingMobile ? "Updating..." : (isEditingMobile ? "Save" : "Update MobileNo.")}
              </button>
            </div>
            <div className="bg-[#D97706]/10 text-[#D97706] text-[10px] px-2 py-1 rounded mt-1 border border-[#D97706]/20 font-medium">
              Mobile number should contain 10 digits and start with the 6,7,8,9
            </div>
          </div>

          <ProfileField label="Date of Birth" value="20/10/2006" required />
          <ProfileField label="Age" value="19" required />
          <ProfileField label="Gender" value="Male" required />
        </div>
      </section>

      {/* Residence Section */}
      <section className="mt-4">
        <div className="flex items-center justify-between border-b border-[#1B4332] pb-1 mb-6">
          <h2 className="text-xl font-bold text-gray-800">Residence Address</h2>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[13px] font-bold text-gray-700">Farmer Address <span className="text-red-500">*</span></label>
          <div className="w-full px-3 py-3 bg-gray-100 border border-gray-200 rounded text-[13px] text-gray-700 min-h-[80px] shadow-inner">
            plot no-6 sarve no-27, galli no-11, near mscb dipi, Aurangabad (mh), 431001
          </div>
        </div>
      </section>
    </div>
  );
}

function ProfileField({ label, value, required = false }: { label: string, value: string, required?: boolean }) {
  return (
    <div className="flex flex-col gap-1 group">
      <label className="text-[13px] font-bold text-gray-700 group-hover:text-[#1B4332] transition-colors">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded text-[13px] text-gray-700 group-hover:border-gray-300 transition-all">
        {value}
      </div>
    </div>
  );
}
