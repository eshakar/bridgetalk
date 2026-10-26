"use client";

import { useEffect, useState } from "react";
import Aurora from "@/components/reactbits/Aurora";
import { NeuralField } from "@/components/effects/NeuralField";

const BRAND_COLORS = ["#22d3ee", "#8b5cf6", "#e879f9"];

/** Fixed, non-interactive backdrop: aurora glow, drifting particles and a faint neural grid. */
export function AmbientBackground() {
  // WebGL layers render only on the client and are skipped for reduced-motion users.
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setAnimate(!query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_75%_-10%,rgb(139_92_246/0.10),transparent_70%),radial-gradient(900px_500px_at_0%_100%,rgb(34_211_238/0.05),transparent_70%)]" />
      {animate && (
        <>
          <div className="absolute inset-x-0 top-0 h-[55vh] opacity-20 mix-blend-screen [mask-image:linear-gradient(to_bottom,#000_20%,transparent)]">
            <Aurora colorStops={BRAND_COLORS} amplitude={0.9} blend={0.5} speed={0.5} brightness={0.8} mouseInteraction={false} />
          </div>
          <div className="absolute inset-0 opacity-70">
            <NeuralField colors={BRAND_COLORS} />
          </div>
        </>
      )}
      <div className="bg-grid absolute inset-0" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgb(2_3_8/0.95)_100%)]" />
    </div>
  );
}
