import { useState, useEffect } from 'react';
import { Icons } from '../components/Icons';
import { useStore } from '../store';
import { freepikService, FREEPIK_STYLES, FREEPIK_SIZES, FREEPIK_COLORS, FREEPIK_LIGHTNINGS, FreepikGenerationRequest } from '../services/freepikService';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

type StudioTab = 'image' | 'video' | 'audio' | 'tools';
type FilterType = 'all' | 'favorites' | 'recent';

// AI Tools
const AI_TOOLS = [
  { id: 'upscale', name: 'Upscale 4x', icon: '🔍', description: 'Aumente resolucao em ate 4x', color: 'blue' },
  { id: 'remove-bg', name: 'Remover Fundo', icon: '✂️', description: 'Remova o fundo', color: 'green' },
  { id: 'sketch', name: 'Sketch to Image', icon: '✏️', description: 'Esbocos em imagens', color: 'purple' },
  { id: 'reimagine', name: 'Reimaginar', icon: '🔄', description: 'Novo estilo na imagem', color: 'pink' },
  { id: 'recolor', name: 'Recolorir', icon: '🎨', description: 'Mude as cores', color: 'orange' },
  { id: 'relight', name: 'Relight', icon: '💡', description: 'Mude a iluminacao', color: 'yellow' },
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

// ElevenLabs Voices
const ELEVENLABS_VOICES = [
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', lang: 'pt-BR', gender: 'Masculino', preview: '' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', lang: 'en', gender: 'Feminino', preview: '' },
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', lang: 'en', gender: 'Feminino', preview: '' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', lang: 'en', gender: 'Masculino', preview: '' },
  { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam', lang: 'en', gender: 'Masculino', preview: '' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', lang: 'en', gender: 'Feminino', preview: '' },
];

// Video Models - FAL.ai
const VIDEO_MODELS = [
  { id: 'fal-ai/fast-svd-lcm', name: 'Fast SVD', provider: 'falai', description: 'Video rapido (2-4s)', speed: 'fast', quality: 'good', icon: '⚡' },
  { id: 'fal-ai/stable-video', name: 'Stable Video', provider: 'falai', description: 'Alta qualidade (4s)', speed: 'medium', quality: 'high', icon: '🎬' },
  { id: 'fal-ai/animatediff-v2v', name: 'AnimateDiff', provider: 'falai', description: 'Animacao estilizada', speed: 'slow', quality: 'highest', icon: '✨' },
  { id: 'fal-ai/kling-video/v1/standard/image-to-video', name: 'Kling 1.0', provider: 'falai', description: 'Kling AI Standard (5s)', speed: 'medium', quality: 'high', icon: '🎥' },
  { id: 'fal-ai/minimax/video-01/image-to-video', name: 'Minimax Video', provider: 'falai', description: 'Alta fidelidade', speed: 'slow', quality: 'highest', icon: '🌟' },
];

// Image Models
const IMAGE_MODELS = [
  { id: 'freepik-mystic', name: 'Freepik Mystic', provider: 'freepik', icon: '🎨', description: 'Alta qualidade, estilos variados' },
  { id: 'flux-schnell', name: 'Flux Schnell', provider: 'falai', icon: '⚡', description: 'Ultra rapido (1-4 steps)' },
  { id: 'flux-dev', name: 'Flux Dev', provider: 'falai', icon: '🔥', description: 'Maior qualidade, mais lento' },
  { id: 'dall-e-3', name: 'DALL·E 3', provider: 'openai', icon: '🤖', description: 'OpenAI, muito preciso' },
];

