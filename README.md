# ⚽ Offside XI — FPL AI Decision Engine

A full-stack Fantasy Premier League assistant powered by a LightGBM prediction model and Integer Linear Programming optimizer. Stop guessing. Start deciding with data.

**Live:** [offside-xi.vercel.app](https://offside-xi.vercel.app)

---

## 📸 Screenshots

**Home — Decision Intelligence Engine**
![Home](fpl-app/screenshots/Screenshot%202026-06-12%20152359.png)
> LightGBM model (MAE 1.021, 34.7% better than baseline) predicts points for all 817 active FPL players each gameweek.

**My Squad — Pitch View**
![My Squad](fpl-app/screenshots/Screenshot%202026-06-12%20152413.png)
> Visual pitch layout with predicted points per player. Captain and vice-captain highlighted. Challenge model mode available.

**Top Picks — LightGBM Rankings**
![Top Picks](fpl-app/screenshots/Screenshot%202026-06-12%20152434.png)
> All 817 players ranked by predicted GW points. Filterable by position and max price.

**Optimal XI — ILP Squad Builder**
![Optimal XI](fpl-app/screenshots/Screenshot%202026-06-12%20152457.png)
> 2-phase ILP optimization: selects best 15-man squad within budget, then picks best starting 11. Constraints: 2 GK · 5 DEF · 5 MID · 3 FWD · max 3 per club.

**Transfer Planner**
![Transfers](fpl-app/screenshots/Screenshot%202026-06-12%20152522.png)
> Load your FPL squad via Team ID. Hit-aware ILP recommends optimal transfers respecting free transfer count and −4pt penalty.

**Model Insights**
![Model Insights](fpl-app/screenshots/Screenshot%202026-06-12%20152543.png)
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
│   ├── data/                        # CSVs (player_predictions.csv etc.)
│   └── models/                      # fpl_model.pkl
├── FPL_Pipeline_Fixed.ipynb         # Training pipeline
├── fpl-app/
│   ├── .github/
│   ├── backend/
│   │   ├── main.py                  # FastAPI entry point
│   │   ├── config.py                # Env vars, paths, constants
│   │   ├── db.py                    # MongoDB connection
│   │   ├── dependencies.py          # JWT auth dependency
│   │   ├── models/
│   │   │   └── schemas.py           # Pydantic request/response schemas
│   │   ├── services/
│   │   │   ├── predictions.py       # Model loading + prediction cache
│   │   │   ├── ilp.py               # ILP squad & transfer optimizer
│   │   │   ├── gw_cache.py          # Gameweek MongoDB TTL cache
│   │   │   └── warmup.py            # Background startup warmup
│   │   ├── routers/
│   │   │   ├── auth.py              # /api/auth/*, /api/user/*
│   │   │   ├── squad.py             # /api/squad/*, /api/transfers/*
│   │   │   ├── fpl.py               # /api/players, /api/fpl/*, /api/pl/*
│   │   │   └── isl.py               # /api/isl/*
│   │   └── requirements.txt
│   ├── frontend/
│   │   ├── src/
│   │   ├── index.html
│   │   ├── package.json
│   │   └── vite.config.js
│   └── screenshots/
├── app.py                           # Legacy Streamlit app
└── README.md
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

### 2. Environment variables

Create a `.env` file in `fpl-app/backend/`:

```env
MONGO_URI=your_mongodb_atlas_uri
JWT_SECRET=your_secret_here
RETRAIN_SECRET=your_retrain_secret_here
API_FOOTBALL_KEY=your_api_football_key   # optional, for ISL data
```

### 3. Frontend

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
| `GET` | `/api/warmup` | Full stack warmup — point UptimeRobot here |
| `GET` | `/api/players` | Top picks with position/price filters |
| `GET` | `/api/model/insights` | Feature importance + model comparison |
| `POST` | `/api/squad/optimize` | ILP optimal squad generation |
| `GET` | `/api/squad/snapshot/{gw}` | Locked AI squad for a gameweek |
| `GET` | `/api/transfers/squad/{team_id}` | Fetch live FPL squad by Team ID |
| `POST` | `/api/transfers/optimize` | Hit-aware transfer recommendations |
| `GET` | `/api/current-gw` | Current gameweek (MongoDB cached, 30-min TTL) |
| `GET` | `/api/fpl/fixtures` | Fixtures for current or specified GW |
| `GET` | `/api/fpl/news` | Latest FPL injury and squad news |
| `GET` | `/api/pl/table` | Live Premier League table |
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | Login and receive JWT |
| `GET` | `/api/user/profile` | Get user profile + challenge history |
| `POST` | `/api/retrain` | Refresh predictions from live FPL data |

---

## 🔄 Updating Predictions

Each gameweek, either:
- Re-run `FPL_Pipeline_Fixed.ipynb` (Sections 2.3 → 5) to regenerate `player_predictions.csv`, or
- Hit `POST /api/retrain?secret=<RETRAIN_SECRET>` to refresh live from the FPL API without touching the notebook.

---

## 🛠 Tech Stack

- **Frontend:** React, Vite
- **Backend:** FastAPI, Python
- **ML:** LightGBM, Optuna (hyperparameter tuning)
- **Optimization:** PuLP / CBC (ILP)
- **Database:** MongoDB Atlas (predictions cache, user auth, squad snapshots)
- **Data:** FPL Official API, rolling GW history CSVs
- **Deployment:** Vercel (frontend) · Render (backend)

---

## 👤 Author

**Vaibhav Dubey** — [github.com/Vdubey165](https://github.com/Vdubey165)