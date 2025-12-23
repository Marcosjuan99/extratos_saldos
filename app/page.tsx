"use client";

import { useState, FormEvent } from "react";

const Home = () => {
  const [enterprise, setEnterprise] = useState("maunakai");
  const [operation, setOperation] = useState("balances");
  const [bankaccount, setBankaccount] = useState("3026.000130110203");

  const [response, setResponse] = useState<any>(null);
  const [allResponses, setAllResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🔹 Lista única com pares empresa + conta
  const accountsList = [
    { enterprise: "maunakai", bankaccount: "3026.000130110203" },
    { enterprise: "duquelavenir", bankaccount: "3026.000130109777" },
    { enterprise: "baronconect", bankaccount: "1136.000130034361" },
    { enterprise: "barongbi", bankaccount: "1136.000130040256" },
    { enterprise: "vcaconstrutora", bankaccount: "1136.000130032929" },
    { enterprise: "donamirai", bankaccount: "1136.000130040287" },
    { enterprise: "amado", bankaccount: "3026.000130109399" },
    { enterprise: "vcaservicos", bankaccount: "1136.000130043345" },
    { enterprise: "baronbarreiras", bankaccount: "1136.000130037405" },
    { enterprise: "bellatorii", bankaccount: "1136.000130049523" },
    { enterprise: "castelyah", bankaccount: "3026.000130109791" },
    { enterprise: "duquedulest", bankaccount: "1136.000130040328" },
    { enterprise: "velli", bankaccount: "3026.000130111084" },
    { enterprise: "verso", bankaccount: "1136.000130041604" },
    { enterprise: "sculptor", bankaccount: "3026.000130110210" },
    { enterprise: "vilaii", bankaccount: "3026.000130111091" },
    { enterprise: "kahakailheus", bankaccount: "1136.000130044243" },
  ];

  // 🔸 Requisição individual
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch("/api/amounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enterprise, operation, bankaccount }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Something went wrong");

      setResponse(data);
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError("An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  // 🔸 Buscar todos os pares empresa+conta
  const handleFetchAll = async () => {
    setLoading(true);
    setError(null);
    setAllResponses([]);

    try {
      const requests = accountsList.map(async ({ enterprise, bankaccount }) => {
        const res = await fetch("/api/amounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            enterprise,
            operation,
            bankaccount,
          }),
        });

        const data = await res.json();
        return { enterprise, bankaccount, status: res.status, data };
      });

      const results = await Promise.all(requests);
      setAllResponses(results);
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError("Erro desconhecido ao buscar todas as requisições");
    } finally {
      setLoading(false);
    }
  };

  const handleFetchAllAndDownload = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/amounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enterprise: accountsList.map(a => a.enterprise),
          operation: 'extract',
          bankaccount: accountsList.map(a => a.bankaccount),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Something went wrong");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'amounts.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError("An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 w-full max-w-md font-mono text-sm flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-8">Chamar API</h1>

        {/* Botão para buscar todos */}
        <div className="flex w-full gap-2 mb-6">
          <button
            onClick={handleFetchAll}
            disabled={loading}
            className="flex-1 py-2 px-4 border border-blue-700 rounded-md shadow-sm text-sm font-medium text-white bg-blue-700 hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? "Carregando tudo..." : "Buscar todos (Empresas + Contas)"}
          </button>
          <button
            onClick={handleFetchAllAndDownload}
            disabled={loading}
            className="flex-1 py-2 px-4 border border-green-700 rounded-md shadow-sm text-sm font-medium text-white bg-green-700 hover:bg-green-600 disabled:opacity-50"
          >
            {loading ? "Exportando..." : "Exportar para Excel"}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="w-full">
          <div className="mb-4">
            <label htmlFor="enterprise" className="block text-sm font-medium text-gray-300">
              Enterprise
            </label>
            <input
              type="text"
              id="enterprise"
              value={enterprise}
              onChange={(e) => setEnterprise(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md shadow-sm"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="operation" className="block text-sm font-medium text-gray-300">
              Operation
            </label>
            <input
              type="text"
              id="operation"
              value={operation}
              onChange={(e) => setOperation(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md shadow-sm"
              required
            />
          </div>

          <div className="mb-6">
            <label htmlFor="bankaccount" className="block text-sm font-medium text-gray-300">
              Bank Account
            </label>
            <input
              type="text"
              id="bankaccount"
              value={bankaccount}
              onChange={(e) => setBankaccount(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md shadow-sm"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Carregando..." : "Chamar API"}
          </button>
        </form>

        {/* Mostra erros */}
        {error && (
          <div className="mt-8 w-full bg-red-900 text-red-200 p-4 rounded-md">
            <h2 className="font-bold">Erro:</h2>
            <pre className="whitespace-pre-wrap">{error}</pre>
          </div>
        )}

        {/* Mostra resposta única */}
        {response && (
          <div className="mt-8 w-full bg-gray-800 p-4 rounded-md">
            <h2 className="font-bold">Resposta única:</h2>
            <pre className="whitespace-pre-wrap">{JSON.stringify(response, null, 2)}</pre>
          </div>
        )}

        {/* Mostra todas as respostas */}
        {allResponses.length > 0 && (
          <div className="mt-8 w-full bg-gray-900 p-4 rounded-md overflow-auto max-h-96">
            <h2 className="font-bold mb-2">Respostas de todas as requisições:</h2>
            {allResponses.map((r, index) => (
              <div key={index} className="mb-4 border-b border-gray-700 pb-2">
                <h3 className="text-sm text-gray-400">
                  Empresa: {r.enterprise} — Conta: {r.bankaccount} (Status {r.status})
                </h3>
                <pre className="whitespace-pre-wrap text-sm">
                  {JSON.stringify(r.data, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default Home;
