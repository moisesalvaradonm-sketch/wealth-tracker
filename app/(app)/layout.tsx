"use client";

import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard",     label: "Inicio",      icon: HomeIcon },
  { href: "/transactions",  label: "Actividad",   icon: ActivityIcon },
  { href: "/accounts",      label: "Cuentas",     icon: WalletIcon },
  { href: "/investments",   label: "Inversiones", icon: ChartIcon },
];

function HomeIcon({ active }: { active?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22" fill="none"/>
    </svg>
  );
}

function ActivityIcon({ active }: { active?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  );
}

function WalletIcon({ active }: { active?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
      <line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  );
}

function ChartIcon({ active }: { active?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div
      style={{
        background: "var(--bg)",
        minHeight: "100svh",
        maxWidth: 430,
        margin: "0 auto",
        position: "relative",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <main style={{ flex: 1, overflowY: "auto", paddingBottom: 80 }}>
        {children}
      </main>

      {/* Bottom nav */}
      <nav style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: 430,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        background: "var(--surf)",
        borderTop: "1px solid var(--border)",
        padding: "10px 8px calc(10px + env(safe-area-inset-bottom, 0px))",
        zIndex: 100,
      }}>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <a
              key={href}
              href={href}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                padding: "4px 16px",
                borderRadius: 12,
                textDecoration: "none",
                color: active ? "var(--blue)" : "var(--muted)",
                background: active ? "rgba(88,166,255,0.10)" : "transparent",
                transition: "all 0.15s",
              }}
            >
              <Icon active={active} />
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 500 }}>{label}</span>
            </a>
          );
        })}
      </nav>
    </div>
  );
}
