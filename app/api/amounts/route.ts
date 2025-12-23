import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { enterprise, operation, bankaccount } = await request.json();

    const bankid = '90400888000142';
    const token = process.env.NEXT_PUBLIC_API_KEY;
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

    // If the operation is 'extract', we want to fetch 'balances' data
    const dataFetchingOperation = operation === 'extract' ? 'balances' : operation;

    if (!token || !baseUrl) {
      return NextResponse.json(
        { error: 'Missing environment variables' },
        { status: 500 }
      );
    }

    const fetchData = async (currentEnterprise: string, currentBankAccount: string) => {
        const response = await fetch(`${baseUrl}/amounts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bankid,
              enterprise: currentEnterprise,
              bankaccount: currentBankAccount,
              operation: dataFetchingOperation,
              token,
            }),
          });

          if (!response.ok) {
            console.error(`Error for ${currentEnterprise}: ${response.statusText}`);
            return [];
          }

          const textResponse = await response.text();
          // If the response is empty, return early.
          if (!textResponse) {
            return [];
          }

          try {
            const result = JSON.parse(textResponse);
            let extractedData: any[] = [];

            if (Array.isArray(result)) {
              extractedData = result;
            } else if (result && Array.isArray(result.contas)) {
              extractedData = result.contas;
            } else if (result && typeof result === 'object' && Object.keys(result).length > 0) {
              extractedData = [result];
            }

            // Add enterprise and bankaccount to each record
            return extractedData.map(item => ({
                enterprise: currentEnterprise,
                bankaccount: currentBankAccount,
                ...item
            }));

          } catch (e) {
            console.error(`Failed to parse JSON for ${currentEnterprise}. Response was: "${textResponse}"`, e);
            return [];
          }
    };

    let allData: any[] = [];

    if (Array.isArray(enterprise)) {
      for (let i = 0; i < enterprise.length; i++) {
        try {
          const data = await fetchData(enterprise[i], bankaccount[i]);
          allData.push(...data);
        } catch (error) {
          console.error(`Failed to fetch data for ${enterprise[i]}`, error);
        }
      }
    } else {
        allData = await fetchData(enterprise, bankaccount);
    }

    if (operation === 'extract') {
        if (!allData || allData.length === 0) {
            return new Response('No data to export', {
                status: 200,
                headers: { 'Content-Type': 'text/plain' },
            });
        }
        const csvHeader = Object.keys(allData[0] || {}).join(',');
        const csvBody = allData.map((row: any) => Object.values(row).map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
        const csvContent = `${csvHeader}\n${csvBody}`;

        return new Response(csvContent, {
            status: 200,
            headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename="amounts.csv"',
            },
        });
    }
    
    return NextResponse.json(allData, { status: 200 });

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
