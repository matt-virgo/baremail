import { useState, useEffect, useRef } from "react";

const MONO = "'IBM Plex Mono', 'SF Mono', 'Fira Code', monospace";

const PALETTE = {
  bg: "#1a1410",
  bgLight: "#231e18",
  bgHighlight: "#2e2720",
  amber: "#ffb833",
  amberDim: "#cc8800",
  amberGlow: "#ffcc5520",
  amberBright: "#ffe08a",
  green: "#7ec87e",
  red: "#e87070",
  cyan: "#6ec8c8",
  dimText: "#8a7e6a",
  midText: "#b5a48a",
  border: "#3a3228",
};

const MOCK_EMAILS = [
  { id: 1, from: "alice@example.com", name: "Alice Chen", subject: "Re: Launch prep — final checklist", date: "Apr 4", time: "10:32 AM", unread: true, starred: true, body: "Hey! Just wrapped up the final QA pass. Everything looks solid.\n\nThe staging environment is mirroring prod correctly now. I pushed the last config change around 9am.\n\nOne thing — can you double-check the DNS records? I want to make sure the TTL is set low enough for a quick rollback if needed.\n\nLet's sync at 2pm if you're free.\n\n— Alice" },
  { id: 2, from: "bob@devtools.io", name: "Bob Park", subject: "That cursor bug we talked about", date: "Apr 4", time: "9:15 AM", unread: true, starred: false, body: "Found it. The issue was in the event listener cleanup — we were attaching on every render but only removing on unmount.\n\nPR is up: #847\n\nShould be a one-line fix but I added a test just in case.\n\n- Bob" },
  { id: 3, from: "news@changelog.com", name: "The Changelog", subject: "Weekly digest: Bun 2.0, Deno ships QUIC", date: "Apr 3", time: "6:00 PM", unread: false, starred: false, body: "This week in open source:\n\n• Bun 2.0 released with native S3 support\n• Deno ships QUIC protocol implementation\n• SQLite 4.0 preview announced\n• New RFC for TC39 pattern matching\n\nRead more at changelog.com" },
  { id: 4, from: "clara@virgo.health", name: "Clara Mendes", subject: "EndoDINO benchmark results", date: "Apr 3", time: "2:44 PM", unread: false, starred: true, body: "Hi Matt,\n\nThe new benchmark run finished. Summary:\n\n  Polyp detection:  94.2% mAP (up from 92.8%)\n  Classification:   91.7% accuracy\n  Segmentation:     88.3% dice score\n\nThe ViT-h+ backbone is showing clear gains over the previous architecture. I'll have the full report ready by EOD tomorrow.\n\nBest,\nClara" },
  { id: 5, from: "github@notifications.github.com", name: "GitHub", subject: "[baremail/baremail] Issue #12: Add offline compose queue", date: "Apr 3", time: "11:20 AM", unread: false, starred: false, body: "New issue opened by @traveler-dev:\n\n\"Would love to see an offline compose queue so I can write emails during the flight and have them send automatically when I land. This is the #1 feature that would make me switch from Gmail.\"\n\nLabels: enhancement, good first issue" },
  { id: 6, from: "dana@flights.com", name: "FlyRight Airlines", subject: "Your boarding pass — SFO → NRT", date: "Apr 2", time: "3:00 PM", unread: false, starred: false, body: "Your trip is coming up!\n\nFlight: FR-884\nRoute:  SFO → NRT\nDate:   April 10, 2026\nDepart: 1:15 PM PST\nArrive: 4:30 PM JST (+1 day)\nSeat:   24A (window)\n\nCheck in opens 24 hours before departure." },
  { id: 7, from: "evan@oldschool.net", name: "Evan Wright", subject: "Remember when email was fun?", date: "Apr 1", time: "8:00 AM", unread: false, starred: true, body: "I miss the days when checking email felt exciting. Every message was a little surprise. No spam, no newsletters you forgot to unsubscribe from, no \"per my last email.\"\n\nJust humans writing to humans.\n\nMaybe that's what your project can bring back — the joy of simple communication.\n\nCheers,\nEvan" },
];

const ASCII_LOGO = `  ʕ·ᴥ·ʔ
╭──────────────────╮
│   ██████╗  █████╗ ██████╗ ███████╗   │
│   ██╔══██╗██╔══██╗██╔══██╗██╔════╝   │
│   ██████╔╝███████║██████╔╝█████╗     │
│   ██╔══██╗██╔══██║██╔══██╗██╔══╝     │
│   ██████╔╝██║  ██║██║  ██║███████╗   │
│   ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝   │
│              m  a  i  l              │
╰──────────────────╯`;

