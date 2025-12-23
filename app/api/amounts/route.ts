import { NextResponse } from "next/server";
// Importa a classe NextResponse, usada para retornar respostas HTTP nas rotas do Next.js

// Manipulador para requisições GET em /api/amounts
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const enterpriseParam = searchParams.get("enterprise");
    const operation = searchParams.get("operation");
    const bankaccountParam = searchParams.get("bankaccount");

    // Converte parâmetros separados por vírgula em arrays
    const enterprise = enterpriseParam ? enterpriseParam.split(",") : [];
    const bankaccount = bankaccountParam ? bankaccountParam.split(",") : [];

    // Variáveis fixas e de ambiente
    const bankid = "90400888000142"; // ID do banco (fixo no código)
    const token = process.env.NEXT_PUBLIC_API_KEY; // chave de autenticação (vinda do .env)
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL; // URL base da API externa

    // Caso a operação seja "extract", ela usará a operação "balances" para buscar os dados
    const dataFetchingOperation =
      operation === "extract" ? "balances" : operation;

    // Verifica se as variáveis de ambiente estão configuradas
    if (!token || !baseUrl) {
      return NextResponse.json(
        { error: "Missing environment variables" },
        { status: 500 }
      );
    }

    // Função auxiliar para buscar dados de UMA empresa + conta bancária
    const fetchData = async (
      currentEnterprise: string,
      currentBankAccount: string
    ) => {
      try {
        // Faz requisição POST para a API externa
        const response = await fetch(`${baseUrl}/amounts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bankid,
            enterprise: currentEnterprise,
            bankaccount: currentBankAccount,
            operation: dataFetchingOperation,
            token,
          }),
        });

        // Caso o status HTTP não seja OK (200–299), retorna com erro
        if (!response.ok) {
          console.error(
            `Error for ${currentEnterprise}: ${response.status} - ${response.statusText}`
          );
          return {
            enterprise: currentEnterprise,
            bankaccount: currentBankAccount,
            success: false,
            error: `HTTP ${response.status}: ${response.statusText}`,
            data: []
          };
        }

      // Lê o corpo da resposta como texto
      const textResponse = await response.text();

      // Se a resposta estiver vazia, retorna com sucesso mas sem dados
      if (!textResponse) {
        return {
          enterprise: currentEnterprise,
          bankaccount: currentBankAccount,
          success: true,
          data: []
        };
      }

      try {
        // Tenta converter o texto recebido para JSON
        const result = JSON.parse(textResponse);
        let extractedData: any[] = [];

        // Diferentes formatos possíveis de retorno da API:
        if (Array.isArray(result)) {
          // Caso o resultado já seja um array, usa diretamente
          extractedData = result;
        } else if (result && Array.isArray(result.contas)) {
          // Caso a API retorne um objeto com um campo "contas"
          extractedData = result.contas;
        } else if (result && typeof result === "object" && Object.keys(result).length > 0) {
          // Caso retorne um único objeto
          extractedData = [result];
        }

        // Adiciona o nome da empresa e conta a cada item do resultado
        const dataWithEnterpriseInfo = extractedData.map((item) => ({
          enterprise: currentEnterprise,
          bankaccount: currentBankAccount,
          ...item,
        }));
        
        return {
          enterprise: currentEnterprise,
          bankaccount: currentBankAccount,
          success: true,
          data: dataWithEnterpriseInfo
        };
      } catch (e) {
        // Se a resposta não for um JSON válido, exibe erro no console
        console.error(
          `Failed to parse JSON for ${currentEnterprise}. Response was: "${textResponse}"`,
          e
        );
        return {
          enterprise: currentEnterprise,
          bankaccount: currentBankAccount,
          success: false,
          error: 'Erro ao processar resposta JSON',
          data: []
        };
      }
      } catch (error) {
        // Captura erros de rede ou outros erros inesperados
        console.error(`Network error for ${currentEnterprise}:`, error);
        return {
          enterprise: currentEnterprise,
          bankaccount: currentBankAccount,
          success: false,
          error: error instanceof Error ? error.message : 'Erro de rede',
          data: []
        };
      }
    };

    // Armazena todos os dados obtidos (de uma ou várias empresas)
    let allResults: any[] = [];
    let allData: any[] = [];

    // Se "enterprise" for um array com mais de um item → múltiplas empresas
    if (Array.isArray(enterprise) && enterprise.length > 1) {
      // Percorre todas as empresas/contas
      for (let i = 0; i < enterprise.length; i++) {
        const result = await fetchData(enterprise[i], bankaccount[i]);
        allResults.push(result);
        // Adiciona os dados ao array final (mantém compatibilidade)
        if (result.data) {
          allData.push(...result.data);
        }
      }
    } else {
      // Caso seja apenas uma empresa/conta, faz uma única requisição
      const result = await fetchData(enterprise[0], bankaccount[0]);
      allResults.push(result);
      if (result.data) {
        allData = result.data;
      }
    }

    // Se a operação for "extract", retorna os dados em formato CSV
    if (operation === "extract") {
      if (!allData || allData.length === 0) {
        return new Response("No data to export", {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        });
      }

      // Mantém apenas os campos desejados e formata/tipa cada um
      const filteredData = allData.map((item: any) => ({
        EMPRESA: String(item.enterprise || "").toUpperCase(),
        CONTA: `'${String(item.bankaccount || "")}`,
        "SALDO DISPONIVEL": Number(item.availableAmount || 0)
          .toFixed(2)
          .replace(".", ","), // 2 casas decimais com vírgula
      }));

      // Cria o cabeçalho CSV com nomes personalizados
      const csvHeader = Object.keys(filteredData[0]).join(";");

      // Cria o corpo CSV com separador ';'
      const csvBody = filteredData
        .map((row) => Object.values(row).join(";"))
        .join("\n");

      // Adiciona BOM para Excel ler UTF-8 corretamente
      const csvWithBom = "\uFEFF" + `${csvHeader}\n${csvBody}`;

      return new Response(csvWithBom, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="amounts.csv"',
        },
      });
    }

    // Caso não seja "extract", retorna os resultados com status em JSON
    // Se for múltiplas empresas, retorna array com status individual
    if (Array.isArray(enterprise) && enterprise.length > 1) {
      return NextResponse.json(allResults, { status: 200 });
    }
    // Se for uma única empresa, retorna compatibilidade com código antigo
    return NextResponse.json(allData, { status: 200 });
  } catch (error) {
    // Captura qualquer erro inesperado
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
