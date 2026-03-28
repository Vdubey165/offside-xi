import { useState, useEffect } from "react";
import { api } from "../api/client";   //connecting backend with frontend

const FEATURE_LABELS = {
  avg_pts_last3:          "Avg Pts (3GW)",
  avg_pts_last5:          "Avg Pts (5GW)",
  form_trend:             "Form Trend",
  avg_minutes_last3:      "Avg Minutes (3GW)",
  avg_xgi_last3:          "Avg xGI (3GW)",
  avg_ict_last3:          "Avg ICT (3GW)",
  avg_bps_last3:          "Avg BPS (3GW)",
  is_home:                "Home Fixture",
  value:                  "Player Price",
  avg_fixture_difficulty: "Fixture Difficulty",
};

const FEATURE_GUIDE = [
  { feature: "avg_pts_last3",          type: "Rolling avg",     meaning: "Points form over last 3 gameweeks" },
  { feature: "avg_pts_last5",          type: "Rolling avg",     meaning: "Points form over last 5 gameweeks" },
  { feature: "form_trend",             type: "Derived",         meaning: "last3 minus last5 — positive = improving" },
  { feature: "avg_minutes_last3",      type: "Rolling avg",     meaning: "Availability — strongest single predictor" },
  { feature: "avg_xgi_last3",          type: "Rolling avg",     meaning: "Expected goal involvements — attacking threat" },
  { feature: "avg_ict_last3",          type: "Rolling avg",     meaning: "ICT index — FPL composite threat score" },
  { feature: "avg_bps_last3",          type: "Rolling avg",     meaning: "Bonus point system — consistent quality" },
  { feature: "is_home",                type: "Binary",          meaning: "Home fixture — 1 or 0" },
  { feature: "value",                  type: "Static",          meaning: "Player price — budget efficiency" },
  { feature: "avg_fixture_difficulty", type: "Forward-looking", meaning: "Upcoming 3 fixture difficulty average" },
];