export const CreatorStudioPage = () => {
  const { apiConfig } = useStore();
  const [activeTab, setActiveTab] = useState<StudioTab>('image');
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Generation history (persisted)
  const [history, setHistory] = useState<GeneratedItem[]>(() => {
    const saved = localStorage.getItem('studio_history');
    return saved ? JSON.parse(saved) : [];
  });

  // Image generation state
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageModel, setImageModel] = useState('freepik-mystic');
  const [imageStyle, setImageStyle] = useState('photo');
  const [imageSize, setImageSize] = useState('square_1_1');
  const [imageColor, setImageColor] = useState<string | undefined>(undefined);
  const [imageLighting, setImageLighting] = useState<string | undefined>(undefined);
  const [negativePrompt, setNegativePrompt] = useState('blurry, ugly, distorted, low quality, watermark, text');
  const [numImages, setNumImages] = useState(1);
  const [guidanceScale, setGuidanceScale] = useState(7.5);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageProgress, setImageProgress] = useState(0);
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState(false);

  // Video generation state
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoModel, setVideoModel] = useState('fal-ai/fast-svd-lcm');
  const [videoSourceImage, setVideoSourceImage] = useState<string | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);

  // Audio generation state
  const [audioText, setAudioText] = useState('');
  const [audioVoice, setAudioVoice] = useState('onwK4e9ZLuTAKqWW03F9');
  const [audioSpeed, setAudioSpeed] = useState(1.0);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);

  // Reference image for style transfer
  const [referenceImage, setReferenceImage] = useState<string | null>(null);

  // Advanced settings
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Tools state
  const [selectedTool, setSelectedTool] = useState<string>('upscale');
  const [toolSourceImage, setToolSourceImage] = useState<string | null>(null);
  const [toolPrompt, setToolPrompt] = useState('');
  const [toolScale, setToolScale] = useState<2 | 4>(4);
  const [isProcessingTool, setIsProcessingTool] = useState(false);
  const [toolProgress, setToolProgress] = useState(0);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('studio_history', JSON.stringify(history));
  }, [history]);

  // Simulate progress
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

  // Add item to history
  const addToHistory = (item: GeneratedItem) => {
    setHistory(prev => [item, ...prev]);
  };

  // Update item in history
  const updateHistoryItem = (id: string, updates: Partial<GeneratedItem>) => {
    setHistory(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  // Delete item from history
  const deleteHistoryItem = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  // Toggle favorite
  const toggleFavorite = (id: string) => {
    setHistory(prev => prev.map(item =>
      item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
    ));
  };

  // Enhance prompt with AI
  const enhancePrompt = async () => {
    if (!imagePrompt.trim()) {
      toast.error('Digite um prompt primeiro');
      return;
    }

    setIsEnhancingPrompt(true);
    try {
      // Try to use Gemini or OpenRouter for enhancement
      const enhanceSystemPrompt = `Voce e um especialista em prompts para geracao de imagens com IA.
      Melhore o prompt do usuario adicionando detalhes artisticos, tecnicos e descritivos que resultarao em uma imagem de alta qualidade.
      Mantenha a ideia original mas adicione: iluminacao, composicao, estilo artistico, cores, atmosfera, detalhes.
      Retorne APENAS o prompt melhorado, sem explicacoes.`;

      let enhanced = imagePrompt;

      if (apiConfig.gemini_key) {
        const { sendMessageToGemini } = await import('../services/geminiService');
        enhanced = await sendMessageToGemini(
          `Melhore este prompt de imagem: "${imagePrompt}"`,
          enhanceSystemPrompt,
          apiConfig.gemini_key
        );
      } else if (apiConfig.openrouter_key) {
        const { openrouterService } = await import('../services/openrouterService');
        openrouterService.setApiKey(apiConfig.openrouter_key);
        enhanced = await openrouterService.chat('google/gemma-2-9b-it:free', [
          { role: 'system', content: enhanceSystemPrompt },
          { role: 'user', content: `Melhore este prompt de imagem: "${imagePrompt}"` }
        ]);
      } else {
        toast.error('Configure Gemini ou OpenRouter para usar esta funcao');
        return;
      }

      setImagePrompt(enhanced);
      toast.success('Prompt melhorado!');
    } catch (error: any) {
      toast.error('Erro ao melhorar prompt');
    } finally {
      setIsEnhancingPrompt(false);
    }
  };

  // Generate Image
  const generateImage = async () => {
    if (!imagePrompt.trim()) {
      toast.error('Digite um prompt para gerar a imagem');
      return;
    }

    const model = IMAGE_MODELS.find(m => m.id === imageModel);
    if (!model) return;

    // Check API key
    if (model.provider === 'freepik' && !apiConfig.freepik_key) {
      toast.error('Configure a API Key da Freepik em Admin > Integracoes');
      return;
    }
    if (model.provider === 'falai' && !apiConfig.falai_key) {
      toast.error('Configure a API Key do FAL.ai em Admin > Integracoes');
      return;
    }
    if (model.provider === 'openai' && !apiConfig.openai_key) {
      toast.error('Configure a API Key da OpenAI em Admin > Integracoes');
      return;
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
      settings: { model: model.id, style: imageStyle, size: imageSize, color: imageColor, negative: negativePrompt },
      createdAt: new Date().toISOString(),
    });

    try {
      let urls: string[] = [];

      if (model.provider === 'freepik') {
        freepikService.setApiKey(apiConfig.freepik_key!);

        const request: FreepikGenerationRequest = {
          prompt: imagePrompt,
          negative_prompt: negativePrompt,
          guidance_scale: guidanceScale,
          num_images: numImages,
          image: { size: imageSize as any },
          styling: {
            style: imageStyle as any,
            color: imageColor as any,
            lightning: imageLighting as any,
          },
        };

        urls = await freepikService.generateAndWait(request);
      } else if (model.provider === 'falai') {
        // Determinar endpoint baseado no modelo
        const falEndpoint = model.id === 'flux-dev'
          ? 'https://fal.run/fal-ai/flux/dev'
          : 'https://fal.run/fal-ai/flux/schnell';

        // Mapear tamanhos para formato FAL.ai
        const sizeMap: Record<string, string> = {
          'square_1_1': 'square',
          'widescreen_16_9': 'landscape_16_9',
          'portrait_9_16': 'portrait_9_16',
          'classic_4_3': 'landscape_4_3',
          'traditional_3_4': 'portrait_4_3',
        };

        const response = await fetch(falEndpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Key ${apiConfig.falai_key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: imagePrompt,
            num_images: numImages,
            image_size: sizeMap[imageSize] || 'square',
            num_inference_steps: model.id === 'flux-dev' ? 28 : 4,
            guidance_scale: model.id === 'flux-dev' ? 3.5 : undefined,
            enable_safety_checker: true,
          }),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.detail || err.message || 'Erro ao gerar imagem no FAL.ai');
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

        if (!response.ok) throw new Error('Erro ao gerar imagem');
        const data = await response.json();
        urls = data.data?.map((img: any) => img.url) || [];
      }

      setImageProgress(100);

      if (urls.length > 0) {
        updateHistoryItem(itemId, { url: urls[0], status: 'completed', progress: 100 });

        for (let i = 1; i < urls.length; i++) {
          addToHistory({
            id: uuidv4(),
            type: 'image',
            prompt: imagePrompt,
            url: urls[i],
            status: 'completed',
            settings: { model: model.id, style: imageStyle, size: imageSize, color: imageColor, negative: negativePrompt },
            createdAt: new Date().toISOString(),
          });
        }

        toast.success(`${urls.length} imagem(ns) gerada(s)!`);
      } else {
        throw new Error('Nenhuma imagem retornada');
      }
    } catch (error: any) {
      updateHistoryItem(itemId, { status: 'error', error: error.message });
      toast.error(`Erro: ${error.message}`);
    } finally {
      setIsGeneratingImage(false);
      setImageProgress(0);
    }
  };

  // Generate Video with FAL.ai
  const generateVideo = async () => {
    if (!videoSourceImage && !videoPrompt.trim()) {
      toast.error('Adicione uma imagem ou digite um prompt');
      return;
    }
    if (!apiConfig.falai_key) {
      toast.error('Configure a API Key do FAL.ai em Admin > Integracoes');
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
      thumbnail: videoSourceImage || undefined,
      status: 'generating',
      progress: 0,
      settings: { model: videoModel, sourceImage: !!videoSourceImage },
      createdAt: new Date().toISOString(),
    });

    try {
      // Configurar body baseado no modelo
      let requestBody: Record<string, any> = {};

      if (videoModel.includes('kling')) {
        // Kling AI
        requestBody = {
          image_url: videoSourceImage,
          prompt: videoPrompt || 'Smooth natural motion',
          duration: '5',
          aspect_ratio: '16:9',
        };
      } else if (videoModel.includes('minimax')) {
        // Minimax
        requestBody = {
          image_url: videoSourceImage,
          prompt: videoPrompt || 'Natural motion',
        };
      } else if (videoModel.includes('animatediff')) {
        // AnimateDiff
        requestBody = {
          image_url: videoSourceImage,
          prompt: videoPrompt,
          num_inference_steps: 25,
        };
      } else {
        // SVD / Stable Video padrão
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
      const videoUrl = data.video?.url || data.video_url || data.output?.video;

      setVideoProgress(100);

      if (videoUrl) {
        updateHistoryItem(itemId, { url: videoUrl, status: 'completed', progress: 100 });
        toast.success('Video gerado com sucesso!');
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

  // Generate Audio with ElevenLabs
  const generateAudio = async () => {
    if (!audioText.trim()) {
      toast.error('Digite o texto para gerar o audio');
      return;
    }
    if (!apiConfig.elevenlabs_key) {
      toast.error('Configure a API Key do ElevenLabs em Admin > Integracoes');
      return;
    }

    setIsGeneratingAudio(true);
    const itemId = uuidv4();

    addToHistory({
      id: itemId,
      type: 'audio',
      prompt: audioText.substring(0, 100) + (audioText.length > 100 ? '...' : ''),
      url: '',
      status: 'generating',
      settings: { voice: audioVoice, voiceName: ELEVENLABS_VOICES.find(v => v.id === audioVoice)?.name, speed: audioSpeed },
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
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            speed: audioSpeed,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
        throw new Error(error.detail?.message || error.message || 'Erro ao gerar audio');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      updateHistoryItem(itemId, { url: audioUrl, status: 'completed' });
      toast.success('Audio gerado com sucesso!');
    } catch (error: any) {
      updateHistoryItem(itemId, { status: 'error', error: error.message });
      toast.error(`Erro: ${error.message}`);
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'reference' | 'video' | 'tool') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (target === 'reference') {
        setReferenceImage(dataUrl);
      } else if (target === 'video') {
        setVideoSourceImage(dataUrl);
      } else {
        setToolSourceImage(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  // Process AI Tool
  const processAITool = async () => {
    if (!toolSourceImage) {
      toast.error('Selecione uma imagem primeiro');
      return;
    }

    // Check if Freepik API is configured (required for tools)
    if (!apiConfig.freepik_key) {
      toast.error('Configure a API Key da Freepik em Admin > Integracoes');
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
      settings: { tool: selectedTool, scale: toolScale, prompt: toolPrompt },
      createdAt: new Date().toISOString(),
    });

    // Simulate progress
    const progressInterval = setInterval(() => {
      setToolProgress(prev => Math.min(prev + Math.random() * 10, 90));
    }, 500);

    try {
      freepikService.setApiKey(apiConfig.freepik_key);
      let resultUrl = '';

      // Convert dataURL to base64 if needed
      const imageBase64 = toolSourceImage.startsWith('data:')
        ? toolSourceImage.split(',')[1]
        : toolSourceImage;

      if (selectedTool === 'upscale') {
        const response = await freepikService.upscaleImage({
          image: imageBase64,
          scale: toolScale,
          creativity: 0.3,
        });
        // Poll for result
        const result = await freepikService.waitForGeneration(response.data.id);
        resultUrl = result.data.generated?.[0]?.url || '';
      } else if (selectedTool === 'remove-bg') {
        const response = await freepikService.removeBackground(imageBase64);
        const result = await freepikService.waitForGeneration(response.data.id);
        resultUrl = result.data.generated?.[0]?.url || '';
      } else if (selectedTool === 'sketch') {
        if (!toolPrompt.trim()) {
          throw new Error('Digite uma descricao para a imagem');
        }
        const response = await freepikService.sketchToImage({
          image: imageBase64,
          prompt: toolPrompt,
          style: 'realistic',
        });
        const result = await freepikService.waitForGeneration(response.data.id);
        resultUrl = result.data.generated?.[0]?.url || '';
      } else if (selectedTool === 'reimagine') {
        const response = await freepikService.reimagineImage({
          image: imageBase64,
          prompt: toolPrompt,
          mode: 'creative',
          strength: 0.7,
        });
        const result = await freepikService.waitForGeneration(response.data.id);
        resultUrl = result.data.generated?.[0]?.url || '';
      } else if (selectedTool === 'recolor') {
        if (!toolPrompt.trim()) {
          throw new Error('Digite as cores desejadas');
        }
        const response = await freepikService.recolorImage({
          image: imageBase64,
          prompt: toolPrompt,
        });
        const result = await freepikService.waitForGeneration(response.data.id);
        resultUrl = result.data.generated?.[0]?.url || '';
      } else if (selectedTool === 'relight') {
        const lightDirection = toolPrompt.trim() || 'left';
        const response = await freepikService.relightImage(imageBase64, lightDirection);
        const result = await freepikService.waitForGeneration(response.data.id);
        resultUrl = result.data.generated?.[0]?.url || '';
      } else {
        throw new Error('Ferramenta nao implementada');
      }

      clearInterval(progressInterval);
      setToolProgress(100);

      if (resultUrl) {
        updateHistoryItem(itemId, { url: resultUrl, status: 'completed' });
        toast.success(`${tool?.name} concluido!`);
      } else {
        throw new Error('Nenhum resultado retornado');
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

  // Use image for tool
  const useImageForTool = (imageUrl: string) => {
    setToolSourceImage(imageUrl);
    setActiveTab('tools');
    toast.success('Imagem carregada para ferramentas');
  };

  // Use generated image for video
  const useImageForVideo = (imageUrl: string) => {
    setVideoSourceImage(imageUrl);
    setActiveTab('video');
    toast.success('Imagem adicionada para gerar video');
  };

  // Download file
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

  // Filter and search history
  const filteredHistory = history
    .filter(h => activeTab === 'tools' ? h.type === 'tool' : h.type === activeTab)
    .filter(h => {
      if (filter === 'favorites') return h.isFavorite;
      if (filter === 'recent') return new Date(h.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000);
      return true;
    })
    .filter(h => {
      if (!searchQuery.trim()) return true;
      return h.prompt.toLowerCase().includes(searchQuery.toLowerCase());
    });

  return (
    <div className="h-full flex bg-gray-950">
      {/* Left Sidebar - Controls */}
      <div className="w-[420px] border-r border-gray-800 flex flex-col bg-gray-900/50">
        {/* Header */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Icons.Wand2 className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">AI Studio</h1>
              <p className="text-xs text-gray-500">Crie conteudo incrivel com IA</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800">
          <button
            onClick={() => setActiveTab('image')}
            className={clsx(
              'flex-1 py-3.5 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition',
              activeTab === 'image' ? 'text-pink-400 border-pink-400 bg-pink-500/5' : 'text-gray-400 border-transparent hover:text-white'
            )}
          >
            <Icons.Image size={18} />
            Imagem
          </button>
          <button
            onClick={() => setActiveTab('video')}
            className={clsx(
              'flex-1 py-3.5 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition',
              activeTab === 'video' ? 'text-purple-400 border-purple-400 bg-purple-500/5' : 'text-gray-400 border-transparent hover:text-white'
            )}
          >
            <Icons.Film size={18} />
            Video
          </button>
          <button
            onClick={() => setActiveTab('audio')}
            className={clsx(
              'flex-1 py-3.5 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition',
              activeTab === 'audio' ? 'text-green-400 border-green-400 bg-green-500/5' : 'text-gray-400 border-transparent hover:text-white'
            )}
          >
            <Icons.Mic size={18} />
            Audio
          </button>
          <button
            onClick={() => setActiveTab('tools')}
            className={clsx(
              'flex-1 py-3.5 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition',
              activeTab === 'tools' ? 'text-blue-400 border-blue-400 bg-blue-500/5' : 'text-gray-400 border-transparent hover:text-white'
            )}
          >
            <Icons.Zap size={18} />
            Tools
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* IMAGE TAB */}
          {activeTab === 'image' && (
            <>
              {/* Model Selector */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block font-medium">Modelo de IA</label>
                <div className="grid grid-cols-3 gap-2">
                  {IMAGE_MODELS.map((model) => {
                    const isConfigured =
                      (model.provider === 'freepik' && apiConfig.freepik_key) ||
                      (model.provider === 'falai' && apiConfig.falai_key) ||
                      (model.provider === 'openai' && apiConfig.openai_key);

                    return (
                      <button
                        key={model.id}
                        onClick={() => setImageModel(model.id)}
                        disabled={!isConfigured}
                        className={clsx(
                          'p-3 rounded-xl border text-center transition relative',
                          imageModel === model.id
                            ? 'bg-pink-500/20 border-pink-500'
                            : isConfigured
                            ? 'bg-gray-800 border-gray-700 hover:border-gray-600'
                            : 'bg-gray-800/50 border-gray-800 opacity-50 cursor-not-allowed'
                        )}
                      >
                        <span className="text-2xl">{model.icon}</span>
                        <p className="text-xs mt-1 text-white font-medium">{model.name}</p>
                        {!isConfigured && (
                          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Prompt with Enhance */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-gray-400 font-medium">Prompt</label>
                  <button
                    onClick={enhancePrompt}
                    disabled={isEnhancingPrompt || !imagePrompt.trim()}
                    className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 disabled:opacity-50"
                  >
                    {isEnhancingPrompt ? (
                      <Icons.Loader size={12} className="animate-spin" />
                    ) : (
                      <Icons.Sparkles size={12} />
                    )}
                    Melhorar com IA
                  </button>
                </div>
                <textarea
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="Descreva a imagem que deseja criar em detalhes..."
                  rows={4}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-pink-500 focus:outline-none resize-none"
                />
              </div>

              {/* Negative Prompt */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block font-medium">Prompt Negativo</label>
                <input
                  type="text"
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  placeholder="O que evitar na imagem..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:border-pink-500 focus:outline-none"
                />
              </div>

              {/* Style Selector */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block font-medium">Estilo Artistico</label>
                <div className="grid grid-cols-3 gap-2">
                  {FREEPIK_STYLES.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setImageStyle(style.id)}
                      className={clsx(
                        'p-2.5 rounded-xl border text-center transition',
                        imageStyle === style.id
                          ? 'bg-pink-500/20 border-pink-500 text-pink-400'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                      )}
                    >
                      <span className="text-xl">{style.icon}</span>
                      <p className="text-xs mt-1 font-medium">{style.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Size */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block font-medium">Tamanho / Aspecto</label>
                <div className="grid grid-cols-5 gap-2">
                  {FREEPIK_SIZES.map((size) => (
                    <button
                      key={size.id}
                      onClick={() => setImageSize(size.id)}
                      className={clsx(
                        'p-2 rounded-lg border text-center transition',
                        imageSize === size.id
                          ? 'bg-pink-500/20 border-pink-500 text-pink-400'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                      )}
                    >
                      <span className="text-lg">{size.icon}</span>
                      <p className="text-[10px] mt-0.5">{size.label.split(' ')[0]}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced Settings Toggle */}
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full py-2 text-sm text-gray-400 hover:text-white flex items-center justify-center gap-2"
              >
                <Icons.Settings size={14} />
                Configuracoes Avancadas
                {showAdvanced ? <Icons.ChevronUp size={14} /> : <Icons.ChevronDown size={14} />}
              </button>

              {showAdvanced && (
                <div className="space-y-4 pt-2 border-t border-gray-800">
                  {/* Color */}
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block font-medium">Paleta de Cores</label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setImageColor(undefined)}
                        className={clsx(
                          'px-3 py-1.5 rounded-lg border text-xs transition',
                          !imageColor ? 'bg-pink-500/20 border-pink-500 text-pink-400' : 'bg-gray-800 border-gray-700 text-gray-400'
                        )}
                      >
                        Auto
                      </button>
                      {FREEPIK_COLORS.map((color) => (
                        <button
                          key={color.id}
                          onClick={() => setImageColor(color.id)}
                          className={clsx(
                            'px-3 py-1.5 rounded-lg border text-xs transition flex items-center gap-1.5',
                            imageColor === color.id ? 'bg-pink-500/20 border-pink-500 text-pink-400' : 'bg-gray-800 border-gray-700 text-gray-400'
                          )}
                        >
                          <span
                            className="w-3 h-3 rounded-full border border-gray-600"
                            style={{ background: color.color }}
                          />
                          {color.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Lighting */}
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block font-medium">Iluminacao</label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setImageLighting(undefined)}
                        className={clsx(
                          'px-3 py-1.5 rounded-lg border text-xs transition',
                          !imageLighting ? 'bg-pink-500/20 border-pink-500 text-pink-400' : 'bg-gray-800 border-gray-700 text-gray-400'
                        )}
                      >
                        Auto
                      </button>
                      {FREEPIK_LIGHTNINGS.map((light) => (
                        <button
                          key={light.id}
                          onClick={() => setImageLighting(light.id)}
                          className={clsx(
                            'px-3 py-1.5 rounded-lg border text-xs transition',
                            imageLighting === light.id ? 'bg-pink-500/20 border-pink-500 text-pink-400' : 'bg-gray-800 border-gray-700 text-gray-400'
                          )}
                        >
                          {light.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Guidance Scale */}
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block font-medium">
                      Fidelidade ao Prompt: {guidanceScale.toFixed(1)}
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={20}
                      step={0.5}
                      value={guidanceScale}
                      onChange={(e) => setGuidanceScale(parseFloat(e.target.value))}
                      className="w-full accent-pink-500"
                    />
                    <div className="flex justify-between text-xs text-gray-600 mt-1">
                      <span>Criativo</span>
                      <span>Preciso</span>
                    </div>
                  </div>

                  {/* Number of Images */}
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block font-medium">Quantidade</label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setNumImages(Math.max(1, numImages - 1))}
                        disabled={numImages <= 1}
                        className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-700 text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-lg font-bold transition"
                      >
                        -
                      </button>
                      <span className="w-12 text-center text-2xl font-bold text-white">{numImages}</span>
                      <button
                        onClick={() => setNumImages(Math.min(4, numImages + 1))}
                        disabled={numImages >= 4}
                        className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-700 text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-lg font-bold transition"
                      >
                        +
                      </button>
                      <span className="text-xs text-gray-500">max 4</span>
                    </div>
                  </div>

                  {/* Reference Image */}
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block font-medium">Imagem de Referencia</label>
                    {referenceImage ? (
                      <div className="relative">
                        <img src={referenceImage} alt="Reference" className="w-full h-32 object-cover rounded-xl" />
                        <button
                          onClick={() => setReferenceImage(null)}
                          className="absolute top-2 right-2 p-1.5 bg-red-500 rounded-lg text-white"
                        >
                          <Icons.X size={14} />
                        </button>
                      </div>
                    ) : (
                      <label className="block cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, 'reference')}
                          className="hidden"
                        />
                        <div className="border-2 border-dashed border-gray-700 rounded-xl p-4 text-center hover:border-pink-500 transition">
                          <Icons.Upload size={20} className="mx-auto text-gray-500 mb-1" />
                          <p className="text-xs text-gray-500">Arraste ou clique</p>
                        </div>
                      </label>
                    )}
                  </div>
                </div>
              )}

              {/* Progress Bar */}
              {isGeneratingImage && (
                <div className="space-y-2">
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-300"
                      style={{ width: `${imageProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    {imageProgress < 30 ? 'Iniciando geracao...' :
                     imageProgress < 60 ? 'Processando prompt...' :
                     imageProgress < 90 ? 'Renderizando imagem...' : 'Finalizando...'}
                  </p>
                </div>
              )}

              {/* Generate Button */}
              <button
                onClick={generateImage}
                disabled={isGeneratingImage || !imagePrompt.trim()}
                className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition shadow-lg shadow-purple-500/20"
              >
                {isGeneratingImage ? (
                  <>
                    <Icons.Loader size={20} className="animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Icons.Sparkles size={20} />
                    Gerar Imagem
                  </>
                )}
              </button>
            </>
          )}

          {/* VIDEO TAB */}
          {activeTab === 'video' && (
            <>
              {/* Source Image */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block font-medium">Imagem de Origem</label>
                {videoSourceImage ? (
                  <div className="relative">
                    <img src={videoSourceImage} alt="Source" className="w-full h-48 object-cover rounded-xl" />
                    <button
                      onClick={() => setVideoSourceImage(null)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 rounded-lg text-white"
                    >
                      <Icons.X size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="block cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'video')}
                      className="hidden"
                    />
                    <div className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center hover:border-purple-500 transition">
                      <Icons.Image size={32} className="mx-auto text-gray-500 mb-2" />
                      <p className="text-sm text-gray-400">Arraste uma imagem ou clique</p>
                      <p className="text-xs text-gray-600 mt-1">PNG, JPG ate 10MB</p>
                    </div>
                  </label>
                )}
              </div>

              {/* Video Prompt */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block font-medium">Descricao do Movimento</label>
                <textarea
                  value={videoPrompt}
                  onChange={(e) => setVideoPrompt(e.target.value)}
                  placeholder="Descreva como a imagem deve se mover..."
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none resize-none"
                />
              </div>

              {/* Video Model */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block font-medium">Modelo de Video</label>
                <div className="grid grid-cols-2 gap-2">
                  {VIDEO_MODELS.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => setVideoModel(model.id)}
                      className={clsx(
                        'p-3 rounded-xl border text-left transition',
                        videoModel === model.id
                          ? 'bg-purple-500/20 border-purple-500'
                          : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{model.icon}</span>
                        <p className="text-white font-medium text-sm">{model.name}</p>
                      </div>
                      <p className="text-xs text-gray-500">{model.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={clsx(
                          'text-[10px] px-1.5 py-0.5 rounded',
                          model.speed === 'fast' ? 'bg-green-500/20 text-green-400' :
                          model.speed === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-orange-500/20 text-orange-400'
                        )}>
                          {model.speed === 'fast' ? 'Rapido' : model.speed === 'medium' ? 'Medio' : 'Lento'}
                        </span>
                        <span className={clsx(
                          'text-[10px] px-1.5 py-0.5 rounded',
                          model.quality === 'highest' ? 'bg-purple-500/20 text-purple-400' :
                          model.quality === 'high' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'
                        )}>
                          {model.quality === 'highest' ? 'Premium' : model.quality === 'high' ? 'Alta' : 'Boa'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Progress Bar */}
              {isGeneratingVideo && (
                <div className="space-y-2">
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300"
                      style={{ width: `${videoProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    {videoProgress < 20 ? 'Enviando imagem...' :
                     videoProgress < 50 ? 'Analisando movimento...' :
                     videoProgress < 80 ? 'Gerando frames...' : 'Compilando video...'}
                  </p>
                </div>
              )}

              {/* Tips */}
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                <p className="text-purple-400 text-sm font-medium mb-2 flex items-center gap-2">
                  <Icons.Info size={14} /> Dicas
                </p>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>Use imagens de alta qualidade (1024x1024+)</li>
                  <li>Evite imagens muito complexas</li>
                  <li>Descreva movimentos naturais e suaves</li>
                </ul>
              </div>

              {/* Generate Button */}
              <button
                onClick={generateVideo}
                disabled={isGeneratingVideo || (!videoSourceImage && !videoPrompt.trim())}
                className="w-full py-3.5 bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-400 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition shadow-lg shadow-purple-500/20"
              >
                {isGeneratingVideo ? (
                  <>
                    <Icons.Loader size={20} className="animate-spin" />
                    Gerando video...
                  </>
                ) : (
                  <>
                    <Icons.Film size={20} />
                    Gerar Video
                  </>
                )}
              </button>
            </>
          )}

          {/* AUDIO TAB */}
          {activeTab === 'audio' && (
            <>
              {/* Text Input */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block font-medium">Texto para Narracao</label>
                <textarea
                  value={audioText}
                  onChange={(e) => setAudioText(e.target.value)}
                  placeholder="Digite o texto que sera convertido em audio..."
                  rows={6}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-green-500 focus:outline-none resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">{audioText.length} caracteres</p>
              </div>

              {/* Voice Selection */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block font-medium">Voz</label>
                <div className="space-y-2">
                  {ELEVENLABS_VOICES.map((voice) => (
                    <button
                      key={voice.id}
                      onClick={() => setAudioVoice(voice.id)}
                      className={clsx(
                        'w-full p-3 rounded-xl border text-left transition flex items-center gap-3',
                        audioVoice === voice.id
                          ? 'bg-green-500/20 border-green-500'
                          : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                      )}
                    >
                      <div className={clsx(
                        'w-10 h-10 rounded-full flex items-center justify-center text-lg',
                        voice.gender === 'Masculino' ? 'bg-blue-500/20 text-blue-400' : 'bg-pink-500/20 text-pink-400'
                      )}>
                        {voice.gender === 'Masculino' ? '👨' : '👩'}
                      </div>
                      <div>
                        <p className="text-white font-medium">{voice.name}</p>
                        <p className="text-xs text-gray-500">{voice.gender} - {voice.lang}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Speed */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block font-medium">
                  Velocidade: {audioSpeed.toFixed(1)}x
                </label>
                <input
                  type="range"
                  min={0.5}
                  max={2}
                  step={0.1}
                  value={audioSpeed}
                  onChange={(e) => setAudioSpeed(parseFloat(e.target.value))}
                  className="w-full accent-green-500"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>Lento</span>
                  <span>Rapido</span>
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={generateAudio}
                disabled={isGeneratingAudio || !audioText.trim()}
                className="w-full py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition shadow-lg shadow-green-500/20"
              >
                {isGeneratingAudio ? (
                  <>
                    <Icons.Loader size={20} className="animate-spin" />
                    Gerando audio...
                  </>
                ) : (
                  <>
                    <Icons.Mic size={20} />
                    Gerar Audio
                  </>
                )}
              </button>
            </>
          )}

          {/* TOOLS TAB */}
          {activeTab === 'tools' && (
            <>
              {/* Tool Selector */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block font-medium">Selecione a Ferramenta</label>
                <div className="grid grid-cols-2 gap-2">
                  {AI_TOOLS.map((tool) => {
                    const colorClasses: Record<string, string> = {
                      blue: 'from-blue-500/20 to-blue-600/10 border-blue-500',
                      green: 'from-green-500/20 to-green-600/10 border-green-500',
                      purple: 'from-purple-500/20 to-purple-600/10 border-purple-500',
                      pink: 'from-pink-500/20 to-pink-600/10 border-pink-500',
                      orange: 'from-orange-500/20 to-orange-600/10 border-orange-500',
                      yellow: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500',
                    };

                    return (
                      <button
                        key={tool.id}
                        onClick={() => setSelectedTool(tool.id)}
                        className={clsx(
                          'p-3 rounded-xl border text-left transition',
                          selectedTool === tool.id
                            ? `bg-gradient-to-br ${colorClasses[tool.color]}`
                            : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{tool.icon}</span>
                          <div>
                            <p className="text-white font-medium text-sm">{tool.name}</p>
                            <p className="text-xs text-gray-500">{tool.description}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Source Image */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block font-medium">Imagem de Origem</label>
                {toolSourceImage ? (
                  <div className="relative">
                    <img src={toolSourceImage} alt="Source" className="w-full h-48 object-cover rounded-xl" />
                    <button
                      onClick={() => setToolSourceImage(null)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 rounded-lg text-white"
                    >
                      <Icons.X size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="block cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'tool')}
                      className="hidden"
                    />
                    <div className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center hover:border-blue-500 transition">
                      <Icons.Upload size={32} className="mx-auto text-gray-500 mb-2" />
                      <p className="text-sm text-gray-400">Arraste uma imagem ou clique</p>
                      <p className="text-xs text-gray-600 mt-1">PNG, JPG ate 10MB</p>
                    </div>
                  </label>
                )}
              </div>

              {/* Tool-specific options */}
              {selectedTool === 'upscale' && (
                <div>
                  <label className="text-sm text-gray-400 mb-2 block font-medium">Escala</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setToolScale(2)}
                      className={clsx(
                        'flex-1 py-2.5 rounded-xl border text-sm font-medium transition',
                        toolScale === 2
                          ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                          : 'bg-gray-800 border-gray-700 text-gray-400'
                      )}
                    >
                      2x
                    </button>
                    <button
                      onClick={() => setToolScale(4)}
                      className={clsx(
                        'flex-1 py-2.5 rounded-xl border text-sm font-medium transition',
                        toolScale === 4
                          ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                          : 'bg-gray-800 border-gray-700 text-gray-400'
                      )}
                    >
                      4x (Recomendado)
                    </button>
                  </div>
                </div>
              )}

              {(selectedTool === 'sketch' || selectedTool === 'reimagine' || selectedTool === 'recolor' || selectedTool === 'relight') && (
                <div>
                  <label className="text-sm text-gray-400 mb-2 block font-medium">
                    {selectedTool === 'sketch' && 'Descreva a imagem desejada'}
                    {selectedTool === 'reimagine' && 'Descricao do novo estilo (opcional)'}
                    {selectedTool === 'recolor' && 'Descreva as cores desejadas'}
                    {selectedTool === 'relight' && 'Direcao da luz'}
                  </label>
                  <textarea
                    value={toolPrompt}
                    onChange={(e) => setToolPrompt(e.target.value)}
                    placeholder={
                      selectedTool === 'sketch' ? 'Ex: Uma paisagem realista com montanhas e lago...' :
                      selectedTool === 'reimagine' ? 'Ex: Estilo cyberpunk neon...' :
                      selectedTool === 'relight' ? 'Ex: left, right, top, bottom' :
                      'Ex: Tons de azul e roxo, cores vibrantes...'
                    }
                    rows={selectedTool === 'relight' ? 1 : 3}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
                  />
                </div>
              )}

              {/* Progress Bar */}
              {isProcessingTool && (
                <div className="space-y-2">
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300"
                      style={{ width: `${toolProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    {toolProgress < 30 ? 'Enviando imagem...' :
                     toolProgress < 60 ? 'Processando...' :
                     toolProgress < 90 ? 'Aplicando transformacao...' : 'Finalizando...'}
                  </p>
                </div>
              )}

              {/* Tool Tips */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <p className="text-blue-400 text-sm font-medium mb-2 flex items-center gap-2">
                  <Icons.Info size={14} /> Sobre {AI_TOOLS.find(t => t.id === selectedTool)?.name}
                </p>
                <p className="text-xs text-gray-400">
                  {selectedTool === 'upscale' && 'Aumenta a resolucao da imagem mantendo qualidade. Ideal para fotos pequenas.'}
                  {selectedTool === 'remove-bg' && 'Remove o fundo automaticamente. Funciona melhor com objetos bem definidos.'}
                  {selectedTool === 'sketch' && 'Transforma esbocos em imagens realistas. Adicione uma descricao detalhada.'}
                  {selectedTool === 'reimagine' && 'Recria a imagem com novo estilo mantendo a composicao original.'}
                  {selectedTool === 'recolor' && 'Muda as cores da imagem. Descreva as cores que deseja aplicar.'}
                  {selectedTool === 'relight' && 'Muda a direcao da luz na imagem. Digite: left, right, top, bottom.'}
                </p>
              </div>

              {/* Process Button */}
              <button
                onClick={processAITool}
                disabled={isProcessingTool || !toolSourceImage || (selectedTool === 'sketch' && !toolPrompt.trim()) || (selectedTool === 'recolor' && !toolPrompt.trim())}
                className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-400 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition shadow-lg shadow-blue-500/20"
              >
                {isProcessingTool ? (
                  <>
                    <Icons.Loader size={20} className="animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Icons.Zap size={20} />
                    Processar
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Content - Feed/Gallery */}
      <div className="flex-1 flex flex-col">
        {/* Feed Header */}
        <div className="h-14 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-900/30">
          <div className="flex items-center gap-4">
            <h2 className="text-white font-medium flex items-center gap-2">
              {activeTab === 'image' && <><Icons.Image size={18} className="text-pink-400" /> Imagens</>}
              {activeTab === 'video' && <><Icons.Film size={18} className="text-purple-400" /> Videos</>}
              {activeTab === 'audio' && <><Icons.Mic size={18} className="text-green-400" /> Audios</>}
              {activeTab === 'tools' && <><Icons.Zap size={18} className="text-blue-400" /> Resultados</>}
              <span className="text-gray-500 text-sm">({filteredHistory.length})</span>
            </h2>

            {/* Filters */}
            <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setFilter('all')}
                className={clsx(
                  'px-3 py-1 rounded text-xs font-medium transition',
                  filter === 'all' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
                )}
              >
                Todos
              </button>
              <button
                onClick={() => setFilter('favorites')}
                className={clsx(
                  'px-3 py-1 rounded text-xs font-medium transition flex items-center gap-1',
                  filter === 'favorites' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
                )}
              >
                <Icons.Heart size={12} /> Favoritos
              </button>
              <button
                onClick={() => setFilter('recent')}
                className={clsx(
                  'px-3 py-1 rounded text-xs font-medium transition',
                  filter === 'recent' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
                )}
              >
                24h
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Icons.Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar..."
                className="w-48 bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder-gray-500 focus:border-gray-600 focus:outline-none"
              />
            </div>

            {filteredHistory.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Limpar todo o historico?')) {
                    setHistory(prev => prev.filter(h => h.type !== activeTab));
                    toast.success('Historico limpo');
                  }
                }}
                className="text-sm text-gray-500 hover:text-red-400 flex items-center gap-1"
              >
                <Icons.Trash size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Feed Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredHistory.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  {activeTab === 'image' && <Icons.Image size={40} className="text-gray-600" />}
                  {activeTab === 'video' && <Icons.Film size={40} className="text-gray-600" />}
                  {activeTab === 'audio' && <Icons.Mic size={40} className="text-gray-600" />}
                  {activeTab === 'tools' && <Icons.Zap size={40} className="text-gray-600" />}
                </div>
                <h3 className="text-white font-medium mb-2">
                  {filter === 'favorites' ? 'Nenhum favorito ainda' :
                   filter === 'recent' ? 'Nada nas ultimas 24h' : 'Nenhum conteudo ainda'}
                </h3>
                <p className="text-gray-500 text-sm">
                  {activeTab === 'image' && 'Gere sua primeira imagem com IA'}
                  {activeTab === 'video' && 'Transforme imagens em videos'}
                  {activeTab === 'audio' && 'Crie narracoes com ElevenLabs'}
                  {activeTab === 'tools' && 'Use as ferramentas de edicao com IA'}
                </p>
              </div>
            </div>
          ) : (
            <div className={clsx(
              'grid gap-4',
              activeTab === 'audio'
                ? 'grid-cols-1 max-w-2xl'
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            )}>
              {filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className={clsx(
                    'bg-gray-900 border border-gray-800 rounded-xl overflow-hidden group transition hover:border-gray-700',
                    item.status === 'generating' && 'animate-pulse'
                  )}
                >
                  {/* Image Preview */}
                  {item.type === 'image' && (
                    <div className="aspect-square bg-gray-800 relative">
                      {item.status === 'completed' && item.url ? (
                        <img src={item.url} alt={item.prompt} className="w-full h-full object-cover" />
                      ) : item.status === 'generating' ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-center">
                            <Icons.Loader size={32} className="text-pink-400 animate-spin mx-auto mb-2" />
                            <p className="text-xs text-gray-500">Gerando...</p>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Icons.AlertCircle size={32} className="text-red-400" />
                        </div>
                      )}

                      {/* Overlay Actions */}
                      {item.status === 'completed' && item.url && (
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                          <button
                            onClick={() => toggleFavorite(item.id)}
                            className={clsx(
                              'p-2 rounded-lg transition',
                              item.isFavorite ? 'bg-red-500 text-white' : 'bg-white/20 hover:bg-white/30 text-white'
                            )}
                            title={item.isFavorite ? 'Remover favorito' : 'Favoritar'}
                          >
                            <Icons.Heart size={18} fill={item.isFavorite ? 'currentColor' : 'none'} />
                          </button>
                          <button
                            onClick={() => downloadFile(item.url, `image_${item.id}.png`)}
                            className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition"
                            title="Download"
                          >
                            <Icons.Download size={18} className="text-white" />
                          </button>
                          <button
                            onClick={() => useImageForVideo(item.url)}
                            className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition"
                            title="Usar para video"
                          >
                            <Icons.Film size={18} className="text-white" />
                          </button>
                          <button
                            onClick={() => useImageForTool(item.url)}
                            className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition"
                            title="Usar em Tools"
                          >
                            <Icons.Zap size={18} className="text-white" />
                          </button>
                          <button
                            onClick={() => deleteHistoryItem(item.id)}
                            className="p-2 bg-white/20 rounded-lg hover:bg-red-500/50 transition"
                            title="Excluir"
                          >
                            <Icons.Trash size={18} className="text-white" />
                          </button>
                        </div>
                      )}

                      {/* Favorite Badge */}
                      {item.isFavorite && (
                        <div className="absolute top-2 right-2 p-1.5 bg-red-500 rounded-lg">
                          <Icons.Heart size={12} className="text-white" fill="currentColor" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Video Preview */}
                  {item.type === 'video' && (
                    <div className="aspect-video bg-gray-800 relative">
                      {item.status === 'completed' && item.url ? (
                        <video src={item.url} controls className="w-full h-full object-cover" />
                      ) : item.status === 'generating' ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-center">
                            <Icons.Loader size={32} className="text-purple-400 animate-spin mx-auto mb-2" />
                            <p className="text-xs text-gray-500">Gerando video...</p>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Icons.AlertCircle size={32} className="text-red-400" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Audio Player */}
                  {item.type === 'audio' && (
                    <div className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Icons.Mic size={24} className="text-green-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-sm truncate">{item.settings?.voiceName || 'Voz'}</p>
                          <p className="text-gray-500 text-xs truncate">{item.prompt}</p>
                        </div>
                        <button
                          onClick={() => toggleFavorite(item.id)}
                          className={clsx(
                            'p-2 rounded-lg transition',
                            item.isFavorite ? 'text-red-400' : 'text-gray-500 hover:text-white'
                          )}
                        >
                          <Icons.Heart size={18} fill={item.isFavorite ? 'currentColor' : 'none'} />
                        </button>
                      </div>
                      {item.status === 'completed' && item.url && (
                        <audio src={item.url} controls className="w-full mt-3" />
                      )}
                      {item.status === 'generating' && (
                        <div className="mt-3 flex items-center gap-2">
                          <Icons.Loader size={14} className="text-green-400 animate-spin" />
                          <span className="text-xs text-gray-500">Gerando audio...</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tool Result Preview */}
                  {item.type === 'tool' && (
                    <div className="aspect-square bg-gray-800 relative">
                      {item.status === 'completed' && item.url ? (
                        <img src={item.url} alt={item.prompt} className="w-full h-full object-cover" />
                      ) : item.status === 'generating' ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-center">
                            <Icons.Loader size={32} className="text-blue-400 animate-spin mx-auto mb-2" />
                            <p className="text-xs text-gray-500">Processando...</p>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Icons.AlertCircle size={32} className="text-red-400" />
                        </div>
                      )}

                      {/* Tool Badge */}
                      <div className="absolute top-2 left-2 px-2 py-1 bg-blue-500/80 rounded-lg text-xs text-white flex items-center gap-1">
                        <Icons.Zap size={12} />
                        {AI_TOOLS.find(t => t.id === item.settings?.tool)?.name || 'Tool'}
                      </div>

                      {/* Overlay Actions */}
                      {item.status === 'completed' && item.url && (
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                          <button
                            onClick={() => toggleFavorite(item.id)}
                            className={clsx(
                              'p-2 rounded-lg transition',
                              item.isFavorite ? 'bg-red-500 text-white' : 'bg-white/20 hover:bg-white/30 text-white'
                            )}
                            title={item.isFavorite ? 'Remover favorito' : 'Favoritar'}
                          >
                            <Icons.Heart size={18} fill={item.isFavorite ? 'currentColor' : 'none'} />
                          </button>
                          <button
                            onClick={() => downloadFile(item.url, `tool_${item.id}.png`)}
                            className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition"
                            title="Download"
                          >
                            <Icons.Download size={18} className="text-white" />
                          </button>
                          <button
                            onClick={() => useImageForTool(item.url)}
                            className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition"
                            title="Usar novamente"
                          >
                            <Icons.Zap size={18} className="text-white" />
                          </button>
                          <button
                            onClick={() => deleteHistoryItem(item.id)}
                            className="p-2 bg-white/20 rounded-lg hover:bg-red-500/50 transition"
                            title="Excluir"
                          >
                            <Icons.Trash size={18} className="text-white" />
                          </button>
                        </div>
                      )}

                      {/* Favorite Badge */}
                      {item.isFavorite && (
                        <div className="absolute top-2 right-2 p-1.5 bg-red-500 rounded-lg">
                          <Icons.Heart size={12} className="text-white" fill="currentColor" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Item Info */}
                  <div className="p-3 border-t border-gray-800">
                    <p className="text-gray-400 text-xs line-clamp-2 mb-2">{item.prompt}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">
                        {new Date(item.createdAt).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {item.status === 'error' && (
                        <span className="text-xs text-red-400">{item.error}</span>
                      )}
                      {item.status === 'completed' && item.type !== 'image' && (
                        <button
                          onClick={() => downloadFile(item.url, `${item.type}_${item.id}.${item.type === 'video' ? 'mp4' : 'mp3'}`)}
                          className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                        >
                          <Icons.Download size={12} />
                          Download
                        </button>
                      )}
                    </div>
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
