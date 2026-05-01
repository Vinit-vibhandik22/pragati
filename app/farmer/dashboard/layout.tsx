"use client";

import React, { useState } from "react";
import { 
  User, 
  ChevronRight, 
  ChevronLeft,
  Settings,
  LogOut,
  LayoutDashboard,
  FileText,
  Map,
  History,
  Upload,
  MessageSquare,
  CreditCard,
  Menu,
  X
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function FarmerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [lang, setLang] = React.useState<"EN" | "MR">("EN");
  const pathname = usePathname();

  const menuItems = [
    { label: { EN: "Profile", MR: "प्रोफाइल" }, icon: <User size={18} />, href: "/farmer/dashboard/profile" },
    { label: { EN: "Apply for Component", MR: "घटकासाठी अर्ज करा" }, icon: <FileText size={18} />, href: "/farmer/dashboard/apply" },
    { label: { EN: "Land Details", MR: "जमिनीचा तपशील" }, icon: <Map size={18} />, href: "/farmer/dashboard/land" },
    { label: { EN: "View Component History", MR: "घटकाचा इतिहास पहा" }, icon: <History size={18} />, href: "/farmer/dashboard/history" },
    { label: { EN: "Upload Documents", MR: "कागदपत्रे अपलोड करा" }, icon: <Upload size={18} />, href: "/farmer/dashboard/upload" },
    { label: { EN: "Grievance/Suggestions", MR: "तक्रार/सूचना" }, icon: <MessageSquare size={18} />, href: "/farmer/dashboard/grievance" },
    { label: { EN: "Bank Details Update", MR: "बँक तपशील अपडेट" }, icon: <CreditCard size={18} />, href: "/farmer/dashboard/bank" },
  ];

  const availableSchemes = [
    { id: "mechanization", label: { EN: "Agriculture Mechanization", MR: "कृषी यांत्रिकीकरण" }, icon: <Settings size={18} />, href: "/farmer/dashboard/apply/mechanization" },
    { id: "micro-irrigation", label: { EN: "Micro-irrigation (PMKSY)", MR: "ठिबक सिंचन (PMKSY)" }, icon: <CreditCard size={18} />, href: "/farmer/dashboard/apply/micro-irrigation" },
    { id: "ambedkar-yojana", label: { EN: "Ambedkar Krushi Yojana", MR: "आंबेडकर कृषी योजना" }, icon: <User size={18} />, href: "/farmer/dashboard/apply/ambedkar-yojana" },
    { id: "phalbaag", label: { EN: "Phalbaag Lagvad Yojana", MR: "फळबाग लागवड योजना" }, icon: <FileText size={18} />, href: "/farmer/dashboard/apply/phalbaag" },
    { id: "farm-pond", label: { EN: "Individual Farm Pond", MR: "वैयक्तिक शेततळे" }, icon: <Map size={18} />, href: "/farmer/dashboard/apply/farm-pond" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* 1. PERSISTENT RED BANNER */}
      <div className="bg-[#B91C1C] text-white py-1 px-4 text-center text-[10px] md:text-xs font-bold tracking-wider z-[10000] fixed top-0 w-full shadow-md">
        DEMO ENVIRONMENT ONLY - FOR PRAGATI AI HACKATHON TESTING. NOT AN OFFICIAL GOVERNMENT WEBSITE.
      </div>

      {/* 2. MAIN HEADER (Deep Blue & Green) */}
      <header className="fixed top-[24px] md:top-[32px] w-full z-[9999] shadow-sm">
        <div className="flex h-12 md:h-14">
          {/* Left Blue Section */}
          <div className="bg-[#002D62] text-white px-4 md:px-8 flex items-center justify-center font-bold text-xs md:text-sm whitespace-nowrap">
            How to <br className="hidden md:block" /> Apply Online ?
          </div>
          
          {/* Green Chevron Section */}
          <div className="flex-1 bg-[#87CF3E] flex items-center relative overflow-hidden">
            {/* Chevron Shape (Simulated with clip-path or absolute elements) */}
            <div className="absolute left-0 h-full w-4 md:w-8 bg-[#002D62]" style={{ clipPath: 'polygon(0 0, 100% 50%, 0 100%)' }}></div>
            
            <div className="flex items-center gap-4 px-6 md:px-12 w-full justify-between">
              <div className="flex items-center gap-2 md:gap-4">
                <div className="bg-white/20 p-1 rounded-full text-white cursor-pointer hover:bg-white/30">
                  <ChevronLeft size={16} />
                </div>
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="h-8 w-8 md:h-10 md:w-10 bg-white rounded-full flex items-center justify-center border-2 border-white shadow-sm overflow-hidden">
                     <img src="https://ui-avatars.com/api/?name=Farmer+User&background=1B4332&color=fff" alt="User" className="h-full w-full object-cover" />
                  </div>
                  <span className="text-white font-bold text-xs md:text-sm hidden sm:block">Farmer Schemes</span>
                </div>
                <div className="bg-white/20 p-1 rounded-full text-white cursor-pointer hover:bg-white/30">
                  <ChevronRight size={16} />
                </div>
              </div>

              <div className="flex items-center gap-3 md:gap-6">
                <div className="text-white cursor-pointer hover:opacity-80">
                  <Settings size={18} />
                </div>
                <Link href="/farmer" className="text-white flex items-center gap-1 font-bold text-xs hover:opacity-80">
                  <LogOut size={16} />
                  <span className="hidden md:inline">Logout</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 pt-[72px] md:pt-[88px]">
        {/* 3. SIDEBAR */}
        <aside 
          className={`fixed md:sticky top-[72px] md:top-[88px] h-[calc(100vh-72px)] md:h-[calc(100vh-88px)] bg-white border-r border-gray-200 transition-all duration-300 z-50
            ${isSidebarOpen ? "w-64" : "w-0 md:w-16 overflow-hidden md:overflow-visible"}`}
        >
          <nav className="p-3 flex flex-col gap-1 overflow-y-auto no-scrollbar">
            <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              {lang === "EN" ? "Main Menu" : "मुख्य मेनू"}
            </div>
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.label.EN}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded text-[13px] font-medium transition-all border border-transparent
                    ${isActive 
                      ? "bg-white border-gray-100 shadow-sm text-gray-900 font-bold" 
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}
                >
                  <span className={`${isActive ? "text-[#1B4332]" : "text-gray-400"}`}>
                    {item.icon}
                  </span>
                  {(isSidebarOpen || !isActive) && <span className="truncate">{item.label[lang]}</span>}
                </Link>
              );
            })}

            <div className="mt-6 px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              {lang === "EN" ? "Available Schemes" : "उपलब्ध योजना"}
            </div>
            {availableSchemes.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded text-[13px] font-medium transition-all border border-transparent
                    ${isActive 
                      ? "bg-white border-gray-100 shadow-sm text-gray-900 font-bold" 
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}
                >
                  <span className={`${isActive ? "text-[#D97706]" : "text-gray-400"}`}>
                    {item.icon}
                  </span>
                  {(isSidebarOpen || !isActive) && <span className="truncate">{item.label[lang]}</span>}
                </Link>
              );
            })}
          </nav>
          
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="absolute -right-3 top-4 h-6 w-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm z-50 md:hidden"
          >
            {isSidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>
        </aside>

        {/* 4. MAIN CONTENT AREA */}
        <main className="flex-1 p-4 md:p-8 bg-white min-h-[calc(100vh-88px)]">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
