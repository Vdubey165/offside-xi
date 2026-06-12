# ⚽ Offside XI — FPL AI Decision Engine

A full-stack Fantasy Premier League assistant powered by a LightGBM prediction model and Integer Linear Programming optimizer. Stop guessing. Start deciding with data.

**Live:** [offside-xi.vercel.app](https://offside-xi.vercel.app)

---

## 📸 Screenshots

**Home — Decision Intelligence Engine**
![Home](screenshots/Screenshot_2026-06-12_152359.png)
> LightGBM model (MAE 1.021, 34.7% better than baseline) predicts points for all 817 active FPL players each gameweek.

**My Squad — Pitch View**
![My Squad](screenshots/Screenshot_2026-06-12_152413.png)
> Visual pitch layout with predicted points per player. Captain and vice-captain highlighted. Challenge model mode available.

**Top Picks — LightGBM Rankings**
![Top Picks](screenshots/Screenshot_2026-06-12_152434.png)
> All 817 players ranked by predicted GW points. Filterable by position and max price.

**Optimal XI — ILP Squad Builder**
![Optimal XI](screenshots/Screenshot_2026-06-12_152457.png)
> 2-phase ILP optimization: selects best 15-man squad within budget, then picks best starting 11. Constraints: 2 GK · 5 DEF · 5 MID · 3 FWD · max 3 per club.

**Transfer Planner**
![Transfers](screenshots/Screenshot_2026-06-12_152522.png)
> Load your FPL squad via Team ID. Hit-aware ILP recommends optimal transfers respecting free transfer count and −4pt penalty.

**Model Insights**
![Model Insights](screenshots/Screenshot_2026-06-12_152543.png)
> Full model comparison (Baseline → Linear Regression → Random Forest → LightGBM → Optuna-tuned). Feature importance, pipeline breakdown, and training details.

---

## 🧠 ML + Optimization

| Component | Detail |
|---|---|
| Algorithm | LightGBM (Optuna-tuned, 50 trials) |
| MAE | 1.021 pts (vs baseline 1.563) |
| Improvement | +34.7% over mean baseline |
| Training rows | 19,069 (26 GWs of history) |
| Features | 10 — rolling xGI, ICT, BPS, form trend, minutes, price, fixture difficulty |
| Optimizer | PuLP/CBC — 2-phase ILP (squad selection → starting XI) |

**Feature engineering:** 3/5-GW rolling averages blended 70% form + 30% season average.

---

## 🗂 Project Structure

```
FPL-FINAK/
├── Data/
│   ├── data/                    # CSVs (player_predictions.csv etc.)
│   └── models/                  # fpl_model.pkl
├── FPL_Pipeline_Fixed.ipynb     # Training pipeline
├── fpl-app/
│   ├── backend/
│   │   ├── main.py              # FastAPI app
│   │   └── requirements.txt
│   └── frontend/
│       ├── src/
│       ├── index.html
│       ├── package.json
│       └── vite.config.js
├── screenshots/                 # UI screenshots
└── app.py                       # Legacy Streamlit app
```

---

## 🚀 Getting Started

### 1. Backend

```bash
cd fpl-app/backend

python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API runs at `http://localhost:8000` · Docs at `http://localhost:8000/docs`

### 2. Frontend

```bash
cd fpl-app/frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

---

## 🔌 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/players` | Top picks with position/price filters |
| `GET` | `/api/model/insights` | Feature importance + model comparison |
| `POST` | `/api/squad/optimize` | ILP optimal squad generation |
| `GET` | `/api/transfers/squad/{team_id}` | Fetch live FPL squad by Team ID |
| `POST` | `/api/transfers/optimize` | Hit-aware transfer recommendations |

---

## 🔄 Updating Predictions

Each gameweek, re-run the notebook (Sections 2.3 → 5) to regenerate `player_predictions.csv`. The backend picks up changes automatically on the next request — no restart needed.

---

## 🛠 Tech Stack

- **Frontend:** React, Vite
- **Backend:** FastAPI, Python
- **ML:** LightGBM, Optuna (hyperparameter tuning)
- **Optimization:** PuLP / CBC (ILP)
- **Data:** FPL Official API, rolling GW history CSVs
- **Deployment:** Vercel (frontend) · Render (backend)

---

## 👤 Author

**Vaibhav Dubey** — [github.com/Vdubey165](https://github.com/Vdubey165)