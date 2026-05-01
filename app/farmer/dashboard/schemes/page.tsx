"use client";

import React from "react";
import { FileText, ChevronRight } from "lucide-react";

export default function SchemesPage() {
  const schemes = [
    "Pradhan Mantri Krishi Sinchayee Yojana - Per Drop More Crop (Micro-irrigation Component)",
    "Sub-mission on Farm Mechanization",
    "National Food Security Mission: Food grains, Oil seeds, Sugarcane and Cotton",
    "Birsa Munda Krishi Kranti Yojana (Tribal Sub Plan / Outside Tribal Sub Plan)",
    "Dr. Babasaheb Ambedkar Krushi Swavalamban Yojana",
    "Mission for Integrated Development of Horticulture",
    "Rainfed Area Development Programme",
    "Bhausaheb Fundkar Phalbaag Lagvad Yojana",
    "Rashtriya Krushi Vikas Yojana - RAFTAAR",
    "State Agriculture Mechanization Scheme",
    "Chief Minister Sustainable Agriculture Irrigation Scheme",
    "Chief Minister Sustainable Agriculture Irrigation Scheme – Individual Farm Pond",
    "RKVY Plastic Lining to Farm Pond",
    "Dr. Shyamaprasad Mukherjee Jan-Van Vikas Scheme",
    "PMRKVY-Rainfed Area Development",
    "Gopinath Munde Shetkari Apghat Suraksha Sanugrah Anudan Yojana",
    "Kaju Kalam Vatap Yojana"
  ];

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
              className="flex items-center gap-4 px-4 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer group"
            >
              <div className="bg-orange-50 p-2 rounded text-[#fe932c]">
                <FileText size={18} />
              </div>
              <span className="text-[13px] text-sky-700 font-medium flex-1 group-hover:text-sky-800">
                {scheme}
              </span>
              <ChevronRight size={16} className="text-gray-300 group-hover:text-[#1B4332]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
