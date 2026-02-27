import { useState, useEffect, useCallback, useRef } from "react";

interface FallingItem {
  id: number;
  x: number;
  y: number;
  emoji: string;
  speed: number;
  points: number;
}

const EMOJIS = [
  { emoji: "⭐", points: 10 },
  { emoji: "💎", points: 25 },
  { emoji: "🌸", points: 15 },
  { emoji: "🍬", points: 5 },
  { emoji: "💖", points: 20 },
  { emoji: "🔥", points: -10 },
  { emoji: "💀", points: -20 },
];

const GAME_WIDTH = 100; // percentage
const BASKET_WIDTH = 14;

type GameState = "menu" | "playing" | "gameover";

const AleeshaGame = () => {
  const [gameState, setGameState] = useState<GameState>("menu");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem("aleesha-highscore");
    return saved ? parseInt(saved) : 0;
  });
  const [lives, setLives] = useState(3);
  const [basketX, setBasketX] = useState(50);
  const [items, setItems] = useState<FallingItem[]>([]);
  const [level, setLevel] = useState(1);
  const [caughtEffect, setCaughtEffect] = useState<{ x: number; points: number; id: number } | null>(null);
  const nextId = useRef(0);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const lastSpawn = useRef(0);
  const lastTime = useRef(0);

  const startGame = () => {
    setScore(0);
    setLives(3);
    setItems([]);
    setLevel(1);
    setGameState("playing");
    lastSpawn.current = 0;
    lastTime.current = 0;
    nextId.current = 0;
  };

  const spawnItem = useCallback(() => {
    const template = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    const item: FallingItem = {
      id: nextId.current++,
      x: Math.random() * (GAME_WIDTH - 8) + 4,
      y: -5,
      emoji: template.emoji,
      speed: 15 + Math.random() * 10 + level * 3,
      points: template.points,
    };
    setItems((prev) => [...prev, item]);
  }, [level]);

  // Mouse/touch movement
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!gameAreaRef.current || gameState !== "playing") return;
    const rect = gameAreaRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    setBasketX(Math.max(BASKET_WIDTH / 2, Math.min(100 - BASKET_WIDTH / 2, x)));
  }, [gameState]);

  // Game loop
  useEffect(() => {
    if (gameState !== "playing") return;

    const tick = (timestamp: number) => {
      if (!lastTime.current) lastTime.current = timestamp;
      const dt = (timestamp - lastTime.current) / 1000;
      lastTime.current = timestamp;

      // Spawn
      if (timestamp - lastSpawn.current > Math.max(400, 1200 - level * 80)) {
        spawnItem();
        lastSpawn.current = timestamp;
      }

      setItems((prev) => {
        const next: FallingItem[] = [];
        let scoreChange = 0;
        let livesLost = 0;
        let effect: typeof caughtEffect = null;

        for (const item of prev) {
          const newY = item.y + item.speed * dt;

          // Check catch
          if (newY >= 85 && newY <= 95) {
            const dist = Math.abs(item.x - basketX);
            if (dist < BASKET_WIDTH / 2 + 2) {
              scoreChange += item.points;
              effect = { x: item.x, points: item.points, id: item.id };
              continue;
            }
          }

          // Missed (fell off screen)
          if (newY > 105) {
            if (item.points > 0) livesLost += 1;
            continue;
          }

          next.push({ ...item, y: newY });
        }

        if (scoreChange !== 0) {
          setScore((s) => Math.max(0, s + scoreChange));
        }
        if (effect) setCaughtEffect(effect);
        if (livesLost > 0) {
          setLives((l) => {
            const newLives = l - livesLost;
            if (newLives <= 0) {
              setGameState("gameover");
            }
            return Math.max(0, newLives);
          });
        }

        return next;
      });

      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [gameState, basketX, spawnItem, level]);

  // Level up
  useEffect(() => {
    const newLevel = Math.floor(score / 100) + 1;
    if (newLevel !== level) setLevel(newLevel);
  }, [score, level]);

  // Save high score
  useEffect(() => {
    if (gameState === "gameover" && score > highScore) {
      setHighScore(score);
      localStorage.setItem("aleesha-highscore", score.toString());
    }
  }, [gameState, score, highScore]);

  // Clear caught effect
  useEffect(() => {
    if (caughtEffect) {
      const t = setTimeout(() => setCaughtEffect(null), 600);
      return () => clearTimeout(t);
    }
  }, [caughtEffect]);

  if (gameState === "menu") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-8">
<img 
  src="/aleesha.png" 
  alt="pic" 
  className="w-32 h-32 rounded-full object-cover animate-bounce shadow-lg mx-auto"
/>
          <h1
            className="text-7xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "hsl(var(--primary))", textShadow: "var(--glow-primary)" }}
          >
            Aleesha khan Chacho ki Doll 
          </h1>
          <p className="text-xl text-muted-foreground">Catch the stars, dodge the fire!</p>
          <button
            onClick={startGame}
            className="px-10 py-4 rounded-full text-xl font-bold bg-primary text-primary-foreground hover:scale-105 transition-transform"
            style={{ boxShadow: "var(--glow-primary)" }}
          >
            ▶ Play
          </button>
          {highScore > 0 && (
            <p className="text-accent text-lg" style={{ fontFamily: "var(--font-display)" }}>
              🏆 High Score: {highScore}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (gameState === "gameover") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-6">
          <h2 className="text-5xl font-bold" style={{ fontFamily: "var(--font-display)", color: "hsl(var(--primary))" }}>
            Game Over
          </h2>
          <p className="text-3xl text-accent" style={{ fontFamily: "var(--font-display)" }}>
            Score: {score}
          </p>
          {score >= highScore && score > 0 && (
            <p className="text-secondary text-xl animate-pulse">🎉 New High Score!</p>
          )}
          <button
            onClick={startGame}
            className="px-10 py-4 rounded-full text-xl font-bold bg-primary text-primary-foreground hover:scale-105 transition-transform"
            style={{ boxShadow: "var(--glow-primary)" }}
          >
            Play Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={gameAreaRef}
      onPointerMove={handlePointerMove}
      className="relative w-full h-screen bg-background overflow-hidden select-none cursor-none"
      style={{ touchAction: "none" }}
    >
      {/* HUD */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10 pointer-events-none">
        <div className="flex gap-1 text-2xl">
          {Array.from({ length: 3 }).map((_, i) => (
            <span key={i} className={i < lives ? "opacity-100" : "opacity-20"}>
              💖
            </span>
          ))}
        </div>
        <div
          className="text-3xl font-bold text-accent"
          style={{ fontFamily: "var(--font-display)", textShadow: "var(--glow-accent)" }}
        >
          {score}
        </div>
        <div className="text-muted-foreground text-sm" style={{ fontFamily: "var(--font-display)" }}>
          Lv.{level}
        </div>
      </div>

      {/* Falling items */}
      {items.map((item) => (
        <div
          key={item.id}
          className="absolute text-3xl transition-none pointer-events-none"
          style={{
            left: `${item.x}%`,
            top: `${item.y}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          {item.emoji}
        </div>
      ))}

      {/* Caught effect */}
      {caughtEffect && (
        <div
          className="absolute text-xl font-bold pointer-events-none animate-bounce"
          style={{
            left: `${caughtEffect.x}%`,
            top: "78%",
            transform: "translateX(-50%)",
            color: caughtEffect.points > 0 ? "hsl(var(--accent))" : "hsl(var(--destructive))",
            fontFamily: "var(--font-display)",
          }}
        >
          {caughtEffect.points > 0 ? `+${caughtEffect.points}` : caughtEffect.points}
        </div>
      )}

      {/* Basket */}
    {/* Basket / Player */}
<div
  className="absolute pointer-events-none"
  style={{
    left: `${basketX}%`,
    top: "88%",
    transform: "translate(-50%, -50%)",
    filter: "drop-shadow(0 0 12px rgba(255, 77, 141, 0.6))",
  }}
>
  <img 
    src="/basket1.png" 
    alt="player" 
    className="w-16 h-16 rounded-full  object-cover"
  />
</div>
    </div>
  );
};

export default AleeshaGame;
