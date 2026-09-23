"use client";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type TxType = "EXPENSE" | "INCOME" | "TRANSFER" | "INVESTMENT";

interface ParsedTx {
  txType: TxType;
  amount: number;
  description: string;
  categoryName: string;
  merchant: string | null;
  date: string;
  notes: string | null;
  confidence: "high" | "medium" | "low";
}

const TYPE_META: Record<TxType, { label: string; color: string; bg: string; emoji: string }> = {
  EXPENSE:    { label: "Gasto",      color: "#f85149", bg: "rgba(248,81,73,0.15)",   emoji: "💸" },
  INCOME:     { label: "Ingreso",    color: "#3fb950", bg: "rgba(63,185,80,0.15)",   emoji: "💰" },
  TRANSFER:   { label: "Transferencia", color: "#58a6ff", bg: "rgba(88,166,255,0.15)", emoji: "↔️" },
  INVESTMENT: { label: "Inversión",  color: "#bc8cff", bg: "rgba(188,140,255,0.15)", emoji: "📈" },
};

// ─── SCREEN TYPES ────────────────────────────────────
type Screen = "home" | "voice" | "photo" | "confirm" | "saving";

export default function SmartTransactionPage() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>("home");
  const [parsed, setParsed] = useState<ParsedTx | null>(null);
  const [error, setError] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [accountId, setAccountId] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load accounts when confirmation shows
  async function loadAccounts() {
    try {
      const r = await fetch("/api/accounts");
      const data = await r.json();
      setAccounts(data);
      if (data.length > 0) setAccountId(data[0].id);
    } catch { /* ignore */ }
  }

  // ─── PARSE ────────────────────────────────────────
  async function parseText(text: string) {
    setAnalyzing(true);
    setError("");
    try {
      const res = await fetch("/api/transactions/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "text", content: text }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data: ParsedTx = await res.json();
      setParsed(data);
      await loadAccounts();
      setScreen("confirm");
    } catch {
      setError("No pude entender. Intenta de nuevo.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function parseImage(base64: string, mimeType: string) {
    setAnalyzing(true);
    setError("");
    try {
      const res = await fetch("/api/transactions/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "image", base64, mimeType }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data: ParsedTx = await res.json();
      setParsed(data);
      await loadAccounts();
      setScreen("confirm");
    } catch {
      setError("No pude leer la imagen. Intenta con otra foto.");
    } finally {
      setAnalyzing(false);
    }
  }

  // ─── VOICE ────────────────────────────────────────
  const startListening = useCallback(() => {
    const SR = (window as Window & { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition
             || (window as Window & { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
    if (!SR) {
      setError("Tu navegador no soporta reconocimiento de voz. Usa Safari en iPhone.");
      return;
    }
    const rec = new SR();
    rec.lang = "es-ES";
    rec.continuous = true;
    rec.interimResults = true;

    let finalText = "";
    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t + " ";
        else interim = t;
      }
      setTranscript((finalText + interim).trim());
    };
    rec.onerror = () => {
      setIsListening(false);
      setError("Error de micrófono. Verifica los permisos.");
    };
    rec.onend = () => setIsListening(false);

    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
    setTranscript("");
    finalText = "";
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  function handleVoiceDone() {
    stopListening();
    if (transcript.trim().length > 3) parseText(transcript.trim());
    else setError("No escuché nada. Toca el micrófono y habla.");
  }

  // ─── PHOTO ────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      // extract base64 and mimeType
      const [meta, b64] = dataUrl.split(",");
      const mimeType = meta.match(/:(.*?);/)?.[1] ?? "image/jpeg";
      setPhotoPreview(dataUrl);
      parseImage(b64, mimeType);
    };
    reader.readAsDataURL(file);
  }

  // ─── SAVE ────────────────────────────────────────
  async function handleSave() {
    if (!parsed || !accountId) return;
    setScreen("saving");
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          txType: parsed.txType,
          amount: String(parsed.amount),
          accountId,
          description: parsed.description,
          date: parsed.date,
          categoryName: parsed.categoryName,
        }),
      });
      if (res.ok) router.push("/transactions");
      else { setError("Error al guardar"); setScreen("confirm"); }
    } catch {
      setError("Error de red"); setScreen("confirm");
    }
  }

  // ─── SCREENS ─────────────────────────────────────

  if (screen === "home") return (
    <div style={{ minHeight: "100svh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--border)" }}>
        <button onPointerDown={() => router.back()} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 22, cursor: "pointer" }}>←</button>
        <h2 style={{ color: "var(--text)", fontSize: 17, fontWeight: 800, margin: 0 }}>Registro inteligente</h2>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px", gap: 16 }}>
        <p style={{ color: "var(--muted)", fontSize: 14, textAlign: "center", margin: "0 0 8px", lineHeight: 1.6 }}>
          Habla o toma una foto y la IA extrae la transacción automáticamente
        </p>

        {/* Voice button */}
        <button
          onPointerDown={() => { setError(""); setTranscript(""); setScreen("voice"); }}
          style={{
            width: "100%", padding: "28px 20px",
            background: "rgba(88,166,255,0.08)", border: "2px solid rgba(88,166,255,0.3)",
            borderRadius: 24, cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
          }}
        >
          <span style={{ fontSize: 48 }}>🎙️</span>
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "var(--blue)", fontSize: 16, fontWeight: 800, margin: "0 0 4px" }}>Registro por voz</p>
            <p style={{ color: "var(--muted)", fontSize: 12, margin: 0 }}>"Gasté $35 en gasolina en Terpel"</p>
          </div>
        </button>

        {/* Photo button */}
        <button
          onPointerDown={() => { setError(""); setPhotoPreview(null); setScreen("photo"); setTimeout(() => fileRef.current?.click(), 100); }}
          style={{
            width: "100%", padding: "28px 20px",
            background: "rgba(63,185,80,0.08)", border: "2px solid rgba(63,185,80,0.3)",
            borderRadius: 24, cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
          }}
        >
          <span style={{ fontSize: 48 }}>📸</span>
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "var(--green)", fontSize: 16, fontWeight: 800, margin: "0 0 4px" }}>Foto de recibo</p>
            <p style={{ color: "var(--muted)", fontSize: 12, margin: 0 }}>Factura, ticket, comprobante, estado de cuenta</p>
          </div>
        </button>

        <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handleFileChange} />

        <button
          onPointerDown={() => router.push("/transactions/new")}
          style={{ color: "var(--muted)", background: "none", border: "none", fontSize: 13, cursor: "pointer", marginTop: 8 }}
        >
          → Registro manual
        </button>
      </div>
    </div>
  );

  if (screen === "voice") return (
    <div style={{ minHeight: "100svh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--border)" }}>
        <button onPointerDown={() => { stopListening(); setScreen("home"); }} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 22, cursor: "pointer" }}>←</button>
        <h2 style={{ color: "var(--text)", fontSize: 17, fontWeight: 800, margin: 0 }}>Registro por voz</h2>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 28px", gap: 24 }}>
        {analyzing ? (
          <>
            <div style={{ fontSize: 56 }}>🤔</div>
            <p style={{ color: "var(--text)", fontSize: 16, fontWeight: 700, textAlign: "center", margin: 0 }}>Procesando con IA…</p>
            <p style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", margin: 0 }}>{transcript}</p>
          </>
        ) : (
          <>
            {/* Big mic button */}
            <button
              onPointerDown={isListening ? undefined : startListening}
              style={{
                width: 120, height: 120, borderRadius: "50%",
                background: isListening ? "rgba(248,81,73,0.15)" : "rgba(88,166,255,0.12)",
                border: isListening ? "3px solid #f85149" : "3px solid rgba(88,166,255,0.4)",
                cursor: "pointer", fontSize: 48,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.2s",
                animation: isListening ? "pulse 1.5s ease-in-out infinite" : "none",
              }}
            >
              🎙️
            </button>

            <div style={{ textAlign: "center" }}>
              <p style={{ color: "var(--text)", fontSize: 15, fontWeight: 700, margin: "0 0 4px" }}>
                {isListening ? "Escuchando…" : "Toca para hablar"}
              </p>
              <p style={{ color: "var(--muted)", fontSize: 12, margin: 0 }}>
                {isListening ? "Habla con naturalidad, en español" : "Di la transacción con tus propias palabras"}
              </p>
            </div>

            {/* Live transcript */}
            {transcript && (
              <div style={{
                background: "var(--surf)", border: "1px solid var(--border)",
                borderRadius: 16, padding: "14px 18px", width: "100%",
                color: "var(--text)", fontSize: 14, lineHeight: 1.5,
              }}>
                "{transcript}"
              </div>
            )}

            {error && <p style={{ color: "var(--red)", fontSize: 13, textAlign: "center" }}>{error}</p>}

            {/* Examples */}
            {!isListening && !transcript && (
              <div style={{ width: "100%" }}>
                <p style={{ color: "var(--muted)", fontSize: 11, fontWeight: 600, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 0.5 }}>Ejemplos</p>
                {[
                  '"Gasté $35 en gasolina en Terpel"',
                  '"Recibí $1,500 de Global Partners"',
                  '"Pagué $120 de electricidad ayer"',
                  '"Gasté 25 en Uber"',
                ].map((ex, i) => (
                  <p key={i} style={{ color: "var(--muted)", fontSize: 12, margin: "0 0 4px", padding: "4px 0" }}>{ex}</p>
                ))}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 12, width: "100%" }}>
              {isListening ? (
                <button
                  onPointerDown={stopListening}
                  style={{
                    flex: 1, padding: "14px 0",
                    background: "rgba(248,81,73,0.15)", border: "1px solid #f85149",
                    borderRadius: 16, color: "#f85149", fontSize: 14, fontWeight: 700, cursor: "pointer",
                  }}
                >
                  ⏹ Detener
                </button>
              ) : transcript ? (
                <button
                  onPointerDown={handleVoiceDone}
                  style={{
                    flex: 1, padding: "14px 0",
                    background: "#58a6ff", border: "none",
                    borderRadius: 16, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
                  }}
                >
                  Analizar →
                </button>
              ) : null}
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(248,81,73,0.4)} 50%{box-shadow:0 0 0 18px rgba(248,81,73,0)} }`}</style>
    </div>
  );

  if (screen === "photo") return (
    <div style={{ minHeight: "100svh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--border)" }}>
        <button onPointerDown={() => setScreen("home")} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 22, cursor: "pointer" }}>←</button>
        <h2 style={{ color: "var(--text)", fontSize: 17, fontWeight: 800, margin: 0 }}>Foto de recibo</h2>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px", gap: 20 }}>
        {analyzing ? (
          <>
            {photoPreview && (
              <div style={{ width: "100%", maxHeight: 260, overflow: "hidden", borderRadius: 20, position: "relative" }}>
                <img src={photoPreview} alt="Recibo" style={{ width: "100%", objectFit: "cover", opacity: 0.5 }} />
                <div style={{
                  position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 8,
                }}>
                  <span style={{ fontSize: 36 }}>🔍</span>
                  <p style={{ color: "#fff", fontSize: 14, fontWeight: 700, margin: 0 }}>Analizando con IA…</p>
                </div>
              </div>
            )}
            <p style={{ color: "var(--muted)", fontSize: 13, textAlign: "center" }}>
              Extrayendo monto, comercio y categoría…
            </p>
          </>
        ) : (
          <>
            <span style={{ fontSize: 72 }}>📸</span>
            <p style={{ color: "var(--text)", fontSize: 16, fontWeight: 700, textAlign: "center", margin: 0 }}>
              Toma o selecciona una foto
            </p>
            <p style={{ color: "var(--muted)", fontSize: 13, textAlign: "center", margin: 0, lineHeight: 1.6 }}>
              Factura, ticket de supermercado, recibo de restaurante, comprobante de pago…
            </p>

            {error && <p style={{ color: "var(--red)", fontSize: 13, textAlign: "center" }}>{error}</p>}

            <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
              <button
                onPointerDown={() => { if (fileRef.current) { fileRef.current.setAttribute("capture", "environment"); fileRef.current.click(); } }}
                style={{
                  width: "100%", padding: "16px", background: "#3fb950", border: "none",
                  borderRadius: 16, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer",
                }}
              >
                📷 Tomar foto
              </button>
              <button
                onPointerDown={() => { if (fileRef.current) { fileRef.current.removeAttribute("capture"); fileRef.current.click(); } }}
                style={{
                  width: "100%", padding: "16px",
                  background: "var(--surf)", border: "1px solid var(--border)",
                  borderRadius: 16, color: "var(--text)", fontSize: 15, fontWeight: 700, cursor: "pointer",
                }}
              >
                🖼️ Elegir de galería
              </button>
            </div>
          </>
        )}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
      </div>
    </div>
  );

  if (screen === "confirm" && parsed) {
    const meta = TYPE_META[parsed.txType];
    return (
      <div style={{ minHeight: "100svh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--border)" }}>
          <button onPointerDown={() => setScreen("home")} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 22, cursor: "pointer" }}>←</button>
          <h2 style={{ color: "var(--text)", fontSize: 17, fontWeight: 800, margin: 0 }}>Esto es lo que entendí</h2>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          {/* Type + amount hero */}
          <div style={{
            background: meta.bg, border: `1.5px solid ${meta.color}30`,
            borderRadius: 20, padding: "20px", marginBottom: 16,
            textAlign: "center",
          }}>
            <p style={{ fontSize: 32, margin: "0 0 4px" }}>{meta.emoji}</p>
            <p style={{ color: meta.color, fontSize: 13, fontWeight: 700, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 0.5 }}>{meta.label}</p>
            <p style={{
              color: "var(--text)", fontSize: 42, fontWeight: 800,
              letterSpacing: "-2px", margin: "0 0 4px",
              fontFamily: "var(--font-display)",
            }}>
              ${parsed.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>{parsed.description}</p>
          </div>

          {/* Details */}
          {[
            { label: "Categoría", value: parsed.categoryName },
            { label: "Comercio", value: parsed.merchant ?? "—" },
            { label: "Fecha", value: parsed.date },
            { label: "Notas", value: parsed.notes ?? "—" },
          ].map((row) => (
            <div key={row.label} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "12px 0", borderBottom: "1px solid var(--border)",
            }}>
              <span style={{ color: "var(--muted)", fontSize: 13 }}>{row.label}</span>
              <span style={{ color: "var(--text)", fontSize: 13, fontWeight: 600 }}>{row.value}</span>
            </div>
          ))}

          {/* Account selector */}
          <div style={{ padding: "12px 0", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "var(--muted)", fontSize: 13 }}>Cuenta</span>
            {accounts.length > 0 ? (
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                style={{
                  background: "var(--surf2)", border: "1px solid var(--border)",
                  borderRadius: 8, padding: "4px 8px", color: "var(--text)", fontSize: 13,
                }}
              >
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            ) : (
              <a href="/accounts" style={{ color: "var(--blue)", fontSize: 13 }}>Crea una cuenta →</a>
            )}
          </div>

          {/* Confidence badge */}
          {parsed.confidence !== "high" && (
            <div style={{
              marginTop: 14, padding: "10px 14px",
              background: "rgba(230,179,77,0.1)", border: "1px solid rgba(230,179,77,0.3)",
              borderRadius: 12,
            }}>
              <p style={{ color: "var(--amber)", fontSize: 12, margin: 0 }}>
                ⚠️ {parsed.confidence === "medium"
                  ? "Verifica los datos antes de confirmar"
                  : "Faltan datos — edita los campos necesarios"}
              </p>
            </div>
          )}

          {error && <p style={{ color: "var(--red)", fontSize: 13, margin: "12px 0 0" }}>{error}</p>}

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, marginTop: 20, paddingBottom: 20 }}>
            <button
              onPointerDown={() => setScreen("home")}
              style={{
                flex: 1, padding: "14px 0",
                background: "var(--surf)", border: "1px solid var(--border)",
                borderRadius: 16, color: "var(--muted)", fontSize: 14, fontWeight: 700, cursor: "pointer",
              }}
            >
              ✏️ Editar
            </button>
            <button
              onPointerDown={handleSave}
              disabled={!accountId}
              style={{
                flex: 2, padding: "14px 0",
                background: meta.color, border: "none",
                borderRadius: 16, color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer",
                opacity: accountId ? 1 : 0.5,
              }}
            >
              ✓ Confirmar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "saving") return (
    <div style={{
      minHeight: "100svh", background: "var(--bg)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16,
    }}>
      <span style={{ fontSize: 48 }}>💾</span>
      <p style={{ color: "var(--text)", fontSize: 16, fontWeight: 700, margin: 0 }}>Guardando transacción…</p>
    </div>
  );

  return null;
}
