import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SpeedGame } from "@/components/SpeedGame";
import { Leaderboard } from "@/components/Leaderboard";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "67 Speed — SixSeven Arm Speed Challenge" },
      {
        name: "description",
        content:
          "Sfida la tua velocità SixSeven: la webcam conta i cambi di braccia in 30 secondi. Classifica online, gratis, senza app.",
      },
      { property: "og:title", content: "67 Speed — SixSeven Challenge" },
      {
        property: "og:description",
        content: "Quanti cambi di braccia in 30 secondi? Sfida la classifica.",
      },
    ],
  }),
});

function Index() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <main className="min-h-screen px-4 py-8 sm:py-12">
      <Toaster position="top-center" theme="dark" />

      <header className="mx-auto mb-8 max-w-5xl text-center">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.4em] text-accent">
          67speed.com
        </p>
        <h1 className="text-5xl font-black leading-none sm:text-7xl">
          <span className="text-gradient-hero">SIX</span>
          <span className="text-foreground">·</span>
          <span className="text-gradient-hero">SEVEN</span>
        </h1>
        <p className="mt-3 text-base text-muted-foreground sm:text-lg">
          Alterna le braccia il più velocemente possibile. La webcam fa il resto.
        </p>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.4fr_1fr]">
        <SpeedGame onScoreSaved={() => setRefreshKey((k) => k + 1)} />
        <Leaderboard refreshKey={refreshKey} />
      </div>

      <footer className="mx-auto mt-12 max-w-5xl text-center text-xs text-muted-foreground">
        Tracking pose con MediaPipe · Classifica salvata su Lovable Cloud
      </footer>
    </main>
  );
}
