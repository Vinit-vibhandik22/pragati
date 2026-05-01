"use client";

import React, { useState } from "react";
import { LogIn, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function BankDetailsPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [accountNo, setAccountNo] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [history, setHistory] = useState<any[]>([]);

  const handleSave = () => {
    if (!accountNo || !ifsc) {
      toast.error("Please fill all mandatory fields");
      return;
    }

    setIsSaving(true);
    
    // Simulate API delay
    setTimeout(() => {
      const newEntry = {
        date: new Date().toLocaleDateString('en-GB'),
        status: "Updated Successfully",
        remarks: `Acc: ****${accountNo.slice(-4)}`
      };
      
      setHistory([newEntry, ...history]);
      setIsSaving(false);
      setAccountNo("");
      setIfsc("");
      toast.success("Bank details updated successfully!");
    }, 1500);
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Page Header */}
      <div className="flex items-center gap-2 border-b border-[#1B4332] pb-2 mb-6">
        <LogIn className="rotate-180" size={24} />
        <h2 className="text-2xl font-bold text-gray-800">Add/Update Bank Account Details</h2>
      </div>

      {/* Form Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        <div className="flex flex-col gap-1">
          <label className="text-[13px] font-bold text-[#1B4332]">Bank Account No. <span className="text-red-500">*</span></label>
          <input 
            type="text" 
            value={accountNo}
            onChange={(e) => setAccountNo(e.target.value)}
            placeholder="Enter Account Number"
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332] outline-none text-sm transition-all"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[13px] font-bold text-[#1B4332]">IFSC Code <span className="text-red-500">*</span></label>
          <input 
            type="text" 
            value={ifsc}
            onChange={(e) => setIfsc(e.target.value)}
            placeholder="e.g. SBIN0001234"
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded focus:border-[#1B4332] focus:ring-1 focus:ring-[#1B4332] outline-none text-sm transition-all uppercase"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[13px] font-bold text-[#1B4332]">Bank Branch Name <span className="text-red-500">*</span></label>
          <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded text-sm text-gray-500 h-[38px] flex items-center">
            {ifsc.length >= 4 ? "STATE BANK OF INDIA - MAIN BRANCH" : "Auto-filled from IFSC"}
          </div>
        </div>
      </div>

      <div className="flex justify-center mt-4">
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-[#5CB85C] text-white font-bold px-8 py-2 rounded shadow-sm hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-70"
        >
          {isSaving ? <Loader2 className="animate-spin" size={18} /> : null}
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>

      {/* History Section */}
      <div className="mt-8">
        <div className="bg-[#FEF9E7] border border-[#F9E79F] p-2 text-sm font-bold text-gray-800">
          Bank Details Update History
        </div>
        <div className="border border-gray-200 border-t-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-gray-400 italic">
                    No update history found.
                  </td>
                </tr>
              ) : (
                history.map((entry, idx) => (
                  <tr key={idx} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3">{entry.date}</td>
                    <td className="px-4 py-3 text-green-600 font-medium">{entry.status}</td>
                    <td className="px-4 py-3 text-gray-500">{entry.remarks}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