const BEAR_SCENES = [
  {
    caption: "bear is napping. no new mail.",
    frames: [
      `        z
   zzZ  z
      ʕ-ᴥ-ʔ
      /|    |\\
       ||  ||`,
      `         z
   zzZ   z
      ʕ-ᴥ-ʔ
      /|    |\\
       ||  ||`,
      `      z
   zzZ  z  z
      ʕ-ᴥ-ʔ
      /|    |\\
       ||  ||`,
    ],
  },
  {
    caption: "bear is fishing. inbox clear.",
    frames: [
      `     ,--,
     |  '-----,
  ʕ·ᴥ·ʔ       |
  /|    |\\     |
 ~~~~~~~~~~~~~~o~~~`,
      `     ,--,
     |  '-----,
  ʕ·ᴥ·ʔ       |
  /|    |\\     o
 ~~~~~~~~~~~~~~~~~~~~`,
      `     ,--,
     |  '----,
  ʕᵔᴥᵔʔ     ><>
  /|    |\\
 ~~~~~~~~~~~~~~~~~~~~`,
    ],
  },
  {
    caption: "bear is stargazing. zero emails.",
    frames: [
      `  *    .        *
       *     .
    .        *    .
       ʕ·ᴥ·ʔ
       /|  |\\
  _______________`,
      `  .    *        .
       .     *
    *        .    *
       ʕ·ᴥ·ʔ
       /|  |\\
  _______________`,
      `  *    *        .
       *      *
    .        *
       ʕᵔᴥᵔʔ
       /|  |\\
  _______________`,
    ],
  },
  {
    caption: "bear is dancing. inbox zero vibes.",
    frames: [
      `    ~ +
   \\ʕ·ᴥ·ʔ/
     |    |
    /\\  /\\`,
      `   +  ~
    ʕ·ᴥ·ʔ
    /|  |\\
     || ||`,
      `  ~ +
   \\ʕᵔᴥᵔʔ
     |    |\\
    /\\  / \\`,
      `      + ~
    ʕᵔᴥᵔʔ/
   /|    |
   \\ \\  /\\`,
    ],
  },
  {
    caption: "bear found the campfire. all caught up.",
    frames: [
      `             (
         )   (  )
  ʕ·ᴥ·ʔ  ( )
  |\\  /|  )  (
  || || /####\\`,
      `          )
         (   )
  ʕ·ᴥ·ʔ   ( )
  |\\  /| (  )
  || || /####\\`,
      `           (
         (    )
  ʕ·ᴥ·ʔ  ) (
  |\\  /|  ( )
  || || /####\\`,
    ],
  },
  {
    caption: "bear is reading. nothing in the queue.",
    frames: [
      `  ʕ·ᴥ·ʔ
  | +--+|
  | |..|+
  | |..|
  +-+--+-`,
      `  ʕ·ᴥ·ʔ
  | +--+|
  | |##|+
  | |##|
  +-+--+-`,
      `  ʕᵔᴥᵔʔ
  | +--+|
  | |.#|+
  | |#.|
  +-+--+-`,
    ],
  },
  {
    caption: "bear found honey. you found inbox zero.",
    frames: [
      `   ʕ·ᴥ·ʔ  ◆
   |\\    /|/
   | \\  / /
   ||  ||`,
      `   ʕ·ᴥ·ʔ ◆
   |\\  | |
   | \\ | |
   ||  ||`,
      `   ʕᵔᴥᵔʔ
   |      |
   |  yum |
   ||    ||`,
    ],
  },
  {
    caption: "bear is cloud-watching. no emails up here.",
    frames: [
      `  .-.        .-.
 (   )  .   (   )
  '-'  ( )   '-'
      ʕ·ᴥ·ʔ
      /|  |\\
  ~~~~~~~~~~~~~~~~`,
      `   .-.       .-.
  (   ) .   (   )
   '-' ( )   '-'
      ʕ·ᴥ·ʔ
      /|  |\\
  ~~~~~~~~~~~~~~~~`,
      `    .-.      .-.
   (   ).   (   )
    '-'( )   '-'
      ʕᵔᴥᵔʔ
      /|  |\\
  ~~~~~~~~~~~~~~~~`,
    ],
  },
];

const BEAR_REACTIONS = [
  "( tap the bear )",
  "( bear noticed you )",
  "( bear likes you )",
  "( bear is happy )",
  "( bear loves you )",
  "( you are bear's favorite )",
  "( bear will remember this )",
  "( best friends forever )",
];

const StatusDot = ({ online }) => (
  <span style={{
    display: "inline-block",
    width: 8, height: 8,
    borderRadius: "50%",
    background: online ? PALETTE.green : PALETTE.red,
    boxShadow: online ? `0 0 6px ${PALETTE.green}80` : `0 0 6px ${PALETTE.red}80`,
    marginRight: 6,
    animation: online ? "pulse 3s ease-in-out infinite" : "none",
  }} />
);

const TypewriterText = ({ text, speed = 30 }) => {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { clearInterval(interval); setDone(true); }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);
  return (
    <span>
      {displayed}
      {!done && <span style={{ animation: "blink 0.6s step-end infinite", color: PALETTE.amber }}>▌</span>}
    </span>
  );
};

const KeyHint = ({ keys, label }) => (
  <span style={{ marginRight: 16, color: PALETTE.dimText, fontSize: 11 }}>
    <span style={{
      display: "inline-block",
      padding: "1px 5px",
      border: `1px solid ${PALETTE.border}`,
      borderRadius: 3,
      color: PALETTE.amberDim,
      fontSize: 10,
      fontFamily: MONO,
      marginRight: 4,
      background: PALETTE.bgLight,
    }}>{keys}</span>
    {label}
  </span>
);

const GAME_COLS = 21;
const GAME_ROWS = 11;
const BEAR_WIDTH = 6; // ʕ·ᴥ·ʔ
const BEAR_STR = "ʕ·ᴥ·ʔ";
const BEAR_HIT_STR = "ʕ>ᴥ<ʔ";
const BEAR_YUM_STR = "ʕᵔᴥᵔʔ";

