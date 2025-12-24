// =============================================================================
// VIDEO SERVICE - Geração de Vídeos
// Provider: FAL.ai
// =============================================================================

const VIDEO_MODELS: Record<string, string> = {
  'kling-pro': 'fal-ai/kling-video/v1.6/pro/image-to-video',
  'kling-standard': 'fal-ai/kling-video/v1/standard/image-to-video',
  'minimax': 'fal-ai/minimax-video/image-to-video',
  'luma-ray2': 'fal-ai/luma-dream-machine/ray-2',
  'svd': 'fal-ai/stable-video',
};

interface VideoParams {
  model: string;
  image: string;
  prompt?: string;
  duration: number;
}

export async function generateVideo(params: VideoParams) {
  const { model, image, prompt, duration } = params;

  const apiKey = process.env.FALAI_API_KEY;
  if (!apiKey) {
    throw new Error('FAL.ai API key não configurada no servidor.');
  }

  const falModel = VIDEO_MODELS[model] || VIDEO_MODELS['kling-standard'];

  console.log(`[FAL.ai] Gerando vídeo com ${falModel}`);

  const requestBody: Record<string, any> = {
    image_url: image,
    prompt: prompt || 'Smooth natural motion, cinematic',
    duration: String(duration),
  };

  // Submeter tarefa
  const submitRes = await fetch(`https://queue.fal.run/${falModel}`, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!submitRes.ok) {
    const error = await submitRes.json().catch(() => ({}));
    throw new Error(error.detail || `FAL.ai error ${submitRes.status}`);
  }

  const submitData = await submitRes.json();
  const requestId = submitData.request_id;

  if (!requestId) {
    throw new Error('Nenhum request_id retornado pelo FAL.ai');
  }

  console.log(`[FAL.ai] Tarefa criada: ${requestId}`);

  // Polling para verificar status (max 120s)
  let videoUrl = '';
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 2000));

    const statusRes = await fetch(
      `https://queue.fal.run/${falModel}/requests/${requestId}/status`,
      { headers: { 'Authorization': `Key ${apiKey}` } }
    );

    const statusData = await statusRes.json();
    console.log(`[FAL.ai] Status: ${statusData.status}`);

    if (statusData.status === 'COMPLETED') {
      const resultRes = await fetch(
        `https://queue.fal.run/${falModel}/requests/${requestId}`,
        { headers: { 'Authorization': `Key ${apiKey}` } }
      );
      const resultData = await resultRes.json();
      videoUrl = resultData.video?.url || '';
      break;
    }

    if (statusData.status === 'FAILED') {
      throw new Error('Geração de vídeo falhou');
    }
  }

  if (!videoUrl) {
    throw new Error('Timeout na geração de vídeo');
  }

  return { videoUrl, model, duration };
}
