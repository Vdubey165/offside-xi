import { useState, useEffect } from "react";
import { api } from "../api/client";
import { useAuth } from "../hooks/useAuth.jsx";

const LockIcon   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const UnlockIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>;
const CloseIcon  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;

export default function TransferPlanner() {
  const { user } = useAuth();
  const [teamId,       setTeamId]       = useState("");
  const [squadData,    setSquadData]    = useState(null);
  const [freeTf,       setFreeTf]       = useState(1);
  const [locked,       setLocked]       = useState([]);
  const [result,       setResult]       = useState(null);
  const [loadingSquad, setLoadingSquad] = useState(false);
  const [loadingOpt,   setLoadingOpt]   = useState(false);
  const [error,        setError]        = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [explaining, setExplaining] = useState(false);

  async function explainTransfers() {
    if (!result) return;
    setExplaining(true);
    setExplanation(null);
    try {
      const outList = (result.transfers_out || [])
        .map((p) => `${p.web_name} (${p.position}, £${p.price?.toFixed(1)}m, pred ${p.predicted_pts} pts)`)
        .join(", ");
      const inList = (result.transfers_in || [])
        .map((p) => `${p.web_name} (${p.position}, £${p.price?.toFixed(1)}m, pred ${p.predicted_pts} pts)`)
        .join(", ");

      const prompt = `You are the AI engine behind Offside XI, an FPL decision tool.
You just optimised this manager's transfers using a LightGBM model + hit-aware ILP.

Transfers OUT: ${outList || "None"}
Transfers IN:  ${inList || "None"}
Transfers made: ${result.transfers_made}
Hits taken: ${result.hits_taken} (${result.points_hit} pts penalty)
Net predicted points gain: ${result.net_pts_gain}
New captain: ${result.captain}
New vice captain: ${result.vice_captain}
Gameweek: ${result.gameweek}
Budget in bank: £${result.itb}m

Explain in 4–5 sentences why these transfers were recommended. Be specific — use player names.
Cover: (1) why each player was sold and what made the replacements better, (2) whether the
hit (if any) is justified by the predicted gain, (3) the new captain logic.
Write confidently, like an analyst briefing a manager before deadline day.
No bullet points. Plain paragraph(s) only.`;

      const response = await fetch("/api/anthropic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 400,
          stream: true,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!response.ok) {
        let msg = `Anthropic error (${response.status})`;
        try {
          const err = await response.json();
          msg = err?.error?.message || msg;
        } catch {
        }
        throw new Error(msg);
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/event-stream") || !response.body) {
        const data = await response.json();
        const text =
          data.content?.map((b) => b.text || "").join("") || "Could not generate explanation.";
        setExplanation(text);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        while (buffer.includes("\n\n")) {
          const idx = buffer.indexOf("\n\n");
          const chunk = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);

          for (const line of chunk.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payloadStr = trimmed.slice(5).trim();
            if (!payloadStr || payloadStr === "[DONE]") continue;

            let payload;
            try {
              payload = JSON.parse(payloadStr);
            } catch {
              continue;
            }

            if (payload?.type === "error") {
              throw new Error(payload?.error?.message || "Anthropic streaming error");
            }

            if (payload?.type === "content_block_delta" && payload?.delta?.type === "text_delta") {
              const delta = payload.delta.text || "";
              if (delta) setExplanation((prev) => (prev ?? "") + delta);
            }

            if (payload?.type === "content_block_start" && payload?.content_block?.type === "text") {
              const startText = payload?.content_block?.text || "";
              if (startText) setExplanation((prev) => (prev ?? "") + startText);
            }
          }
        }
      }

      setExplanation((prev) => prev || "Could not generate explanation.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to generate explanation. Please try again.";
      setExplanation(msg);
    } finally {
      setExplaining(false);
    }
  }

  // Auto-fill Team ID when user logs in
  useEffect(() => {
    if (user?.fpl_team_id) {
      setTeamId(String(user.fpl_team_id));
    }
  }, [user?.fpl_team_id]);

  // Auto-fetch squad once Team ID is populated from auth
  useEffect(() => {
    if (teamId && !squadData && !loadingSquad) {
      fetchSquad();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  async function fetchSquad() {
    if (!teamId) return;
    setLoadingSquad(true); setError(null); setSquadData(null); setResult(null); setLocked([]);
    setExplanation(null); setExplaining(false);
    try {
      const data = await api.fetchSquad(teamId);
      setSquadData(data); setFreeTf(data.free_transfers);
    } catch (e) { setError(e.message); }
    finally { setLoadingSquad(false); }
  }

  async function optimize() {
    setLoadingOpt(true); setError(null); setResult(null);
    setExplanation(null); setExplaining(false);
    try {
      setResult(await api.optimizeTransfers({ team_id: parseInt(teamId), free_transfers: freeTf, hit_cost: 4, locked_players: locked }));
    } catch (e) { setError(e.message); }
    finally { setLoadingOpt(false); }
  }

  const toggleLock = (name) => setLocked((prev) => prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Transfer Planner</div>
          <div className="page-subtitle">FPL API squad fetch · hit-aware ILP · captain recommendation</div>
        </div>
      </div>

      <div className="two-col" style={{ marginBottom: 20 }}>
        {/* Step 1 */}
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span className="step-num">1</span>
            <span className="step-title">Load Your Squad</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 12, lineHeight: 1.6 }}>
            Find your Team ID in the FPL URL:{" "}
            <span style={{ fontFamily: "'Geist Mono', monospace", color: "var(--blue)", fontSize: 11.5 }}>
              fantasy.premierleague.com/entry/<strong style={{color:"var(--text)"}}>123456</strong>/event/…
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1, position: "relative" }}>
              <input className="input" placeholder="Team ID" value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchSquad()}
                style={{ width: "100%" }} />
              {user?.fpl_team_id && String(user.fpl_team_id) === teamId && (
                <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 9, fontWeight: 800, color: "rgba(5,240,255,0.7)", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.06em", background: "rgba(5,240,255,0.08)", borderRadius: 4, padding: "2px 6px" }}>
                  Saved
                </div>
              )}
            </div>
            <button className="btn btn-primary" onClick={fetchSquad} disabled={!teamId || loadingSquad} style={{ minWidth: 110 }}>
              {loadingSquad ? <><div className="spinner" style={{width:13,height:13}} />Loading</> : "Load Squad"}
            </button>
          </div>

          {squadData && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", gap: 16, marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 11.5, color: "var(--text3)" }}>GW <span style={{color:"var(--text)", fontWeight:600}}>{squadData.gameweek}</span></span>
                <span style={{ fontSize: 11.5, color: "var(--text3)" }}>ITB <span style={{color:"var(--amber)", fontFamily:"'Geist Mono',monospace"}}>£{squadData.itb}m</span></span>
                <span style={{ fontSize: 11.5, color: "var(--text3)" }}>Free transfers <span style={{color:"var(--accent)", fontWeight:600}}>{squadData.free_transfers}</span></span>
              </div>
              <div style={{ fontSize: 10.5, color: "var(--text3)", marginBottom: 8, fontFamily: "'Geist Mono', monospace" }}>
                Click to lock / unlock a player
              </div>
              <div className="squad-list">
                {["GK","DEF","MID","FWD"].flatMap((pos) =>
                  squadData.players.filter((p) => p.position === pos).map((p) => {
                    const isLocked = locked.includes(p.web_name);
                    return (
                      <div key={p.player_id} className={`player-row clickable ${isLocked ? "locked" : ""}`}
                        onClick={() => toggleLock(p.web_name)}>
                        <span className={`pos pos-${p.position}`}>{p.position}</span>
                        <span className="player-name">{p.web_name}</span>
                        <span className="player-team">{p.team_name}</span>
                        <span className="price">£{p.price?.toFixed(1)}m</span>
                        <span className="player-pts">{p.predicted_pts}</span>
                        {isLocked && (
                          <span style={{ color: "var(--blue)", display: "flex" }}>
                            <LockIcon />
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Step 2 */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="step-num">2</span>
            <span className="step-title">Settings</span>
          </div>

          <div className="input-group">
            <label className="input-label">Free Transfers</label>
            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
              {[1,2,3,4,5].map((n) => (
                <button key={n} className={`filter-pill ${freeTf === n ? "active" : ""}`}
                  onClick={() => setFreeTf(n)} style={{ flex: 1, borderRadius: "var(--radius-sm)" }}>{n}</button>
              ))}
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Hit Penalty</label>
            <div style={{ marginTop: 4, fontSize: 13, color: "var(--text2)" }}>
              <span style={{ fontFamily: "'Geist Mono', monospace", color: "var(--red)" }}>−4 pts</span> per extra transfer
              <span style={{ fontSize: 11, color: "var(--text3)", display: "block", marginTop: 3 }}>Standard FPL rules</span>
            </div>
          </div>

          {locked.length > 0 && (
            <div className="input-group">
              <label className="input-label">Locked Players ({locked.length})</label>
              <div className="locked-list">
                {locked.map((name) => (
                  <div key={name} className="locked-chip" onClick={() => toggleLock(name)} title="Click to unlock">
                    <LockIcon />{name}<CloseIcon />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: "auto", borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
              {["Budget = sell value + ITB", "Transfers in = transfers out", "Hits deducted from score", "Position limits enforced"].map((c) => (
                <div key={c} style={{ display: "flex", gap: 6, fontSize: 11.5, color: "var(--text3)", alignItems: "flex-start" }}>
                  <span style={{ color: "var(--accent)", marginTop: 1, fontSize: 10 }}>✓</span>{c}
                </div>
              ))}
            </div>
            <button className="btn btn-primary" style={{ width: "100%" }}
              onClick={optimize} disabled={!squadData || loadingOpt}>
              {loadingOpt ? <><div className="spinner" style={{width:13,height:13}} />Optimising…</> : "Find Best Transfers"}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      {result && !loadingOpt && (
        <div className="fade-in">
          <div className="stats-row">
            <div className="stat-card"><div className="stat-label">Transfers</div><div className="stat-value blue">{result.transfers_made}</div></div>
            <div className="stat-card"><div className="stat-label">Hits</div><div className={`stat-value ${result.hits_taken > 0 ? "red" : "green"}`}>{result.hits_taken}</div></div>
            <div className="stat-card"><div className="stat-label">Pts Penalty</div><div className={`stat-value ${result.points_hit > 0 ? "red" : "green"}`}>{result.points_hit > 0 ? `−${result.points_hit}` : "0"}</div></div>
            <div className="stat-card"><div className="stat-label">Net Pts Gain</div><div className={`stat-value ${result.net_pts_gain >= 0 ? "green" : "red"}`}>{result.net_pts_gain > 0 ? "+" : ""}{result.net_pts_gain}</div></div>
            <div className="stat-card">
              <div className="stat-label">Captain</div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 6 }}>
                <span className="cap-c">C</span>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{result.captain}</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Vice Captain</div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 6 }}>
                <span className="cap-v">V</span>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{result.vice_captain}</span>
              </div>
            </div>
          </div>

          {result.transfers_made === 0 ? (
            <div className="success-box">No transfers recommended — hold your squad this gameweek.</div>
          ) : (
            <>
              <div className="transfer-cols">
                <div>
                  <div className="transfer-col-label out">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    Transfer Out
                  </div>
                  <div className="squad-list">
                    {result.transfers_out.map((p) => (
                      <div key={p.player_id} className="player-row is-out">
                        <span className={`pos pos-${p.position}`}>{p.position}</span>
                        <span className="player-name">{p.web_name}</span>
                        <span className="player-team">{p.team_name}</span>
                        <span className="price">£{p.price?.toFixed(1)}m</span>
                        <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12, color: "var(--red)" }}>{p.predicted_pts}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="transfer-col-label in">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    Transfer In
                  </div>
                  <div className="squad-list">
                    {result.transfers_in.map((p) => (
                      <div key={p.player_id} className="player-row is-new">
                        <span className={`pos pos-${p.position}`}>{p.position}</span>
                        <span className="player-name">{p.web_name}</span>
                        <span className="player-team">{p.team_name}</span>
                        <span className="price">£{p.price?.toFixed(1)}m</span>
                        <span className="player-pts">{p.predicted_pts}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-title">Full New Squad</div>
                <div className="squad-list">
                  {["GK","DEF","MID","FWD"].flatMap((pos) =>
                    result.new_squad
                      .filter((p) => p.position === pos)
                      .sort((a, b) => b.predicted_pts - a.predicted_pts)
                      .map((p) => (
                        <div key={p.player_id} className={`player-row ${!p.in_current ? "is-new" : ""}`}>
                          <span className={`pos pos-${p.position}`}>{p.position}</span>
                          <span className="player-name">{p.web_name}</span>
                          <span className="player-team">{p.team_name}</span>
                          <span className="price">£{p.price?.toFixed(1)}m</span>
                          <span className="player-pts">{p.predicted_pts}</span>
                          <span className={`tag ${p.in_current ? "tag-kept" : "tag-new"}`}>{p.in_current ? "kept" : "new"}</span>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </>
          )}

          <button
            onClick={explainTransfers}
            disabled={explaining}
            style={{
              marginTop: 16,
              background: "linear-gradient(135deg,#05f0ff,#0090ff)",
              color: "#001a2e",
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 900,
              fontSize: 13,
              padding: "10px 22px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {explaining ? (
              <>
                <div className="spinner" style={{ width: 14, height: 14 }} />
                🤖 Analysing…
              </>
            ) : (
              "Explain My Transfers"
            )}
          </button>

          {explanation !== null && (
            <div
              style={{
                marginTop: 16,
                padding: "18px 20px",
                background: "rgba(5,240,255,0.04)",
                border: "1px solid rgba(5,240,255,0.18)",
                borderRadius: 12,
                borderLeft: "3px solid #05f0ff",
                animation: "fadeUp 0.3s ease both",
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 900,
                  color: "rgba(5,240,255,0.5)",
                  fontFamily: "'Barlow Condensed', monospace",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  marginBottom: 10,
                }}
              >
                ✦ AI Explanation · LightGBM + ILP Reasoning
              </div>
              <p
                style={{
                  fontSize: 13.5,
                  color: "rgba(255,255,255,0.82)",
                  fontFamily: "'Barlow Condensed', sans-serif",
                  lineHeight: 1.85,
                  margin: 0,
                }}
              >
                {explanation}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
