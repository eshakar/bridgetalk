import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="panel mx-auto mt-10 max-w-md p-8 text-center">
      <Compass className="mx-auto size-6 text-ink-400" aria-hidden />
      <h2 className="mt-3 text-base font-semibold text-ink-50">Page not found</h2>
      <p className="mt-1 text-sm text-ink-400">This page doesn&apos;t exist in BridgeTalk.</p>
      <Link
        href="/"
        className="focus-ring mt-5 inline-flex h-9 items-center rounded-lg bg-accent-500 px-3.5 text-sm font-medium text-white hover:bg-accent-400"
      >
        Back to overview
      </Link>
    </div>
  );
}
