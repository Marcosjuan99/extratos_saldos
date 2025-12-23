import { NextResponse } from "next/server";

// Normaliza a estrutura de extrato vinda do backend
const normalizeStatementData = (payload: any): any[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;

  if (payload.statement) {
    const inner = payload.statement;
    if (Array.isArray(inner)) return inner;
    if (inner && Array.isArray(inner._content)) return inner._content;
  }

  if (Array.isArray(payload?._content)) {
    return payload._content;
  }

  if (payload.statement && typeof payload.statement === "object") {
    return [payload.statement];
  }

  if (typeof payload === "object") {
    return [payload];
  }

  return [];
};

const supabaseBalancesUrl = process.env.SUPABASE_BALANCES_URL;
const supabaseBalancesToken = process.env.SUPABASE_BALANCES_TOKEN;

const normalizeDateParam = (raw: string | undefined): string | null => {
  if (!raw) return null;

  // dd/MM/yyyy -> yyyy-MM-dd
  const brMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) {
    const [, d, m, y] = brMatch;
    return `${y}-${m}-${d}`;
  }

  // yyyy-MM-dd (ou string contendo esse formato)
  const isoMatch = raw.match(/\d{4}-\d{2}-\d{2}/);
  if (isoMatch) return isoMatch[0];

  // Ultimo recurso: Date parseavel
  const parsed = new Date(raw);
  return isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
};

const fetchPreviousBalance = async (
  date: string | null,
  enterprise: string,
  bankaccount: string
) => {
  if (!supabaseBalancesUrl || !supabaseBalancesToken || !date) {
    return null;
  }

  try {
    const urlObj = new URL(supabaseBalancesUrl);
    urlObj.searchParams.set("date", date);
    const url = urlObj.toString();
    const headers = {
      Authorization: `Bearer ${supabaseBalancesToken}`,
      apikey: supabaseBalancesToken,
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    const response = await fetch(url, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error(
        "Failed to fetch previous balance from Supabase",
        response.status,
        response.statusText,
        url,
        errText
      );
      return null;
    }

    const text = await response.text();
    if (!text) return null;

    const json = JSON.parse(text);
    const rows = Array.isArray(json)
      ? json
      : Array.isArray(json?.data)
      ? json.data
      : [];

    const match = rows.find(
      (item: any) =>
        String(item.enterprise || "").toLowerCase() ===
          String(enterprise || "").toLowerCase() &&
        String(item.bankaccount || "") === String(bankaccount || "")
    );

    if (!match) return null;

    const rawValue = match.value;
    const numericValue = typeof rawValue === "number" ? rawValue : Number(rawValue);

    return Number.isFinite(numericValue) ? numericValue : null;
  } catch (error) {
    console.error("Error calling Supabase get-balances", error);
    return null;
  }
};

export async function POST(request: Request) {
  try {
    // Le o corpo enviado pelo frontend
    const body = await request.json();

    const {
      enterprise,
      bankaccount,
      bankid,
      operation,
      
      initialDate,
      finalDate,
      balanceDate,
    } = body;

    const token = process.env.NEXT_PUBLIC_API_KEY;
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

    if (!token || !baseUrl) {
      return NextResponse.json(
        { error: "Missing environment variables" },
        { status: 500 }
      );
    }

    // Garante que sempre vamos mandar os campos obrigatorios
    const payload = {
      bankid: bankid ?? "90400888000142",
      operation: "statements",
      bankaccount,
      initialDate,
      finalDate,
      enterprise,
      token,
    };

    // Chama o backend do Santander
    const response = await fetch(`${baseUrl}/statements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    console.log(text);

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Backend error",
          status: response.status,
          message: text,
        },
        { status: response.status }
      );
    }

    if (!text) {
      return NextResponse.json({ statement: [] }, { status: 200 });
    }

    const json = JSON.parse(text);

    const balanceDateNormalized =
      normalizeDateParam(balanceDate) ??
      normalizeDateParam(initialDate) ??
      normalizeDateParam(finalDate);

    const supabaseBalance = await fetchPreviousBalance(
      balanceDateNormalized,
      enterprise,
      bankaccount
    );

    const previousBalanceFromBackend =
      typeof json?.previousBalance === "number"
        ? json.previousBalance
        : json?.saldoAnterior;

    const previousBalance = supabaseBalance ?? previousBalanceFromBackend ?? null;

    return NextResponse.json(
      {
        statement: normalizeStatementData(json),
        previousBalance,
        previousBalanceDate: balanceDateNormalized,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in /api/statements:", error);
    return NextResponse.json(
      { error: "Internal error fetching statements" },
      { status: 500 }
    );
  }
}

// Bloqueia GET para evitar confusao
export async function GET() {
  return NextResponse.json(
    { error: "Metodo GET nao permitido. Use POST." },
    { status: 405 }
  );
}
