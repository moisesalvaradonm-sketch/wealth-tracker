import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";

type TxType = "EXPENSE" | "INCOME" | "TRANSFER" | "INVESTMENT";

const ParseResultSchema = z.object({
  txType: z.enum(["EXPENSE", "INCOME", "TRANSFER", "INVESTMENT"]),
  amount: z.number().positive(),
  description: z.string().min(1).max(120),
  categoryName: z.string().min(1).max(80),
  merchant: z.string().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().nullable(),
  confidence: z.enum(["high", "medium", "low"]),
});

interface ParseResult {
  txType: TxType; amount: number; description: string; categoryName: string;
  merchant: string | null; date: string; notes: string | null; confidence: "high" | "medium" | "low";
}

function parseLocally(text: string, today: string): ParseResult {
  const lower = text.toLowerCase();
  let txType: TxType = "EXPENSE";
  if (/recib[íi]|ingres[óo]|me pagar|cobr[éeó]|deposit[óo]|gan[éeó]|salario|sueldo/.test(lower)) txType = "INCOME";
  else if (/invert[íi]|compr[éeó]\s*(acciones|cripto|btc|eth)|bolsa/.test(lower)) txType = "INVESTMENT";
  else if (/transfer[íi]|pas[éeó]|mov[íi]\s*(plata|dinero)|envié/.test(lower)) txType = "TRANSFER";
  const amountMatch = text.match(/\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:[.,]\d{1,2})?)/);
  let amount = 0;
  if (amountMatch) amount = parseFloat(amountMatch[1].replace(/,(?=\d{3})/g, "").replace(",", ".")) || 0;
  let date = today;
  if (/\bayer\b/.test(lower)) { const d = new Date(today); d.setDate(d.getDate() - 1); date = d.toISOString().split("T")[0]; }
  else if (/semana pasada|hace una semana/.test(lower)) { const d = new Date(today); d.setDate(d.getDate() - 7); date = d.toISOString().split("T")[0]; }
  const catRules: [RegExp, string][] = [
    [/super\s*99|riba smith|el rey|machetazo|supermercado|walmart|pricemart/, "Alimentación"],
    [/restauran|pizz|burger|kfc|mcdonald|subway|almuerzo|cena|desayuno|café/, "Restaurantes"],
    [/gasolina|combustible|terpel|delta|puma/, "Gasolina"],
    [/uber|taxi|bus|metro|didi|transporte/, "Transporte"],
    [/farmacia|doctor|clínica|hospital|salud|médico/, "Salud"],
    [/netflix|spotify|amazon prime|disney|suscripci/, "Suscripciones"],
    [/luz|agua|internet|cable onda|claro|tigo|movistar/, "Servicios"],
    [/ropa|camisa|zapato|zara|h&m/, "Ropa"],
    [/salario|sueldo|quincena|nómina/, "Salario"],
    [/consultor|honorario|proyecto|freelance/, "Consultoría"],
  ];
  let categoryName = "Otro";
  for (const [re, cat] of catRules) { if (re.test(lower)) { categoryName = cat; break; } }
  const description = text.replace(/\$?\s*\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:[.,]\d{1,2})?/g, "")
    .replace(/\b(gasté|compré|pagué|recibí|invertí|fui a|en el|en la|al|del|hoy|ayer|un|una|el|la)\b/gi, " ")
    .replace(/\s+/g, " ").trim().slice(0, 60) || categoryName;
  return { txType, amount, description, categoryName, merchant: null, date, notes: null, confidence: amount > 0 ? "medium" : "low" };
}

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
  const today = new Date().toISOString().split("T")[0];

  let body: { type: "text" | "image"; content?: string; base64?: string; mimeType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { type } = body;

  // No API key → local parsing for text, error for images
  if (!apiKey) {
    if (type === "text") {
      const { content } = body;
      if (!content?.trim()) return NextResponse.json({ error: "Texto vacío" }, { status: 400 });
      return NextResponse.json(parseLocally(content, today));
    }
    return NextResponse.json({ error: "Se necesita ANTHROPIC_API_KEY para analizar imágenes" }, { status: 503 });
  }

  const client = new Anthropic({ apiKey });
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
    const rawParsed = JSON.parse(clean);

    // Validate and sanitize with Zod
    const result = ParseResultSchema.safeParse(rawParsed);
    if (!result.success) {
      // Attempt to recover: coerce amount to number if string
      if (typeof rawParsed.amount === "string") {
        rawParsed.amount = parseFloat(rawParsed.amount.replace(/[^0-9.]/g, "")) || 0;
      }
      const retry = ParseResultSchema.safeParse(rawParsed);
      if (!retry.success) {
        return NextResponse.json({ error: "Respuesta de IA inválida, intenta de nuevo" }, { status: 422 });
      }
      return NextResponse.json(retry.data);
    }
    return NextResponse.json(result.data);
  } catch (err) {
    console.error("Parse error:", err);
    return NextResponse.json({ error: "No pude entender la transacción" }, { status: 422 });
  }
}
