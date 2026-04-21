import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";

const PUBLIC_SITE_URL = "https://sixsevenn.me";
const OG_IMAGE_URL = `${PUBLIC_SITE_URL}/og.svg`;

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SixSeven 67" },
      {
        name: "description",
        content:
          "Sfida la tua velocità SixSeven: la webcam conta i cambi di braccia in 30 secondi. Classifica online, gratis, senza app.",
      },
      {
        name: "keywords",
        content:
          "sixseven, six seven, six seven 67, sixseven 67, 67, sixsevenn, sixsevenn.me, sixseven me, sixseven speed, sixseven speed challenge, sixseven game, sixseven challenge, six seven challenge, 67 speed game, 67 speed, 67 counter, six seven counter, sixseven counter, counter 67, speed game, cosa significa six seven, cosa vuol dire six seven, six seven significato, significato six seven, six seven meme, canzone six seven, arm dance, arm dance challenge, arm challenge, braccia, cambio braccia, cambi di braccia, alterna le braccia, braccio destro sinistro, sfida braccia, sfida velocità, velocità, test velocità, reflex, reazione, tempo di reazione, coordinazione, fitness game, gioco fitness, gioco webcam, webcam game, camera game, mini game, 30 secondi, challenge 30 secondi, classifica, leaderboard, punteggio, record, high score, online, gratis, senza app, browser game, react game",
      },
      { name: "robots", content: "index,follow,max-image-preview:large" },
      { property: "og:title", content: "SixSeven" },
      {
        property: "og:description",
        content: "Quanti cambi di braccia in 30 secondi? Sfida la classifica.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "SixSeven" },
      { property: "og:url", content: PUBLIC_SITE_URL },
      { property: "og:image", content: OG_IMAGE_URL },
      { property: "og:image:alt", content: "SixSeven 67" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "SixSeven" },
      {
        name: "twitter:description",
        content: "Quanti cambi di braccia in 30 secondi? Sfida la classifica.",
      },
      { name: "twitter:image", content: OG_IMAGE_URL },
      { name: "twitter:image:alt", content: "SixSeven 67" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "canonical",
        href: PUBLIC_SITE_URL,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return <Outlet />;
}
