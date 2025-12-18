// Vercel Edge Function - Proxy para Freepik API
// Resolve problema de CORS fazendo requisição server-side

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  // Apenas POST
  if (req.method !== 'POST') {
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
    const body = await req.json();
    const { endpoint = '/ai/mystic', ...params } = body;

    console.log(`[Freepik Proxy] Endpoint: ${endpoint}`);
    console.log(`[Freepik Proxy] Params:`, JSON.stringify(params).substring(0, 200));

    // Fazer requisição para Freepik
    const freepikResponse = await fetch(`https://api.freepik.com/v1${endpoint}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-freepik-api-key': apiKey,
      },
      body: JSON.stringify(params),
    });

    const data = await freepikResponse.json();

    console.log(`[Freepik Proxy] Status: ${freepikResponse.status}`);
    console.log(`[Freepik Proxy] Response:`, JSON.stringify(data).substring(0, 500));

    // Retornar resposta com headers CORS
    return new Response(JSON.stringify(data), {
      status: freepikResponse.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error: any) {
    console.error('[Freepik Proxy] Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Erro interno do proxy' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
