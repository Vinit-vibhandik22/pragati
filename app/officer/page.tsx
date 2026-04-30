'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { 
  ShieldAlert, Users, FileText, Clock, CheckCircle, XCircle, 
  AlertTriangle, Bell, Search, Filter, RefreshCcw, 
  ChevronRight, MoreVertical, LayoutDashboard, ListChecks, 
  HeartPulse, Info, Loader2, ArrowUpRight, ArrowDownRight
} from 'lucide-react'
import { toast } from 'sonner'

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
    // Auto-refresh every 60s
    const interval = setInterval(() => fetchData(true), 60000)
    return () => clearInterval(interval)
  }, [fetchData])

  // Actions
  const updateAppStatus = async (id: string, newStatus: string) => {
    // Optimistic UI update
    const previousApps = [...applications]
    setApplications(apps => apps.map(a => a.id === id ? { ...a, status: newStatus } : a))

    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (!res.ok) throw new Error('Update failed')
      
      toast.success(`Application #${id.slice(0, 6)} marked as ${newStatus}`)
      fetchData(true) // Refresh dashboard counters
    } catch (error) {
      setApplications(previousApps)
      toast.error('Failed to update status')
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f8faf9]">
        <Loader2 className="w-12 h-12 text-[#1B4332] animate-spin mb-4" />
        <p className="text-[#1B4332] font-medium animate-pulse">Initializing Command Center...</p>
      </div>
    )
  }

  const kpis = dashboardData?.kpis || {}
  const charts = dashboardData?.charts || {}

  return (
    <div className="min-h-screen bg-[#f8faf9] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-[#e1e3e2] flex flex-col fixed h-full">
        <div className="p-6 border-b border-[#e1e3e2] bg-[#1B4332] text-white">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6" />
            <h1 className="font-bold text-lg tracking-tight">PRAGATI <span className="text-[#95D5B2] font-light italic">AI</span></h1>
          </div>
          <p className="text-[10px] uppercase tracking-widest mt-1 opacity-70">Officer Command Center</p>
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-4">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${activeTab === 'overview' ? 'bg-[#1B4332] text-white shadow-lg' : 'text-[#717973] hover:bg-[#f8faf9]'}`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Command Center
          </button>
          <button 
            onClick={() => setActiveTab('applications')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${activeTab === 'applications' ? 'bg-[#1B4332] text-white shadow-lg' : 'text-[#717973] hover:bg-[#f8faf9]'}`}
          >
            <ListChecks className="w-4 h-4" />
            Review Queue
          </button>
          <button 
            onClick={() => setActiveTab('distress')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${activeTab === 'distress' ? 'bg-[#1B4332] text-white shadow-lg' : 'text-[#717973] hover:bg-[#f8faf9]'}`}
          >
            <HeartPulse className="w-4 h-4" />
            Distress Watchlist
          </button>
        </nav>

        <div className="p-6 border-t border-[#e1e3e2]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#1B4332] flex items-center justify-center text-white font-bold">
              OD
            </div>
            <div>
              <p className="text-sm font-bold text-[#191c1c]">Officer Deshmukh</p>
              <p className="text-[10px] text-[#717973] font-medium uppercase">Pune District HQ</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 flex-1 p-8">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-black text-[#191c1c]">Dashboard</h2>
            <p className="text-[#717973] text-sm font-medium">Real-time surveillance & processing portal</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-10 h-10 rounded-full bg-white border border-[#e1e3e2] flex items-center justify-center text-[#191c1c] hover:bg-[#f8faf9] relative"
              >
                <Bell className="w-5 h-5" />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#EF4444] rounded-full border-2 border-white text-[10px] text-white flex items-center justify-center font-bold">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>
              
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-[#e1e3e2] z-50 overflow-hidden">
                  <div className="p-4 bg-[#1B4332] text-white flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-widest">Notifications</span>
                    <button onClick={() => setShowNotifications(false)}><XCircle className="w-4 h-4" /></button>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-[#717973] text-sm">No new alerts</div>
                    ) : (
                      notifications.map((n: any) => (
                        <div key={n.id} className={`p-4 border-b border-[#e1e3e2] hover:bg-[#f8faf9] cursor-pointer transition-colors ${!n.read ? 'bg-[#f0fdf4]' : ''}`}>
                          <div className="flex gap-3">
                            <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${n.severity === 'CRITICAL' ? 'bg-[#EF4444]' : n.severity === 'HIGH' ? 'bg-[#F59E0B]' : 'bg-[#3B82F6]'}`} />
                            <div>
                              <p className="text-sm font-bold text-[#191c1c] leading-tight">{n.title}</p>
                              <p className="text-xs text-[#717973] mt-1">{n.message}</p>
                              <p className="text-[10px] text-[#b0b3b1] mt-2 font-medium">{new Date(n.created_at).toLocaleTimeString()}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={() => fetchData(true)}
              disabled={isRefreshing}
              className="px-4 py-2 bg-white border border-[#e1e3e2] rounded-xl flex items-center gap-2 text-sm font-bold text-[#191c1c] hover:bg-[#f8faf9] disabled:opacity-50"
            >
              <RefreshCcw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Sync Data
            </button>
          </div>
        </header>

        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <KpiCard 
                label="Pending Review" 
                value={kpis.pendingApps} 
                icon={<Clock className="w-5 h-5" />} 
                trend="+5%" 
                up={true}
              />
              <KpiCard 
                label="High Risk Flags" 
                value={kpis.highRiskHeld} 
                icon={<ShieldAlert className="w-5 h-5 text-[#EF4444]" />} 
                trend="-2%" 
                up={false}
                alert={kpis.highRiskHeld > 0}
              />
              <KpiCard 
                label="Open Grievances" 
                value={kpis.openGrievances} 
                icon={<FileText className="w-5 h-5" />} 
                trend="+12" 
                up={true}
              />
              <KpiCard 
                label="Overdue SLA" 
                value={kpis.overdueGrievances} 
                icon={<AlertTriangle className="w-5 h-5 text-[#F59E0B]" />} 
                trend="0" 
                up={true}
                alert={kpis.overdueGrievances > 0}
              />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white rounded-3xl p-8 border border-[#e1e3e2] shadow-sm">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h3 className="text-lg font-bold text-[#191c1c]">Application Flow</h3>
                    <p className="text-[#717973] text-sm">Volume distribution by document type</p>
                  </div>
                  <BarChart className="w-5 h-5 text-[#717973]" />
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={charts.documentTypes}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" fontSize={11} axisLine={false} tickLine={false} tick={{fill: '#717973'}} />
                      <YAxis fontSize={11} axisLine={false} tickLine={false} tick={{fill: '#717973'}} />
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="count" fill="#1B4332" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-8 border border-[#e1e3e2] shadow-sm">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h3 className="text-lg font-bold text-[#191c1c]">Status Breakdown</h3>
                    <p className="text-[#717973] text-sm">Current queue health</p>
                  </div>
                  <Filter className="w-5 h-5 text-[#717973]" />
                </div>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={charts.status}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
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
                <div className="mt-4 pt-4 border-t border-[#f1f5f9]">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[#717973] font-medium uppercase text-[10px] tracking-wider">SLA Compliance</span>
                    <span className="text-[#1B4332] font-bold">{kpis.slaCompliance}%</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full bg-[#f1f5f9] rounded-full overflow-hidden">
                    <div className="h-full bg-[#1B4332]" style={{ width: `${kpis.slaCompliance}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Section: Recent Activity + Top Distress */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-3xl border border-[#e1e3e2] shadow-sm overflow-hidden">
                <div className="p-6 border-b border-[#e1e3e2] flex justify-between items-center">
                  <h3 className="font-bold text-[#191c1c]">Critical Distress Watchlist</h3>
                  <button onClick={() => setActiveTab('distress')} className="text-[#1B4332] text-xs font-bold hover:underline">View All</button>
                </div>
                <div className="divide-y divide-[#e1e3e2]">
                  {distressData.slice(0, 4).map((d) => (
                    <div key={d.id} className={`p-4 flex items-center justify-between transition-colors ${d.risk_level === 'CRITICAL' ? 'bg-[#FEF2F2]' : 'hover:bg-[#f8faf9]'}`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${d.risk_level === 'CRITICAL' ? 'bg-[#EF4444] text-white' : 'bg-[#f1f5f9] text-[#717973]'}`}>
                          <HeartPulse className={`w-5 h-5 ${d.risk_level === 'CRITICAL' ? 'animate-pulse' : ''}`} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#191c1c]">{d.farmer_name}</p>
                          <p className="text-xs text-[#717973]">{d.taluka}, {d.district}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                          d.risk_level === 'CRITICAL' ? 'bg-[#EF4444] text-white' : 
                          d.risk_level === 'HIGH' ? 'bg-[#FEE2E2] text-[#EF4444]' : 'bg-[#FEF3C7] text-[#D97706]'
                        }`}>
                          {d.risk_level}
                        </span>
                        <p className="text-xs font-bold text-[#191c1c] mt-1">Score: {d.score}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-[#e1e3e2] shadow-sm overflow-hidden">
                <div className="p-6 border-b border-[#e1e3e2]">
                  <h3 className="font-bold text-[#191c1c]">Intelligence Audit Log</h3>
                </div>
                <div className="divide-y divide-[#e1e3e2]">
                  {dashboardData?.recentActivity?.map((a: any, i: number) => (
                    <div key={i} className="p-4 flex items-center justify-between hover:bg-[#f8faf9] transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${a.type === 'application' ? 'bg-[#f0fdf4] text-[#1B4332]' : 'bg-[#eff6ff] text-[#3B82F6]'}`}>
                          {a.type === 'application' ? <FileText className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#191c1c]">{a.label}</p>
                          <p className="text-[10px] text-[#717973]">{new Date(a.timestamp).toLocaleString()}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        a.risk === 'HIGH' ? 'bg-[#FEE2E2] text-[#EF4444]' : 
                        a.risk === 'MEDIUM' ? 'bg-[#FEF3C7] text-[#D97706]' : 'bg-[#f0fdf4] text-[#1B4332]'
                      }`}>
                        {a.risk}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'applications' && (
          <div className="bg-white rounded-3xl border border-[#e1e3e2] shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
            <div className="p-6 border-b border-[#e1e3e2] flex justify-between items-center bg-white sticky top-0 z-10">
              <div>
                <h3 className="font-bold text-[#191c1c]">Application Review Queue</h3>
                <p className="text-xs text-[#717973]">Process pending applications and verify fraud flags</p>
              </div>
              <div className="flex gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#717973]" />
                  <input 
                    placeholder="Search ID, Name..." 
                    className="pl-10 pr-4 py-2 border border-[#e1e3e2] rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#1B4332]"
                  />
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f8faf9] text-[10px] uppercase tracking-widest text-[#717973] font-black border-b border-[#e1e3e2]">
                    <th className="px-6 py-4">App ID</th>
                    <th className="px-6 py-4">Farmer Name</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">District</th>
                    <th className="px-6 py-4">Risk Level</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e1e3e2]">
                  {applications.length === 0 ? (
                    <tr><td colSpan={7} className="px-6 py-12 text-center text-[#717973] text-sm">No applications found</td></tr>
                  ) : (
                    applications.map((app) => (
                      <tr 
                        key={app.id} 
                        className={`hover:bg-[#f8faf9] transition-colors ${app.risk_score === 'HIGH' ? 'bg-[#FEF2F2]/50' : ''}`}
                      >
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-mono font-bold text-[#1B4332] bg-[#f0fdf4] px-2 py-1 rounded">
                            #{app.app_id || app.id.slice(0, 8)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-[#191c1c]">{app.farmer_name}</p>
                          <p className="text-[10px] text-[#717973]">{new Date(app.submitted_at).toLocaleDateString()}</p>
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-[#191c1c] capitalize">{app.document_type?.replace(/_/g, ' ')}</td>
                        <td className="px-6 py-4 text-xs text-[#717973]">{app.district}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${
                              app.risk_score === 'HIGH' ? 'bg-[#EF4444]' : 
                              app.risk_score === 'MEDIUM' ? 'bg-[#F59E0B]' : 'bg-[#1B4332]'
                            }`} />
                            <span className={`text-[10px] font-bold ${
                              app.risk_score === 'HIGH' ? 'text-[#EF4444]' : 
                              app.risk_score === 'MEDIUM' ? 'text-[#D97706]' : 'text-[#1B4332]'
                            }`}>
                              {app.risk_score} RISK
                            </span>
                            {app.irregularity_flags?.length > 0 && (
                              <div className="group relative ml-1">
                                <AlertTriangle className="w-3 h-3 text-[#EF4444] cursor-help" />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-[#191c1c] text-white text-[10px] rounded-xl shadow-xl hidden group-hover:block z-20">
                                  <p className="font-bold mb-1 border-b border-white/20 pb-1">Anomalies Detected:</p>
                                  <ul className="list-disc pl-3 space-y-1">
                                    {app.irregularity_flags.map((f: string, idx: number) => (
                                      <li key={idx} className="capitalize">{f.replace(/_/g, ' ')}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            app.status === 'approved' ? 'bg-[#f0fdf4] text-[#1B4332]' : 
                            app.status === 'rejected' ? 'bg-[#FEF2F2] text-[#EF4444]' : 'bg-[#eff6ff] text-[#3B82F6]'
                          }`}>
                            {app.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {app.status === 'pending' || app.status === 'held' || app.status === 'in_review' ? (
                              <>
                                <button 
                                  onClick={() => updateAppStatus(app.id, 'approved')}
                                  className="w-8 h-8 rounded-lg bg-[#f0fdf4] text-[#1B4332] flex items-center justify-center hover:bg-[#1B4332] hover:text-white transition-all shadow-sm"
                                  title="Approve"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => updateAppStatus(app.id, 'rejected')}
                                  className="w-8 h-8 rounded-lg bg-[#FEF2F2] text-[#EF4444] flex items-center justify-center hover:bg-[#EF4444] hover:text-white transition-all shadow-sm"
                                  title="Reject"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                            ) : null}
                            <button className="w-8 h-8 rounded-lg bg-[#f8faf9] text-[#717973] flex items-center justify-center hover:bg-[#e1e3e2] transition-all">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'distress' && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            <div className="bg-[#1B4332] rounded-3xl p-8 text-white relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                    <HeartPulse className="w-6 h-6 text-[#95D5B2] animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Predictive Distress Analysis</h2>
                    <p className="text-white/70 text-sm">Identifying vulnerable clusters using satellite and grievance markers</p>
                  </div>
                </div>
                <div className="flex gap-8 mt-6">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest opacity-70">Critical Cases</p>
                    <p className="text-3xl font-black">{distressData.filter(d => d.risk_level === 'CRITICAL').length}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest opacity-70">Active Watchlist</p>
                    <p className="text-3xl font-black">{distressData.length}</p>
                  </div>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {distressData.map((d) => (
                <div key={d.id} className={`bg-white rounded-3xl border border-[#e1e3e2] p-6 shadow-sm relative overflow-hidden transition-all hover:shadow-md ${d.risk_level === 'CRITICAL' ? 'ring-2 ring-[#EF4444]' : ''}`}>
                  {d.risk_level === 'CRITICAL' && (
                    <div className="absolute top-4 right-4 flex items-center gap-1 bg-[#EF4444] text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse uppercase tracking-wider">
                      Critical Alert
                    </div>
                  )}
                  <p className="text-xs font-bold text-[#717973] uppercase tracking-widest mb-1">{d.district}</p>
                  <h3 className="text-lg font-black text-[#191c1c] mb-1">{d.farmer_name}</h3>
                  <p className="text-sm text-[#717973] flex items-center gap-1">
                    <LayoutDashboard className="w-3 h-3" />
                    Taluka: {d.taluka}
                  </p>

                  <div className="mt-6 flex items-end justify-between">
                    <div>
                      <p className="text-[10px] text-[#717973] uppercase tracking-widest mb-1">Vulnerability Score</p>
                      <p className={`text-3xl font-black ${
                        d.risk_level === 'CRITICAL' ? 'text-[#EF4444]' : 
                        d.risk_level === 'HIGH' ? 'text-[#D97706]' : 'text-[#1B4332]'
                      }`}>
                        {d.score}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                        d.risk_level === 'CRITICAL' ? 'bg-[#EF4444] text-white' : 
                        d.risk_level === 'HIGH' ? 'bg-[#FEF3C7] text-[#D97706]' : 'bg-[#f0fdf4] text-[#1B4332]'
                      }`}>
                        {d.risk_level} Risk
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-[#f1f5f9] flex gap-2">
                    <button className="flex-1 py-2 rounded-xl bg-[#1B4332] text-white text-xs font-bold hover:bg-[#2D6A4F] transition-colors">
                      Dispatch Aid
                    </button>
                    <button className="px-4 py-2 rounded-xl border border-[#e1e3e2] text-[#717973] hover:bg-[#f8faf9] transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function KpiCard({ label, value, icon, trend, up, alert }: any) {
  return (
    <div className={`bg-white p-6 rounded-3xl border border-[#e1e3e2] shadow-sm relative overflow-hidden transition-all hover:scale-[1.02] ${alert ? 'ring-2 ring-inset ring-[#EF4444]/20' : ''}`}>
      <div className="flex justify-between items-start mb-4">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${alert ? 'bg-[#FEF2F2] text-[#EF4444]' : 'bg-[#f0fdf4] text-[#1B4332]'}`}>
          {icon}
        </div>
        <div className={`flex items-center gap-1 text-[10px] font-bold ${up ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
          {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {trend}
        </div>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-widest font-black text-[#717973] mb-1">{label}</p>
        <p className="text-3xl font-black text-[#191c1c] tracking-tight">{value}</p>
      </div>
      {alert && (
        <div className="absolute top-0 right-0 w-2 h-full bg-[#EF4444] opacity-50" />
      )}
    </div>
  )
}
