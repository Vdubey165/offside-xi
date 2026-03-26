import { useState, useEffect } from "react";
import { api } from "../api/client";
import IndiaFootballQuiz from "./IndiaFootballQuiz";

// ─── STATIC / FALLBACK DATA ───────────────────────────────────────────────────
const STATS = [
  { val: "1.4B", label: "People. One Football Nation." },
  { val: "11",   label: "ISL Clubs. Growing Every Year." },
  { val: "94",   label: "Chhetri Goals. And Counting."  },
];

// Fallback top scorers (shown while live data loads or on API failure)
const FALLBACK_SCORERS = [
  { rank: 1, player: "Dimitri Petratos",      nationality: "Australian", team: "NorthEast United FC", goals: 14, assists: 3 },
  { rank: 2, player: "Rahim Ali",              nationality: "Indian",     team: "Chennaiyin FC",        goals: 11, assists: 2 },
  { rank: 3, player: "Lallianzuala Chhangte",  nationality: "Indian",     team: "Mumbai City FC",       goals: 10, assists: 4 },
  { rank: 4, player: "Jorge Pereyra Díaz",     nationality: "Argentine",  team: "FC Goa",               goals: 10, assists: 1 },
  { rank: 5, player: "Manvir Singh",           nationality: "Indian",     team: "ATK Mohun Bagan",       goals: 9,  assists: 3 },
];

// Fallback standings (used if API is unavailable)
const FALLBACK_STANDINGS = [
  { pos: 1,  team: "Bengaluru FC",       played: 22, win: 14, draw: 4, loss: 4, gf: 41, ga: 22, gd: 19, points: 46 },
  { pos: 2,  team: "ATK Mohun Bagan",    played: 22, win: 13, draw: 5, loss: 4, gf: 38, ga: 24, gd: 14, points: 44 },
  { pos: 3,  team: "Mumbai City FC",     played: 22, win: 12, draw: 4, loss: 6, gf: 35, ga: 26, gd: 9,  points: 40 },
  { pos: 4,  team: "FC Goa",             played: 22, win: 11, draw: 5, loss: 6, gf: 33, ga: 27, gd: 6,  points: 38 },
  { pos: 5,  team: "NorthEast United FC",played: 22, win: 10, draw: 6, loss: 6, gf: 30, ga: 28, gd: 2,  points: 36 },
  { pos: 6,  team: "Hyderabad FC",       played: 22, win:  9, draw: 5, loss: 8, gf: 29, ga: 30, gd:-1,  points: 32 },
  { pos: 7,  team: "Kerala Blasters",    played: 22, win:  8, draw: 6, loss: 8, gf: 27, ga: 28, gd:-1,  points: 30 },
  { pos: 8,  team: "Jamshedpur FC",      played: 22, win:  7, draw: 7, loss: 8, gf: 26, ga: 29, gd:-3,  points: 28 },
  { pos: 9,  team: "Chennaiyin FC",      played: 22, win:  6, draw: 6, loss:10, gf: 25, ga: 32, gd:-7,  points: 24 },
  { pos: 10, team: "Odisha FC",          played: 22, win:  5, draw: 5, loss:12, gf: 22, ga: 36, gd:-14, points: 20 },
  { pos: 11, team: "Punjab FC",          played: 22, win:  3, draw: 6, loss:13, gf: 18, ga: 38, gd:-20, points: 15 },
];

const PILLARS = [
  { icon: "grassroots", title: "Grassroots First",         desc: "Indian football doesn't need a saviour at the top. It needs a thousand coaches at the bottom. We start from the ground." },
  { icon: "data",       title: "Data Meets Passion",       desc: "We believe emotion builds the game, but data sustains it. Analytics for scouts, coaches, and fans who care enough to understand." },
  { icon: "location",   title: "Every City. Every Lane.",  desc: "From Kolkata's maidan to Mumbai's slums to Shillong's hills — Indian football lives in places no broadcast camera has reached." },
  { icon: "community",  title: "Community Over Celebrity", desc: "We are not building a fanbase. We are building a movement. Owned by the people who show up — not just by those who watch." },
];

