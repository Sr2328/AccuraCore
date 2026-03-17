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
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; overflow: hidden; }

        .ac-root {
          height: 100svh;
          display: flex;
          align-items: stretch;
          background: #ffffff;
          font-family: 'DM Sans', sans-serif;
          overflow: hidden;
        }

        /* ─── LEFT PANEL ─── */
        .ac-left {
          flex: 0 0 480px;
          height: 100svh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 40px 52px;
          background: #ffffff;
          position: relative;
          z-index: 2;
          overflow-y: auto;
          box-shadow: 8px 0 40px rgba(0,0,0,0.06);
        }
        .ac-left::before {
          content: '';
          position: absolute;
          top: -120px; left: -120px;
          width: 400px; height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,215,0,0.07) 0%, transparent 68%);
          pointer-events: none;
        }

        /* ─── RIGHT PANEL ─── */
        .ac-right {
          flex: 1;
          height: 100svh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 56px;
          background: #F9F9F6;
          position: relative;
          z-index: 1;
          overflow: hidden;
        }
        .ac-right::before {
          content: '';
          position: absolute;
          top: -100px; right: -100px;
          width: 420px; height: 420px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255,215,0,0.10) 0%, transparent 65%);
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
          display: flex; align-items: center; gap: 14px;
          margin-bottom: 36px;
        }
        .brand-icon {
          width: 52px; height: 52px;
          border-radius: 15px;
          background: #1A1A1A;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          position: relative; overflow: hidden;
        }
        .brand-icon::after {
          content: '';
          position: absolute; top: -6px; right: -6px;
          width: 18px; height: 18px;
          background: #FFD700; border-radius: 50%;
        }
        .brand-name {
          font-family: 'Syne', sans-serif;
          font-size: 20px; font-weight: 800;
          color: #1A1A1A; letter-spacing: -0.4px; line-height: 1.1;
        }
        .brand-name span { color: #D4990A; }
        .brand-meta {
          font-size: 11px; color: #BBBBBB;
          margin-top: 3px; letter-spacing: 0.1px; line-height: 1.4;
        }

        /* Headline */
        .ac-headline { margin-bottom: 28px; }
        .ac-headline h1 {
          font-family: 'Syne', sans-serif;
          font-size: 28px; font-weight: 700;
          color: #111111; letter-spacing: -0.5px; line-height: 1.2;
        }
        .ac-headline p {
          font-size: 14px; color: #AAAAAA;
          margin-top: 7px; font-weight: 400; line-height: 1.5;
        }

        .ac-divider { height: 1px; background: #EFEFEF; margin-bottom: 26px; }

        /* Form */
        .ac-group { margin-bottom: 18px; }
        .ac-label {
          display: block; font-size: 11px; font-weight: 600;
          color: #999999; letter-spacing: 0.6px;
          text-transform: uppercase; margin-bottom: 8px;
        }
        .ac-input-wrap { position: relative; display: flex; align-items: center; }
        .ac-ico {
          position: absolute; left: 14px; color: #CCCCCC;
          display: flex; align-items: center;
          transition: color 0.2s; z-index: 1; pointer-events: none;
        }
        .ac-ico.on { color: #D4990A; }
        .ac-input {
          width: 100%; height: 50px;
          border-radius: 12px; border: 1.5px solid #EBEBEB;
          background: #FAFAFA; padding: 0 44px 0 42px;
          font-family: 'DM Sans', sans-serif; font-size: 14px;
          color: #111111; outline: none;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
          -webkit-appearance: none;
        }
        .ac-input::placeholder { color: #CCCCCC; font-size: 13px; }
        .ac-input:focus {
          border-color: #FFD700; background: #FFFEF4;
          box-shadow: 0 0 0 4px rgba(255,215,0,0.10);
        }
        .ac-input.ac-err {
          border-color: #FF5555; background: #FFF8F8;
          box-shadow: 0 0 0 3px rgba(255,85,85,0.08);
        }
        .ac-eye {
          position: absolute; right: 13px;
          background: none; border: none; cursor: pointer;
          color: #CCCCCC; display: flex; align-items: center;
          padding: 5px; border-radius: 6px; transition: color 0.2s;
        }
        .ac-eye:hover { color: #777; }

        .ac-error {
          display: flex; align-items: center; gap: 8px;
          background: #FFF2F2; border: 1px solid #FFCCCC;
          border-radius: 11px; padding: 11px 14px;
          color: #CC2222; font-size: 13px; font-weight: 500;
          margin-bottom: 14px; line-height: 1.4;
        }

        .ac-btn {
          width: 100%; height: 52px; border-radius: 13px;
          background: #1A1A1A; color: #FFD700;
          font-family: 'Syne', sans-serif;
          font-weight: 700; font-size: 15px; letter-spacing: 0.4px;
          border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
          margin-top: 6px;
        }
        .ac-btn:hover:not(:disabled) {
          background: #2E2E2E;
          box-shadow: 0 10px 30px rgba(0,0,0,0.18);
          transform: translateY(-1px);
        }
        .ac-btn:active:not(:disabled) { transform: translateY(0); }
        .ac-btn:disabled { opacity: 0.65; cursor: not-allowed; }
        .ac-spin {
          width: 18px; height: 18px;
          border: 2.5px solid rgba(255,215,0,0.3);
          border-top-color: #FFD700; border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        /* Hint */
        .ac-hint {
          margin-top: 22px; padding: 14px 16px;
          background: #F7F7F5; border-radius: 13px;
          border: 1px solid #EBEBEB;
        }
        .ac-hint p { font-size: 12.5px; color: #AAAAAA; line-height: 1.6; }
        .ac-hint strong { color: #777777; font-weight: 500; }
        .badge-row { display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap; }
        .bdg {
          font-size: 9.5px; font-weight: 700;
          padding: 3px 10px; border-radius: 20px;
          letter-spacing: 0.4px; text-transform: uppercase;
          font-family: 'Syne', sans-serif;
        }
        .bdg-y { background: #FFF3BB; color: #9A7200; }
        .bdg-g { background: #EEEEEE; color: #777777; }

        /* Footer */
        .ac-footer {
          position: absolute; bottom: 18px; left: 0; right: 0;
          text-align: center; font-size: 11px; color: #CCCCCC;
          letter-spacing: 0.2px;
        }

        /* Right content */
        .ac-lottie-wrap {
          width: 100%; max-width: 560px;
          position: relative; z-index: 1;
          filter: drop-shadow(0 20px 60px rgba(0,0,0,0.07));
          flex-shrink: 0;
        }

        /* Internal tag */
        .internal-tag {
          display: inline-flex; align-items: center; gap: 7px;
          background: #FFF3BB; border: 1px solid #FFE066;
          border-radius: 20px; padding: 5px 14px;
          font-family: 'Syne', sans-serif;
          font-size: 11px; font-weight: 700;
          color: #9A7200; letter-spacing: 0.4px;
          text-transform: uppercase;
          margin-bottom: 16px;
          position: relative; z-index: 1;
        }
        .internal-tag-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #D4990A; flex-shrink: 0;
        }

        .ac-right-text {
          text-align: center; max-width: 500px;
          position: relative; z-index: 1;
        }
        .ac-right-text h2 {
          font-family: 'Syne', sans-serif;
          font-size: clamp(22px, 2.4vw, 30px); font-weight: 700;
          color: #111111; letter-spacing: -0.5px; line-height: 1.3;
        }
        .ac-right-text h2 span { color: #D4990A; }

        .ac-right-text .sub {
          font-size: 14px; color: #999999;
          line-height: 1.8; margin-top: 12px; font-weight: 400;
        }
        .ac-right-text .sub strong { color: #555555; font-weight: 500; }

        /* Module pills */
        .ac-pills {
          display: flex; flex-wrap: wrap; gap: 8px;
          justify-content: center; margin-top: 20px;
          position: relative; z-index: 1;
        }
        .ac-pill {
          display: flex; align-items: center; gap: 5px;
          background: #FFFFFF; border: 1px solid #E8E8E8;
          border-radius: 20px; padding: 5px 13px;
          font-size: 12px; color: #555555; font-weight: 500;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .ac-pill-dot { width: 6px; height: 6px; border-radius: 50%; background: #FFD700; flex-shrink: 0; }

        /* Dots */
        .ac-dots { display: flex; gap: 7px; justify-content: center; margin-top: 22px; position: relative; z-index: 1; }
        .ac-dot { width: 7px; height: 7px; border-radius: 50%; background: #DDDDDD; }
        .ac-dot.a { background: #FFD700; width: 22px; border-radius: 4px; }

        /* Responsive */
        @media (max-width: 900px) {
          .ac-left { flex: 0 0 420px; padding: 36px 36px; }
          .ac-lottie-wrap { max-width: 460px; }
        }
        @media (max-width: 720px) {
          html, body { overflow: auto; }
          .ac-root { flex-direction: column; height: auto; }
          .ac-left { flex: none; height: auto; padding: 36px 24px 32px; box-shadow: 0 6px 32px rgba(0,0,0,0.06); }
          .ac-right { flex: none; height: auto; padding: 36px 24px 48px; }
          .ac-lottie-wrap { max-width: 300px; }
          .ac-footer { position: static; margin-top: 20px; }
        }

        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideLeft {
          from { opacity: 0; transform: translateX(-20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideRight {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .ac-left  { animation: slideLeft  0.45s cubic-bezier(.22,1,.36,1) both; }
        .ac-right { animation: slideRight 0.50s cubic-bezier(.22,1,.36,1) both 0.07s; }
      `}</style>

      <div className="ac-root">

        {/* ══ LEFT ══ */}
        <div className="ac-left">
          <div className="brand-row">
            <div className="brand-icon">
              <img
                src="https://i.postimg.cc/W4LBwN5F/Untitled-design-(15)-(1).png"   // put your logo path here
                alt="Logo"
                style={{
                  width: "56px",
                  height: "56px",
                  objectFit: "contain",
                  position: "relative",
                  zIndex: 1
                }}
              />
            </div>
            <div>
              <div className="brand-name">ACCURA <span>CORE</span></div>
              <div className="brand-meta">
                Engineering Pvt. Ltd. — Internal ERP<br />
                IMT Manesar, Sector-8, Gurugram
              </div>
            </div>
          </div>

          <div className="ac-headline">
            <h1>Good to see you 👋</h1>
            <p>This system is for Accura team members only.<br />Sign in with your company credentials.</p>
          </div>

          <div className="ac-divider" />

          <form onSubmit={handleLogin}>
            <div className="ac-group">
              <label className="ac-label" htmlFor="userId">Employee ID or Email</label>
              <div className="ac-input-wrap">
                <span className={`ac-ico${focused === "uid" ? " on" : ""}`}><IconUser /></span>
                <input
                  id="userId"
                  className={`ac-input${error ? " ac-err" : ""}`}
                  placeholder="AccuraRajesh001 or rajesh@accura.in"
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
                <button type="button" className="ac-eye" onClick={() => setShowPassword(s => !s)} tabIndex={-1}>
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
              {loading
                ? <><div className="ac-spin" /><span>Signing in…</span></>
                : "Sign In →"}
            </button>
          </form>

          <div className="ac-hint">
            <p>
              <strong>Don't have access?</strong> Your login is issued by the Accura IT/Admin team.
              If you're a new joiner or have forgotten your password, contact your department head or
              the admin office at <strong>Sector-8, IMT Manesar</strong>.
            </p>
            <div className="badge-row">
              <span className="bdg bdg-y">Internal Use Only</span>
              <span className="bdg bdg-g">Accura Team</span>
              <span className="bdg bdg-g">v2.0</span>
            </div>
          </div>

          <div className="ac-footer">
            © 2025 Accura Precision Engineering Pvt. Ltd. · Gurugram, Haryana
          </div>
        </div>

        {/* ══ RIGHT ══ */}
        <div className="ac-right">

          {/* Internal badge */}
          <div className="internal-tag">
            <span className="internal-tag-dot" />
            Accura Internal System
          </div>

          {/* Lottie */}
          <div className="ac-lottie-wrap">
            <DotLottieReact
              src="https://lottie.host/b875601d-7b37-4816-8958-eb736a100f68/gmgOvn9nEm.lottie"
              loop
              autoplay
            />
          </div>

          {/* Copy */}
          <div className="ac-right-text">
            <h2>
              One System for the<br />
              Entire <span>Accura</span> Floor
            </h2>
            <p className="sub">
              Accura Core is our in-house ERP — built to run <strong>our</strong> operations.
              Every department, every shift, every order is managed right here,
              by our team, for our team.
            </p>
          </div>

          {/* Module pills */}
          <div className="ac-pills">
            {[
              "Purchase",
              "Production",
              "Stores & Inventory",
              "Dispatch",
              "HR & Payroll",
              "Employee Dashboard",
            ].map((m) => (
              <span className="ac-pill" key={m}>
                <span className="ac-pill-dot" />
                {m}
              </span>
            ))}
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