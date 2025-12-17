// ElevenLabs API Service for Text-to-Speech

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
  description?: string;
  labels?: Record<string, string>;
  preview_url?: string;
}

export interface ElevenLabsSpeechOptions {
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

export const elevenLabsService = {
  // Get available voices
  getVoices: async (apiKey: string): Promise<ElevenLabsVoice[]> => {
    const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
      headers: {
        'xi-api-key': apiKey,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail?.message || `ElevenLabs error: ${response.status}`);
    }

    const data = await response.json();
    return data.voices || [];
  },

  // Generate speech from text
  generateSpeech: async (
    text: string,
    voiceId: string,
    apiKey: string,
    options: ElevenLabsSpeechOptions = {}
  ): Promise<Blob> => {
    const response = await fetch(`${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: options.stability ?? 0.5,
          similarity_boost: options.similarityBoost ?? 0.75,
          style: options.style ?? 0,
          use_speaker_boost: options.useSpeakerBoost ?? true,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail?.message || `ElevenLabs speech error: ${response.status}`);
    }

    return response.blob();
  },

  // Generate speech and return as base64 data URL
  generateSpeechAsDataUrl: async (
    text: string,
    voiceId: string,
    apiKey: string,
    options: ElevenLabsSpeechOptions = {}
  ): Promise<string> => {
    const blob = await elevenLabsService.generateSpeech(text, voiceId, apiKey, options);

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert audio to data URL'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  },

  // Get user subscription info
  getSubscription: async (apiKey: string) => {
    const response = await fetch(`${ELEVENLABS_API_URL}/user/subscription`, {
      headers: {
        'xi-api-key': apiKey,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail?.message || `ElevenLabs error: ${response.status}`);
    }

    return response.json();
  },

  // Predefined Portuguese voices (popular choices)
  defaultVoices: [
    { voice_id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', category: 'premade' },
    { voice_id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', category: 'premade' },
    { voice_id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', category: 'premade' },
    { voice_id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', category: 'premade' },
    { voice_id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice', category: 'premade' },
    { voice_id: 'iP95p4xoKVk53GoZ742B', name: 'Chris', category: 'premade' },
    { voice_id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', category: 'premade' },
    { voice_id: 'pqHfZKP75CvOlQylNhV4', name: 'Bill', category: 'premade' },
  ] as ElevenLabsVoice[],
};
