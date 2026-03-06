import { useState, useEffect, useCallback } from "react";
import { useGameweek } from "../hooks/useGameweek";
import { api } from "../api/client";
import { useAuth } from "../hooks/useAuth.jsx";

// ─── TEAM KIT COLORS ──────────────────────────────────────────────────────────
const KITS = {
  Liverpool:        { p: "#C8102E", s: "#00B2A9" },
  Arsenal:          { p: "#EF0107", s: "#063672" },
  "Man City":       { p: "#6CABDD", s: "#1C2C5B" },
  Chelsea:          { p: "#034694", s: "#DBA111" },
  Spurs:            { p: "#EFEFEF", s: "#132257" },
  "Aston Villa":    { p: "#670E36", s: "#95BFE5" },
  Newcastle:        { p: "#101010", s: "#FFFFFF" },
  Brentford:        { p: "#E30613", s: "#FFFFFF" },
  Everton:          { p: "#003399", s: "#FFFFFF" },
  "Crystal Palace": { p: "#1B458F", s: "#C4122E" },
  Fulham:           { p: "#FFFFFF", s: "#CC0000" },
  "Man Utd":        { p: "#DA291C", s: "#FBE122" },
  Brighton:         { p: "#0057B8", s: "#FFCD00" },
  Southampton:      { p: "#D71920", s: "#130C0E" },
  Bournemouth:      { p: "#DA291C", s: "#000000" },
  "Nott'm Forest":  { p: "#DD0000", s: "#FFFFFF" },
  Wolves:           { p: "#FDB913", s: "#231F20" },
  "West Ham":       { p: "#7A263A", s: "#1BB1E7" },
  Leicester:        { p: "#003090", s: "#FDBE11" },
  Ipswich:          { p: "#0044A9", s: "#FFFFFF" },
  Burnley:          { p: "#6C1D45", s: "#99D6EA" },
};
const DEFAULT_KIT = { p: "#374151", s: "#6B7280" };
const getKit = (n) => KITS[n] || DEFAULT_KIT;

const POS_BG = { GK: "#EBFF00", DEF: "#00FF87", MID: "#05F0FF", FWD: "#FF4D4D" };
const POS_TX = { GK: "#1a1a00", DEF: "#001a0e", MID: "#001a1a", FWD: "#1a0000" };

