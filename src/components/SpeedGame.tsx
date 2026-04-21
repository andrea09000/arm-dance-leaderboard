import { useEffect, useRef, useState, useCallback } from "react";
import { getPoseLandmarker, LM } from "@/lib/poseDetector";
import { getSixSevenArmState, type ArmState } from "@/lib/sixSevenCounter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, SCORES_COLLECTION } from "@/integrations/firebase/client";
import { toast } from "sonner";
import { Loader2, Camera, Trophy } from "lucide-react";

const ROUND_SECONDS = 30;
type Phase = "idle" | "loading" | "ready" | "countdown" | "playing" | "done";


interface SpeedGameProps {
  onScoreSaved: () => void;
}

export function SpeedGame({ onScoreSaved }: SpeedGameProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const armStateRef = useRef<ArmState>("NONE");
  const lastCountedSideRef = useRef<ArmState>("NONE");
  const lastCountAtRef = useRef(0);
  const repsRef = useRef(0);
  const phaseRef = useRef<Phase>("idle");

  const [phase, setPhase] = useState<Phase>("idle");
  const [reps, setReps] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [countdown, setCountdown] = useState(3);
  const [playerName, setPlayerName] = useState("");
  const [saving, setSaving] = useState(false);
  const [popKey, setPopKey] = useState(0);

  const setPhaseSync = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  // Start camera + load model
  const startCamera = useCallback(async () => {
    setPhaseSync("loading");
    let stream: MediaStream | null = null;

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("BROWSER_UNSUPPORTED");
      }

      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: { ideal: "user" },
        },
        audio: false,
      });

      const video = videoRef.current;
      if (!video) throw new Error("VIDEO_NOT_READY");

      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;

      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error("VIDEO_LOAD_TIMEOUT")), 8000);
        video.onloadedmetadata = () => {
          window.clearTimeout(timeout);
          resolve();
        };
      });
      await video.play();
      await getPoseLandmarker();
      setPhaseSync("ready");
      rafRef.current = requestAnimationFrame(detectLoop);
    } catch (err) {
      stream?.getTracks().forEach((track) => track.stop());
      console.error(err);
      const name = err instanceof DOMException ? err.name : err instanceof Error ? err.message : "";
      const message =
        name === "NotAllowedError"
          ? "Permesso webcam negato: abilitalo dalle impostazioni del browser."
          : name === "NotFoundError"
            ? "Nessuna webcam trovata."
            : name === "NotReadableError"
              ? "Webcam già in uso da un'altra app."
              : "La webcam non è partita: ricarica la pagina e riprova.";
      toast.error(message);
      setPhaseSync("idle");
    }
  }, []);

  const detectLoop = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(detectLoop);
      return;
    }

    const lm = await getPoseLandmarker();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const now = performance.now();
    if (video.currentTime !== lastVideoTimeRef.current) {
      lastVideoTimeRef.current = video.currentTime;
      const result = lm.detectForVideo(video, now);

      // Mirror draw
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      ctx.restore();

      if (result.landmarks && result.landmarks[0]) {
        const pts = result.landmarks[0];
        const lWrist = pts[LM.LEFT_WRIST];
        const rWrist = pts[LM.RIGHT_WRIST];
        const lShoulder = pts[LM.LEFT_SHOULDER];
        const rShoulder = pts[LM.RIGHT_SHOULDER];

        // Draw arms (mirrored x)
        const drawDot = (x: number, y: number, color: string) => {
          ctx.beginPath();
          ctx.arc((1 - x) * canvas.width, y * canvas.height, 12, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
        };
        const drawLine = (
          x1: number, y1: number, x2: number, y2: number, color: string
        ) => {
          ctx.beginPath();
          ctx.moveTo((1 - x1) * canvas.width, y1 * canvas.height);
          ctx.lineTo((1 - x2) * canvas.width, y2 * canvas.height);
          ctx.strokeStyle = color;
          ctx.lineWidth = 6;
          ctx.stroke();
        };

        // Left arm (user's left, but appears on viewer's right after mirror)
        drawLine(lShoulder.x, lShoulder.y, lWrist.x, lWrist.y, "#ec4899");
        drawDot(lShoulder.x, lShoulder.y, "#ec4899");
        drawDot(lWrist.x, lWrist.y, "#ec4899");
        // Right arm
        drawLine(rShoulder.x, rShoulder.y, rWrist.x, rWrist.y, "#06b6d4");
        drawDot(rShoulder.x, rShoulder.y, "#06b6d4");
        drawDot(rWrist.x, rWrist.y, "#06b6d4");

        // Detect alternation only while playing
        if (phaseRef.current === "playing") {
          const current = getSixSevenArmState(pts, armStateRef.current);

          // Count as soon as a side goes UP, as long as it alternates with the
          // previously counted side. We use the last *counted* side, not the
          // last raw state, so a quick L→down→R still counts.
          if (current === "L_UP" || current === "R_UP") {
            const sinceLast = now - lastCountAtRef.current;
            if (
              current !== lastCountedSideRef.current &&
              sinceLast > 60 // ~16 reps/sec ceiling, prevents jitter double-counts
            ) {
              repsRef.current += 1;
              setReps(repsRef.current);
              setPopKey((k) => k + 1);
              lastCountedSideRef.current = current;
              lastCountAtRef.current = now;
            }
          }
          armStateRef.current = current;
        }
      }
    }

    rafRef.current = requestAnimationFrame(detectLoop);
  }, []);

  // Countdown -> playing
  const beginRound = useCallback(() => {
    repsRef.current = 0;
    setReps(0);
    armStateRef.current = "NONE";
    lastCountedSideRef.current = "NONE";
    lastCountAtRef.current = 0;
    setCountdown(3);
    setPhaseSync("countdown");

    let c = 3;
    const tick = () => {
      c -= 1;
      if (c > 0) {
        setCountdown(c);
        setTimeout(tick, 1000);
      } else {
        // GO!
        setPhaseSync("playing");
        setTimeLeft(ROUND_SECONDS);
        const startedAt = Date.now();
        const interval = setInterval(() => {
          const elapsed = (Date.now() - startedAt) / 1000;
          const left = Math.max(0, ROUND_SECONDS - elapsed);
          setTimeLeft(left);
          if (left <= 0) {
            clearInterval(interval);
            setPhaseSync("done");
          }
        }, 100);
      }
    };
    setTimeout(tick, 1000);
  }, []);

  const saveScore = async () => {
    const name = playerName.trim();
    if (!name) {
      toast.error("Inserisci un nome");
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, SCORES_COLLECTION), {
        player_name: name.slice(0, 20),
        reps: repsRef.current,
        created_at: serverTimestamp(),
      });
    } catch (error) {
      setSaving(false);
      toast.error("Errore nel salvataggio");
      console.error(error);
      return;
    }
    setSaving(false);
    if (error) {
      toast.error("Errore nel salvataggio");
      console.error(error);
      return;
    }
    toast.success("Punteggio salvato! 🏆");
    onScoreSaved();
    setPhaseSync("ready");
  };

  // cleanup
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <Card className="overflow-hidden border-2 shadow-card">
      <div className="relative aspect-[4/3] w-full bg-black">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full opacity-0"
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full object-cover"
        />

        {/* Overlay states */}
        {phase === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/90 p-6 text-center">
            <Camera className="h-16 w-16 text-primary" />
            <h2 className="text-2xl font-bold">Pronto a sfidare il SixSeven?</h2>
            <p className="max-w-md text-muted-foreground">
              Alterna le braccia su e giù il più velocemente possibile. La webcam
              conta ogni cambio. 30 secondi di pura velocità.
            </p>
            <Button size="lg" onClick={startCamera} className="bg-gradient-hero font-bold">
              Attiva webcam
            </Button>
          </div>
        )}

        {phase === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/90">
            <Loader2 className="h-12 w-12 animate-spin text-accent" />
            <p className="text-sm text-muted-foreground">Caricamento modello AI…</p>
          </div>
        )}

        {phase === "countdown" && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/30">
            <div
              key={countdown}
              className="animate-count-pop text-[12rem] font-black text-gradient-hero drop-shadow-2xl"
            >
              {countdown}
            </div>
          </div>
        )}

        {phase === "playing" && (
          <>
            <div className="absolute left-4 top-4 rounded-full bg-background/80 px-4 py-2 backdrop-blur">
              <span className="font-mono text-2xl font-bold text-accent">
                {timeLeft.toFixed(1)}s
              </span>
            </div>
            <div className="absolute right-4 top-4 rounded-full bg-background/80 px-4 py-2 backdrop-blur">
              <span
                key={popKey}
                className="inline-block animate-count-pop font-mono text-3xl font-black text-gradient-hero"
              >
                {reps}
              </span>
            </div>
          </>
        )}

        {phase === "done" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/95 p-6 text-center">
            <Trophy className="h-16 w-16 text-primary" />
            <p className="text-sm uppercase tracking-widest text-muted-foreground">
              Hai fatto
            </p>
            <p className="text-7xl font-black text-gradient-hero">{reps}</p>
            <p className="text-sm text-muted-foreground">cambi in 30 secondi</p>
            <div className="mt-2 flex w-full max-w-sm flex-col gap-2">
              <Input
                placeholder="Il tuo nome"
                maxLength={20}
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-gradient-hero font-bold"
                  onClick={saveScore}
                  disabled={saving}
                >
                  {saving ? "Salvataggio…" : "Salva in classifica"}
                </Button>
                <Button variant="secondary" onClick={beginRound}>
                  Riprova
                </Button>
              </div>
            </div>
          </div>
        )}

        {phase === "ready" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/70 p-6 text-center backdrop-blur-sm">
            <h3 className="text-2xl font-bold">Pronti?</h3>
            <p className="max-w-md text-sm text-muted-foreground">
              Mettiti davanti alla webcam, spalle e mani visibili.
            </p>
            <Button size="lg" onClick={beginRound} className="bg-gradient-hero font-bold animate-pulse-glow">
              GO!
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
