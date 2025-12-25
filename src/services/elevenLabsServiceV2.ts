// ElevenLabs Service - Text to Speech & Voice Generation
// https://elevenlabs.io

export interface ElevenLabsConfig {
  apiKey: string;
}

export interface Voice {
  voice_id: string;
  name: string;
  category?: string;
  labels?: Record<string, string>;
  preview_url?: string;
}

export interface TextToSpeechParams {
  text: string;
  voice_id?: string;
  model_id?: string;
  voice_settings?: {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
}

export interface VoiceCloneParams {
  name: string;
  files: File[];
  description?: string;
  labels?: Record<string, string>;
}

// Modelos disponíveis
export const ELEVENLABS_MODELS = {
  MULTILINGUAL_V2: 'eleven_multilingual_v2',
  MULTILINGUAL_V1: 'eleven_multilingual_v1',
  ENGLISH_V1: 'eleven_monolingual_v1',
  TURBO_V2: 'eleven_turbo_v2',
} as const;

// Vozes populares pré-definidas
export const PRESET_VOICES = {
  RACHEL: '21m00Tcm4TlvDq8ikWAM', // American female
  DOMI: 'AZnzlk1XvdvUeBnXmlld', // American female young
  BELLA: 'EXAVITQu4vr4xnSDxMaL', // American female
  ANTONI: 'ErXwobaYiN019PkySvjV', // American male
  ELLI: 'MF3mGyEYCl7XYWbV9V6O', // American female young
  JOSH: 'TxGEqnHWrfWFTfGW9XjX', // American male young
  ARNOLD: 'VR6AewLTigWG4xSOukaG', // American male
  ADAM: 'pNInz6obpgDQGcFmaJgB', // American male deep
  SAM: 'yoZ06aMxZJJ28mfd3POQ', // American male
} as const;

class ElevenLabsService {
  private apiKey: string = '';
  private baseUrl = 'https://api.elevenlabs.io/v1';

  setApiKey(key: string) {
    this.apiKey = key;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.apiKey) {
      throw new Error('ElevenLabs API key não configurada');
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail?.message || error.message || `HTTP ${response.status}`);
    }

    // Se for áudio, retornar blob
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('audio')) {
      const blob = await response.blob();
      return blob as T;
    }

    return response.json();
  }

  // ============================================
  // TEXT TO SPEECH
  // ============================================

  async textToSpeech(params: TextToSpeechParams): Promise<Blob> {
    const voiceId = params.voice_id || PRESET_VOICES.RACHEL;
    const modelId = params.model_id || ELEVENLABS_MODELS.MULTILINGUAL_V2;

    return this.request(`/text-to-speech/${voiceId}`, {
      method: 'POST',
      body: JSON.stringify({
        text: params.text,
        model_id: modelId,
        voice_settings: params.voice_settings || {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0,
          use_speaker_boost: true,
        },
      }),
    });
  }

  async textToSpeechStream(params: TextToSpeechParams): Promise<ReadableStream> {
    if (!this.apiKey) throw new Error('API key não configurada');

    const voiceId = params.voice_id || PRESET_VOICES.RACHEL;

    const response = await fetch(`${this.baseUrl}/text-to-speech/${voiceId}/stream`, {
      method: 'POST',
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: params.text,
        model_id: params.model_id || ELEVENLABS_MODELS.MULTILINGUAL_V2,
        voice_settings: params.voice_settings,
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error('Erro ao gerar áudio stream');
    }

    return response.body;
  }

  // Helper: Gerar e retornar URL do áudio
  async generateAudioUrl(text: string, voiceId?: string): Promise<string> {
    const blob = await this.textToSpeech({
      text,
      voice_id: voiceId,
    });
    return URL.createObjectURL(blob);
  }

  // ============================================
  // VOICES
  // ============================================

  async getVoices(): Promise<{ voices: Voice[] }> {
    return this.request('/voices');
  }

  async getVoice(voiceId: string): Promise<Voice> {
    return this.request(`/voices/${voiceId}`);
  }

  async deleteVoice(voiceId: string): Promise<void> {
    await this.request(`/voices/${voiceId}`, { method: 'DELETE' });
  }

  // ============================================
  // VOICE CLONING
  // ============================================

  async cloneVoice(params: VoiceCloneParams): Promise<Voice> {
    const formData = new FormData();
    formData.append('name', params.name);
    
    if (params.description) {
      formData.append('description', params.description);
    }

    params.files.forEach((file, index) => {
      formData.append('files', file, `sample_${index}.mp3`);
    });

    if (params.labels) {
      formData.append('labels', JSON.stringify(params.labels));
    }

    const response = await fetch(`${this.baseUrl}/voices/add`, {
      method: 'POST',
      headers: {
        'xi-api-key': this.apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail?.message || 'Erro ao clonar voz');
    }

    return response.json();
  }

  // ============================================
  // USER INFO
  // ============================================

  async getUserInfo(): Promise<{
    subscription: {
      character_count: number;
      character_limit: number;
      tier: string;
    };
  }> {
    return this.request('/user/subscription');
  }

  async getCharacterUsage(): Promise<{ used: number; limit: number; percentage: number }> {
    const info = await this.getUserInfo();
    const used = info.subscription.character_count;
    const limit = info.subscription.character_limit;
    return {
      used,
      limit,
      percentage: Math.round((used / limit) * 100),
    };
  }

  // ============================================
  // HELPERS
  // ============================================

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  getPresetVoices() {
    return PRESET_VOICES;
  }

  getModels() {
    return ELEVENLABS_MODELS;
  }

  // Detectar idioma do texto e sugerir modelo
  suggestModel(text: string): string {
    // Detectar caracteres não-ASCII (provavelmente não é só inglês)
    const hasNonAscii = /[^\x00-\x7F]/.test(text);
    // Detectar português
    const isPortuguese = /[áàãâéêíóôõúç]/i.test(text);
    
    if (hasNonAscii || isPortuguese) {
      return ELEVENLABS_MODELS.MULTILINGUAL_V2;
    }
    
    // Para textos curtos em inglês, turbo é mais rápido
    if (text.length < 500) {
      return ELEVENLABS_MODELS.TURBO_V2;
    }
    
    return ELEVENLABS_MODELS.MULTILINGUAL_V2;
  }
}

export const elevenLabs = new ElevenLabsService();
export default elevenLabs;
