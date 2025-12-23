"use client";

import { useState, FormEvent } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const Home = () => {
  const [enterprise, setEnterprise] = useState("maunakai");
  const [operation, setOperation] = useState("balances");
  const [bankaccount, setBankaccount] = useState("3026.000130110203");

  const [response, setResponse] = useState<any>(null);
  const [allResponses, setAllResponses] = useState<any[]>([]);
  const [statements, setStatements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );

  const accountsList = [
    { enterprise: "baronconect", bankaccount: "1136.000130034361" },
    { enterprise: "vcaconstrutora", bankaccount: "1136.000130032929" },
    { enterprise: "vcaservicos", bankaccount: "1136.000130043345" },
    { enterprise: "baronbarreiras", bankaccount: "1136.000130037405" },
    { enterprise: "barongbi", bankaccount: "1136.000130040256" },
    { enterprise: "donamirai", bankaccount: "1136.000130040287" },
    { enterprise: "duquedulest", bankaccount: "1136.000130040328" },
    { enterprise: "verso", bankaccount: "1136.000130041604" },
    { enterprise: "kahakailheus", bankaccount: "1136.000130044243" },
    { enterprise: "amado", bankaccount: "3026.000130109399" },
    { enterprise: "duquelavenir", bankaccount: "3026.000130109777" },
    { enterprise: "castelyah", bankaccount: "3026.000130109791" },
    { enterprise: "maunakai", bankaccount: "3026.000130110203" },
    { enterprise: "sculptor", bankaccount: "3026.000130110210" },
    { enterprise: "velli", bankaccount: "3026.000130111084" },
    { enterprise: "vilaii", bankaccount: "3026.000130111091" },
    { enterprise: "bellatorii", bankaccount: "1136.000130049523" },
  ];

  const handleEnterpriseSelection = (selectedEnterprise: string) => {
    setEnterprise(selectedEnterprise);
    const selected = accountsList.find(
      (item) => item.enterprise === selectedEnterprise
    );
    if (selected) {
      setBankaccount(selected.bankaccount);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch(
        `/api/amounts?enterprise=${enterprise}&operation=${operation}&bankaccount=${bankaccount}`
      );

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Algo deu errado");

      setResponse(data);
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError("Ocorreu um erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  const handleFetchAll = async () => {
    setLoading(true);
    setError(null);
    setAllResponses([]);

    try {
      const enterpriseParam = accountsList.map((a) => a.enterprise).join(",");
      const bankaccountParam = accountsList.map((a) => a.bankaccount).join(",");

      const res = await fetch(
        `/api/amounts?operation=${operation}&enterprise=${enterpriseParam}&bankaccount=${bankaccountParam}`
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error || "Algo deu errado ao buscar todas as contas"
        );
      }

      // Processar resultados com status individual
      const processedResults = data.map((item: any) => ({
        enterprise: item.enterprise,
        bankaccount: item.bankaccount,
        success: item.success !== false,
        error: item.error || null,
        status: res.status,
        data: item.data || item,
      }));

      setAllResponses(processedResults);
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
    setAllResponses([]);

    try {
      const enterpriseParam = accountsList.map((a) => a.enterprise).join(",");
      const bankaccountParam = accountsList.map((a) => a.bankaccount).join(",");

      // Primeiro busca os dados para verificar status
      const statusRes = await fetch(
        `/api/amounts?operation=${operation}&enterprise=${enterpriseParam}&bankaccount=${bankaccountParam}`
      );

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        const processedResults = statusData.map((item: any) => ({
          enterprise: item.enterprise,
          bankaccount: item.bankaccount,
          success: item.success !== false,
          error: item.error || null,
          status: statusRes.status,
          data: item.data || item,
        }));
        setAllResponses(processedResults);
      }

      // Depois faz o download do CSV
      const res = await fetch(
        `/api/amounts?operation=extract&enterprise=${enterpriseParam}&bankaccount=${bankaccountParam}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Algo deu errado");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "amounts.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError("Ocorreu um erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  const handleFetchStatements = async () => {
    setLoading(true);
    setError(null);
    setStatements([]);

    try {
      const requests = accountsList.map(async ({ enterprise, bankaccount }) => {
        const bankid = "90400888000142";

        try {
          const res = await fetch("/api/statements", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              enterprise,
              bankaccount,
              bankid,
              operation: "statements",
              initialDate: startDate,
              finalDate: endDate,
            }),
          });

          const data = await res.json();
          return { 
            enterprise, 
            bankaccount, 
            status: res.status, 
            success: res.ok,
            error: res.ok ? null : (data.error || `HTTP ${res.status}`),
            data 
          };
        } catch (err) {
          return {
            enterprise,
            bankaccount,
            status: 0,
            success: false,
            error: err instanceof Error ? err.message : 'Erro de rede',
            data: null
          };
        }
      });

      const results = await Promise.all(requests);
      setStatements(results);
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError("Erro desconhecido ao buscar os extratos");
    } finally {
      setLoading(false);
    }
  };

  // --------- helpers de data ---------
  const parseApiDate = (raw: string): Date | null => {
    if (!raw) return null;
    if (raw.includes("/")) {
      const [d, m, y] = raw.split("/").map(Number);
      return new Date(y, m - 1, d);
    }
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  };

  const normalizeStatement = (payload: any): any[] => {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.statement)) return payload.statement;
    if (payload?.statement) return [payload.statement];
    return [];
  };

  const filterByRange = (items: any[], startISO: string, endISO: string) => {
    const start = new Date(`${startISO}T00:00:00`);
    const end = new Date(`${endISO}T23:59:59`);
    return items.filter((item) => {
      const d = parseApiDate(item.transactionDate || item.date || "");
      if (!d) return false;
      return d >= start && d <= end;
    });
  };

  // --------- PDF ---------
  const generateStatementPdf = async ({
    enterprise,
    bankaccount,
    items,
    startDate,
    endDate,
  }: {
    enterprise: string;
    bankaccount: string;
    items: any[];
    startDate: string;
    endDate: string;
  }) => {
    const normalizedItems = Array.isArray(items) ? items : [];
    const hasTransactions = normalizedItems.length > 0;

    const formatCurrency = (value: number) =>
      new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
      }).format(value || 0);

    // Totais referentes ao periodo selecionado
    const totals = normalizedItems.reduce(
      (acc, item) => {
        const type = String(item.creditDebitType || "").toUpperCase();
        const amount = Math.abs(Number(item.amount || 0));
        if (type === "DEBITO") acc.out += amount;
        else acc.in += amount;
        return acc;
      },
      { in: 0, out: 0 }
    );

    const buildRows = (slice: any[], pageIndex: number, baseIndex: number) =>
      slice
        .map((item: any, index: number) => {
          if (item.__empty) {
            return `
        <tr>
          <td colspan="4" style="padding:14px 8px; text-align:center; color:#475569; font-weight:600;">
            Nenhuma movimentacao no periodo selecionado.
          </td>
        </tr>
      `;
          }
          const rawDate = item.transactionDate || item.date || "";
          const formattedDate = rawDate.includes("/")
            ? rawDate
            : rawDate
            ? new Date(rawDate).toLocaleDateString()
            : "";
          const descricao = [
            item.transactionName,
            item.historicComplement,
            item.description,
          ]
            .filter(Boolean)
            .join(" • ");
          const type = String(item.creditDebitType || "").toUpperCase();
          const isEntrada = type !== "DEBITO";
          const badgeColor = isEntrada ? "#dcfce7" : "#fee2e2";
          const badgeText = isEntrada ? "#166534" : "#991b1b";
          const amount = Math.abs(Number(item.amount || 0));
          const valor = `${isEntrada ? "+" : "-"} ${formatCurrency(amount)}`;
          const rowBackground =
            (baseIndex + index) % 2 === 0 ? "#ffffff" : "#f1f5f9";

          return `
        <tr style="background:${rowBackground};">
          <td style="padding:12px 10px; font-weight:500; color:#0f172a; font-size:11px;">${formattedDate}</td>
          <td style="padding:12px 10px;">
            <div style="font-weight:600; color:#0f172a; font-size:12px;">${descricao || "—"}</div>
            ${
              item.historicComplement
                ? `<div style="font-size:10px; color:#475569; margin-top:2px;">${item.historicComplement}</div>`
                : ""
            }
          </td>
          <td style="padding:12px 10px; text-align:center;">
            <div style="
              display:inline-flex;
              align-items:center;
              justify-content:center;
              padding:5px 14px;
              border-radius:999px;
              font-size:11px;
              font-weight:600;
              background:${badgeColor};
              color:${badgeText};
            ">
              ${isEntrada ? "Entrada" : "Saída"}
            </div>
          </td>
          <td style="padding:12px 10px; text-align:center; font-weight:700; font-size:13px; color:${
            isEntrada ? "#166534" : "#be123c"
          }; ">
            ${valor}
          </td>
        </tr>
      `;
        })
        .join("");

    const chunkSize = 18;
    const chunks: any[] = [];
    const tableItems = hasTransactions
      ? normalizedItems
      : [{ __empty: true }];
    for (let i = 0; i < tableItems.length; i += chunkSize) {
      chunks.push(tableItems.slice(i, i + chunkSize));
    }

    // Cria PDF em formato A4
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    let isFirstPage = true;

    for (let pageIndex = 0; pageIndex < chunks.length; pageIndex++) {
      const chunk = chunks[pageIndex];
      const baseIndex = pageIndex * chunkSize;

      const statementContainer = document.createElement("div");
      statementContainer.className = "statement-container";
      // Largura otimizada para monitor 22" vertical (1080px)
      statementContainer.style.width = "1000px";
      statementContainer.style.maxWidth = "100%";
      statementContainer.style.padding = "24px";
      statementContainer.style.backgroundColor = "#f8fafc";
      statementContainer.style.color = "#0f172a";
      statementContainer.style.fontFamily = "Inter, Arial, sans-serif";
      statementContainer.style.fontSize = "12px";
      statementContainer.style.boxSizing = "border-box";

      const headerHtml = `
      <div style="margin-bottom: 20px; border-bottom:2px solid #e2e8f0; padding-bottom: 16px;">
        <p style="margin:0; font-size:12px; color:#64748b;">Extrato consolidado</p>
        <h1 style="font-size:28px; margin:4px 0; font-weight:700; color:#0f172a;">${enterprise.toUpperCase()}</h1>
        <p style="margin:0; font-size:14px; color:#475569;">Conta ${bankaccount}</p>
        <p style="margin:0; font-size:14px; color:#475569;">Data do extrato: ${new Date(`${endDate}T00:00:00`).toLocaleDateString("pt-BR")}</p>

        ${
          !isFirstPage
            ? `<p style="margin:4px 0 0; font-size:11px; color:#94a3b8;">Continuação do extrato</p>`
            : ""
        }
      </div>
    `;

     const dailyIn = totals.in;
const dailyOut = totals.out;

console.log("=== CÁLCULO DO SALDO ===");
console.log("Entradas do dia:", dailyIn);
console.log("Saídas do dia:", dailyOut);

// Calcula apenas com entradas e saídas
const currentBalance = dailyIn - dailyOut;
console.log("Cálculo:", dailyIn, "-", dailyOut, "=", currentBalance);

// evitar timezone bug
const endFormatted = new Date(`${endDate}T00:00:00`).toLocaleDateString("pt-BR");

const summaryHtml = isFirstPage
  ? `
    <div style="display:flex; gap:16px; margin-bottom: 24px; flex-wrap:wrap;">
      
      <!-- Entradas -->
      <div style="flex:1; min-width:280px; background:#ecfdf5; border-radius:12px; padding:16px; border:2px solid #a7f3d0;">
        <p style="margin:0; font-size:11px; text-transform:uppercase; color:#065f46; font-weight:600;">Entradas (${endFormatted})</p>
        <p style="margin:6px 0 0; font-size:20px; font-weight:700; color:#065f46;">
          ${formatCurrency(dailyIn)}
        </p>
      </div>

      <!-- Saídas -->
      <div style="flex:1; min-width:280px; background:#fef2f2; border-radius:12px; padding:16px; border:2px solid #fecaca;">
        <p style="margin:0; font-size:11px; text-transform:uppercase; color:#991b1b; font-weight:600;">Saídas (${endFormatted})</p>
        <p style="margin:6px 0 0; font-size:20px; font-weight:700; color:#991b1b;">
          ${formatCurrency(dailyOut)}
        </p>
      </div>

      <!-- Saldo Final -->
      <div style="flex:1; min-width:280px; background:#f0fdf4; border-radius:12px; padding:16px; border:2px solid #bbf7d0;">
        <p style="margin:0; font-size:11px; text-transform:uppercase; color:#14532d; font-weight:600;">Saldo Final (${endFormatted})</p>
        <p style="margin:6px 0 0; font-size:20px; font-weight:700; color:#14532d;">
          ${formatCurrency(currentBalance)}
        </p>
      </div>

    </div>
  `
  : "";


      const tableHtml = `
      <table style="width:100%; border-collapse:collapse; border-radius:12px; overflow:hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <thead>
          <tr style="background:#0f172a; color:#e2e8f0;">
            <th style="padding:14px 10px; text-align:left; font-size:12px; font-weight:600;">Data</th>
            <th style="padding:14px 10px; text-align:left; font-size:12px; font-weight:600;">Descrição</th>
            <th style="padding:14px 10px; text-align:center; font-size:12px; font-weight:600;">Tipo</th>
            <th style="padding:14px 10px; text-align:right; font-size:12px; font-weight:600;">Valor</th>
          </tr>
        </thead>
        <tbody>
          ${buildRows(chunk, pageIndex, baseIndex)}
        </tbody>
      </table>
    `;

      statementContainer.innerHTML = headerHtml + summaryHtml + tableHtml;
      document.body.appendChild(statementContainer);

      const canvas = await html2canvas(statementContainer, {
        backgroundColor: "#ffffff",
        scale: 2, // Aumenta a qualidade
        useCORS: true,
      });

      const imgData = canvas.toDataURL("image/png");
      const imgProps = pdf.getImageProperties(imgData);
      
      // Dimensões A4 em mm
      const pdfWidth = 210; // A4 width em mm
      const pdfHeight = 297; // A4 height em mm
      
      // Calcula a altura proporcional mantendo aspect ratio
      const imgWidth = pdfWidth - 20; // Margem de 10mm de cada lado
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
      
      // Centraliza horizontalmente
      const xOffset = 10; // Margem esquerda
      const yOffset = 10; // Margem superior

      if (!isFirstPage) {
        pdf.addPage();
      }
      
      // Se a imagem for maior que a página, ajusta
      if (imgHeight > pdfHeight - 20) {
        const scale = (pdfHeight - 20) / imgHeight;
        pdf.addImage(imgData, "PNG", xOffset, yOffset, imgWidth * scale, imgHeight * scale);
      } else {
        pdf.addImage(imgData, "PNG", xOffset, yOffset, imgWidth, imgHeight);
      }

      document.body.removeChild(statementContainer);
      isFirstPage = false;
    }

    pdf.save(`${enterprise}_${bankaccount}.pdf`);
  };

  // --------- PDF conta selecionada ---------
  const handleDownloadSelectedPdf = async () => {
    setLoading(true);
    setError(null);

    try {
      const bankid = "90400888000142";

      console.log(`=== GERANDO PDF INDIVIDUAL ===`);

      const res = await fetch("/api/statements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enterprise,
          bankaccount,
          bankid,
          operation: "statements",
          initialDate: startDate,
          finalDate: endDate,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao consultar extrato.");
      }

      const allItems = normalizeStatement(data?.statement);
      const filteredItems = filterByRange(allItems, startDate, endDate);

      console.log(`Gerando PDF do extrato`);
      await generateStatementPdf({
        enterprise,
        bankaccount,
        items: filteredItems,
        startDate,
        endDate,
      });
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError("Erro desconhecido ao gerar o PDF da conta selecionada");
    } finally {
      setLoading(false);
    }
  };

  // --------- PDF em lote ---------
  const handleDownloadAllPdfs = async () => {
    setLoading(true);
    setError(null);
    setAllResponses([]);

    try {
      const aggregatedResults: any[] = [];
      let generatedCount = 0;

      for (const { enterprise, bankaccount } of accountsList) {
        const bankid = "90400888000142";

        let resultEntry: any = {
          enterprise,
          bankaccount,
          success: false,
          error: null,
          status: 0,
          data: null
        };

        try {
          const res = await fetch("/api/statements", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              enterprise,
              bankaccount,
              bankid,
              operation: "statements",
              initialDate: startDate,
              finalDate: endDate,
            }),
          });

          let data: any = {};
          try {
            data = await res.json();
          } catch (jsonErr) {
            console.error("Erro ao parsear resposta de extrato", jsonErr);
            resultEntry.error = "Erro ao processar resposta JSON";
          }

          resultEntry.status = res.status;
          resultEntry.data = data;

          if (!res.ok) {
            resultEntry.error = data.error || `HTTP ${res.status}`;
            console.warn(`Falha ao gerar extrato para ${enterprise}`);
          } else {
            const allItems = normalizeStatement(data?.statement);
            const filteredItems = filterByRange(allItems, startDate, endDate);

            await generateStatementPdf({
              enterprise,
              bankaccount,
              items: filteredItems,
              startDate,
              endDate,
            });
            generatedCount += 1;
            resultEntry.success = true;
          }
        } catch (err) {
          resultEntry.error = err instanceof Error ? err.message : "Erro desconhecido";
          console.error(`Erro ao processar ${enterprise}:`, err);
        }

        aggregatedResults.push(resultEntry);
      }

      if (!generatedCount) {
        setError("Nenhum PDF gerado: nenhum extrato retornou dados para o periodo.");
      }
      setAllResponses(aggregatedResults);
    } catch (err) {
      console.error("Erro ao gerar PDFs em lote", err);
      setError("Erro ao gerar PDFs em lote");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 w-full max-w-md font-mono text-sm flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-8">SALDOS E EXTRATOS</h1>
        

        <div className="flex w-full gap-2 mb-6">
          <button
            onClick={handleFetchAllAndDownload}
            disabled={loading}
            className="flex-1 py-2 px-4 border border-green-700 rounded-md shadow-sm text-sm font-medium text-white bg-green-700 hover:bg-green-600 disabled:opacity-50"
          >
            {loading ? "Exportando..." : "Exportar para Excel"}
          </button>

          <button
            onClick={handleDownloadAllPdfs}
            disabled={loading}
            className="flex-1 py-2 px-4 border border-red-700 rounded-md shadow-sm text-sm font-medium text-white bg-red-700 hover:bg-red-600 disabled:opacity-50"
          >
            {loading ? "Gerando PDFs..." : "Exportar Extratos (PDF)"}
          </button>
        </div>

        <button
          onClick={handleDownloadSelectedPdf}
          disabled={loading}
          className="w-full mb-6 py-2 px-4 border border-yellow-600 rounded-md text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50"
        >
          {loading ? "Gerando PDF..." : "Exportar extrato da conta selecionada"}
        </button>

        <form onSubmit={handleSubmit} className="w-full">
          <div className="mb-4">
            <label
              htmlFor="enterprise"
              className="block text-sm font-medium text-gray-300"
            >
              Empresa
            </label>
            <select
              id="enterprise"
              value={enterprise}
              onChange={(e) => handleEnterpriseSelection(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md shadow-sm"
            >
              {accountsList.map(({ enterprise, bankaccount }) => (
                <option key={enterprise} value={enterprise}>
                  {enterprise.toUpperCase()} — {bankaccount}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-6">
            <label
              htmlFor="bankaccount"
              className="block text-sm font-medium text-gray-300"
            >
              Conta Bancária
            </label>
            <input
              type="text"
              id="bankaccount"
              value={bankaccount}
              className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md shadow-sm"
              readOnly
              required
            />
          </div>
          <div className="flex w-full gap-2 mb-6">
            <div className="w-1/2">
              <label
                htmlFor="startDate"
                className="block text-sm font-medium text-gray-300"
              >
                Data anterior ao extrato
              </label>
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md shadow-sm"
                required
              />
            </div>
            <div className="w-1/2">
              <label
                htmlFor="endDate"
                className="block text-sm font-medium text-gray-300"
              >
                Data do extrato
              </label>
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md shadow-sm"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Carregando..." : "CONSLUTAR SALDO"}
          </button>
        </form>

        {error && (
          <div className="mt-8 w-full bg-red-900 text-red-200 p-4 rounded-md">
            <h2 className="font-bold">Erro:</h2>
            <pre className="whitespace-pre-wrap">{error}</pre>
          </div>
        )}

        {response && (
          <div className="mt-8 w-full bg-gray-800 p-4 rounded-md">
            <h2 className="font-bold">Resposta única:</h2>
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(response, null, 2)}
            </pre>
          </div>
        )}

        {allResponses.length > 0 && (
          <div className="mt-8 w-full space-y-4">
            {/* Resumo Geral com destaque */}
            <div className={`p-6 rounded-lg border-4 ${
              allResponses.every(r => r.success) 
                ? 'bg-green-900 border-green-500' 
                : 'bg-red-900 border-red-500'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">
                  {allResponses.every(r => r.success) ? '✅ TODAS AS REQUISIÇÕES OK' : '❌ ALGUMAS REQUISIÇÕES COM ERRO'}
                </h2>
                <div className="text-xl font-bold">
                  {allResponses.filter(r => r.success).length} / {allResponses.length}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-green-800 p-3 rounded">
                  <div className="text-3xl font-bold">{allResponses.filter(r => r.success).length}</div>
                  <div className="text-sm">Sucesso</div>
                </div>
                <div className="bg-red-800 p-3 rounded">
                  <div className="text-3xl font-bold">{allResponses.filter(r => !r.success).length}</div>
                  <div className="text-sm">Erro</div>
                </div>
              </div>
            </div>

            {/* Lista detalhada de cada empresa */}
            <div className="bg-gray-900 p-4 rounded-md overflow-auto max-h-96">
              <h2 className="font-bold mb-4 text-lg">Detalhes por Empresa:</h2>
              {allResponses.map((r, index) => (
                <div 
                  key={index} 
                  className={`mb-3 p-4 rounded-lg border-l-4 ${
                    r.success 
                      ? 'bg-gray-800 border-green-500' 
                      : 'bg-red-950 border-red-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-semibold">
                      {r.success ? '✅' : '❌'} {r.enterprise.toUpperCase()}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      r.success 
                        ? 'bg-green-600 text-white' 
                        : 'bg-red-600 text-white'
                    }`}>
                      {r.success ? 'OK' : 'ERRO'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400 mb-2">
                    Conta: {r.bankaccount} | Status HTTP: {r.status}
                  </div>
                  {r.error && (
                    <div className="bg-red-900 text-red-200 p-2 rounded mb-2 text-sm">
                      ⚠️ Erro: {r.error}
                    </div>
                  )}
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-blue-400 hover:text-blue-300">
                      Ver dados completos
                    </summary>
                    <pre className="whitespace-pre-wrap text-xs mt-2 bg-gray-950 p-2 rounded overflow-x-auto">
                      {JSON.stringify(r.data, null, 2)}
                    </pre>
                  </details>
                </div>
              ))}
            </div>
          </div>
        )}

        {statements.length > 0 && (
          <div className="mt-8 w-full space-y-4">
            {/* Resumo Geral dos Extratos com destaque */}
            <div className={`p-6 rounded-lg border-4 ${
              statements.every(r => r.success) 
                ? 'bg-green-900 border-green-500' 
                : 'bg-red-900 border-red-500'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">
                  {statements.every(r => r.success) ? '✅ TODOS OS EXTRATOS OK' : '❌ ALGUNS EXTRATOS COM ERRO'}
                </h2>
                <div className="text-xl font-bold">
                  {statements.filter(r => r.success).length} / {statements.length}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-green-800 p-3 rounded">
                  <div className="text-3xl font-bold">{statements.filter(r => r.success).length}</div>
                  <div className="text-sm">Sucesso</div>
                </div>
                <div className="bg-red-800 p-3 rounded">
                  <div className="text-3xl font-bold">{statements.filter(r => !r.success).length}</div>
                  <div className="text-sm">Erro</div>
                </div>
              </div>
            </div>

            {/* Lista detalhada de cada extrato */}
            <div className="bg-gray-900 p-4 rounded-md overflow-auto max-h-96">
              <h2 className="font-bold mb-4 text-lg">Detalhes dos Extratos:</h2>
              {statements.map((r, index) => (
                <div 
                  key={index} 
                  className={`mb-3 p-4 rounded-lg border-l-4 ${
                    r.success 
                      ? 'bg-gray-800 border-green-500' 
                      : 'bg-red-950 border-red-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-semibold">
                      {r.success ? '✅' : '❌'} {r.enterprise.toUpperCase()}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      r.success 
                        ? 'bg-green-600 text-white' 
                        : 'bg-red-600 text-white'
                    }`}>
                      {r.success ? 'OK' : 'ERRO'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400 mb-2">
                    Conta: {r.bankaccount} | Status HTTP: {r.status}
                  </div>
                  {r.error && (
                    <div className="bg-red-900 text-red-200 p-2 rounded mb-2 text-sm">
                      ⚠️ Erro: {r.error}
                    </div>
                  )}
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-blue-400 hover:text-blue-300">
                      Ver dados completos
                    </summary>
                    <pre className="whitespace-pre-wrap text-xs mt-2 bg-gray-950 p-2 rounded overflow-x-auto">
                      {JSON.stringify(r.data, null, 2)}
                    </pre>
                  </details>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );''
};

export default Home;
