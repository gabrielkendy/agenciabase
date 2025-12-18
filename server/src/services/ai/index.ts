import { BaseAIProvider } from './base.provider.js';
import { FalAIProvider } from './falai.provider.js';
import { OpenAIProvider } from './openai.provider.js';
import { GoogleProvider } from './google.provider.js';
import { FreepikProvider } from './freepik.provider.js';
import { ReplicateProvider } from './replicate.provider.js';
import { ElevenLabsProvider } from './elevenlabs.provider.js';
import { config } from '../../config/index.js';

export type AIProviderType = 'falai' | 'openai' | 'google' | 'freepik' | 'replicate' | 'elevenlabs';

export class AIProviderFactory {
  /**
   * Criar instância do provider
   */
  static create(
    provider: AIProviderType | string,
    apiKey?: string,
    model?: string
  ): BaseAIProvider {
    switch (provider) {
      case 'falai':
        return new FalAIProvider(
          apiKey || config.providers.falai.apiKey || '',
          model || 'flux-schnell'
        );

      case 'openai':
        return new OpenAIProvider(
          apiKey || config.providers.openai.apiKey || '',
          model || 'dall-e-3'
        );

      case 'google':
        return new GoogleProvider(
          apiKey || config.providers.google.apiKey || '',
          model || 'imagen-3'
        );

      case 'freepik':
        return new FreepikProvider(
          apiKey || config.providers.freepik.apiKey || '',
          model || 'mystic'
        );

      case 'replicate':
        return new ReplicateProvider(
          apiKey || config.providers.replicate?.apiKey || '',
          model || 'sdxl'
        );

      case 'elevenlabs':
        return new ElevenLabsProvider(
          apiKey || config.providers.elevenlabs.apiKey || '',
          model || 'eleven_multilingual_v2'
        );

      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * Obter chave API padrão para um provider
   */
  static getDefaultApiKey(provider: AIProviderType): string | undefined {
    switch (provider) {
      case 'falai':
        return config.providers.falai.apiKey;
      case 'openai':
        return config.providers.openai.apiKey;
      case 'google':
        return config.providers.google.apiKey;
      case 'freepik':
        return config.providers.freepik.apiKey;
      case 'replicate':
        return config.providers.replicate?.apiKey;
      case 'elevenlabs':
        return config.providers.elevenlabs.apiKey;
      default:
        return undefined;
    }
  }

  /**
   * Verificar se provider está disponível (tem chave configurada)
   */
  static isAvailable(provider: AIProviderType): boolean {
    const key = this.getDefaultApiKey(provider);
    return !!key && key.length > 0;
  }

  /**
   * Listar providers disponíveis
   */
  static getAvailableProviders(): AIProviderType[] {
    const providers: AIProviderType[] = ['falai', 'openai', 'google', 'freepik', 'replicate', 'elevenlabs'];
    return providers.filter(p => this.isAvailable(p));
  }
}

export { BaseAIProvider, FalAIProvider, OpenAIProvider, GoogleProvider, FreepikProvider, ReplicateProvider, ElevenLabsProvider };
export default AIProviderFactory;
