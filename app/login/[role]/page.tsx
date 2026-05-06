'use client'

import { useActionState, use, useState, useEffect } from 'react'
import { login, signup } from '../actions'
import { toast } from 'sonner'
import { Loader2, ShieldCheck, Sprout, UserPlus } from 'lucide-react'

export default function LoginPage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = use(params)
  const isFarmer = role === 'farmer'

  const [isSignUp, setIsSignUp] = useState(false)
  const [clientError, setClientError] = useState<string | null>(null)

  // We use the same formData structure for both, but action differs based on isSignUp
  const [loginState, loginAction, isLoginPending] = useActionState(login, null)
  const [signupState, signupAction, isSignupPending] = useActionState(signup, null)

  const isPending = isLoginPending || isSignupPending
  const currentState = isSignUp ? signupState : loginState

  const handleSubmit = (formData: FormData) => {
    setClientError(null)
    const email = formData.get('email')
    const password = formData.get('password')

    if (!email || !password) {
      setClientError("Please enter your credentials")
      toast.error("Please enter your credentials")
      return
    }

    if (isSignUp) {
      const fullName = formData.get('fullName')
      if (!fullName) {
        setClientError("Please enter your full name")
        return
      }
      // Force role to farmer if signing up here
      if (isFarmer) {
        formData.set('role', 'farmer')
      }
      signupAction(formData)
    } else {
      loginAction(formData)
    }
  }

  useEffect(() => {
    if (currentState?.error) {
      toast.error(currentState.error)
      setClientError(currentState.error)
    }
  }, [currentState])

  // UI Theme based on role
  const themeColor = isFarmer ? '#059669' : '#1B4332' // Emerald for farmer, Slate/Dark Green for official
  const icon = isFarmer ? <Sprout className="w-8 h-8 text-white" /> : <ShieldCheck className="w-8 h-8 text-white" />
  const title = isFarmer ? 'PRAGATI AI : Farmer Portal' : 'PRAGATI AI : Command Center'
  const subtitle = isFarmer ? 'Farmer Authentication & Registration' : 'Officer & Clerk Authentication'
  const emailPlaceholder = isFarmer ? 'farmer@pragati.gov.in' : 'officer@pragati.gov.in'

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8faf9] relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#1B4332] rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#2D6A4F] rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md p-8 relative z-10 animate-in fade-in zoom-in-95 duration-300">
        <div className="bg-white rounded-3xl shadow-[0_12px_40px_rgba(27,67,50,0.06)] p-8 border border-[#e1e3e2]">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-2xl shadow-lg" style={{ backgroundColor: themeColor }}>
                {icon}
              </div>
            </div>
            <h1 className="text-2xl font-black text-[#191c1c] tracking-tight">{title}</h1>
            <p className="text-[#414844] text-[10px] mt-1.5 uppercase tracking-widest font-bold">Government of Maharashtra</p>
            <div className="mt-4 inline-block bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              <p className="text-slate-600 text-xs font-semibold">{isSignUp ? 'Create New Account' : subtitle}</p>
            </div>
          </div>

          <form action={handleSubmit} className="space-y-4">
            {clientError && (
              <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />
                {clientError}
              </div>
            )}

            {isSignUp && (
              <div className="animate-in slide-in-from-top-2 fade-in duration-200 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#414844] mb-1.5 uppercase tracking-wider" htmlFor="fullName">
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required
                    className="w-full px-4 py-3 bg-[#f2f4f3] border-none rounded-xl focus:ring-2 transition-all outline-none text-[#191c1c] font-medium"
                    style={{ '--tw-ring-color': themeColor } as any}
                    placeholder="e.g. Tukaram Patil"
                  />
                </div>

                {!isFarmer && (
                  <div>
                    <label className="block text-xs font-bold text-[#414844] mb-1.5 uppercase tracking-wider" htmlFor="role">
                      Official Role
                    </label>
                    <select
                      id="role"
                      name="role"
                      required
                      className="w-full px-4 py-3 bg-[#f2f4f3] border-none rounded-xl focus:ring-2 transition-all outline-none text-[#191c1c] font-medium appearance-none"
                      style={{ '--tw-ring-color': themeColor } as any}
                    >
                      <option value="krushi_sahayak">Krushi Sahayak</option>
                      <option value="talathi">Talathi</option>
                      <option value="gram_sevak">Gram Sevak</option>
                      <option value="tao">Taluka Agriculture Officer (TAO)</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#414844] mb-1.5 uppercase tracking-wider" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full px-4 py-3 bg-[#f2f4f3] border-none rounded-xl focus:ring-2 transition-all outline-none text-[#191c1c] font-medium"
                style={{ '--tw-ring-color': themeColor } as any}
                placeholder={emailPlaceholder}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#414844] mb-1.5 uppercase tracking-wider" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete={isSignUp ? "new-password" : "current-password"}
                className="w-full px-4 py-3 bg-[#f2f4f3] border-none rounded-xl focus:ring-2 transition-all outline-none text-[#191c1c] font-medium"
                style={{ '--tw-ring-color': themeColor } as any}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full text-white py-3.5 rounded-xl font-bold hover:brightness-90 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-70 mt-6"
              style={{ backgroundColor: themeColor, boxShadow: `0 10px 25px ${themeColor}30` }}
            >
              {isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : isSignUp ? (
                <>
                  <UserPlus className="w-5 h-5" />
                  Register Account
                </>
              ) : (
                'Secure Login'
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[#f2f4f3] text-center space-y-4">
            <button 
              onClick={() => {
                setIsSignUp(!isSignUp)
                setClientError(null)
              }}
              className="text-sm font-semibold hover:underline block w-full transition-colors"
              style={{ color: themeColor }}
            >
              {isSignUp ? "Already have an account? Login" : (isFarmer ? "New Farmer? Create Account" : "Register Official Account")}
            </button>

            {!isSignUp && (
              <div className="space-y-2">
                <a href="#" className="text-xs text-slate-500 hover:text-slate-800 transition-colors font-medium">
                  Forgot Password?
                </a>
                {!isFarmer && (
                  <p className="text-[11px] text-[#717973] font-medium">
                    Need Admin Access? <a href="#" className="font-bold hover:underline" style={{ color: themeColor }}>Contact IT Cell</a>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-slate-400 text-[9px] uppercase tracking-[0.25em] font-bold">
            Digital India • Maharashtra State IT Cell
          </p>
        </div>
      </div>
    </div>
  )
}
