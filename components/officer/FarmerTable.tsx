"use client"

import React, { useState, useMemo } from 'react'
import { 
  Search, 
  Filter, 
  MoreVertical, 
  Eye, 
  XCircle, 
  AlertCircle,
  X,
  ChevronDown
} from 'lucide-react'

// --- Types ---
export interface FarmerRecord {
  farmer_id: number;
  full_name: string;
  age: number;
  category: "General" | "OBC" | "SC" | "ST" | "VJNT" | string;
  guardian_name: string;
  guardian_relation: string;
  aadhaar_number: string;
  mobile_number: string;
  survey_hissa_no: string;
  land_type: "Bagayat" | "Jirayat" | string;
  cultivation_status: string;
  encumbrances: string;
  bank_account_no: string;
  bank_ifsc: string;
  ration_card_no: string;
  occupation: string;
}

// --- Mock Data ---
const mockFarmers: FarmerRecord[] = [
  { farmer_id: 1, full_name: "Rajesh Ganpat Deshmukh", age: 52, category: "General", guardian_name: "Ganpat", guardian_relation: "Father", aadhaar_number: "XXXX", mobile_number: "9822012345", survey_hissa_no: "102/A", land_type: "Bagayat", cultivation_status: "Sugarcane (2.5 Ha)", encumbrances: "SBI Crop Loan ₹1,50,000", bank_account_no: "X", bank_ifsc: "X", ration_card_no: "X", occupation: "Self" },
  { farmer_id: 2, full_name: "Sunita Vitthal Patil", age: 48, category: "OBC", guardian_name: "Vitthal", guardian_relation: "Husband", aadhaar_number: "XXXX", mobile_number: "9422054321", survey_hissa_no: "88/3", land_type: "Jirayat", cultivation_status: "Soyabean (2.1 Ha)", encumbrances: "None", bank_account_no: "X", bank_ifsc: "X", ration_card_no: "X", occupation: "Self" },
  { farmer_id: 3, full_name: "Amol Suresh More", age: 29, category: "SC", guardian_name: "Suresh", guardian_relation: "Father", aadhaar_number: "XXXX", mobile_number: "8805098765", survey_hissa_no: "145", land_type: "Jirayat", cultivation_status: "Jowar (1.8 Ha)", encumbrances: "None", bank_account_no: "X", bank_ifsc: "X", ration_card_no: "X", occupation: "Self" },
  { farmer_id: 7, full_name: "Sanjay Maruti Pawar", age: 55, category: "VJNT", guardian_name: "Maruti", guardian_relation: "Father", aadhaar_number: "XXXX", mobile_number: "9890044556", survey_hissa_no: "92", land_type: "Bagayat", cultivation_status: "Pomegranate (5.3 Ha)", encumbrances: "HDFC Agri Loan ₹5,00,000", bank_account_no: "X", bank_ifsc: "X", ration_card_no: "X", occupation: "Self" }
];

