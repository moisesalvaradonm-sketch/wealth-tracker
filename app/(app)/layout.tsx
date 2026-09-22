import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg)" }}>
      {/* Sidebar */}
      <aside
        className="w-56 flex-shrink-0 flex flex-col border-r px-3 py-4 gap-1"
        style={{ background: "var(--surf)", borderColor: "var(--border)" }}
      >
        <div className="px-2 pb-4 mb-2 border-b" style={{ borderColor: "var(--border)" }}>
          <h1
            className="text-base font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--text)" }}
          >
            Wealth Tracker
          </h1>
        </div>

        <nav className="flex flex-col gap-0.5">
          {[
            { href: "/dashboard", label: "Inicio", icon: "◉" },
            { href: "/transactions", label: "Transacciones", icon: "↕" },
            { href: "/accounts", label: "Cuentas", icon: "🏦" },
            { href: "/investments", label: "Inversiones", icon: "📈" },
            { href: "/money-flow", label: "Flujo de dinero", icon: "→" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-white/5"
              style={{ color: "var(--text)" }}
            >
              <span className="text-xs w-4 text-center" style={{ color: "var(--muted)" }}>
                {item.icon}
              </span>
              {item.label}
            </a>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
