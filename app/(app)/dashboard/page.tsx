export default function DashboardPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h2
          className="text-2xl font-bold tracking-tight mb-1"
          style={{ fontFamily: "var(--font-display)", color: "var(--text)" }}
        >
          Tu dinero
        </h2>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Aquí verás cuánto tienes y cómo se está moviendo.
        </p>
      </div>

      {/* Net worth placeholder */}
      <div
        className="rounded-xl p-6 mb-6 border text-center"
        style={{ background: "var(--surf)", borderColor: "var(--border)" }}
      >
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--muted)" }}>
          Lo que tienes
        </p>
        <p
          className="text-5xl font-bold tracking-tight mb-1"
          style={{ fontFamily: "var(--font-display)", color: "var(--text)" }}
        >
          $0.00
        </p>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Agrega tus cuentas para empezar a ver tus números reales
        </p>
      </div>

      {/* Empty state */}
      <div
        className="rounded-xl p-8 border text-center"
        style={{ background: "var(--surf)", borderColor: "var(--border)" }}
      >
        <p className="text-4xl mb-3">🚀</p>
        <h3 className="text-base font-semibold mb-2" style={{ color: "var(--text)" }}>
          Empieza configurando tus cuentas
        </h3>
        <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
          Agrega tus bancos, wallets de crypto e inversiones para ver en un solo lugar cuánto tienes.
        </p>
        <a
          href="/accounts"
          className="inline-block rounded-lg px-4 py-2 text-sm font-semibold"
          style={{ background: "var(--blue)", color: "#000" }}
        >
          Agregar primera cuenta
        </a>
      </div>
    </div>
  );
}
