import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 h-full flex-col items-center justify-center gap-10 bg-gradient-to-b from-rose-50 to-amber-50 px-6 py-24 text-center font-sans dark:from-zinc-950 dark:to-zinc-900">
      <div className="flex flex-col items-center gap-4">
        <p className="text-sm uppercase tracking-[0.3em] text-rose-500/80 dark:text-rose-300/70">
          You are invited to
        </p>
        <h1 className="text-5xl font-semibold tracking-tight text-zinc-900 sm:text-6xl dark:text-zinc-50">
          Sam &amp; Sarah
        </h1>
        <p className="max-w-md text-balance text-lg text-zinc-600 dark:text-zinc-400">
          A small adventure awaits. Pick a hero, walk into the long grass, and
          see how it ends.
        </p>
      </div>

      <Link
        href="/play"
        className="rounded-full bg-zinc-900 px-8 py-3 text-base font-medium text-white shadow-sm transition hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        Play the game →
      </Link>

      <p className="text-xs text-zinc-500 dark:text-zinc-500">
        Best on mobile. Headphones recommended.
      </p>
    </main>
  );
}
