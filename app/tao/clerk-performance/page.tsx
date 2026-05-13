'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  UserCheck, RefreshCcw, Loader2, Award, ChevronDown, ChevronUp,
  ThumbsUp, ThumbsDown, ShieldCheck, Zap, Clock, Timer, Activity
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

export default function ClerkPerformancePage() {
  const [clerkData, setClerkData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedClerk, setExpandedClerk] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/clerk-performance');
      const data = await res.json();
      setClerkData(data);
    } catch (_err) {
      // silently fail — show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Clerk Performance</h1>
          <p className="text-slate-500 text-base mt-1">
            Document processing throughput, approval rates &amp; override analysis
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="px-5 py-3 bg-slate-900 text-white rounded-2xl font-black flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg disabled:opacity-60"
        >
          <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Stats
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
          <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />
          <p className="text-slate-500 font-bold animate-pulse">Compiling clerk performance data...</p>
        </div>
      ) : !clerkData || clerkData.clerks?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-40 gap-6">
          <div className="w-24 h-24 rounded-3xl bg-slate-100 flex items-center justify-center">
            <UserCheck className="w-12 h-12 text-slate-300" />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-black text-slate-700">No Performance Data Yet</h3>
            <p className="text-slate-400 mt-2 max-w-sm">
              Clerk actions will appear here once clerks begin processing applications
              and the <code className="bg-slate-100 px-1 rounded text-xs">reviewed_by_clerk_id</code> column is populated.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'Total Applications', value: clerkData.summary?.total, color: 'border-slate-200', text: 'text-slate-900' },
              { label: 'Clerk Approved',     value: clerkData.summary?.approved, color: 'border-emerald-200/60', text: 'text-emerald-700' },
              { label: 'Rejected',           value: clerkData.summary?.rejected, color: 'border-red-200/60',     text: 'text-red-700' },
              { label: 'Pending Queue',      value: clerkData.summary?.pending,  color: 'border-amber-200/60',   text: 'text-amber-700' },
            ].map(k => (
              <div key={k.label} className={`bg-white rounded-[2rem] border-2 ${k.color} p-7 shadow-sm`}>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-2">{k.label}</p>
                <p className={`text-4xl font-black ${k.text}`}>{k.value ?? '—'}</p>
              </div>
            ))}
          </div>

          {/* Clerk Cards */}
          <div className="space-y-5">
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Individual Clerk Breakdown</h2>

            {clerkData.clerks.map((clerk: any, idx: number) => (
              <div
                key={clerk.clerkId}
                className={`bg-white rounded-[2rem] border-2 shadow-sm overflow-hidden transition-all ${
                  expandedClerk === clerk.clerkId ? 'border-amber-400 shadow-xl' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Card Header */}
                <button
                  className="w-full p-8 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors"
                  onClick={() => setExpandedClerk(expandedClerk === clerk.clerkId ? null : clerk.clerkId)}
                >
                  <div className="flex items-center gap-6">
                    {/* Rank */}
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner border-2 ${
                      idx === 0 ? 'bg-amber-100 text-amber-700 border-amber-300' :
                      idx === 1 ? 'bg-slate-100 text-slate-600 border-slate-300' :
                                  'bg-orange-50 text-orange-600 border-orange-200'
                    }`}>#{idx + 1}</div>

                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-black text-slate-900">{clerk.name}</h3>
                        <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-mono">
                          {clerk.clerkId}
                        </span>
                        {idx === 0 && (
                          <span className="flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                            <Award className="w-3 h-3" /> Top Performer
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 font-bold mt-0.5">
                        Last active:{' '}
                        {clerk.lastActive
                          ? new Date(clerk.lastActive).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                          : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="flex items-center gap-8">
                    {[
                      { label: 'Processed',     value: clerk.totalProcessed,     color: 'text-slate-900' },
                      { label: 'Approval Rate', value: `${clerk.approvalRate}%`, color: 'text-emerald-600' },
                      { label: 'Override Rate', value: `${clerk.overrideRate}%`, color: clerk.overrideRate > 20 ? 'text-red-600' : 'text-amber-600' },
                      { label: 'Avg. Time',     value: `${clerk.avgProcessingHrs}h`, color: 'text-slate-700' },
                    ].map(s => (
                      <div key={s.label} className="text-center">
                        <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{s.label}</p>
                      </div>
                    ))}

                    {/* Score Gauge */}
                    <div className="flex flex-col items-center">
                      <div className="relative w-16 h-16">
                        <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                          <circle
                            cx="18" cy="18" r="15.9" fill="none"
                            stroke={clerk.performanceScore >= 70 ? '#1B4332' : clerk.performanceScore >= 40 ? '#F59E0B' : '#EF4444'}
                            strokeWidth="3"
                            strokeDasharray={`${clerk.performanceScore} ${100 - clerk.performanceScore}`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-slate-900">
                          {clerk.performanceScore}
                        </span>
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Score</p>
                    </div>

                    {expandedClerk === clerk.clerkId
                      ? <ChevronUp className="w-6 h-6 text-slate-400" />
                      : <ChevronDown className="w-6 h-6 text-slate-400" />}
                  </div>
                </button>

                {/* Expanded Detail */}
                {expandedClerk === clerk.clerkId && (
                  <div className="px-8 pb-8 border-t border-slate-100 animate-in slide-in-from-top-4 duration-300">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-8">

                      {/* Action Breakdown */}
                      <div className="space-y-4">
                        <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Action Breakdown</p>
                        <div className="space-y-3">
                          {[
                            { label: 'Direct Approvals',  value: clerk.approved,  color: 'bg-emerald-500', icon: <ThumbsUp  className="w-4 h-4" /> },
                            { label: 'Rejections',        value: clerk.rejected,  color: 'bg-red-500',     icon: <ThumbsDown className="w-4 h-4" /> },
                            { label: 'AI Flag Overrides', value: clerk.overrides, color: 'bg-amber-500',   icon: <ShieldCheck className="w-4 h-4" /> },
                            { label: 'AI Audits Run',     value: clerk.aiAudits,  color: 'bg-blue-500',    icon: <Zap className="w-4 h-4" /> },
                            { label: 'Pending in Queue',  value: clerk.pending,   color: 'bg-slate-300',   icon: <Clock className="w-4 h-4" /> },
                          ].map(item => (
                            <div key={item.label} className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-xl ${item.color} flex items-center justify-center text-white shadow-sm`}>
                                {item.icon}
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs font-bold text-slate-700">{item.label}</span>
                                  <span className="text-xs font-black text-slate-900">{item.value}</span>
                                </div>
                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${item.color} rounded-full`}
                                    style={{ width: `${(clerk.totalProcessed + clerk.pending) > 0 ? Math.round((item.value / (clerk.totalProcessed + clerk.pending)) * 100) : 0}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Performance Indicators */}
                      <div className="space-y-4">
                        <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Performance Indicators</p>
                        <div className="space-y-4">
                          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
                            <div className="flex items-center gap-2 mb-2">
                              <Timer className="w-4 h-4 text-slate-700" />
                              <span className="text-xs font-black text-slate-600 uppercase tracking-wider">Avg. Processing Time</span>
                            </div>
                            <p className="text-3xl font-black text-slate-900">
                              {clerk.avgProcessingHrs}<span className="text-base font-bold text-slate-400 ml-1">hrs</span>
                            </p>
                            <p className="text-[11px] text-slate-500 mt-1">
                              {clerk.avgProcessingHrs <= 24 ? '✅ Within SLA (24h target)' : '⚠️ Exceeds SLA target'}
                            </p>
                          </div>
                          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
                            <div className="flex items-center gap-2 mb-2">
                              <Activity className="w-4 h-4 text-amber-500" />
                              <span className="text-xs font-black text-slate-600 uppercase tracking-wider">Override Risk Level</span>
                            </div>
                            <p className={`text-3xl font-black ${clerk.overrideRate > 20 ? 'text-red-600' : clerk.overrideRate > 10 ? 'text-amber-600' : 'text-emerald-600'}`}>
                              {clerk.overrideRate > 20 ? 'HIGH' : clerk.overrideRate > 10 ? 'MEDIUM' : 'LOW'}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-1">
                              {clerk.overrides} overrides out of {clerk.totalProcessed} processed
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Recent Actions Timeline */}
                      <div className="space-y-4">
                        <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Recent Actions</p>
                        <div className="space-y-3">
                          {clerk.recentActions.length === 0 ? (
                            <p className="text-sm text-slate-400 italic">No recent actions recorded.</p>
                          ) : clerk.recentActions.map((action: any, i: number) => (
                            <div key={i} className="flex items-start gap-3">
                              <div className={`mt-2 w-2 h-2 rounded-full flex-shrink-0 ${
                                action.status === 'Verified_by_Clerk' ? 'bg-emerald-500' :
                                action.status === 'Rejected'          ? 'bg-red-500' :
                                action.status === 'Verified_by_AI'   ? 'bg-blue-500' : 'bg-slate-300'
                              }`} />
                              <div className="flex-1 bg-slate-50 rounded-xl p-3 border border-slate-100">
                                <div className="flex justify-between items-start">
                                  <span className="text-xs font-black text-slate-800">{action.action}</span>
                                  <span className="text-[10px] text-slate-400 font-bold ml-2">#{action.appId}</span>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                  {new Date(action.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                  {' · '}
                                  {new Date(action.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                                {action.reason && action.reason !== 'N/A' && (
                                  <p className="text-[10px] text-slate-400 mt-1 italic line-clamp-1">
                                    {'"'}{action.reason.slice(0, 60)}{'"'}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Comparative Bar Chart */}
          <div className="bg-white rounded-[2rem] p-10 border border-slate-200 shadow-sm">
            <h2 className="text-xl font-black text-slate-900 mb-1">Comparative Throughput</h2>
            <p className="text-slate-500 text-sm mb-8">Total processed vs approvals vs rejections vs overrides</p>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={clerkData.clerks.map((c: any) => ({
                    name: c.name.split(' ')[0],
                    Processed: c.totalProcessed,
                    Approved:  c.approved,
                    Rejected:  c.rejected,
                    Overrides: c.overrides,
                  }))}
                  barGap={4}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" fontSize={12} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontWeight: 700 }} />
                  <YAxis fontSize={12} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontWeight: 600 }} />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '12px' }} />
                  <Bar dataKey="Processed" fill="#1B4332" radius={[6,6,0,0]} barSize={28} />
                  <Bar dataKey="Approved"  fill="#40916C" radius={[6,6,0,0]} barSize={28} />
                  <Bar dataKey="Rejected"  fill="#EF4444" radius={[6,6,0,0]} barSize={28} />
                  <Bar dataKey="Overrides" fill="#F59E0B" radius={[6,6,0,0]} barSize={28} />
                  <Legend verticalAlign="top" align="right" height={36} iconType="circle" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
