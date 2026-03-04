import { useState, useEffect } from "react";
import { useGameweek } from "../hooks/useGameweek";
import { api } from "../api/client";

// ─── TEAM KIT COLORS (by short name from API team_name) ───────────────────────
const KITS = {
  Liverpool:       { p: "#C8102E", s: "#00B2A9" },
  Arsenal:         { p: "#EF0107", s: "#063672" },
  "Man City":      { p: "#6CABDD", s: "#1C2C5B" },
  Chelsea:         { p: "#034694", s: "#DBA111" },
  Spurs:           { p: "#EFEFEF", s: "#132257" },
  "Aston Villa":   { p: "#670E36", s: "#95BFE5" },
  Newcastle:       { p: "#101010", s: "#FFFFFF" },
  Brentford:       { p: "#E30613", s: "#FFFFFF" },
  Everton:         { p: "#003399", s: "#FFFFFF" },
  "Crystal Palace":{ p: "#1B458F", s: "#C4122E" },
  Fulham:          { p: "#FFFFFF", s: "#CC0000" },
  "Man Utd":       { p: "#DA291C", s: "#FBE122" },
  Brighton:        { p: "#0057B8", s: "#FFCD00" },
  Southampton:     { p: "#D71920", s: "#130C0E" },
  Bournemouth:     { p: "#DA291C", s: "#000000" },
  "Nott'm Forest": { p: "#DD0000", s: "#FFFFFF" },
  Wolves:          { p: "#FDB913", s: "#231F20" },
  "West Ham":      { p: "#7A263A", s: "#1BB1E7" },
  Leicester:       { p: "#003090", s: "#FDBE11" },
  Ipswich:         { p: "#0044A9", s: "#FFFFFF" },
  Burnley:         { p: "#6C1D45", s: "#99D6EA" },
};

const DEFAULT_KIT = { p: "#374151", s: "#6B7280" };

function getKit(teamName) {
  return KITS[teamName] || DEFAULT_KIT;
}

// ─── FPL-ACCURATE SHIRT SVG ───────────────────────────────────────────────────
function Shirt({ teamName, size = 52, captain = false, vice = false }) {
  const k = getKit(teamName);
  const w = size;
  const h = size * 1.12;

  return (
    <svg width={w} height={h} viewBox="0 0 100 112" fill="none"
      style={{ filter: "drop-shadow(0px 5px 10px rgba(0,0,0,0.55))", overflow: "visible" }}>
      <path d="M8 28 L26 16 L38 42 L20 50 Z" fill={k.s} stroke="rgba(0,0,0,0.2)" strokeWidth="0.7"/>
      <path d="M92 28 L74 16 L62 42 L80 50 Z" fill={k.s} stroke="rgba(0,0,0,0.2)" strokeWidth="0.7"/>
      <path d="M26 16 L38 8 Q48 3 50 3 Q52 3 62 8 L74 16 L80 50 L76 108 L24 108 L20 50 Z"
        fill={k.p} stroke="rgba(0,0,0,0.15)" strokeWidth="0.7"/>
      <path d="M40 9 Q46 2 50 1 Q54 2 60 9 Q56 17 50 17 Q44 17 40 9 Z"
        fill={k.s} stroke="rgba(0,0,0,0.2)" strokeWidth="0.6"/>
      <path d="M38 24 Q50 18 60 24 L62 68 Q50 73 38 68 Z" fill="rgba(255,255,255,0.06)"/>
      <path d="M24 50 L28 108 L24 108 L20 50Z" fill="rgba(0,0,0,0.08)"/>
      <path d="M76 50 L72 108 L76 108 L80 50Z" fill="rgba(0,0,0,0.08)"/>
      {(captain || vice) && (
        <>
          <circle cx="50" cy="42" r="11"
            fill={captain ? "#F5C518" : "rgba(255,255,255,0.88)"}
            stroke="rgba(0,0,0,0.15)" strokeWidth="0.8"/>
          <text x="50" y="46.5" textAnchor="middle" fontSize="12" fontWeight="900"
            fill={captain ? "#1a0a00" : "#1a1a1a"} fontFamily="Arial Black, sans-serif">
            {captain ? "C" : "V"}
          </text>
        </>
      )}
    </svg>
  );
}

const POS_BG = { GK: "#EBFF00", DEF: "#00FF87", MID: "#05F0FF", FWD: "#FF4D4D" };
const POS_TX = { GK: "#1a1a00", DEF: "#001a0e", MID: "#001a1a", FWD: "#1a0000" };

