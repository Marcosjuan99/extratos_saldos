import type { NextApiRequest, NextApiResponse } from "next";

// Rota simples que realiza uma requisição GET para um endpoint externo
// usando a chave definida em process.env.API_KEY.

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const API_KEY = process.env.API_KEY;
  if (!API_KEY) {
    return res.status(500).json({ error: "Missing API_KEY in environment" });
  }

  // Você pode definir a base e o path pelo .env ou editar aqui conforme precisar
  const API_BASE = process.env.API_BASE_URL || "https://santander-saldos-backend.vercel.app/api/docs";
  const API_PATH = process.env.API_PATH || "/api/amounts/{enterprise}/{bankid}/{operation}/{bankaccount}";  
  const url = `${API_BASE}${API_PATH}`;

  try {
    const r = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    const text = await r.text();
    try {
      const json = JSON.parse(text);
      res.status(r.status).json(json);
    } catch {
      // Se não for JSON devolvemos como texto
      res.status(r.status).send(text);
    }
  } catch (err: any) {
    res.status(500).json({ error: String(err?.message ?? err) });
  }
}
