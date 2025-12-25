// API Initializer - Configura todas as APIs automaticamente
// Este arquivo inicializa todas as APIs com as chaves configuradas

import { openRouterService } from './openRouterService';
import { falAI } from './falAIService';
import { elevenLabs } from './elevenLabsServiceV2';
import { freepikService } from './freepikServiceV2';
import { lateAPI } from './lateAPIService';
import { evolutionAPI, EvolutionConfig } from './evolutionAPIService';
import { n8nService } from './n8nService';
import { openaiAssistantsServiceV2 } from './openaiAssistantsServiceV2';

// Chaves de API (em produção, vir do .env ou backend seguro)
export interface APIKeys {
  openRouter?: string;
  openai?: string;
  falAI?: string;
  elevenLabs?: string;
  freepik?: string;
  lateAPI?: string;
  gemini?: string;
}

// Configuração da Evolution API
export interface EvolutionAPIConfig {
  baseUrl: string;
  apiKey: string;
  instanceName: string;
}

// Status de cada API
export interface APIStatus {
  name: string;
  configured: boolean;
  status: 'connected' | 'disconnected' | 'error' | 'unknown';
  message?: string;
}

class APIInitializer {
  private keys: APIKeys = {};
  private evolutionConfig: EvolutionAPIConfig | null = null;

  // Carregar chaves do localStorage ou usar padrão
  loadKeys(): APIKeys {
    const savedKeys = localStorage.getItem('api_keys');
    if (savedKeys) {
      this.keys = JSON.parse(savedKeys);
    }
    return this.keys;
  }

  // Salvar chaves no localStorage
  saveKeys(keys: APIKeys) {
    this.keys = keys;
    localStorage.setItem('api_keys', JSON.stringify(keys));
  }

  // Inicializar todas as APIs
  initializeAll(keys: APIKeys, evolutionConfig?: EvolutionAPIConfig) {
    console.log('[APIInitializer] Inicializando APIs...');

    // OpenRouter (Multi-Model AI)
    if (keys.openRouter) {
      openRouterService.setConfig({ apiKey: keys.openRouter });
      console.log('[APIInitializer] ✓ OpenRouter configurado');
    }

    // OpenAI Assistants
    if (keys.openai) {
      openaiAssistantsServiceV2.initialize(keys.openai);
      console.log('[APIInitializer] ✓ OpenAI Assistants configurado');
    }

    // FAL.AI (Image/Video Generation)
    if (keys.falAI) {
      falAI.setApiKey(keys.falAI);
      console.log('[APIInitializer] ✓ FAL.AI configurado');
    }

    // ElevenLabs (Text to Speech)
    if (keys.elevenLabs) {
      elevenLabs.setApiKey(keys.elevenLabs);
      console.log('[APIInitializer] ✓ ElevenLabs configurado');
    }

    // Freepik (Stock Images + Pikaso AI)
    if (keys.freepik) {
      freepikService.setApiKey(keys.freepik);
      console.log('[APIInitializer] ✓ Freepik configurado');
    }

    // Late API (Social Media Publishing)
    if (keys.lateAPI) {
      lateAPI.setApiKey(keys.lateAPI);
      console.log('[APIInitializer] ✓ Late API configurado');
    }

    // Evolution API (WhatsApp)
    if (evolutionConfig) {
      this.evolutionConfig = evolutionConfig;
      evolutionAPI.setConfig(evolutionConfig);
      console.log('[APIInitializer] ✓ Evolution API configurado');
    }

    // n8n (Automações)
    n8nService.setConfig({
      baseUrl: 'https://agenciabase.app.n8n.cloud',
      webhookPath: '/webhook',
    });
    console.log('[APIInitializer] ✓ n8n configurado');

    console.log('[APIInitializer] Todas as APIs inicializadas!');
  }

  // Verificar status de todas as APIs
  async checkAllStatus(): Promise<APIStatus[]> {
    const statuses: APIStatus[] = [];

    // OpenRouter
    statuses.push({
      name: 'OpenRouter',
      configured: openRouterService.isConfigured(),
      status: openRouterService.isConfigured() ? 'connected' : 'disconnected',
    });

    // OpenAI
    statuses.push({
      name: 'OpenAI Assistants',
      configured: openaiAssistantsServiceV2.isInitialized(),
      status: openaiAssistantsServiceV2.isInitialized() ? 'connected' : 'disconnected',
    });

    // FAL.AI
    statuses.push({
      name: 'FAL.AI',
      configured: falAI.isConfigured(),
      status: falAI.isConfigured() ? 'connected' : 'disconnected',
    });

    // ElevenLabs
    statuses.push({
      name: 'ElevenLabs',
      configured: elevenLabs.isConfigured(),
      status: elevenLabs.isConfigured() ? 'connected' : 'disconnected',
    });

    // Freepik
    statuses.push({
      name: 'Freepik',
      configured: freepikService.isConfigured(),
      status: freepikService.isConfigured() ? 'connected' : 'disconnected',
    });

    // Late API
    statuses.push({
      name: 'Late API',
      configured: lateAPI.isConfigured(),
      status: lateAPI.isConfigured() ? 'connected' : 'disconnected',
    });

    // Evolution API (verificar conexão WhatsApp)
    if (evolutionAPI.getConfig()) {
      try {
        const connected = await evolutionAPI.isConnected();
        statuses.push({
          name: 'Evolution API (WhatsApp)',
          configured: true,
          status: connected ? 'connected' : 'disconnected',
          message: connected ? 'WhatsApp conectado' : 'Escanear QR Code',
        });
      } catch (error: any) {
        statuses.push({
          name: 'Evolution API (WhatsApp)',
          configured: true,
          status: 'error',
          message: error.message,
        });
      }
    } else {
      statuses.push({
        name: 'Evolution API (WhatsApp)',
        configured: false,
        status: 'disconnected',
      });
    }

    // n8n
    try {
      const n8nStatus = await n8nService.testConnection();
      statuses.push({
        name: 'n8n',
        configured: true,
        status: n8nStatus.connected ? 'connected' : 'disconnected',
      });
    } catch {
      statuses.push({
        name: 'n8n',
        configured: true,
        status: 'error',
      });
    }

    return statuses;
  }

  // Obter serviços individuais (para uso em componentes)
  getServices() {
    return {
      openRouter: openRouterService,
      openaiAssistants: openaiAssistantsServiceV2,
      falAI,
      elevenLabs,
      freepik: freepikService,
      lateAPI,
      evolutionAPI,
      n8n: n8nService,
    };
  }
}

export const apiInitializer = new APIInitializer();

// Auto-inicializar com chaves do localStorage na carga
export function autoInitializeAPIs() {
  const keys = apiInitializer.loadKeys();
  
  // Tentar carregar configuração da Evolution API
  const savedEvolution = localStorage.getItem('evolution_config');
  const evolutionConfig = savedEvolution ? JSON.parse(savedEvolution) : undefined;

  apiInitializer.initializeAll(keys, evolutionConfig);
}

export default apiInitializer;
