'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { useDropzone } from 'react-dropzone'
import { 
  ShieldCheck, FileUp, UserCheck, MessageSquare, 
  FileText, AlertTriangle, CheckCircle, Clock,
  Upload, Loader2, Search, ClipboardCheck, FileText as FileIcon, Bot
} from 'lucide-react'
import { MAHARASHTRA_DATA } from '@/lib/talukas'

export default function ClerkDashboard() {
  const [activeTab, setActiveTab] = useState<'intake' | 'eligibility' | 'grievance'>('intake')
  const [isAiBatchProcessing, setIsAiBatchProcessing] = useState(false)
  
  // Intake State
  const [isClassifying, setIsClassifying] = useState(false)
  const [classificationResult, setClassificationResult] = useState<any>(null)
  const [farmerData, setFarmerData] = useState({
    name: '',
    aadhaar: '',
    district: 'Pune',
    taluka: 'Haveli'
  })

  // Eligibility State
  const [profileData, setProfileData] = useState({
    name: '',
    district: 'Pune',
    taluka: 'Haveli',
    landSize: 2.5,
    primaryCrop: 'Sugar Cane',
    category: 'General'
  })
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(false)
  const [eligibilityResult, setEligibilityResult] = useState<any>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return
    
    if (!farmerData.name || !farmerData.aadhaar) {
      toast.error('Please enter Farmer Name and Aadhaar (Last 4) first.')
      return
    }

    const file = acceptedFiles[0]
    const formData = new FormData()
    formData.append('file', file)
    formData.append('farmerName', farmerData.name)
    formData.append('aadhaarLast4', farmerData.aadhaar)
    formData.append('taluka', farmerData.taluka)
    formData.append('district', 'Pune')

    setIsClassifying(true)
    setClassificationResult(null)

    try {
      const response = await fetch('/api/classify-document', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Classification failed')

      setClassificationResult(data)
      toast.success('Document classified successfully!')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsClassifying(false)
    }
  }, [farmerData])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: {'image/*': [], 'application/pdf': []}, 
    maxFiles: 1 
  })

  const checkEligibility = async () => {
    if (!profileData.name) {
      toast.error('Please enter Farmer Name.')
      return
    }

    setIsCheckingEligibility(true)
    setEligibilityResult(null)

    try {
      const response = await fetch('/api/check-eligibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Eligibility check failed')

      setEligibilityResult(data)
      toast.success('Eligibility check complete!')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsCheckingEligibility(false)
    }
  }

  const [isRegisteringGrievance, setIsRegisteringGrievance] = useState(false)
  const [grievanceResult, setGrievanceResult] = useState<any>(null)

  // Grievance State
  const [grievanceData, setGrievanceData] = useState({
    farmer_name: '',
    aadhaar_last4: '',
    district: 'Pune',
    taluka: 'Haveli',
    complaint_text: ''
  })

  const registerGrievance = async () => {
    if (!grievanceData.farmer_name || !grievanceData.complaint_text) {
      toast.error('Please enter Farmer Name and Complaint details.')
      return
    }

    setIsRegisteringGrievance(true)
    setGrievanceResult(null)

    try {
      const response = await fetch('/api/grievances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(grievanceData),
      })

      const data = await response.json()

      if (!response.ok) throw new Error(data.error || 'Failed to register grievance')

      setGrievanceResult(data)
      toast.success('Grievance registered successfully!')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsRegisteringGrievance(false)
    }
  }

  const handleTriggerAIBatch = async () => {
    setIsAiBatchProcessing(true)
    try {
      const res = await fetch('/api/run-ai-batch', { method: 'POST' })
      if (!res.ok && res.status === 405) {
        const fallbackRes = await fetch('/api/run-ai-batch')
        if (!fallbackRes.ok) throw new Error(`API returned ${fallbackRes.status}`)
      } else if (!res.ok) {
        throw new Error(`API returned ${res.status}`)
      }

      toast.success('AI Batch Processed!', {
        description: 'Pending applications have been scanned and routed.',
        icon: <Bot className="text-[#1B4332]" />
      })
    } catch (error: any) {
      toast.error('Failed to trigger AI Batch: ' + error.message)
    } finally {
      setIsAiBatchProcessing(false)
    }
  }

  return (
    <div className="flex h-screen bg-[#f8faf9]">
      {/* Sidebar */}
      <aside className="w-64 bg-[#012d1d] text-white flex flex-col">
        <div className="p-6 border-b border-[#1B4332]">
          <div className="flex items-center gap-3">
            <div className="bg-[#1B4332] p-2 rounded-lg">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <h1 className="font-bold text-lg tracking-tight">PRAGATI AI</h1>
          </div>
          <p className="text-[10px] text-[#86af99] mt-1 uppercase tracking-widest">Govt. of Maharashtra</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 mt-4">
          <button 
            onClick={() => setActiveTab('intake')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'intake' ? 'bg-[#1B4332] text-white shadow-lg' : 'text-[#86af99] hover:bg-[#1B4332]/50 hover:text-white'}`}
          >
            <FileUp className="w-5 h-5" />
            <span className="font-medium text-sm">Document Intake</span>
          </button>
          <button 
            onClick={() => setActiveTab('eligibility')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'eligibility' ? 'bg-[#1B4332] text-white shadow-lg' : 'text-[#86af99] hover:bg-[#1B4332]/50 hover:text-white'}`}
          >
            <UserCheck className="w-5 h-5" />
            <span className="font-medium text-sm">Eligibility Engine</span>
          </button>
          <button 
            onClick={() => setActiveTab('grievance')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'grievance' ? 'bg-[#1B4332] text-white shadow-lg' : 'text-[#86af99] hover:bg-[#1B4332]/50 hover:text-white'}`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="font-medium text-sm">Grievances</span>
          </button>
        </nav>

        <div className="p-6 border-t border-[#1B4332]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#2D6A4F] flex items-center justify-center text-xs font-bold">CP</div>
            <div>
              <p className="text-xs font-medium">Clerk Pune</p>
              <p className="text-[10px] text-[#86af99]">Tahsildar Office</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-[#e1e3e2] px-8 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-[#191c1c]">
            {activeTab === 'intake' && 'Document Intake & AI Classification'}
            {activeTab === 'eligibility' && 'Precision Eligibility Engine'}
            {activeTab === 'grievance' && 'Grievance Registration'}
          </h2>
          <div className="flex items-center gap-4">
             <button 
              onClick={handleTriggerAIBatch}
              disabled={isAiBatchProcessing}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#1B4332] hover:bg-[#012d1d] rounded-full shadow-sm hover:shadow-md transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isAiBatchProcessing ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Bot size={14} />
              )}
              {isAiBatchProcessing ? "Processing..." : "Run AI Batch (Demo)"}
            </button>
             <span className="text-xs text-[#717973] font-medium bg-[#f2f4f3] px-3 py-1.5 rounded-full">
              Session Active: {new Date().toLocaleDateString()}
            </span>
          </div>
        </header>

        <div className="p-8 max-w-5xl mx-auto w-full">
          {activeTab === 'intake' && (
            <div className="space-y-8">
              {/* Farmer Info Form */}
              <div className="bg-white p-6 rounded-2xl border border-[#e1e3e2] shadow-sm">
                <h3 className="text-sm font-semibold text-[#1B4332] mb-6 flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4" />
                  Farmer Profile Intake
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-[#717973] mb-1.5">Farmer Full Name</label>
                    <input 
                      type="text" 
                      value={farmerData.name}
                      onChange={(e) => setFarmerData({...farmerData, name: e.target.value})}
                      className="w-full bg-[#f8faf9] border border-[#e1e3e2] rounded-lg px-4 py-2 text-sm text-[#191c1c] focus:ring-2 focus:ring-[#1B4332] outline-none" 
                      placeholder="e.g. Ramesh K. Patil"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-[#717973] mb-1.5">Aadhaar (Last 4)</label>
                    <input 
                      type="text" 
                      maxLength={4}
                      value={farmerData.aadhaar}
                      onChange={(e) => setFarmerData({...farmerData, aadhaar: e.target.value})}
                      className="w-full bg-[#f8faf9] border border-[#e1e3e2] rounded-lg px-4 py-2 text-sm text-[#191c1c] focus:ring-2 focus:ring-[#1B4332] outline-none" 
                      placeholder="4432"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-[#717973] mb-1.5">District</label>
                    <select 
                      value={farmerData.district}
                      onChange={(e) => {
                        const dist = e.target.value;
                        setFarmerData({...farmerData, district: dist, taluka: MAHARASHTRA_DATA[dist][0]});
                      }}
                      className="w-full bg-[#f8faf9] border border-[#e1e3e2] rounded-lg px-4 py-2 text-sm text-[#191c1c] focus:ring-2 focus:ring-[#1B4332] outline-none"
                    >
                      {Object.keys(MAHARASHTRA_DATA).map(dist => (
                        <option key={dist} value={dist}>{dist}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-[#717973] mb-1.5">Taluka</label>
                    <select 
                      value={farmerData.taluka}
                      onChange={(e) => setFarmerData({...farmerData, taluka: e.target.value})}
                      className="w-full bg-[#f8faf9] border border-[#e1e3e2] rounded-lg px-4 py-2 text-sm text-[#191c1c] focus:ring-2 focus:ring-[#1B4332] outline-none"
                    >
                      {MAHARASHTRA_DATA[farmerData.district]?.map(tal => (
                        <option key={tal} value={tal}>{tal}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Upload Zone */}
              <div 
                {...getRootProps()} 
                className={`border-2 border-dashed rounded-3xl p-12 transition-all flex flex-col items-center justify-center cursor-pointer ${
                  isDragActive ? 'border-[#1B4332] bg-[#1B4332]/5' : 'border-[#e1e3e2] bg-white hover:border-[#1B4332]/50 hover:bg-[#f8faf9]'
                }`}
              >
                <input {...getInputProps()} />
                <div className="bg-[#f2f4f3] p-4 rounded-full mb-4">
                  <Upload className="w-8 h-8 text-[#1B4332]" />
                </div>
                <h4 className="text-lg font-bold text-[#191c1c]">Drag & Drop Document</h4>
                <p className="text-[#717973] text-sm mt-1">Upload PDF, JPG or PNG (Max 10MB)</p>
                <button className="mt-6 bg-[#1B4332] text-white px-6 py-2.5 rounded-xl font-medium text-sm hover:bg-[#012d1d] transition-all shadow-lg shadow-[#1B4332]/10">
                  Select File
                </button>
              </div>

              {/* Loading State */}
              {isClassifying && (
                <div className="bg-white p-12 rounded-3xl border border-[#e1e3e2] flex flex-col items-center justify-center animate-pulse">
                  <Loader2 className="w-10 h-10 text-[#1B4332] animate-spin mb-4" />
                  <p className="font-bold text-[#191c1c]">Classifying document...</p>
                  <p className="text-[#717973] text-sm mt-1">Running OCR and AI Analysis</p>
                </div>
              )}

              {/* Result Card */}
              {classificationResult && (
                <div className="bg-white rounded-3xl border border-[#e1e3e2] shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className={`p-6 flex items-center justify-between ${classificationResult.application.risk_score === 'HIGH' ? 'bg-[#ba1a1a]/5' : 'bg-[#1B4332]/5'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl ${classificationResult.application.risk_score === 'HIGH' ? 'bg-[#ba1a1a] text-white' : 'bg-[#1B4332] text-white'}`}>
                        {classificationResult.application.risk_score === 'HIGH' ? <AlertTriangle className="w-6 h-6" /> : <FileIcon className="w-6 h-6" />}
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest font-bold text-[#717973]">Classification Complete</p>
                        <h4 className="text-xl font-bold text-[#191c1c] capitalize">
                          {classificationResult.application.document_type?.replace(/_/g, ' ')}
                        </h4>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                       <span className={`px-4 py-1.5 rounded-full text-xs font-bold ${
                         classificationResult.application.risk_score === 'HIGH' ? 'bg-[#ba1a1a] text-white' : 
                         classificationResult.application.risk_score === 'MEDIUM' ? 'bg-[#F59E0B] text-white' : 
                         'bg-[#1B4332] text-white'
                       }`}>
                        {classificationResult.application.risk_score} RISK
                       </span>
                      <p className="text-[10px] text-[#717973] mt-2 font-medium">Confidence: {classificationResult.ocrConfidence.toFixed(0)}%</p>
                    </div>
                  </div>

                  <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-6">
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider font-bold text-[#717973] mb-2">Scheme Detected</label>
                        <p className="font-bold text-[#191c1c] text-lg">{classificationResult.classification.schemeName || 'General Inquiry'}</p>
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider font-bold text-[#717973] mb-2">Claimed Amount</label>
                        <p className="font-bold text-[#191c1c] text-lg">₹{classificationResult.classification.claimedAmount?.toLocaleString() || '0'}</p>
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider font-bold text-[#717973] mb-2">Target Department</label>
                        <p className="font-medium text-[#414844]">{classificationResult.classification.department}</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h5 className="text-sm font-bold text-[#191c1c]">AI Analysis Findings</h5>
                      
                      {/* New: Display Pre-Rejection Warnings (e.g. Name Mismatch) */}
                      {classificationResult.preRejectionWarnings?.length > 0 && (
                        <div className="space-y-3 mb-4">
                          {classificationResult.preRejectionWarnings.map((warning: any, i: number) => (
                            <div key={i} className="flex gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
                              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs font-bold text-amber-700">{warning.field}: Discrepancy Found</p>
                                <p className="text-[10px] text-amber-800 font-medium">{warning.issue}</p>
                                <p className="text-[9px] text-amber-600 italic mt-1">Suggested: {warning.suggestedFix}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="space-y-3">
                        {classificationResult.application.irregularity_flags?.length > 0 ? (
                          classificationResult.application.irregularity_flags.map((flag: any, i: number) => (
                            <div key={i} className="flex gap-3 p-3 bg-[#ba1a1a]/5 rounded-xl border border-[#ba1a1a]/10">
                              <AlertTriangle className="w-4 h-4 text-[#ba1a1a] shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs font-bold text-[#ba1a1a]">{flag.type}</p>
                                <p className="text-[10px] text-[#414844]">{flag.detail}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="flex gap-3 p-3 bg-[#1B4332]/5 rounded-xl border border-[#1B4332]/10">
                            <CheckCircle className="w-4 h-4 text-[#1B4332] shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-bold text-[#1B4332]">No Irregularities Detected</p>
                              <p className="text-[10px] text-[#414844]">This document appears legitimate based on local data checks.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {classificationResult.application.risk_score === 'HIGH' && (
                    <div className="bg-[#ba1a1a] p-4 flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-white" />
                      <p className="text-white text-sm font-medium">
                        <strong>CRITICAL:</strong> Multiple fraud indicators detected. This application is automatically HELD for officer review.
                      </p>
                    </div>
                  )}

                  <div className="p-6 bg-[#f8faf9] border-t border-[#e1e3e2] flex justify-end gap-4">
                    <button 
                      onClick={() => setClassificationResult(null)}
                      className="px-6 py-2.5 text-sm font-bold text-[#717973] hover:text-[#191c1c] transition-all"
                    >
                      Discard & Re-upload
                    </button>
                    <button 
                      disabled={classificationResult.application.risk_score === 'HIGH'}
                      className={`px-8 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all ${
                        classificationResult.application.risk_score === 'HIGH' 
                        ? 'bg-[#e1e3e2] text-[#717973] cursor-not-allowed shadow-none' 
                        : 'bg-[#1B4332] text-white hover:bg-[#012d1d] shadow-[#1B4332]/20'
                      }`}
                    >
                      Confirm & Submit to Queue
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'eligibility' && (
            <div className="space-y-8 animate-in fade-in duration-500">
               {/* Eligibility Form */}
               <div className="bg-white p-8 rounded-3xl border border-[#e1e3e2] shadow-sm">
                <h3 className="text-lg font-bold text-[#1B4332] mb-8 flex items-center gap-2">
                  <UserCheck className="w-5 h-5" />
                  Farmer Eligibility Profile
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-[#717973] mb-2">Farmer Full Name</label>
                    <input 
                      type="text" 
                      value={profileData.name}
                      onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                      className="w-full bg-[#f8faf9] border border-[#e1e3e2] rounded-xl px-4 py-3 text-sm text-[#191c1c] focus:ring-2 focus:ring-[#1B4332] outline-none" 
                      placeholder="Enter farmer's full name"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-[#717973] mb-2">Land Size (Acres)</label>
                    <input 
                      type="number" 
                      value={profileData.landSize}
                      onChange={(e) => setProfileData({...profileData, landSize: parseFloat(e.target.value)})}
                      className="w-full bg-[#f8faf9] border border-[#e1e3e2] rounded-xl px-4 py-3 text-sm text-[#191c1c] focus:ring-2 focus:ring-[#1B4332] outline-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-[#717973] mb-2">Primary Crop</label>
                    <select 
                      value={profileData.primaryCrop}
                      onChange={(e) => setProfileData({...profileData, primaryCrop: e.target.value})}
                      className="w-full bg-[#f8faf9] border border-[#e1e3e2] rounded-xl px-4 py-3 text-sm text-[#191c1c] focus:ring-2 focus:ring-[#1B4332] outline-none"
                    >
                      <option>Sugar Cane</option>
                      <option>Cotton</option>
                      <option>Onion</option>
                      <option>Soybean</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-[#717973] mb-2">District</label>
                    <select 
                      value={profileData.district}
                      onChange={(e) => {
                        const dist = e.target.value;
                        setProfileData({...profileData, district: dist, taluka: MAHARASHTRA_DATA[dist][0]});
                      }}
                      className="w-full bg-[#f8faf9] border border-[#e1e3e2] rounded-xl px-4 py-3 text-sm text-[#191c1c] focus:ring-2 focus:ring-[#1B4332] outline-none"
                    >
                      {Object.keys(MAHARASHTRA_DATA).map(dist => (
                        <option key={dist} value={dist}>{dist}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-[#717973] mb-2">Taluka</label>
                    <select 
                      value={profileData.taluka}
                      onChange={(e) => setProfileData({...profileData, taluka: e.target.value})}
                      className="w-full bg-[#f8faf9] border border-[#e1e3e2] rounded-xl px-4 py-3 text-sm text-[#191c1c] focus:ring-2 focus:ring-[#1B4332] outline-none"
                    >
                      {MAHARASHTRA_DATA[profileData.district]?.map(tal => (
                        <option key={tal} value={tal}>{tal}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-[#717973] mb-2">Category</label>
                    <select 
                      value={profileData.category}
                      onChange={(e) => setProfileData({...profileData, category: e.target.value})}
                      className="w-full bg-[#f8faf9] border border-[#e1e3e2] rounded-xl px-4 py-3 text-sm text-[#191c1c] focus:ring-2 focus:ring-[#1B4332] outline-none"
                    >
                      <option>General</option>
                      <option>OBC</option>
                      <option>SC</option>
                      <option>ST</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button 
                      onClick={checkEligibility}
                      disabled={isCheckingEligibility}
                      className="w-full bg-[#1B4332] text-white py-3 rounded-xl font-bold hover:bg-[#012d1d] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#1B4332]/20 disabled:opacity-70"
                    >
                      {isCheckingEligibility ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      {isCheckingEligibility ? 'Matching Schemes...' : 'Check Eligibility'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Eligibility Results */}
              {eligibilityResult && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {eligibilityResult.matched.map((match: any, i: number) => (
                    <div key={i} className="bg-white rounded-3xl border border-[#e1e3e2] overflow-hidden shadow-md flex flex-col">
                      <div className="p-6 bg-[#1B4332]/5 border-b border-[#1B4332]/10 flex justify-between items-start">
                        <div>
                          <p className="text-[10px] text-[#1B4332] font-bold uppercase tracking-widest mb-1">Matched Scheme</p>
                          <h4 className="font-bold text-[#191c1c]">{match.schemeDetails.name}</h4>
                        </div>
                        <span className="bg-[#1B4332] text-white text-[10px] font-bold px-2 py-1 rounded-md">
                          {match.confidence.toUpperCase()} MATCH
                        </span>
                      </div>
                      <div className="p-6 flex-1 space-y-4">
                        <div className="flex justify-between items-center bg-[#f8faf9] p-3 rounded-xl">
                          <span className="text-xs text-[#717973]">Benefit Amount</span>
                          <span className="text-sm font-bold text-[#1B4332]">{match.schemeDetails.benefitAmount}</span>
                        </div>
                        <div>
                          <p className="text-[10px] text-[#717973] font-bold uppercase mb-1">Reason for Eligibility</p>
                          <p className="text-xs text-[#414844]">{match.reason}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[#717973] font-bold uppercase mb-1">Required Documents</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {match.schemeDetails.requiredDocs.map((doc: string, j: number) => (
                              <span key={j} className="text-[10px] bg-[#f2f4f3] text-[#414844] px-2 py-1 rounded-md border border-[#e1e3e2]">
                                {doc}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="p-4 bg-[#f8faf9] border-t border-[#e1e3e2]">
                        <button className="w-full bg-white border border-[#e1e3e2] text-[#1B4332] py-2 rounded-xl text-xs font-bold hover:bg-[#1B4332] hover:text-white transition-all">
                          Start Application
                        </button>
                      </div>
                    </div>
                  ))}

                  {eligibilityResult.matched.length === 0 && (
                    <div className="md:col-span-2 bg-white p-12 rounded-3xl border border-[#e1e3e2] text-center">
                      <AlertTriangle className="w-12 h-12 text-[#F59E0B] mx-auto mb-4" />
                      <h4 className="font-bold text-[#191c1c]">No direct matches found</h4>
                      <p className="text-[#717973] text-sm mt-1">Try adjusting the profile details or check specific exclusions below.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'grievance' && (
            <div className="space-y-8 animate-in fade-in duration-500">
               {/* Grievance Form */}
               <div className="bg-white p-8 rounded-3xl border border-[#e1e3e2] shadow-sm">
                <h3 className="text-lg font-bold text-[#1B4332] mb-8 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Register Farmer Grievance
                </h3>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider font-bold text-[#717973] mb-2">Farmer Name</label>
                      <input 
                        type="text" 
                        value={grievanceData.farmer_name}
                        onChange={(e) => setGrievanceData({...grievanceData, farmer_name: e.target.value})}
                        className="w-full bg-[#f8faf9] border border-[#e1e3e2] rounded-xl px-4 py-3 text-sm text-[#191c1c] focus:ring-2 focus:ring-[#1B4332] outline-none" 
                        placeholder="e.g. Anand Deshmukh"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider font-bold text-[#717973] mb-2">Aadhaar (Last 4)</label>
                      <input 
                        type="text" 
                        maxLength={4}
                        value={grievanceData.aadhaar_last4}
                        onChange={(e) => setGrievanceData({...grievanceData, aadhaar_last4: e.target.value})}
                        className="w-full bg-[#f8faf9] border border-[#e1e3e2] rounded-xl px-4 py-3 text-sm text-[#191c1c] focus:ring-2 focus:ring-[#1B4332] outline-none" 
                        placeholder="8891"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider font-bold text-[#717973] mb-2">District</label>
                      <select 
                        value={grievanceData.district}
                        onChange={(e) => {
                          const dist = e.target.value;
                          setGrievanceData({...grievanceData, district: dist});
                        }}
                        className="w-full bg-[#f8faf9] border border-[#e1e3e2] rounded-xl px-4 py-3 text-sm text-[#191c1c] focus:ring-2 focus:ring-[#1B4332] outline-none"
                      >
                        {Object.keys(MAHARASHTRA_DATA).map(dist => (
                          <option key={dist} value={dist}>{dist}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider font-bold text-[#717973] mb-2">Taluka</label>
                      <select 
                        value={grievanceData.taluka}
                        onChange={(e) => setGrievanceData({...grievanceData, taluka: e.target.value})}
                        className="w-full bg-[#f8faf9] border border-[#e1e3e2] rounded-xl px-4 py-3 text-sm text-[#191c1c] focus:ring-2 focus:ring-[#1B4332] outline-none"
                      >
                        {MAHARASHTRA_DATA[grievanceData.district]?.map(tal => (
                          <option key={tal} value={tal}>{tal}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-[#717973] mb-2">Complaint Details</label>
                    <textarea 
                      rows={4}
                      value={grievanceData.complaint_text}
                      onChange={(e) => setGrievanceData({...grievanceData, complaint_text: e.target.value})}
                      className="w-full bg-[#f8faf9] border border-[#e1e3e2] rounded-lg px-4 py-4 text-sm text-[#191c1c] focus:ring-2 focus:ring-[#1B4332] outline-none h-32 resize-none" 
                      placeholder="Describe the issue in detail (Marathi/English supported)..."
                    />
                  </div>
                  <div className="flex justify-end">
                    <button 
                      onClick={registerGrievance}
                      disabled={isRegisteringGrievance}
                      className="bg-[#1B4332] text-white px-10 py-3 rounded-xl font-bold hover:bg-[#012d1d] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#1B4332]/20 disabled:opacity-70"
                    >
                      {isRegisteringGrievance ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />}
                      {isRegisteringGrievance ? 'Analyzing Complaint...' : 'Register Grievance'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Grievance Result */}
              {grievanceResult && (
                <div className="bg-white rounded-3xl border border-[#e1e3e2] shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="p-6 bg-[#1B4332] text-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-6 h-6" />
                      <div>
                        <p className="text-[10px] uppercase tracking-widest font-bold opacity-80">Grievance Registered</p>
                        <h4 className="font-bold text-lg">{grievanceResult.grievance.grievance_id}</h4>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-widest font-bold opacity-80">SLA Deadline</p>
                      <h4 className="font-bold">{new Date(grievanceResult.grievance.sla_deadline).toLocaleDateString()}</h4>
                    </div>
                  </div>
                  <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="p-4 bg-[#f8faf9] rounded-2xl border border-[#e1e3e2]">
                      <p className="text-[10px] text-[#717973] font-bold uppercase mb-1">AI Category</p>
                      <p className="font-bold text-[#1B4332] capitalize">{grievanceResult.analysis.category.replace(/_/g, ' ')}</p>
                    </div>
                    <div className="p-4 bg-[#f8faf9] rounded-2xl border border-[#e1e3e2]">
                      <p className="text-[10px] text-[#717973] font-bold uppercase mb-1">Priority Level</p>
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${
                          grievanceResult.analysis.priority >= 4 ? 'bg-[#ba1a1a]' : 
                          grievanceResult.analysis.priority >= 3 ? 'bg-[#F59E0B]' : 'bg-[#1B4332]'
                        }`} />
                        <p className="font-bold text-[#191c1c]">{grievanceResult.analysis.priority} / 5</p>
                      </div>
                    </div>
                    <div className="p-4 bg-[#f8faf9] rounded-2xl border border-[#e1e3e2]">
                      <p className="text-[10px] text-[#717973] font-bold uppercase mb-1">Routing To</p>
                      <p className="font-bold text-[#191c1c]">{grievanceResult.analysis.suggestedDepartment}</p>
                    </div>
                    <div className="md:col-span-3">
                       <p className="text-[10px] text-[#717973] font-bold uppercase mb-2">Priority Analysis</p>
                       <p className="text-sm text-[#414844] italic">"{grievanceResult.analysis.priorityReason}"</p>
                    </div>
                  </div>
                  <div className="p-6 bg-[#f2f4f3] border-t border-[#e1e3e2] flex justify-center">
                    <p className="text-[10px] text-[#717973] font-medium">An automated notification has been sent to the {grievanceResult.analysis.suggestedDepartment}.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
