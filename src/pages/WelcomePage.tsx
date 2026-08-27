import Spline from '@splinetool/react-spline';
import { useState } from 'react';
import {
  Shield, ArrowRight, Mail, Zap, Eye, EyeOff, Lock, Globe,
  UserPlus, ChevronLeft,
} from 'lucide-react';
import { TransparentLogo } from '@/components/TransparentLogo';
import { buildUser, type UserRole } from '@/contexts/AuthContext';

interface WelcomePageProps {
  onNavigate: (route: string, opts?: { demoMode?: boolean; role?: UserRole }) => void;
}

/* ─── User Registry ─── */
interface RegisteredUser {
  email: string;
  password: string;
  role: UserRole;
}

const USERS_DB: RegisteredUser[] = [
  { email: 'analyst@gmail.com', password: 'password', role: 'analyst' },
  { email: 'demouser1@gmail.com', password: 'password', role: 'user' },
  { email: 'demouser2@gmail.com', password: 'password', role: 'user' },
  { email: 'janvip2246@gmail.com', password: 'password', role: 'user' },
  { email: 'dharmikk566@gmail.com', password: 'password', role: 'user' },
  { email: 'raichuramanthan13@gmail.com', password: 'password', role: 'user' },
  { email: 'tirthmpatel25@gmail.com', password: 'password', role: 'user' },
  { email: 'manthank0306@gmail.com', password: 'password', role: 'user' },
];

/* ─── Auth hook (localStorage) ─── */
function useAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() =>
    localStorage.getItem('sentinel_auth') === 'true'
  );

  function login(email: string, password: string): { success: boolean; role?: UserRole; error?: string } {
    const e = email.trim().toLowerCase();
    const p = password.trim();

    // Check known users DB
    const known = USERS_DB.find((u) => u.email === e);
    if (known) {
      if (known.password !== p) {
        return { success: false, error: 'Incorrect password.' };
      }
      localStorage.setItem('sentinel_auth', 'true');
      localStorage.setItem('sentinel_user', known.email);
      localStorage.setItem('sentinel_user_role', known.role);
      setIsLoggedIn(true);
      return { success: true, role: known.role };
    }

    // Unknown users: treat as a new standard user (sign-up flow)
    if (e && p) {
      localStorage.setItem('sentinel_auth', 'true');
      localStorage.setItem('sentinel_user', email.trim());
      localStorage.setItem('sentinel_user_role', 'user');
      setIsLoggedIn(true);
      return { success: true, role: 'user' };
    }

    return { success: false, error: 'Please fill in all fields.' };
  }

  function logout() {
    localStorage.removeItem('sentinel_auth');
    localStorage.removeItem('sentinel_user');
    localStorage.removeItem('sentinel_user_role');
    setIsLoggedIn(false);
  }

  const userEmail = localStorage.getItem('sentinel_user') ?? '';
  return { isLoggedIn, login, logout, userEmail };
}

/* ─── Google icon ─── */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908C16.658 12.075 17.64 9.767 17.64 9.2z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}

/* ─── Apple icon ─── */
function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.32c.67-.82 1.13-1.96.99-3.12-1 .04-2.22.67-2.92 1.49-.63.73-1.18 1.9-1.03 3.05 1.12.09 2.37-.6 3.03-1.42z" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════
   Auth Modal — premium dark design
═══════════════════════════════════════════════════════════ */
interface AuthModalProps {
  initialMode?: 'login' | 'signup';
  onClose: () => void;
  onSuccess: (email: string, password: string) => void;
}