const VOICES = [
  { initials: "AK", name: "Arjun K.",  city: "Bengaluru", quote: "For the first time someone is talking about Indian football like it actually matters. Because it does." },
  { initials: "RS", name: "Rahul S.",  city: "Kolkata",   quote: "We grew up playing in the mud. This platform finally sees us." },
  { initials: "PM", name: "Priya M.",  city: "Chennai",   quote: "Indian women's football deserves this kind of attention. Glad someone is building for all of us." },
  { initials: "DL", name: "Dinesh L.", city: "Shillong",  quote: "The northeast has always been football country. Now the rest of India is catching up to what we always knew." },
];

const CITIES = [
  "Mumbai","Delhi","Kolkata","Bengaluru","Chennai",
  "Hyderabad","Pune","Guwahati","Shillong","Kochi",
  "Jamshedpur","Bhubaneswar","Goa","Chandigarh","Lucknow",
];

// Indian nationality keywords (API-Football uses full country names)
const INDIAN_NATIONALITIES = new Set(["Indian", "India"]);

// ─── SVG ICONS ────────────────────────────────────────────────────────────────
function Icon({ name, size = 22 }) {
  const c = "#05f0ff";
  const icons = {
    grassroots: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22V12"/><path d="M12 12C12 12 8 9 8 5a4 4 0 0 1 8 0c0 4-4 7-4 7z"/><path d="M12 12C12 12 16 9.5 18 6"/><path d="M12 12C12 12 7 10 5 7"/><path d="M5 22h14"/></svg>,
    data:       <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><path d="M2 20h20"/></svg>,
    location:   <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>,
    community:  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="7" r="3"/><circle cx="15" cy="7" r="3"/><path d="M3 21v-2a5 5 0 0 1 5-5h1"/><path d="M16 14h1a5 5 0 0 1 5 5v2"/><path d="M12 14a4 4 0 0 1 4 4v3H8v-3a4 4 0 0 1 4-4z"/></svg>,
    arrow:      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>,
  };
  return icons[name] || null;
}

// ─── COUNTER ──────────────────────────────────────────────────────────────────
function AnimatedCounter({ target, duration = 2000 }) {
  const [count, setCount] = useState(0);
  const isNumber = !isNaN(parseFloat(target));
  useEffect(() => {
    if (!isNumber) return;
    const num = parseFloat(target);
    const suffix = target.replace(/[0-9.]/g, "");
    const steps = 60; const inc = num / steps; let cur = 0;
    const t = setInterval(() => {
      cur += inc;
      if (cur >= num) { setCount(target); clearInterval(t); }
      else setCount(Math.floor(cur) + suffix);
    }, duration / steps);
    return () => clearInterval(t);
  }, [target]);
  return <span>{isNumber ? count || "0" : target}</span>;
}

// ─── FORM DOTS ────────────────────────────────────────────────────────────────
function FormDots({ form }) {
  if (!form) return null;
  return (
    <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
      {form.slice(-5).split("").map((r, i) => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: "50%",
          background: r === "W" ? "#00ff87" : r === "D" ? "#ebff00" : "#ff4d4d",
          boxShadow: r === "W" ? "0 0 4px #00ff87" : r === "D" ? "0 0 4px #ebff00" : "0 0 4px #ff4d4d",
        }} title={r === "W" ? "Win" : r === "D" ? "Draw" : "Loss"} />
      ))}
    </div>
  );
}

