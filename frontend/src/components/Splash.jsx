import { useEffect, useState } from "react";

/**
 * Splash shown on app startup. Plays a short fade-out animation.
 * Cream background matches the logo so it feels like a single seamless brand moment.
 */
export default function Splash({ onDone }) {
  const [hide, setHide] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setHide(true), 1700);
    const t2 = setTimeout(() => onDone && onDone(), 2200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);

  return (
    <div
      data-testid="splash-screen"
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-500 ${
        hide ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{ background: "#ede7c7" }}
    >
      <div className="splash-logo-wrap">
        <img
          src="/daddys-logo.png"
          alt="DADDY's Bakery"
          className="splash-logo"
          draggable="false"
        />
      </div>
      <div className="mt-6 splash-tagline label-eyebrow">
        Baked with Love, Made for You
      </div>
      <style>{`
        @keyframes splashFloat {
          0%   { opacity: 0; transform: scale(0.92) translateY(8px); }
          60%  { opacity: 1; transform: scale(1.02) translateY(0); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes splashTagline {
          0%   { opacity: 0; transform: translateY(6px); letter-spacing: 0.05em; }
          100% { opacity: 1; transform: translateY(0); letter-spacing: 0.18em; }
        }
        .splash-logo-wrap {
          width: min(80vw, 380px);
          aspect-ratio: 1 / 1;
          animation: splashFloat 900ms cubic-bezier(.2,.7,.2,1) both;
        }
        .splash-logo {
          width: 100%;
          height: 100%;
          object-fit: contain;
          filter: drop-shadow(0 18px 40px rgba(139,0,0,0.18));
        }
        .splash-tagline {
          animation: splashTagline 1100ms 250ms cubic-bezier(.2,.7,.2,1) both;
        }
      `}</style>
    </div>
  );
}
