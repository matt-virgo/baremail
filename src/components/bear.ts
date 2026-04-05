import { h } from 'preact';
import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import htm from 'htm';

const html = htm.bind(h);

// ── Bear scene data ──

const BEAR_SCENES = [
  {
    caption: 'bear is napping. no new mail.',
    frames: [
      `           z\n          z\n  ┌──────────────┐\n  │  ʕ-ᴥ-ʔ  zzZ │\n  │ ≋≋≋≋≋≋≋≋≋≋≋≋ │\n  └──────────────┘`,
      `          z\n         z\n  ┌──────────────┐\n  │  ʕ-ᴥ-ʔ zzZ  │\n  │ ≋≋≋≋≋≋≋≋≋≋≋≋ │\n  └──────────────┘`,
      `         z  z\n          z\n  ┌──────────────┐\n  │  ʕ-ᴥ-ʔ  zzZ │\n  │ ≋≋≋≋≋≋≋≋≋≋≋≋ │\n  └──────────────┘`,
    ],
  },
  {
    caption: 'bear is fishing. inbox clear.',
    frames: [
      `     ,--,\n     |  '------,\n  ʕ·ᴥ·ʔ        |\n  /|    |\\      |\n ~~~~~~~~~~~~~~~~~~~~`,
      `     ,--,\n     |  '------,\n  ʕ·ᴥ·ʔ        |\n  /|    |\\     🐟\n ~~~~~~~~~~~~~~~~~~~~`,
      `     ,--,\n     |  '----,\n  ʕᵔᴥᵔʔ    🐟\n  /|    |\\\n ~~~~~~~~~~~~~~~~~~~~`,
    ],
  },
  {
    caption: 'bear is stargazing. zero emails.',
    frames: [
      `  *    .        *\n       *     .\n    .        *    .\n       ʕ·ᴥ·ʔ\n       /|  |\\\n  _______________`,
      `  .    *        .\n       .     *\n    *        .    *\n       ʕ·ᴥ·ʔ\n       /|  |\\\n  _______________`,
      `  *    *        .\n       *      *\n    .        *\n       ʕᵔᴥᵔʔ\n       /|  |\\\n  _______________`,
    ],
  },
  {
    caption: 'bear is dancing. inbox zero vibes.',
    frames: [
      `    ~ +\n   \\ʕ·ᴥ·ʔ/\n     |    |\n    /\\  /\\`,
      `   +  ~\n    ʕ·ᴥ·ʔ\n    /|  |\\\n     || ||`,
      `  ~ +\n   \\ʕᵔᴥᵔʔ\n     |    |\\\n    /\\  / \\`,
      `      + ~\n    ʕᵔᴥᵔʔ/\n   /|    |\n   \\ \\  /\\`,
    ],
  },
  {
    caption: 'bear found the campfire. all caught up.',
    frames: [
      `           (\n         )   (\n  ʕ·ᴥ·ʔ  ( )  )\n  |\\  /|  🔥🔥🔥\n  || || /######\\`,
      `          )\n        (   )\n  ʕ·ᴥ·ʔ   ) (\n  |\\  /| 🔥🔥🔥\n  || || /######\\`,
      `            (\n        (    )\n  ʕ·ᴥ·ʔ  )  (\n  |\\  /|  🔥🔥🔥\n  || || /######\\`,
    ],
  },
  {
    caption: 'bear is reading. nothing in the queue.',
    frames: [
      `     ʕ·ᴥ·ʔ\n     | ┌──┐ |\n     | │··│ |\n     | │··│ |\n     └─┴──┴─┘`,
      `     ʕ·ᴥ·ʔ\n     | ┌──┐ |\n     | │▓▓│ |\n     | │··│ |\n     └─┴──┴─┘`,
      `     ʕᵔᴥᵔʔ\n     | ┌──┐ |\n     | │▓▓│ |\n     | │▓▓│ |\n     └─┴──┴─┘`,
    ],
  },
  {
    caption: 'bear found honey. you found inbox zero.',
    frames: [
      `   ʕ·ᴥ·ʔ  🍯\n   |\\    /|/\n   | \\  / /\n   ||  ||`,
      `   ʕ·ᴥ·ʔ 🍯\n   |\\  | |\n   | \\ | |\n   ||  ||`,
      `   ʕᵔᴥᵔʔ 🍯\n   |      |\n   |  yum |\n   ||    ||`,
    ],
  },
  {
    caption: 'bear is cloud-watching. no emails up here.',
    frames: [
      `  ☁️         ☁️\n        ☁️\n\n       ʕ·ᴥ·ʔ\n       /|  |\\\n  ~~~~~~~~~~~~~~~~`,
      `    ☁️       ☁️\n          ☁️\n\n       ʕ·ᴥ·ʔ\n       /|  |\\\n  ~~~~~~~~~~~~~~~~`,
      `      ☁️     ☁️\n  ☁️\n\n       ʕᵔᴥᵔʔ\n       /|  |\\\n  ~~~~~~~~~~~~~~~~`,
    ],
  },
];

