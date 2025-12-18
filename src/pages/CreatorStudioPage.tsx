import { useState, useEffect, useRef } from 'react';
import { Icons } from '../components/Icons';
import { useStore } from '../store';
import { freepikService } from '../services/freepikService';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

type StudioTab = 'image' | 'video' | 'audio' | 'tools';
type FilterType = 'all' | 'favorites' | 'recent';
type ReferenceType = 'style' | 'character' | 'upload';

// ========== IMAGE MODELS (Freepik API) ==========
// Endpoints confirmados: https://docs.freepik.com/api-reference/
const IMAGE_MODELS = [
  // Freepik Mystic (nativo, muito estável) - RECOMENDADO
  { id: 'mystic', name: 'Mystic', provider: 'freepik', icon: '🎨', description: 'Fotorrealista com LoRAs', badge: 'SUGGESTED', badgeColor: 'gray', endpoint: '/ai/mystic' },
  // Gemini (Google) - via Freepik
  { id: 'gemini-flash', name: 'Gemini 2.5 Flash', provider: 'freepik', icon: '🍌', description: 'Google Nano Banana', badge: 'NEW', badgeColor: 'green', endpoint: '/ai/gemini-2-5-flash-image-preview' },
  // Seedream (ByteDance)
  { id: 'seedream-v4-edit', name: 'Seedream 4 Edit', provider: 'freepik', icon: '✏️', description: 'Edicao com prompts', badge: 'NEW', badgeColor: 'blue', endpoint: '/ai/text-to-image/seedream-v4-edit' },
  { id: 'seedream-v4', name: 'Seedream 4', provider: 'freepik', icon: '🌟', description: '4K, multi-imagem', badge: 'TRENDING', badgeColor: 'green', endpoint: '/ai/text-to-image/seedream-v4' },
  { id: 'seedream', name: 'Seedream', provider: 'freepik', icon: '🌱', description: 'Criatividade excepcional', badge: '', badgeColor: '', endpoint: '/ai/text-to-image/seedream' },
  // Flux Models
  { id: 'flux-pro-v1-1', name: 'Flux Pro 1.1', provider: 'freepik', icon: '⚡', description: 'Alta qualidade', badge: 'TRENDING', badgeColor: 'green', endpoint: '/ai/text-to-image/flux-pro-v1-1' },
  { id: 'flux-dev', name: 'Flux Dev', provider: 'freepik', icon: '🔧', description: 'Desenvolvimento', badge: '', badgeColor: '', endpoint: '/ai/text-to-image/flux-dev' },
  { id: 'hyperflux', name: 'HyperFlux', provider: 'freepik', icon: '💨', description: 'Ultra rapido', badge: '', badgeColor: '', endpoint: '/ai/text-to-image/hyperflux' },
  // Classic Fast (endpoint padrão)
  { id: 'classic', name: 'Classic Fast', provider: 'freepik', icon: '🖼️', description: 'Rapido e versatil', badge: '', badgeColor: '', endpoint: '/ai/text-to-image' },
  // FAL.ai Models
  { id: 'flux-schnell', name: 'Flux Schnell', provider: 'falai', icon: '⚡', description: 'FAL.ai - Ultra rapido', badge: '', badgeColor: '' },
  // OpenAI
  { id: 'dall-e-3', name: 'DALL·E 3', provider: 'openai', icon: '🤖', description: 'OpenAI - Muito preciso', badge: '', badgeColor: '' },
];

// ========== VIDEO MODELS ==========
// Freepik + FAL.ai endpoints confirmados
const VIDEO_MODELS = [
  // Freepik Video (confirmados)
  { id: 'kling-v2-5-pro', name: 'Kling 2.5 Pro', provider: 'freepik', description: 'Kling via Freepik (melhor)', speed: 'slow', quality: 'highest', icon: '🎥', endpoint: '/ai/image-to-video/kling-v2-5-pro' },
  { id: 'kling-v2-1-pro', name: 'Kling 2.1 Pro', provider: 'freepik', description: 'Kling v2.1 Pro', speed: 'slow', quality: 'highest', icon: '🎬', endpoint: '/ai/image-to-video/kling-v2-1-pro' },
  { id: 'seedance-pro', name: 'Seedance Pro', provider: 'freepik', description: 'ByteDance 1080p', speed: 'medium', quality: 'high', icon: '🌟', endpoint: '/ai/image-to-video/seedance-pro-1080p' },
  { id: 'pixverse-v5', name: 'PixVerse V5', provider: 'freepik', description: 'Video extension', speed: 'fast', quality: 'high', icon: '🎞️', endpoint: '/ai/image-to-video/pixverse-v5' },
  { id: 'pixverse-transition', name: 'PixVerse Transition', provider: 'freepik', description: 'Video transition', speed: 'fast', quality: 'high', icon: '🔄', endpoint: '/ai/image-to-video/pixverse-v5-transition' },
  { id: 'minimax-hailuo', name: 'MiniMax Hailuo', provider: 'freepik', description: 'Alta fidelidade 1080p', speed: 'slow', quality: 'highest', icon: '✨', endpoint: '/ai/image-to-video/minimax-hailuo-02-1080p' },
  // FAL.ai Video (alternativo)
  { id: 'fal-ai/kling-video/v1.6/pro/image-to-video', name: 'Kling 1.6 (FAL)', provider: 'falai', description: 'FAL.ai Kling Pro', speed: 'slow', quality: 'highest', icon: '📽️' },
  { id: 'fal-ai/fast-svd-lcm', name: 'Fast SVD (FAL)', provider: 'falai', description: 'Video rapido', speed: 'fast', quality: 'good', icon: '⚡' },
];

