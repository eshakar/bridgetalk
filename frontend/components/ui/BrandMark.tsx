"use client";

import { useId, useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

/** BridgeTalk logo: two speakers joined by a bridge arc, with a GSAP "signal" animation. */
export function BrandMark({ className = "size-8" }: { className?: string }) {
  const root = useRef<SVGSVGElement>(null);
  const gradientId = useId();

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.fromTo(".bt-arc", { strokeDashoffset: 40 }, { strokeDashoffset: 0, duration: 1.2, ease: "power2.out" });
      gsap.to(".bt-dot", { scale: 1.25, transformOrigin: "50% 50%", duration: 0.9, yoyo: true, repeat: -1, stagger: 0.45, ease: "sine.inOut" });
      gsap.to(".bt-pillar", { opacity: 0.25, duration: 0.6, yoyo: true, repeat: -1, stagger: 0.2, ease: "sine.inOut" });
    },
    { scope: root },
  );

  return (
    <svg ref={root} viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#22d3ee" />
          <stop offset=".5" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#e879f9" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${gradientId})`} />
      <path className="bt-arc" d="M7 20.5c2.2-6.4 15.8-6.4 18 0" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="40" />
      <path className="bt-pillar" d="M11 20v3.5" stroke="#fff" strokeOpacity=".75" strokeWidth="1.8" strokeLinecap="round" />
      <path className="bt-pillar" d="M16 17.4v6.1" stroke="#fff" strokeOpacity=".75" strokeWidth="1.8" strokeLinecap="round" />
      <path className="bt-pillar" d="M21 20v3.5" stroke="#fff" strokeOpacity=".75" strokeWidth="1.8" strokeLinecap="round" />
      <circle className="bt-dot" cx="9.5" cy="10.5" r="2.5" fill="#fff" />
      <circle className="bt-dot" cx="22.5" cy="10.5" r="2.5" fill="#fff" fillOpacity=".8" />
    </svg>
  );
}
