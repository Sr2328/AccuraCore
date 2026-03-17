import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, getRoleDashboardPath } from "@/lib/auth-context";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

const IconUser = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 15, height: 15 }}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
const IconLock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 15, height: 15 }}>
    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const IconEyeOff = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 15, height: 15 }}>
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);
const IconEyeOn = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 15, height: 15 }}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const IconAlert = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 14, height: 14, flexShrink: 0 }}>
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const Login = () => {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (auth.user) navigate(getRoleDashboardPath(auth.user.role), { replace: true });
  }, [auth.user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const success = await auth.login(userId, password);
    setLoading(false);
    if (!success) setError("Invalid User ID or password. Please try again.");
  };

  if (auth.loading) {
    return (
      <div style={{ minHeight: "100svh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid #f0f0f0", borderTopColor: "#FFD700", animation: "spin 0.7s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,400&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .ac-root {
          min-height: 100svh;
          display: flex;
          align-items: stretch;
          background: #ffffff;
          font-family: 'DM Sans', sans-serif;
          position: relative;
          overflow: hidden;
        }

        /* white ambient blobs */
        .ac-root::before {
          content: '';
          position: fixed;
          top: -140px; left: -140px;
          width: 520px; height: 520px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,215,0,0.09) 0%, transparent 68%);
          pointer-events: none;
          z-index: 0;
        }
        .ac-root::after {
          content: '';
          position: fixed;
          bottom: -110px; right: 380px;
          width: 400px; height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(0,0,0,0.03) 0%, transparent 68%);
          pointer-events: none;
          z-index: 0;
        }

        /* ─── LEFT PANEL ─── */
        .ac-left {
          flex: 0 0 460px;
          min-height: 100svh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 52px 52px 52px 52px;
          background: #ffffff;
          position: relative;
          z-index: 2;
          box-shadow: 6px 0 48px rgba(0,0,0,0.055);
          animation: slideLeft 0.5s cubic-bezier(.22,1,.36,1) both;
        }

        /* ─── RIGHT PANEL ─── */
        .ac-right {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 52px 48px;
          background: #FAFAF8;
          position: relative;
          z-index: 1;
          overflow: hidden;
          animation: slideRight 0.55s cubic-bezier(.22,1,.36,1) both 0.08s;
        }

        .ac-right::before {
          content: '';
          position: absolute;
          top: -100px; right: -100px;
          width: 380px; height: 380px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,215,0,0.11) 0%, transparent 65%);
          pointer-events: none;
        }
        .ac-right::after {
          content: '';
          position: absolute;
          bottom: -80px; left: -80px;
          width: 320px; height: 320px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(0,0,0,0.025) 0%, transparent 70%);
          pointer-events: none;
        }

        /* Brand */
        .brand-row {
          display: flex;
          align-items: center;
          gap: 13px;
          margin-bottom: 38px;
        }
        .brand-icon {
          width: 50px; height: 50px;
          border-radius: 15px;
          background: #1A1A1A;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          position: relative;
          overflow: hidden;
        }
        .brand-icon::after {
          content: '';
          position: absolute;
          top: -6px; right: -6px;
          width: 17px; height: 17px;
          background: #FFD700;
          border-radius: 50%;
        }
        .brand-name {
          font-family: 'Syne', sans-serif;
          font-size: 19px;
          font-weight: 800;
          color: #1A1A1A;
          letter-spacing: -0.4px;
          line-height: 1.1;
        }
        .brand-name span { color: #E6A800; }
        .brand-sub {
          font-size: 10.5px;
          color: #BBBBBB;
          margin-top: 3px;
          letter-spacing: 0.2px;
        }

        /* Headline */
        .ac-headline { margin-bottom: 28px; }
        .ac-headline h1 {
          font-family: 'Syne', sans-serif;
          font-size: clamp(24px, 2.8vw, 28px);
          font-weight: 700;
          color: #1A1A1A;
          letter-spacing: -0.5px;
          line-height: 1.2;
        }
        .ac-headline p {
          font-size: 13.5px;
          color: #BBBBBB;
          margin-top: 6px;
          font-weight: 400;
        }

        .ac-divider {
          height: 1px;
          background: #F2F2F2;
          margin-bottom: 26px;
        }

        /* Inputs */
        .ac-group { margin-bottom: 16px; }
        .ac-label {
          display: block;
          font-size: 10.5px;
          font-weight: 600;
          color: #AAAAAA;
          letter-spacing: 0.55px;
          text-transform: uppercase;
          margin-bottom: 7px;
        }
        .ac-input-wrap { position: relative; display: flex; align-items: center; }
        .ac-ico {
          position: absolute; left: 14px;
          color: #D0D0D0;
          display: flex; align-items: center;
          transition: color 0.2s;
          z-index: 1; pointer-events: none;
        }
        .ac-ico.on { color: #E6A800; }

        .ac-input {
          width: 100%;
          height: 48px;
          border-radius: 12px;
          border: 1.5px solid #EEEEEE;
          background: #FAFAFA;
          padding: 0 44px 0 42px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          color: #1A1A1A;
          outline: none;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
          -webkit-appearance: none;
        }
        .ac-input::placeholder { color: #D4D4D4; font-size: 13px; }
        .ac-input:focus {
          border-color: #FFD700;
          background: #FFFEF4;
          box-shadow: 0 0 0 4px rgba(255,215,0,0.09);
        }
        .ac-input.ac-err {
          border-color: #FF5555;
          background: #FFF8F8;
        }

        .ac-eye {
          position: absolute; right: 13px;
          background: none; border: none; cursor: pointer;
          color: #CCCCCC; display: flex; align-items: center;
          padding: 4px; border-radius: 6px; transition: color 0.2s;
        }
        .ac-eye:hover { color: #888; }

        .ac-error {
          display: flex; align-items: center; gap: 8px;
          background: #FFF2F2; border: 1px solid #FFD0D0;
          border-radius: 11px; padding: 10px 13px;
          color: #CC0000; font-size: 12.5px; font-weight: 500;
          margin-bottom: 14px;
        }

        .ac-btn {
          width: 100%; height: 50px;
          border-radius: 13px;
          background: #1A1A1A;
          color: #FFD700;
          font-family: 'Syne', sans-serif;
          font-weight: 700; font-size: 14px;
          letter-spacing: 0.4px;
          border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
          margin-top: 8px;
        }
        .ac-btn:hover:not(:disabled) {
          background: #2C2C2C;
          box-shadow: 0 8px 28px rgba(0,0,0,0.16);
          transform: translateY(-1px);
        }
        .ac-btn:active:not(:disabled) { transform: translateY(0); }
        .ac-btn:disabled { opacity: 0.65; cursor: not-allowed; }

        .ac-spin {
          width: 17px; height: 17px;
          border: 2.5px solid rgba(255,215,0,0.3);
          border-top-color: #FFD700;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        .ac-hint {
          margin-top: 20px;
          padding: 13px 15px;
          background: #F8F8F6;
          border-radius: 13px;
          border: 1px solid #EDEDED;
        }
        .ac-hint p { font-size: 12px; color: #BBBBBB; line-height: 1.55; }
        .ac-hint strong { color: #888; font-weight: 500; }

        .badge-row { display: flex; gap: 6px; margin-top: 9px; flex-wrap: wrap; }
        .bdg {
          font-size: 9px; font-weight: 700;
          padding: 3px 9px; border-radius: 20px;
          letter-spacing: 0.4px; text-transform: uppercase;
          font-family: 'Syne', sans-serif;
        }
        .bdg-y { background: #FFF5CC; color: #A07800; }
        .bdg-g { background: #F0F0F0; color: #888; }

        /* Right content */
        .ac-lottie {
          width: 100%; max-width: 440px;
          filter: drop-shadow(0 16px 48px rgba(0,0,0,0.07));
          position: relative; z-index: 1;
        }

        .ac-right-text {
          text-align: center;
          max-width: 420px;
          margin-top: 8px;
          position: relative; z-index: 1;
        }
        .ac-right-text h2 {
          font-family: 'Syne', sans-serif;
          font-size: clamp(20px, 2.6vw, 28px);
          font-weight: 700;
          color: #1A1A1A;
          letter-spacing: -0.5px;
          line-height: 1.3;
        }
        .ac-right-text h2 span { color: #E6A800; }
        .ac-right-text p {
          font-size: 13.5px;
          color: #BBBBBB;
          line-height: 1.7;
          margin-top: 10px;
          font-weight: 300;
          font-style: italic;
        }

        .ac-dots {
          display: flex; gap: 7px; justify-content: center;
          margin-top: 22px; position: relative; z-index: 1;
        }
        .ac-dot { width: 7px; height: 7px; border-radius: 50%; background: #E4E4E4; }
        .ac-dot.a { background: #FFD700; width: 22px; border-radius: 4px; transition: width 0.3s; }

        /* Responsive */
        @media (max-width: 860px) {
          .ac-left { flex: 0 0 400px; padding: 44px 36px; }
        }
        @media (max-width: 720px) {
          .ac-root { flex-direction: column; }
          .ac-left {
            flex: none;
            min-height: unset;
            padding: 36px 24px 32px;
            box-shadow: 0 6px 32px rgba(0,0,0,0.06);
          }
          .ac-right {
            flex: none;
            padding: 32px 24px 44px;
          }
          .ac-lottie { max-width: 260px; }
        }

        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideLeft {
          from { opacity: 0; transform: translateX(-24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideRight {
          from { opacity: 0; transform: translateX(24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <div className="ac-root">

        {/* ── LEFT: Login ── */}
        <div className="ac-left">

          <div className="brand-row">
            <div className="brand-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#FFD700" style={{ position: "relative", zIndex: 1 }}>
                <path d="M2 20h20v2H2v-2zm2-8v8H2V12l4-4v4l4-4v4l4-4v8h-2V8.83l-2 2V14h-2v-3.17l-2 2V20H4v-8z" />
                <path d="M14 6V2h6v4h-2V4h-2v2h-2zm2 2h2v10h-2V8z" />
              </svg>
            </div>
            <div>
              <div className="brand-name">ACCURA <span>CORE</span></div>
              <div className="brand-sub">Engineering Pvt. Ltd. — ERP System</div>
            </div>
          </div>

          <div className="ac-headline">
            <h1>Welcome back 👋</h1>
            <p>Sign in to your workspace to continue</p>
          </div>

          <div className="ac-divider" />

          <form onSubmit={handleLogin}>
            <div className="ac-group">
              <label className="ac-label" htmlFor="userId">User ID or Email</label>
              <div className="ac-input-wrap">
                <span className={`ac-ico${focused === "uid" ? " on" : ""}`}><IconUser /></span>
                <input
                  id="userId"
                  className={`ac-input${error ? " ac-err" : ""}`}
                  placeholder="AccuraRajesh001 or admin@accura.in"
                  value={userId}
                  onChange={(e) => { setUserId(e.target.value); setError(""); }}
                  onFocus={() => setFocused("uid")}
                  onBlur={() => setFocused(null)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="ac-group">
              <label className="ac-label" htmlFor="password">Password</label>
              <div className="ac-input-wrap">
                <span className={`ac-ico${focused === "pw" ? " on" : ""}`}><IconLock /></span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className={`ac-input${error ? " ac-err" : ""}`}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  onFocus={() => setFocused("pw")}
                  onBlur={() => setFocused(null)}
                  autoComplete="current-password"
                  required
                />
                <button type="button" className="ac-eye" onClick={() => setShowPassword((s) => !s)} tabIndex={-1}>
                  {showPassword ? <IconEyeOff /> : <IconEyeOn />}
                </button>
              </div>
            </div>

            {error && (
              <div className="ac-error">
                <IconAlert /><span>{error}</span>
              </div>
            )}

            <button type="submit" className="ac-btn" disabled={loading}>
              {loading ? <><div className="ac-spin" /><span>Signing in…</span></> : "Sign In →"}
            </button>
          </form>

          <div className="ac-hint">
            <p><strong>Need access?</strong> All accounts are managed by your system administrator. Contact IT support for credentials or resets.</p>
            <div className="badge-row">
              <span className="bdg bdg-y">ERP v2.0</span>
              <span className="bdg bdg-g">IMT Manesar · Sector-8</span>
              <span className="bdg bdg-g">Gurugram, HR</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Lottie + Copy ── */}
        <div className="ac-right">
          <div className="ac-lottie">
            <DotLottieReact
              src="https://lottie.host/b875601d-7b37-4816-8958-eb736a100f68/gmgOvn9nEm.lottie"
              loop
              autoplay
            />
          </div>

          <div className="ac-right-text">
            <h2>
              Precision at the <span>Core</span><br />of Every Operation
            </h2>
            <p>
              Centralise manufacturing workflows — from purchase orders and production planning to inventory control and dispatch — all in one unified platform built for Accura.
            </p>
          </div>

          <div className="ac-dots">
            <div className="ac-dot a" />
            <div className="ac-dot" />
            <div className="ac-dot" />
          </div>
        </div>

      </div>
    </>
  );
};

export default Login;