const BEAR_REACTIONS = [
  '( tap the bear )',
  '( bear noticed you )',
  '( bear likes you )',
  '( bear is happy )',
  '( bear loves you )',
  '( you are bear\'s favorite )',
  '( bear will remember this )',
  '( best friends forever )',
];

// ── Honey Catcher Game ──

const FIELD_W = 320;
const FIELD_H = 380;
const ITEM_SIZE = 28;
const BEAR_W = 80;
const BEAR_H = 28;
const BEAR_SPEED = 280;
const BASE_FALL = 90;

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  born: number;
}

interface GameState {
  bearX: number;
  items: Array<{ x: number; y: number; type: string; id: number }>;
  score: number;
  lives: number;
  combo: number;
  bearFace: string;
  lastSpawn: number;
  highScore: number;
  keysDown: Set<string>;
  floats: FloatingText[];
  shakeUntil: number;
}

function HoneyCatcher({ onExit }: { onExit: () => void }) {
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'over'>('ready');
  const [, setFrame] = useState(0);
  const gameRef = useRef<HTMLDivElement>(null);
  const gs = useRef<GameState>({
    bearX: (FIELD_W - BEAR_W) / 2,
    items: [],
    score: 0,
    lives: 3,
    combo: 0,
    bearFace: 'normal',
    lastSpawn: 0,
    highScore: 0,
    keysDown: new Set(),
    floats: [],
    shakeUntil: 0,
  });

  const startGame = () => {
    const s = gs.current;
    s.bearX = (FIELD_W - BEAR_W) / 2;
    s.items = [];
    s.score = 0;
    s.lives = 3;
    s.combo = 0;
    s.bearFace = 'normal';
    s.lastSpawn = 0;
    s.keysDown.clear();
    s.floats = [];
    s.shakeUntil = 0;
    setGameState('playing');
    gameRef.current?.focus();
  };

  useEffect(() => {
    if (gameState !== 'playing') return;
    const onDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'a', 'd', 'j', 'k'].includes(e.key)) {
        e.preventDefault();
        gs.current.keysDown.add(e.key);
      }
    };
    const onUp = (e: KeyboardEvent) => gs.current.keysDown.delete(e.key);
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      gs.current.keysDown.clear();
    };
  }, [gameState]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    let lastTime = 0;
    let rafId: number;

    const tick = (now: number) => {
      if (!lastTime) { lastTime = now; rafId = requestAnimationFrame(tick); return; }
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const s = gs.current;

      let bearDir = 0;
      if (s.keysDown.has('ArrowLeft') || s.keysDown.has('a') || s.keysDown.has('j')) bearDir -= 1;
      if (s.keysDown.has('ArrowRight') || s.keysDown.has('d') || s.keysDown.has('k')) bearDir += 1;
      if (bearDir) s.bearX = Math.max(0, Math.min(FIELD_W - BEAR_W, s.bearX + bearDir * BEAR_SPEED * dt));

      const fallSpeed = BASE_FALL + s.score * 2.5;
      const surviving: typeof s.items = [];
      let caughtHoney = false;
      let hitMail = false;

      for (const item of s.items) {
        item.y += fallSpeed * dt;
        const cx = item.x + ITEM_SIZE / 2;
        const cy = item.y + ITEM_SIZE / 2;
        const bearTop = FIELD_H - BEAR_H - 4;

        if (cy >= bearTop && cy < FIELD_H && cx >= s.bearX && cx <= s.bearX + BEAR_W) {
          if (item.type === 'honey') caughtHoney = true;
          else hitMail = true;
          continue;
        }
        if (item.y > FIELD_H) {
          if (item.type === 'honey') s.combo = 0;
          continue;
        }
        surviving.push(item);
      }
      s.items = surviving;

      if (caughtHoney) {
        s.combo++;
        const pts = s.combo >= 5 ? 3 : s.combo >= 3 ? 2 : 1;
        s.score += pts;
        s.bearFace = 'yum';
        const label = s.combo >= 3 ? `+${pts} ${s.combo}x!` : `+${pts}`;
        s.floats.push({ id: now, x: s.bearX + BEAR_W / 2, y: FIELD_H - BEAR_H - 10, text: label, color: 'var(--amber)', born: now });
        setTimeout(() => { s.bearFace = 'normal'; }, 250);
      }
      if (hitMail) {
        s.combo = 0;
        s.lives--;
        s.bearFace = 'hit';
        s.shakeUntil = now + 400;
        s.floats.push({ id: now + 0.1, x: s.bearX + BEAR_W / 2, y: FIELD_H - BEAR_H - 10, text: '-1 ♥', color: 'var(--red)', born: now });
        setTimeout(() => { s.bearFace = 'normal'; }, 400);
        if (s.lives <= 0) {
          s.highScore = Math.max(s.highScore, s.score);
          setGameState('over');
          return;
        }
      }

      s.floats = s.floats.filter(f => now - f.born < 800);

      const spawnInterval = Math.max(350, 900 - s.score * 12);
      if (now - s.lastSpawn > spawnInterval) {
        s.lastSpawn = now;
        s.items.push({
          x: Math.random() * (FIELD_W - ITEM_SIZE),
          y: -ITEM_SIZE,
          type: Math.random() < 0.65 ? 'honey' : 'spam',
          id: now + Math.random(),
        });
      }

      setFrame(n => n + 1);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [gameState]);

  const handleTap = (e: MouseEvent) => {
    if (gameState !== 'playing') return;
    const rect = gameRef.current?.getBoundingClientRect();
    if (!rect) return;
    const tapX = e.clientX - rect.left;
    const s = gs.current;
    const targetX = tapX - BEAR_W / 2;
    s.bearX = Math.max(0, Math.min(FIELD_W - BEAR_W, targetX));
  };

  const s = gs.current;
  const now = performance.now();
  const isShaking = now < s.shakeUntil;
  const shakeX = isShaking ? Math.sin(now * 0.05) * 4 : 0;

  let face: string;
  if (s.bearFace === 'hit') face = 'ʕ>ᴥ<ʔ';
  else if (s.bearFace === 'yum') face = 'ʕᵔᴥᵔʔ';
  else if (s.score >= 50) face = 'ʕ♥ᴥ♥ʔ';
  else if (s.score >= 30) face = 'ʕ★ᴥ★ʔ';
  else if (s.score >= 15) face = 'ʕᵔᴥᵔʔ';
  else face = 'ʕ·ᴥ·ʔ';

  const livesDisplay = '♥'.repeat(Math.max(0, s.lives)) + '♡'.repeat(Math.max(0, 3 - s.lives));

  if (gameState === 'ready') {
    return html`
      <div style="text-align: center; padding: 20px 0;" class="fade-in">
        <div style="color: var(--amber); font-size: 15px; font-weight: 600; text-shadow: 0 0 10px var(--amber-glow);">
          🍯 HONEY CATCHER 🍯
        </div>
        <div style="margin: 16px auto; max-width: 200px; display: flex; flex-direction: column; gap: 6px; color: var(--dim-text); font-size: 12px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 18px;">🍯</span>
            <span>catch honey · +1 point</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 18px;">📧</span>
            <span>dodge mail · -1 life</span>
          </div>
        </div>
        <pre style="color: var(--amber); font-size: 14px; line-height: 1.3; margin: 12px 0; display: inline-block;">
   ʕ·ᴥ·ʔ</pre>
        <div style="color: var(--dim-text); font-size: 11px;">
          keyboard: a/d or ←/→ · mobile: tap to move
        </div>
        ${s.highScore > 0 && html`
          <div style="color: var(--amber-dim); font-size: 11px; margin-top: 6px;">
            high score: ${s.highScore}
          </div>
        `}
        <div style="margin-top: 16px; display: flex; gap: 10px; justify-content: center;">
          <button class="btn btn-primary" onClick=${startGame}>start game</button>
          <button class="btn btn-secondary" onClick=${onExit}>back</button>
        </div>
      </div>
    `;
  }

  if (gameState === 'over') {
    const endings = [
      {
        min: 0,
        art: `     ʕ;ᴥ;ʔ\n      |    |\n      ||  ||`,
        msg: 'bear tried their best.',
        color: 'var(--red)',
      },
      {
        min: 26,
        art: `      ʕ·ᴥ·ʔ\n      |    |\n      || ||`,
        msg: 'not bad for airplane wifi.',
        color: 'var(--amber-dim)',
      },
      {
        min: 51,
        art: `    ʕᵔᴥᵔʔ  ~\n     \\|  |/\n      || ||`,
        msg: 'bear is warming up!',
        color: 'var(--amber)',
      },
      {
        min: 76,
        art: `   ★  ʕᵔᴥᵔʔ  ★\n       \\|  |/\n    ★   || ||   ★`,
        msg: 'certified honey hunter.',
        color: 'var(--amber)',
      },
      {
        min: 101,
        art: `  ★  ·  ★  ·  ★\n    \\ʕ★ᴥ★ʔ/\n     |    |\n     /\\  /\\`,
        msg: 'bear is DANCING!',
        color: 'var(--amber)',
      },
      {
        min: 126,
        art: `    ◆ ◆ ◆ ◆ ◆\n  ◆  ʕ♥ᴥ♥ʔ  ◆\n  ◆  /|  |\\  ◆\n    ◆ ◆ ◆ ◆ ◆`,
        msg: 'swimming in honey.',
        color: 'var(--amber)',
      },
      {
        min: 151,
        art: ` ★ ★ ★ ★ ★ ★ ★\n ★   ʕ♥ᴥ♥ʔ   ★\n ★  \\|◆◆◆◆|/  ★\n ★   || ||    ★\n ★ ★ ★ ★ ★ ★ ★`,
        msg: 'legendary honey emperor.',
        color: 'var(--amber)',
      },
      {
        min: 176,
        art: `    ╔═══════╗\n    ║ ♥   ♥ ║\n    ╚═══════╝\n    ʕ♥ᴥ♥ʔ\n ◆◆ /|  |\\ ◆◆\n◆◆◆ || || ◆◆◆\n ◆◆◆◆◆◆◆◆◆◆`,
        msg: 'the honey king is crowned.',
        color: 'var(--amber)',
      },
      {
        min: 201,
        art: `  ·  ★  ·  ★  ·\n ★  ╔═══════╗  ★\n ·  ║ ♥ ♥ ♥ ║  ·\n ★  ╚═══════╝  ★\n  · \\ʕ♥ᴥ♥ʔ/ ·\n ★   |◆◆◆◆|  ★\n  ·   |◆◆|   ·\n ★  /  ||  \\  ★\n  ·  ★  ·  ★  ·`,
        msg: 'you have ascended. bear is eternal.',
        color: 'var(--amber)',
      },
    ];

    const ending = [...endings].reverse().find(e => s.score >= e.min)!;

    return html`
      <div style="text-align: center; padding: 30px 0;" class="fade-in">
        <pre style="color: var(--red); font-size: 13px; line-height: 1.3; margin: 0; display: inline-block;">${`
   ╔═══════════════════╗
   ║    GAME  OVER     ║
   ╚═══════════════════╝`}</pre>
        <pre style="color: ${ending.color}; font-size: 14px; line-height: 1.3; margin: 16px 0; display: inline-block; text-shadow: 0 0 8px ${ending.color};">${ending.art}</pre>
        <div style="color: var(--amber); font-size: 20px; font-weight: 600; margin-top: 8px; text-shadow: 0 0 10px var(--amber-glow);">${s.score}</div>
        <div style="color: var(--dim-text); font-size: 11px; margin-top: 4px;">
          ${s.score === s.highScore && s.score > 0 ? '★ new high score! ★' : `high score: ${s.highScore}`}
        </div>
        <div style="color: var(--amber-dim); font-size: 12px; margin-top: 10px; font-style: italic;">${ending.msg}</div>
        <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center;">
          <button class="btn btn-primary" onClick=${startGame}>play again</button>
          <button class="btn btn-secondary" onClick=${onExit}>back to bear</button>
        </div>
      </div>
    `;
  }

  return html`
    <div
      ref=${gameRef}
      tabIndex=${0}
      onClick=${handleTap}
      style="text-align: center; padding: 12px 0; outline: none; user-select: none; -webkit-user-select: none; touch-action: manipulation; cursor: pointer;"
    >
      <div style="display: flex; justify-content: space-between; align-items: center; max-width: ${FIELD_W}px; margin: 0 auto 8px;">
        <span style="color: var(--amber); font-size: 13px;">score: ${s.score}</span>
        ${s.showCombo && html`
          <span style="color: var(--amber-bright); font-size: 12px; font-weight: 600; animation: floatUp 0.6s ease-out forwards;">
            ${s.combo}x combo!
          </span>
        `}
        <span style="color: ${s.lives <= 1 ? 'var(--red)' : 'var(--amber)'}; font-size: 13px;">
          ${livesDisplay}
        </span>
      </div>
      <div style="position: relative; display: inline-block; width: ${FIELD_W}px; height: ${FIELD_H}px; overflow: hidden; transform: translateX(${shakeX}px);">
        ${s.items.map(item => html`
          <div
            key=${item.id}
            style="position: absolute; left: ${item.x}px; top: ${item.y}px; width: ${ITEM_SIZE}px; height: ${ITEM_SIZE}px; display: flex; align-items: center; justify-content: center; font-size: 22px;"
          >${item.type === 'honey' ? '🍯' : '📧'}</div>
        `)}
        ${s.floats.map(f => {
          const age = (now - f.born) / 800;
          const opacity = 1 - age;
          const rise = age * 40;
          return html`
            <div
              key=${f.id}
              style="position: absolute; left: ${f.x}px; top: ${f.y - rise}px; transform: translateX(-50%); color: ${f.color}; font-size: 14px; font-weight: 700; opacity: ${opacity}; pointer-events: none; text-shadow: 0 0 6px ${f.color};"
            >${f.text}</div>
          `;
        })}
        <div style="position: absolute; left: ${s.bearX}px; bottom: 4px; width: ${BEAR_W}px; height: ${BEAR_H}px; display: flex; align-items: center; justify-content: center; font-size: 20px; color: ${s.bearFace === 'hit' ? 'var(--red)' : 'var(--amber)'};">
          ${face}
        </div>
        <div style="position: absolute; bottom: 0; left: 0; right: 0; border-bottom: 1px dashed var(--border);" />
      </div>
      <div style="margin-top: 8px; color: var(--border); font-size: 10px;">
        ← tap left · tap right →
      </div>
    </div>
  `;
}