// ─── PLAYER CARD ──────────────────────────────────────────────────────────────
function Card({ p, small = false }) {
  const [hover, setHover] = useState(false);
  const sz = small ? 44 : 54;
  const w  = small ? 70 : 82;

  const ptsBg =
    (p.predicted_pts || 0) >= 8 ? "#ebff00"
    : (p.predicted_pts || 0) >= 6 ? "#39ff14"
    : (p.predicted_pts || 0) >= 4 ? "rgba(255,255,255,0.22)"
    : "rgba(255,255,255,0.09)";
  const ptsTx = (p.predicted_pts || 0) >= 4 ? "#0a1a00" : "rgba(255,255,255,0.65)";

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        width: w, cursor: "pointer", position: "relative",
        transform: hover ? "translateY(-6px) scale(1.05)" : "none",
        transition: "transform 0.2s cubic-bezier(0.34,1.56,0.64,1)",
        zIndex: hover ? 30 : 1,
      }}
    >
      <div style={{ position: "relative" }}>
        <Shirt
          teamName={p.team_name}
          size={sz}
          captain={p.is_captain}
          vice={p.is_vice_captain}
        />
      </div>

      {/* Name badge */}
      <div style={{
        marginTop: 4,
        background: "rgba(255,255,255,0.93)",
        borderRadius: 3,
        padding: small ? "2px 4px" : "2px 6px",
        width: "100%",
        textAlign: "center",
        boxShadow: "0 2px 5px rgba(0,0,0,0.4)",
      }}>
        <div style={{
          fontSize: small ? 9 : 10.5,
          fontWeight: 800,
          color: "#1a1e2e",
          letterSpacing: "0.01em",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          fontFamily: "'Barlow Condensed', 'Arial Narrow', Impact, sans-serif",
          textTransform: "uppercase",
        }}>
          {p.web_name?.toUpperCase() || p.name}
        </div>
      </div>

      {/* Predicted pts badge */}
      <div style={{
        marginTop: 2,
        background: ptsBg,
        borderRadius: 3,
        padding: small ? "1px 4px" : "1px 6px",
        width: "100%",
        textAlign: "center",
        transition: "background 0.2s",
      }}>
        <div style={{
          fontSize: small ? 9 : 10.5,
          fontWeight: 900,
          color: ptsTx,
          fontFamily: "'Barlow Condensed', 'Arial Narrow', monospace",
          letterSpacing: "0.02em",
        }}>
          {small
            ? (p.predicted_pts || 0).toFixed(1)
            : `${(p.predicted_pts || 0).toFixed(1)} pts`}
        </div>
      </div>

      {/* Hover tooltip */}
      {hover && (
        <div style={{
          position: "absolute",
          bottom: "calc(100% + 12px)",
          left: "50%",
          transform: "translateX(-50%)",
          background: "#111827",
          border: "1px solid rgba(5,240,255,0.18)",
          borderRadius: 10,
          padding: "10px 12px",
          whiteSpace: "nowrap",
          zIndex: 999,
          boxShadow: "0 12px 36px rgba(0,0,0,0.8)",
          pointerEvents: "none",
        }}>
          <div style={{
            fontSize: 12, fontWeight: 900, color: "#fff",
            fontFamily: "'Barlow Condensed', sans-serif",
            textTransform: "uppercase", letterSpacing: "0.06em",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            paddingBottom: 5, marginBottom: 7,
          }}>
            {p.web_name}
            <span style={{
              marginLeft: 7, fontSize: 9,
              background: POS_BG[p.position], color: POS_TX[p.position],
              borderRadius: 3, padding: "1px 5px", fontWeight: 800,
            }}>
              {p.position}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px 14px" }}>
            {[
              ["⚡", "Predicted", `${(p.predicted_pts || 0).toFixed(2)} pts`],
              ["£",  "Price",     `£${p.price}m`],
              ["🏟", "Team",      p.team_name],
              ["📍", "Position",  p.position],
            ].map(([ico, lbl, val]) => (
              <div key={lbl}>
                <div style={{ fontSize: 8.5, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em" }}>{ico} {lbl}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#05f0ff", fontFamily: "monospace" }}>{val}</div>
              </div>
            ))}
          </div>
          {p.is_captain && (
            <div style={{ marginTop: 7, fontSize: 10, color: "#F5C518", fontWeight: 800, textAlign: "center", fontFamily: "monospace" }}>
              ★ CAPTAIN — 2× POINTS
            </div>
          )}
          {p.is_vice_captain && (
            <div style={{ marginTop: 7, fontSize: 10, color: "rgba(255,255,255,0.7)", fontWeight: 800, textAlign: "center", fontFamily: "monospace" }}>
              ↑ VICE CAPTAIN
            </div>
          )}
          <div style={{
            position: "absolute", bottom: -5, left: "50%",
            transform: "translateX(-50%) rotate(45deg)",
            width: 8, height: 8, background: "#111827",
            borderRight: "1px solid rgba(5,240,255,0.18)",
            borderBottom: "1px solid rgba(5,240,255,0.18)",
          }}/>
        </div>
      )}
    </div>
  );
}

