import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SpeedGame } from "@/components/SpeedGame";
import { Leaderboard } from "@/components/Leaderboard";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "SixSeven 67 | Leaderboard" },
    ],
  }),
});

function Index() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <main className="min-h-screen px-4 py-6 sm:py-12">
      <Toaster position="top-center" theme="dark" />

      <header className="mx-auto mb-8 max-w-5xl text-center">
        <h1 className="text-[clamp(2.75rem,10vw,4.5rem)] font-black leading-none">
          <span className="text-gradient-hero">SIX</span>
          <span className="text-foreground">·</span>
          <span className="text-gradient-hero">SEVEN</span>
        </h1>
        <p className="mt-3 text-pretty text-base text-muted-foreground sm:text-lg">
          Alterna le braccia il più velocemente che puoi. La webcam fa il resto.
        </p>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.4fr_1fr]">
        <SpeedGame onScoreSaved={() => setRefreshKey((k) => k + 1)} />
        <Leaderboard refreshKey={refreshKey} />
      </div>

      <footer className="mx-auto mt-12 max-w-5xl text-center text-xs text-muted-foreground">
        Sfida i tuoi amici su sixsevenn.me
      </footer>
    </main>
  );
}
