import type { NextApiRequest, NextApiResponse } from "next";

// Rota dinâmica que repassa para o endpoint upstream usando a API_KEY do servidor.
// Monta o path a partir dos parâmetros de rota e encaminha query params extras.

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { enterprise, bankid, operation, bankaccount, ...rest } = req.query as Record<string, any>;

  const API_KEY = process.env.API_KEY;
  if (!API_KEY) {
    return res.status(500).json({ error: "Falta API_KEY nas variáveis de ambiente" });
  }

  const API_BASE = process.env.API_BASE_URL || "https://api.example.com";

  // Monta o caminho esperado upstream. Ajuste se o upstream usar outro formato.
  const upstreamPath = `/amounts/${encodeURIComponent(String(enterprise))}/${encodeURIComponent(
    String(bankid)
  )}/${encodeURIComponent(String(operation))}/${encodeURIComponent(String(bankaccount))}`;

  // Reconstrói query string com quaisquer parâmetros extras que vieram na requisição
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(rest)) {
    if (Array.isArray(v)) {
      v.forEach((item) => qs.append(k, String(item)));
    } else if (typeof v !== "undefined") {
      qs.append(k, String(v));
    }
  }

  const fullUrl = qs.toString() ? `${API_BASE}${upstreamPath}?${qs.toString()}` : `${API_BASE}${upstreamPath}`;

  try {
    const r = await fetch(fullUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    const text = await r.text();
    const upstreamContentType = r.headers.get("content-type") || "";

    if (upstreamContentType.includes("application/json")) {
      try {
        const json = JSON.parse(text);
        return res.status(r.status).json(json);
      } catch (e) {
        return res.status(502).json({ error: "Upstream retornou JSON inválido", status: r.status, body: text.slice(0, 2000) });
      }
    }

    // Se não for JSON, devolve um JSON estruturado com um trecho do conteúdo para depuração
    return res.status(r.status).json({ error: "Upstream retornou resposta não-JSON", status: r.status, contentType: upstreamContentType, bodySnippet: text.slice(0, 2000) });
  } catch (err: any) {
    return res.status(500).json({ error: String(err?.message ?? err) });
  }
}