export default function ModelInsights() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    api.getModelInsights().then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner" /><span>Loading insights…</span></div>;
  if (error)   return <div className="error-box">{error}</div>;

  const maxImp = Math.max(...Object.values(data.feature_importances));

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Model Insights</div>
          <div className="page-subtitle">LightGBM · Optuna-tuned · feature importances</div>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Algorithm</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, color: "var(--text)", marginTop: 6 }}>LightGBM</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Model MAE</div>
          <div className="stat-value green">{data.mae}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Baseline MAE</div>
          <div className="stat-value red">{data.baseline_mae}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Improvement</div>
          <div className="stat-value green">+{data.improvement_pct}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Training Rows</div>
          <div className="stat-value blue">{data.training_rows.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Features</div>
          <div className="stat-value">{Object.keys(data.feature_importances).length}</div>
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-title">Feature Importance</div>
          {Object.entries(data.feature_importances).map(([feat, val], i) => (
            <div key={feat} className="feat-row">
              <div className="feat-label">{FEATURE_LABELS[feat] || feat}</div>
              <div className="feat-track">
                <div className="feat-fill" style={{ width: `${(val / maxImp) * 100}%`, opacity: i === 0 ? 1 : 0.6 + (1 - i / 10) * 0.4 }} />
              </div>
              <div className="feat-val">{val.toLocaleString()}</div>
            </div>
          ))}
          <div style={{ marginTop: 18, padding: "12px 14px", background: "var(--bg3)", borderRadius: "var(--radius-sm)", borderLeft: "2px solid var(--accent)" }}>
            <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.7 }}>
              <strong style={{ color: "var(--text)" }}>Key insight:</strong> Minutes played dominates — player availability matters more than raw talent. Fixture difficulty adds forward-looking context the rolling averages alone cannot capture.
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <div className="card-title">Model Comparison</div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0 0 8px", borderBottom: "1px solid var(--border)", fontSize: 10.5, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "'Geist Mono', monospace" }}>
              <span>Model</span><span>MAE</span><span>vs Baseline</span>
            </div>
            {data.model_comparison.map((m, i) => (
              <div key={m.model} className={`model-row ${i === data.model_comparison.length - 1 ? "best" : ""}`}>
                <div className="model-name">{m.model}</div>
                <div className="model-mae">{m.mae}</div>
                <div className="model-imp">{m.improvement}</div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-title">Pipeline</div>
            {[
              ["Data",      "817 players · GW history from FPL API · 20,703 rows"],
              ["Features",  "3/5-GW rolling averages blended 70% form + 30% season"],
              ["Training",  "80/20 split · Optuna hyperparameter search · 50 trials"],
              ["Inference", "Latest GW features → predicted pts for next GW"],
              ["Optimizer", "ILP (PuLP/CBC) · 2-phase: squad selection → starting XI"],
            ].map(([key, val]) => (
              <div key={key} className="info-row">
                <div className="info-key">{key}</div>
                <div className="info-val">{val}</div>
              </div>
            ))}
          </div>

          <div className="card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div className="card-title" style={{ marginBottom: 0 }}>Feature Guide</div>
              <button
                onClick={() => setShowGuide((v) => !v)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.7)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  lineHeight: 1,
                }}
                aria-label={showGuide ? "Hide feature guide" : "Show feature guide"}
              >
                {showGuide ? "−" : "+"}
              </button>
            </div>

            {showGuide && (
              <div
                style={{
                  marginTop: 12,
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                <div style={{ maxHeight: 280, overflow: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                    <colgroup>
                      <col style={{ width: "38%" }} />
                      <col style={{ width: "22%" }} />
                      <col style={{ width: "40%" }} />
                    </colgroup>
                    <thead>
                      <tr style={{ background: "rgba(5,240,255,0.08)" }}>
                        <th
                          style={{
                            padding: "10px 12px",
                            textAlign: "left",
                            fontSize: 10,
                            fontWeight: 900,
                            color: "rgba(255,255,255,0.85)",
                            fontFamily: "'Geist Mono', monospace",
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            borderBottom: "1px solid rgba(255,255,255,0.06)",
                          }}
                        >
                          Feature
                        </th>
                        <th
                          style={{
                            padding: "10px 12px",
                            textAlign: "left",
                            fontSize: 10,
                            fontWeight: 900,
                            color: "rgba(255,255,255,0.85)",
                            fontFamily: "'Geist Mono', monospace",
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            borderBottom: "1px solid rgba(255,255,255,0.06)",
                          }}
                        >
                          Type
                        </th>
                        <th
                          style={{
                            padding: "10px 12px",
                            textAlign: "left",
                            fontSize: 10,
                            fontWeight: 900,
                            color: "rgba(255,255,255,0.85)",
                            fontFamily: "'Geist Mono', monospace",
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            borderBottom: "1px solid rgba(255,255,255,0.06)",
                          }}
                        >
                          What It Captures
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {FEATURE_GUIDE.map((row, i) => (
                        <tr
                          key={row.feature}
                          style={{
                            background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
                            borderBottom: "1px solid rgba(255,255,255,0.04)",
                          }}
                        >
                          <td style={{ padding: "10px 12px", verticalAlign: "top" }}>
                            <span
                              style={{
                                fontSize: 11,
                                color: "var(--blue)",
                                textDecoration: "underline",
                                fontFamily: "'Geist Mono', monospace",
                              }}
                              title={FEATURE_LABELS[row.feature] || row.feature}
                            >
                              {row.feature}
                            </span>
                            <div style={{ marginTop: 4, fontSize: 10.5, color: "rgba(255,255,255,0.55)", fontFamily: "'Barlow Condensed', sans-serif" }}>
                              {FEATURE_LABELS[row.feature] || row.feature}
                            </div>
                          </td>
                          <td style={{ padding: "10px 12px", verticalAlign: "top", fontSize: 11, color: "rgba(255,255,255,0.7)", fontFamily: "'Barlow Condensed', sans-serif" }}>
                            {row.type}
                          </td>
                          <td style={{ padding: "10px 12px", verticalAlign: "top", fontSize: 11.5, color: "rgba(255,255,255,0.72)", fontFamily: "'Barlow Condensed', sans-serif", lineHeight: 1.6 }}>
                            {row.meaning}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!showGuide && (
              <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--text3)", lineHeight: 1.6 }}>
                Tap + to see what each feature means and why it matters.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
