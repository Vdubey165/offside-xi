import { useState, useEffect } from "react";
import { api } from "../api/client";
const BASE = (import.meta.env.VITE_API_URL ?? "http://localhost:8000") + "/api";

const FDR_COLOR = {
  1: { bg:"#00ff87", text:"#000" },
  2: { bg:"#00cc6a", text:"#000" },
  3: { bg:"#f5c518", text:"#000" },
  4: { bg:"#ff6b35", text:"#fff" },
  5: { bg:"#ff4d4d", text:"#fff" },
};

const POS_COLOR = {
  GK:  "#f5c518",
  DEF: "#00ff87",
  MID: "#05f0ff",
  FWD: "#ff4d4d",
};

// ── Mini bar chart for GW history ─────────────────────────────────────────────
function GWChart({ history }) {
  if (!history?.length) return null;
  const last5  = history.slice(-5);
  const maxPts = Math.max(...last5.map(g => g.total_points), 1);

  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:4, height:48 }}>
      {last5.map((gw, i) => {
        const pct    = (gw.total_points / maxPts) * 100;
        const color  = gw.total_points >= 9 ? "#00ff87"
                     : gw.total_points >= 6 ? "#05f0ff"
                     : gw.total_points >= 3 ? "#f5c518"
                     : "rgba(255,255,255,0.2)";
        return (
          <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
            <div style={{ fontSize:9, color:"rgba(255,255,255,0.5)", fontFamily:"'Barlow Condensed',monospace" }}>
              {gw.total_points}
            </div>
            <div style={{
              width:"100%", borderRadius:3,
              height: Math.max(pct * 0.38, 3),
              background: color,
              boxShadow: gw.total_points >= 6 ? `0 0 6px ${color}60` : "none",
              transition:"height 0.3s ease",
            }}/>
            <div style={{ fontSize:8, color:"rgba(255,255,255,0.28)", fontFamily:"'Barlow Condensed',monospace" }}>
              GW{gw.round}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Stat pill ─────────────────────────────────────────────────────────────────
function StatPill({ label, value, color = "#fff" }) {
  return (
    <div style={{
      background:"rgba(255,255,255,0.03)",
      border:"1px solid rgba(255,255,255,0.07)",
      borderRadius:8, padding:"10px 12px", textAlign:"center",
    }}>
      <div style={{ fontSize:18, fontWeight:900, color, fontFamily:"'Barlow Condensed',sans-serif", lineHeight:1 }}>
        {value ?? "—"}
      </div>
      <div style={{ fontSize:9, color:"rgba(255,255,255,0.35)", fontFamily:"'Barlow Condensed',monospace",
        letterSpacing:"0.1em", textTransform:"uppercase", marginTop:4 }}>
        {label}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PlayerPanel({ player, onClose }) {
  const [detail,  setDetail]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
  if (!player) return;
  setLoading(true); setDetail(null); setError(null);
  api.getPlayerDetail(player.player_id)
    .then(d => { setDetail(d); setLoading(false); })
    .catch(e => { setError(e.message); setLoading(false); });
}, [player]);  // ← just `player` not `player?.player_id`

  if (!player) return null;

  const posColor = POS_COLOR[player.position] || "#fff";

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,0.55)",
          zIndex:100, backdropFilter:"blur(2px)",
          animation:"fadeIn 0.15s ease",
        }}
      />

      {/* Panel */}
      <div style={{
        position:"fixed", top:0, right:0, bottom:0,
        width: Math.min(380, window.innerWidth),
        background:"linear-gradient(180deg,#06101c 0%,#080f1a 100%)",
        borderLeft:"1px solid rgba(5,240,255,0.12)",
        zIndex:101, overflowY:"auto", overflowX:"hidden",
        scrollbarWidth:"none",
        animation:"slideIn 0.22s cubic-bezier(0.22,1,0.36,1)",
        boxShadow:"-20px 0 60px rgba(0,0,0,0.6)",
      }}>

        {/* Header */}
        <div style={{
          padding:"18px 18px 16px",
          background:"linear-gradient(135deg,#06101c,#0a1a2e)",
          borderBottom:"1px solid rgba(5,240,255,0.08)",
          position:"sticky", top:0, zIndex:10,
        }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
            <div style={{ flex:1, minWidth:0 }}>
              {/* Position badge */}
              <div style={{
                display:"inline-flex", alignItems:"center", gap:5,
                marginBottom:6,
              }}>
                <span style={{
                  fontSize:9, fontWeight:900, color:posColor,
                  background:`${posColor}18`, border:`1px solid ${posColor}30`,
                  borderRadius:4, padding:"2px 7px",
                  fontFamily:"'Barlow Condensed',monospace", letterSpacing:"0.12em",
                }}>
                  {player.position}
                </span>
                <span style={{
                  fontSize:9, color:"rgba(255,255,255,0.3)",
                  fontFamily:"'Barlow Condensed',monospace", letterSpacing:"0.08em",
                }}>
                  {player.team_name?.toUpperCase()}
                </span>
              </div>

              {/* Name */}
              <div style={{
                fontSize:26, fontWeight:900, color:"#fff", lineHeight:1,
                fontFamily:"'Barlow Condensed',sans-serif",
                textTransform:"uppercase", letterSpacing:"0.02em",
              }}>
                {player.web_name}
              </div>

              {/* Price + predicted */}
              <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:8 }}>
                <span style={{
                  fontSize:13, fontWeight:700, color:"#00ff87",
                  fontFamily:"'Barlow Condensed',sans-serif",
                }}>
                  £{player.price?.toFixed(1)}m
                </span>
                <span style={{ width:1, height:12, background:"rgba(255,255,255,0.15)" }}/>
                <span style={{
                  fontSize:13, color:"rgba(255,255,255,0.5)",
                  fontFamily:"'Barlow Condensed',monospace",
                }}>
                  {parseFloat(player.predicted_pts).toFixed(2)} predicted pts
                </span>
              </div>
            </div>

            {/* Close button */}
            <button onClick={onClose} style={{
              width:32, height:32, borderRadius:8,
              background:"rgba(255,255,255,0.05)",
              border:"1px solid rgba(255,255,255,0.1)",
              color:"rgba(255,255,255,0.6)", cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:16, flexShrink:0, marginLeft:12,
              transition:"all 0.12s",
            }}
              onMouseEnter={e=>{ e.currentTarget.style.background="rgba(255,77,77,0.15)"; e.currentTarget.style.color="#ff4d4d"; }}
              onMouseLeave={e=>{ e.currentTarget.style.background="rgba(255,255,255,0.05)"; e.currentTarget.style.color="rgba(255,255,255,0.6)"; }}
            >✕</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding:"16px 18px", display:"flex", flexDirection:"column", gap:14 }}>

          {loading && (
            <div style={{ display:"flex", alignItems:"center", gap:10,
              color:"rgba(255,255,255,0.3)", fontSize:12,
              fontFamily:"'Barlow Condensed',monospace", padding:"20px 0" }}>
              <div className="spinner" style={{width:14,height:14}}/>
              Loading player data…
            </div>
          )}

          {error && (
            <div style={{
              background:"rgba(255,77,77,0.08)", border:"1px solid rgba(255,77,77,0.2)",
              borderRadius:8, padding:"10px 12px",
              fontSize:12, color:"#ff4d4d", fontFamily:"'Barlow Condensed',monospace",
            }}>
              {error}
            </div>
          )}

          {detail && (
            <>
              {/* Season stats grid */}
              <div>
                <div style={{ fontSize:9, fontWeight:900, color:"rgba(5,240,255,0.5)",
                  textTransform:"uppercase", letterSpacing:"0.18em",
                  fontFamily:"'Barlow Condensed',monospace", marginBottom:10 }}>
                  ✦ Season Stats
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6 }}>
                  <StatPill label="Goals"        value={detail.goals_scored}    color="#00ff87" />
                  <StatPill label="Assists"      value={detail.assists}         color="#05f0ff" />
                  <StatPill label="Clean Sheets" value={detail.clean_sheets}    color="#a855f7" />
                  <StatPill label="Total Pts"    value={detail.total_points}    color="#f5c518" />
                  <StatPill label="Bonus"        value={detail.bonus}           color="#f59e0b" />
                  <StatPill label="Owned By"     value={detail.selected_by_pct != null ? `${detail.selected_by_pct}%` : "—"} color="#fff" />
                </div>
              </div>

              {/* GW history chart */}
              {detail.history?.length > 0 && (
                <div style={{
                  background:"rgba(255,255,255,0.02)",
                  border:"1px solid rgba(255,255,255,0.06)",
                  borderRadius:10, padding:"14px",
                }}>
                  <div style={{ fontSize:9, fontWeight:900, color:"rgba(5,240,255,0.5)",
                    textTransform:"uppercase", letterSpacing:"0.18em",
                    fontFamily:"'Barlow Condensed',monospace", marginBottom:12 }}>
                    ✦ Last 5 Gameweeks
                  </div>
                  <GWChart history={detail.history} />
                </div>
              )}

              {/* Upcoming fixtures */}
              {detail.fixtures?.length > 0 && (
                <div>
                  <div style={{ fontSize:9, fontWeight:900, color:"rgba(5,240,255,0.5)",
                    textTransform:"uppercase", letterSpacing:"0.18em",
                    fontFamily:"'Barlow Condensed',monospace", marginBottom:10 }}>
                    ✦ Next Fixtures
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                    {detail.fixtures.slice(0,5).map((fx, i) => {
                      const fdr   = fx.difficulty || 3;
                      const dc    = FDR_COLOR[fdr] || FDR_COLOR[3];
                      const venue = fx.is_home ? "H" : "A";
                      return (
                        <div key={i} style={{
                          display:"flex", alignItems:"center", gap:10,
                          padding:"8px 12px",
                          background:"rgba(255,255,255,0.02)",
                          border:"1px solid rgba(255,255,255,0.05)",
                          borderRadius:7,
                        }}>
                          <div style={{
                            width:26, height:26, borderRadius:5, flexShrink:0,
                            background: dc.bg, color: dc.text,
                            display:"flex", alignItems:"center", justifyContent:"center",
                            fontSize:11, fontWeight:900,
                            fontFamily:"'Barlow Condensed',monospace",
                          }}>
                            {fdr}
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{
                              fontSize:12, fontWeight:700, color:"#fff",
                              fontFamily:"'Barlow Condensed',sans-serif",
                              textTransform:"uppercase", letterSpacing:"0.04em",
                            }}>
                              {fx.opponent} <span style={{ color:"rgba(255,255,255,0.3)", fontWeight:600 }}>({venue})</span>
                            </div>
                            <div style={{
                              fontSize:9.5, color:"rgba(255,255,255,0.28)",
                              fontFamily:"'Barlow Condensed',monospace",
                            }}>
                              GW{fx.event}
                            </div>
                          </div>
                          {/* FDR label */}
                          <div style={{
                            fontSize:9, fontWeight:900,
                            color: fdr <= 2 ? "#00ff87" : fdr === 3 ? "#f5c518" : "#ff4d4d",
                            fontFamily:"'Barlow Condensed',monospace",
                            letterSpacing:"0.08em",
                          }}>
                            {fdr <= 2 ? "EASY" : fdr === 3 ? "MED" : "HARD"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* News / injury */}
              {detail.news && (
                <div style={{
                  background:"rgba(255,77,77,0.06)",
                  border:"1px solid rgba(255,77,77,0.15)",
                  borderRadius:8, padding:"10px 12px",
                  display:"flex", gap:10, alignItems:"flex-start",
                }}>
                  <span style={{ fontSize:14, flexShrink:0 }}>🩹</span>
                  <span style={{
                    fontSize:12, color:"rgba(255,255,255,0.7)",
                    fontFamily:"'Barlow Condensed',sans-serif", lineHeight:1.5,
                  }}>
                    {detail.news}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </>
  )}