// ── Inbox Zero Bear ──

export function InboxZeroBear() {
  const [sceneIndex, setSceneIndex] = useState(() => Math.floor(Math.random() * BEAR_SCENES.length));
  const [frameIndex, setFrameIndex] = useState(0);
  const [showScene, setShowScene] = useState(false);
  const [pats, setPats] = useState(0);
  const [hearts, setHearts] = useState<Array<{ id: number; xOffset: number; symbol: string }>>([]);
  const [wiggle, setWiggle] = useState(false);
  const [showGame, setShowGame] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowScene(true), 300);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (showGame) return;
    const scene = BEAR_SCENES[sceneIndex];
    const interval = setInterval(() => {
      setFrameIndex(f => (f + 1) % scene.frames.length);
    }, 900);
    return () => clearInterval(interval);
  }, [sceneIndex, showGame]);

  useEffect(() => { setFrameIndex(0); }, [sceneIndex]);

  const handlePat = () => {
    const newPats = pats + 1;
    setPats(newPats);
    setWiggle(true);
    setTimeout(() => setWiggle(false), 400);

    const id = Date.now();
    const xOffset = Math.random() * 60 - 30;
    const symbol = ['♥', '❤', '♡', '✦', '⋆'][Math.floor(Math.random() * 5)];
    setHearts(prev => [...prev, { id, xOffset, symbol }]);
    setTimeout(() => setHearts(prev => prev.filter(h => h.id !== id)), 1000);

    if (newPats > 0 && newPats % 3 === 0) {
      setSceneIndex(i => (i + 1) % BEAR_SCENES.length);
    }
  };

  const scene = BEAR_SCENES[sceneIndex];
  const reaction = BEAR_REACTIONS[Math.min(pats, BEAR_REACTIONS.length - 1)];

  if (showGame) {
    return html`<${HoneyCatcher} onExit=${() => setShowGame(false)} />`;
  }

  return html`
    <div
      class="bear-container"
      style="opacity: ${showScene ? 1 : 0}; ${showScene ? 'animation: fadeSlideIn 0.6s ease both;' : ''}"
    >
      <div class="bear-art" onClick=${handlePat}>
        <pre class=${wiggle ? 'wiggle' : ''}>
${scene.frames[frameIndex]}</pre>
        ${hearts.map(h => html`
          <div
            key=${h.id}
            class="bear-heart"
            style="left: calc(50% + ${h.xOffset}px);"
          >${h.symbol}</div>
        `)}
      </div>

      <p class="bear-caption">${scene.caption}</p>
      <p class="bear-reaction">${reaction}</p>

      <div style="margin-top: 16px; display: flex; flex-direction: column; align-items: center; gap: 14px;">
        <button
          class="btn"
          style="background: transparent; border: 1px dashed var(--amber-dim); color: var(--amber-dim); font-size: 11px; padding: 6px 16px;"
          onClick=${(e: Event) => { e.stopPropagation(); setShowGame(true); }}
        >🍯 play honey catcher</button>

        <div class="bear-scene-dots">
          ${BEAR_SCENES.map((_, i) => html`
            <div
              key=${i}
              class="bear-scene-dot ${i === sceneIndex ? 'active' : ''}"
              onClick=${(e: Event) => { e.stopPropagation(); setSceneIndex(i); }}
            />
          `)}
        </div>
      </div>
    </div>
  `;
}