// ─── ROW OF PLAYERS ───────────────────────────────────────────────────────────
function Row({ players }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-evenly",
      alignItems: "flex-start", width: "100%",
      padding: "16px 20px 6px",
    }}>
      {players.map((p, i) => <Card key={p.web_name + i} p={p} />)}
    </div>
  );
}

// ─── SKELETON LOADING ─────────────────────────────────────────────────────────
function SkeletonCard({ small = false }) {
  const w = small ? 70 : 82;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: w, gap: 4 }}>
      <div style={{ width: small ? 44 : 54, height: small ? 49 : 60, borderRadius: 6, background: "rgba(255,255,255,0.06)", animation: "pulse 1.5s ease-in-out infinite" }}/>
      <div style={{ width: "100%", height: 16, borderRadius: 3, background: "rgba(255,255,255,0.06)", animation: "pulse 1.5s ease-in-out infinite" }}/>
      <div style={{ width: "80%", height: 14, borderRadius: 3, background: "rgba(255,255,255,0.04)", animation: "pulse 1.5s ease-in-out infinite" }}/>
    </div>
  );
}

function SkeletonRow({ count }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-evenly", alignItems: "flex-start", width: "100%", padding: "16px 20px 6px" }}>
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}

// ─── MAIN PITCH COMPONENT ─────────────────────────────────────────────────────
export default function MainPitch() {
  const { gw, loading: gwLoading } = useGameweek();
  const gwLabel = gwLoading ? "···" : gw ? `GAMEWEEK ${gw}` : "PREMIER LEAGUE";

  const [squad,    setSquad]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    async function loadSquad() {
      try {
        setLoading(true);
        setError(null);
        const data = await api.optimizeSquad(100);
        setSquad(data);
      } catch (e) {
        setError(e.message || "Failed to load squad");
      } finally {
        setLoading(false);
      }
    }
    loadSquad();
  }, []);

  // Group starters by position
  const grouped = squad ? {
    GK:  squad.starters.filter(p => p.position === "GK"),
    DEF: squad.starters.filter(p => p.position === "DEF"),
    MID: squad.starters.filter(p => p.position === "MID"),
    FWD: squad.starters.filter(p => p.position === "FWD"),
  } : null;

  const totalPredicted = squad
    ? squad.starters.reduce((a, p) => a + (p.is_captain ? p.predicted_pts * 2 : p.predicted_pts), 0).toFixed(1)
    : "—";

  return (
    <div style={{ width: "100%", maxWidth: 660, margin: "0 auto", fontFamily: "'Barlow Condensed',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800;900&display=swap');
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Header bar */}
      <div style={{
        background: "linear-gradient(135deg,#06101c,#0e1d30)",
        borderRadius: "14px 14px 0 0",
        padding: "10px 18px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            background: "linear-gradient(135deg,#05f0ff,#0090ff)",
            borderRadius: 7, padding: "4px 10px",
            fontSize: 12, fontWeight: 900, color: "#001a2e", letterSpacing: "0.04em",
          }}>
            Fantasy
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: "rgba(255,255,255,0.9)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Premier League</div>
            <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.35)", fontFamily: "monospace", letterSpacing: "0.1em" }}>{gwLabel}</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          {loading ? (
            <div style={{ width: 48, height: 32, borderRadius: 6, background: "rgba(255,255,255,0.06)", animation: "pulse 1.5s ease-in-out infinite" }}/>
          ) : (
            <>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#05f0ff", lineHeight: 1 }}>{totalPredicted}</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em" }}>PRED PTS</div>
            </>
          )}
        </div>
      </div>

      {/* Captain / Vice strip */}
      {squad && !loading && (
        <div style={{
          background: "rgba(5,240,255,0.06)",
          borderBottom: "1px solid rgba(5,240,255,0.1)",
          padding: "6px 18px",
          display: "flex", gap: 16, alignItems: "center",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#F5C518", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 900, color: "#1a0a00" }}>C</div>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#F5C518", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "monospace" }}>{squad.captain}</span>
          </div>
          <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.1)" }}/>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(255,255,255,0.88)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 900, color: "#1a1a1a" }}>V</div>
            <span style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.6)", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "monospace" }}>{squad.vice_captain}</span>
          </div>
          <div style={{ marginLeft: "auto", fontSize: 9, color: "rgba(255,255,255,0.25)", fontFamily: "monospace" }}>
            AI SELECTED · £{squad.total_cost}m
          </div>
        </div>
      )}

      {/* Pitch */}
      <div style={{ position: "relative", overflow: "hidden" }}>
        {/* Striped grass */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `repeating-linear-gradient(180deg,#1b6b1b 0px,#1b6b1b 40px,#1e7520 40px,#1e7520 80px)`,
        }}/>

        {/* Pitch markings */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
          viewBox="0 0 660 490" preserveAspectRatio="xMidYMid slice">
          <rect x="16" y="8" width="628" height="474" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5"/>
          <line x1="16" y1="245" x2="644" y2="245" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
          <circle cx="330" cy="245" r="64" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1"/>
          <circle cx="330" cy="245" r="2.5" fill="rgba(255,255,255,0.3)"/>
          <rect x="178" y="8" width="304" height="96" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1"/>
          <rect x="254" y="8" width="152" height="40" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1"/>
          <circle cx="330" cy="76" r="2" fill="rgba(255,255,255,0.25)"/>
          <path d="M282 104 Q330 136 378 104" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1"/>
          <rect x="178" y="386" width="304" height="96" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1"/>
          <rect x="254" y="442" width="152" height="40" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1"/>
          <circle cx="330" cy="414" r="2" fill="rgba(255,255,255,0.25)"/>
          <path d="M282 386 Q330 354 378 386" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1"/>
          {[[16,8],[644,8],[16,482],[644,482]].map(([cx,cy],i)=>(
            <circle key={i} cx={cx} cy={cy} r="7" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
          ))}
        </svg>

        {/* Players */}
        <div style={{ position: "relative", zIndex: 2, paddingTop: 4, paddingBottom: 4 }}>
          {loading ? (
            <>
              <SkeletonRow count={3}/>
              <SkeletonRow count={3}/>
              <SkeletonRow count={4}/>
              <SkeletonRow count={1}/>
            </>
          ) : error ? (
            <div style={{ padding: "60px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "rgba(255,100,100,0.8)", fontFamily: "monospace" }}>
                {error}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 8, fontFamily: "monospace" }}>
                Make sure the backend is running
              </div>
            </div>
          ) : grouped ? (
            <>
              <Row players={grouped.FWD}/>
              <Row players={grouped.MID}/>
              <Row players={grouped.DEF}/>
              <Row players={grouped.GK} />
            </>
          ) : null}
        </div>
      </div>

      {/* Bench */}
      <div style={{
        background: "linear-gradient(180deg,#0c1520,#0a1118)",
        borderRadius: "0 0 14px 14px",
        padding: "10px 16px 16px",
        border: "1px solid rgba(255,255,255,0.06)",
        borderTop: "none",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }}/>
          <span style={{ fontSize: 9.5, fontWeight: 800, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.2em", fontFamily: "monospace" }}>Bench</span>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }}/>
        </div>
        <div style={{
          display: "flex", justifyContent: "space-evenly", alignItems: "flex-start",
          background: "rgba(255,255,255,0.025)",
          borderRadius: 10,
          border: "1px dashed rgba(255,255,255,0.09)",
          padding: "12px 8px 10px",
        }}>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(255,255,255,0.06)", animation: "pulse 1.5s ease-in-out infinite" }}/>
                <SkeletonCard small/>
              </div>
            ))
          ) : squad?.bench ? (
            squad.bench.map((p, i) => (
              <div key={p.web_name + i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <div style={{
                  width: 18, height: 18, borderRadius: "50%",
                  background: "rgba(255,255,255,0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.4)", fontFamily: "monospace",
                }}>
                  {i + 1}
                </div>
                <Card p={p} small/>
              </div>
            ))
          ) : null}
        </div>
      </div>
    </div>
  );
}