// ========== AI TOOLS ==========
// Endpoints confirmados: https://docs.freepik.com/api-reference/
const AI_TOOLS = [
  { id: 'upscale', name: 'Upscale Magnific', icon: '🔍', description: 'Aumente resolucao ate 4x', color: 'blue', endpoint: '/ai/image-upscaler' },
  { id: 'upscale-precision', name: 'Upscale Precision V2', icon: '🔬', description: 'Upscale com detalhes', color: 'blue', endpoint: '/ai/image-upscaler-precision-v2' },
  { id: 'remove-bg', name: 'Remover Fundo', icon: '✂️', description: 'Remova fundos automaticamente', color: 'green', endpoint: '/ai/beta/remove-background' },
  { id: 'relight', name: 'Relight', icon: '💡', description: 'Mude a iluminacao', color: 'yellow', endpoint: '/ai/image-relight' },
  { id: 'style-transfer', name: 'Style Transfer', icon: '🖌️', description: 'Transfira estilos', color: 'cyan', endpoint: '/ai/image-style-transfer' },
  { id: 'expand', name: 'Expand Image', icon: '↔️', description: 'Expanda a imagem', color: 'purple', endpoint: '/ai/image-expand/flux-pro' },
  { id: 'image-to-prompt', name: 'Image to Prompt', icon: '📝', description: 'Extraia prompt da imagem', color: 'pink', endpoint: '/ai/image-to-prompt' },
  { id: 'improve-prompt', name: 'Melhorar Prompt', icon: '✨', description: 'Melhore seu prompt', color: 'orange', endpoint: '/ai/improve-prompt' },
  { id: 'skin-enhancer', name: 'Skin Enhancer', icon: '👤', description: 'Melhore a pele', color: 'rose', endpoint: '/ai/skin-enhancer/flexible' },
  { id: 'icon-gen', name: 'Gerar Icones', icon: '🎯', description: 'Crie icones com IA', color: 'indigo', endpoint: '/ai/text-to-icon/preview' },
  { id: 'sound-effects', name: 'Efeitos Sonoros', icon: '🔊', description: 'Gere efeitos sonoros', color: 'emerald', endpoint: '/ai/sound-effects' },
];

// ========== VOICES (ElevenLabs) ==========
const ELEVENLABS_VOICES = [
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', lang: 'pt-BR', gender: 'M' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', lang: 'en', gender: 'F' },
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', lang: 'en', gender: 'F' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', lang: 'en', gender: 'M' },
  { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam', lang: 'en', gender: 'M' },
];

// ========== SIZES ==========
const IMAGE_SIZES = [
  { id: '1:1', label: '1:1', icon: '⬜' },
  { id: '16:9', label: '16:9', icon: '🖥️' },
  { id: '9:16', label: '9:16', icon: '📱' },
  { id: '4:3', label: '4:3', icon: '📺' },
  { id: '3:4', label: '3:4', icon: '🖼️' },
];

// ========== QUALITY ==========
const IMAGE_QUALITY = [
  { id: '1k', label: '1K', credits: 2 },
  { id: '2k', label: '2K', credits: 8 },
  { id: '4k', label: '4K', credits: 16 },
];

interface GeneratedItem {
  id: string;
  type: 'image' | 'video' | 'audio' | 'tool';
  prompt: string;
  url: string;
  thumbnail?: string;
  status: 'generating' | 'completed' | 'error';
  error?: string;
  settings: Record<string, any>;
  createdAt: string;
  isFavorite?: boolean;
  progress?: number;
}

interface Reference {
  type: ReferenceType;
  url: string;
  name?: string;
}

