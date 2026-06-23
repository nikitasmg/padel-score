import { StatusBar } from "./StatusBar";

export function PhoneScreen({
  children,
  hero = false,
  statusBar = true,
}: {
  children: React.ReactNode;
  hero?: boolean;
  statusBar?: boolean;
}) {
  const bg = hero
    ? "radial-gradient(120% 60% at 50% -5%,rgba(198,242,78,.12),transparent 55%),#0a0b0a"
    : "radial-gradient(130% 70% at 50% -5%,rgba(198,242,78,.10),transparent 55%),#0a0b0a";
  return (
    <div
      className="relative min-h-screen w-full overflow-hidden"
      style={{ background: bg }}
    >
      <div className="absolute top-[11px] left-1/2 -translate-x-1/2 w-[108px] h-[31px] bg-black rounded-[20px] z-10" />
      {statusBar && <StatusBar />}
      {children}
    </div>
  );
}
