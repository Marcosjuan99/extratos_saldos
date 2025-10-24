"use client";

import { useEffect, useState } from "react";

type ApiResult = { [key: string]: any } | { error: string };

export default function Home() {
  const [data, setData] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Este exemplo chama nossa rota Next.js que faz o proxy da requisição no servidor.
    // Se preferir chamar a API externa diretamente a partir de um Server Component,
    // mova a lógica de fetch para um Server Component. Aqui chamamos `/api/proxy`.
    const fetchData = async () => {
      try {
  // Chama a rota proxy que injeta a API_KEY no servidor e repassa a resposta
  const res = await fetch("/api/proxy");
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setData({ error: String(err) });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-6 bg-white dark:bg-black sm:items-start">
 

        <div className="w-full max-w-2xl">
          <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">Exemplo: requisição GET com chave de API</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Este exemplo chama a rota interna <code>/api/proxy</code> que injeta a chave da API do servidor.</p>

          <section className="mt-6 rounded border bg-gray-50 p-4 dark:bg-[#0b0b0b]">
            {loading ? (
              <p>Carregando...</p>
            ) : data ? (
              <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(data, null, 2)}</pre>
            ) : (
              <p>Nenhum dado.</p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