// ─── PRO SVG ICONS ────────────────────────────────────────────────────────────
const Icon = {
  Robot: ({ size = 14, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="8" width="18" height="12" rx="2"/>
      <path d="M9 8V6a3 3 0 0 1 6 0v2"/>
      <circle cx="9" cy="14" r="1.5" fill={color} stroke="none"/>
      <circle cx="15" cy="14" r="1.5" fill={color} stroke="none"/>
      <path d="M8 18h2m4 0h2"/>
      <line x1="12" y1="2" x2="12" y2="5"/>
    </svg>
  ),
  Brain: ({ size = 14, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2a4.5 4.5 0 0 1 4.5 4.5v.5h1a4 4 0 0 1 0 8h-1v.5a4.5 4.5 0 0 1-9 0v-13A4.5 4.5 0 0 1 9.5 2z"/>
      <path d="M14.5 6.5c1.5 0 3 1.5 3 3"/><path d="M14.5 13.5c1.5 0 3-1.5 3-3"/>
    </svg>
  ),
  Swords: ({ size = 14, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/>
      <line x1="13" y1="19" x2="19" y2="13"/>
      <polyline points="20 16 16 20"/>
      <line x1="5" y1="11" x2="11" y2="5"/>
      <polyline points="4 8 8 4"/>
    </svg>
  ),
  Swap: ({ size = 13, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 16V4m0 0L3 8m4-4l4 4"/><path d="M17 8v12m0 0l4-4m-4 4l-4-4"/>
    </svg>
  ),
  Check: ({ size = 12, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  Reset: ({ size = 11, color = "currentColor" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
    </svg>
  ),
  Pound: ({ size = 12, color = "#05f0ff" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
      <path d="M6 16h12"/><path d="M7 8a4 4 0 0 1 8 0c0 6-2 8-2 8H7"/>
    </svg>
  ),
  Lock: ({ size = 11, color = "rgba(255,200,80,0.9)" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
      <rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>
    </svg>
  ),
};

// ─── SHIRT ────────────────────────────────────────────────────────────────────
function Shirt({ teamName, size = 52, captain = false, vice = false, swappable = false, swapped = false }) {
  const k = getKit(teamName);
  const w = size, h = size * 1.12;
  return (
    <svg width={w} height={h} viewBox="0 0 100 112" fill="none"
      style={{ filter: swapped ? "drop-shadow(0px 5px 14px rgba(235,255,0,0.65))" : swappable ? "drop-shadow(0px 5px 10px rgba(5,240,255,0.45))" : "drop-shadow(0px 5px 10px rgba(0,0,0,0.55))", overflow: "visible" }}>
      <path d="M8 28 L26 16 L38 42 L20 50 Z" fill={k.s} stroke="rgba(0,0,0,0.2)" strokeWidth="0.7"/>
      <path d="M92 28 L74 16 L62 42 L80 50 Z" fill={k.s} stroke="rgba(0,0,0,0.2)" strokeWidth="0.7"/>
      <path d="M26 16 L38 8 Q48 3 50 3 Q52 3 62 8 L74 16 L80 50 L76 108 L24 108 L20 50 Z" fill={k.p} stroke="rgba(0,0,0,0.15)" strokeWidth="0.7"/>
      <path d="M40 9 Q46 2 50 1 Q54 2 60 9 Q56 17 50 17 Q44 17 40 9 Z" fill={k.s} stroke="rgba(0,0,0,0.2)" strokeWidth="0.6"/>
      <path d="M38 24 Q50 18 60 24 L62 68 Q50 73 38 68 Z" fill="rgba(255,255,255,0.06)"/>
      {swapped && <path d="M26 16 L38 8 Q48 3 50 3 Q52 3 62 8 L74 16 L80 50 L76 108 L24 108 L20 50 Z" fill="rgba(235,255,0,0.14)" stroke="rgba(235,255,0,0.55)" strokeWidth="1.6"/>}
      {swappable && !swapped && <path d="M26 16 L38 8 Q48 3 50 3 Q52 3 62 8 L74 16 L80 50 L76 108 L24 108 L20 50 Z" fill="rgba(5,240,255,0.07)" stroke="rgba(5,240,255,0.38)" strokeWidth="1.2"/>}
      {(captain || vice) && (
        <>
          <circle cx="50" cy="42" r="11" fill={captain ? "#F5C518" : "rgba(255,255,255,0.88)"} stroke="rgba(0,0,0,0.15)" strokeWidth="0.8"/>
          <text x="50" y="46.5" textAnchor="middle" fontSize="12" fontWeight="900" fill={captain ? "#1a0a00" : "#1a1a1a"} fontFamily="Arial Black, sans-serif">{captain ? "C" : "V"}</text>
        </>
      )}
    </svg>
  );
}

// ─── CARD ─────────────────────────────────────────────────────────────────────
function Card({ p, small = false, challengeMode = false, isUserTeam = false, onSwap, tooltipBelow = false }) {
  const [hover, setHover] = useState(false);
  const sz = small ? 44 : 54, w = small ? 70 : 82;
  const isSwapped = p._swapped;
  const clickable = challengeMode && isUserTeam && !small;
  const ptsBg = (p.predicted_pts||0) >= 8 ? "#ebff00" : (p.predicted_pts||0) >= 6 ? "#39ff14" : (p.predicted_pts||0) >= 4 ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.09)";
  const ptsTx = (p.predicted_pts||0) >= 4 ? "#0a1a00" : "rgba(255,255,255,0.65)";

  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onClick={clickable ? () => onSwap(p) : undefined}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", width: w, cursor: clickable ? "pointer" : "default", position: "relative", transform: hover ? "translateY(-6px) scale(1.05)" : "none", transition: "transform 0.2s cubic-bezier(0.34,1.56,0.64,1)", zIndex: hover ? 30 : 1 }}>
      <div style={{ position: "relative" }}>
        <Shirt teamName={p.team_name} size={sz} captain={p.is_captain} vice={p.is_vice_captain} swappable={clickable} swapped={isSwapped} />
        {clickable && (
          <div style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: isSwapped ? "#ebff00" : "rgba(5,240,255,0.92)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.5)", zIndex: 10 }}>
            {isSwapped ? <Icon.Check size={10} color="#1a1a00" /> : <Icon.Swap size={10} color="#001a1a" />}
          </div>
        )}
      </div>
      <div style={{ marginTop: 4, background: isSwapped ? "rgba(235,255,0,0.92)" : "rgba(255,255,255,0.93)", borderRadius: 3, padding: small ? "2px 4px" : "2px 6px", width: "100%", textAlign: "center", boxShadow: "0 2px 5px rgba(0,0,0,0.4)" }}>
        <div style={{ fontSize: small ? 9 : 10.5, fontWeight: 800, color: isSwapped ? "#1a1a00" : "#1a1e2e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "'Barlow Condensed','Arial Narrow',Impact,sans-serif", textTransform: "uppercase" }}>
          {p.web_name?.toUpperCase() || p.name}
        </div>
      </div>
      <div style={{ marginTop: 2, background: ptsBg, borderRadius: 3, padding: small ? "1px 4px" : "1px 6px", width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: small ? 9 : 10.5, fontWeight: 900, color: ptsTx, fontFamily: "'Barlow Condensed',monospace", letterSpacing: "0.02em" }}>
          {small ? (p.predicted_pts||0).toFixed(1) : `${(p.predicted_pts||0).toFixed(1)} pts`}
        </div>
      </div>
      {hover && !clickable && (
        <div style={{ position: "absolute", ...(tooltipBelow ? { top: "calc(100% + 12px)" } : { bottom: "calc(100% + 12px)" }), left: "50%", transform: "translateX(-50%)", background: "#111827", border: "1px solid rgba(5,240,255,0.18)", borderRadius: 10, padding: "10px 12px", whiteSpace: "nowrap", zIndex: 999, boxShadow: "0 12px 36px rgba(0,0,0,0.8)", pointerEvents: "none" }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: "#fff", fontFamily: "'Barlow Condensed',sans-serif", textTransform: "uppercase", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 5, marginBottom: 7 }}>
            {p.web_name}<span style={{ marginLeft: 7, fontSize: 9, background: POS_BG[p.position], color: POS_TX[p.position], borderRadius: 3, padding: "1px 5px", fontWeight: 800 }}>{p.position}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px 14px" }}>
            {[["Predicted", `${(p.predicted_pts||0).toFixed(2)} pts`],["Price",`£${p.price}m`],["Team",p.team_name],["Position",p.position]].map(([lbl,val]) => (
              <div key={lbl}><div style={{ fontSize: 8.5, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", textTransform: "uppercase" }}>{lbl}</div><div style={{ fontSize: 13, fontWeight: 800, color: "#05f0ff", fontFamily: "monospace" }}>{val}</div></div>
            ))}
          </div>
          {p.is_captain && <div style={{ marginTop: 7, fontSize: 10, color: "#F5C518", fontWeight: 800, textAlign: "center", fontFamily: "monospace" }}>CAPTAIN — 2x POINTS</div>}
          {p.is_vice_captain && <div style={{ marginTop: 7, fontSize: 10, color: "rgba(255,255,255,0.7)", fontWeight: 800, textAlign: "center", fontFamily: "monospace" }}>VICE CAPTAIN</div>}
          {/* Arrow — points up if tooltip is below, points down if tooltip is above */}
          <div style={{ position: "absolute", ...(tooltipBelow ? { top: -5, borderLeft: "1px solid rgba(5,240,255,0.18)", borderTop: "1px solid rgba(5,240,255,0.18)" } : { bottom: -5, borderRight: "1px solid rgba(5,240,255,0.18)", borderBottom: "1px solid rgba(5,240,255,0.18)" }), left: "50%", transform: "translateX(-50%) rotate(45deg)", width: 8, height: 8, background: "#111827" }}/>
        </div>
      )}
    </div>
  );
}

function Row({ players, challengeMode, isUserTeam, onSwap, tooltipBelow = false }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-evenly", alignItems: "flex-start", width: "100%", padding: "16px 20px 6px" }}>
      {players.map((p, i) => <Card key={p.web_name+i} p={p} challengeMode={challengeMode} isUserTeam={isUserTeam} onSwap={onSwap} tooltipBelow={tooltipBelow} />)}
    </div>
  );
}

function SkeletonCard({ small = false }) {
  const w = small ? 70 : 82;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: w, gap: 4 }}>
      <div style={{ width: small?44:54, height: small?49:60, borderRadius: 6, background: "rgba(255,255,255,0.06)", animation: "pulse 1.5s ease-in-out infinite" }}/>
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

// ─── SWAP MODAL ───────────────────────────────────────────────────────────────
function SwapModal({ player, positionPlayers, loadingPlayers, userTeam, remainingBudget, onConfirm, onClose }) {
  const [search, setSearch] = useState("");
  const outgoingPrice = parseFloat(player.price) || 0;
  // Max they can spend = outgoing player's price + whatever budget they have left in the bank
  const affordableCeiling = outgoingPrice + remainingBudget;

  const currentTeamIds = new Set([
    ...userTeam.starters.map(p => p.player_id),
    ...userTeam.bench.map(p => p.player_id),
  ]);
  currentTeamIds.delete(player.player_id);

  const affordable = positionPlayers.filter(p => {
    const price = parseFloat(p.price) || 0;
    return price <= affordableCeiling + 0.05 && !currentTeamIds.has(p.player_id);
  });

  const tooExpensive = positionPlayers.filter(p => {
    const price = parseFloat(p.price) || 0;
    return price > affordableCeiling + 0.05 && !currentTeamIds.has(p.player_id);
  }).length;

  const candidates = affordable
    .filter(p => !search || p.web_name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.predicted_pts - a.predicted_pts);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={onClose}>
      <div className="swap-modal-inner" style={{ background: "linear-gradient(135deg,#06101c,#0e1d30)", borderRadius: 16, width: "100%", maxWidth: 460, border: "1px solid rgba(5,240,255,0.2)", boxShadow: "0 24px 80px rgba(0,0,0,0.9)", overflow: "hidden", maxHeight: "85vh", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: "14px 18px", background: "rgba(5,240,255,0.06)", borderBottom: "1px solid rgba(5,240,255,0.12)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>Replace</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#fff", fontFamily: "'Barlow Condensed',sans-serif", textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 8 }}>
              {player.web_name}
              <span style={{ fontSize: 10, background: POS_BG[player.position], color: POS_TX[player.position], borderRadius: 3, padding: "2px 6px", fontWeight: 800 }}>{player.position}</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>£{outgoingPrice.toFixed(1)}m</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.08)", border: "none", cursor: "pointer", width: 32, height: 32, borderRadius: "50%", color: "rgba(255,255,255,0.6)", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        {/* Budget bar */}
        <div style={{ padding: "8px 18px", background: "rgba(0,0,0,0.25)", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Icon.Pound size={12} color="#ebff00" />
            <span style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Max you can spend</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 900, color: "#ebff00", fontFamily: "monospace" }}>£{affordableCeiling.toFixed(1)}m</span>
            {tooExpensive > 0 && (
              <span style={{ fontSize: 9, color: "rgba(255,120,120,0.7)", fontFamily: "monospace", background: "rgba(255,100,100,0.1)", borderRadius: 4, padding: "2px 6px", display: "flex", alignItems: "center", gap: 3 }}>
                <Icon.Lock size={9} color="rgba(255,120,120,0.7)" /> {tooExpensive} too expensive
              </span>
            )}
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: "10px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
            placeholder={`Search ${player.position} players within £${affordableCeiling.toFixed(1)}m...`}
            style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(5,240,255,0.2)", borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 13, fontFamily: "monospace", outline: "none" }}
          />
        </div>

        {/* List */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {loadingPlayers ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "rgba(255,255,255,0.4)", fontFamily: "monospace", fontSize: 12 }}>Loading {player.position} players...</div>
          ) : candidates.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "rgba(255,255,255,0.3)", fontFamily: "monospace", fontSize: 12 }}>
              {search ? `No results for "${search}"` : `No affordable ${player.position} available`}
            </div>
          ) : candidates.map((p, i) => {
            const price = parseFloat(p.price) || 0;
            const diff = price - outgoingPrice;
            return (
              <div key={p.player_id} onClick={() => onConfirm(p)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer", background: i%2===0 ? "transparent" : "rgba(255,255,255,0.018)", transition: "background 0.12s" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(5,240,255,0.08)"}
                onMouseLeave={e => e.currentTarget.style.background = i%2===0 ? "transparent" : "rgba(255,255,255,0.018)"}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                  <Shirt teamName={p.team_name} size={30} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", fontFamily: "'Barlow Condensed',sans-serif", textTransform: "uppercase" }}>{p.web_name}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "monospace", display: "flex", alignItems: "center", gap: 5 }}>
                      {p.team_name}
                      <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
                      <span style={{ color: "#ebff00", fontWeight: 700 }}>£{price.toFixed(1)}m</span>
                      {diff !== 0 && (
                        <span style={{ fontSize: 9, fontWeight: 800, color: diff>0 ? "rgba(255,120,120,0.85)" : "rgba(80,255,150,0.85)", background: diff>0 ? "rgba(255,100,100,0.1)" : "rgba(80,255,150,0.1)", borderRadius: 3, padding: "1px 4px" }}>
                          {diff>0 ? `+£${diff.toFixed(1)}m` : `-£${Math.abs(diff).toFixed(1)}m`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 900, fontFamily: "monospace", color: p.predicted_pts>=6 ? "#39ff14" : p.predicted_pts>=4 ? "#05f0ff" : "rgba(255,255,255,0.45)" }}>
                    {(p.predicted_pts||0).toFixed(1)}
                  </div>
                  <div style={{ fontSize: 8.5, color: "rgba(255,255,255,0.25)", fontFamily: "monospace", textTransform: "uppercase" }}>pred pts</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: "8px 18px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.2)", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>{candidates.length} {player.position} options shown</span>
          {tooExpensive > 0 && <span style={{ fontSize: 10, color: "rgba(255,120,120,0.5)", fontFamily: "monospace" }}>{tooExpensive} hidden (over budget)</span>}
        </div>
      </div>
    </div>
  );
}

// ─── COUNTDOWN HOOK ───────────────────────────────────────────────────────────
function useCountdown(deadlineTime) {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    if (!deadlineTime) return;
    const deadline = new Date(deadlineTime);
    function tick() {
      const diff = deadline - Date.now();
      if (diff <= 0) { setTimeLeft("DEADLINE PASSED"); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (d > 0) setTimeLeft(`${d}d ${h}h ${m}m`);
      else if (h > 0) setTimeLeft(`${h}h ${m}m ${s}s`);
      else setTimeLeft(`${m}m ${s}s`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadlineTime]);
  return timeLeft;
}

// ─── CHALLENGE STRIP ──────────────────────────────────────────────────────────
// Pre-GW: countdown to deadline + "result revealed after GW ends"
// Post-GW: actual scoreboard from history
function ChallengeStrip({ gwFinished, deadlineTime, history, gw }) {
  const countdown = useCountdown(deadlineTime);
  const deadlinePassed = deadlineTime ? Date.now() > new Date(deadlineTime) : false;
  const thisGwResult = history.find(h => h.gw === gw);

  // Post-GW with result — show real scoreboard
  if (gwFinished && history.length > 0) {
    const modelTotal = history.reduce((a, h) => a + (h.model_pts || 0), 0);
    const userTotal  = history.reduce((a, h) => a + (h.user_pts  || 0), 0);
    const latest     = thisGwResult || history[history.length - 1];
    const diff       = userTotal - modelTotal;
    const leading    = diff > 0 ? "YOU" : diff < 0 ? "MODEL" : "TIED";
    return (
      <div style={{ background: "linear-gradient(135deg,rgba(5,240,255,0.08),rgba(235,255,0,0.06))", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "10px 18px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 9, color: "rgba(5,240,255,0.6)", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>🤖 Model</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: "#05f0ff", fontFamily: "'Barlow Condensed',sans-serif", lineHeight: 1 }}>{latest.model_pts}</div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontFamily: "monospace", marginTop: 2 }}>GW{latest.gw} · Total: {modelTotal}</div>
        </div>
        <div style={{ textAlign: "center", minWidth: 60 }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: "rgba(255,255,255,0.15)", fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: "0.15em", marginBottom: 2 }}>VS</div>
          <div style={{ fontSize: 11, fontFamily: "monospace", letterSpacing: "0.06em", fontWeight: 900, textTransform: "uppercase", color: leading === "YOU" ? "#ebff00" : leading === "MODEL" ? "#05f0ff" : "rgba(255,255,255,0.4)" }}>
            {leading === "TIED" ? "TIED" : `${leading} +${Math.abs(diff)}`}
          </div>
          <div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", fontFamily: "monospace", textTransform: "uppercase", marginTop: 2, letterSpacing: "0.08em" }}>ACTUAL PTS</div>
        </div>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 9, color: "rgba(235,255,0,0.6)", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>⚽ You</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: "#ebff00", fontFamily: "'Barlow Condensed',sans-serif", lineHeight: 1 }}>{latest.user_pts}</div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontFamily: "monospace", marginTop: 2 }}>GW{latest.gw} · Total: {userTotal}</div>
        </div>
      </div>
    );
  }

  // GW finished but still calculating
  if (gwFinished && history.length === 0) {
    return (
      <div style={{ background: "rgba(5,240,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "9px 18px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <div style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid rgba(5,240,255,0.3)", borderTopColor: "#05f0ff", animation: "spin 0.8s linear infinite" }}/>
        <span style={{ fontSize: 10, fontWeight: 800, fontFamily: "monospace", color: "rgba(5,240,255,0.6)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Calculating GW results...</span>
      </div>
    );
  }

  // Pre-GW — countdown strip, no scores shown
  return (
    <div style={{ background: "rgba(0,0,0,0.28)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "9px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{
          width: 7, height: 7, borderRadius: "50%",
          background: deadlinePassed ? "rgba(255,160,60,0.9)" : "#39ff14",
          boxShadow: deadlinePassed ? "0 0 6px rgba(255,140,40,0.7)" : "0 0 6px rgba(57,255,20,0.8)",
        }}/>
        <span style={{ fontSize: 10, fontWeight: 800, fontFamily: "monospace", color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {deadlinePassed ? "GW IN PROGRESS" : "DEADLINE IN"}
        </span>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 13, fontWeight: 900, fontFamily: "monospace", letterSpacing: "0.04em", color: deadlinePassed ? "rgba(255,180,80,0.9)" : "#fff" }}>
          {countdown || "—"}
        </div>
        <div style={{ fontSize: 8.5, color: "rgba(255,255,255,0.18)", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 1 }}>
          RESULT REVEALED AFTER GW ENDS
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PITCH ───────────────────────────────────────────────────────────────
export default function MainPitch() {
  const { gw, loading: gwLoading, deadlineTime, gwFinished } = useGameweek();
  const { saveChallengeResult } = useAuth();
  const gwLabel = gwLoading ? "···" : gw ? `GAMEWEEK ${gw}` : "PREMIER LEAGUE";

  const [squad,          setSquad]          = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [mode,           setMode]           = useState("model");
  const [userTeam,       setUserTeam]       = useState(null);
  const [challenged,     setChallenged]     = useState(false);
  const [swapping,       setSwapping]       = useState(null);
  const [posPlayers,     setPosPlayers]     = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [history,        setHistory]        = useState([]);
  const [remainingBudget,setRemainingBudget]= useState(0);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true); setError(null);
        const data = await api.optimizeSquad(100);
        setSquad(data);
        const remaining = parseFloat((100 - (parseFloat(data.total_cost)||0)).toFixed(1));
        setRemainingBudget(remaining);
        const saved = localStorage.getItem("offside_user_team");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed.gw === gw) { setUserTeam(parsed.team); setRemainingBudget(parsed.remaining ?? remaining); setChallenged(true); }
          } catch(_) {}
        }
        const savedHist = localStorage.getItem("offside_challenge_history");
        if (savedHist) { try { setHistory(JSON.parse(savedHist)); } catch(_) {} }
      } catch(e) { setError(e.message||"Failed to load squad"); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  // Fetch position players when modal opens
  useEffect(() => {
    if (!swapping) { setPosPlayers([]); return; }
    setLoadingPlayers(true);
    const fetchWithRetry = (retriesLeft) => {
      api.getPlayersByPosition(swapping.position)
        .then(data => {
          const list = Array.isArray(data) ? data : (data.players || []);
          setPosPlayers(list);
          setLoadingPlayers(false);
        })
        .catch(() => {
          if (retriesLeft > 0) setTimeout(() => fetchWithRetry(retriesLeft - 1), 5000);
          else { setPosPlayers([]); setLoadingPlayers(false); }
        });
    };
    fetchWithRetry(3);
  }, [swapping?.player_id]);

  // ── Score the GW when it finishes ──────────────────────────────────────────
  useEffect(() => {
    if (!gwFinished || !gw || !challenged || !squad || !userTeam) return;

    // Check if already scored this GW
    const alreadyScored = history.some(h => h.gw === gw);
    if (alreadyScored) return;

    const modelPlayerIds = [
      ...squad.starters.map(p => p.player_id),
      ...squad.bench.map(p => p.player_id),
    ].filter(Boolean);

    const userPlayerIds = [
      ...userTeam.starters.map(p => p.player_id),
      ...userTeam.bench.map(p => p.player_id),
    ].filter(Boolean);

    const allIds = [...new Set([...modelPlayerIds, ...userPlayerIds])];
    if (!allIds.length) return;

    api.getGwPoints(gw, allIds).then(pointsMap => {
      // Only starters count (top 11 by points with position rules - simplified: just starters)
      const calcActual = (starters) =>
        starters.reduce((sum, p) => sum + (pointsMap[String(p.player_id)] || 0), 0);

      const model_pts = calcActual(squad.starters);
      const user_pts  = calcActual(userTeam.starters);

      const entry = { gw, model_pts, user_pts, scored_at: Date.now() };
      const newHistory = [...history, entry];
      setHistory(newHistory);
      localStorage.setItem("offside_challenge_history", JSON.stringify(newHistory));

      // Save to MongoDB if logged in
      const swaps = userTeam.starters
        .filter(p => p._swapped)
        .map(p => p.web_name);
      saveChallengeResult(gw, model_pts, user_pts, swaps);
    }).catch(() => {});
  }, [gwFinished, gw, challenged, squad, userTeam]);

  const startChallenge = useCallback(() => {
    if (!squad) return;
    const copy = { starters: squad.starters.map(p=>({...p})), bench: squad.bench.map(p=>({...p})), captain: squad.captain, vice_captain: squad.vice_captain, total_cost: squad.total_cost };
    const rem = parseFloat((100-(parseFloat(squad.total_cost)||0)).toFixed(1));
    setUserTeam(copy); setRemainingBudget(rem); setChallenged(true); setMode("user");
    localStorage.setItem("offside_user_team", JSON.stringify({gw, team: copy, remaining: rem}));
  }, [squad, gw]);

  const confirmSwap = useCallback((incoming) => {
    if (!swapping || !userTeam) return;
    const outPrice = parseFloat(swapping.price)||0;
    const inPrice  = parseFloat(incoming.price)||0;
    const delta    = inPrice - outPrice;
    const newRem   = parseFloat((remainingBudget - delta).toFixed(1));

    const newStarters = userTeam.starters.map(p =>
      p.player_id === swapping.player_id
        ? { ...incoming, position: incoming.position || swapping.position, _swapped: true }
        : p
    );
    const sorted = [...newStarters].sort((a,b) => b.predicted_pts - a.predicted_pts);
    const withBadges = newStarters.map(p => ({ ...p, is_captain: p.player_id===sorted[0].player_id, is_vice_captain: p.player_id===sorted[1]?.player_id }));
    const newTeam = { ...userTeam, starters: withBadges, captain: sorted[0].web_name, vice_captain: sorted[1]?.web_name||"", total_cost: parseFloat((parseFloat(userTeam.total_cost)+delta).toFixed(1)) };

    setUserTeam(newTeam); setRemainingBudget(newRem); setSwapping(null);
    localStorage.setItem("offside_user_team", JSON.stringify({gw, team: newTeam, remaining: newRem}));
  }, [swapping, userTeam, remainingBudget, gw]);

  const resetUserTeam = useCallback(() => {
    if (!squad) return;
    const copy = { starters: squad.starters.map(p=>({...p})), bench: squad.bench.map(p=>({...p})), captain: squad.captain, vice_captain: squad.vice_captain, total_cost: squad.total_cost };
    const rem = parseFloat((100-(parseFloat(squad.total_cost)||0)).toFixed(1));
    setUserTeam(copy); setRemainingBudget(rem);
    localStorage.setItem("offside_user_team", JSON.stringify({gw, team: copy, remaining: rem}));
  }, [squad, gw]);

  const displaySquad = mode==="user" && userTeam ? userTeam : squad;
  const grouped = displaySquad ? { GK: displaySquad.starters.filter(p=>p.position==="GK"), DEF: displaySquad.starters.filter(p=>p.position==="DEF"), MID: displaySquad.starters.filter(p=>p.position==="MID"), FWD: displaySquad.starters.filter(p=>p.position==="FWD") } : null;
  const calcPts = s => s ? s.starters.reduce((a,p) => a+(p.is_captain?p.predicted_pts*2:p.predicted_pts), 0) : 0;
  const modelPts = squad ? calcPts(squad) : 0;
  const userPts  = userTeam ? calcPts(userTeam) : 0;
  const totalPredicted = displaySquad ? calcPts(displaySquad).toFixed(1) : "—";
  const swapCount = userTeam ? userTeam.starters.filter(p=>p._swapped).length : 0;

  return (
    <div style={{ width: "100%", maxWidth: 660, margin: "0 auto", fontFamily: "'Barlow Condensed',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800;900&display=swap');
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes slideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}

        @media (max-width: 480px) {
          .pitch-header-meta { display: none !important; }
          .pitch-header-right { gap: 6px !important; }
          .captain-strip { font-size: 9px !important; padding: 5px 10px !important; }
          .captain-strip-itb { display: none !important; }
          .swap-modal-inner {
            position: fixed !important;
            inset: 0 !important;
            border-radius: 0 !important;
            max-height: 100vh !important;
            width: 100vw !important;
          }
          .bench-wrap { padding: 8px 4px 10px !important; gap: 2px !important; }
          .bench-player { min-width: 0 !important; flex: 1 !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#06101c,#0e1d30)", borderRadius: "14px 14px 0 0", padding: "10px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ background: "linear-gradient(135deg,#05f0ff,#0090ff)", borderRadius: 7, padding: "4px 10px", fontSize: 12, fontWeight: 900, color: "#001a2e", letterSpacing: "0.04em" }}>Fantasy</div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: "rgba(255,255,255,0.9)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Premier League</div>
            <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.35)", fontFamily: "monospace", letterSpacing: "0.1em" }}>{gwLabel}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {!challenged ? (
            <button onClick={startChallenge} disabled={loading||!squad} style={{ background: loading?"rgba(255,255,255,0.05)":"linear-gradient(135deg,#ebff00,#c8d800)", border: "none", cursor: loading?"not-allowed":"pointer", borderRadius: 8, padding: "6px 14px", fontSize: 11, fontWeight: 900, color: "#1a1a00", letterSpacing: "0.05em", textTransform: "uppercase", fontFamily: "'Barlow Condensed',sans-serif", display: "flex", alignItems: "center", gap: 6, opacity: loading?0.5:1 }}>
              <Icon.Swords size={13} color="#1a1a00" /> Challenge Model
            </button>
          ) : (
            <div style={{ display: "flex", background: "rgba(255,255,255,0.06)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", overflow: "hidden" }}>
              {["model","user"].map(m => (
                <button key={m} onClick={() => setMode(m)} style={{ background: mode===m?(m==="model"?"rgba(5,240,255,0.18)":"rgba(235,255,0,0.18)"):"transparent", border: "none", cursor: "pointer", padding: "5px 13px", fontSize: 10, fontWeight: 900, color: mode===m?(m==="model"?"#05f0ff":"#ebff00"):"rgba(255,255,255,0.3)", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "monospace", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 5 }}>
                  {m==="model" ? <><Icon.Robot size={11} color={mode==="model"?"#05f0ff":"rgba(255,255,255,0.3)"}/> AI</> : <><Icon.Brain size={11} color={mode==="user"?"#ebff00":"rgba(255,255,255,0.3)"}/> YOU{swapCount>0?` (${swapCount})`:""}</>}
                </button>
              ))}
            </div>
          )}
          <div style={{ textAlign: "right" }}>
            {loading ? <div style={{ width: 48, height: 32, borderRadius: 6, background: "rgba(255,255,255,0.06)", animation: "pulse 1.5s ease-in-out infinite" }}/> : (
              <><div style={{ fontSize: 28, fontWeight: 900, color: mode==="user"?"#ebff00":"#05f0ff", lineHeight: 1, transition: "color 0.2s" }}>{totalPredicted}</div><div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.1em" }}>PRED PTS</div></>
            )}
          </div>
        </div>
      </div>

      {challenged && !loading && userTeam && <ChallengeStrip gwFinished={gwFinished} deadlineTime={deadlineTime} history={history} gw={gw} />}

      {/* Captain / budget strip */}
      {displaySquad && !loading && (
        <div className="captain-strip" style={{ background: mode==="user"?"rgba(235,255,0,0.035)":"rgba(5,240,255,0.05)", borderBottom: `1px solid ${mode==="user"?"rgba(235,255,0,0.09)":"rgba(5,240,255,0.09)"}`, padding: "6px 18px", display: "flex", gap: 14, alignItems: "center", transition: "all 0.2s" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#F5C518", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="#1a0a00"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#F5C518", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "monospace" }}>{displaySquad.captain}</span>
          </div>
          <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.09)" }}/>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <span style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.55)", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "monospace" }}>{displaySquad.vice_captain}</span>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            {mode==="user" && (
              <div className="captain-strip-itb" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Icon.Pound size={11} color={remainingBudget<0.5?"rgba(255,120,120,0.8)":"rgba(235,255,0,0.7)"} />
                <span style={{ fontSize: 10, fontWeight: 800, fontFamily: "monospace", color: remainingBudget<0.5?"rgba(255,120,120,0.8)":"rgba(235,255,0,0.7)" }}>£{remainingBudget.toFixed(1)}m ITB</span>
              </div>
            )}
            {mode==="user" && swapCount>0 && (
              <button onClick={resetUserTeam} style={{ background: "rgba(255,100,100,0.1)", border: "1px solid rgba(255,100,100,0.18)", borderRadius: 5, padding: "2px 8px", cursor: "pointer", fontSize: 9, fontWeight: 800, color: "rgba(255,150,150,0.75)", fontFamily: "monospace", letterSpacing: "0.06em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 4 }}>
                <Icon.Reset size={9} color="rgba(255,150,150,0.75)" /> Reset
              </button>
            )}
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", fontFamily: "monospace" }}>
              {mode==="user" ? `${swapCount} SWAP${swapCount!==1?"S":""} · £${parseFloat(displaySquad.total_cost||0).toFixed(1)}m` : `AI SELECTED · £${displaySquad.total_cost}m`}
            </span>
          </div>
        </div>
      )}

      {/* Pitch */}
      <div style={{ position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(180deg,#1b6b1b 0px,#1b6b1b 40px,#1e7520 40px,#1e7520 80px)" }}/>
        {mode==="user" && challenged && <div style={{ position: "absolute", inset: 0, zIndex: 1, background: "rgba(235,255,0,0.018)", pointerEvents: "none" }}/>}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} viewBox="0 0 660 490" preserveAspectRatio="xMidYMid slice">
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
          {[[16,8],[644,8],[16,482],[644,482]].map(([cx,cy],i)=><circle key={i} cx={cx} cy={cy} r="7" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>)}
        </svg>
        {mode==="user" && challenged && !loading && (
          <div style={{ position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", zIndex: 5, background: "rgba(235,255,0,0.14)", border: "1px solid rgba(235,255,0,0.28)", borderRadius: 20, padding: "3px 12px", fontSize: 9.5, fontWeight: 800, color: "#ebff00", fontFamily: "monospace", letterSpacing: "0.08em", textTransform: "uppercase", pointerEvents: "none", animation: "slideIn 0.3s ease", display: "flex", alignItems: "center", gap: 5 }}>
            <Icon.Swap size={10} color="#ebff00" /> Tap any player to swap
          </div>
        )}
        <div style={{ position: "relative", zIndex: 2, paddingTop: 4, paddingBottom: 4 }}>
          {loading ? (<><SkeletonRow count={3}/><SkeletonRow count={3}/><SkeletonRow count={4}/><SkeletonRow count={1}/></>) :
           error ? (<div style={{ padding: "60px 20px", textAlign: "center" }}><div style={{ fontSize: 13, color: "rgba(255,100,100,0.8)", fontFamily: "monospace" }}>{error}</div><div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 8, fontFamily: "monospace" }}>Make sure the backend is running</div></div>) :
           grouped ? (<div style={{ animation: "slideIn 0.2s ease" }}><Row players={grouped.FWD} challengeMode={challenged} isUserTeam={mode==="user"} onSwap={setSwapping} tooltipBelow={true}/><Row players={grouped.MID} challengeMode={challenged} isUserTeam={mode==="user"} onSwap={setSwapping}/><Row players={grouped.DEF} challengeMode={challenged} isUserTeam={mode==="user"} onSwap={setSwapping}/><Row players={grouped.GK} challengeMode={challenged} isUserTeam={mode==="user"} onSwap={setSwapping}/></div>) : null}
        </div>
      </div>

      {/* Bench */}
      <div style={{ background: "linear-gradient(180deg,#0c1520,#0a1118)", borderRadius: "0 0 14px 14px", padding: "10px 16px 16px", border: "1px solid rgba(255,255,255,0.06)", borderTop: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }}/>
          <span style={{ fontSize: 9.5, fontWeight: 800, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.2em", fontFamily: "monospace" }}>Bench</span>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }}/>
        </div>
        <div className="bench-wrap" style={{ display: "flex", justifyContent: "space-evenly", alignItems: "flex-start", background: "rgba(255,255,255,0.025)", borderRadius: 10, border: "1px dashed rgba(255,255,255,0.09)", padding: "12px 8px 10px" }}>
          {loading ? Array.from({length:4}).map((_,i) => (
            <div key={i} className="bench-player" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(255,255,255,0.06)", animation: "pulse 1.5s ease-in-out infinite" }}/>
              <SkeletonCard small/>
            </div>
          )) : displaySquad?.bench?.map((p,i) => (
            <div key={p.web_name+i} className="bench-player" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>{i+1}</div>
              <Card p={p} small/>
            </div>
          ))}
        </div>
      </div>

      {swapping && (
        <SwapModal player={swapping} positionPlayers={posPlayers} loadingPlayers={loadingPlayers} userTeam={userTeam} remainingBudget={remainingBudget} onConfirm={confirmSwap} onClose={() => setSwapping(null)} />
      )}
    </div>
  );
}