import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Trophy, Medal, Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Score {
  id: string;
  player_name: string;
  reps: number;
  created_at: string;
}

interface LeaderboardProps {
  refreshKey: number;
}

export function Leaderboard({ refreshKey }: LeaderboardProps) {
  const [scores, setScores] = useState<Score[] | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("scores")
        .select("id, player_name, reps, created_at")
        .order("reps", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(20);
      if (!active) return;
      if (error) {
        console.error(error);
        setScores([]);
        return;
      }
      setScores(data ?? []);
    })();
    return () => {
      active = false;
    };
  }, [refreshKey]);

  return (
    <Card className="p-6 shadow-card">
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
            const Icon =
              rank === 1 ? Trophy : rank === 2 ? Medal : rank === 3 ? Award : null;
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
                <div className={`flex w-8 items-center justify-center font-mono font-bold ${rankColor}`}>
                  {Icon ? <Icon className="h-5 w-5" /> : `#${rank}`}
                </div>
                <div className="flex-1 truncate font-semibold">{s.player_name}</div>
                <div className="font-mono text-lg font-black text-gradient-hero">
                  {s.reps}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
