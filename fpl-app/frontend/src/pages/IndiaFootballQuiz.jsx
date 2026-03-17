import { useState, useRef } from "react";

// ─── ICONS ────────────────────────────────────────────────────────────────────
function Ico({ n, s = 18 }) {
  const p = { width: s, height: s, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round" };
  const ic = {
    ball:     <svg {...p}><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 6.16 2.1L12 8.5 5.84 4.1A10 10 0 0 1 12 2z"/><path d="M2.46 8.5H8.5l2 6-4.5 3.27A10 10 0 0 1 2.46 8.5z"/><path d="M21.54 8.5H15.5l-2 6 4.5 3.27A10 10 0 0 0 21.54 8.5z"/></svg>,
    flag:     <svg {...p}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>,
    chart:    <svg {...p}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
    globe:    <svg {...p}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
    star:     <svg {...p}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    trophy:   <svg {...p}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>,
    mountain: <svg {...p}><path d="M8 3l4 8 5-5 5 15H2L8 3z"/></svg>,
    calendar: <svg {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    shield:   <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    users:    <svg {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    fire:     <svg {...p}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>,
    book:     <svg {...p}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
    eye:      <svg {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    check:    <svg {...p}><polyline points="20 6 9 17 4 12"/></svg>,
    x:        <svg {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    close:    <svg {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    image:    <svg {...p}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  };
  return ic[n] || null;
}

// ─── DATA ─────────────────────────────────────────────────────────────────────
const QUESTIONS = [
  {
    q:    "Which Indian footballer signed for an English Football League club in 1999?",
    opts: ["Sunil Chhetri", "Bhaichung Bhutia", "Robin Singh", "Eugeneson Lyngdoh"],
    ans:  1,
    fact: "Bhaichung Bhutia signed for Bury FC — the first Indian to play professional football in England. 39 league appearances. Most English fans still have no idea.",
    icon: "flag",
    img:  "/images/quiz/bhutia.png",
    imgCaption: "Bhaichung Bhutia",
  },
  {
    q:    "India's highest ever FIFA ranking was 94th. Which year did they reach it?",
    opts: ["1990", "1993", "1996", "2002"],
    ans:  2,
    fact: "1996. India had a golden generation that almost nobody talks about. The current squad is the closest they've come to that peak since.",
    icon: "chart",
    img:  "/images/quiz/Flag-India.webp",
    imgCaption: "India National Team",
  },
  {
    q:    "Which PL legend played in the Indian Super League at age 40?",
    opts: ["Thierry Henry", "Robert Pires", "Nicolas Anelka", "Freddie Ljungberg"],
    ans:  1,
    fact: "Robert Pires, FC Goa, ISL Season 1 (2014). Still gliding past defenders at 40. FC Goa sold out every single home match that season.",
    icon: "globe",
    img:  "/images/quiz/pieres.jpg",
    imgCaption: "Robert Pires",
  },
  {
    q:    "Sunil Chhetri's international goal tally surpasses which pair of legends?",
    opts: ["Messi & Ronaldo", "Rooney & Henry", "Shearer & Lineker", "Zidane & Platini"],
    ans:  1,
    fact: "94+ goals — more than Rooney (53) and Henry (51) combined in international football. 3rd highest active scorer in the world. Behind only Ronaldo and Messi.",
    icon: "star",
    img:  "/images/quiz/chhetri.avif",
    imgCaption: "Sunil Chhetri",
  },
  {
    q:    "Mohun Bagan AC, founded in 1889, holds which record in Asia?",
    opts: ["Most league titles", "Oldest active club", "Largest stadium", "Most international players"],
    ans:  1,
    fact: "Oldest football club in Asia, still active. Their 1911 IFA Shield win over a British regiment was treated as an act of national resistance. In boots.",
    icon: "trophy",
    img:  "/images/quiz/mohunbagan.jpg",
    imgCaption: "Mohun Bagan AC · Est. 1889",
  },
  {
    q:    "Which tiny northeast state produces the most pro footballers per capita?",
    opts: ["Assam", "Manipur", "Meghalaya", "Mizoram"],
    ans:  3,
    fact: "Mizoram. Population 1.2 million. Football is genuinely the state religion — every village has a pitch, every kid plays. The numbers are extraordinary.",
    icon: "mountain",
    img:  "/images/quiz/AIZAWL-FC.png",
    imgCaption: "Aizawl FC — Mizoram's pride",
  },
  {
    q:    "India qualified for a FIFA World Cup once and then withdrew. The year?",
    opts: ["1950", "1958", "1966", "1974"],
    ans:  0,
    fact: "1950, Brazil. Officially withdrew due to travel costs. The legend says FIFA refused to let them play barefoot. They've never qualified since. Yet.",
    icon: "calendar",
    img:  "/images/quiz/1950wcposter.jpg",
    imgCaption: "1950 FIFA World Cup · Brazil",
  },
  {
    q:    "The Durand Cup, India's oldest tournament, ranks where globally by age?",
    opts: ["5th oldest", "4th oldest", "3rd oldest", "2nd oldest"],
    ans:  2,
    fact: "3rd oldest football tournament in the world — behind only the FA Cup and Scottish Cup. Started 1888. India has been playing this game longer than most nations.",
    icon: "shield",
    img:  "/images/quiz/durandcup.jpg",
    imgCaption: "Durand Cup · Est. 1888",
  },
  {
    q:    "How many Indians are currently playing professional football in Europe?",
    opts: ["Zero", "2–3", "5–8", "10+"],
    ans:  1,
    fact: "Around 2–3 at any given time. Five years ago the answer was zero. The pipeline is being built — slowly, but it's real.",
    icon: "users",
    img:  "/images/quiz/Chhangte.avif",
    imgCaption: "Lallianzuala Chhangte",
  },
  {
    q:    "Which ISL derby is described as one of the most intense in world football?",
    opts: ["Mumbai Derby", "Kolkata Derby", "Kerala Derby", "Goa Derby"],
    ans:  1,
    fact: "ATK Mohun Bagan vs East Bengal — the Kolkata Derby. Roots going back to 1889, split along class lines. The atmosphere is like nothing else in Indian sport.",
    icon: "flag",
    img:  "/images/quiz/kolkata_derby-sixteen_nine.avif",
    imgCaption: "The Kolkata Derby",
  },
];

function shuffle(a) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}

// ─── FACT IMAGE ───────────────────────────────────────────────────────────────
function FactImage({ src, caption }) {
  const [status, setStatus] = useState("loading");

  if (!src) return null;

  return (
    <div style={{
      position: "relative",
      width: "100%",
      background: "var(--bg4)",
      borderBottom: "1px solid var(--border)",
      overflow: "hidden",
    }}>
      {(status === "loading" || status === "error") && (
        <div style={{ height: 120, display:"flex", alignItems:"center", justifyContent:"center", color:"var(--text3)" }}>
          <Ico n="image" s={18}/>
        </div>
      )}
      <img
        src={src}
        alt={caption}
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
        style={{
          display: status === "loaded" ? "block" : "none",
          width: "100%",
          height: "auto",
          maxHeight: 320,
          objectFit: "contain",
        }}
      />
      {status === "loaded" && caption && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          background: "linear-gradient(transparent, rgba(0,0,0,0.75))",
          padding: "24px 12px 8px",
          fontSize: 9,
          fontFamily: "var(--mono)",
          color: "rgba(255,255,255,0.6)",
          textAlign: "center",
          letterSpacing: "0.05em",
        }}>
          {caption}
        </div>
      )}
    </div>
  );
}
// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function IndiaFootballQuiz() {
  const [phase,      setPhase]      = useState("entry");
  const [questions,  setQuestions]  = useState([]);
  const [qIdx,       setQIdx]       = useState(0);
  const [state,      setState]      = useState("idle");
  const [score,      setScore]      = useState(0);
  const [animKey,    setAnimKey]    = useState(0);
  const [tileStates, setTileStates] = useState({});
  const factRef = useRef(null);

  function start() {
    setQuestions(shuffle(QUESTIONS).slice(0, 7));
    setQIdx(0); setState("idle"); setScore(0);
    setTileStates({}); setPhase("quiz"); setAnimKey(k => k + 1);
  }

  function exit() { setPhase("entry"); }

  function pick(i) {
    if (state !== "idle") return;
    setState("picked");
    setTimeout(() => {
      const correct = questions[qIdx].ans;
      const tiles = {};
      questions[qIdx].opts.forEach((_, idx) => {
        if (idx === correct) tiles[idx] = "correct";
        else if (idx === i && i !== correct) tiles[idx] = "wrong";
        else tiles[idx] = "dim";
      });
      setTileStates(tiles);
      setState("revealed");
      if (i === correct) setScore(s => s + 1);
      setTimeout(() => factRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 200);
    }, 380);
  }

  function next() {
    if (qIdx + 1 >= questions.length) { setPhase("done"); return; }
    setQIdx(q => q + 1);
    setState("idle"); setTileStates({});
    setAnimKey(k => k + 1);
  }

  const q   = questions[qIdx];
  const pct = questions.length ? ((qIdx + (state === "revealed" ? 1 : 0)) / questions.length) * 100 : 0;
  const scoreLabel = score >= 6 ? "Indian Football Expert" : score >= 4 ? "Solid — You Know Your Stuff" : score >= 2 ? "Keep Exploring" : "Time To Learn";

  return (
    <div>
      <style>{`
        @keyframes qFadeUp  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes qShake   { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-7px)} 40%{transform:translateX(7px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
        @keyframes qFlipIn  { 0%{transform:rotateX(-90deg);opacity:0} 60%{transform:rotateX(6deg)} 100%{transform:rotateX(0);opacity:1} }
        @keyframes qSlideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes qCorrect { 0%{transform:scale(1)} 30%{transform:scale(1.025)} 100%{transform:scale(1)} }
        @keyframes qGlow    { 0%{box-shadow:0 0 0 0 rgba(0,214,143,0.45)} 70%{box-shadow:0 0 0 8px rgba(0,214,143,0)} 100%{box-shadow:none} }
        @keyframes qScoreIn { from{transform:scale(0.5);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes qImgIn   { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }

        .qt-grid { display:grid; grid-template-columns:1fr 1fr; gap:9px; }
        .qt {
          position:relative; overflow:hidden;
          border-radius:var(--radius); border:1.5px solid var(--border);
          background:var(--bg3); padding:16px 14px;
          cursor:pointer; transition:border-color 0.15s,transform 0.12s,background 0.15s;
          text-align:left; min-height:60px;
          display:flex; align-items:center; gap:10px;
        }
        .qt:hover:not(:disabled) { border-color:var(--border2); background:var(--bg4); transform:translateY(-2px); }
        .qt:disabled { cursor:default; }
        .qt.correct { border-color:var(--accent)!important; background:var(--accent-g)!important; animation:qCorrect 0.35s ease,qGlow 0.5s ease; }
        .qt.wrong   { border-color:var(--red)!important;    background:var(--red-g)!important;    animation:qShake 0.4s ease; }
        .qt.dim     { opacity:0.3; border-color:var(--border)!important; }
        .qt-fill    { position:absolute;inset:0;pointer-events:none;border-radius:var(--radius); }
        .qt.correct .qt-fill { background:rgba(0,214,143,0.06); animation:qFlipIn 0.4s ease forwards; }
        .qt.wrong   .qt-fill { background:rgba(244,63,94,0.06);  animation:qFlipIn 0.4s ease forwards; }
        .qt-badge {
          width:26px;height:26px;border-radius:50%;border:1.5px solid var(--border2);
          background:var(--bg4);display:flex;align-items:center;justify-content:center;
          flex-shrink:0;font-size:10px;font-weight:900;font-family:var(--mono);
          color:var(--text3);transition:all 0.2s;
        }
        .qt.correct .qt-badge { border-color:var(--accent);background:rgba(0,214,143,0.15);color:var(--accent); }
        .qt.wrong   .qt-badge { border-color:var(--red);background:rgba(244,63,94,0.15);color:var(--red); }
        .qt-label { font-size:13px;font-weight:700;color:var(--text2);font-family:var(--font);line-height:1.3;transition:color 0.2s; }
        .qt:hover:not(:disabled) .qt-label { color:var(--text); }
        .qt.correct .qt-label { color:var(--accent); }
        .qt.wrong   .qt-label { color:var(--red); }
        .qt.dim     .qt-label { color:var(--text3); }

        .fact-card { animation:qSlideUp 0.4s cubic-bezier(0.22,1,0.36,1) forwards; }
        .fact-img  { animation:qImgIn 0.5s ease 0.15s both; }

        .next-btn {
          width:100%;background:#00d68f;border:none;border-radius:var(--radius);
          padding:16px;font-family:var(--font);font-size:14px;font-weight:900;
          color:#000000;cursor:pointer;letter-spacing:0.1em;text-transform:uppercase;
          transition:opacity 0.15s,transform 0.12s;
          animation:qFadeUp 0.3s ease 0.05s both;
        }
        .next-btn:hover { opacity:0.85; transform:translateY(-1px); box-shadow:0 6px 20px rgba(0,214,143,0.35); }

        @media(max-width:480px) {
          .qt-grid { grid-template-columns:1fr; }
          .qt { min-height:50px; padding:13px; }
        }
      `}</style>

      {/* ══════════ ENTRY */}
      {phase === "entry" && (
        <div style={{ animation:"qFadeUp 0.4s ease" }}>
          <div style={{ background:"linear-gradient(135deg,var(--bg2),var(--bg3))", border:"1px solid var(--border)", borderRadius:"var(--radius-lg)", overflow:"hidden" }}>
            <div style={{ height:3, background:"linear-gradient(90deg,var(--accent),rgba(5,240,255,0.6),transparent)" }}/>
            <div style={{ padding:"28px 24px 20px", borderBottom:"1px solid var(--border)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
                <div style={{ width:32,height:32,borderRadius:8,background:"var(--accent-g)",border:"1px solid rgba(0,214,143,0.2)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--accent)",flexShrink:0 }}>
                  <Ico n="ball" s={16}/>
                </div>
                <span style={{ fontSize:9,fontWeight:900,color:"var(--accent)",letterSpacing:"0.2em",textTransform:"uppercase",fontFamily:"var(--mono)" }}>India FC · Trivia Challenge</span>
              </div>
              <div style={{ fontSize:"clamp(20px,4vw,26px)",fontWeight:900,color:"var(--text)",lineHeight:1.2,marginBottom:10,fontFamily:"var(--font)",textTransform:"uppercase" }}>
                You Follow the PL.<br/>
                <span style={{color:"var(--accent)"}}>But Do You Know<br/>Indian Football?</span>
              </div>
              <p style={{ fontSize:12,color:"var(--text3)",lineHeight:1.7,fontFamily:"var(--font)",maxWidth:400 }}>
                7 questions. Each answer reveals a fact most Indian fans don't know. Most PL fans score <strong style={{color:"var(--text2)"}}>under 4.</strong>
              </p>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",borderBottom:"1px solid var(--border)" }}>
              {[["94th","India's peak FIFA rank"],["94+","Chhetri's intl goals"],["1889","Asia's oldest club"]].map(([v,l]) => (
                <div key={l} style={{ padding:"16px 14px",textAlign:"center",borderRight:"1px solid var(--border)" }}>
                  <div style={{ fontSize:22,fontWeight:900,color:"var(--accent)",fontFamily:"var(--font)",lineHeight:1 }}>{v}</div>
                  <div style={{ fontSize:9,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.1em",fontFamily:"var(--mono)",marginTop:4,lineHeight:1.4 }}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{ padding:"20px 24px" }}>
              <button className="next-btn" onClick={start} style={{ fontSize:14,letterSpacing:"0.1em",color:"#000" }}>Take the Quiz →</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ QUIZ */}
      {phase === "quiz" && q && (
        <div key={animKey} style={{ animation:"qFadeUp 0.3s ease" }}>

          {/* Header */}
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
            <div style={{ fontSize:10,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.12em",fontFamily:"var(--mono)" }}>
              {qIdx + 1} <span style={{opacity:0.4}}>/</span> {questions.length}
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:12 }}>
              <div style={{ fontSize:11,fontWeight:900,fontFamily:"var(--mono)",color:"var(--accent)" }}>
                {score} <span style={{color:"var(--text3)",fontWeight:400}}>correct</span>
              </div>
              <button onClick={exit} title="Exit"
                style={{ width:28,height:28,borderRadius:6,border:"1px solid var(--border)",background:"none",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--text3)",transition:"all 0.15s" }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--border2)";e.currentTarget.style.color="var(--text2)";}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--border)";e.currentTarget.style.color="var(--text3)";}}>
                <Ico n="close" s={13}/>
              </button>
            </div>
          </div>

          {/* Progress */}
          <div style={{ height:3,background:"var(--bg4)",borderRadius:3,marginBottom:16,overflow:"hidden" }}>
            <div style={{ height:"100%",width:`${pct}%`,background:"linear-gradient(90deg,var(--accent),rgba(5,240,255,0.7))",borderRadius:3,transition:"width 0.5s cubic-bezier(0.22,1,0.36,1)" }}/>
          </div>

          {/* Question */}
          <div style={{ background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:"var(--radius-lg)",padding:"20px",marginBottom:12,position:"relative",overflow:"hidden" }}>
            <div style={{ position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,rgba(5,240,255,0.5),transparent)" }}/>
            <div style={{ fontSize:9,fontWeight:900,color:"rgba(5,240,255,0.45)",letterSpacing:"0.18em",textTransform:"uppercase",fontFamily:"var(--mono)",marginBottom:10 }}>◆ Question {qIdx + 1}</div>
            <div style={{ fontSize:"clamp(14px,3vw,17px)",fontWeight:800,color:"var(--text)",lineHeight:1.45,fontFamily:"var(--font)" }}>{q.q}</div>
          </div>

          {/* 2×2 Grid */}
          <div className="qt-grid" style={{ marginBottom:12 }}>
            {q.opts.map((opt, i) => {
              const ts = tileStates[i];
              return (
                <button key={i} className={`qt ${ts || ""}`} disabled={state !== "idle"} onClick={() => pick(i)}>
                  <div className="qt-fill"/>
                  <div className="qt-badge">
                    {ts === "correct" ? <Ico n="check" s={12}/> : ts === "wrong" ? <Ico n="x" s={12}/> : ["A","B","C","D"][i]}
                  </div>
                  <span className="qt-label">{opt}</span>
                </button>
              );
            })}
          </div>

          {/* ── FACT REVEAL */}
          {state === "revealed" && (
            <div ref={factRef} className="fact-card" style={{ marginBottom:12 }}>
              <div style={{ background:"var(--bg2)",border:"1px solid rgba(0,214,143,0.2)",borderRadius:"var(--radius-lg)",overflow:"hidden" }}>
                <div style={{ height:2,background:"linear-gradient(90deg,var(--accent),rgba(5,240,255,0.5),transparent)" }}/>

                {/* Image — full width, fixed height, covers container */}
                {q.img && (
                  <div className="fact-img">
                    <FactImage src={q.img} caption={q.imgCaption}/>
                  </div>
                )}

                {/* Text */}
                <div style={{ padding:"16px 20px" }}>
                  <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:10 }}>
                    <div style={{ width:5,height:5,borderRadius:"50%",background:"var(--accent)",flexShrink:0 }}/>
                    <span style={{ fontSize:9,fontWeight:900,color:"var(--accent)",letterSpacing:"0.2em",textTransform:"uppercase",fontFamily:"var(--mono)" }}>Unlocked · Fact</span>
                  </div>
                  <p style={{ fontSize:14,color:"var(--text)",lineHeight:1.85,fontFamily:"var(--font)",fontWeight:500,margin:0 }}>{q.fact}</p>
                </div>
              </div>
            </div>
          )}

          {state === "revealed" && (
            <button className="next-btn" onClick={next}>
              {qIdx + 1 >= questions.length ? "See My Score" : "Next Question →"}
            </button>
          )}
        </div>
      )}

      {/* ══════════ DONE */}
      {phase === "done" && (
        <div style={{ animation:"qFadeUp 0.4s ease" }}>
          <div style={{ background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:"var(--radius-lg)",overflow:"hidden" }}>
            <div style={{ height:3,background:"linear-gradient(90deg,var(--accent),rgba(5,240,255,0.5),transparent)" }}/>
            <div style={{ padding:"32px 24px",textAlign:"center" }}>

              <div style={{ position:"relative",width:96,height:96,margin:"0 auto 20px" }}>
                <svg width="96" height="96" viewBox="0 0 96 96" style={{ transform:"rotate(-90deg)" }}>
                  <circle cx="48" cy="48" r="40" fill="none" stroke="var(--bg4)" strokeWidth="6"/>
                  <circle cx="48" cy="48" r="40" fill="none" stroke="var(--accent)" strokeWidth="6"
                    strokeDasharray={`${2*Math.PI*40}`}
                    strokeDashoffset={`${2*Math.PI*40*(1-score/questions.length)}`}
                    strokeLinecap="round"
                    style={{ transition:"stroke-dashoffset 1s cubic-bezier(0.22,1,0.36,1)", animation:"qScoreIn 0.6s ease" }}
                  />
                </svg>
                <div style={{ position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center" }}>
                  <div style={{ fontSize:26,fontWeight:900,color:"var(--accent)",fontFamily:"var(--font)",lineHeight:1 }}>{score}</div>
                  <div style={{ fontSize:10,color:"var(--text3)",fontFamily:"var(--mono)" }}>/ {questions.length}</div>
                </div>
              </div>

              <div style={{ fontSize:18,fontWeight:900,color:"var(--text)",textTransform:"uppercase",letterSpacing:"0.04em",fontFamily:"var(--font)",marginBottom:6 }}>{scoreLabel}</div>
              <div style={{ fontSize:12,color:"var(--text3)",fontFamily:"var(--font)",lineHeight:1.7,maxWidth:360,margin:"0 auto 24px" }}>
                {score >= 6 ? "You genuinely know Indian football. Most people don't get past 4. Share this — prove it."
                  : score >= 4 ? "Solid. You follow Indian football. But the stories go much deeper than this."
                  : "Every fact you just learned is just the surface. Indian football has layers most people never find."}
              </div>

              <div style={{ display:"flex",justifyContent:"center",gap:6,marginBottom:24,flexWrap:"wrap" }}>
                {questions.map((_, i) => (
                  <div key={i} style={{ width:28,height:5,borderRadius:3,background:i<score?"var(--accent)":"var(--bg4)",transition:`background 0.3s ease ${i*0.08}s` }}/>
                ))}
              </div>

              <div style={{ display:"flex",gap:10,justifyContent:"center" }}>
                <button className="next-btn" onClick={start} style={{ flex:1,maxWidth:200 }}>Play Again</button>
                <button onClick={exit}
                  style={{ flex:1,maxWidth:160,background:"none",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"13px",fontFamily:"var(--font)",fontSize:12,fontWeight:700,color:"var(--text2)",cursor:"pointer",textTransform:"uppercase",letterSpacing:"0.06em",transition:"border-color 0.15s" }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor="var(--border2)"}
                  onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border)"}>
                  Back
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}