import { FoundationStatus } from "@/components/foundation-status";
import { publicEnv } from "@/lib/env/public";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-24 font-sans dark:bg-black">
      <main className="flex w-full max-w-lg flex-col gap-6 rounded-2xl border border-zinc-200 bg-white p-10 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
            Secure realtime chat
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Application scaffold
          </h1>
          <p className="text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            Local development URL:{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-sm dark:bg-zinc-900">
              {publicEnv.appUrl}
            </code>
          </p>
        </div>
        <FoundationStatus />
      </main>
    </div>
  );
}
