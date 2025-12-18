// Vercel Edge Function - Verificar status de geração Freepik
// Usado para polling de gerações assíncronas

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  // Apenas GET
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Pegar API Key do ambiente
  const apiKey = process.env.FREEPIK_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'FREEPIK_API_KEY não configurada no servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Pegar parâmetros da URL
    const url = new URL(req.url);
    const endpoint = url.searchParams.get('endpoint') || '/ai/mystic';
    const taskId = url.searchParams.get('taskId');

    if (!taskId) {
      return new Response(JSON.stringify({ error: 'taskId é obrigatório' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Freepik Check] Endpoint: ${endpoint}/${taskId}`);

    // Fazer requisição para Freepik
    const freepikResponse = await fetch(`https://api.freepik.com/v1${endpoint}/${taskId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'x-freepik-api-key': apiKey,
      },
    });

    const data = await freepikResponse.json();

    console.log(`[Freepik Check] Status: ${freepikResponse.status}`);
    console.log(`[Freepik Check] Generation Status:`, data.data?.status);

    // Retornar resposta com headers CORS
    return new Response(JSON.stringify(data), {
      status: freepikResponse.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error: any) {
    console.error('[Freepik Check] Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Erro interno do proxy' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