function AuthModal({ initialMode = 'login', onClose, onSuccess }: AuthModalProps) {
  const [tab, setTab] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    if (tab === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    onSuccess(email, password);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[360px] mx-4 rounded-3xl p-7 animate-slide-up"
        style={{
          background: 'rgba(18,18,26,0.97)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Back / close */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/8 transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Brand */}
        <div className="flex flex-col items-center mb-5 mt-2">
          <TransparentLogo src="/Logo-SentinelX.png" alt="SENTINEL-X" className="h-11 w-auto object-contain mb-2 drop-shadow-md" />
          <p className="text-[10px] text-gray-500 font-mono tracking-[0.2em] uppercase">Secure Access Portal</p>
        </div>

        {/* Tab switcher */}
        <div className="flex mb-6 border-b border-white/8">
          {(['login', 'signup'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(''); }}
              className="relative flex-1 pb-3 text-sm font-semibold transition-colors"
              style={{ color: tab === t ? '#ffffff' : 'rgba(255,255,255,0.35)' }}
            >
              {t === 'login' ? 'Sign In' : 'Sign Up'}
              {tab === t && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ background: 'linear-gradient(90deg, #06b6d4, #8b5cf6)' }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Email */}
          <div
            className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <Mail className="w-4 h-4 text-gray-500 shrink-0" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
            />
          </div>

          {/* Password */}
          <div
            className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <Lock className="w-4 h-4 text-gray-500 shrink-0" />
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="text-gray-600 hover:text-gray-400 transition-colors"
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Confirm password (signup only) */}
          {tab === 'signup' && (
            <div
              className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <Lock className="w-4 h-4 text-gray-500 shrink-0" />
              <input
                type={showPw ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password"
                className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
              />
            </div>
          )}

          {/* Forgot password */}
          {tab === 'login' && (
            <div className="flex justify-end">
              <button type="button" className="text-xs font-medium" style={{ color: '#06b6d4' }}>
                Forgot password?
              </button>
            </div>
          )}

          {error && <p className="text-red-400 text-xs">{error}</p>}

          {/* Primary CTA */}
          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl text-white font-bold text-sm mt-1 hover:opacity-90 active:opacity-80 transition-opacity"
            style={{
              background: 'linear-gradient(135deg, #06b6d4 0%, #6366f1 50%, #8b5cf6 100%)',
              boxShadow: '0 4px 24px rgba(99,102,241,0.4)',
            }}
          >
            {tab === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <span className="text-gray-600 text-xs">or</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
        </div>

        {/* OAuth buttons */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => onSuccess('user@google.com', 'google-oauth')}
            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl text-white text-sm font-medium transition-all hover:brightness-110"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
          >
            <GoogleIcon />
            Continue with Google
          </button>
          <button
            type="button"
            onClick={() => onSuccess('user@apple.com', 'apple-oauth')}
            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl text-white text-sm font-medium transition-all hover:brightness-110"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
          >
            <AppleIcon />
            Continue with Apple
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Feature shortcuts ─── */
const FEATURES = [
  { icon: Mail, label: 'Email Analyzer', desc: 'Deep-scan suspicious emails in seconds', route: 'email-analyzer', demo: true },
  { icon: Eye, label: 'Threat Intelligence', desc: 'Real-time IOC lookups & threat feeds', route: 'threat-intelligence', demo: false },
  { icon: Zap, label: 'Header Forensics', desc: 'Expose forged routing & sender spoofing', route: 'header-forensics', demo: false },
  { icon: Globe, label: 'Origin Investigation', desc: 'Geographic infrastructure & relay telemetry', route: 'origin-investigation', demo: false },
];

/* ═══════════════════════════════════════════════════════════════════
   WelcomePage
═══════════════════════════════════════════════════════════════════ */
export function WelcomePage({ onNavigate }: WelcomePageProps) {
  const { isLoggedIn, login } = useAuth();

  // null = closed | 'login' | 'signup' = open in that tab
  const [authModal, setAuthModal] = useState<'login' | 'signup' | null>(null);
  const [authError, setAuthError] = useState('');

  // pendingDemo tracks whether we should navigate to email-analyzer after successful login
  const [pendingDemo, setPendingDemo] = useState(false);

  function handleAnalyzeEmailClick() {
    if (isLoggedIn) {
      const storedRole = (localStorage.getItem('sentinel_user_role') as UserRole) || (localStorage.getItem('sentinel_user')?.includes('user') ? 'user' : 'analyst');
      const targetRoute = storedRole === 'user' ? 'submit-report' : 'email-analyzer';
      onNavigate(targetRoute, { role: storedRole, demoMode: false });
    } else {
      setPendingDemo(true);
      setAuthModal('login');
    }
  }

  function handleAuthSuccess(email: string, password: string) {
    const result = login(email, password);
    if (!result.success) {
      setAuthError(result.error ?? 'Login failed.');
      return;
    }
    const role = result.role ?? 'user';
    setAuthError('');
    setAuthModal(null);

    if (pendingDemo) {
      setPendingDemo(false);
      const target = role === 'analyst' ? 'email-analyzer' : 'submit-report';
      onNavigate(target, { role, demoMode: false });
    } else {
      const defaultRoute = role === 'analyst' ? 'dashboard' : 'submit-report';
      onNavigate(defaultRoute, { role, demoMode: false });
    }
  }

  function handleAuthClose() {
    setAuthModal(null);
    setPendingDemo(false);
    setAuthError('');
  }

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">

      {/* ══ LAYER 0 — Spline cinematic background (camera fully locked) ══ */}
      <div
        className="absolute inset-0 z-0"
        style={{ pointerEvents: 'none', filter: 'brightness(1.4) contrast(1.05)' }}
      >
        <Spline
          scene="https://prod.spline.design/M-YKjxruQiuxGBtY/scene.splinecode"
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Gradient overlay */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, transparent 40%, rgba(0,0,0,0.2) 70%, rgba(0,0,0,0.55) 100%)',
        }}
      />

      {/* ══ LAYER 1 — SENTINEL-X UI ══ */}
      <div className="absolute inset-0 z-10 flex flex-col" style={{ pointerEvents: 'none' }}>

        {/* ─ Top bar ─ */}
        <div className="flex items-center gap-3 px-7 pt-6" style={{ pointerEvents: 'auto' }}>
          <TransparentLogo src="/Logo-SentinelX.png" alt="SENTINEL-X" className="h-12 md:h-14 w-auto object-contain drop-shadow-xl" />

          {/* Auth controls — only shown when NOT logged in */}
          {!isLoggedIn && (
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setAuthModal('login')}
                className="text-xs text-gray-300 hover:text-white font-medium px-4 py-2 rounded-full hover:bg-white/8 transition-all"
              >
                Log In
              </button>
              <button
                onClick={() => setAuthModal('signup')}
                className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm text-white text-xs font-semibold px-4 py-2 rounded-full border border-white/20 hover:bg-white/18 hover:border-white/35 transition-all"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Sign Up
              </button>
            </div>
          )}
        </div>

        <div className="flex-1" />

        {/* ─ Hero ─ */}
        <div className="flex flex-col items-center text-center px-6 pb-10" style={{ pointerEvents: 'auto' }}>
          <h1
            className="text-5xl md:text-7xl font-black text-white leading-[1.05] tracking-tight mb-5 animate-slide-up"
            style={{ textShadow: '0 4px 48px rgba(0,0,0,0.6)' }}
          >
            AI-Powered
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-400">
              Email Defense
            </span>
          </h1>

          <p
            className="text-base md:text-lg text-gray-300 max-w-lg mb-10 leading-relaxed animate-fade-in"
            style={{ animationDelay: '0.15s', textShadow: '0 2px 16px rgba(0,0,0,0.8)' }}
          >
            Detect BEC, phishing &amp; advanced email threats with military-grade forensic analysis.
            Real-time intelligence. Zero blind spots.
          </p>

          {/* CTA row */}
          <div
            className="flex flex-col sm:flex-row items-center gap-4 animate-fade-in"
            style={{ animationDelay: '0.25s' }}
          >
            {/* ★ Analyze Email */}
            <button
              id="analyze-email-btn"
              onClick={handleAnalyzeEmailClick}
              className="glow-btn group relative flex items-center gap-2 text-white font-semibold text-sm px-8 py-4 rounded-full transition-all duration-200 hover:scale-105 active:scale-100"
              style={{
                background: 'linear-gradient(135deg, rgba(10,10,20,0.95) 0%, rgba(5,5,14,0.98) 100%)',
                boxShadow: '0 0 32px rgba(96,165,250,0.08)',
              }}
            >
              <Mail className="w-4 h-4 text-blue-300" />
              <span>Analyze Email</span>
              <ArrowRight className="w-4 h-4 text-blue-300 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* ─ Feature cards ─ */}
        <div className="px-5 pb-7" style={{ pointerEvents: 'auto' }}>
          <div className="max-w-3xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="group text-left bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-3.5 hover:bg-white/8 hover:border-white/25 transition-all duration-200 cursor-default select-none"
              >
                <div className="w-7 h-7 rounded-lg bg-white/8 flex items-center justify-center mb-2.5 group-hover:bg-white/15 transition-colors">
                  <Icon className="w-3.5 h-3.5 text-gray-400" />
                </div>
                <p className="text-gray-200 text-xs font-medium mb-0.5">{label}</p>
                <p className="text-gray-600 text-[11px] leading-snug">{desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Auth modal ── */}
      {authModal && (
        <AuthModal
          initialMode={authModal}
          onClose={handleAuthClose}
          onSuccess={handleAuthSuccess}
        />
      )}
      {/* Show auth error as an overlay toast if needed */}
      {authError && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-sm text-red-300 font-medium"
          style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', backdropFilter: 'blur(12px)' }}>
          {authError}
        </div>
      )}
    </div>
  );
}
