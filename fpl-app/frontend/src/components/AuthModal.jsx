import { useState } from "react";
import { useAuth } from "../hooks/useAuth.jsx";

export default function AuthModal({ onClose }) {
  const { login, register, updateProfile } = useAuth();
  const [mode,      setMode]      = useState("login");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [name,      setName]      = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [step,      setStep]      = useState("auth"); // "auth" | "fplid"
  const [fplId,     setFplId]     = useState("");
  const [savingId,  setSavingId]  = useState(false);

  const submit = async () => {
    setError("");
    if (!email || !password) { setError("Email and password required"); return; }
    setLoading(true);
    try {
      if (mode === "login") {
        const user = await login(email, password);
        // If user already has FPL ID skip the step
        if (user?.fpl_team_id) { onClose(); return; }
      } else {
        if (password.length < 6) { setError("Password must be at least 6 characters"); setLoading(false); return; }
        await register(email, password, name);
      }
      setStep("fplid"); // show FPL ID step after auth
    } catch (e) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const saveFplId = async () => {
    if (!fplId || fplId.length < 5) { onClose(); return; } // skip if empty
    setSavingId(true);
    try {
      await updateProfile({ fpl_team_id: parseInt(fplId) });
    } catch (_) {}
    finally { setSavingId(false); onClose(); }
  };

  // ── FPL ID step ──
  if (step === "fplid") return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.88)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: "linear-gradient(135deg,#06101c,#0e1d30)", borderRadius: 16, width: "100%", maxWidth: 400, border: "1px solid rgba(5,240,255,0.2)", boxShadow: "0 24px 80px rgba(0,0,0,0.9)", overflow: "hidden", fontFamily: "'Barlow Condensed', sans-serif" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", letterSpacing: "0.04em", textTransform: "uppercase" }}>One Last Thing</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "monospace", marginTop: 3 }}>Add your FPL Team ID to auto-load your squad in the Transfer Planner</div>
        </div>
        <div style={{ padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontSize: 9, fontWeight: 900, color: "rgba(5,240,255,0.5)", textTransform: "uppercase", letterSpacing: "0.15em", fontFamily: "monospace" }}>FPL Team ID (7 digits)</label>
            <input value={fplId} onChange={e => setFplId(e.target.value.replace(/\D/g, ""))}
              type="text" inputMode="numeric" maxLength={8}
              placeholder="e.g. 1234567"
              onKeyDown={e => e.key === "Enter" && saveFplId()}
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(5,240,255,0.15)", borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 16, fontFamily: "monospace", outline: "none", letterSpacing: "0.1em" }}
              onFocus={e => e.target.style.borderColor = "rgba(5,240,255,0.4)"}
              onBlur={e => e.target.style.borderColor = "rgba(5,240,255,0.15)"}
            />
            <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.25)", fontFamily: "monospace" }}>
              Find it at: fantasy.premierleague.com/entry/<span style={{ color: "#05f0ff" }}>1234567</span>/event/…
            </div>
          </div>
          <button onClick={saveFplId} disabled={savingId} style={{ background: "linear-gradient(135deg,#05f0ff,#0090ff)", border: "none", cursor: "pointer", borderRadius: 10, padding: "12px", fontSize: 13, fontWeight: 900, color: "#001a2e", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'Barlow Condensed', sans-serif" }}>
            {savingId ? "Saving..." : "Save & Continue"}
          </button>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 11, color: "rgba(255,255,255,0.25)", fontFamily: "monospace", textAlign: "center" }}>
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 2000,
      background: "rgba(0,0,0,0.88)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: "linear-gradient(135deg,#06101c,#0e1d30)",
        borderRadius: 16, width: "100%", maxWidth: 400,
        border: "1px solid rgba(5,240,255,0.2)",
        boxShadow: "0 24px 80px rgba(0,0,0,0.9)",
        overflow: "hidden",
        fontFamily: "'Barlow Condensed', sans-serif",
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", background: "rgba(255,255,255,0.06)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
              {["login", "signup"].map(m => (
                <button key={m} onClick={() => { setMode(m); setError(""); }} style={{
                  background: mode === m ? "rgba(5,240,255,0.15)" : "transparent",
                  border: "none", cursor: "pointer",
                  padding: "6px 18px",
                  fontSize: 11, fontWeight: 900,
                  color: mode === m ? "#05f0ff" : "rgba(255,255,255,0.35)",
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  fontFamily: "monospace", transition: "all 0.15s",
                }}>
                  {m === "login" ? "Log In" : "Sign Up"}
                </button>
              ))}
            </div>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.07)", border: "none", cursor: "pointer", width: 30, height: 30, borderRadius: "50%", color: "rgba(255,255,255,0.5)", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            {mode === "login" ? "Welcome Back" : "Create Account"}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "monospace", marginTop: 3 }}>
            {mode === "login" ? "Save your FPL Team ID and challenge history" : "Join Offside XI — track your record vs the AI"}
          </div>
        </div>

        {/* Form */}
        <div style={{ padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          {mode === "signup" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label style={{ fontSize: 9, fontWeight: 900, color: "rgba(5,240,255,0.5)", textTransform: "uppercase", letterSpacing: "0.15em", fontFamily: "monospace" }}>Name (optional)</label>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="Your name"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(5,240,255,0.15)", borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 13, fontFamily: "monospace", outline: "none", transition: "border 0.15s" }}
                onFocus={e => e.target.style.borderColor = "rgba(5,240,255,0.4)"}
                onBlur={e => e.target.style.borderColor = "rgba(5,240,255,0.15)"}
              />
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontSize: 9, fontWeight: 900, color: "rgba(5,240,255,0.5)", textTransform: "uppercase", letterSpacing: "0.15em", fontFamily: "monospace" }}>Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)}
              type="email" placeholder="you@example.com"
              onKeyDown={e => e.key === "Enter" && submit()}
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(5,240,255,0.15)", borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 13, fontFamily: "monospace", outline: "none", transition: "border 0.15s" }}
              onFocus={e => e.target.style.borderColor = "rgba(5,240,255,0.4)"}
              onBlur={e => e.target.style.borderColor = "rgba(5,240,255,0.15)"}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontSize: 9, fontWeight: 900, color: "rgba(5,240,255,0.5)", textTransform: "uppercase", letterSpacing: "0.15em", fontFamily: "monospace" }}>Password</label>
            <input value={password} onChange={e => setPassword(e.target.value)}
              type="password" placeholder={mode === "signup" ? "Min 6 characters" : "Your password"}
              onKeyDown={e => e.key === "Enter" && submit()}
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(5,240,255,0.15)", borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 13, fontFamily: "monospace", outline: "none", transition: "border 0.15s" }}
              onFocus={e => e.target.style.borderColor = "rgba(5,240,255,0.4)"}
              onBlur={e => e.target.style.borderColor = "rgba(5,240,255,0.15)"}
            />
          </div>

          {error && (
            <div style={{ background: "rgba(255,77,77,0.1)", border: "1px solid rgba(255,77,77,0.25)", borderRadius: 8, padding: "9px 12px", fontSize: 11, color: "rgba(255,130,130,0.9)", fontFamily: "monospace" }}>
              {error}
            </div>
          )}

          <button onClick={submit} disabled={loading} style={{
            background: loading ? "rgba(5,240,255,0.1)" : "linear-gradient(135deg,#05f0ff,#0090ff)",
            border: "none", cursor: loading ? "not-allowed" : "pointer",
            borderRadius: 10, padding: "12px",
            fontSize: 13, fontWeight: 900, color: loading ? "rgba(255,255,255,0.4)" : "#001a2e",
            letterSpacing: "0.08em", textTransform: "uppercase",
            fontFamily: "'Barlow Condensed', sans-serif",
            transition: "all 0.15s", marginTop: 4,
          }}>
            {loading ? "Please wait..." : mode === "login" ? "Log In" : "Create Account"}
          </button>

          <div style={{ textAlign: "center", fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "monospace" }}>
            {mode === "login" ? "No account? " : "Already have one? "}
            <span onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
              style={{ color: "#05f0ff", cursor: "pointer", fontWeight: 800 }}>
              {mode === "login" ? "Sign up free" : "Log in"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}