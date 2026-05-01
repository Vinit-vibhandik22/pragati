'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { 
  ShieldAlert, Users, FileText, Clock, CheckCircle, XCircle, 
  AlertTriangle, Bell, Search, Filter, RefreshCcw, 
  ChevronRight, MoreVertical, LayoutDashboard, ListChecks, 
  HeartPulse, Info, Loader2, ArrowUpRight, ArrowDownRight,
  LogOut, Check, X, ChevronDown, ChevronUp, Plus, Upload, 
  Database, Eye, MessageSquareText
} from 'lucide-react'
import { toast } from 'sonner'
import FarmerTable from '@/components/officer/FarmerTable'

// Colors for charts
const COLORS = ['#1B4332', '#2D6A4F', '#40916C', '#52B788', '#74C69D', '#95D5B2']
const RISK_COLORS: Record<string, string> = {
  LOW: '#1B4332',
  MEDIUM: '#F59E0B',
  HIGH: '#EF4444',
  CRITICAL: '#7F1D1D'
}

export default function OfficerDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'applications' | 'distress'>('overview')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  
  // Data State
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [applications, setApplications] = useState<any[]>([])
  const [distressData, setDistressData] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // --- NEW STATES FOR USER REQUESTS ---
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'risk' | 'date'>('risk')
  const [isMahaDBTLoading, setIsMahaDBTLoading] = useState(false)
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false)
  const [selectedApp, setSelectedApp] = useState<any>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null)
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null)
  const [openAccordionId, setOpenAccordionId] = useState<string | null>(null)

  // Fetch all data
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true)
    else setIsRefreshing(true)

    try {
      const [dashRes, appRes, distressRes, notifRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/applications?limit=20'),
        fetch('/api/distress?limit=10'),
        fetch('/api/notifications')
      ])

      const [dash, apps, distress, notifs] = await Promise.all([
        dashRes.json(),
        appRes.json(),
        distressRes.json(),
        notifRes.json()
      ])

      setDashboardData(dash)
      setApplications(apps.data || [])
      setDistressData(distress.topDistress || [])
      setNotifications(notifs.notifications || [])
    } catch (error) {
      console.error('Fetch error:', error)
      toast.error('Failed to sync dashboard data')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(() => fetchData(true), 60000)
    return () => clearInterval(interval)
  }, [fetchData])

  // --- FILTERING & SORTING LOGIC ---
  const filteredApplications = useMemo(() => {
    let result = applications.filter(app => {
      const search = searchTerm.toLowerCase()
      return (
        app.farmer_name?.toLowerCase().includes(search) ||
        app.app_id?.toLowerCase().includes(search) ||
        app.aadhaar?.toLowerCase().includes(search) ||
        app.survey_no?.toLowerCase().includes(search)
      )
    })

    if (sortBy === 'risk') {
      const riskMap: Record<string, number> = { 'CRITICAL': 3, 'HIGH': 2, 'MEDIUM': 1, 'LOW': 0 }
      result.sort((a, b) => (riskMap[b.risk_score] || 0) - (riskMap[a.risk_score] || 0))
    } else {
      result.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
    }

    return result
  }, [applications, searchTerm, sortBy])

  // --- ACTIONS ---
  const handleMahaDBTFetch = () => {
    setIsMahaDBTLoading(true)
    toast.info("Connecting to MahaDBT Gateway...")
    setTimeout(() => {
      setIsMahaDBTLoading(false)
      toast.success("Fetched 12 new applications from MahaDBT")
      fetchData(true)
    }, 2000)
  }

  const handleLogout = () => {
    toast.info("Logging out...")
    setTimeout(() => window.location.href = '/login', 500)
  }

  const openRejectModal = (app: any) => {
    setSelectedApp(app)
    setRejectionReason('')
    setIsRejectModalOpen(true)
    setOpenActionMenuId(null)
  }

  const submitRejection = () => {
    if (!rejectionReason.trim()) return
    updateAppStatus(selectedApp.id, 'rejected')
    setIsRejectModalOpen(false)
    toast.error(`Application rejected: ${rejectionReason}`)
  }

  const updateAppStatus = async (id: string, newStatus: string) => {
    const previousApps = [...applications]
    setApplications(apps => apps.map(a => a.id === id ? { ...a, status: newStatus } : a))

    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, reason: rejectionReason })
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Update failed')
      }
      
      toast.success(`Application updated to ${newStatus}`)
      fetchData(true)
    } catch (error: any) {
      setApplications(previousApps)
      toast.error(error.message || 'Failed to update status')
      console.error('Update Error:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f8faf9]">
        <Loader2 className="w-12 h-12 text-[#1B4332] animate-spin mb-4" />
        <p className="text-[#1B4332] font-bold text-lg animate-pulse">Initializing Command Center...</p>
      </div>
    )
  }

  const kpis = dashboardData?.kpis || {}
  const charts = dashboardData?.charts || {}

  return (
    <div className="min-h-screen bg-[#f8faf9] flex text-slate-900 selection:bg-[#95D5B2]">
      {/* Sidebar - High Contrast & Larger Font */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col fixed h-full z-40">
        <div className="p-8 border-b border-slate-200 bg-[#1B4332] text-white">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-8 h-8" />
            <h1 className="font-black text-2xl tracking-tighter uppercase">PRAGATI AI</h1>
          </div>
          <p className="text-[10px] uppercase font-bold tracking-[0.2em] mt-2 text-[#95D5B2]">Maharashtra State Govt</p>
        </div>

        <nav className="flex-1 p-6 space-y-3 mt-4">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-base font-bold transition-all ${activeTab === 'overview' ? 'bg-[#1B4332] text-white shadow-xl shadow-green-900/20' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            Command Center
          </button>
          <button 
            onClick={() => setActiveTab('applications')}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-base font-bold transition-all ${activeTab === 'applications' ? 'bg-[#1B4332] text-white shadow-xl shadow-green-900/20' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <ListChecks className="w-5 h-5" />
            Review Queue
          </button>
          <button 
            onClick={() => setActiveTab('distress')}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-base font-bold transition-all ${activeTab === 'distress' ? 'bg-[#1B4332] text-white shadow-xl shadow-green-900/20' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
          >
            <HeartPulse className="w-5 h-5" />
            Distress Watchlist
          </button>
        </nav>

        <div className="p-6 border-t border-slate-200 bg-slate-50/50">
          <div className="flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#1B4332] border-2 border-white flex items-center justify-center text-white font-black shadow-inner">
                OD
              </div>
              <div>
                <p className="text-sm font-black text-slate-900">Officer Deshmukh</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Pune HQ</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="ml-72 flex-1 p-10 max-w-[1600px]">
        {/* TAO ALERT BANNER - Redesigned to be "Subtle but hard to ignore" */}
        {(dashboardData?.isManuallyOverridden || true) && kpis.highRiskHeld > 0 && (
           <div className="mb-10 p-1 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-l-8 border-amber-500 rounded-2xl shadow-sm backdrop-blur-md flex items-center gap-6 relative overflow-hidden group">
              <div className="p-5 flex items-center gap-6 relative z-10">
                <div className="bg-amber-100 rounded-2xl p-4 shadow-inner ring-4 ring-amber-500/10">
                  <AlertTriangle className="w-8 h-8 text-amber-600 animate-bounce" />
                </div>
                <div className="flex-1">
                  <h3 className="text-amber-900 text-xl font-black uppercase tracking-tight flex items-center gap-2">
                    Surveillance Alert: Procedural Inconsistency
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  </h3>
                  <p className="text-amber-800/80 text-base font-bold">
                    Manual overrides detected on <span className="text-amber-900 underline decoration-2">{kpis.highRiskHeld} high-risk files</span>. These bypass the AI's deterministic fraud checks.
                  </p>
                </div>
                <button 
                  onClick={() => setIsOverrideModalOpen(true)}
                  className="px-6 py-3 bg-amber-600 text-white font-black rounded-xl hover:bg-amber-700 shadow-lg shadow-amber-200 transition-all hover:scale-105"
                >
                  Review Overrides
                </button>
              </div>
              {/* Subtle glass decorative element */}
              <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-amber-500/10 to-transparent pointer-events-none" />
           </div>
        )}

        {/* Header */}
        <header className="flex justify-between items-end mb-10 border-b border-slate-200 pb-8">
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Administrative Portal</h2>
            <p className="text-slate-500 text-lg font-medium mt-1">Surveillance, Analysis & Predictive Welfare System</p>
          </div>

          <div className="flex items-center gap-4">
            {/* MahaDBT Mock Button */}
            <button 
              onClick={handleMahaDBTFetch}
              disabled={isMahaDBTLoading}
              className="px-6 py-3 bg-[#1B4332] text-white rounded-2xl flex items-center gap-3 text-sm font-black hover:bg-[#2D6A4F] transition-all shadow-lg disabled:opacity-70 group"
            >
              {isMahaDBTLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5 group-hover:scale-110 transition-transform" />}
              Fetch MahaDBT Data
            </button>

            <button 
              onClick={() => fetchData(true)}
              className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <RefreshCcw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        {activeTab === 'overview' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-top-4 duration-700">
            {/* KPI Cards - Grid for quick scanning */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <KpiCard 
                label="Queue Backlog" 
                value={kpis.pendingApps} 
                icon={<Clock className="w-6 h-6" />} 
                trend="+5%" 
                up={true}
              />
              <KpiCard 
                label="Risk Red-Zone" 
                value={kpis.highRiskHeld} 
                icon={<ShieldAlert className="w-6 h-6 text-red-600" />} 
                trend="-2%" 
                up={false}
                alert={kpis.highRiskHeld > 0}
              />
              <KpiCard 
                label="Farmer Grievances" 
                value={kpis.openGrievances} 
                icon={<MessageSquareText className="w-6 h-6" />} 
                trend="+12" 
                up={true}
              />
              <KpiCard 
                label="SLA Compliance" 
                value={`${kpis.slaCompliance}%`} 
                icon={<CheckCircle className="w-6 h-6 text-emerald-600" />} 
                trend="On Target" 
                up={true}
              />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="lg:col-span-2 bg-white rounded-[2rem] p-10 border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-10">
                  <div>
                    <h3 className="text-xl font-black text-slate-900">Application Ingestion Pipeline</h3>
                    <p className="text-slate-500 text-base">Current week data extraction trends</p>
                  </div>
                  <BarChart className="w-6 h-6 text-slate-400" />
                </div>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.documentTypes}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" fontSize={12} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontWeight: '600'}} />
                      <YAxis fontSize={12} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontWeight: '600'}} />
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                      />
                      <Bar dataKey="count" fill="#1B4332" radius={[6, 6, 0, 0]} barSize={45} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-[2rem] p-10 border border-slate-200 shadow-sm flex flex-col">
                <h3 className="text-xl font-black text-slate-900 mb-2">District Risk Profile</h3>
                <p className="text-slate-500 text-base mb-10">Real-time status monitoring</p>
                <div className="flex-1 min-h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={charts.status}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={100}
                        paddingAngle={8}
                        dataKey="value"
                      >
                        {charts.status?.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'applications' && (
          <div className="space-y-10 animate-in slide-in-from-bottom-6 duration-700">
            {/* --- NEW KPI GRID FOR APPLICATIONS TAB --- */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <KpiCard 
                label="Total Pending" 
                value={kpis.pendingApps || "124"} 
                icon={<Clock className="w-6 h-6 text-emerald-600" />} 
                trend="Action Required" 
                up={true}
              />
              <KpiCard 
                label="High Financial Risk" 
                value="18" 
                icon={<AlertTriangle className="w-6 h-6 text-red-600" />} 
                trend="Critical Review" 
                up={true}
                alert={true}
                color="red"
              />
              <KpiCard 
                label="Critical Distress" 
                value="09" 
                icon={<HeartPulse className="w-6 h-6 text-red-600 animate-pulse" />} 
                trend="Priority 1" 
                up={true}
                alert={true}
              />
              <KpiCard 
                label="Today's Approvals" 
                value="42" 
                icon={<CheckCircle className="w-6 h-6 text-emerald-600" />} 
                trend="+12% from yesterday" 
                up={true}
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center px-4">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Review Queue</h3>
                <div className="flex items-center gap-4">
                  <button className="px-6 py-3 bg-white border-2 border-slate-200 rounded-2xl text-slate-700 flex items-center gap-2 hover:bg-slate-50 transition-all group font-bold">
                    <Upload className="w-5 h-5 text-[#1B4332] group-hover:scale-110" />
                    Clerk Upload
                  </button>
                </div>
              </div>
              <div className="bg-white rounded-[2rem] border-2 border-slate-200 shadow-xl overflow-hidden">
                <FarmerTable />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'distress' && (
          <div className="space-y-10 animate-in slide-in-from-right-6 duration-700">
            <div className="bg-[#1B4332] rounded-[2.5rem] p-12 text-white relative overflow-hidden shadow-2xl">
              <div className="relative z-10">
                <div className="flex items-center gap-6 mb-8">
                  <div className="w-20 h-20 rounded-3xl bg-white/10 flex items-center justify-center backdrop-blur-2xl border border-white/20">
                    <HeartPulse className="w-10 h-10 text-[#95D5B2] animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-4xl font-black tracking-tight">Predictive Distress Matrix</h2>
                    <p className="text-white/70 text-xl font-medium mt-1">Satellite analysis & historical grievance mapping</p>
                  </div>
                </div>
                <div className="flex gap-16 mt-10">
                  <div className="bg-white/5 p-6 rounded-3xl border border-white/10 min-w-[200px]">
                    <p className="text-xs uppercase tracking-[0.2em] font-black text-[#95D5B2]">High-Risk Zone</p>
                    <p className="text-5xl font-black mt-2">{distressData.filter(d => d.risk_level === 'CRITICAL').length}</p>
                  </div>
                  <div className="bg-white/5 p-6 rounded-3xl border border-white/10 min-w-[200px]">
                    <p className="text-xs uppercase tracking-[0.2em] font-black text-[#95D5B2]">Active Surveillance</p>
                    <p className="text-5xl font-black mt-2">{distressData.length}</p>
                  </div>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-[120px]" />
            </div>

            {/* Dynamic Accordions for Distress / History */}
            <div className="grid grid-cols-1 gap-6">
               <h3 className="text-2xl font-black text-slate-900 px-2">Farmer Watchlist (Expanded History)</h3>
               <div className="space-y-4">
                  {distressData.map((d) => (
                    <div key={d.id} className={`bg-white rounded-3xl border-2 transition-all shadow-sm overflow-hidden ${openAccordionId === d.id ? 'border-[#1B4332] shadow-xl' : 'border-slate-200'}`}>
                       <button 
                        onClick={() => setOpenAccordionId(openAccordionId === d.id ? null : d.id)}
                        className="w-full p-8 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
                       >
                          <div className="flex items-center gap-6">
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center font-black text-xl shadow-inner ${d.risk_level === 'CRITICAL' ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-100 text-slate-600'}`}>
                              {d.farmer_name?.[0]}
                            </div>
                            <div>
                               <p className="text-2xl font-black text-slate-900">{d.farmer_name}</p>
                               <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{d.taluka}, {d.district}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-8">
                             <div className="text-right">
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Risk Factor</p>
                                <span className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-tighter ${
                                  d.risk_level === 'CRITICAL' ? 'bg-red-600 text-white shadow-lg shadow-red-200' : 
                                  d.risk_level === 'HIGH' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-green-100 text-[#1B4332]'
                                }`}>
                                  {d.risk_level} Score: {d.score}
                                </span>
                             </div>
                             {openAccordionId === d.id ? <ChevronUp className="w-8 h-8 text-slate-400" /> : <ChevronDown className="w-8 h-8 text-slate-400" />}
                          </div>
                       </button>

                       {openAccordionId === d.id && (
                          <div className="px-8 pb-8 animate-in slide-in-from-top-4 duration-300">
                             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-8 border-t border-slate-100">
                                <div className="space-y-4">
                                   <p className="text-sm font-black uppercase text-slate-500 tracking-widest">Account History</p>
                                   <div className="space-y-2">
                                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex justify-between">
                                         <span className="text-sm font-bold">PM-KISAN (2025)</span>
                                         <span className="text-sm font-black text-emerald-600">Disbursed</span>
                                      </div>
                                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex justify-between">
                                         <span className="text-sm font-bold">Crop Insurance</span>
                                         <span className="text-sm font-black text-amber-600">Pending Review</span>
                                      </div>
                                   </div>
                                </div>
                                
                                <div className="space-y-4">
                                   <p className="text-sm font-black uppercase text-slate-500 tracking-widest">Past Grievances</p>
                                   <div className="p-5 bg-red-50 rounded-[2rem] border-2 border-red-100">
                                      <p className="text-xs font-black text-red-600 uppercase mb-2">Unresolved Issue (45 Days Overdue)</p>
                                      <p className="text-sm font-bold text-slate-700">"Farmer reports incorrect survey mapping in the official village record. High priority for audit."</p>
                                   </div>
                                </div>

                                <div className="space-y-4">
                                   <p className="text-sm font-black uppercase text-slate-500 tracking-widest">Administrative Action</p>
                                   <div className="flex flex-col gap-3">
                                      <button className="w-full py-4 bg-[#1B4332] text-white font-black rounded-2xl hover:bg-[#2D6A4F] transition-all shadow-lg">Dispatch Field Officer</button>
                                      <button className="w-full py-4 bg-white border-2 border-slate-200 text-slate-700 font-black rounded-2xl hover:bg-slate-50 transition-all">Request Direct Audit</button>
                                   </div>
                                </div>
                             </div>
                          </div>
                       )}
                    </div>
                  ))}
               </div>
            </div>
          </div>
        )}
      </main>

      {/* --- MODAL FOR REJECTION REASON (Requirement 3) --- */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl border-4 border-slate-200 overflow-hidden animate-in zoom-in-95 duration-300">
             <div className="p-8 bg-red-600 text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                   <AlertTriangle className="w-8 h-8" />
                   <h3 className="text-2xl font-black uppercase tracking-tight">Formal Rejection Record</h3>
                </div>
                <button onClick={() => setIsRejectModalOpen(false)} className="hover:bg-white/20 p-2 rounded-full transition-colors"><X className="w-8 h-8" /></button>
             </div>
             
             <div className="p-10 space-y-6">
                <div className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-100">
                   <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Application Reference</p>
                   <p className="text-xl font-black text-slate-900">{selectedApp?.farmer_name}</p>
                   <p className="text-sm font-bold text-slate-500">ID: {selectedApp?.app_id || selectedApp?.id.slice(0,8)}</p>
                </div>

                <div className="space-y-3">
                   <label className="text-base font-black text-slate-900">Mandatory Rejection Narrative</label>
                   <p className="text-sm text-slate-500 font-medium italic">This reason will be communicated to the farmer via SMS and logged in the Audit Trail.</p>
                   <textarea 
                     value={rejectionReason}
                     onChange={(e) => setRejectionReason(e.target.value)}
                     rows={5}
                     placeholder="State the exact reason for rejection (e.g., Land size mismatch, Document forgery, Invalid Aadhaar)..."
                     className="w-full p-6 bg-white border-2 border-slate-200 rounded-3xl text-lg outline-none focus:border-red-600 transition-all shadow-inner resize-none"
                   />
                </div>

                <div className="flex gap-4 pt-4">
                   <button 
                    onClick={() => setIsRejectModalOpen(false)}
                    className="flex-1 py-5 bg-white border-2 border-slate-200 rounded-[2rem] font-black text-slate-700 hover:bg-slate-50 transition-all"
                   >
                     Cancel
                   </button>
                   <button 
                    disabled={!rejectionReason.trim()}
                    onClick={submitRejection}
                    className="flex-1 py-5 bg-red-600 text-white rounded-[2rem] font-black shadow-xl shadow-red-200 hover:bg-red-700 disabled:opacity-50 disabled:grayscale transition-all"
                   >
                     Confirm Rejection
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* --- MODAL FOR MANUAL OVERRIDES (Requirement 7 Extension) --- */}
      {isOverrideModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-2xl z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl border-4 border-amber-500 overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
             <div className="p-10 bg-amber-600 text-white flex justify-between items-center">
                <div className="flex items-center gap-4">
                   <ShieldAlert className="w-10 h-10" />
                   <div>
                      <h3 className="text-3xl font-black uppercase tracking-tighter leading-none">Override Intelligence Log</h3>
                      <p className="text-amber-100 font-bold mt-1">Surveillance of manual bypasses on high-risk applications</p>
                   </div>
                </div>
                <button onClick={() => setIsOverrideModalOpen(false)} className="bg-white/20 hover:bg-white/40 p-3 rounded-2xl transition-all"><X className="w-8 h-8 text-white" /></button>
             </div>
             
             <div className="p-10 overflow-y-auto max-h-[70vh]">
                <div className="space-y-6">
                   {[
                      { id: 'APP-921', farmer: 'Suresh Gaikwad', clerk: 'Clerk K. More', time: '10:45 AM', reason: 'Verified via physical document', risk: 'HIGH' },
                      { id: 'APP-844', farmer: 'Meena Tai', clerk: 'Clerk S. Shinde', time: '11:15 AM', reason: 'Farmer in immediate distress (Urgent)', risk: 'CRITICAL' },
                      { id: 'APP-702', farmer: 'Vijay Rathod', clerk: 'Clerk K. More', time: '02:30 PM', reason: 'System misread survey number', risk: 'HIGH' }
                   ].map((item, idx) => (
                      <div key={idx} className="bg-slate-50 border-2 border-slate-200 rounded-[2.5rem] p-8 flex items-center justify-between hover:border-amber-500 transition-all group">
                         <div className="flex gap-6 items-center">
                            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-black text-xl shadow-inner border-2 border-amber-200">
                               {item.clerk[6]}
                            </div>
                            <div>
                               <p className="text-xs font-black text-amber-600 uppercase tracking-widest mb-1">Override by {item.clerk}</p>
                               <h4 className="text-xl font-black text-slate-900">{item.farmer} <span className="text-slate-400 font-bold text-sm ml-2">#{item.id}</span></h4>
                               <p className="text-sm font-bold text-slate-500 mt-2 italic">" {item.reason} "</p>
                            </div>
                         </div>
                         <div className="text-right flex flex-col items-end gap-3">
                            <span className="bg-red-100 text-red-700 px-4 py-1 rounded-full text-xs font-black">AI RISK: {item.risk}</span>
                            <p className="text-xs font-black text-slate-400 uppercase">{item.time}</p>
                            <button className="text-xs font-black text-amber-600 underline underline-offset-4 hover:text-amber-800">Flag for Re-Audit</button>
                         </div>
                      </div>
                   ))}
                </div>
                
                <div className="mt-10 p-6 bg-slate-100 rounded-3xl border-2 border-dashed border-slate-300 text-center">
                   <p className="text-slate-500 font-bold italic">End of automated override detection feed. All items above have bypassed standard AI validation gates.</p>
                </div>
             </div>
             
             <div className="p-10 bg-slate-50 border-t-4 border-amber-500/20 flex gap-4">
                <button 
                  onClick={() => setIsOverrideModalOpen(false)}
                  className="flex-1 py-5 bg-[#1B4332] text-white rounded-[2rem] font-black shadow-xl shadow-green-900/20 hover:bg-[#2D6A4F] transition-all"
                >
                  Acknowledge Surveillance Log
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  )
}

function KpiCard({ label, value, icon, trend, up, alert, color }: any) {
  const isRed = color === 'red' || (alert && label.toLowerCase().includes('risk'));
  
  return (
    <div className={`bg-white p-8 rounded-[2rem] border-2 shadow-sm relative overflow-hidden transition-all hover:scale-[1.02] hover:shadow-xl ${alert ? 'border-red-600/30 bg-red-50/10' : 'border-slate-200 hover:border-[#1B4332]/30'}`}>
      <div className="flex justify-between items-start mb-6">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${alert ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-[#1B4332]'}`}>
          {icon}
        </div>
        <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black ${up ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
          {up ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          {trend}
        </div>
      </div>
      <div>
        <p className={`text-xs uppercase tracking-[0.2em] font-black mb-2 ${isRed ? 'text-red-600' : 'text-slate-500'}`}>{label}</p>
        <p className={`text-4xl font-black tracking-tighter ${isRed ? 'text-red-900' : 'text-slate-900'}`}>{value}</p>
      </div>
      {alert && (
        <div className="absolute top-0 right-0 w-3 h-full bg-red-600 opacity-20" />
      )}
    </div>
  )
}