// ─── ISL STANDINGS COMPONENT ──────────────────────────────────────────────────
function IslStandings() {
  const [standings, setStandings] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [liveData,  setLiveData]  = useState(false);

  useEffect(() => {
    api.getIslStandings()
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setStandings(data);
          setLiveData(true);
        } else {
          setStandings(FALLBACK_STANDINGS);
        }
      })
      .catch(() => {
        setStandings(FALLBACK_STANDINGS);
        setError("Live data unavailable — showing cached standings");
      })
      .finally(() => setLoading(false));
  }, []);

  const rows = standings || FALLBACK_STANDINGS;

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div className="card-title" style={{ marginBottom: 0 }}>ISL 2024–25 · Standings</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {liveData && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 20, background: "rgba(0,255,135,0.08)", border: "1px solid rgba(0,255,135,0.2)" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00ff87", boxShadow: "0 0 5px #00ff87" }} />
              <span style={{ fontSize: 9, fontWeight: 900, color: "#00ff87", fontFamily: "var(--mono)", letterSpacing: "0.1em" }}>LIVE</span>
            </div>
          )}
          {error && (
            <span style={{ fontSize: 9, color: "rgba(255,153,51,0.7)", fontFamily: "var(--mono)" }}>cached</span>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 0", color: "var(--text3)", fontFamily: "var(--mono)", fontSize: 11 }}>
          <div className="spinner" style={{ width: 14, height: 14 }} />
          Loading ISL standings…
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          {/* Column headers */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "28px 1fr 36px 36px 36px 36px 28px 28px 28px 36px 80px",
            gap: "0 4px",
            padding: "6px 10px",
            marginBottom: 4,
            background: "rgba(5,240,255,0.04)",
            borderRadius: "var(--radius-sm)",
          }}>
            {["#", "Club", "P", "W", "D", "L", "GF", "GA", "GD", "Pts", "Form"].map((h, i) => (
              <div key={h} style={{
                fontSize: 8.5, fontWeight: 900,
                color: "rgba(5,240,255,0.45)",
                fontFamily: "var(--mono)",
                textAlign: i === 1 ? "left" : "center",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}>{h}</div>
            ))}
          </div>

          {/* Rows */}
          {rows.map((row, i) => {
            const isTop4   = row.pos <= 4;   // playoff zone
            const isBottom = row.pos >= rows.length - 1; // relegation zone
            const borderColor = isTop4 ? "rgba(0,255,135,0.4)" : isBottom ? "rgba(255,77,77,0.35)" : "transparent";
            return (
              <div key={row.pos} style={{
                display: "grid",
                gridTemplateColumns: "28px 1fr 36px 36px 36px 36px 28px 28px 28px 36px 80px",
                gap: "0 4px",
                padding: "7px 10px",
                marginBottom: 2,
                borderRadius: "var(--radius-sm)",
                borderLeft: `3px solid ${borderColor}`,
                background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
                transition: "background 0.12s",
              }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(5,240,255,0.04)"}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent"}
              >
                {/* Pos */}
                <div style={{
                  fontSize: 11, fontWeight: 900,
                  color: isTop4 ? "#00ff87" : isBottom ? "#ff4d4d" : "var(--text3)",
                  fontFamily: "var(--mono)",
                  textAlign: "center",
                  alignSelf: "center",
                }}>{row.pos}</div>

                {/* Team */}
                <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                  {row.logo ? (
                    <img src={row.logo} alt={row.team} style={{ width: 20, height: 20, objectFit: "contain", flexShrink: 0 }}
                      onError={e => { e.target.style.display = "none"; }} />
                  ) : (
                    <div style={{ width: 20, height: 20, borderRadius: 4, background: "rgba(5,240,255,0.1)", flexShrink: 0 }} />
                  )}
                  <span style={{
                    fontSize: 12, fontWeight: 700,
                    color: "#fff",
                    fontFamily: "var(--font)",
                    textTransform: "uppercase",
                    letterSpacing: "0.03em",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>{row.team}</span>
                </div>

                {/* Stats cells */}
                {[row.played, row.win, row.draw, row.loss, row.gf, row.ga,
                  row.gd >= 0 ? `+${row.gd}` : row.gd].map((v, ci) => (
                  <div key={ci} style={{
                    fontSize: 11.5, fontWeight: ci === 6 ? 700 : 500,
                    color: ci === 6 ? (row.gd >= 0 ? "#00ff87" : "#ff4d4d") : "var(--text2)",
                    fontFamily: "var(--mono)",
                    textAlign: "center",
                    alignSelf: "center",
                  }}>{v}</div>
                ))}

                {/* Points */}
                <div style={{
                  fontSize: 13, fontWeight: 900,
                  color: isTop4 ? "#00ff87" : "#fff",
                  fontFamily: "var(--mono)",
                  textAlign: "center",
                  alignSelf: "center",
                }}>{row.points}</div>

                {/* Form */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <FormDots form={row.form} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: 1, background: "rgba(0,255,135,0.4)" }} />
          <span style={{ fontSize: 9, color: "var(--text3)", fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Playoff zone (top 4)</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: 1, background: "rgba(255,77,77,0.35)" }} />
          <span style={{ fontSize: 9, color: "var(--text3)", fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Relegation zone</span>
        </div>
      </div>
    </div>
  );
}

// ─── ISL TOP SCORERS COMPONENT ────────────────────────────────────────────────
function IslTopScorers() {
  const [scorers,  setScorers]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [liveData, setLiveData] = useState(false);

  useEffect(() => {
    api.getIslTopScorers()
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setScorers(data);
          setLiveData(true);
        } else {
          setScorers(FALLBACK_SCORERS);
        }
      })
      .catch(() => setScorers(FALLBACK_SCORERS))
      .finally(() => setLoading(false));
  }, []);

  const rows = scorers || FALLBACK_SCORERS;

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div className="card-title" style={{ marginBottom: 0 }}>ISL 2024–25 · Top Scorers</div>
        {liveData && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 20, background: "rgba(0,255,135,0.08)", border: "1px solid rgba(0,255,135,0.2)" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00ff87", boxShadow: "0 0 5px #00ff87" }} />
            <span style={{ fontSize: 9, fontWeight: 900, color: "#00ff87", fontFamily: "var(--mono)", letterSpacing: "0.1em" }}>LIVE</span>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 0", color: "var(--text3)", fontFamily: "var(--mono)", fontSize: 11 }}>
          <div className="spinner" style={{ width: 14, height: 14 }} />
          Loading top scorers…
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
          {rows.map((p, i) => {
            const isIndian = INDIAN_NATIONALITIES.has(p.nationality);
            const isFirst  = i === 0;
            return (
              <div key={p.player || i} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "9px 12px", borderRadius: "var(--radius)",
                background: isFirst ? "rgba(235,255,0,0.05)" : "var(--bg3)",
                border: `1px solid ${isFirst ? "rgba(235,255,0,0.15)" : "var(--border)"}`,
              }}>
                {/* Rank */}
                <span style={{
                  width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                  background: isFirst ? "rgba(235,255,0,0.15)" : "rgba(255,255,255,0.06)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 900,
                  color: isFirst ? "#ebff00" : "var(--text3)",
                  fontFamily: "var(--mono)",
                }}>{p.rank || i + 1}</span>

                {/* Photo */}
                {p.photo ? (
                  <img src={p.photo} alt={p.player} style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1.5px solid rgba(5,240,255,0.15)" }}
                    onError={e => { e.target.style.display = "none"; }} />
                ) : (
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(5,240,255,0.1)", flexShrink: 0 }} />
                )}

                {/* Name + team */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", fontFamily: "var(--font)", textTransform: "uppercase", letterSpacing: "0.03em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.player}
                    </span>
                    {isIndian && (
                      <span style={{ fontSize: 8, fontWeight: 900, color: "#ff9933", background: "rgba(255,153,51,0.12)", border: "1px solid rgba(255,153,51,0.25)", borderRadius: 3, padding: "1px 5px", fontFamily: "var(--mono)", letterSpacing: "0.06em", flexShrink: 0 }}>
                        🇮🇳 IND
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 9.5, color: "var(--text3)", fontFamily: "var(--mono)", marginTop: 2, display: "flex", alignItems: "center", gap: 5 }}>
                    {p.logo && (
                      <img src={p.logo} alt="" style={{ width: 12, height: 12, objectFit: "contain" }}
                        onError={e => { e.target.style.display = "none"; }} />
                    )}
                    {p.team}
                  </div>
                </div>

                {/* Goals + assists */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: isFirst ? "#ebff00" : "var(--cyan)", fontFamily: "var(--mono)", lineHeight: 1 }}>{p.goals}</div>
                    <div style={{ fontSize: 8, color: "var(--text3)", fontFamily: "var(--mono)" }}>goals</div>
                  </div>
                  {p.assists > 0 && (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.45)", fontFamily: "var(--mono)", lineHeight: 1 }}>{p.assists}</div>
                      <div style={{ fontSize: 8, color: "var(--text3)", fontFamily: "var(--mono)" }}>ast</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── ISL FIXTURES COMPONENT ───────────────────────────────────────────────────
function IslFixtures() {
  const [fixtures, setFixtures] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [liveData, setLiveData] = useState(false);

  useEffect(() => {
    api.getIslFixtures(6)
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setFixtures(data);
          setLiveData(true);
        } else {
          setFixtures([]);
        }
      })
      .catch(() => setFixtures([]))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", weekday: "short" });
    } catch {
      return dateStr.slice(0, 10);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    } catch { return ""; }
  };

  const statusColor = (status) => {
    if (status === "FT" || status === "AET" || status === "PEN") return "#00ff87";
    if (status === "1H" || status === "2H" || status === "ET" || status === "LIVE") return "#ebff00";
    return "rgba(5,240,255,0.5)";
  };

  const isLive = (status) => ["1H","2H","ET","BT","P","SUSP","INT","LIVE"].includes(status);

  if (!liveData && !loading && (!fixtures || fixtures.length === 0)) return null;

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div className="card-title" style={{ marginBottom: 0 }}>ISL 2024–25 · Upcoming Fixtures</div>
        {liveData && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 20, background: "rgba(0,255,135,0.08)", border: "1px solid rgba(0,255,135,0.2)" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00ff87", boxShadow: "0 0 5px #00ff87" }} />
            <span style={{ fontSize: 9, fontWeight: 900, color: "#00ff87", fontFamily: "var(--mono)", letterSpacing: "0.1em" }}>LIVE</span>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 0", color: "var(--text3)", fontFamily: "var(--mono)", fontSize: 11 }}>
          <div className="spinner" style={{ width: 14, height: 14 }} />
          Loading fixtures…
        </div>
      ) : fixtures && fixtures.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {fixtures.map((fx, i) => {
            const live = isLive(fx.status);
            const finished = ["FT","AET","PEN"].includes(fx.status);
            return (
              <div key={fx.id || i} style={{
                display: "flex", alignItems: "center",
                padding: "10px 14px", borderRadius: "var(--radius)",
                background: live ? "rgba(235,255,0,0.04)" : "rgba(255,255,255,0.025)",
                border: `1px solid ${live ? "rgba(235,255,0,0.15)" : "rgba(5,240,255,0.08)"}`,
                position: "relative", overflow: "hidden",
              }}>
                {live && (
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "rgba(235,255,0,0.4)" }} />
                )}

                {/* Date/Time */}
                <div style={{ width: 70, flexShrink: 0, textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text2)", fontFamily: "var(--mono)" }}>{formatDate(fx.date)}</div>
                  {!finished && !live && (
                    <div style={{ fontSize: 9, color: "var(--text3)", fontFamily: "var(--mono)", marginTop: 2 }}>{formatTime(fx.date)}</div>
                  )}
                  {(live || finished) && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3, marginTop: 3 }}>
                      {live && <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#ebff00", boxShadow: "0 0 4px #ebff00" }} />}
                      <span style={{ fontSize: 9, fontWeight: 900, color: statusColor(fx.status), fontFamily: "var(--mono)" }}>{fx.status}</span>
                    </div>
                  )}
                </div>

                {/* Home team */}
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 7, justifyContent: "flex-end" }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: "#fff", fontFamily: "var(--font)", textTransform: "uppercase", letterSpacing: "0.02em", textAlign: "right" }}>{fx.home}</span>
                  {fx.home_logo && (
                    <img src={fx.home_logo} alt="" style={{ width: 22, height: 22, objectFit: "contain", flexShrink: 0 }}
                      onError={e => { e.target.style.display = "none"; }} />
                  )}
                </div>

                {/* Score / VS */}
                <div style={{ width: 64, flexShrink: 0, textAlign: "center" }}>
                  {finished || live ? (
                    <div style={{ fontSize: 16, fontWeight: 900, fontFamily: "var(--mono)", color: live ? "#ebff00" : "#fff", letterSpacing: "0.05em" }}>
                      {fx.home_score ?? "–"} : {fx.away_score ?? "–"}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, fontWeight: 900, color: "rgba(5,240,255,0.35)", fontFamily: "var(--mono)", letterSpacing: "0.1em" }}>VS</div>
                  )}
                </div>

                {/* Away team */}
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 7 }}>
                  {fx.away_logo && (
                    <img src={fx.away_logo} alt="" style={{ width: 22, height: 22, objectFit: "contain", flexShrink: 0 }}
                      onError={e => { e.target.style.display = "none"; }} />
                  )}
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: "#fff", fontFamily: "var(--font)", textTransform: "uppercase", letterSpacing: "0.02em" }}>{fx.away}</span>
                </div>

                {/* Venue */}
                {fx.venue && (
                  <div style={{ width: 90, flexShrink: 0, textAlign: "right", display: "none" /* hidden on mobile */ }}>
                    <span style={{ fontSize: 8.5, color: "var(--text3)", fontFamily: "var(--mono)" }}>{fx.venue}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text3)", fontSize: 11, fontFamily: "var(--mono)" }}>
          No upcoming fixtures available
        </div>
      )}
    </div>
  );
}

