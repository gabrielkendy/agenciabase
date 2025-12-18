import { BaseAIProvider, GenerateAudioParams, GenerateAudioResult, GenerateImageParams, GenerateImageResult } from './base.provider.js';

export class ElevenLabsProvider extends BaseAIProvider {
  private baseUrl = 'https://api.elevenlabs.io/v1';

  constructor(apiKey: string, model: string = 'eleven_multilingual_v2') {
    super(apiKey, model);
  }

  // ElevenLabs is audio-only, but we need to implement the abstract method
  async generateImage(_params: GenerateImageParams): Promise<GenerateImageResult> {
    throw new Error('ElevenLabs does not support image generation');
  }

  async generateAudio(params: GenerateAudioParams): Promise<GenerateAudioResult> {
    const startTime = Date.now();
    const voiceId = params.voiceId || 'EXAVITQu4vr4xnSDxMaL'; // Default: Sarah

    const response = await fetch(`${this.baseUrl}/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': this.apiKey,
      },
      body: JSON.stringify({
        text: params.text,
        model_id: this.model,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.5,
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error((error as any).detail?.message || `ElevenLabs API error: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    const processingTime = Date.now() - startTime;

    // Estimate duration based on text length (approx 15 chars per second)
    const estimatedDuration = Math.ceil(params.text.length / 15);

    return {
      audioUrl: `data:audio/mpeg;base64,${base64Audio}`,
      durationSeconds: estimatedDuration,
      metadata: {
        provider: 'elevenlabs',
        model: this.model,
      },
    };
  }

  async getVoices(): Promise<Array<{ id: string; name: string; category: string }>> {
    const response = await fetch(`${this.baseUrl}/voices`, {
      headers: { 'xi-api-key': this.apiKey },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch voices');
    }

    const data = await response.json() as any;
    return data.voices.map((voice: any) => ({
      id: voice.voice_id,
      name: voice.name,
      category: voice.category,
    }));
  }

  async validateApiKey(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/user`, {
        headers: { 'xi-api-key': this.apiKey },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async getAvailableModels(): Promise<string[]> {
    return [
      'eleven_multilingual_v2',
      'eleven_monolingual_v1',
      'eleven_turbo_v2',
    ];
  }
}

export default ElevenLabsProvider;
