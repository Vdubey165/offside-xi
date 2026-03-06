import { useState, useEffect } from "react";
import { api } from "../api/client";
import PlayerPanel from "../components/PlayerPanel";

const POSITIONS = ["ALL", "GK", "DEF", "MID", "FWD"];

export default function TopPicks() {
  const [players,        setPlayers]        = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [pos,            setPos]            = useState("ALL");
  const [maxPrice,       setMaxPrice]       = useState(15);
  const [onlyAvail,      setOnlyAvail]      = useState(true);
  const [search,         setSearch]         = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const filtered = players.filter(p =>
    p.web_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.team_name?.toLowerCase().includes(search.toLowerCase())
  );

  const maxPts = filtered.length ? Math.max(...filtered.map((p) => p.predicted_pts)) : 10;

  async function load() {
    setLoading(true); setError(null);
    try {
      const params = { max_price: maxPrice, only_available: onlyAvail, limit: 50 };
      if (pos !== "ALL") params.position = pos;
      setPlayers(await api.getPlayers(params));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [pos, maxPrice, onlyAvail]);

  return (
    <div>
      <style>{`
        @media (max-width: 600px) {
          .picks-team-col { display: none !important; }
          .picks-subtitle { font-size: 9px !important; }
          .picks-search   { width: 100% !important; }
          .picks-filters  { gap: 6px !important; }
        }
      `}</style>

      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title">Top Picks</div>
          <div className="page-subtitle picks-subtitle">LightGBM · next GW predictions · MAE 1.021 · click any player for full stats</div>
        </div>
      </div>

      <div className="filters picks-filters">
        {POSITIONS.map((p) => (
          <button key={p} className={`filter-pill ${pos === p ? "active" : ""}`} onClick={() => setPos(p)}>{p}</button>
        ))}

        <div className="filter-sep" />

        <input
          className="input picks-search"
          placeholder="Search player or team..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 180, padding: "4px 10px", fontSize: 11.5 }}
        />

        <div className="filter-sep" />

        <div className="range-wrap">
          <span>Max price</span>
          <input
            type="range" min={4} max={15} step={0.5}
            value={maxPrice}
            onChange={(e) => setMaxPrice(parseFloat(e.target.value))}
          />
          <span className="range-val">£{maxPrice}m</span>
        </div>

        <div className="filter-sep" />

        <button className={`filter-pill ${onlyAvail ? "active" : ""}`} onClick={() => setOnlyAvail(!onlyAvail)}>
          Available only
        </button>
      </div>

      {error   && <div className="error-box">{error}</div>}
      {loading && <div className="loading"><div className="spinner" /><span>Loading predictions…</span></div>}

      {!loading && !error && (
        <div className="table-wrap fade-in">
          <table>
            <thead>
              <tr>
                <th style={{ width: 36 }}>#</th>
                <th>Player</th>
                <th className="picks-team-col">Team</th>
                <th>Pos</th>
                <th>Price</th>
                <th>Predicted Pts</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr
                  key={p.player_id}
                  onClick={() => setSelectedPlayer(p)}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(5,240,255,0.04)"}
                  onMouseLeave={e => e.currentTarget.style.background = ""}
                >
                  <td className="rank">{i + 1}</td>
                  <td style={{ fontWeight: 600 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {p.web_name}
                      <span style={{ fontSize: 9, color: "rgba(5,240,255,0.4)", fontFamily: "'Barlow Condensed',monospace" }}>↗</span>
                    </div>
                  </td>
                  <td className="picks-team-col" style={{ color: "var(--text3)", fontSize: 12 }}>{p.team_name}</td>
                  <td><span className={`pos pos-${p.position}`}>{p.position}</span></td>
                  <td className="price">£{p.price?.toFixed(1)}m</td>
                  <td>
                    <div className="pts-cell">
                      <div className="pts-bar-bg">
                        <div className="pts-bar" style={{ width: `${(p.predicted_pts / maxPts) * 100}%` }} />
                      </div>
                      <span className="pts-num">{parseFloat(p.predicted_pts).toFixed(2)}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="empty">
          <div className="empty-icon">◎</div>
          <div className="empty-msg">
            {search ? `No players matching "${search}"` : "No players match these filters"}
          </div>
        </div>
      )}

      <PlayerPanel
        player={selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
      />
    </div>
  );
}