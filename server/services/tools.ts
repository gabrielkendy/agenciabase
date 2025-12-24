// =============================================================================
// TOOLS SERVICE - Ferramentas de IA (Freepik)
// Tools: upscale, remove-bg, relight, style-transfer, reimagine, recolor
// =============================================================================

const FREEPIK_TOOLS: Record<string, string> = {
  'upscale': '/ai/image-upscaler',
  'remove-bg': '/ai/beta/remove-background',
  'relight': '/ai/image-relight',
  'style-transfer': '/ai/image-style-transfer',
  'reimagine': '/ai/reimagine',
  'recolor': '/ai/recolor',
};

interface ToolParams {
  tool: string;
  image?: string;
  prompt?: string;
  options: Record<string, any>;
}

export async function processAITool(params: ToolParams) {
  const { tool, image, prompt, options } = params;

  const apiKey = process.env.FREEPIK_API_KEY;
  if (!apiKey) {
    throw new Error('Freepik API key não configurada no servidor.');
  }

  const endpoint = FREEPIK_TOOLS[tool];
  if (!endpoint) {
    throw new Error(`Ferramenta ${tool} não suportada`);
  }

  // Extrair base64 se necessário
  const imageBase64 = image?.startsWith('data:') ? image.split(',')[1] : image;

  // Construir body baseado na ferramenta
  let requestBody: Record<string, any> = {};

  switch (tool) {
    case 'upscale':
      requestBody = { 
        image: imageBase64, 
        scale: options.scale || 4, 
        creativity: 0.3 
      };
      break;
    case 'remove-bg':
      requestBody = { image: imageBase64 };
      break;
    case 'relight':
      requestBody = { 
        image: imageBase64, 
        light_source: options.lightSource || 'left' 
      };
      break;
    case 'style-transfer':
      const styleBase64 = options.styleImage?.startsWith('data:') 
        ? options.styleImage.split(',')[1] 
        : options.styleImage;
      requestBody = { 
        image: imageBase64, 
        style_image: styleBase64 
      };
      break;
    case 'reimagine':
      requestBody = { 
        image: imageBase64, 
        prompt: prompt || '', 
        mode: 'creative', 
        strength: 0.7 
      };
      break;
    case 'recolor':
      requestBody = { 
        image: imageBase64, 
        prompt: prompt || '' 
      };
      break;
  }

  console.log(`[Freepik] Processando ${tool}`);

  // Submeter tarefa
  const response = await fetch(`https://api.freepik.com/v1${endpoint}`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'x-freepik-api-key': apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Freepik error ${response.status}`);
  }

  let result = await response.json();

  // Polling para tarefas assíncronas
  if (result.data?.id && result.data?.status !== 'COMPLETED') {
    console.log(`[Freepik] Tarefa criada: ${result.data.id}`);

    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 2000));
      
      const statusRes = await fetch(
        `https://api.freepik.com/v1${endpoint}/${result.data.id}`,
        {
          headers: {
            'Accept': 'application/json',
            'x-freepik-api-key': apiKey,
          },
        }
      );
      
      const statusData = await statusRes.json();
      console.log(`[Freepik] Status: ${statusData.data?.status}`);
      
      if (statusData.data?.status === 'COMPLETED') {
        result = statusData;
        break;
      }
      if (statusData.data?.status === 'FAILED') {
        throw new Error('Processamento falhou');
      }
    }
  }

  const resultUrl = result.data?.generated?.[0]?.url || result.data?.image?.url || '';

  return { url: resultUrl, result: resultUrl, tool };
}