export default function FarmerTable() {
  // --- State ---
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [landTypeFilter, setLandTypeFilter] = useState('All')
  const [selectedFarmer, setSelectedFarmer] = useState<FarmerRecord | null>(null)
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null)

  // --- Filtering Logic ---
  const filteredRecords = useMemo(() => {
    return mockFarmers.filter(record => {
      const matchesSearch = record.full_name.toLowerCase().includes(search.toLowerCase()) || 
                            record.survey_hissa_no.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === 'All' || record.category === categoryFilter;
      const matchesLandType = landTypeFilter === 'All' || record.land_type === landTypeFilter;
      
      return matchesSearch && matchesCategory && matchesLandType;
    })
  }, [search, categoryFilter, landTypeFilter])

  // --- Handlers ---
  const handleReject = (farmer: FarmerRecord) => {
    setSelectedFarmer(farmer)
    setIsRejectModalOpen(true)
    setActiveMenuId(null)
  }

  const submitRejection = () => {
    console.log(`REJECTED: Farmer ID ${selectedFarmer?.farmer_id} for reason: ${rejectionReason}`)
    setIsRejectModalOpen(false)
    setRejectionReason('')
    setSelectedFarmer(null)
  }

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      {/* --- Header & Search/Filters --- */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by name or survey number..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-700 font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select 
              className="outline-none bg-transparent text-sm font-bold text-slate-600 cursor-pointer pr-2"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="All">All Categories</option>
              <option value="General">General</option>
              <option value="OBC">OBC</option>
              <option value="SC">SC</option>
              <option value="VJNT">VJNT</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select 
              className="outline-none bg-transparent text-sm font-bold text-slate-600 cursor-pointer pr-2"
              value={landTypeFilter}
              onChange={(e) => setLandTypeFilter(e.target.value)}
            >
              <option value="All">All Land Types</option>
              <option value="Bagayat">Bagayat</option>
              <option value="Jirayat">Jirayat</option>
            </select>
          </div>
        </div>
      </div>

      {/* --- Table Section --- */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">ID</th>
              <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Farmer Name</th>
              <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Category</th>
              <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Survey No.</th>
              <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Land Type</th>
              <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Cultivation</th>
              <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Encumbrances</th>
              <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRecords.map((record) => (
              <tr key={record.farmer_id} className="hover:bg-emerald-50/30 transition-colors group">
                <td className="px-6 py-4">
                  <span className="font-mono text-xs font-bold text-slate-400">#{record.farmer_id.toString().padStart(3, '0')}</span>
                </td>
                <td className="px-6 py-4">
                  <div>
                    <p className="font-black text-slate-900 leading-none">{record.full_name}</p>
                    <p className="text-xs text-slate-500 mt-1 font-bold">{record.mobile_number}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                    record.category === 'General' ? 'bg-blue-100 text-blue-700' :
                    record.category === 'OBC' ? 'bg-purple-100 text-purple-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {record.category}
                  </span>
                </td>
                <td className="px-6 py-4 font-bold text-slate-600">{record.survey_hissa_no}</td>
                <td className="px-6 py-4">
                  <span className={`flex items-center gap-1.5 font-bold text-sm ${
                    record.land_type === 'Bagayat' ? 'text-emerald-700' : 'text-amber-700'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      record.land_type === 'Bagayat' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`} />
                    {record.land_type}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm font-bold text-slate-700">{record.cultivation_status}</p>
                </td>
                <td className="px-6 py-4">
                  {record.encumbrances !== "None" ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-100 rounded-xl text-red-700">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-xs font-black">{record.encumbrances}</span>
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-slate-400">No Dues</span>
                  )}
                </td>
                <td className="px-6 py-4 text-center relative">
                  <button 
                    onClick={() => setActiveMenuId(activeMenuId === record.farmer_id ? null : record.farmer_id)}
                    className="p-2 hover:bg-slate-200 rounded-lg transition-colors inline-block"
                  >
                    <MoreVertical className="w-5 h-5 text-slate-500" />
                  </button>

                  {/* --- Floating Action Menu --- */}
                  {activeMenuId === record.farmer_id && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setActiveMenuId(null)} />
                      <div className="absolute right-12 top-10 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <button 
                          onClick={() => { console.log('Viewing details for:', record.farmer_id); setActiveMenuId(null); }}
                          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 text-slate-700 font-bold transition-colors"
                        >
                          <Eye className="w-4 h-4 text-emerald-600" />
                          View Full Details
                        </button>
                        <button 
                          onClick={() => handleReject(record)}
                          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-50 text-red-600 font-bold border-t border-slate-100 transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject Application
                        </button>
                      </div>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredRecords.length === 0 && (
          <div className="p-20 text-center">
            <p className="text-slate-400 font-bold text-lg">No records matching your search or filters.</p>
          </div>
        )}
      </div>

      {/* --- Footer Statistics --- */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center px-8">
        <p className="text-sm font-bold text-slate-500">Showing <span className="text-slate-900">{filteredRecords.length}</span> of <span className="text-slate-900">{mockFarmers.length}</span> verified records</p>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-400 cursor-not-allowed">Previous</button>
          <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-900 hover:bg-slate-50">Next</button>
        </div>
      </div>

      {/* --- REJECTION MODAL --- */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl border-4 border-slate-200 overflow-hidden">
             <div className="p-8 bg-red-600 text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                   <AlertCircle className="w-8 h-8" />
                   <h3 className="text-2xl font-black uppercase tracking-tight">Reject Application</h3>
                </div>
                <button onClick={() => setIsRejectModalOpen(false)} className="hover:bg-white/20 p-2 rounded-full"><X className="w-8 h-8" /></button>
             </div>
             
             <div className="p-10 space-y-6">
                <div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Farmer Being Rejected</p>
                  <p className="text-xl font-black text-slate-900">{selectedFarmer?.full_name}</p>
                </div>

                <div className="space-y-3">
                   <label className="text-base font-black text-slate-900">Reason for Rejection (Required)</label>
                   <textarea 
                     value={rejectionReason}
                     onChange={(e) => setRejectionReason(e.target.value)}
                     rows={5}
                     placeholder="State the exact reason (e.g., Invalid document, land size mismatch)..."
                     className="w-full p-6 bg-slate-50 border-2 border-slate-200 rounded-3xl text-lg outline-none focus:border-red-600 transition-all resize-none font-medium"
                   />
                </div>

                <div className="flex gap-4 pt-4">
                   <button 
                    onClick={() => setIsRejectModalOpen(false)}
                    className="flex-1 py-4 bg-white border-2 border-slate-200 rounded-2xl font-black text-slate-700 hover:bg-slate-50 transition-all"
                   >
                     Cancel
                   </button>
                   <button 
                    disabled={!rejectionReason.trim()}
                    onClick={submitRejection}
                    className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black shadow-xl shadow-red-200 hover:bg-red-700 disabled:opacity-50 transition-all"
                   >
                     Submit Rejection
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  )
}
