"use client";
import { useEffect, useState } from "react";

/**
 * Тёмный загрузочный экран с прыгающим мячом. Рендерится в начальном HTML
 * (SSR), поэтому перекрывает белую вспышку при запуске PWA, и плавно исчезает
 * после монтирования приложения. Анимация прыжка — на чистом CSS, чтобы
 * работала ещё до гидратации.
 */
export function AppSplash() {
  const [done, setDone] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fade = setTimeout(() => setFading(true), 450);
    const remove = setTimeout(() => setDone(true), 950);
    return () => {
      clearTimeout(fade);
      clearTimeout(remove);
    };
  }, []);

  if (done) return null;

  return (
    <div
      aria-hidden
      className={fading ? "splash-fade-out" : undefined}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(120% 70% at 50% 38%,rgba(198,242,78,.08),transparent 60%),#070807",
      }}
    >
      <div style={{ position: "relative", width: 92, height: 116 }}>
        <div
          style={{ position: "absolute", left: 0, right: 0, top: 4, display: "flex", justifyContent: "center", animation: "ball-bounce 1s infinite" }}
        >
          <svg viewBox="0 0 56 56" width="56" height="56" style={{ filter: "drop-shadow(0 0 16px rgba(198,242,78,.6))" }}>
            <circle cx="28" cy="28" r="26" fill="#c6f24e" />
            <path d="M6 18 Q28 32 50 18 M6 38 Q28 24 50 38" fill="none" stroke="#0a0b0a" strokeWidth="3" opacity=".5" />
          </svg>
        </div>
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: 0,
            width: 50,
            height: 8,
            marginLeft: -25,
            borderRadius: "50%",
            background: "rgba(198,242,78,.45)",
            filter: "blur(3px)",
            animation: "ball-shadow 1s infinite",
          }}
        />
      </div>
      <div
        style={{
          marginTop: 26,
          fontFamily: "var(--font-jetbrains), monospace",
          fontWeight: 700,
          letterSpacing: ".34em",
          fontSize: 14,
          color: "#c6f24e",
          paddingLeft: ".34em",
        }}
      >
        RALLY
      </div>
    </div>
  );
}