const HoneyCatcher = ({ onExit }) => {
  const [bearPos, setBearPos] = useState(Math.floor((GAME_COLS - BEAR_WIDTH) / 2));
  const [items, setItems] = useState([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [highScore, setHighScore] = useState(0);
  const [gameState, setGameState] = useState("ready"); // ready | playing | over
  const [bearFace, setBearFace] = useState("normal");
  const [flashEffect, setFlashEffect] = useState(null); // "honey" | "spam" | null
  const [combo, setCombo] = useState(0);
  const [showCombo, setShowCombo] = useState(false);
  const gameRef = useRef(null);
  const bearPosRef = useRef(bearPos);
  const itemsRef = useRef(items);
  const scoreRef = useRef(score);
  const livesRef = useRef(lives);
  const comboRef = useRef(combo);
  const touchStartRef = useRef(null);

  bearPosRef.current = bearPos;
  itemsRef.current = items;
  scoreRef.current = score;
  livesRef.current = lives;
  comboRef.current = combo;

  const moveBear = (dir) => {
    setBearPos(p => {
      const next = p + dir * 2;
      return Math.max(0, Math.min(GAME_COLS - BEAR_WIDTH, next));
    });
  };

  const startGame = () => {
    setBearPos(Math.floor((GAME_COLS - BEAR_WIDTH) / 2));
    setItems([]);
    setScore(0);
    setLives(3);
    setCombo(0);
    setGameState("playing");
    setBearFace("normal");
    setFlashEffect(null);
    if (gameRef.current) gameRef.current.focus();
  };

  // Keyboard controls
  useEffect(() => {
    if (gameState !== "playing") return;
    const handleKey = (e) => {
      if (e.key === "ArrowLeft" || e.key === "j" || e.key === "a") { e.preventDefault(); moveBear(-1); }
      if (e.key === "ArrowRight" || e.key === "k" || e.key === "d") { e.preventDefault(); moveBear(1); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [gameState]);

  // Touch controls
  const handleTouchStart = (e) => {
    if (gameState !== "playing") return;
    touchStartRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    if (gameState !== "playing" || !touchStartRef.current) return;
    e.preventDefault();
  };

  const handleTouchEnd = (e) => {
    touchStartRef.current = null;
  };

  const handleTap = (e) => {
    if (gameState !== "playing") return;
    const rect = gameRef.current?.getBoundingClientRect();
    if (!rect) return;
    const tapX = (e.clientX || e.changedTouches?.[0]?.clientX || 0) - rect.left;
    const mid = rect.width / 2;
    if (tapX < mid) moveBear(-1);
    else moveBear(1);
  };

  // Game loop
  useEffect(() => {
    if (gameState !== "playing") return;

    const speed = Math.max(200, 500 - scoreRef.current * 8);

    const tick = setInterval(() => {
      setItems(prev => {
        const currentBearPos = bearPosRef.current;
        const bearMin = currentBearPos;
        const bearMax = currentBearPos + BEAR_WIDTH - 1;

        let scoreChange = 0;
        let livesChange = 0;
        let caughtHoney = false;
        let hitSpam = false;

        // Move items down and check collisions at bottom
        const surviving = [];
        for (const item of prev) {
          if (item.y >= GAME_ROWS - 1) {
            // Reached bear row
            if (item.x >= bearMin && item.x <= bearMax) {
              if (item.type === "honey") { scoreChange++; caughtHoney = true; }
              else { livesChange--; hitSpam = true; }
            } else {
              if (item.type === "honey") {
                // Missed honey - reset combo
                setCombo(0);
              }
            }
          } else {
            surviving.push({ ...item, y: item.y + 1 });
          }
        }

        // Handle scoring
        if (caughtHoney) {
          const newCombo = comboRef.current + 1;
          setCombo(newCombo);
          const points = newCombo >= 5 ? 3 : newCombo >= 3 ? 2 : 1;
          setScore(s => s + points);
          setBearFace("yum");
          setFlashEffect("honey");
          if (newCombo >= 3) { setShowCombo(true); setTimeout(() => setShowCombo(false), 600); }
          setTimeout(() => { setBearFace("normal"); setFlashEffect(null); }, 300);
        }
        if (hitSpam) {
          setCombo(0);
          const newLives = livesRef.current + livesChange;
          setLives(newLives);
          setBearFace("hit");
          setFlashEffect("spam");
          setTimeout(() => { setBearFace("normal"); setFlashEffect(null); }, 400);
          if (newLives <= 0) {
            setGameState("over");
            setHighScore(hs => Math.max(hs, scoreRef.current));
          }
        }

        // Spawn new items
        if (Math.random() < 0.45) {
          const type = Math.random() < 0.65 ? "honey" : "spam";
          const x = Math.floor(Math.random() * GAME_COLS);
          surviving.push({ x, y: 0, type, id: Date.now() + Math.random() });
        }

        return surviving;
      });
    }, speed);

    return () => clearInterval(tick);
  }, [gameState, score]);

  // Render ASCII grid
  const renderGrid = () => {
    const grid = Array.from({ length: GAME_ROWS }, () => Array(GAME_COLS).fill(" "));

    // Place items
    items.forEach(item => {
      if (item.y >= 0 && item.y < GAME_ROWS && item.x >= 0 && item.x < GAME_COLS) {
        grid[item.y][item.x] = item.type === "honey" ? "◆" : "×";
      }
    });

    // Place bear on last row
    const face = bearFace === "yum" ? BEAR_YUM_STR : bearFace === "hit" ? BEAR_HIT_STR : BEAR_STR;
    for (let i = 0; i < face.length && bearPos + i < GAME_COLS; i++) {
      grid[GAME_ROWS - 1][bearPos + i] = face[i];
    }

    const border = "│";
    const lines = grid.map(row => border + row.join("") + border);
    lines.unshift("┌" + "─".repeat(GAME_COLS) + "┐");
    lines.push("└" + "─".repeat(GAME_COLS) + "┘");
    return lines.join("\n");
  };

  const livesDisplay = "♥".repeat(Math.max(0, lives)) + "♡".repeat(Math.max(0, 3 - lives));

  // Ready screen
  if (gameState === "ready") {
    return (
      <div style={{ textAlign: "center", padding: "20px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <pre style={{
          color: PALETTE.amber, fontSize: 13, lineHeight: 1.3, margin: 0,
          display: "inline-block", textShadow: `0 0 10px ${PALETTE.amber}20`,
        }}>{`
    ◆  HONEY CATCHER  ◆
   ─────────────────────

       ◆ ◆       ×
        ◆    ×
     ×      ◆
          ◆
       ʕ·ᴥ·ʔ
   ─────────────────────
    ◆ = honey (+1 point)
    × = spam  (-1 life)
`}</pre>
        <div style={{ marginTop: 8, color: PALETTE.dimText, fontSize: 11 }}>
          keyboard: j/k or ←/→ · mobile: tap left/right
        </div>
        {highScore > 0 && (
          <div style={{ color: PALETTE.amberDim, fontSize: 11, marginTop: 6 }}>
            high score: {highScore}
          </div>
        )}
        <div style={{ marginTop: 16, display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={startGame} style={{
            background: PALETTE.amber, border: "none", color: PALETTE.bg,
            fontFamily: MONO, fontSize: 12, fontWeight: 600,
            padding: "8px 24px", cursor: "pointer",
          }}>
            start game
          </button>
          <button onClick={onExit} style={{
            background: "transparent", border: `1px solid ${PALETTE.border}`,
            color: PALETTE.dimText, fontFamily: MONO, fontSize: 12,
            padding: "8px 16px", cursor: "pointer",
          }}>
            back
          </button>
        </div>
      </div>
    );
  }

  // Game over screen
  if (gameState === "over") {
    const messages = [
      { min: 0, text: "bear tried their best." },
      { min: 5, text: "not bad for airplane wifi." },
      { min: 15, text: "bear is impressed!" },
      { min: 30, text: "legendary honey collector." },
      { min: 50, text: "the bear whisperer." },
    ];
    const msg = [...messages].reverse().find(m => score >= m.min)?.text;

    return (
      <div style={{ textAlign: "center", padding: "30px 0", animation: "fadeSlideIn 0.4s ease both" }}>
        <pre style={{
          color: PALETTE.red, fontSize: 13, lineHeight: 1.3, margin: 0,
          display: "inline-block",
        }}>{`
   ╔═══════════════════╗
   ║    GAME  OVER     ║
   ╚═══════════════════╝`}</pre>

        <pre style={{
          color: PALETTE.amber, fontSize: 14, lineHeight: 1.3,
          margin: "12px 0", display: "inline-block",
        }}>{`
     ʕ;ᴥ;ʔ
      |    |
      ||  ||`}</pre>

        <div style={{ color: PALETTE.amber, fontSize: 18, fontWeight: 600, marginTop: 8 }}>
          {score}
        </div>
        <div style={{ color: PALETTE.dimText, fontSize: 11, marginTop: 4 }}>
          {score === highScore && score > 0 ? "★ new high score! ★" : `high score: ${highScore}`}
        </div>
        <div style={{ color: PALETTE.amberDim, fontSize: 12, marginTop: 8, fontStyle: "italic" }}>
          {msg}
        </div>
        <div style={{ marginTop: 20, display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={startGame} style={{
            background: PALETTE.amber, border: "none", color: PALETTE.bg,
            fontFamily: MONO, fontSize: 12, fontWeight: 600,
            padding: "8px 24px", cursor: "pointer",
          }}>
            play again
          </button>
          <button onClick={onExit} style={{
            background: "transparent", border: `1px solid ${PALETTE.border}`,
            color: PALETTE.dimText, fontFamily: MONO, fontSize: 12,
            padding: "8px 16px", cursor: "pointer",
          }}>
            back to bear
          </button>
        </div>
      </div>
    );
  }

  // Playing screen
  return (
    <div
      ref={gameRef}
      tabIndex={0}
      onClick={handleTap}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        textAlign: "center",
        padding: "12px 0",
        outline: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
        touchAction: "manipulation",
        cursor: "pointer",
      }}
    >
      {/* Score bar */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        padding: "0 20px 8px",
        maxWidth: 320, margin: "0 auto",
      }}>
        <span style={{ color: PALETTE.amber, fontSize: 12 }}>
          score: {score}
        </span>
        {showCombo && (
          <span style={{
            color: PALETTE.amberBright, fontSize: 11, fontWeight: 600,
            animation: "floatUp 0.6s ease-out forwards",
          }}>
            {combo}x combo!
          </span>
        )}
        <span style={{
          color: lives <= 1 ? PALETTE.red : PALETTE.amber,
          fontSize: 12,
          transition: "color 0.2s",
        }}>
          {livesDisplay}
        </span>
      </div>

      {/* Game grid */}
      <pre style={{
        color: flashEffect === "honey" ? PALETTE.amberBright
             : flashEffect === "spam" ? PALETTE.red
             : PALETTE.amber,
        fontSize: 13,
        lineHeight: 1.25,
        margin: 0,
        display: "inline-block",
        textShadow: `0 0 8px ${PALETTE.amber}15`,
        transition: "color 0.15s",
        textAlign: "left",
      }}>
        {renderGrid()}
      </pre>

      {/* Mobile hint */}
      <div style={{ marginTop: 8, color: PALETTE.border, fontSize: 10 }}>
        ← tap left · tap right →
      </div>
    </div>
  );
};

const InboxZeroBear = () => {
  const [sceneIndex, setSceneIndex] = useState(() => Math.floor(Math.random() * BEAR_SCENES.length));
  const [frameIndex, setFrameIndex] = useState(0);
  const [showScene, setShowScene] = useState(false);
  const [pats, setPats] = useState(0);
  const [hearts, setHearts] = useState([]);
  const [wiggle, setWiggle] = useState(false);
  const [showGame, setShowGame] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowScene(true), 300);
    return () => clearTimeout(t);
  }, []);

  // Animate through frames
  useEffect(() => {
    if (showGame) return;
    const scene = BEAR_SCENES[sceneIndex];
    const interval = setInterval(() => {
      setFrameIndex(f => (f + 1) % scene.frames.length);
    }, 900);
    return () => clearInterval(interval);
  }, [sceneIndex, showGame]);

  // Reset frame on scene change
  useEffect(() => { setFrameIndex(0); }, [sceneIndex]);

  const handlePat = () => {
    const newPats = pats + 1;
    setPats(newPats);
    setWiggle(true);
    setTimeout(() => setWiggle(false), 400);

    // Spawn a heart with random position
    const id = Date.now();
    const xOffset = Math.random() * 60 - 30;
    const symbol = ["♥", "❤", "♡", "✦", "⋆"][Math.floor(Math.random() * 5)];
    setHearts(prev => [...prev, { id, xOffset, symbol }]);
    setTimeout(() => setHearts(prev => prev.filter(h => h.id !== id)), 1000);

    // Change scene every 3 pats
    if (newPats > 0 && newPats % 3 === 0) {
      setSceneIndex(i => (i + 1) % BEAR_SCENES.length);
    }
  };

  const scene = BEAR_SCENES[sceneIndex];
  const reaction = BEAR_REACTIONS[Math.min(pats, BEAR_REACTIONS.length - 1)];

  if (showGame) {
    return <HoneyCatcher onExit={() => setShowGame(false)} />;
  }

  return (
    <div style={{
      textAlign: "center",
      padding: "40px 0 20px",
      animation: showScene ? "fadeSlideIn 0.6s ease both" : "none",
      opacity: showScene ? 1 : 0,
    }}>
      <div
        onClick={handlePat}
        style={{
          cursor: "pointer",
          display: "inline-block",
          position: "relative",
          userSelect: "none",
        }}
      >
        <pre style={{
          color: PALETTE.amber,
          fontSize: 14,
          lineHeight: 1.35,
          margin: 0,
          textShadow: `0 0 12px ${PALETTE.amber}25`,
          display: "inline-block",
          transition: "transform 0.2s ease",
          transform: wiggle ? "rotate(-3deg) scale(1.06)" : "rotate(0deg) scale(1)",
          minHeight: 100,
          textAlign: "left",
        }}>
          {scene.frames[frameIndex]}
        </pre>

        {/* Floating hearts / sparkles on pat */}
        {hearts.map(h => (
          <div key={h.id} style={{
            position: "absolute",
            top: 0,
            left: `calc(50% + ${h.xOffset}px)`,
            animation: "floatUp 1s ease-out forwards",
            fontSize: 16,
            pointerEvents: "none",
            color: PALETTE.amber,
          }}>
            {h.symbol}
          </div>
        ))}
      </div>

      <p style={{
        color: PALETTE.amberDim,
        fontSize: 12,
        marginTop: 12,
        fontStyle: "italic",
      }}>
        {scene.caption}
      </p>

      <p style={{
        color: PALETTE.border,
        fontSize: 10,
        marginTop: 14,
        transition: "opacity 0.3s",
      }}>
        {reaction}
      </p>

      {/* Game button + Scene dots */}
      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <button
          onClick={(e) => { e.stopPropagation(); setShowGame(true); }}
          style={{
            background: "transparent",
            border: `1px dashed ${PALETTE.amberDim}`,
            color: PALETTE.amberDim,
            fontFamily: MONO,
            fontSize: 11,
            padding: "6px 16px",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={e => { e.target.style.borderColor = PALETTE.amber; e.target.style.color = PALETTE.amber; }}
          onMouseLeave={e => { e.target.style.borderColor = PALETTE.amberDim; e.target.style.color = PALETTE.amberDim; }}
        >
          ◆ play honey catcher
        </button>

        <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
          {BEAR_SCENES.map((_, i) => (
            <div
              key={i}
              onClick={(e) => { e.stopPropagation(); setSceneIndex(i); }}
              style={{
                width: 6, height: 6,
                borderRadius: "50%",
                background: i === sceneIndex ? PALETTE.amber : PALETTE.border,
                cursor: "pointer",
                transition: "background 0.2s",
                boxShadow: i === sceneIndex ? `0 0 6px ${PALETTE.amber}50` : "none",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default function BareMail() {
  const [view, setView] = useState("inbox");
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [emails, setEmails] = useState(MOCK_EMAILS);
  const [composeData, setComposeData] = useState({ to: "", subject: "", body: "" });
  const [showSent, setShowSent] = useState(false);
  const [activeLabel, setActiveLabel] = useState("inbox");
  const [searchQuery, setSearchQuery] = useState("");
  const [hoverRow, setHoverRow] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [inboxZeroMode, setInboxZeroMode] = useState(false);

  useEffect(() => { setTimeout(() => setMounted(true), 100); }, []);

  const openEmail = (email) => {
    setSelectedEmail(email);
    setView("reader");
    setEmails(prev => prev.map(e => e.id === email.id ? { ...e, unread: false } : e));
  };

  const archiveEmail = (id) => {
    setEmails(prev => prev.filter(e => e.id !== id));
    if (view === "reader") setView("inbox");
  };

  const startReply = () => {
    setComposeData({
      to: selectedEmail.from,
      subject: `Re: ${selectedEmail.subject}`,
      body: `\n\n────────────────────────────\nOn ${selectedEmail.date}, ${selectedEmail.name} wrote:\n\n${selectedEmail.body}`,
    });
    setView("compose");
  };

  const startCompose = () => {
    setComposeData({ to: "", subject: "", body: "" });
    setView("compose");
  };

  const sendEmail = () => {
    setShowSent(true);
    setTimeout(() => { setShowSent(false); setView("inbox"); }, 2000);
  };

  const unreadCount = emails.filter(e => e.unread).length;
  const currentTime = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const filteredEmails = emails.filter(e => {
    if (activeLabel === "starred") return e.starred;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return e.subject.toLowerCase().includes(q) || e.name.toLowerCase().includes(q) || e.body.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div style={{
      fontFamily: MONO,
      background: PALETTE.bg,
      color: PALETTE.midText,
      minHeight: "100vh",
      fontSize: 13,
      lineHeight: 1.5,
      overflow: "hidden",
      position: "relative",
    }}>
      {/* Scanline overlay */}
      <div style={{
        position: "fixed", inset: 0,
        background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)",
        pointerEvents: "none", zIndex: 999,
      }} />

      {/* CRT vignette */}
      <div style={{
        position: "fixed", inset: 0,
        background: "radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.5) 100%)",
        pointerEvents: "none", zIndex: 998,
      }} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes glowPulse { 0%, 100% { text-shadow: 0 0 8px ${PALETTE.amberGlow}; } 50% { text-shadow: 0 0 20px ${PALETTE.amber}40; } }
        @keyframes floatUp { 0% { opacity: 1; transform: translateY(0) scale(1); } 100% { opacity: 0; transform: translateY(-40px) scale(1.5); } }
        @keyframes bearBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        ::selection { background: ${PALETTE.amber}30; color: ${PALETTE.amberBright}; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${PALETTE.bg}; }
        ::-webkit-scrollbar-thumb { background: ${PALETTE.border}; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: ${PALETTE.amberDim}; }
        textarea:focus, input:focus { outline: 1px solid ${PALETTE.amberDim}; outline-offset: -1px; }
      `}</style>

      <div style={{
        maxWidth: 800, margin: "0 auto", padding: "0 16px",
        opacity: mounted ? 1 : 0,
        transition: "opacity 0.8s ease",
      }}>
        {/* ═══ HEADER ═══ */}
        <header style={{
          padding: "20px 0 12px",
          borderBottom: `1px solid ${PALETTE.border}`,
        }}>
          {/* Bear + BARE wordmark */}
          <div style={{ textAlign: "center" }}>
            <div style={{
              color: PALETTE.amber,
              fontSize: 22,
              marginBottom: 0,
              animation: "bearBounce 3s ease-in-out infinite",
              textShadow: `0 0 12px ${PALETTE.amber}30`,
            }}>
              ʕ·ᴥ·ʔ
            </div>
            <div style={{
              color: PALETTE.amber,
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: 12,
              margin: "2px 0 0 12px",
              textShadow: `0 0 14px ${PALETTE.amber}25`,
              animation: "glowPulse 4s ease-in-out infinite",
              fontFamily: MONO,
            }}>
              BARE<span style={{
                fontSize: 12,
                fontWeight: 400,
                letterSpacing: 3,
                color: PALETTE.amberDim,
                marginLeft: 2,
              }}>mail</span>
            </div>
            <div style={{
              color: PALETTE.border,
              fontSize: 10,
              marginTop: 2,
              letterSpacing: 4,
              fontFamily: MONO,
            }}>
              ── email's bare necessities ──
            </div>
          </div>

          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginTop: 10, padding: "0 4px",
          }}>
            <span style={{ color: PALETTE.dimText, fontSize: 11 }}>
              <StatusDot online={true} />
              connected · {emails.length === 0 ? "inbox zero ʕᵔᴥᵔʔ" : `${unreadCount} unread`}
            </span>
            <span style={{ color: PALETTE.dimText, fontSize: 11 }}>
              ≈ 3.2 KB loaded
            </span>
          </div>
        </header>

        {/* ═══ NAV BAR ═══ */}
        <nav style={{
          display: "flex", alignItems: "center", gap: 0,
          borderBottom: `1px solid ${PALETTE.border}`,
        }}>
          {[
            { id: "inbox", label: `inbox${unreadCount > 0 ? ` (${unreadCount})` : ""}`, icon: ">" },
            { id: "starred", label: "starred", icon: "★" },
            { id: "compose", label: "compose", icon: "+" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === "compose") { startCompose(); }
                else { setActiveLabel(tab.id); setView("inbox"); }
              }}
              style={{
                background: (activeLabel === tab.id && view !== "compose") || (tab.id === "compose" && view === "compose")
                  ? PALETTE.bgHighlight : "transparent",
                border: "none",
                borderBottom: (activeLabel === tab.id && view !== "compose") || (tab.id === "compose" && view === "compose")
                  ? `2px solid ${PALETTE.amber}` : "2px solid transparent",
                color: (activeLabel === tab.id && view !== "compose") || (tab.id === "compose" && view === "compose")
                  ? PALETTE.amber : PALETTE.dimText,
                fontFamily: MONO,
                fontSize: 12,
                padding: "10px 16px",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <span style={{ marginRight: 6, fontSize: 11 }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}

          <div style={{ flex: 1 }} />

          {view === "inbox" && (
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <span style={{ position: "absolute", left: 8, color: PALETTE.dimText, fontSize: 12, pointerEvents: "none" }}>⌕</span>
              <input
                type="text"
                placeholder="search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  background: PALETTE.bgLight,
                  border: `1px solid ${PALETTE.border}`,
                  color: PALETTE.midText,
                  fontFamily: MONO,
                  fontSize: 12,
                  padding: "6px 10px 6px 26px",
                  width: 160,
                  borderRadius: 0,
                }}
              />
            </div>
          )}
        </nav>

        {/* ═══ INBOX VIEW ═══ */}
        {view === "inbox" && (
          <div>
            {filteredEmails.length > 0 ? (
              <>
                {filteredEmails.map((email, i) => (
                  <div
                    key={email.id}
                    onMouseEnter={() => setHoverRow(email.id)}
                    onMouseLeave={() => setHoverRow(null)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "20px 1fr auto auto",
                      gap: 8,
                      alignItems: "baseline",
                      padding: "10px 8px",
                      borderBottom: `1px solid ${PALETTE.border}40`,
                      cursor: "pointer",
                      background: hoverRow === email.id ? PALETTE.bgHighlight : "transparent",
                      transition: "background 0.1s",
                      animation: `fadeSlideIn 0.3s ease both`,
                      animationDelay: `${i * 40}ms`,
                    }}
                  >
                    {/* Indicator */}
                    <span
                      onClick={(e) => { e.stopPropagation(); openEmail(email); }}
                      style={{ fontSize: 11, textAlign: "center", lineHeight: "20px" }}
                    >
                      {email.unread
                        ? <span style={{ color: PALETTE.amber, textShadow: `0 0 4px ${PALETTE.amber}40` }}>●</span>
                        : email.starred
                          ? <span style={{ color: PALETTE.amberDim }}>★</span>
                          : <span style={{ color: PALETTE.border }}>·</span>
                      }
                    </span>

                    {/* From + Subject */}
                    <div onClick={() => openEmail(email)} style={{ overflow: "hidden", minWidth: 0 }}>
                      <span style={{
                        color: email.unread ? PALETTE.amberBright : PALETTE.midText,
                        fontWeight: email.unread ? 600 : 400,
                        marginRight: 10,
                        fontSize: 13,
                      }}>
                        {email.name}
                      </span>
                      <span style={{
                        color: email.unread ? PALETTE.midText : PALETTE.dimText,
                        fontSize: 12,
                      }}>
                        {email.subject}
                      </span>
                    </div>

                    {/* Date */}
                    <span onClick={() => openEmail(email)} style={{
                      color: PALETTE.dimText,
                      fontSize: 11,
                      whiteSpace: "nowrap",
                    }}>
                      {email.date}
                    </span>

                    {/* Archive button on hover */}
                    <span style={{
                      opacity: hoverRow === email.id ? 1 : 0,
                      transition: "opacity 0.15s",
                      fontSize: 11,
                    }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); archiveEmail(email.id); }}
                        style={{
                          background: "transparent",
                          border: `1px solid ${PALETTE.border}`,
                          color: PALETTE.dimText,
                          fontFamily: MONO,
                          fontSize: 10,
                          padding: "2px 8px",
                          cursor: "pointer",
                        }}
                      >
                        archive
                      </button>
                    </span>
                  </div>
                ))}

                <div style={{
                  textAlign: "center",
                  padding: "12px 0",
                  borderTop: `1px solid ${PALETTE.border}40`,
                }}>
                  <button style={{
                    background: "transparent",
                    border: `1px solid ${PALETTE.border}`,
                    color: PALETTE.dimText,
                    fontFamily: MONO,
                    fontSize: 11,
                    padding: "6px 20px",
                    cursor: "pointer",
                  }}>
                    load more ↓ (~4KB)
                  </button>
                </div>
              </>
            ) : (
              /* ═══ INBOX ZERO BEAR ═══ */
              searchQuery ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: PALETTE.dimText }}>
                  <pre style={{ color: PALETTE.amber, fontSize: 14, margin: "0 0 12px" }}>
                    {`  ʕ;ᴥ;ʔ ?`}
                  </pre>
                  no results for "{searchQuery}"
                </div>
              ) : (
                <InboxZeroBear />
              )
            )}
          </div>
        )}

        {/* ═══ READER VIEW ═══ */}
        {view === "reader" && selectedEmail && (
          <div style={{ animation: "fadeSlideIn 0.25s ease both" }}>
            {/* Back + actions */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 4px",
              borderBottom: `1px solid ${PALETTE.border}`,
            }}>
              <button
                onClick={() => setView("inbox")}
                style={{
                  background: "transparent", border: "none",
                  color: PALETTE.amberDim, fontFamily: MONO, fontSize: 12,
                  cursor: "pointer", padding: "4px 0",
                }}
              >
                ← back
              </button>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { label: "archive", action: () => archiveEmail(selectedEmail.id) },
                  { label: "star", action: () => {} },
                  { label: "delete", action: () => archiveEmail(selectedEmail.id) },
                ].map(btn => (
                  <button key={btn.label} onClick={btn.action} style={{
                    background: "transparent",
                    border: `1px solid ${PALETTE.border}`,
                    color: PALETTE.dimText,
                    fontFamily: MONO, fontSize: 11,
                    padding: "4px 10px",
                    cursor: "pointer",
                  }}>{btn.label}</button>
                ))}
              </div>
            </div>

            {/* Email header */}
            <div style={{ padding: "16px 4px 12px" }}>
              <h2 style={{
                color: PALETTE.amber,
                fontSize: 16,
                fontWeight: 500,
                margin: "0 0 12px 0",
                textShadow: `0 0 20px ${PALETTE.amber}15`,
              }}>
                {selectedEmail.subject}
              </h2>
              <div style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                gap: "2px 12px",
                fontSize: 12,
              }}>
                <span style={{ color: PALETTE.dimText }}>from</span>
                <span style={{ color: PALETTE.midText }}>
                  {selectedEmail.name} &lt;{selectedEmail.from}&gt;
                </span>
                <span style={{ color: PALETTE.dimText }}>date</span>
                <span style={{ color: PALETTE.midText }}>
                  {selectedEmail.date}, {selectedEmail.time}
                </span>
                <span style={{ color: PALETTE.dimText }}>size</span>
                <span style={{ color: PALETTE.dimText }}>
                  ~{(selectedEmail.body.length * 0.008).toFixed(1)} KB
                </span>
              </div>
            </div>

            {/* Divider */}
            <div style={{ color: PALETTE.border, padding: "0 4px", fontSize: 11, letterSpacing: 2, overflow: "hidden", whiteSpace: "nowrap" }}>
              {"─".repeat(80)}
            </div>

            {/* Email body */}
            <div style={{
              padding: "16px 4px",
              color: PALETTE.midText,
              fontSize: 13,
              lineHeight: 1.7,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}>
              <TypewriterText text={selectedEmail.body} speed={12} />
            </div>

            {/* Reply bar */}
            <div style={{
              borderTop: `1px solid ${PALETTE.border}`,
              padding: "12px 4px",
              display: "flex", gap: 8,
            }}>
              <button onClick={startReply} style={{
                background: PALETTE.bgHighlight,
                border: `1px solid ${PALETTE.amber}60`,
                color: PALETTE.amber,
                fontFamily: MONO, fontSize: 12,
                padding: "8px 20px",
                cursor: "pointer",
              }}>
                ↩ reply
              </button>
              <button style={{
                background: "transparent",
                border: `1px solid ${PALETTE.border}`,
                color: PALETTE.dimText,
                fontFamily: MONO, fontSize: 12,
                padding: "8px 20px",
                cursor: "pointer",
              }}>
                ↪ forward
              </button>
            </div>
          </div>
        )}

        {/* ═══ COMPOSE VIEW ═══ */}
        {view === "compose" && (
          <div style={{ animation: "fadeSlideIn 0.25s ease both" }}>
            {showSent ? (
              <div style={{
                textAlign: "center", padding: "50px 0",
                animation: "fadeSlideIn 0.3s ease both",
              }}>
                <pre style={{
                  color: PALETTE.green,
                  fontSize: 14,
                  margin: "0 0 16px",
                  textShadow: `0 0 8px ${PALETTE.green}40`,
                }}>{`
    ʕᵔᴥᵔʔ  ok!
     |    |
     |sent|
                `}</pre>
                <div style={{ color: PALETTE.green, fontSize: 12 }}>
                  <TypewriterText text="message sent · ~1.2 KB transmitted" speed={25} />
                </div>
              </div>
            ) : (
              <>
                <div style={{ padding: "12px 0 0" }}>
                  {/* To field */}
                  <div style={{
                    display: "flex", alignItems: "center",
                    borderBottom: `1px solid ${PALETTE.border}40`,
                    padding: "8px 4px",
                  }}>
                    <label style={{ color: PALETTE.dimText, fontSize: 12, width: 64 }}>to:</label>
                    <input
                      type="text"
                      value={composeData.to}
                      onChange={e => setComposeData(prev => ({ ...prev, to: e.target.value }))}
                      style={{
                        flex: 1,
                        background: "transparent", border: "none",
                        color: PALETTE.midText,
                        fontFamily: MONO, fontSize: 13,
                        padding: "4px 0",
                      }}
                    />
                  </div>

                  {/* Subject field */}
                  <div style={{
                    display: "flex", alignItems: "center",
                    borderBottom: `1px solid ${PALETTE.border}40`,
                    padding: "8px 4px",
                  }}>
                    <label style={{ color: PALETTE.dimText, fontSize: 12, width: 64 }}>subject:</label>
                    <input
                      type="text"
                      value={composeData.subject}
                      onChange={e => setComposeData(prev => ({ ...prev, subject: e.target.value }))}
                      style={{
                        flex: 1,
                        background: "transparent", border: "none",
                        color: PALETTE.amber,
                        fontFamily: MONO, fontSize: 13,
                        padding: "4px 0",
                        fontWeight: 500,
                      }}
                    />
                  </div>

                  {/* Attachment hint */}
                  <div style={{
                    padding: "8px 4px",
                    borderBottom: `1px solid ${PALETTE.border}40`,
                  }}>
                    <button style={{
                      background: "transparent",
                      border: `1px dashed ${PALETTE.border}`,
                      color: PALETTE.dimText,
                      fontFamily: MONO, fontSize: 11,
                      padding: "4px 12px",
                      cursor: "pointer",
                    }}>
                      + attach file
                    </button>
                  </div>
                </div>

                {/* Body */}
                <textarea
                  value={composeData.body}
                  onChange={e => setComposeData(prev => ({ ...prev, body: e.target.value }))}
                  placeholder="write your message..."
                  style={{
                    width: "100%",
                    minHeight: 280,
                    background: "transparent",
                    border: "none",
                    color: PALETTE.midText,
                    fontFamily: MONO,
                    fontSize: 13,
                    lineHeight: 1.7,
                    padding: "16px 4px",
                    resize: "vertical",
                    boxSizing: "border-box",
                  }}
                />

                {/* Send bar */}
                <div style={{
                  borderTop: `1px solid ${PALETTE.border}`,
                  padding: "12px 4px",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <button onClick={sendEmail} style={{
                    background: PALETTE.amber,
                    border: "none",
                    color: PALETTE.bg,
                    fontFamily: MONO,
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "8px 24px",
                    cursor: "pointer",
                    letterSpacing: 0.5,
                  }}>
                    send →
                  </button>
                  <span style={{ color: PALETTE.dimText, fontSize: 11 }}>
                    estimated: ~{((composeData.body.length + composeData.subject.length + composeData.to.length) * 0.008 + 0.3).toFixed(1)} KB
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══ FOOTER / STATUS BAR ═══ */}
        <footer style={{
          borderTop: `1px solid ${PALETTE.border}`,
          padding: "10px 4px",
          marginTop: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
        }}>
          <div>
            {view === "inbox" && (
              <>
                <KeyHint keys="j/k" label="navigate" />
                <KeyHint keys="o" label="open" />
                <KeyHint keys="c" label="compose" />
              </>
            )}
            {view === "reader" && (
              <>
                <KeyHint keys="r" label="reply" />
                <KeyHint keys="e" label="archive" />
                <KeyHint keys="esc" label="back" />
              </>
            )}
            {view === "compose" && (
              <>
                <KeyHint keys="⌘↩" label="send" />
                <KeyHint keys="esc" label="discard" />
              </>
            )}
          </div>
          <span style={{ color: PALETTE.dimText, fontSize: 10 }}>
            baremail v0.1.0 · ʕ·ᴥ·ʔ · {currentTime}
          </span>
        </footer>
      </div>
    </div>
  );
}
