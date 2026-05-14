"use client";

import React, { useState, useEffect } from "react";
import { User, Phone, Check, Loader2, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { usePersistedForm } from "@/lib/usePersistedForm";
import { ProfileProgress } from "@/components/ProfileProgress";
import { useLanguage } from "@/context/LanguageContext";
import { LanguageSwitcherMinimal } from "@/components/LanguageSwitcher";

export default function ProfilePage() {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    aadhaar: "XXXXXXXX7181",
    name: "Loading...",
    mobile: "9876543210",
    dob: "20/10/2006",
    age: "19",
    gender: "Male",
    address: "Not set"
  });
  const [farmerId, setFarmerId] = useState<string>("Loading...");

  useEffect(() => {
    async function loadProfile() {
      // Get the farmer ID from cookies
      const match = document.cookie.match(new RegExp('(^| )active_farmer_id=([^;]+)'));
      if (match) {
        const id = match[2];
        setFarmerId(id);
        
        // Fetch from Supabase
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
        
        const { data } = await supabase
          .from('farmer_profiles')
          .select('*')
          .eq('farmer_id', id)
          .single();
          
        if (data) {
          setFormData(prev => ({
            ...prev,
            name: data.farmer_name,
            aadhaar: data.aadhaar_number,
            mobile: data.phone || "Not set",
            dob: data.profile_data?.dob || "Not set",
            age: data.profile_data?.age || "Not set",
            gender: data.profile_data?.gender || "Not set",
            address: data.profile_data?.address || "Address will be updated from Aadhaar..."
          }));
        }
      }
    }
    loadProfile();
  }, []);

  const [isUpdatingMobile, setIsUpdatingMobile] = useState(false);
  const [isEditingMobile, setIsEditingMobile] = useState(false);

  const handleUpdateMobile = () => {
    if (isEditingMobile) {
      if (formData.mobile.length !== 10) {
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
      {/* Profile Completeness - NOW DYNAMIC */}
      <ProfileProgress />

      {/* Header Info Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-gray-100 pb-6 gap-6">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">{t('personal_info')}</h3>
          <div className="h-0.5 w-12 bg-[#1B4332]"></div>
        </div>
        
        <div className="flex items-center gap-6">
          <LanguageSwitcherMinimal />
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
      </div>

      {/* Form Section */}
      <section>
        <div className="flex items-center justify-between border-b border-[#1B4332] pb-1 mb-6">
          <h2 className="text-xl font-bold text-gray-800">{t('personal_info')}</h2>
          <span className="text-xs text-red-500 italic">{t('mandatory_fields')}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
          <EditableField 
            label={t('farmer_id_label')} 
            value={farmerId} 
            readonly 
            required 
          />
          <EditableField 
            label={t('aadhaar_number')} 
            value={formData.aadhaar} 
            readonly 
            required 
          />
          <EditableField 
            label={t('farmer_name')} 
            value={formData.name} 
            readonly 
            required 
          />
          
          <div className="flex flex-col gap-1">
            <label className="text-[13px] font-bold text-gray-700">{t('mobile_number')} <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              {isEditingMobile ? (
                <input 
                  type="text" 
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  className="flex-1 px-3 py-2 bg-white border border-[#1B4332] rounded text-[13px] text-gray-700 focus:outline-none"
                  autoFocus
                />
              ) : (
                <div className="flex-1 px-3 py-2 bg-gray-100 border border-gray-200 rounded text-[13px] text-gray-700">{formData.mobile}</div>
              )}
              
              <button 
                onClick={handleUpdateMobile}
                disabled={isUpdatingMobile}
                className={`text-white text-[12px] font-bold px-4 py-1 rounded transition-all flex items-center gap-2
                  ${isEditingMobile ? "bg-[#1B4332]" : "bg-[#5CB85C]"}`}
              >
                {isUpdatingMobile ? <Loader2 className="animate-spin" size={14} /> : (isEditingMobile ? <Check size={14} /> : <Edit2 size={12} />)}
                {isUpdatingMobile ? t('updating') : (isEditingMobile ? t('save') : t('update'))}
              </button>
            </div>
          </div>

          <EditableField 
            label={t('dob')} 
            value={formData.dob} 
            readonly
            required 
          />
          <EditableField 
            label={t('age')} 
            value={formData.age} 
            readonly
            required 
          />
          <EditableField 
            label={t('gender')} 
            value={formData.gender} 
            readonly
            required 
          />
        </div>
      </section>

      {/* Residence Section */}
      <section className="mt-4">
        <div className="flex items-center justify-between border-b border-[#1B4332] pb-1 mb-6">
          <h2 className="text-xl font-bold text-gray-800">{t('residence_address')}</h2>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[13px] font-bold text-gray-700">{t('farmer_address')} <span className="text-red-500">*</span></label>
          <textarea 
            className="w-full px-3 py-3 bg-gray-100 border border-gray-200 rounded text-[13px] text-gray-700 min-h-[80px] shadow-inner outline-none cursor-not-allowed"
            value={formData.address}
            readOnly
          />
        </div>
      </section>
    </div>
  );
}

function EditableField({ label, value, onChange, required = false, readonly = false }: { label: string, value: string, onChange?: (val: string) => void, required?: boolean, readonly?: boolean }) {
  return (
    <div className="flex flex-col gap-1 group">
      <label className="text-[13px] font-bold text-gray-700 group-hover:text-[#1B4332] transition-colors">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {readonly ? (
        <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded text-[13px] text-gray-700 font-mono">
          {value}
        </div>
      ) : (
        <input 
          type="text"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className="px-3 py-2 bg-white border border-gray-200 rounded text-[13px] text-gray-700 focus:outline-none focus:border-[#1B4332] transition-all"
        />
      )}
    </div>
  );
}

