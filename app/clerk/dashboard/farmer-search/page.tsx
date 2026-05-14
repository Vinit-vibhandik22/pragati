"use client";

import React, { useState } from "react";
import { Search, Loader2, User, FileText, Calendar, CheckCircle, AlertTriangle } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";

// Use Supabase client (read-only for search)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function FarmerSearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [farmerProfile, setFarmerProfile] = useState<any>(null);
  const [farmerApps, setFarmerApps] = useState<any[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setFarmerProfile(null);
    setFarmerApps([]);

    try {
      const isAadhaar = /^\d{12}$/.test(searchQuery);

      let query = supabase.from("farmer_profiles").select("*");
      if (isAadhaar) {
        query = query.eq("aadhaar_number", searchQuery);
      } else {
        query = query.eq("farmer_id", searchQuery);
      }

      const { data: profile, error } = await query.single();

      if (error || !profile) {
        toast.error("Farmer not found");
        setIsSearching(false);
        return;
      }

      setFarmerProfile(profile);

      // Fetch Applications using farmer_id
      const { data: apps } = await supabase
        .from("farmer_applications")
        .select("*")
        .eq("farmer_id", profile.farmer_id)
        .order("submitted_at", { ascending: false });

      if (apps) {
        setFarmerApps(apps);
      }

    } catch (err) {
      console.error(err);
      toast.error("Error searching for farmer");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <User className="text-emerald-600" size={28} />
          Farmer 360° View
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Search for a farmer by their unique 12-digit Farmer ID or Aadhaar Number to view their complete profile, documents, and application history.
        </p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="text-slate-400" size={20} />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 text-sm font-medium"
            placeholder="Enter Farmer ID or 12-digit Aadhaar Number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={isSearching || !searchQuery.trim()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {isSearching ? <Loader2 className="animate-spin" size={18} /> : "Search"}
        </button>
      </form>

      {/* Results */}
      {farmerProfile && (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Profile Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row">
            <div className="bg-slate-900 text-white p-6 md:w-1/3 flex flex-col justify-center items-center text-center">
              <div className="w-20 h-20 bg-emerald-500/20 border-2 border-emerald-500 rounded-full flex items-center justify-center mb-4">
                <User size={40} className="text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold">{farmerProfile.farmer_name}</h2>
              <p className="text-emerald-400 font-mono mt-2 tracking-wider">{farmerProfile.farmer_id}</p>
            </div>
            <div className="p-6 md:w-2/3 grid grid-cols-2 gap-6">
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase">Aadhaar Number</span>
                <span className="text-slate-800 font-medium">{"XXXX XXXX " + farmerProfile.aadhaar_number.slice(-4)}</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase">Phone</span>
                <span className="text-slate-800 font-medium">{farmerProfile.phone || "Not provided"}</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase">Caste Category</span>
                <span className="text-slate-800 font-medium">{farmerProfile.profile_data?.caste || "Unknown"}</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase">Land Holding</span>
                <span className="text-slate-800 font-medium">{farmerProfile.profile_data?.landSizeHectares ? `${farmerProfile.profile_data.landSizeHectares} Ha` : "Unknown"}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Uploaded Documents */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-200 bg-slate-50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <FileText size={18} className="text-blue-600" />
                  Document Locker
                </h3>
              </div>
              <div className="p-4 flex-1">
                {Object.keys(farmerProfile.documents || {}).length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    No documents uploaded by this farmer.
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {Object.entries(farmerProfile.documents).map(([docName, url]) => (
                      <li key={docName} className="flex items-center justify-between p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
                        <span className="text-sm font-medium text-slate-700">{docName}</span>
                        <a href={url as string} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 hover:underline bg-white px-3 py-1 rounded border shadow-sm">
                          View
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Application History */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-200 bg-slate-50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Calendar size={18} className="text-purple-600" />
                  Application History
                </h3>
              </div>
              <div className="p-0 flex-1 overflow-y-auto max-h-80">
                {farmerApps.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-sm">
                    No scheme applications found.
                  </div>
                ) : (
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="p-3 text-xs font-bold text-slate-500 uppercase">Scheme</th>
                        <th className="p-3 text-xs font-bold text-slate-500 uppercase">Date</th>
                        <th className="p-3 text-xs font-bold text-slate-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {farmerApps.map((app) => (
                        <tr key={app.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="p-3 font-medium text-slate-800">{app.scheme_name}</td>
                          <td className="p-3 text-slate-500">{new Date(app.submitted_at).toLocaleDateString()}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              app.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                              app.status === 'Action_Required' || app.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {app.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
