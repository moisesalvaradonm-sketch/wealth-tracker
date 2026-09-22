"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Email o contraseña incorrectos.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-sm">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <h1
            className="text-2xl font-bold tracking-tight mb-1"
            style={{ fontFamily: "var(--font-display)", color: "var(--text)" }}
          >
            Wealth Tracker
          </h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Tu centro de control financiero
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-xl p-6 border"
          style={{ background: "var(--surf)", borderColor: "var(--border)" }}
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="text-sm font-medium"
                style={{ color: "var(--text)" }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-lg px-3 py-2.5 text-sm border outline-none transition-colors"
                style={{
                  background: "var(--surf2)",
                  borderColor: "var(--border)",
                  color: "var(--text)",
                }}
                placeholder="tu@email.com"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="text-sm font-medium"
                style={{ color: "var(--text)" }}
              >
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-lg px-3 py-2.5 text-sm border outline-none"
                style={{
                  background: "var(--surf2)",
                  borderColor: "var(--border)",
                  color: "var(--text)",
                }}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p
                className="text-sm rounded-lg px-3 py-2"
                style={{
                  color: "var(--red)",
                  background: "rgba(248,81,73,.08)",
                }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 rounded-lg py-2.5 text-sm font-semibold transition-opacity disabled:opacity-60"
              style={{ background: "var(--blue)", color: "#000" }}
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
