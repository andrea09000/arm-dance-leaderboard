import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Trophy, Medal, Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { db, SCORES_COLLECTION } from "@/integrations/firebase/client";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";

interface Score {
  id: string;
  player_name: string;
  reps: number;
}

interface LeaderboardProps {
  refreshKey: number;
}

export function Leaderboard({ refreshKey }: LeaderboardProps) {
  const [scores, setScores] = useState<Score[] | null>(null);

  useEffect(() => {
    setScores(null);
    const q = query(
      collection(db, SCORES_COLLECTION),
      orderBy("reps", "desc"),
      limit(50),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => {
          const data = d.data() as Partial<Score> & {
            created_at_ms?: unknown;
            created_at?: unknown;
          };
          return {
            id: d.id,
            player_name: typeof data.player_name === "string" && data.player_name.trim() ? data.player_name : "—",
            reps: typeof data.reps === "number" ? data.reps : 0,
            created_at_ms: typeof data.created_at_ms === "number" ? data.created_at_ms : null,
          };
        });

        rows.sort((a, b) => {
          if (b.reps !== a.reps) return b.reps - a.reps;
          const am = a.created_at_ms ?? Number.MAX_SAFE_INTEGER;
          const bm = b.created_at_ms ?? Number.MAX_SAFE_INTEGER;
          return am - bm;
        });

        setScores(rows.slice(0, 20));
      },
      (err) => {
        console.error("Errore classifica Firestore:", err);
        setScores([]);
      },
    );

    return () => {
      unsub();
    };
  }, [refreshKey]);

  return (
    <Card className="p-4 shadow-card sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Trophy className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Classifica Top 20</h2>
      </div>

      {scores === null && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {scores && scores.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Nessun punteggio ancora. Sii il primo! 🚀
        </p>
      )}

      {scores && scores.length > 0 && (
        <ol className="space-y-2">
          {scores.map((s, i) => {
            const rank = i + 1;
            const Icon = rank === 1 ? Trophy : rank === 2 ? Medal : rank === 3 ? Award : null;
            const rankColor =
              rank === 1
                ? "text-primary"
                : rank === 2
                  ? "text-accent"
                  : rank === 3
                    ? "text-primary/70"
                    : "text-muted-foreground";
            return (
              <li
                key={s.id}
                className="flex items-center gap-3 rounded-lg border bg-secondary/40 px-3 py-2 transition-colors hover:bg-secondary/70"
              >
                <div
                  className={`flex w-8 items-center justify-center font-mono font-bold ${rankColor}`}
                >
                  {Icon ? <Icon className="h-5 w-5" /> : `#${rank}`}
                </div>
                <div className="min-w-0 flex-1 truncate font-semibold">{s.player_name}</div>
                <div className="font-mono text-lg font-black text-gradient-hero">{s.reps}</div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
