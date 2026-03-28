import { useState } from "react";
import { api } from "../api/client";

const POS_ORDER = ["GK", "DEF", "MID", "FWD"];

// ── Rule-based Team Analysis (no API calls) ───────────────────────────────────
function generateTeamAnalysis(result) {
  const starters = result?.starters ?? [];
  const bench    = result?.bench    ?? [];

  // 1. Premium vs value counts
  const premiumPlayers = starters.filter((p) => (p.price ?? 0) >= 9);
  const valuePlayers   = starters.filter((p) => (p.price ?? 0) <= 6);
  const premiumCount   = premiumPlayers.length;
  const valueCount     = valuePlayers.length;

  const squadStyle =
    premiumCount >= 4 ? "aggressive (premium-heavy)" :
    premiumCount >= 2 ? "balanced" :
    "budget-focused (value-heavy)";

  // 2. Formation / position counts in starting XI
  const posCounts = starters.reduce((acc, p) => {
    acc[p.position] = (acc[p.position] || 0) + 1;
    return acc;
  }, {});
  const defCount = posCounts.DEF || 0;
  const midCount = posCounts.MID || 0;
  const fwdCount = posCounts.FWD || 0;

  const dominantPos =
    midCount >= fwdCount && midCount >= defCount ? "midfield" :
    fwdCount > defCount  ? "attack" :
    "defence";

  const formation = `${defCount}-${midCount}-${fwdCount}`;

  // 3. Captain logic
  const captainName = result?.captain ?? "the captain";
  const captainPlayer = starters.find((p) => p.web_name === captainName);
  const captainPts    = captainPlayer?.predicted_pts ?? "—";

  // 4. Top value pick (best pts/price ratio among value players)
  const bestValue = valuePlayers
    .filter((p) => p.price > 0)
    .sort((a, b) => (b.predicted_pts / b.price) - (a.predicted_pts / a.price))[0];

  // 5. Bench depth note
  const benchGK  = bench.find((p) => p.position === "GK");
  const benchNote = benchGK
    ? `The bench is anchored by a budget GK (${benchGK.web_name}) to free up funds for outfield quality.`
    : "The bench provides positional cover across all outfield roles.";

  // Build sentences
  const s1 = `This ${formation} squad takes a ${squadStyle} approach, featuring ${premiumCount} premium player${premiumCount !== 1 ? "s" : ""} (£9m+) and ${valueCount} budget pick${valueCount !== 1 ? "s" : ""} (£6m or under) in the starting XI.`;

  const s2 = `The ${dominantPos} is prioritised with ${dominantPos === "midfield" ? midCount : dominantPos === "attack" ? fwdCount : defCount} players in that area, reflecting the ILP optimiser's search for maximum point-scoring potential in the current gameweek.`;

  const s3 = bestValue
    ? `${captainName} earns the armband with ${captainPts} predicted points — the highest in the XI — while ${bestValue.web_name} (£${bestValue.price?.toFixed(1)}m) stands out as the top value pick, delivering strong projected returns for the price.`
    : `${captainName} earns the armband with ${captainPts} predicted points — the highest in the starting XI — making them the clear choice to double up on returns.`;

  const s4 = `${benchNote} The squad costs £${result?.total_cost}m in total, leaving £${result?.budget_remaining}m in the bank, with an expected ${result?.predicted_points} points from the starting eleven.`;

  return [s1, s2, s3, s4].join(" ");
}