// ─── JOIN FORM ────────────────────────────────────────────────────────────────
function JoinForm() {
  const [step,        setStep]        = useState(0);
  const [city,        setCity]        = useState("");
  const [role,        setRole]        = useState("");
  const [email,       setEmail]       = useState("");
  const [error,       setError]       = useState("");
  const [memberCount, setMemberCount] = useState(null);
  const roles = ["Player", "Coach", "Scout", "Fan", "Journalist", "Club Official"];

  useEffect(() => {
    api.getCommunityCount().then(d => setMemberCount(d.count)).catch(() => {});
  }, []);

  const handleJoin = async () => {
    if (!email || !city) return;
    setStep(1); setError("");
    try {
      const res = await api.communityJoin({ email, city, role: role || "Fan" });
      if (res.count) setMemberCount(res.count);
      setStep(2);
    } catch (e) {
      setError(e.message || "Something went wrong. Try again.");
      setStep(0);
    }
  };

  if (step === 2) return (
    <div style={{ textAlign: "center", padding: "32px 0" }}>
      <div style={{ fontSize: 13, fontWeight: 900, color: "#fff", fontFamily: "var(--font)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>You're In.</div>
      <div style={{ fontSize: 11, color: "var(--cyan)", fontFamily: "var(--mono)" }}>Welcome to the movement. We'll reach out soon.</div>
      {(city || role) && <div style={{ marginTop: 8, fontSize: 10, color: "var(--text3)", fontFamily: "var(--mono)" }}>{city && `📍 ${city}`}{role && ` · ${role}`}</div>}
      {memberCount && (
        <div style={{ marginTop: 16, fontSize: 11, color: "rgba(5,240,255,0.6)", fontFamily: "var(--mono)" }}>
          You are member #{memberCount} of this movement.
        </div>
      )}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {memberCount !== null && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 14px", borderRadius: "var(--radius)",
          background: "rgba(5,240,255,0.05)", border: "1px solid rgba(5,240,255,0.12)",
        }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#00ff87", boxShadow: "0 0 6px #00ff87", flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: "var(--text2)", fontFamily: "var(--font)" }}>
            <strong style={{ color: "#00ff87" }}>{memberCount.toLocaleString()}</strong> people have already joined this movement.
          </span>
        </div>
      )}
      <div className="input-group">
        <label className="input-label">Your Email</label>
        <input className="input" type="email" placeholder="name@example.com" value={email}
          onChange={e => setEmail(e.target.value)} style={{ width: "100%" }} />
      </div>
      <div className="input-group">
        <label className="input-label">Your City</label>
        <input className="input" type="text" placeholder="e.g. Kolkata, Goa, Shillong..." value={city}
          onChange={e => setCity(e.target.value)} style={{ width: "100%" }} />
      </div>
      <div className="input-group">
        <label className="input-label">I am a...</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
          {roles.map(r => (
            <button key={r} className={`filter-pill ${role === r ? "active" : ""}`}
              onClick={() => setRole(r === role ? "" : r)}>{r}</button>
          ))}
        </div>
      </div>
      {error && (
        <div style={{ background: "rgba(255,77,77,0.1)", border: "1px solid rgba(255,77,77,0.2)", borderRadius: 6, padding: "8px 12px", fontSize: 10.5, color: "rgba(255,130,130,0.9)", fontFamily: "var(--mono)" }}>
          {error}
        </div>
      )}
      <button className="btn btn-primary" onClick={handleJoin}
        disabled={step === 1 || !email || !city}
        style={{ width: "100%", marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        {step === 1 ? <><div className="spinner" style={{ width: 13, height: 13 }} />Joining…</> : <>Join the Movement <Icon name="arrow" size={13} /></>}
      </button>
      <div style={{ textAlign: "center", fontSize: 10, color: "var(--text4)", fontFamily: "var(--mono)" }}>No spam. No noise. Just football.</div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function IndianFootballCommunity() {
  return (
    <div>
      <style>{`
        @keyframes indiaMarquee   { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes indiaDotPulse  { 0%,100%{opacity:0.3;transform:scale(1)} 50%{opacity:0.8;transform:scale(1.5)} }
        @keyframes indiaGlowPulse { 0%,100%{opacity:0.4} 50%{opacity:1} }
      `}</style>

      {/* ── HERO ── */}
      <div style={{ position:"relative", overflow:"hidden", background:"linear-gradient(135deg,#04090f 0%,#081828 100%)", border:"1px solid var(--border)", borderRadius:"var(--radius-lg)", padding:"48px 40px", marginBottom:20, textAlign:"center" }}>
        <div style={{ position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(5,240,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(5,240,255,1) 1px,transparent 1px)",backgroundSize:"50px 50px",opacity:0.015,pointerEvents:"none" }}/>
        <div style={{ position:"absolute",inset:0,background:"radial-gradient(ellipse 70% 50% at 50% 50%,rgba(5,240,255,0.05) 0%,transparent 70%)",pointerEvents:"none" }}/>
        <div style={{ position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none" }}>
          {CITIES.map((city, i) => (
            <div key={city} style={{ position:"absolute", left:`${8+(i*6.2)%85}%`, top:`${10+(i*13.7)%80}%`, animation:`indiaDotPulse ${2.5+(i%4)*0.5}s ease-in-out infinite`, animationDelay:`${i*0.3}s` }}>
              <div style={{ width:5,height:5,borderRadius:"50%",background:"rgba(5,240,255,0.35)",boxShadow:"0 0 6px rgba(5,240,255,0.25)" }}/>
            </div>
          ))}
        </div>
        <div style={{ position:"relative",zIndex:1 }}>
          <div style={{ display:"inline-flex",alignItems:"center",gap:7,padding:"4px 14px",borderRadius:20,marginBottom:20,background:"rgba(5,240,255,0.06)",border:"1px solid rgba(5,240,255,0.18)" }}>
            <span style={{ width:6,height:6,borderRadius:"50%",background:"var(--cyan)",boxShadow:"0 0 6px var(--cyan)",display:"inline-block",animation:"indiaGlowPulse 1.8s ease-in-out infinite" }}/>
            <span style={{ fontSize:9,fontWeight:900,color:"var(--cyan)",fontFamily:"var(--mono)",letterSpacing:"0.2em",textTransform:"uppercase" }}>Indian Football · Ground Up Movement</span>
          </div>
          <h1 style={{ fontSize:"clamp(32px,5vw,58px)",fontWeight:900,lineHeight:0.95,marginBottom:14,fontFamily:"var(--font)",letterSpacing:"-0.01em" }}>
            <span style={{ color:"#fff" }}>भारत का </span><span style={{ color:"var(--cyan)" }}>खेल</span><br/>
            <span style={{ fontSize:"50%",color:"rgba(255,255,255,0.28)",fontStyle:"italic" }}>India's Game.</span>
          </h1>
          <p style={{ fontSize:13,color:"var(--text2)",maxWidth:500,margin:"0 auto 24px",lineHeight:1.7,fontFamily:"var(--font)" }}>
            We are not waiting for Indian football to be discovered.<br/>
            <strong style={{ color:"#fff" }}>We are building it. From every lane, every maidan, every city.</strong>
          </p>
          <div style={{ display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap" }}>
            <a href="#india-join" className="btn btn-primary" style={{ textDecoration:"none",display:"inline-flex",alignItems:"center",gap:6 }}>Join the Movement <Icon name="arrow" size={13}/></a>
            <a href="#india-vision" className="btn" style={{ textDecoration:"none",background:"transparent",border:"1px solid var(--border2)",color:"var(--text2)" }}>Our Vision</a>
          </div>
        </div>
      </div>

      {/* ── STATS ── */}
      <div className="stats-row" style={{ marginBottom:20 }}>
        {STATS.map((s,i) => (
          <div key={i} className="stat-card" style={{ textAlign:"center" }}>
            <div className="stat-value cyan"><AnimatedCounter target={s.val}/></div>
            <div className="stat-label" style={{ marginTop:6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── QUIZ ── */}
      <div style={{ marginBottom:20 }}>
        <IndiaFootballQuiz />
      </div>

      {/* ── ISL STANDINGS (LIVE) ── */}
      <IslStandings />

      {/* ── ISL TOP SCORERS (LIVE) ── */}
      <IslTopScorers />

      {/* ── ISL UPCOMING FIXTURES (LIVE) ── */}
      <IslFixtures />

      {/* ── PILLARS ── */}
      <div id="india-vision" className="card" style={{ marginBottom:20 }}>
        <div className="card-title">What We Stand For</div>
        <div className="two-col">
          {PILLARS.map((p,i) => (
            <div key={i} style={{ padding:"14px 16px",borderRadius:"var(--radius)",background:"var(--bg3)",border:"1px solid var(--border)",transition:"border-color 0.14s,transform 0.14s",cursor:"default" }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor="var(--border2)"; e.currentTarget.style.transform="translateY(-2px)"; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor="var(--border)";  e.currentTarget.style.transform="translateY(0)"; }}>
              <div style={{ marginBottom:10 }}><Icon name={p.icon} size={22}/></div>
              <div style={{ fontSize:13,fontWeight:900,color:"#fff",fontFamily:"var(--font)",textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:6 }}>{p.title}</div>
              <div style={{ fontSize:11.5,color:"var(--text2)",lineHeight:1.7,fontFamily:"var(--font)" }}>{p.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── VOICES ── */}
      <div className="card" style={{ marginBottom:20 }}>
        <div className="card-title">Voices From The Ground</div>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12 }}>
          {VOICES.map((v,i) => (
            <div key={i} style={{ padding:"14px",borderRadius:"var(--radius)",background:"var(--bg3)",border:"1px solid var(--border)",display:"flex",flexDirection:"column",gap:10 }}>
              <div style={{ fontSize:24,color:"rgba(5,240,255,0.12)",fontFamily:"Georgia,serif",lineHeight:0.8 }}>"</div>
              <p style={{ fontSize:12,color:"var(--text2)",lineHeight:1.7,fontFamily:"var(--font)",flex:1 }}>{v.quote}</p>
              <div style={{ display:"flex",alignItems:"center",gap:8,paddingTop:8,borderTop:"1px solid var(--border)" }}>
                <div style={{ width:28,height:28,borderRadius:"50%",flexShrink:0,background:"rgba(5,240,255,0.08)",border:"1.5px solid rgba(5,240,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:900,color:"var(--cyan)",fontFamily:"var(--mono)" }}>{v.initials}</div>
                <div>
                  <div style={{ fontSize:11,fontWeight:700,color:"#fff",fontFamily:"var(--font)" }}>{v.name}</div>
                  <div style={{ fontSize:9.5,color:"var(--text3)",fontFamily:"var(--mono)" }}>{v.city}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── JOIN ── */}
      <div id="india-join" className="card" style={{ marginBottom:20,maxWidth:560 }}>
        <div className="card-title">Be Part Of Something Real</div>
        <p style={{ fontSize:12,color:"var(--text2)",marginBottom:18,lineHeight:1.7,fontFamily:"var(--font)" }}>
          Indian football doesn't need spectators.<br/>
          <strong style={{ color:"#fff" }}>It needs people who show up.</strong>
        </p>
        <JoinForm />
      </div>

      {/* ── CITY MARQUEE ── */}
      <div style={{ overflow:"hidden",marginBottom:20,maskImage:"linear-gradient(90deg,transparent,black 10%,black 90%,transparent)" }}>
        <div style={{ display:"flex",gap:20,animation:"indiaMarquee 22s linear infinite",whiteSpace:"nowrap" }}>
          {[...CITIES,...CITIES].map((c,i) => (
            <span key={i} style={{ display:"flex",alignItems:"center",gap:6,fontSize:9,fontWeight:900,textTransform:"uppercase",letterSpacing:"0.15em",color:"var(--text3)",fontFamily:"var(--mono)" }}>
              <span style={{ color:"rgba(5,240,255,0.3)",fontSize:5 }}>●</span>{c}
            </span>
          ))}
        </div>
      </div>

      {/* ── FOOTER STRIP ── */}
      <div style={{ padding:"16px 20px",borderRadius:"var(--radius)",background:"var(--bg2)",border:"1px solid var(--border)",textAlign:"center" }}>
        <p style={{ fontSize:12,fontWeight:900,color:"var(--text2)",fontFamily:"var(--font)",letterSpacing:"0.04em",fontStyle:"italic" }}>
          "No shortcuts. No hype. Just football — built from the ground up."
        </p>
        <p style={{ fontSize:9,color:"var(--cyan)",fontFamily:"var(--mono)",marginTop:6,letterSpacing:"0.14em",textTransform:"uppercase",opacity:0.5 }}>
          India Football Community · Est. Now
        </p>
      </div>
    </div>
  );
}