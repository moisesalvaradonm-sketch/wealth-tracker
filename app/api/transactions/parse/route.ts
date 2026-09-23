import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const SYSTEM = `Eres un asistente financiero personal. Extraes datos de transacciones a partir de texto hablado o imágenes de recibos/facturas.

Responde SOLO con un JSON válido con esta estructura:
{
  "txType": "EXPENSE" | "INCOME" | "TRANSFER" | "INVESTMENT",
  "amount": number,
  "description": string,
  "categoryName": string,
  "merchant": string | null,
  "date": string,
  "notes": string | null,
  "confidence": "high" | "medium" | "low"
}

Reglas:
- txType: EXPENSE=gasto/compra/pago, INCOME=ingreso/recibí/me pagaron, TRANSFER=moví/transferí entre cuentas, INVESTMENT=invertí/compré acciones/cripto
- amount: número positivo, sin símbolo de moneda. Si hay miles con coma (1,500) conviértelo a número (1500)
- description: nombre corto del comercio o concepto (ej: "Gasolina Terpel", "Consultoría Global Partners", "Super 99")
- categoryName: en español (Alimentación, Transporte, Gasolina, Servicios, Entretenimiento, Salud, Hogar, Ropa, Suscripciones, Consultoría, Salario, Otro)
- date: YYYY-MM-DD. Hoy si no se especifica. "ayer" = día anterior. "la semana pasada" = hace 7 días
- merchant: nombre del comercio/empresa si lo hay, null si no aplica
- notes: info extra relevante (número de factura, productos, etc), null si no hay
- confidence: high si entendiste todo claramente, medium si hay alguna duda, low si falta información importante
- Solo responde el JSON, sin texto adicional ni markdown`;

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY no configurada" }, { status: 503 });
  }

  const client = new Anthropic({ apiKey });
  const today = new Date().toISOString().split("T")[0];

  let body: { type: "text" | "image"; content?: string; base64?: string; mimeType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { type } = body;

  try {
    let message;

    if (type === "text") {
      const { content } = body;
      if (!content?.trim()) {
        return NextResponse.json({ error: "Texto vacío" }, { status: 400 });
      }
      message = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        system: SYSTEM,
        messages: [{ role: "user", content: `Hoy es ${today}. El usuario dijo: "${content}"` }],
      });
    } else if (type === "image") {
      const { base64, mimeType } = body;
      if (!base64 || !mimeType) {
        return NextResponse.json({ error: "Imagen inválida" }, { status: 400 });
      }
      message = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        system: SYSTEM,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp", data: base64 } },
            { type: "text", text: `Hoy es ${today}. Analiza este recibo/factura/comprobante y extrae los datos de la transacción.` },
          ],
        }],
      });
    } else {
      return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
    }

    const raw = message.content[0].type === "text" ? message.content[0].text : "";
    // Strip markdown code fences if present
    const clean = raw.replace(/```(?:json)?\n?/g, "").trim();
    const parsed = JSON.parse(clean);

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Parse error:", err);
    return NextResponse.json({ error: "No pude entender la transacción" }, { status: 422 });
  }
}