function TeamAnalysis({ result }) {
  if (!result) return null;
  const text = generateTeamAnalysis(result);

  return (
    <div
      style={{
        marginTop: 20,
        marginBottom: 4,
        padding: "20px 22px",
        background: "rgba(0,255,135,0.04)",
        border: "1px solid rgba(0,255,135,0.18)",
        borderRadius: 12,
        borderLeft: "3px solid #00ff87",
        animation: "fadeUp 0.35s ease both",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: "rgba(0,255,135,0.15)",
            border: "1px solid rgba(0,255,135,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            flexShrink: 0,
          }}
        >
          📊
        </div>
        <div>
          <div
            style={{
              fontSize: 9,
              fontWeight: 900,
              color: "rgba(0,255,135,0.6)",
              fontFamily: "'Barlow Condensed', monospace",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              lineHeight: 1,
            }}
          >
            ✦ Team Analysis · Rule-Based Breakdown
          </div>
        </div>
      </div>

      {/* Stat chips */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {[
          { label: "Formation",  value: (() => { const d = result.starters.filter(p=>p.position==="DEF").length; const m = result.starters.filter(p=>p.position==="MID").length; const f = result.starters.filter(p=>p.position==="FWD").length; return `${d}-${m}-${f}`; })() },
          { label: "Pred. Pts",  value: result.predicted_points },
          { label: "Total Cost", value: `£${result.total_cost}m` },
          { label: "In Bank",    value: `£${result.budget_remaining}m` },
          { label: "Premium",    value: `${result.starters.filter(p=>(p.price??0)>=9).length} players` },
          { label: "Value",      value: `${result.starters.filter(p=>(p.price??0)<=6).length} players` },
        ].map(({ label, value }) => (
          <div
            key={label}
            style={{
              padding: "4px 10px",
              background: "rgba(0,255,135,0.08)",
              border: "1px solid rgba(0,255,135,0.15)",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <span style={{ fontSize: 9, fontWeight: 900, color: "rgba(0,255,135,0.5)", fontFamily: "'Barlow Condensed', monospace", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              {label}
            </span>
            <span style={{ fontSize: 11.5, fontWeight: 900, color: "#00ff87", fontFamily: "'Barlow Condensed', monospace" }}>
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* Analysis text */}
      <p
        style={{
          fontSize: 13.5,
          color: "rgba(255,255,255,0.80)",
          fontFamily: "'Barlow Condensed', sans-serif",
          lineHeight: 1.85,
          margin: 0,
        }}
      >
        {text}
      </p>
    </div>
  );
}

export default function OptimalSquad() {
  const [budget,  setBudget]  = useState(100);
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [explaining, setExplaining] = useState(false);

  function fallbackTeamExplanation(res) {
    if (!res?.starters?.length) return "AI explanation is unavailable right now.";

    const starters = res.starters;
    const bench = res.bench ?? [];

    const sortedByPrice = [...starters]
      .filter((p) => typeof p.price === "number")
      .sort((a, b) => (b.price ?? 0) - (a.price ?? 0));

    const sortedByPts = [...starters]
      .filter((p) => typeof p.predicted_pts === "number")
      .sort((a, b) => (b.predicted_pts ?? 0) - (a.predicted_pts ?? 0));

    const premiumPicks = sortedByPrice.filter((p) => (p.price ?? 0) >= 10).slice(0, 3);
    const valuePicks = [...starters]
      .filter((p) => typeof p.price === "number" && (p.price ?? 0) <= 6.5)
      .sort((a, b) => (b.predicted_pts ?? 0) - (a.predicted_pts ?? 0))
      .slice(0, 3);

    const posCounts = starters.reduce((acc, p) => {
      acc[p.position] = (acc[p.position] || 0) + 1;
      return acc;
    }, {});
    const formation = `${posCounts.DEF || 0}-${posCounts.MID || 0}-${posCounts.FWD || 0}`;

    const captain = res.captain;
    const vc = res.vice_captain;
    const topScorer = sortedByPts[0]?.web_name;
    const topScorerPts = sortedByPts[0]?.predicted_pts;
    const premiumNames = premiumPicks.map((p) => p.web_name).filter(Boolean).join(", ");
    const valueNames = valuePicks.map((p) => p.web_name).filter(Boolean).join(", ");
    const benchNames = bench.map((p) => p.web_name).filter(Boolean).slice(0, 3).join(", ");
    const benchNote = benchNames ? `The bench is set up as cover and budget control (${benchNames}).` : "The bench is set up as cover and budget control.";

    const captainLine =
      captain && topScorer
        ? `Captaincy goes to ${captain} because the XI projection concentrates points at the top (top predicted scorer: ${topScorer} on ${topScorerPts}).`
        : captain
          ? `Captaincy goes to ${captain} to maximise projected points, with ${vc || "a vice-captain"} as cover.`
          : "Captaincy is chosen to maximise projected points, with a vice-captain as cover.";

    const premiumLine = premiumNames
      ? `Up top, it balances premium output (${premiumNames}) with efficient value picks that keep the budget tight (${valueNames || "several low-cost enablers"}).`
      : `It leans on value picks to maximise points per million (${valueNames || "several low-cost enablers"}).`;

    return `AI credits are currently unavailable, so this is a model-based summary from the squad data. ${captainLine} ${premiumLine} Structurally it lands in a ${formation} shape to concentrate predicted points where the model sees the best fixtures and roles. ${benchNote} With £${res.budget_remaining}m left and ${res.predicted_points} projected points, it’s an aggressive “best XI first” build built for immediate returns.`;
  }

  async function explainTeam() {
    if (!result) return;
    setExplaining(true);
    setExplanation(null);
    try {
      const starters = result.starters;
      const bench = result.bench;
      const prompt = `You are the AI engine behind Offside XI, an FPL decision tool.
You just built this optimal squad using a LightGBM model (MAE 1.021, 34.7% better than
baseline) and Integer Linear Programming with a £${result.total_cost}m budget.

Starting XI:
${starters
  .map(
    (p) =>
      `- ${p.web_name} (${p.position}, ${p.team_name}, £${p.price?.toFixed(1)}m, predicted ${p.predicted_pts} pts)`
  )
  .join("\n")}

Captain: ${result.captain} (2× points)
Vice Captain: ${result.vice_captain}

Bench:
${bench
  .map(
    (p) =>
      `- ${p.web_name} (${p.position}, £${p.price?.toFixed(1)}m, predicted ${p.predicted_pts} pts)`
  )
  .join("\n")}

Budget remaining: £${result.budget_remaining}m
Total predicted points (XI): ${result.predicted_points}

Explain in 4–6 sentences why this squad was built. Be specific — mention actual player names.
Cover: (1) why the captain was chosen, (2) the key premium picks vs value picks balance,
(3) any notable position choices, (4) the bench strategy.
Write in a confident, engaging tone — like a football analyst talking to a fan.
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
      const lower = String(msg).toLowerCase();
      if (lower.includes("credit") || lower.includes("insufficient") || lower.includes("quota") || lower.includes("balance")) {
        setExplanation(fallbackTeamExplanation(result));
      } else {
        setExplanation(msg);
      }
    } finally {
      setExplaining(false);
    }
  }

  async function run() {
    setLoading(true); setError(null); setResult(null);
    setExplanation(null); setExplaining(false);
    try { setResult(await api.optimizeSquad(budget)); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  const starters = result ? POS_ORDER.flatMap((p) => result.starters.filter((pl) => pl.position === p)) : [];
  const bench    = result?.bench ?? [];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Optimal Squad</div>
          <div className="page-subtitle">ILP · 2-phase · 15-man squad → best starting 11</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 24, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="input-group" style={{ minWidth: 220 }}>
            <label className="input-label">Budget</label>
            <div className="range-wrap" style={{ marginTop: 4 }}>
              <input type="range" min={80} max={100} step={0.5} value={budget}
                onChange={(e) => setBudget(parseFloat(e.target.value))} style={{ flex: 1 }} />
              <span className="range-val" style={{ color: "var(--accent)", fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700 }}>£{budget}m</span>
            </div>
          </div>
          <button className="btn btn-primary" onClick={run} disabled={loading} style={{ minWidth: 150 }}>
            {loading ? <><div className="spinner" style={{width:14,height:14}} />Optimising…</> : "Generate Squad"}
          </button>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginLeft: "auto" }}>
            {["2 GK · 5 DEF · 5 MID · 3 FWD", "Max 3 per club", "Backup GK ≤ £4m"].map((c) => (
              <span key={c} style={{ fontSize: 11.5, color: "var(--text3)", display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ color: "var(--accent)", fontSize: 10 }}>✓</span>{c}
              </span>
            ))}
          </div>
        </div>
      </div>

      {error   && <div className="error-box">{error}</div>}
      {loading && <div className="loading"><div className="spinner" /><span>Running ILP optimizer…</span></div>}

      {result && !loading && (
        <div className="fade-in">
          <div className="stats-row">
            <div className="stat-card"><div className="stat-label">Total Cost</div><div className="stat-value amber">£{result.total_cost}m</div></div>
            <div className="stat-card"><div className="stat-label">Remaining</div><div className="stat-value">£{result.budget_remaining}m</div></div>
            <div className="stat-card"><div className="stat-label">XI Pred Pts</div><div className="stat-value green">{result.predicted_points}</div></div>
            <div className="stat-card">
              <div className="stat-label">Captain</div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 6 }}>
                <span className="cap-c">C</span>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{result.captain}</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Vice Captain</div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 6 }}>
                <span className="cap-v">V</span>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{result.vice_captain}</span>
              </div>
            </div>
          </div>

          <div className="two-col" style={{ marginBottom: 16 }}>
            <div className="card">
              <div className="card-title">Starting XI</div>
              <div className="squad-list">
                {POS_ORDER.map((pos) => {
                  const group = starters.filter((p) => p.position === pos);
                  if (!group.length) return null;
                  return group.map((p) => (
                    <div key={p.web_name} className="player-row">
                      <span className={`pos pos-${p.position}`}>{p.position}</span>
                      <span className="player-name">
                        {p.web_name}
                        {p.web_name === result.captain      && <span className="cap-c" style={{marginLeft:7}}>C</span>}
                        {p.web_name === result.vice_captain && <span className="cap-v" style={{marginLeft:7}}>V</span>}
                      </span>
                      <span className="player-team">{p.team_name}</span>
                      <span className="price">£{p.price?.toFixed(1)}m</span>
                      <span className="player-pts">{p.predicted_pts}</span>
                    </div>
                  ));
                })}
              </div>
            </div>

            <div className="card">
              <div className="card-title">Bench</div>
              <div className="squad-list">
                {bench.map((p) => (
                  <div key={p.web_name} className="player-row" style={{ opacity: 0.65 }}>
                    <span className={`pos pos-${p.position}`}>{p.position}</span>
                    <span className="player-name">{p.web_name}</span>
                    <span className="player-team">{p.team_name}</span>
                    <span className="price">£{p.price?.toFixed(1)}m</span>
                    <span className="player-pts">{p.predicted_pts}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, padding: "10px 12px", background: "var(--bg3)", borderRadius: "var(--radius-sm)", fontSize: 11.5, color: "var(--text3)", lineHeight: 1.7 }}>
                Captain selected by highest predicted pts in starting XI. Vice captain is second highest.
              </div>
            </div>
          </div>

          <TeamAnalysis result={result} />

          <button
            onClick={explainTeam}
            disabled={explaining}
            style={{
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
              "Explain My Team"
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

      {!loading && !result && !error && (
        <div className="empty"><div className="empty-icon">◎</div><div className="empty-msg">Set a budget and click Generate Squad</div></div>
      )}
    </div>
  );
}