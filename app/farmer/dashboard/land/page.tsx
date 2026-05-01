"use client";

import React, { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function LandDetailsPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [district, setDistrict] = useState("-- Select District --");
  const [taluka, setTaluka] = useState("-- Select Taluka --");
  const [village, setVillage] = useState("-- Select village --");
  const [khataNo, setKhataNo] = useState("");
  const [surveyNo, setSurveyNo] = useState("");
  const [records, setRecords] = useState<any[]>([]);

  const handleSave = () => {
    if (district === "-- Select District --" || !khataNo || !surveyNo) {
      toast.error("Please fill all mandatory fields (District, Khata No, Survey No)");
      return;
    }

    setIsSaving(true);
    
    // Simulate delay
    setTimeout(() => {
      const newRecord = {
        id: Date.now(),
        district,
        taluka,
        village,
        khataNo,
        area: "1.25",
        surveyNo,
        individual: "0.75",
        joint: "0.50"
      };

      setRecords([newRecord, ...records]);
      setIsSaving(false);
      
      // Reset some fields
      setKhataNo("");
      setSurveyNo("");
      toast.success("Land record added successfully!");
    }, 1200);
  };

  const deleteRecord = (id: number) => {
    setRecords(records.filter(r => r.id !== id));
    toast.info("Record removed");
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="border-b border-[#1B4332] pb-1">
        <h2 className="text-2xl font-bold text-gray-800">Land Information Details</h2>
      </div>

      {/* Multiple Villages Radio */}
      <div className="flex flex-col gap-3">
        <label className="text-sm font-bold text-gray-700">Do you have land in multiple villages? <span className="text-red-500">*</span></label>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input type="radio" name="multiple_villages" className="w-5 h-5 accent-[#1B4332]" />
            <span className="text-sm font-medium">Yes</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer group">
            <input type="radio" name="multiple_villages" className="w-5 h-5 accent-[#1B4332]" defaultChecked />
            <span className="text-sm font-medium">No</span>
          </label>
        </div>
      </div>

      {/* Location Selects */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex flex-col gap-1">
          <label className="text-[13px] font-bold text-gray-700">District <span className="text-red-500">*</span></label>
          <select 
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded outline-none focus:border-[#1B4332] text-[13px] text-gray-600 bg-white"
          >
            {["-- Select District --", "Ahmednagar", "Akola", "Amravati", "Aurangabad", "Beed"].map(opt => <option key={opt}>{opt}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[13px] font-bold text-gray-700">Taluka <span className="text-red-500">*</span></label>
          <select 
            value={taluka}
            onChange={(e) => setTaluka(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded outline-none focus:border-[#1B4332] text-[13px] text-gray-600 bg-white"
          >
            {["-- Select Taluka --", "Paithan", "Gangapur", "Vaijapur", "Kannad"].map(opt => <option key={opt}>{opt}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[13px] font-bold text-gray-700">Village / City <span className="text-red-500">*</span></label>
          <select 
            value={village}
            onChange={(e) => setVillage(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded outline-none focus:border-[#1B4332] text-[13px] text-gray-600 bg-white"
          >
            {["-- Select village --", "Sample Village 1", "Sample Village 2"].map(opt => <option key={opt}>{opt}</option>)}
          </select>
        </div>
      </div>

      {/* 8A Khata Details */}
      <section>
        <div className="bg-[#87CF3E] text-white px-4 py-1 font-bold text-sm mb-4 rounded-sm">
          8A Khata Details (For Above Village)
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-[13px] font-bold text-gray-700">8A Khata Number <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              value={khataNo}
              onChange={(e) => setKhataNo(e.target.value)}
              placeholder="Enter Khata Number"
              className="px-3 py-2 border border-gray-300 rounded outline-none focus:border-[#1B4332] text-sm" 
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[13px] font-bold text-gray-700">Area of Agricultural Land (Hectare and R) <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              <input type="text" defaultValue="0" className="w-24 px-3 py-2 border border-gray-300 rounded outline-none text-sm text-center" />
              <input type="text" defaultValue="0" className="w-24 px-3 py-2 border border-gray-300 rounded outline-none text-sm text-center" />
            </div>
          </div>
        </div>
      </section>

      {/* 7/12 Details */}
      <section>
        <div className="bg-[#87CF3E] text-white px-4 py-1 font-bold text-sm mb-4 rounded-sm">
          7/12 Details
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col gap-1">
            <label className="text-[13px] font-bold text-gray-700">Survey Number / Gat Number <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              value={surveyNo}
              onChange={(e) => setSurveyNo(e.target.value)}
              placeholder="Enter Survey No."
              className="px-3 py-2 border border-gray-300 rounded outline-none text-sm focus:border-[#1B4332]" 
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[13px] font-bold text-gray-700">Individual Ownership(Hectare and R) <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              <input type="text" defaultValue="0" className="w-full px-3 py-2 border border-gray-300 rounded outline-none text-sm text-center" />
              <input type="text" defaultValue="0" className="w-full px-3 py-2 border border-gray-300 rounded outline-none text-sm text-center" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[13px] font-bold text-gray-700">Joint Ownership(Hectare and R) <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              <input type="text" defaultValue="0" className="w-full px-3 py-2 border border-gray-300 rounded outline-none text-sm text-center" />
              <input type="text" defaultValue="0" className="w-full px-3 py-2 border border-gray-300 rounded outline-none text-sm text-center" />
            </div>
          </div>
        </div>
      </section>

      <div className="flex justify-center mt-2">
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-[#5CB85C] text-white font-bold px-12 py-2 rounded shadow-sm hover:opacity-90 transition-all flex items-center gap-2"
        >
          {isSaving ? <Loader2 className="animate-spin" size={18} /> : null}
          {isSaving ? "Saving..." : "Save Record"}
        </button>
      </div>

      {/* Summary Table */}
      <div className="mt-4 overflow-x-auto border border-gray-200 rounded">
        <table className="w-full border-collapse text-[10px] uppercase font-bold text-gray-700">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {["Action", "District", "Taluka", "Village / City", "8A Khata Number", "Area (H/R)", "Survey No", "Indiv. Own", "Joint Own"].map(head => (
                <th key={head} className="border-r border-gray-200 last:border-0 px-2 py-3 text-center">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-gray-400 normal-case italic font-normal">
                  No land records added yet. Please fill the form above and click 'Save Record'.
                </td>
              </tr>
            ) : (
              records.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-2 py-3 text-center">
                    <button onClick={() => deleteRecord(r.id)} className="text-red-500 hover:text-red-700">
                      <Trash2 size={14} />
                    </button>
                  </td>
                  <td className="px-2 py-3 text-center">{r.district}</td>
                  <td className="px-2 py-3 text-center">{r.taluka}</td>
                  <td className="px-2 py-3 text-center">{r.village}</td>
                  <td className="px-2 py-3 text-center">{r.khataNo}</td>
                  <td className="px-2 py-3 text-center">{r.area}</td>
                  <td className="px-2 py-3 text-center">{r.surveyNo}</td>
                  <td className="px-2 py-3 text-center">{r.individual}</td>
                  <td className="px-2 py-3 text-center">{r.joint}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
