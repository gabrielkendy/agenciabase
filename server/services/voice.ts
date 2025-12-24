// =============================================================================
// VOICE SERVICE - Síntese de Voz
// Provider: ElevenLabs
// =============================================================================

const VOICES: Record<string, string> = {
  'daniel-pt': 'onwK4e9ZLuTAKqWW03F9',
  'sarah-en': 'EXAVITQu4vr4xnSDxMaL',
  'rachel-en': '21m00Tcm4TlvDq8ikWAM',
  'adam-en': 'pNInz6obpgDQGcFmaJgB',
};

interface VoiceParams {
  text: string;
  voice?: string;
  voiceId?: string;
  stability: number;
  similarityBoost: number;
}

export async function synthesizeVoice(params: VoiceParams) {
  const { text, voice, voiceId, stability, similarityBoost } = params;

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ElevenLabs API key não configurada no servidor.');
  }

  const resolvedVoiceId = voiceId || VOICES[voice || ''] || VOICES['daniel-pt'];

  console.log(`[ElevenLabs] Sintetizando voz: ${resolvedVoiceId}`);

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${resolvedVoiceId}`,
    {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail?.message || `ElevenLabs error ${response.status}`);
  }

  const audioBuffer = await response.arrayBuffer();
  const base64Audio = Buffer.from(audioBuffer).toString('base64');

  return {
    audio: `data:audio/mpeg;base64,${base64Audio}`,
    format: 'mp3',
    voiceId: resolvedVoiceId,
  };
}
