'use client'

import { useActionState } from 'react'
import { login } from './actions'
import { toast } from 'sonner'
import { useEffect } from 'react'
import { Loader2, ShieldCheck } from 'lucide-react'

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, null)

  useEffect(() => {
    if (state?.error) {
      toast.error(state.error)
    }
  }, [state])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8faf9] relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#1B4332] rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#2D6A4F] rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md p-8 relative z-10">
        <div className="bg-white rounded-2xl shadow-[0_12px_40px_rgba(27,67,50,0.06)] p-8 border border-[#e1e3e2]">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-[#1B4332] p-3 rounded-xl">
                <ShieldCheck className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-[#191c1c] tracking-tight">PRAGATI AI</h1>
            <p className="text-[#414844] text-sm mt-1 uppercase tracking-widest font-medium">Government of Maharashtra</p>
            <p className="text-[#717973] text-xs mt-4">Officer & Clerk Authentication</p>
          </div>

          <form action={formAction} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[#414844] mb-1.5" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full px-4 py-2.5 bg-[#f2f4f3] border-none rounded-lg focus:ring-2 focus:ring-[#1B4332] transition-all outline-none text-[#191c1c]"
                placeholder="officer@pragati.gov.in"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#414844] mb-1.5" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full px-4 py-2.5 bg-[#f2f4f3] border-none rounded-lg focus:ring-2 focus:ring-[#1B4332] transition-all outline-none text-[#191c1c]"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-[#1B4332] text-white py-3 rounded-lg font-semibold hover:bg-[#012d1d] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#1B4332]/20 disabled:opacity-70"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                'Login to Dashboard'
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[#f2f4f3] text-center space-y-2">
            <a href="#" className="text-sm text-[#1B4332] hover:underline block font-medium">
              Forgot Password?
            </a>
            <p className="text-xs text-[#717973]">
              Need Access? <a href="#" className="text-[#1B4332] hover:underline font-medium">Contact Administrator</a>
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-[#717973] text-[10px] uppercase tracking-[0.2em]">
            Digital India • Maharashtra State IT Cell
          </p>
        </div>
      </div>
    </div>
  )
}
