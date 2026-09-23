export default async function DashboardPage() {
  const displayName = "Moises";

  return (
    <div style={{ background: "var(--bg)", minHeight: "100%" }}>

      {/* ── HERO ── */}
      <div style={{
        background: "linear-gradient(160deg, #1565c0 0%, #1e88e5 45%, #42a5f5 80%, #81d4fa 100%)",
        borderRadius: "0 0 32px 32px",
        padding: "52px 24px 32px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* decorative bubbles */}
        <div style={{ position:"absolute", top:-40, right:-40, width:180, height:180, borderRadius:"50%", background:"rgba(255,255,255,0.07)" }} />
        <div style={{ position:"absolute", top:20, right:60, width:80, height:80, borderRadius:"50%", background:"rgba(255,255,255,0.05)" }} />

        {/* greeting */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{
              width:42, height:42, borderRadius:"50%",
              background:"rgba(255,255,255,0.25)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:17, fontWeight:700, color:"#fff",
            }}>
              {displayName.charAt(0)}
            </div>
            <div>
              <p style={{ color:"rgba(255,255,255,0.7)", fontSize:12, margin:0 }}>Bienvenido</p>
              <p style={{ color:"#fff", fontSize:15, fontWeight:700, margin:0 }}>Hola, {displayName}</p>
            </div>
          </div>
          <button style={{
            background:"rgba(255,255,255,0.18)", border:"none",
            borderRadius:10, padding:"6px 12px", color:"#fff",
            fontSize:12, fontWeight:600, cursor:"pointer",
          }}>
            🇺🇸 USD
          </button>
        </div>

        {/* portfolio total */}
        <div style={{ marginBottom:24 }}>
          <p style={{ color:"rgba(255,255,255,0.7)", fontSize:13, margin:"0 0 4px" }}>Mi patrimonio</p>
          <p style={{
            color:"#fff", fontSize:42, fontWeight:800,
            letterSpacing:"-1.5px", margin:"0 0 8px",
            fontFamily:"var(--font-display)",
          }}>
            $0.00
          </p>
          <span style={{
            display:"inline-flex", alignItems:"center", gap:4,
            background:"rgba(255,255,255,0.18)", borderRadius:20,
            padding:"3px 12px", color:"#fff", fontSize:13, fontWeight:600,
          }}>
            ─ Sin datos aún
          </span>
        </div>

        {/* actions */}
        <div style={{ display:"flex", gap:12 }}>
          <a href="/transactions/new" style={{
            flex:1, display:"flex", alignItems:"center", justifyContent:"center",
            gap:6, padding:"12px 0",
            background:"rgba(255,255,255,0.22)", borderRadius:14,
            color:"#fff", fontSize:14, fontWeight:700,
            textDecoration:"none",
          }}>
            + Agregar
          </a>
          <a href="/accounts" style={{
            flex:1, display:"flex", alignItems:"center", justifyContent:"center",
            gap:6, padding:"12px 0",
            background:"rgba(255,255,255,0.22)", borderRadius:14,
            color:"#fff", fontSize:14, fontWeight:700,
            textDecoration:"none",
          }}>
            🏦 Cuentas
          </a>
          <button style={{
            width:46, height:46,
            background:"rgba(255,255,255,0.22)", border:"none",
            borderRadius:14, color:"#fff", fontSize:18, cursor:"pointer",
          }}>
            •••
          </button>
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ padding:"24px 20px 0" }}>

        {/* Investment categories */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <p style={{ color:"var(--text)", fontSize:16, fontWeight:700, margin:0 }}>Mis inversiones</p>
          <a href="/investments" style={{ color:"var(--blue)", fontSize:13, textDecoration:"none" }}>Ver todo →</a>
        </div>

        <div style={{ display:"flex", gap:12, overflowX:"auto", paddingBottom:8, scrollbarWidth:"none" }}>
          {[
            { label:"Acciones", sub:"Bolsa de valores", icon:"📈" },
            { label:"Cripto", sub:"Bitcoin, ETH…", icon:"₿" },
            { label:"Inmuebles", sub:"Propiedades", icon:"🏠" },
            { label:"Fondos", sub:"ETFs, bonos", icon:"📊" },
          ].map((cat) => (
            <div key={cat.label} style={{
              minWidth:130, flexShrink:0,
              background:"var(--surf)", border:"1px solid var(--border)",
              borderRadius:20, padding:"16px 14px", cursor:"pointer",
            }}>
              <div style={{
                width:40, height:40, borderRadius:14,
                background:"var(--surf2)",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:20, marginBottom:10,
              }}>
                {cat.icon}
              </div>
              <p style={{ color:"var(--text)", fontSize:13, fontWeight:700, margin:"0 0 2px" }}>{cat.label}</p>
              <p style={{ color:"var(--muted)", fontSize:11, margin:"0 0 8px" }}>{cat.sub}</p>
              <p style={{ color:"var(--muted)", fontSize:15, fontWeight:700, margin:0 }}>$0.00</p>
            </div>
          ))}
        </div>

        {/* Setup CTA */}
        <div style={{
          marginTop:24,
          background:"var(--surf)", border:"1px solid var(--border)",
          borderRadius:22, padding:"24px 20px", textAlign:"center",
        }}>
          <p style={{ fontSize:32, margin:"0 0 8px" }}>🚀</p>
          <p style={{ color:"var(--text)", fontSize:15, fontWeight:700, margin:"0 0 6px" }}>Conecta tus cuentas</p>
          <p style={{ color:"var(--muted)", fontSize:13, margin:"0 0 18px", lineHeight:1.5 }}>
            Agrega tus bancos, wallets y broker para ver todo en un solo lugar.
          </p>
          <a href="/accounts" style={{
            display:"inline-block",
            background:"linear-gradient(135deg, #1e88e5, #42a5f5)",
            color:"#fff", borderRadius:14,
            padding:"12px 32px", fontSize:14, fontWeight:700,
            textDecoration:"none",
          }}>
            Agregar primera cuenta
          </a>
        </div>

        {/* Recent activity */}
        <div style={{ marginTop:24, marginBottom:8 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
            <p style={{ color:"var(--text)", fontSize:16, fontWeight:700, margin:0 }}>Actividad reciente</p>
            <a href="/transactions" style={{ color:"var(--blue)", fontSize:13, textDecoration:"none" }}>Ver todo →</a>
          </div>
          <div style={{
            background:"var(--surf)", border:"1px solid var(--border)",
            borderRadius:18, padding:"28px 20px", textAlign:"center",
          }}>
            <p style={{ color:"var(--muted)", fontSize:13, margin:0 }}>
              Tus movimientos aparecerán aquí
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
