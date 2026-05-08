"use client";

import React, { useState, useEffect } from "react";
import { 
  Home, 
  HelpCircle, 
  BookOpen, 
  MessageSquare, 
  Phone, 
  Globe, 
  Smartphone,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { usePersistedForm } from "@/lib/usePersistedForm";

export default function FarmerPortal() {
  const [language, setLanguage] = useState("Marathi");
  const [loginType, setLoginType] = useState("individual");
  const router = useRouter();

  const [formData, setFormData] = usePersistedForm("farmer_profile", {
    aadhaar: "",
    name: "",
    mobile: "",
    dob: "20/10/2006",
    age: "19",
    gender: "Male"
  });

  const [isPending, setIsPending] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    
    setTimeout(() => {
      toast.success(language === "Marathi" ? "लॉगिन यशस्वी!" : "Login Successful!");
      router.push('/farmer/dashboard/profile');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#f7f9fb] font-sans flex flex-col">
      {/* 1. PERSISTENT RED BANNER */}
      <div className="bg-[#B91C1C] text-white py-2 px-4 text-center text-xs font-bold tracking-wider z-[9999] fixed top-0 w-full shadow-md">
        DEMO ENVIRONMENT ONLY - FOR PRAGATI AI HACKATHON TESTING. NOT AN OFFICIAL GOVERNMENT WEBSITE.
      </div>

      {/* Spacing for fixed banner */}
      <div className="h-8"></div>

      {/* 2. HEADER */}
      <header className="bg-white py-4 px-6 md:px-12 flex justify-between items-center border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 bg-[#1B4332] rounded-lg flex items-center justify-center">
            <Smartphone className="text-white h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold text-[#1B4332]">
              MahaDBT <span className="text-gray-400 font-sans font-light text-lg">(Demo Portal)</span>
            </h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-tighter">Pragati AI Hackathon Edition</p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-6">
          <button 
            onClick={() => setLanguage(language === "English" ? "Marathi" : "English")}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[#1B4332] transition-colors"
          >
            <Globe className="h-4 w-4" />
            {language === "English" ? "मराठी" : "English"}
          </button>
          <div className="flex items-center gap-2 bg-[#f2f4f6] px-3 py-1 rounded-full">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-bold text-gray-500">SYSTEM ONLINE</span>
          </div>
        </div>

        <div className="flex md:hidden items-center gap-2">
          <button 
            onClick={() => setLanguage(language === "English" ? "Marathi" : "English")}
            className="flex items-center gap-2 text-xs font-medium text-gray-600"
          >
            <Globe className="h-4 w-4" />
            {language === "English" ? "मराठी" : "English"}
          </button>
        </div>
      </header>

      {/* 3. NAVIGATION BAR */}
      <nav className="bg-[#1B4332] text-white px-6 md:px-12 py-3 flex gap-8 items-center overflow-x-auto no-scrollbar">
        <a href="#" className="flex items-center gap-2 text-sm font-medium hover:text-[#fe932c] whitespace-nowrap">
          <Home className="h-4 w-4" />
          {language === "Marathi" ? "मुख्य पान" : "Main Home"}
        </a>
        <a href="#" className="text-sm font-medium hover:text-[#fe932c] whitespace-nowrap">
          {language === "Marathi" ? "योजना" : "Schemes"}
        </a>
        <a href="#" className="text-sm font-medium hover:text-[#fe932c] whitespace-nowrap">
          {language === "Marathi" ? "मार्गदर्शक सूचना" : "Guidelines"}
        </a>
        <a href="#" className="text-sm font-medium hover:text-[#fe932c] whitespace-nowrap">
          {language === "Marathi" ? "संपर्क" : "Contact Us"}
        </a>
      </nav>

      <div className="flex-1 flex flex-col md:flex-row max-w-[1400px] mx-auto w-full p-4 md:p-8 gap-8">
        
        {/* 4. SIDEBAR */}
        <aside className="w-full md:w-64 flex flex-col gap-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-[#1B4332] p-4 text-white font-bold text-sm">
              {language === "Marathi" ? "त्वरित दुवे" : "Quick Links"}
            </div>
            <div className="p-2 flex flex-col gap-1">
              <SidebarLink icon={<Home className="h-4 w-4" />} label={language === "Marathi" ? "अर्जदार लॉगिन" : "Applicant Login"} active />
              <SidebarLink icon={<MessageSquare className="h-4 w-4" />} label={language === "Marathi" ? "तक्रार / सूचना" : "Complaint / Suggestion"} />
              <SidebarLink icon={<BookOpen className="h-4 w-4" />} label={language === "Marathi" ? "वापरकर्ता पुस्तिका" : "User Manual"} />
              <SidebarLink icon={<HelpCircle className="h-4 w-4" />} label={language === "Marathi" ? "नेहमीचे प्रश्न" : "Frequently Asked Questions"} />
              <SidebarLink icon={<Phone className="h-4 w-4" />} label={language === "Marathi" ? "हेल्पलाईन नंबर" : "Helpline Number"} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#1B4332] to-[#274e3d] rounded-xl p-6 text-white shadow-lg mt-4">
            <h4 className="font-bold mb-2">{language === "Marathi" ? "मोफत सहाय्य" : "Free Assistance"}</h4>
            <p className="text-xs opacity-80 mb-4">{language === "Marathi" ? "काही अडचण असल्यास कॉल करा" : "Call us for any issues with the portal"}</p>
            <div className="flex items-center gap-2 font-mono text-lg font-bold">
              <Phone className="h-5 w-5 text-[#fe932c]" />
              022-61316489
            </div>
          </div>
        </aside>

        {/* 5. MAIN CONTENT / FORM AREA */}
        <main className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-10 flex flex-col gap-8">
          <div className="flex flex-col gap-2 border-b border-gray-50 pb-6">
            <h2 className="text-3xl font-serif font-bold text-[#1B4332]">
              {language === "Marathi" ? "शेतकरी लॉगिन / नोंदणी" : "Farmer Login / Registration"}
            </h2>
            <div className="h-1 w-20 bg-[#fe932c] rounded-full"></div>
            <p className="text-gray-500 mt-2">
              {language === "Marathi" 
                ? "कृपया प्रणालीमध्ये प्रवेश करण्यासाठी आपले तपशील प्रविष्ट करा." 
                : "Please enter your details to access the system."}
            </p>
          </div>

          {/* Login Type Radio Buttons */}
          <div className="flex flex-wrap gap-4 md:gap-8">
            <RadioButton 
              label={language === "Marathi" ? "वैयक्तिक शेतकरी" : "Individual Farmer"} 
              selected={loginType === "individual"} 
              onClick={() => setLoginType("individual")} 
            />
            <RadioButton 
              label={language === "Marathi" ? "शेतकरी गट" : "Farmer Group"} 
              selected={loginType === "group"} 
              onClick={() => setLoginType("group")} 
            />
            <RadioButton 
              label={language === "Marathi" ? "आधार आधारित लॉगिन" : "Aadhaar Based Login"} 
              selected={loginType === "aadhaar"} 
              onClick={() => setLoginType("aadhaar")} 
            />
          </div>

          <form 
            onSubmit={handleLogin} 
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <FormInput 
              name="farmerName"
              label={language === "Marathi" ? "शेतकऱ्याचे नाव" : "Farmer Name"} 
              placeholder={language === "Marathi" ? "पूर्ण नाव प्रविष्ट करा" : "Enter full name"}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <FormInput 
              name="aadhaarNumber"
              label={language === "Marathi" ? "आधार क्रमांक" : "Aadhaar Number"} 
              placeholder="XXXX XXXX XXXX"
              value={formData.aadhaar}
              onChange={(e) => setFormData({ ...formData, aadhaar: e.target.value })}
              required
            />
            <FormInput 
              name="mobileNumber"
              label={language === "Marathi" ? "मोबाईल क्रमांक" : "Mobile Number"} 
              placeholder="9876543210"
              value={formData.mobile}
              onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              required
            />

            <div className="md:col-span-2 flex justify-end mt-4">
              <button 
                type="submit"
                disabled={isPending || !formData.name || !formData.aadhaar}
                className="bg-[#1B4332] text-white px-10 py-4 rounded-xl font-bold text-lg hover:bg-[#274e3d] transition-all shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-70 disabled:cursor-wait flex items-center gap-3"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {language === "Marathi" ? "लॉगिन करत आहे..." : "Logging in..."}
                  </>
                ) : (
                  language === "Marathi" ? "लॉगिन करा" : "Login"
                )}
              </button>
            </div>
          </form>

          {/* Guidelines Section */}
          <div className="mt-8 p-6 bg-[#f2f4f6] rounded-2xl border border-gray-100">
            <h4 className="font-bold flex items-center gap-2 text-[#1B4332] mb-4">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              {language === "Marathi" ? "महत्वाच्या सूचना" : "Important Instructions"}
            </h4>
            <ul className="text-sm text-gray-600 flex flex-col gap-3">
              <li className="flex gap-2">
                <span className="text-[#fe932c] font-bold">•</span>
                {language === "Marathi" 
                  ? "अनुदान हस्तांतरणासाठी आधार बँक खात्याशी लिंक असल्याची खात्री करा." 
                  : "Ensure Aadhaar is linked to your bank account for subsidy transfer."}
              </li>
              <li className="flex gap-2">
                <span className="text-[#fe932c] font-bold">•</span>
                {language === "Marathi" 
                  ? "जमिनीच्या अभिलेखांच्या स्पष्ट प्रती अपलोड करा (७/१२ उतारा)." 
                  : "Upload clear PDF or JPG copies of land records (7/12 उतारा)."}
              </li>
              <li className="flex gap-2">
                <span className="text-[#fe932c] font-bold">•</span>
                {language === "Marathi" 
                  ? "अर्ज सादर केल्यावर पोचपावती जतन करा." 
                  : "Save the acknowledgment receipt after submitting the application."}
              </li>
            </ul>
          </div>
        </main>
      </div>

      {/* 6. FOOTER */}
      <footer className="bg-white border-t border-gray-100 py-12 px-6 md:px-12 mt-12">
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="md:col-span-2">
            <h5 className="text-xl font-serif font-bold text-[#1B4332] mb-4">MahaDBT (Demo Portal)</h5>
            <p className="text-sm text-gray-500 max-w-md leading-relaxed">
              Digitalizing Agriculture for Maharashtra's Farmers. This demo environment is built for hackathon testing purposes and does not represent any real government entity.
            </p>
          </div>
          
          <div>
            <h5 className="font-bold text-gray-800 mb-6">{language === "Marathi" ? "आमच्याशी जोडा" : "Join Us on Mobile"}</h5>
            <div className="flex flex-col gap-3">
              <button className="flex items-center gap-3 bg-black text-white px-4 py-2 rounded-lg hover:opacity-80 transition-opacity">
                <Smartphone className="h-6 w-6" />
                <div className="text-left">
                  <div className="text-[10px] uppercase opacity-70">Download on the</div>
                  <div className="text-sm font-bold leading-none">App Store</div>
                </div>
              </button>
              <button className="flex items-center gap-3 bg-black text-white px-4 py-2 rounded-lg hover:opacity-80 transition-opacity">
                <Smartphone className="h-6 w-6" />
                <div className="text-left">
                  <div className="text-[10px] uppercase opacity-70">Get it on</div>
                  <div className="text-sm font-bold leading-none">Google Play</div>
                </div>
              </button>
            </div>
          </div>

          <div>
            <h5 className="font-bold text-gray-800 mb-6">{language === "Marathi" ? "संपर्क" : "Contact"}</h5>
            <div className="text-sm text-gray-500 leading-loose">
              Demo Support: support@pragati.ai<br />
              Hackathon Team: Pragati AI<br />
              Location: Pune, MH
            </div>
          </div>
        </div>
        
        <div className="max-w-[1400px] mx-auto mt-12 pt-8 border-t border-gray-50 text-center">
          <p className="text-xs text-gray-400 font-medium tracking-widest">
            © 2024 GOVERNMENT OF MAHARASHTRA - DEMO ENVIRONMENT ONLY
          </p>
        </div>
      </footer>
    </div>
  );
}

function SidebarLink({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <a 
      href="#" 
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all
        ${active 
          ? "bg-[#f2f4f6] text-[#1B4332] font-bold" 
          : "text-gray-600 hover:bg-gray-50 hover:text-[#1B4332]"}`}
    >
      <span className={active ? "text-[#1B4332]" : "text-gray-400"}>{icon}</span>
      {label}
    </a>
  );
}

function RadioButton({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button 
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 group cursor-pointer"
    >
      <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all
        ${selected ? "border-[#1B4332]" : "border-gray-300 group-hover:border-gray-400"}`}>
        {selected && <div className="h-2.5 w-2.5 rounded-full bg-[#1B4332]"></div>}
      </div>
      <span className={`text-sm font-medium transition-colors
        ${selected ? "text-gray-900 font-bold" : "text-gray-500 group-hover:text-gray-700"}`}>
        {label}
      </span>
    </button>
  );
}

function FormInput({ name, label, placeholder, required = false, defaultValue, value, onChange }: { 
  name: string; 
  label: string; 
  placeholder: string; 
  required?: boolean;
  defaultValue?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-bold text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input 
        name={name}
        type="text" 
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
        value={value}
        onChange={onChange}
        className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332] transition-all text-sm"
      />
    </div>
  );
}
