import { NextRequest, NextResponse } from "next/server";

type SupabaseBalance = {
  enterprise?: string;
  bankaccount?: string;
  balance?: number;
  saldo?: number;
  amount?: number;
  value?: number;
  date?: string;
};

const normalizeSupabasePayload = (
  payload: unknown
): SupabaseBalance[] | null => {
  if (Array.isArray(payload)) return payload as SupabaseBalance[];

  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    const nested =
      obj.data ??
      obj.balances ??
      obj.items ??
      obj.result ??
      obj.contas;

    if (Array.isArray(nested)) {
      return nested as SupabaseBalance[];
    }
  }

  return null;
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const enterprise = searchParams.get("enterprise");
    const bankaccount = searchParams.get("bankaccount");
    const dateParam = searchParams.get("date");

    const normalizeDate = (raw: string | null) => {
      if (!raw) return null;
      // dd/MM/yyyy -> yyyy-MM-dd
      const brMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (brMatch) {
        const [, d, m, y] = brMatch;
        return `${y}-${m}-${d}`;
      }
      const isoMatch = raw.match(/\d{4}-\d{2}-\d{2}/);
      return isoMatch ? isoMatch[0] : null;
    };

    const date = normalizeDate(dateParam);

    if (!enterprise || !bankaccount || !date) {
      return NextResponse.json(
        { error: "Parametros obrigatorios: enterprise, bankaccount, date" },
        { status: 400 }
      );
    }

    const supabaseToken = process.env.SUPABASE_BALANCES_TOKEN;
    const supabaseUrlFromEnv = process.env.SUPABASE_BALANCES_URL;
    const defaultUrl =
      "https://pwzyfcpgqgbtwibvbpwu.supabase.co/functions/v1/get-balances";

    if (!supabaseToken || !supabaseUrlFromEnv) {
      return NextResponse.json(
        { error: "Variaveis de ambiente do Supabase nao configuradas" },
        { status: 500 }
      );
    }

    const baseUrl = supabaseUrlFromEnv || defaultUrl;

    const callSupabase = async (targetDate: string) => {
      const url = baseUrl.includes("date=")
        ? baseUrl.replace(
            /date=[^&]+/,
            `date=${targetDate}`
          )
        : `${baseUrl}${
            baseUrl.includes("?") ? "&" : "?"
          }date=${targetDate}`;

      console.log("=== CHAMADA SUPABASE ===");
      console.log("Data EXATA solicitada:", targetDate);
      console.log("URL completa:", url);
      console.log("Token:", supabaseToken ? "Presente" : "Ausente");

      const resp = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseToken}`,
          apikey: supabaseToken,
        },
      });

      const text = await resp.text();
      let json: unknown = null;
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }

      console.log("Status da resposta Supabase:", resp.status);

      return { resp, text, json, url, targetDate };
    };

    const { resp, json: payload, text: rawBody } = await callSupabase(date);

    if (!resp.ok) {
      const errorMessage =
        (payload as Record<string, unknown> | null)?.error ??
        "Erro ao buscar saldos do Supabase";

      return NextResponse.json(
        {
          error: errorMessage,
          status: resp.status,
          date,
          body: rawBody,
        },
        { status: resp.status }
      );
    }

    const parsedData = normalizeSupabasePayload(payload);
    const effectiveDate = date;

    console.log("=== DEBUG SUPABASE ===");
    console.log("Data solicitada:", date);
    console.log("Empresa:", enterprise);
    console.log("Conta:", bankaccount);
    console.log("Tipo de resposta:", typeof payload);
    console.log("E array no topo?", Array.isArray(payload));
    console.log("Resposta normalizada e array?", Array.isArray(parsedData));
    console.log("Resposta do Supabase:", JSON.stringify(payload, null, 2));
    console.log("Data efetiva utilizada:", effectiveDate);

    if (!parsedData) {
      console.error("Resposta nao e uma lista de saldos:", payload);
      return NextResponse.json(
        {
          error: "Formato de resposta invalido do Supabase",
          receivedData: payload,
        },
        { status: 500 }
      );
    }

    // Função para normalizar datas e comparar apenas YYYY-MM-DD
    const normalizeDateOnly = (dateStr: string | undefined): string | null => {
      if (!dateStr) return null;
      // Extrai apenas YYYY-MM-DD ignorando timezone
      const match = dateStr.match(/(\d{4}-\d{2}-\d{2})/);
      return match ? match[1] : null;
    };

    // Busca o saldo pela empresa, conta E data exata (sem timezone)
    const balance = parsedData.find(
      (item) => {
        const itemDate = normalizeDateOnly(item.date);
        const matchesEnterprise = item.enterprise === enterprise;
        const matchesAccount = item.bankaccount === bankaccount;
        const matchesDate = itemDate === date;
        
        console.log(`Comparando item:`, {
          enterprise: item.enterprise,
          bankaccount: item.bankaccount,
          dateOriginal: item.date,
          dateNormalized: itemDate,
          matchesEnterprise,
          matchesAccount,
          matchesDate
        });
        
        return matchesEnterprise && matchesAccount && matchesDate;
      }
    );

    console.log("Saldo encontrado:", balance);

    if (!balance) {
      console.log("Saldo nao encontrado para:", enterprise, bankaccount, date);
      
      // Tenta buscar qualquer saldo dessa empresa/conta (fallback)
      const anyBalance = parsedData.find(
        (item) => item.enterprise === enterprise && item.bankaccount === bankaccount
      );
      
      if (anyBalance) {
        console.log("⚠️ Usando saldo de data diferente como fallback:", anyBalance);
        const balanceValue = anyBalance.value ?? anyBalance.balance ?? anyBalance.saldo ?? anyBalance.amount ?? 0;
        
        return NextResponse.json({
          balance: balanceValue,
          date: normalizeDateOnly(anyBalance.date) || date,
          enterprise: anyBalance.enterprise,
          bankaccount: anyBalance.bankaccount,
          warning: `Saldo da data ${normalizeDateOnly(anyBalance.date)} usado (data ${date} nao encontrada)`
        });
      }
      
      return NextResponse.json(
        {
          error: "Saldo nao encontrado para essa empresa e conta na data especificada",
          availableDates: parsedData
            .filter(item => item.enterprise === enterprise && item.bankaccount === bankaccount)
            .map(item => normalizeDateOnly(item.date)),
          data: payload,
          effectiveDate,
        },
        { status: 404 }
      );
    }

    const balanceValue =
      balance.balance ??
      balance.saldo ??
      balance.amount ??
      balance.value ??
      0;
    console.log("Valor do saldo retornado:", balanceValue);

    return NextResponse.json({
      balance: balanceValue,
      date: balance.date || effectiveDate,
      enterprise: balance.enterprise,
      bankaccount: balance.bankaccount,
    });
  } catch (err) {
    console.error("Erro ao buscar saldo:", err);
    return NextResponse.json(
      {
        error: "Erro ao buscar saldo",
        details:
          err instanceof Error ? err.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}