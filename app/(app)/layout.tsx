// Layout protegido — el proxy ya valida la sesión antes de llegar aquí

const NAV = [
  { href: "/dashboard", label: "Inicio", icon: HomeIcon },
  { href: "/transactions", label: "Actividad", icon: ActivityIcon },
  { href: "/accounts", label: "Cuentas", icon: WalletIcon },
  { href: "/investments", label: "Inversiones", icon: ChartIcon },
];

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
      <line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  );
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const firstName = "Moises";

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--bg)", maxWidth: 430, margin: "0 auto", position: "relative" }}
    >
      {/* Main scrollable content */}
      <main className="flex-1 overflow-auto pb-24">
        {children}
      </main>

      {/* Bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 flex items-center justify-around border-t py-2 px-4"
        style={{
          background: "var(--surf)",
          borderColor: "var(--border)",
          maxWidth: 430,
          margin: "0 auto",
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
        }}
      >
        {NAV.map(({ href, label, icon: Icon }) => (
          <a
            key={href}
            href={href}
            className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-colors"
            style={{ color: "var(--muted)", minWidth: 56, textAlign: "center" }}
          >
            <Icon />
            <span className="text-[10px] font-medium">{label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
