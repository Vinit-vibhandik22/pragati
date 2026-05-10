"use client";

import React from "react";
import { FileText, ChevronRight, Lock } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SchemesPage() {
  const router = useRouter();

  const schemes = [
    { name: "Dr. Babasaheb Ambedkar Krushi Swavalamban Yojana", active: true, id: "ambedkar-yojana" },
    { name: "Pradhan Mantri Krishi Sinchayee Yojana - Per Drop More Crop (Micro-irrigation Component)", active: false },
    { name: "Sub-mission on Farm Mechanization", active: false },
    { name: "National Food Security Mission: Food grains, Oil seeds, Sugarcane and Cotton", active: false },
    { name: "Birsa Munda Krishi Kranti Yojana (Tribal Sub Plan / Outside Tribal Sub Plan)", active: false },
    { name: "Mission for Integrated Development of Horticulture", active: false },
    { name: "Rainfed Area Development Programme", active: false },
    { name: "Bhausaheb Fundkar Phalbaag Lagvad Yojana", active: false },
    { name: "Rashtriya Krushi Vikas Yojana - RAFTAAR", active: false },
    { name: "State Agriculture Mechanization Scheme", active: false },
    { name: "Chief Minister Sustainable Agriculture Irrigation Scheme", active: false },
    { name: "Chief Minister Sustainable Agriculture Irrigation Scheme – Individual Farm Pond", active: false },
    { name: "RKVY Plastic Lining to Farm Pond", active: false },
    { name: "Dr. Shyamaprasad Mukherjee Jan-Van Vikas Scheme", active: false },
    { name: "PMRKVY-Rainfed Area Development", active: false },
    { name: "Gopinath Munde Shetkari Apghat Suraksha Sanugrah Anudan Yojana", active: false },
    { name: "Kaju Kalam Vatap Yojana", active: false }
  ];

  const handleSchemeClick = (scheme: any) => {
    if (scheme.active && scheme.id) {
      router.push(`/farmer/dashboard/apply/${scheme.id}`);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="border-b border-[#1B4332] pb-1">
        <h2 className="text-2xl font-bold text-gray-800">Benefit Schemes</h2>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-100 px-4 py-3 font-bold text-[#1B4332] text-sm">
          Farmer Schemes
        </div>
        <div className="flex flex-col">
          {schemes.map((scheme, index) => (
            <div 
              key={index} 
              onClick={() => handleSchemeClick(scheme)}
              className={`flex items-center gap-4 px-4 py-4 border-b border-gray-100 transition-colors group ${
                scheme.active 
                  ? "hover:bg-emerald-50 cursor-pointer" 
                  : "bg-gray-50/50 cursor-not-allowed opacity-60"
              }`}
            >
              <div className={`p-2 rounded ${scheme.active ? 'bg-orange-50 text-[#fe932c]' : 'bg-gray-200 text-gray-400'}`}>
                {scheme.active ? <FileText size={18} /> : <Lock size={18} />}
              </div>
              <span className={`text-[13px] font-medium flex-1 ${scheme.active ? 'text-sky-700 group-hover:text-sky-800 font-bold' : 'text-gray-500'}`}>
                {scheme.name}
              </span>
              {scheme.active && (
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold mr-2">Demo Active</span>
              )}
              <ChevronRight size={16} className={scheme.active ? "text-gray-300 group-hover:text-[#1B4332]" : "text-gray-300"} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