export const CreatorStudioPage = () => {
  const { apiConfig } = useStore();
  const [activeTab, setActiveTab] = useState<StudioTab>('image');
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // History
  const [history, setHistory] = useState<GeneratedItem[]>(() => {
    const saved = localStorage.getItem('studio_history');
    return saved ? JSON.parse(saved) : [];
  });

  // Image state
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageModel, setImageModel] = useState('auto');
  const [imageSize, setImageSize] = useState('1:1');
  const [imageQuality, setImageQuality] = useState('2k');
  const [numImages, setNumImages] = useState(1);
  const [infinityMode, setInfinityMode] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageProgress, setImageProgress] = useState(0);
  const [showModelSelector, setShowModelSelector] = useState(false);

  // References (Style, Character, Upload)
  const [references, setReferences] = useState<Reference[]>([]);
  const [activeReferenceType, setActiveReferenceType] = useState<ReferenceType | null>(null);

  // Video state
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoModel, setVideoModel] = useState('fal-ai/kling-video/v1/standard/image-to-video');
  const [videoSourceImage, setVideoSourceImage] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState('5');
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);

  // Audio state
  const [audioText, setAudioText] = useState('');
  const [audioVoice, setAudioVoice] = useState('onwK4e9ZLuTAKqWW03F9');
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);

  // Tools state
  const [selectedTool, setSelectedTool] = useState('upscale');
  const [toolSourceImage, setToolSourceImage] = useState<string | null>(null);
  const [toolPrompt, setToolPrompt] = useState('');
  const [toolScale, setToolScale] = useState<2 | 4>(4);
  const [isProcessingTool, setIsProcessingTool] = useState(false);
  const [toolProgress, setToolProgress] = useState(0);

  // Save history
  useEffect(() => {
    localStorage.setItem('studio_history', JSON.stringify(history));
  }, [history]);

  // Progress simulation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGeneratingImage && imageProgress < 90) {
      interval = setInterval(() => {
        setImageProgress(prev => Math.min(prev + Math.random() * 15, 90));
      }, 500);
    }
    if (isGeneratingVideo && videoProgress < 90) {
      interval = setInterval(() => {
        setVideoProgress(prev => Math.min(prev + Math.random() * 8, 90));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isGeneratingImage, isGeneratingVideo, imageProgress, videoProgress]);

  // History helpers
  const addToHistory = (item: GeneratedItem) => setHistory(prev => [item, ...prev]);
  const updateHistoryItem = (id: string, updates: Partial<GeneratedItem>) => {
    setHistory(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };
  const deleteHistoryItem = (id: string) => setHistory(prev => prev.filter(item => item.id !== id));
  const toggleFavorite = (id: string) => {
    setHistory(prev => prev.map(item => item.id === id ? { ...item, isFavorite: !item.isFavorite } : item));
  };

  // Add reference
  const addReference = (type: ReferenceType, url: string, name?: string) => {
    // Remove existing of same type
    setReferences(prev => [...prev.filter(r => r.type !== type), { type, url, name }]);
    setActiveReferenceType(null);
  };

  // Remove reference
  const removeReference = (type: ReferenceType) => {
    setReferences(prev => prev.filter(r => r.type !== type));
  };

  // Handle file upload for references
  const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeReferenceType) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      addReference(activeReferenceType, dataUrl, file.name);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Map size to API format
  const mapSizeToApi = (size: string): string => {
    const map: Record<string, string> = {
      '1:1': 'square_1_1',
      '16:9': 'widescreen_16_9',
      '9:16': 'portrait_9_16',
      '4:3': 'classic_4_3',
      '3:4': 'traditional_3_4',
    };
    return map[size] || 'square_1_1';
  };

  // Get model endpoint from model object
  const getModelEndpoint = (model: typeof IMAGE_MODELS[0]): string => {
    return (model as any).endpoint || '/ai/mystic';
  };

  // Generate Image
  const generateImage = async () => {
    if (!imagePrompt.trim()) {
      toast.error('Digite um prompt para gerar');
      return;
    }

    const model = IMAGE_MODELS.find(m => m.id === imageModel);
    if (!model) {
      toast.error('Selecione um modelo');
      return;
    }

    // Check API keys with detailed messages
    if (model.provider === 'freepik') {
      if (!apiConfig.freepik_key) {
        toast.error('Configure a API Key do Freepik em Configurações > Integrações');
        return;
      }
      if (apiConfig.freepik_key.length < 10) {
        toast.error('API Key do Freepik parece inválida');
        return;
      }
    }
    if (model.provider === 'falai') {
      if (!apiConfig.falai_key) {
        toast.error('Configure a API Key do FAL.ai em Configurações > Integrações');
        return;
      }
    }
    if (model.provider === 'openai') {
      if (!apiConfig.openai_key) {
        toast.error('Configure a API Key da OpenAI em Configurações > Integrações');
        return;
      }
    }

    setIsGeneratingImage(true);
    setImageProgress(0);
    const itemId = uuidv4();

    addToHistory({
      id: itemId,
      type: 'image',
      prompt: imagePrompt,
      url: '',
      status: 'generating',
      progress: 0,
      settings: { model: model.id, size: imageSize, quality: imageQuality, numImages },
      createdAt: new Date().toISOString(),
    });

    try {
      let urls: string[] = [];

      if (model.provider === 'freepik') {
        freepikService.setApiKey(apiConfig.freepik_key!);

        // Get endpoint from model
        const endpoint = getModelEndpoint(model);
        const isMystic = endpoint === '/ai/mystic';

        // Build request body based on endpoint type
        const requestBody: any = {
          prompt: imagePrompt,
          num_images: numImages,
        };

        if (isMystic) {
          // Mystic uses different parameter format
          requestBody.image = { size: mapSizeToApi(imageSize) };
          if (imageQuality !== '1k') {
            requestBody.resolution = imageQuality;
          }
        } else {
          // Other endpoints use standard format
          // Map size to API format
          const sizeMap: Record<string, string> = {
            '1:1': 'square_1_1',
            '16:9': 'widescreen_16_9',
            '9:16': 'portrait_9_16',
            '4:3': 'landscape_4_3',
            '3:4': 'portrait_3_4',
          };
          requestBody.image = { size: sizeMap[imageSize] || 'square_1_1' };
        }

        // Make API request
        const response = await fetch(`https://api.freepik.com/v1${endpoint}`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'x-freepik-api-key': apiConfig.freepik_key!,
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          console.error('Freepik API error:', err);
          throw new Error(err.message || err.detail || err.error?.message || `Erro ${response.status}`);
        }

        const data = await response.json();
        console.log('Freepik response:', data);

        // Handle different response formats
        if (data.data?.id && data.data?.status !== 'COMPLETED') {
          // Async generation - poll for results
          freepikService.setApiKey(apiConfig.freepik_key!);
          const result = await freepikService.waitForGeneration(data.data.id);
          urls = result.data.generated?.map(g => g.url) || [];
        } else if (data.data?.generated) {
          // Direct response with generated images
          urls = data.data.generated.map((g: any) => g.url);
        } else if (data.data?.[0]?.base64) {
          // Base64 encoded images (Classic endpoint)
          urls = data.data.map((img: any) => `data:image/png;base64,${img.base64}`);
        } else if (data.images) {
          // Alternative format
          urls = data.images.map((img: any) => img.url || `data:image/png;base64,${img.base64}`);
        }
      } else if (model.provider === 'falai') {
        // FAL.ai Flux Schnell
        const sizeMap: Record<string, string> = {
          '1:1': 'square',
          '16:9': 'landscape_16_9',
          '9:16': 'portrait_9_16',
          '4:3': 'landscape_4_3',
          '3:4': 'portrait_4_3',
        };

        const response = await fetch('https://fal.run/fal-ai/flux/schnell', {
          method: 'POST',
          headers: {
            'Authorization': `Key ${apiConfig.falai_key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: imagePrompt,
            num_images: numImages,
            image_size: sizeMap[imageSize] || 'square',
            num_inference_steps: 4,
            enable_safety_checker: true,
          }),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.detail || err.message || 'Erro FAL.ai');
        }
        const data = await response.json();
        urls = data.images?.map((img: any) => img.url) || [];
      } else if (model.provider === 'openai') {
        const response = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiConfig.openai_key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'dall-e-3',
            prompt: imagePrompt,
            n: 1,
            size: '1024x1024',
            quality: 'standard',
          }),
        });

        if (!response.ok) throw new Error('Erro DALL-E 3');
        const data = await response.json();
        urls = data.data?.map((img: any) => img.url) || [];
      }

      setImageProgress(100);

      if (urls.length > 0) {
        updateHistoryItem(itemId, { url: urls[0], status: 'completed', progress: 100 });
        // Add extra images
        for (let i = 1; i < urls.length; i++) {
          addToHistory({
            id: uuidv4(),
            type: 'image',
            prompt: imagePrompt,
            url: urls[i],
            status: 'completed',
            settings: { model: model.id, size: imageSize, quality: imageQuality },
            createdAt: new Date().toISOString(),
          });
        }
        toast.success(`${urls.length} imagem(ns) gerada(s)!`);
      } else {
        throw new Error('Nenhuma imagem retornada');
      }
    } catch (error: any) {
      let errorMsg = error.message || 'Erro desconhecido';

      // Melhorar mensagens de erro comuns
      if (errorMsg === 'Failed to fetch' || errorMsg.includes('NetworkError')) {
        errorMsg = 'Erro de conexão. Verifique sua internet e tente novamente.';
      } else if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
        errorMsg = 'API Key inválida. Verifique suas credenciais nas Configurações.';
      } else if (errorMsg.includes('429') || errorMsg.includes('rate limit')) {
        errorMsg = 'Limite de requisições excedido. Aguarde alguns minutos.';
      } else if (errorMsg.includes('403')) {
        errorMsg = 'Sem permissão para este recurso. Verifique sua API Key.';
      }

      updateHistoryItem(itemId, { status: 'error', error: errorMsg });
      toast.error(errorMsg);
      console.error('Image generation error:', error);
    } finally {
      setIsGeneratingImage(false);
      setImageProgress(0);
    }
  };

  // Generate Video
  const generateVideo = async () => {
    if (!videoSourceImage) {
      toast.error('Adicione uma imagem para gerar video');
      return;
    }

    const model = VIDEO_MODELS.find(m => m.id === videoModel);
    if (!model) return;

    // Check API keys based on provider
    if (model.provider === 'freepik' && !apiConfig.freepik_key) {
      toast.error('Configure a API Key do Freepik em Integracoes');
      return;
    }
    if (model.provider === 'falai' && !apiConfig.falai_key) {
      toast.error('Configure a API Key do FAL.ai em Integracoes');
      return;
    }

    setIsGeneratingVideo(true);
    setVideoProgress(0);
    const itemId = uuidv4();

    addToHistory({
      id: itemId,
      type: 'video',
      prompt: videoPrompt || 'Image to Video',
      url: '',
      thumbnail: videoSourceImage,
      status: 'generating',
      progress: 0,
      settings: { model: videoModel, duration: videoDuration },
      createdAt: new Date().toISOString(),
    });

    try {
      let videoUrl = '';

      if (model.provider === 'freepik') {
        // Freepik Video API
        const endpoint = (model as any).endpoint;
        const requestBody: any = {
          image: videoSourceImage.startsWith('data:')
            ? videoSourceImage.split(',')[1]
            : videoSourceImage,
          prompt: videoPrompt || 'Smooth natural motion',
        };

        const response = await fetch(`https://api.freepik.com/v1${endpoint}`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'x-freepik-api-key': apiConfig.freepik_key!,
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          console.error('Freepik Video error:', error);
          throw new Error(error.message || error.detail || `Erro ${response.status}`);
        }

        const data = await response.json();
        console.log('Freepik Video response:', data);

        // Poll for result if async
        if (data.data?.id && data.data?.status !== 'COMPLETED') {
          // Poll for video completion
          let attempts = 0;
          const maxAttempts = 60; // 2 minutes max
          while (attempts < maxAttempts) {
            await new Promise(r => setTimeout(r, 2000));
            const statusRes = await fetch(`https://api.freepik.com/v1${endpoint}/${data.data.id}`, {
              headers: { 'x-freepik-api-key': apiConfig.freepik_key! },
            });
            const statusData = await statusRes.json();

            if (statusData.data?.status === 'COMPLETED') {
              videoUrl = statusData.data.video?.url || statusData.data.generated?.[0]?.url;
              break;
            }
            if (statusData.data?.status === 'FAILED') {
              throw new Error('Geracao do video falhou');
            }
            attempts++;
            setVideoProgress(Math.min(90, (attempts / maxAttempts) * 100));
          }
        } else if (data.data?.video?.url) {
          videoUrl = data.data.video.url;
        } else if (data.data?.generated?.[0]?.url) {
          videoUrl = data.data.generated[0].url;
        }
      } else {
        // FAL.ai Video API
        let requestBody: Record<string, any> = {};

        if (videoModel.includes('kling')) {
          requestBody = {
            image_url: videoSourceImage,
            prompt: videoPrompt || 'Smooth natural motion',
            duration: videoDuration,
            aspect_ratio: '16:9',
          };
        } else {
          requestBody = {
            image_url: videoSourceImage,
            motion_bucket_id: 127,
            fps: 7,
            cond_aug: 0.02,
          };
        }

        const response = await fetch('https://fal.run/' + videoModel, {
          method: 'POST',
          headers: {
            'Authorization': `Key ${apiConfig.falai_key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.detail || error.message || 'Erro ao gerar video');
        }

        const data = await response.json();
        videoUrl = data.video?.url || data.video_url || data.output?.video;
      }

      setVideoProgress(100);

      if (videoUrl) {
        updateHistoryItem(itemId, { url: videoUrl, status: 'completed', progress: 100 });
        toast.success('Video gerado!');
      } else {
        throw new Error('URL do video nao retornada');
      }
    } catch (error: any) {
      updateHistoryItem(itemId, { status: 'error', error: error.message });
      toast.error(`Erro: ${error.message}`);
    } finally {
      setIsGeneratingVideo(false);
      setVideoProgress(0);
    }
  };

  // Generate Audio
  const generateAudio = async () => {
    if (!audioText.trim()) {
      toast.error('Digite o texto');
      return;
    }
    if (!apiConfig.elevenlabs_key) {
      toast.error('Configure a API Key do ElevenLabs');
      return;
    }

    setIsGeneratingAudio(true);
    const itemId = uuidv4();

    addToHistory({
      id: itemId,
      type: 'audio',
      prompt: audioText.substring(0, 50) + '...',
      url: '',
      status: 'generating',
      settings: { voice: audioVoice },
      createdAt: new Date().toISOString(),
    });

    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${audioVoice}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiConfig.elevenlabs_key,
        },
        body: JSON.stringify({
          text: audioText,
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability: 0.5, similarity_boost: 0.8 },
        }),
      });

      if (!response.ok) throw new Error('Erro ElevenLabs');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      updateHistoryItem(itemId, { url: audioUrl, status: 'completed' });
      toast.success('Audio gerado!');
    } catch (error: any) {
      updateHistoryItem(itemId, { status: 'error', error: error.message });
      toast.error(`Erro: ${error.message}`);
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  // Process AI Tool
  const processAITool = async () => {
    if (!toolSourceImage) {
      toast.error('Selecione uma imagem');
      return;
    }
    if (!apiConfig.freepik_key) {
      toast.error('Configure a API Key do Freepik');
      return;
    }

    setIsProcessingTool(true);
    setToolProgress(0);
    const itemId = uuidv4();
    const tool = AI_TOOLS.find(t => t.id === selectedTool);

    addToHistory({
      id: itemId,
      type: 'tool',
      prompt: tool?.name || selectedTool,
      url: '',
      thumbnail: toolSourceImage,
      status: 'generating',
      settings: { tool: selectedTool },
      createdAt: new Date().toISOString(),
    });

    const progressInterval = setInterval(() => {
      setToolProgress(prev => Math.min(prev + Math.random() * 10, 90));
    }, 500);

    try {
      freepikService.setApiKey(apiConfig.freepik_key);
      let resultUrl = '';

      const imageBase64 = toolSourceImage.startsWith('data:')
        ? toolSourceImage.split(',')[1]
        : toolSourceImage;

      if (selectedTool === 'upscale') {
        const response = await freepikService.upscaleImage({ image: imageBase64, scale: toolScale, creativity: 0.3 });
        const result = await freepikService.waitForGeneration(response.data.id);
        resultUrl = result.data.generated?.[0]?.url || '';
      } else if (selectedTool === 'remove-bg') {
        const response = await freepikService.removeBackground(imageBase64);
        const result = await freepikService.waitForGeneration(response.data.id);
        resultUrl = result.data.generated?.[0]?.url || '';
      } else if (selectedTool === 'reimagine') {
        const response = await freepikService.reimagineImage({ image: imageBase64, prompt: toolPrompt, mode: 'creative', strength: 0.7 });
        const result = await freepikService.waitForGeneration(response.data.id);
        resultUrl = result.data.generated?.[0]?.url || '';
      } else if (selectedTool === 'recolor') {
        if (!toolPrompt.trim()) throw new Error('Digite as cores desejadas');
        const response = await freepikService.recolorImage({ image: imageBase64, prompt: toolPrompt });
        const result = await freepikService.waitForGeneration(response.data.id);
        resultUrl = result.data.generated?.[0]?.url || '';
      } else if (selectedTool === 'sketch') {
        if (!toolPrompt.trim()) throw new Error('Descreva a imagem');
        const response = await freepikService.sketchToImage({ image: imageBase64, prompt: toolPrompt, style: 'realistic' });
        const result = await freepikService.waitForGeneration(response.data.id);
        resultUrl = result.data.generated?.[0]?.url || '';
      } else if (selectedTool === 'relight') {
        const response = await freepikService.relightImage(imageBase64, toolPrompt.trim() || 'left');
        const result = await freepikService.waitForGeneration(response.data.id);
        resultUrl = result.data.generated?.[0]?.url || '';
      } else if (selectedTool === 'style-transfer') {
        const styleRef = references.find(r => r.type === 'style');
        if (!styleRef) throw new Error('Adicione uma imagem de estilo em References');
        const styleBase64 = styleRef.url.startsWith('data:') ? styleRef.url.split(',')[1] : styleRef.url;
        const response = await freepikService.styleTransfer(imageBase64, styleBase64);
        const result = await freepikService.waitForGeneration(response.data.id);
        resultUrl = result.data.generated?.[0]?.url || '';
      }

      clearInterval(progressInterval);
      setToolProgress(100);

      if (resultUrl) {
        updateHistoryItem(itemId, { url: resultUrl, status: 'completed' });
        toast.success(`${tool?.name} concluido!`);
      } else {
        throw new Error('Nenhum resultado');
      }
    } catch (error: any) {
      clearInterval(progressInterval);
      updateHistoryItem(itemId, { status: 'error', error: error.message });
      toast.error(`Erro: ${error.message}`);
    } finally {
      setIsProcessingTool(false);
      setToolProgress(0);
    }
  };

  // Use image for video/tool
  const useImageForVideo = (url: string) => {
    setVideoSourceImage(url);
    setActiveTab('video');
    toast.success('Imagem carregada');
  };

  const useImageForTool = (url: string) => {
    setToolSourceImage(url);
    setActiveTab('tools');
    toast.success('Imagem carregada');
  };

  // Download
  const downloadFile = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, '_blank');
    }
  };

  // Filter history
  const filteredHistory = history
    .filter(h => activeTab === 'tools' ? h.type === 'tool' : h.type === activeTab)
    .filter(h => {
      if (filter === 'favorites') return h.isFavorite;
      if (filter === 'recent') return new Date(h.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000);
      return true;
    })
    .filter(h => !searchQuery.trim() || h.prompt.toLowerCase().includes(searchQuery.toLowerCase()));

  const selectedModelData = IMAGE_MODELS.find(m => m.id === imageModel);

  return (
    <div className="h-full flex bg-gray-950">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleReferenceUpload}
      />

      {/* Left Panel - Controls */}
      <div className="w-[380px] border-r border-gray-800 flex flex-col bg-gray-900/50">
        {/* Header with Model Selector (Freepik style) */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Icons.Wand2 className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">AI Studio</h1>
              <p className="text-xs text-gray-500">Freepik + FAL.ai</p>
            </div>
          </div>

          {/* Model Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowModelSelector(!showModelSelector)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl hover:border-gray-600 transition"
            >
              <span className="text-xl">{selectedModelData?.icon || '✨'}</span>
              <div className="flex-1 text-left">
                <p className="text-white font-medium text-sm">{selectedModelData?.name || 'Auto'}</p>
                <p className="text-xs text-gray-500">{selectedModelData?.description}</p>
              </div>
              <Icons.ChevronDown size={18} className={clsx('text-gray-400 transition', showModelSelector && 'rotate-180')} />
            </button>

            {/* Model Dropdown Menu */}
            {showModelSelector && (
              <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl max-h-[400px] overflow-y-auto">
                {IMAGE_MODELS.filter(m => m.provider === 'freepik' || (m.provider === 'falai' && apiConfig.falai_key) || (m.provider === 'openai' && apiConfig.openai_key)).map((model) => (
                  <button
                    key={model.id}
                    onClick={() => { setImageModel(model.id); setShowModelSelector(false); }}
                    className={clsx(
                      'w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800 transition text-left',
                      imageModel === model.id && 'bg-gray-800'
                    )}
                  >
                    <span className="text-xl">{model.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium text-sm">{model.name}</p>
                        {model.badge && (
                          <span className={clsx(
                            'text-[10px] px-1.5 py-0.5 rounded font-medium',
                            model.badgeColor === 'green' ? 'bg-green-500/20 text-green-400' :
                            model.badgeColor === 'blue' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-gray-500/20 text-gray-400'
                          )}>
                            {model.badge}
                          </span>
                        )}
                        {(model as any).isLimited && <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">LIMITED</span>}
                      </div>
                      <p className="text-xs text-gray-500">{model.description}</p>
                    </div>
                    {imageModel === model.id && <Icons.Check size={16} className="text-green-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800">
          {[
            { id: 'image', label: 'Image', icon: Icons.Image },
            { id: 'video', label: 'Video', icon: Icons.Film },
            { id: 'audio', label: 'Audio', icon: Icons.Mic },
            { id: 'tools', label: 'Tools', icon: Icons.Zap },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as StudioTab)}
              className={clsx(
                'flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition',
                activeTab === tab.id ? 'text-white border-white' : 'text-gray-500 border-transparent hover:text-gray-300'
              )}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* IMAGE TAB */}
          {activeTab === 'image' && (
            <>
              {/* References Section (Freepik style) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-gray-500 font-medium uppercase tracking-wider">References</label>
                  <button className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                    <Icons.Plus size={12} /> Add
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(['style', 'character', 'upload'] as ReferenceType[]).map(type => {
                    const ref = references.find(r => r.type === type);
                    return (
                      <div key={type} className="relative">
                        {ref ? (
                          <div className="relative group">
                            <img src={ref.url} alt={type} className="w-full h-20 object-cover rounded-lg border border-gray-700" />
                            <button
                              onClick={() => removeReference(type)}
                              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                            >
                              <Icons.X size={12} className="text-white" />
                            </button>
                            <p className="text-[10px] text-gray-500 text-center mt-1 capitalize">{type}</p>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setActiveReferenceType(type); fileInputRef.current?.click(); }}
                            className="w-full h-20 border-2 border-dashed border-gray-700 rounded-lg flex flex-col items-center justify-center gap-1 hover:border-gray-600 transition"
                          >
                            {type === 'style' && <Icons.Star size={16} className="text-gray-500" />}
                            {type === 'character' && <Icons.User size={16} className="text-gray-500" />}
                            {type === 'upload' && <Icons.Upload size={16} className="text-gray-500" />}
                            <span className="text-[10px] text-gray-500 capitalize">{type}</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Prompt */}
              <div>
                <label className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2 block">Prompt</label>
                <textarea
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="Describe your image..."
                  rows={4}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none text-sm"
                />
              </div>
            </>
          )}

          {/* VIDEO TAB */}
          {activeTab === 'video' && (
            <>
              {/* Source Image */}
              <div>
                <label className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2 block">Source Image</label>
                {videoSourceImage ? (
                  <div className="relative group">
                    <img src={videoSourceImage} alt="Source" className="w-full h-40 object-cover rounded-xl" />
                    <button
                      onClick={() => setVideoSourceImage(null)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition"
                    >
                      <Icons.X size={14} className="text-white" />
                    </button>
                  </div>
                ) : (
                  <label className="block w-full h-40 border-2 border-dashed border-gray-700 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-gray-600 transition">
                    <Icons.Upload size={24} className="text-gray-500" />
                    <span className="text-sm text-gray-500">Upload image</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => setVideoSourceImage(ev.target?.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Video Prompt */}
              <div>
                <label className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2 block">Motion Prompt</label>
                <textarea
                  value={videoPrompt}
                  onChange={(e) => setVideoPrompt(e.target.value)}
                  placeholder="Describe the motion..."
                  rows={2}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none resize-none text-sm"
                />
              </div>

              {/* Video Model */}
              <div>
                <label className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2 block">Model</label>
                <div className="space-y-2">
                  {VIDEO_MODELS.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => setVideoModel(model.id)}
                      className={clsx(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition text-left',
                        videoModel === model.id ? 'bg-purple-500/20 border-purple-500' : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                      )}
                    >
                      <span className="text-lg">{model.icon}</span>
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium">{model.name}</p>
                        <p className="text-xs text-gray-500">{model.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2 block">Duration</label>
                <div className="flex gap-2">
                  {['5', '10'].map(dur => (
                    <button
                      key={dur}
                      onClick={() => setVideoDuration(dur)}
                      className={clsx(
                        'flex-1 py-2 rounded-lg text-sm font-medium transition',
                        videoDuration === dur ? 'bg-purple-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                      )}
                    >
                      {dur} sec
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* AUDIO TAB */}
          {activeTab === 'audio' && (
            <>
              <div>
                <label className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2 block">Text</label>
                <textarea
                  value={audioText}
                  onChange={(e) => setAudioText(e.target.value)}
                  placeholder="Enter text to convert to speech..."
                  rows={4}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-green-500 focus:outline-none resize-none text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2 block">Voice</label>
                <div className="grid grid-cols-2 gap-2">
                  {ELEVENLABS_VOICES.map((voice) => (
                    <button
                      key={voice.id}
                      onClick={() => setAudioVoice(voice.id)}
                      className={clsx(
                        'px-3 py-2 rounded-lg border text-sm transition',
                        audioVoice === voice.id ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                      )}
                    >
                      {voice.name} ({voice.lang})
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* TOOLS TAB */}
          {activeTab === 'tools' && (
            <>
              {/* Tool Selector */}
              <div>
                <label className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2 block">Tool</label>
                <div className="grid grid-cols-2 gap-2">
                  {AI_TOOLS.map((tool) => (
                    <button
                      key={tool.id}
                      onClick={() => setSelectedTool(tool.id)}
                      className={clsx(
                        'p-3 rounded-xl border text-left transition',
                        selectedTool === tool.id ? 'bg-blue-500/20 border-blue-500' : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                      )}
                    >
                      <span className="text-xl">{tool.icon}</span>
                      <p className="text-xs mt-1 text-white font-medium">{tool.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Source Image */}
              <div>
                <label className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2 block">Source Image</label>
                {toolSourceImage ? (
                  <div className="relative group">
                    <img src={toolSourceImage} alt="Source" className="w-full h-40 object-cover rounded-xl" />
                    <button
                      onClick={() => setToolSourceImage(null)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition"
                    >
                      <Icons.X size={14} className="text-white" />
                    </button>
                  </div>
                ) : (
                  <label className="block w-full h-40 border-2 border-dashed border-gray-700 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-gray-600 transition">
                    <Icons.Upload size={24} className="text-gray-500" />
                    <span className="text-sm text-gray-500">Upload image</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => setToolSourceImage(ev.target?.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Tool specific options */}
              {selectedTool === 'upscale' && (
                <div>
                  <label className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2 block">Scale</label>
                  <div className="flex gap-2">
                    {[2, 4].map(scale => (
                      <button
                        key={scale}
                        onClick={() => setToolScale(scale as 2 | 4)}
                        className={clsx(
                          'flex-1 py-2 rounded-lg text-sm font-medium transition',
                          toolScale === scale ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                        )}
                      >
                        {scale}x
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {['reimagine', 'recolor', 'sketch', 'relight'].includes(selectedTool) && (
                <div>
                  <label className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2 block">
                    {selectedTool === 'relight' ? 'Light Direction' : 'Description'}
                  </label>
                  <input
                    type="text"
                    value={toolPrompt}
                    onChange={(e) => setToolPrompt(e.target.value)}
                    placeholder={selectedTool === 'relight' ? 'left, right, top, bottom' : 'Describe...'}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer - Generate Button + Options (Freepik style) */}
        <div className="p-4 border-t border-gray-800 space-y-3">
          {/* Options Row */}
          {activeTab === 'image' && (
            <div className="flex items-center gap-2">
              {/* Quantity */}
              <div className="flex items-center gap-1 bg-gray-800 rounded-lg px-2 py-1.5">
                <button
                  onClick={() => setNumImages(Math.max(1, numImages - 1))}
                  disabled={numImages <= 1}
                  className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white disabled:opacity-50"
                >
                  -
                </button>
                <span className="w-6 text-center text-sm text-white font-medium">{numImages}</span>
                <button
                  onClick={() => setNumImages(Math.min(4, numImages + 1))}
                  disabled={numImages >= 4}
                  className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white disabled:opacity-50"
                >
                  +
                </button>
              </div>

              {/* Size */}
              <div className="flex items-center gap-1 bg-gray-800 rounded-lg px-2 py-1.5">
                {IMAGE_SIZES.map(size => (
                  <button
                    key={size.id}
                    onClick={() => setImageSize(size.id)}
                    className={clsx(
                      'px-2 py-0.5 rounded text-xs font-medium transition',
                      imageSize === size.id ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
                    )}
                  >
                    {size.label}
                  </button>
                ))}
              </div>

              {/* Quality */}
              <div className="flex items-center gap-1 bg-gray-800 rounded-lg px-2 py-1.5">
                {IMAGE_QUALITY.map(q => (
                  <button
                    key={q.id}
                    onClick={() => setImageQuality(q.id)}
                    className={clsx(
                      'px-2 py-0.5 rounded text-xs font-medium transition',
                      imageQuality === q.id ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
                    )}
                  >
                    {q.label}
                  </button>
                ))}
              </div>

              {/* Infinity Mode */}
              <button
                onClick={() => setInfinityMode(!infinityMode)}
                className={clsx(
                  'flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition',
                  infinityMode ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400'
                )}
              >
                ∞ {infinityMode ? 'ON' : 'OFF'}
              </button>
            </div>
          )}

          {/* Progress Bar */}
          {(isGeneratingImage || isGeneratingVideo || isProcessingTool) && (
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                style={{ width: `${activeTab === 'image' ? imageProgress : activeTab === 'video' ? videoProgress : toolProgress}%` }}
              />
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={() => {
              if (activeTab === 'image') generateImage();
              else if (activeTab === 'video') generateVideo();
              else if (activeTab === 'audio') generateAudio();
              else processAITool();
            }}
            disabled={isGeneratingImage || isGeneratingVideo || isGeneratingAudio || isProcessingTool}
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition"
          >
            {(isGeneratingImage || isGeneratingVideo || isGeneratingAudio || isProcessingTool) ? (
              <>
                <Icons.Loader size={18} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Icons.Sparkles size={18} />
                Generate
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right Panel - Gallery */}
      <div className="flex-1 flex flex-col">
        {/* Gallery Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Icons.Image size={18} />
              {activeTab === 'image' ? 'Images' : activeTab === 'video' ? 'Videos' : activeTab === 'audio' ? 'Audio' : 'Tools'}
              <span className="text-gray-500 font-normal">({filteredHistory.length})</span>
            </h2>
            <div className="flex gap-1">
              {(['all', 'favorites', 'recent'] as FilterType[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={clsx(
                    'px-3 py-1 rounded-lg text-xs font-medium transition',
                    filter === f ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-white'
                  )}
                >
                  {f === 'all' ? 'All' : f === 'favorites' ? '♥ Favorites' : '24h'}
                </button>
              ))}
            </div>
          </div>
          <div className="relative">
            <Icons.Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:border-gray-600 focus:outline-none w-48"
            />
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredHistory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500">
              <Icons.Image size={48} className="mb-4 opacity-50" />
              <p className="font-medium">No content yet</p>
              <p className="text-sm">Generate your first {activeTab}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredHistory.map((item) => (
                <div key={item.id} className="group relative bg-gray-900 rounded-xl overflow-hidden border border-gray-800 hover:border-gray-700 transition">
                  {item.status === 'generating' ? (
                    <div className="aspect-square flex flex-col items-center justify-center gap-3 bg-gray-800">
                      <Icons.Loader size={24} className="text-blue-400 animate-spin" />
                      <p className="text-xs text-gray-400">Generating...</p>
                      {item.progress !== undefined && (
                        <div className="w-20 h-1 bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500" style={{ width: `${item.progress}%` }} />
                        </div>
                      )}
                    </div>
                  ) : item.status === 'error' ? (
                    <div className="aspect-square flex flex-col items-center justify-center gap-2 bg-red-500/10">
                      <Icons.AlertTriangle size={24} className="text-red-400" />
                      <p className="text-xs text-red-400 text-center px-2">{item.error}</p>
                    </div>
                  ) : item.type === 'audio' ? (
                    <div className="aspect-square flex flex-col items-center justify-center gap-3 bg-gray-800">
                      <Icons.Mic size={32} className="text-green-400" />
                      <audio src={item.url} controls className="w-full px-2" />
                    </div>
                  ) : item.type === 'video' ? (
                    <video src={item.url} className="aspect-square object-cover" controls poster={item.thumbnail} />
                  ) : (
                    <img src={item.url} alt={item.prompt} className="aspect-square object-cover" />
                  )}

                  {/* Overlay Actions */}
                  {item.status === 'completed' && item.type !== 'audio' && (
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                      <button
                        onClick={() => toggleFavorite(item.id)}
                        className={clsx(
                          'p-2 rounded-lg transition',
                          item.isFavorite ? 'bg-red-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'
                        )}
                      >
                        <Icons.Heart size={16} />
                      </button>
                      <button
                        onClick={() => downloadFile(item.url, `${item.type}-${item.id}.${item.type === 'video' ? 'mp4' : 'png'}`)}
                        className="p-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition"
                      >
                        <Icons.Download size={16} />
                      </button>
                      {item.type === 'image' && (
                        <>
                          <button
                            onClick={() => useImageForVideo(item.url)}
                            className="p-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition"
                            title="Use for video"
                          >
                            <Icons.Film size={16} />
                          </button>
                          <button
                            onClick={() => useImageForTool(item.url)}
                            className="p-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition"
                            title="Use in tools"
                          >
                            <Icons.Zap size={16} />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => deleteHistoryItem(item.id)}
                        className="p-2 bg-red-500/80 text-white rounded-lg hover:bg-red-500 transition"
                      >
                        <Icons.Trash size={16} />
                      </button>
                    </div>
                  )}

                  {/* Prompt Preview */}
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                    <p className="text-xs text-white/80 line-clamp-2">{item.prompt}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
