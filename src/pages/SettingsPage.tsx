import { useState, useEffect } from 'react';
import {
  User,
  Palette,
  Bell,
  Lock,
  Check,
  Sparkles,
  Key,
  Shield,
  RefreshCw,
  Copy,
  Save,
  Eye,
  EyeOff,
  Cpu,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { CLAUDE_KEY_STORAGE } from '@/services/claudeService';
import { clearEphemeralStorage } from '@/utils/storageKeys';
import { useAnalysis } from '@/contexts/AnalysisContext';
import { useAuth, deriveInitials, getSavedDisplayName } from '@/contexts/AuthContext';
import { useTickets } from '@/contexts/TicketContext';
import { SupabaseDataService } from '@/services/supabaseDataService';
import analystAvatar from '@/analyst.png';

/* ─── Slide-in entrance wrapper ─── */
function SlideIn({
  children,
  delay = 0,
  direction = 'up',
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  direction?: 'up' | 'left' | 'right' | 'down';
  className?: string;
}) {
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVis(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  const from =
    direction === 'left'
      ? 'translateX(-36px)'
      : direction === 'right'
      ? 'translateX(36px)'
      : direction === 'down'
      ? 'translateY(-20px)'
      : 'translateY(24px)';
  return (
    <div
      className={className}
      style={{
        opacity: vis ? 1 : 0,
        transform: vis ? 'none' : from,
        transition: 'opacity .5s cubic-bezier(.22,1,.36,1), transform .5s cubic-bezier(.22,1,.36,1)',
      }}
    >
      {children}
    </div>
  );
}

type TabType = 'profile' | 'appearance' | 'notifications' | 'privacy' | 'data' | 'ai-engine';

interface SettingsTabConfig {
  id: TabType;
  label: string;
  icon: LucideIcon;
  analystOnly?: boolean;
}

const TABS: SettingsTabConfig[] = [
  { id: 'profile',       label: 'Profile',       icon: User },
  { id: 'appearance',    label: 'Appearance',    icon: Palette },
  { id: 'notifications', label: 'Notifications', icon: Bell,      analystOnly: true },
  { id: 'privacy',       label: 'Privacy',       icon: Lock,      analystOnly: true },
  { id: 'data',          label: 'Data Cache',    icon: RefreshCw, analystOnly: true },
  { id: 'ai-engine',     label: 'AI Engine',     icon: Cpu,       analystOnly: true },
];

export function SettingsPage({ userRole }: { onResetCache?: () => void; userRole?: string | null }) {
  const { resetActiveAnalysis } = useAnalysis();
  const { currentUser, updateUserProfile } = useAuth();
  const isUser = userRole === 'user';

  const visibleTabs = isUser ? TABS.filter((t) => !t.analystOnly) : TABS;

  const [activeTab, setActiveTab] = useState<TabType>('profile');

  /* Profile state */
  const [displayName, setDisplayName] = useState(() => {
    const activeEmail = (currentUser?.email || localStorage.getItem('sentinel_user') || '').trim().toLowerCase();
    return currentUser?.displayName || getSavedDisplayName(activeEmail) || activeEmail.split('@')[0] || 'User';
  });
  const [email, setEmail] = useState(() => currentUser?.email || localStorage.getItem('sentinel_user') || '');
  const [bio, setBio] = useState(() => currentUser?.bio || (userRole === 'analyst' ? 'Cybersecurity Analyst & SOC Lead specializing in SENTINEL-X forensic investigation and threat correlation.' : 'Standard user with active email threat monitoring.'));
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveMessage, setSaveMessage] = useState('Profile Saved!');

  // Sync state if currentUser changes
  useEffect(() => {
    if (currentUser?.displayName) {
      setDisplayName(currentUser.displayName);
    }
    if (currentUser?.email) {
      setEmail(currentUser.email);
    }
    if (currentUser?.bio) {
      setBio(currentUser.bio);
    }
  }, [currentUser?.displayName, currentUser?.email, currentUser?.bio]);

  /* Toggles & Settings state */
  const [themePreset, setThemePreset] = useState('Dark Cyber');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [criticalAlerts, setCriticalAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [glowEffects, setGlowEffects] = useState(true);
  const [apiTokenCopied, setApiTokenCopied] = useState(false);

  /* AI Engine (Gemini) state */
  const [claudeKey, setClaudeKey] = useState(() => localStorage.getItem(CLAUDE_KEY_STORAGE) ?? '');
  const [claudeKeySaved, setClaudeKeySaved] = useState(false);
  const [claudeKeyTesting, setClaudeKeyTesting] = useState(false);
  const [claudeKeyTestResult, setClaudeKeyTestResult] = useState<'ok' | 'fail' | null>(null);

  const { clearAllTickets } = useTickets();
  /* Cache reset states */
  const [sessionCleared, setSessionCleared] = useState(false);
  const [ticketsCleared, setTicketsCleared] = useState(false);

  // Sync settings (theme, toggles, keys) from Supabase in the background
  useEffect(() => {
    let active = true;
    const targetEmail = (currentUser?.email || email || '').trim().toLowerCase();
    if (targetEmail) {
      SupabaseDataService.fetchSettings(targetEmail, (userRole as any) || 'user').then((s) => {
        if (active && s) {
          setThemePreset(s.themePreset || 'Dark Cyber');
          setAnimationsEnabled(s.animationsEnabled ?? true);
          setGlowEffects(s.glowEffects ?? true);
          setEmailNotifications(s.emailNotifications ?? true);
          setCriticalAlerts(s.criticalAlerts ?? true);
          setWeeklyDigest(s.weeklyDigest ?? false);
          if (s.customAiKey) setClaudeKey(s.customAiKey);
        }
      });
    }
    return () => { active = false; };
  }, [currentUser?.email, email, userRole]);

  const handleSaveProfile = async () => {
    const targetEmail = (email || currentUser?.email || localStorage.getItem('sentinel_user') || 'user@sentinel.local').trim().toLowerCase();
    const role = (currentUser?.role || userRole || 'user') as 'analyst' | 'user';
    const newName = displayName.trim() || targetEmail.split('@')[0];
    const newBio = bio.trim();

    // 1. Synchronously update AuthContext so TopBar and Sidebar update immediately on click
    updateUserProfile({
      displayName: newName,
      bio: newBio,
      email: targetEmail,
      role,
    });

    // 2. Immediately cache in localStorage for instant persistence across pages/reloads
    try {
      const cachedProfile = {
        email: targetEmail,
        role,
        displayName: newName,
        bio: newBio,
        avatarUrl: currentUser?.avatarUrl,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(`sentinel_profile_${targetEmail}`, JSON.stringify(cachedProfile));
      localStorage.setItem('sentinel_user_display_name', newName);
      localStorage.setItem(`sentinel_user_display_name_${targetEmail}`, newName);
      window.dispatchEvent(new Event('storage'));
    } catch { /* ignore */ }

    setSaveMessage('Profile Saved!');
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);

    // 3. Persist to Supabase in background (resilient fallback)
    try {
      await SupabaseDataService.upsertProfile({
        email: targetEmail,
        role,
        displayName: newName,
        bio: newBio,
        avatarUrl: currentUser?.avatarUrl,
      });
    } catch (e) {
      console.warn('Supabase upsertProfile fallback saved locally:', e);
    }
  };

  const handleSyncSetting = (patch: Partial<{
    themePreset: string;
    animationsEnabled: boolean;
    glowEffects: boolean;
    emailNotifications: boolean;
    criticalAlerts: boolean;
    weeklyDigest: boolean;
    customAiKey: string;
  }>) => {
    const targetEmail = email || currentUser?.email || 'user@sentinel.local';
    const role = (currentUser?.role || userRole || 'user') as 'analyst' | 'user';

    SupabaseDataService.upsertSettings({
      userEmail: targetEmail,
      role,
      themePreset: patch.themePreset ?? themePreset,
      animationsEnabled: patch.animationsEnabled ?? animationsEnabled,
      glowEffects: patch.glowEffects ?? glowEffects,
      emailNotifications: patch.emailNotifications ?? emailNotifications,
      criticalAlerts: patch.criticalAlerts ?? criticalAlerts,
      weeklyDigest: patch.weeklyDigest ?? weeklyDigest,
      customAiKey: patch.customAiKey ?? claudeKey,
      activeAiModel: 'gemini-3.6-flash',
    }).catch((e) => console.warn('Supabase settings sync error:', e));
  };

  const handleCopyApiToken = () => {
    navigator.clipboard.writeText('stxl_live_8f92a1b4c7d2e5f8a3b6c9d1e4f7a2b5');
    setApiTokenCopied(true);
    setTimeout(() => setApiTokenCopied(false), 2000);
  };

  const handleSaveClaudeKey = () => {
    localStorage.setItem(CLAUDE_KEY_STORAGE, claudeKey.trim());
    handleSyncSetting({ customAiKey: claudeKey.trim() });
    setClaudeKeySaved(true);
    setClaudeKeyTestResult(null);
    setTimeout(() => setClaudeKeySaved(false), 2500);
  };

  const handleTestClaudeKey = async () => {
    const key = (claudeKey || import.meta.env.VITE_GEMINI_API_KEY || '').trim();
    if (!key || key === 'your_gemini_api_key_here') {
      setClaudeKeyTestResult('fail');
      return;
    }
    setClaudeKeyTesting(true);
    setClaudeKeyTestResult(null);
    let success = false;
    for (const m of ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-1.5-flash']) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: 'ping' }] }] }),
        });
        if (res.ok) {
          success = true;
          break;
        }
      } catch {
        // continue
      }
    }
    setClaudeKeyTestResult(success ? 'ok' : 'fail');
    setClaudeKeyTesting(false);
  };

  return (
    <div className="space-y-6" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Page Header ── */}
      <SlideIn delay={0} direction="down">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">System Settings</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Manage profile credentials, appearance themes, notification rules, and security keys
            </p>
          </div>
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl self-start sm:self-auto"
            style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)' }}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-xs font-semibold text-purple-300 font-mono">SYSTEM READY</span>
          </div>
        </div>
      </SlideIn>

      {/* ── Main Layout: Sidebar & Content Panel ── */}
      <SlideIn delay={80} direction="up">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* ── Left Sidebar Navigation ── */}
          <div className="lg:col-span-1">
            <div
              className="rounded-2xl p-3 space-y-1.5"
              style={{
                background: 'linear-gradient(145deg, #090b12 0%, #0c0f1a 100%)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}
            >
              {visibleTabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group text-left"
                    style={
                      active
                        ? {
                            background: 'linear-gradient(135deg, rgba(147,51,234,0.35) 0%, rgba(124,58,237,0.25) 100%)',
                            border: '1px solid rgba(168,85,247,0.45)',
                            boxShadow: '0 0 16px rgba(168,85,247,0.25)',
                          }
                        : {
                            background: 'transparent',
                            border: '1px solid transparent',
                          }
                    }
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className="w-4 h-4 transition-colors"
                        style={{ color: active ? '#c084fc' : '#9ca3af' }}
                      />
                      <span
                        className={`text-xs font-semibold ${
                          active ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'
                        }`}
                      >
                        {tab.label}
                      </span>
                    </div>
                    {active && (
                      <span className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.8)] shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Right Content Area ── */}
          <div className="lg:col-span-3">
            <div
              className="rounded-2xl p-7 min-h-[500px]"
              style={{
                background: 'linear-gradient(145deg, #090b12 0%, #0c0f1a 100%)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}
            >
              {/* ── 1. Profile Tab ── */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">Profile Information</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Personal identity credentials and operational focus
                    </p>
                  </div>

                  {/* Avatar Card */}
                  <div className="flex items-center gap-4">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white shrink-0 overflow-hidden"
                      style={{
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                        boxShadow: '0 0 25px rgba(139,92,246,0.4)',
                      }}
                    >
                      {currentUser?.role === 'analyst' ? (
                        <img src={analystAvatar} alt="Analyst" className="w-full h-full object-cover" />
                      ) : currentUser?.avatarUrl ? (
                        <img src={currentUser.avatarUrl} alt={displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        deriveInitials(displayName || currentUser?.displayName || email || 'User')
                      )}
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white">{displayName || currentUser?.displayName || 'User'}</h4>
                      <p className="text-xs text-gray-400 font-mono">
                        {userRole === 'analyst' ? 'Cybersecurity Analyst · Sentinel-X SOC' : 'Standard Organization User'}
                      </p>
                      <span className="inline-block mt-1 text-[10px] font-mono font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                        {userRole === 'analyst' ? 'ANALYST ACCOUNT' : 'USER ACCOUNT'}
                      </span>
                    </div>
                  </div>

                  {/* Form Inputs */}
                  <div className="space-y-4 pt-2">
                    {/* Display Name */}
                    <div>
                      <label className="block text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest mb-2">
                        DISPLAY NAME
                      </label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full rounded-xl px-4 py-3 text-xs text-white font-mono placeholder-gray-600 focus:outline-none transition-all"
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                      />
                    </div>

                    {/* Email (Read Only) */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">
                          EMAIL ADDRESS
                        </label>
                        <span className="flex items-center gap-1 text-[10px] font-mono font-semibold text-gray-500 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                          <Lock className="w-2.5 h-2.5 text-gray-400" />
                          LOCKED
                        </span>
                      </div>
                      <input
                        type="email"
                        value={email || currentUser?.email || localStorage.getItem('sentinel_user') || ''}
                        readOnly
                        disabled
                        className="w-full rounded-xl px-4 py-3 text-xs text-gray-400 font-mono cursor-not-allowed select-none focus:outline-none transition-all"
                        style={{
                          background: 'rgba(255,255,255,0.015)',
                          border: '1px solid rgba(255,255,255,0.05)',
                        }}
                      />
                      <p className="text-[10px] text-gray-500 font-mono mt-1.5">
                        Account email is tied to your authentication credentials and cannot be changed.
                      </p>
                    </div>

                    {/* Bio */}
                    <div>
                      <label className="block text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest mb-2">
                        BIO / ROLE FOCUS
                      </label>
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={4}
                        placeholder="Describe your security focus or operational role..."
                        className="w-full rounded-xl p-4 text-xs text-white font-mono placeholder-gray-600 focus:outline-none resize-none transition-all scrollbar-thin"
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                      />
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="pt-2 flex items-center gap-3">
                    <button
                      onClick={handleSaveProfile}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:scale-105"
                      style={{
                        background: 'linear-gradient(135deg, rgba(168,85,247,0.4), rgba(124,58,237,0.4))',
                        border: '1px solid rgba(168,85,247,0.5)',
                        boxShadow: '0 0 20px rgba(168,85,247,0.25)',
                      }}
                    >
                      {savedSuccess ? <Check className="w-4 h-4 text-green-400" /> : <Save className="w-4 h-4" />}
                      {savedSuccess ? saveMessage : 'Save Changes'}
                    </button>
                  </div>
                </div>
              )}

              {/* ── 2. Appearance Tab ── */}
              {activeTab === 'appearance' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">Appearance Settings</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Customize interface theme and animation behavior</p>
                  </div>

                  <div className="space-y-4">
                    <ToggleRow
                      label="SlideIn Entrance Animations"
                      detail="Staggered entrance animations on page navigation"
                      checked={animationsEnabled}
                      onChange={() => {
                        const next = !animationsEnabled;
                        setAnimationsEnabled(next);
                        handleSyncSetting({ animationsEnabled: next });
                      }}
                    />
                    <ToggleRow
                      label="Neon Glow Effects"
                      detail="Glow box shadows on active indicators and metrics"
                      checked={glowEffects}
                      onChange={() => {
                        const next = !glowEffects;
                        setGlowEffects(next);
                        handleSyncSetting({ glowEffects: next });
                      }}
                    />
                  </div>

                  <div className="pt-4 border-t border-white/10">
                    <h4 className="text-xs font-mono font-bold text-gray-500 uppercase tracking-widest mb-3">
                      Theme Presets
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { name: 'Dark Cyber', color: '#8b5cf6' },
                        { name: 'Obsidian Black', color: '#3b82f6' },
                        { name: 'Cyberpunk Teal', color: '#14b8a6' },
                        { name: 'Crimson Red', color: '#ef4444' },
                      ].map((t) => {
                        const isPresetActive = themePreset === t.name;
                        return (
                          <div
                            key={t.name}
                            onClick={() => {
                              setThemePreset(t.name);
                              handleSyncSetting({ themePreset: t.name });
                            }}
                            className="rounded-xl p-3.5 flex items-center justify-between cursor-pointer transition-all hover:bg-white/5"
                            style={{
                              background: 'rgba(255,255,255,0.03)',
                              border: `1px solid ${isPresetActive ? t.color : 'rgba(255,255,255,0.06)'}`,
                            }}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="w-3 h-3 rounded-full" style={{ background: t.color }} />
                              <span className="text-xs text-white font-medium">{t.name}</span>
                            </div>
                            {isPresetActive && <Check className="w-3.5 h-3.5" style={{ color: t.color }} />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ── 3. Notifications Tab ── */}
              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">Notification Rules</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Configure alert notification dispatch thresholds</p>
                  </div>

                  <div className="space-y-4">
                    <ToggleRow
                      label="Critical Threat Push Alerts"
                      detail="Instant browser notification when a high/critical risk email is detected"
                      checked={criticalAlerts}
                      onChange={() => {
                        const next = !criticalAlerts;
                        setCriticalAlerts(next);
                        handleSyncSetting({ criticalAlerts: next });
                      }}
                    />
                    <ToggleRow
                      label="Email Incident Notifications"
                      detail="Dispatch automated email reports when a case status changes"
                      checked={emailNotifications}
                      onChange={() => {
                        const next = !emailNotifications;
                        setEmailNotifications(next);
                        handleSyncSetting({ emailNotifications: next });
                      }}
                    />
                    <ToggleRow
                      label="Weekly Intelligence Digest"
                      detail="Weekly summary report of top campaigns and IOCs"
                      checked={weeklyDigest}
                      onChange={() => {
                        const next = !weeklyDigest;
                        setWeeklyDigest(next);
                        handleSyncSetting({ weeklyDigest: next });
                      }}
                    />
                  </div>
                </div>
              )}

              {/* ── 4. Privacy Tab ── */}
              {activeTab === 'privacy' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">Privacy & Security</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Manage API keys and authentication tokens</p>
                  </div>

                  <div className="space-y-4">
                    <div
                      className="rounded-xl p-4"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest font-bold block mb-1">
                        SENTINEL API Key
                      </span>
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="password"
                          readOnly
                          value="stxl_live_8f92a1b4c7d2e5f8a3b6c9d1e4f7a2b5"
                          className="flex-1 bg-black/40 rounded-xl px-3.5 py-2 text-xs font-mono text-gray-300 border border-white/10 focus:outline-none"
                        />
                        <button
                          onClick={handleCopyApiToken}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-purple-300 font-mono transition-colors"
                          style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)' }}
                        >
                          {apiTokenCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                          {apiTokenCopied ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>

                    <div
                      className="rounded-xl p-4 flex items-center justify-between"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <Shield className="w-4 h-4 text-green-400" /> Two-Factor Authentication (2FA)
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">Hardware token or TOTP app enabled</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold text-green-400 bg-green-500/15 border border-green-500/30">
                        ENABLED
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── 5. Data Tab ── */}
              {activeTab === 'data' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">Data Management</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Manage session cache and synthetic forensic states</p>
                  </div>

                  <div className="space-y-3">
                    {/* ── Clear Analysis Session (ephemeral tier only) ── */}
                    <div
                      className="rounded-xl p-4 flex items-start justify-between gap-4"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <div>
                        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                          <RefreshCw className="w-3.5 h-3.5 text-amber-400" /> Clear Analysis Session
                        </h4>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Clears only the active forensic session (Email Analyzer, Header Forensics, Threat Intelligence, Origin Investigation). Dashboard, Reports, Alerts &amp; Campaigns are <span className="text-white font-semibold">not affected</span>.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          resetActiveAnalysis();
                          clearEphemeralStorage();
                          setSessionCleared(true);
                          setTimeout(() => setSessionCleared(false), 2500);
                        }}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-colors"
                        style={{
                          background: sessionCleared ? 'rgba(34,197,94,0.12)' : 'rgba(251,191,36,0.1)',
                          border: sessionCleared ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(251,191,36,0.25)',
                          color: sessionCleared ? '#4ade80' : '#fbbf24',
                        }}
                      >
                        {sessionCleared ? <Check className="w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        {sessionCleared ? 'Cleared!' : 'Clear Session'}
                      </button>
                    </div>

                    {/* ── Reload Synthetic Dataset ── */}
                    <div
                      className="rounded-xl p-4 flex items-center justify-between"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <div>
                        <h4 className="text-xs font-bold text-white">Reload Synthetic Dataset</h4>
                        <p className="text-xs text-gray-400 mt-0.5">Reset demo cases, campaigns, and indicators</p>
                      </div>
                      <button
                        onClick={() => window.location.reload()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-cyan-400 transition-colors"
                        style={{ background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.25)' }}
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Reload
                      </button>
                    </div>

                    {/* ── Purge User Requests & Tickets ── */}
                    <div
                      className="rounded-xl p-4 flex items-center justify-between"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <div>
                        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" /> Purge User Requests & Tickets
                        </h4>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Wipes all user-submitted tickets and investigation requests from local cache and remote database
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          if (window.confirm('Purge all user requests and tickets? This action cannot be undone.')) {
                            await clearAllTickets();
                            setTicketsCleared(true);
                            setTimeout(() => setTicketsCleared(false), 2500);
                          }
                        }}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-colors cursor-pointer"
                        style={{
                          background: ticketsCleared ? 'rgba(34,197,94,0.12)' : 'rgba(244,63,94,0.1)',
                          border: ticketsCleared ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(244,63,94,0.25)',
                          color: ticketsCleared ? '#4ade80' : '#f43f5e',
                        }}
                      >
                        {ticketsCleared ? <Check className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                        {ticketsCleared ? 'Purged!' : 'Purge Requests'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── 6. AI Engine Tab ── */}
              {activeTab === 'ai-engine' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                      <Cpu className="w-5 h-5 text-purple-400" />
                      AI Engine — Google Gemini
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Sentinel-X utilizes Google Gemini Flash for zero-latency email threat forensics.
                    </p>
                  </div>

                  {/* Info banner */}
                  <div
                    className="rounded-xl p-4 flex items-start gap-3"
                    style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)' }}
                  >
                    <Key className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-gray-300 leading-relaxed">
                      <span className="text-white font-semibold">Backend Integration:</span> Configured automatically through environment variables (<code className="font-mono text-purple-300">VITE_GEMINI_API_KEY</code>). End users do not need to provide their own keys.
                    </div>
                  </div>

                  {/* Active Model Status */}
                  <div
                    className="rounded-xl p-4"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <h4 className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest mb-2">Active Model & Backend</h4>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)] animate-pulse"
                        />
                        <span className="text-xs font-mono font-bold text-white">gemini-3.6-flash</span>
                        <span className="text-[11px] text-gray-400 ml-2">JSON Schema Enforcement Enabled</span>
                      </div>
                      <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20">
                        FREE TIER READY
                      </span>
                    </div>
                  </div>

                  {/* Test Connection */}
                  <div className="pt-2">
                    <button
                      onClick={handleTestClaudeKey}
                      disabled={claudeKeyTesting}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-cyan-300 transition-all hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.25)' }}
                    >
                      {claudeKeyTesting ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Cpu className="w-4 h-4" />
                      )}
                      {claudeKeyTesting ? 'Testing Engine…' : 'Test AI Connection'}
                    </button>

                    {/* Test result */}
                    {claudeKeyTestResult === 'ok' && (
                      <div
                        className="rounded-xl p-3.5 flex items-center gap-2.5 mt-3"
                        style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)' }}
                      >
                        <Check className="w-4 h-4 text-green-400 shrink-0" />
                        <span className="text-xs text-green-300 font-semibold">Gemini AI engine is live and operational.</span>
                      </div>
                    )}
                    {claudeKeyTestResult === 'fail' && (
                      <div
                        className="rounded-xl p-3.5 flex items-center gap-2.5 mt-3"
                        style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}
                      >
                        <Shield className="w-4 h-4 text-red-400 shrink-0" />
                        <span className="text-xs text-red-300 font-semibold">Could not reach Gemini. Please ensure <code className="font-mono text-red-200">VITE_GEMINI_API_KEY</code> is set in <code className="font-mono text-red-200">.env</code>.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </SlideIn>
    </div>
  );
}

function ToggleRow({
  label,
  detail,
  checked,
  onChange,
}: {
  label: string;
  detail: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div
      onClick={onChange}
      className="rounded-xl p-4 flex items-center justify-between cursor-pointer transition-all hover:bg-white/[0.04]"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div>
        <h4 className="text-xs font-bold text-white">{label}</h4>
        <p className="text-xs text-gray-400 mt-0.5">{detail}</p>
      </div>
      <div
        className="w-11 h-6 rounded-full relative transition-colors shrink-0"
        style={{ background: checked ? '#8b5cf6' : 'rgba(255,255,255,0.1)' }}
      >
        <div
          className="w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform"
          style={{ transform: checked ? 'translateX(22px)' : 'translateX(2px)' }}
        />
      </div>
    </div>
  );
}
