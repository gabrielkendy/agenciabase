import { useState, useEffect } from 'react';
import { Icons } from '../components/Icons';
import { useStore } from '../store';
import { freepikService, FREEPIK_STYLES, FREEPIK_SIZES, FREEPIK_COLORS, FreepikGenerationRequest } from '../services/freepikService';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

type StudioTab = 'image' | 'video' | 'audio';

interface GeneratedItem {
  id: string;
  type: 'image' | 'video' | 'audio';
  prompt: string;
  url: string;
  thumbnail?: string;
  status: 'generating' | 'completed' | 'error';
  error?: string;
  settings: Record<string, any>;
  createdAt: string;
}

// ElevenLabs Voices
const ELEVENLABS_VOICES = [
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', lang: 'pt-BR', gender: 'Masculino' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', lang: 'en', gender: 'Feminino' },
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', lang: 'en', gender: 'Feminino' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', lang: 'en', gender: 'Masculino' },
  { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam', lang: 'en', gender: 'Masculino' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', lang: 'en', gender: 'Feminino' },
];

// FAL.ai Models
const FALAI_MODELS = [
  { id: 'fal-ai/fast-svd-lcm', name: 'Fast SVD (LCM)', description: 'Video rapido a partir de imagem' },
  { id: 'fal-ai/stable-video', name: 'Stable Video', description: 'Video estavel de alta qualidade' },
  { id: 'fal-ai/animatediff', name: 'AnimateDiff', description: 'Animacao de imagens estaticas' },
];

export const CreatorStudioPage = () => {
  const { apiConfig } = useStore();
  const [activeTab, setActiveTab] = useState<StudioTab>('image');

  // Generation history (persisted)
  const [history, setHistory] = useState<GeneratedItem[]>(() => {
    const saved = localStorage.getItem('studio_history');
    return saved ? JSON.parse(saved) : [];
  });

  // Image generation state
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageStyle, setImageStyle] = useState('photo');
  const [imageSize, setImageSize] = useState('square_1_1');
  const [imageColor, setImageColor] = useState<string | undefined>(undefined);
  const [negativePrompt, setNegativePrompt] = useState('blurry, ugly, distorted, low quality, watermark, text');
  const [numImages, setNumImages] = useState(1);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // Video generation state
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoModel, setVideoModel] = useState('fal-ai/fast-svd-lcm');
  const [videoSourceImage, setVideoSourceImage] = useState<string | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);

  // Audio generation state
  const [audioText, setAudioText] = useState('');
  const [audioVoice, setAudioVoice] = useState('onwK4e9ZLuTAKqWW03F9');
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);

  // Reference image for style transfer
  const [referenceImage, setReferenceImage] = useState<string | null>(null);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('studio_history', JSON.stringify(history));
  }, [history]);

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

  // Generate Image with Freepik
  const generateImage = async () => {
    if (!imagePrompt.trim()) {
      toast.error('Digite um prompt para gerar a imagem');
      return;
    }
    if (!apiConfig.freepik_key) {
      toast.error('Configure a API Key da Freepik em Admin > Integracoes');
      return;
    }

    setIsGeneratingImage(true);
    const itemId = uuidv4();

    // Add placeholder to history
    addToHistory({
      id: itemId,
      type: 'image',
      prompt: imagePrompt,
      url: '',
      status: 'generating',
      settings: { style: imageStyle, size: imageSize, color: imageColor, negative: negativePrompt },
      createdAt: new Date().toISOString(),
    });

    try {
      freepikService.setApiKey(apiConfig.freepik_key);

      const request: FreepikGenerationRequest = {
        prompt: imagePrompt,
        negative_prompt: negativePrompt,
        guidance_scale: 7.5,
        num_images: numImages,
        image: { size: imageSize as any },
        styling: {
          style: imageStyle as any,
          color: imageColor as any,
        },
      };

      const urls = await freepikService.generateAndWait(request);

      if (urls.length > 0) {
        updateHistoryItem(itemId, { url: urls[0], status: 'completed' });

        // If multiple images, add the rest
        for (let i = 1; i < urls.length; i++) {
          addToHistory({
            id: uuidv4(),
            type: 'image',
            prompt: imagePrompt,
            url: urls[i],
            status: 'completed',
            settings: { style: imageStyle, size: imageSize, color: imageColor, negative: negativePrompt },
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
    const itemId = uuidv4();

    addToHistory({
      id: itemId,
      type: 'video',
      prompt: videoPrompt || 'Image to Video',
      url: '',
      thumbnail: videoSourceImage || undefined,
      status: 'generating',
      settings: { model: videoModel, sourceImage: !!videoSourceImage },
      createdAt: new Date().toISOString(),
    });

    try {
      // FAL.ai API call
      const response = await fetch('https://fal.run/' + videoModel, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${apiConfig.falai_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: videoSourceImage,
          prompt: videoPrompt,
          motion_bucket_id: 127,
          fps: 7,
          cond_aug: 0.02,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Erro ao gerar video');
      }

      const data = await response.json();
      const videoUrl = data.video?.url || data.video_url;

      if (videoUrl) {
        updateHistoryItem(itemId, { url: videoUrl, status: 'completed' });
        toast.success('Video gerado com sucesso!');
      } else {
        throw new Error('URL do video nao retornada');
      }
    } catch (error: any) {
      updateHistoryItem(itemId, { status: 'error', error: error.message });
      toast.error(`Erro: ${error.message}`);
    } finally {
      setIsGeneratingVideo(false);
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
      settings: { voice: audioVoice, voiceName: ELEVENLABS_VOICES.find(v => v.id === audioVoice)?.name },
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

  // Handle file upload for reference/source images
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'reference' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (target === 'reference') {
        setReferenceImage(dataUrl);
      } else {
        setVideoSourceImage(dataUrl);
      }
    };
    reader.readAsDataURL(file);
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
      // If fetch fails, open in new tab
      window.open(url, '_blank');
    }
  };

  // Filter history by type
  const filteredHistory = activeTab === 'image'
    ? history.filter(h => h.type === 'image')
    : activeTab === 'video'
    ? history.filter(h => h.type === 'video')
    : history.filter(h => h.type === 'audio');

  return (
    <div className="h-full flex bg-gray-950">
      {/* Left Sidebar - Controls */}
      <div className="w-96 border-r border-gray-800 flex flex-col bg-gray-900/50">
        {/* Header */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Icons.Wand2 className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">AI Studio</h1>
              <p className="text-xs text-gray-500">Crie imagens, videos e audio com IA</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800">
          <button
            onClick={() => setActiveTab('image')}
            className={clsx(
              'flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition',
              activeTab === 'image' ? 'text-pink-400 border-pink-400' : 'text-gray-400 border-transparent hover:text-white'
            )}
          >
            <Icons.Image size={16} />
            Imagem
          </button>
          <button
            onClick={() => setActiveTab('video')}
            className={clsx(
              'flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition',
              activeTab === 'video' ? 'text-purple-400 border-purple-400' : 'text-gray-400 border-transparent hover:text-white'
            )}
          >
            <Icons.Film size={16} />
            Video
          </button>
          <button
            onClick={() => setActiveTab('audio')}
            className={clsx(
              'flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition',
              activeTab === 'audio' ? 'text-green-400 border-green-400' : 'text-gray-400 border-transparent hover:text-white'
            )}
          >
            <Icons.Mic size={16} />
            Audio
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* IMAGE TAB */}
          {activeTab === 'image' && (
            <>
              {/* Prompt */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Prompt</label>
                <textarea
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="Descreva a imagem que deseja criar..."
                  rows={4}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-pink-500 focus:outline-none resize-none"
                />
              </div>

              {/* Negative Prompt */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Prompt Negativo</label>
                <input
                  type="text"
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  placeholder="O que evitar na imagem..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-sm placeholder-gray-500 focus:border-pink-500 focus:outline-none"
                />
              </div>

              {/* Style */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Estilo</label>
                <div className="grid grid-cols-3 gap-2">
                  {FREEPIK_STYLES.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setImageStyle(style.id)}
                      className={clsx(
                        'p-2 rounded-lg border text-center transition',
                        imageStyle === style.id
                          ? 'bg-pink-500/20 border-pink-500 text-pink-400'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                      )}
                    >
                      <span className="text-lg">{style.icon}</span>
                      <p className="text-xs mt-1">{style.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Size */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Tamanho</label>
                <select
                  value={imageSize}
                  onChange={(e) => setImageSize(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:border-pink-500 focus:outline-none"
                >
                  {FREEPIK_SIZES.map((size) => (
                    <option key={size.id} value={size.id}>{size.icon} {size.label}</option>
                  ))}
                </select>
              </div>

              {/* Color */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Cor</label>
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
                        'px-3 py-1.5 rounded-lg border text-xs transition flex items-center gap-1',
                        imageColor === color.id ? 'bg-pink-500/20 border-pink-500 text-pink-400' : 'bg-gray-800 border-gray-700 text-gray-400'
                      )}
                    >
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ background: color.color }}
                      />
                      {color.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Number of Images */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Quantidade: {numImages}</label>
                <input
                  type="range"
                  min={1}
                  max={4}
                  value={numImages}
                  onChange={(e) => setNumImages(parseInt(e.target.value))}
                  className="w-full accent-pink-500"
                />
              </div>

              {/* Reference Image */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Imagem de Referencia (Opcional)</label>
                {referenceImage ? (
                  <div className="relative">
                    <img src={referenceImage} alt="Reference" className="w-full h-32 object-cover rounded-xl" />
                    <button
                      onClick={() => setReferenceImage(null)}
                      className="absolute top-2 right-2 p-1 bg-red-500 rounded-lg text-white"
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
                    <div className="border-2 border-dashed border-gray-700 rounded-xl p-6 text-center hover:border-pink-500 transition">
                      <Icons.Upload size={24} className="mx-auto text-gray-500 mb-2" />
                      <p className="text-xs text-gray-500">Arraste ou clique</p>
                    </div>
                  </label>
                )}
              </div>

              {/* Generate Button */}
              <button
                onClick={generateImage}
                disabled={isGeneratingImage || !imagePrompt.trim()}
                className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 disabled:opacity-50 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition"
              >
                {isGeneratingImage ? (
                  <>
                    <Icons.Loader size={18} className="animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Icons.Sparkles size={18} />
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
                <label className="text-sm text-gray-400 mb-2 block">Imagem de Origem</label>
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
                <label className="text-sm text-gray-400 mb-2 block">Descricao do Movimento</label>
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
                <label className="text-sm text-gray-400 mb-2 block">Modelo</label>
                <select
                  value={videoModel}
                  onChange={(e) => setVideoModel(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:border-purple-500 focus:outline-none"
                >
                  {FALAI_MODELS.map((model) => (
                    <option key={model.id} value={model.id}>{model.name} - {model.description}</option>
                  ))}
                </select>
              </div>

              {/* Tips */}
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                <p className="text-purple-400 text-sm font-medium mb-2">Dicas</p>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>Use imagens de alta qualidade (1024x1024+)</li>
                  <li>Evite imagens muito complexas</li>
                  <li>Descreva movimentos naturais</li>
                </ul>
              </div>

              {/* Generate Button */}
              <button
                onClick={generateVideo}
                disabled={isGeneratingVideo || (!videoSourceImage && !videoPrompt.trim())}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-400 hover:to-blue-500 disabled:opacity-50 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition"
              >
                {isGeneratingVideo ? (
                  <>
                    <Icons.Loader size={18} className="animate-spin" />
                    Gerando video...
                  </>
                ) : (
                  <>
                    <Icons.Film size={18} />
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
                <label className="text-sm text-gray-400 mb-2 block">Texto para Narracao</label>
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
                <label className="text-sm text-gray-400 mb-2 block">Voz</label>
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

              {/* Generate Button */}
              <button
                onClick={generateAudio}
                disabled={isGeneratingAudio || !audioText.trim()}
                className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 disabled:opacity-50 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition"
              >
                {isGeneratingAudio ? (
                  <>
                    <Icons.Loader size={18} className="animate-spin" />
                    Gerando audio...
                  </>
                ) : (
                  <>
                    <Icons.Mic size={18} />
                    Gerar Audio
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
          <h2 className="text-white font-medium flex items-center gap-2">
            {activeTab === 'image' && <><Icons.Image size={18} className="text-pink-400" /> Imagens Geradas</>}
            {activeTab === 'video' && <><Icons.Film size={18} className="text-purple-400" /> Videos Gerados</>}
            {activeTab === 'audio' && <><Icons.Mic size={18} className="text-green-400" /> Audios Gerados</>}
            <span className="text-gray-500 text-sm ml-2">({filteredHistory.length})</span>
          </h2>
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
              Limpar
            </button>
          )}
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
                </div>
                <h3 className="text-white font-medium mb-2">Nenhum conteudo ainda</h3>
                <p className="text-gray-500 text-sm">
                  {activeTab === 'image' && 'Gere sua primeira imagem com Freepik Mystic'}
                  {activeTab === 'video' && 'Transforme imagens em videos com FAL.ai'}
                  {activeTab === 'audio' && 'Crie narracoes com ElevenLabs'}
                </p>
              </div>
            </div>
          ) : (
            <div className={clsx(
              'grid gap-4',
              activeTab === 'audio'
                ? 'grid-cols-1'
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
                  {/* Image/Video Preview */}
                  {item.type === 'image' && (
                    <div className="aspect-square bg-gray-800 relative">
                      {item.status === 'completed' && item.url ? (
                        <img src={item.url} alt={item.prompt} className="w-full h-full object-cover" />
                      ) : item.status === 'generating' ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <Icons.Loader size={32} className="text-pink-400 animate-spin" />
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
                            onClick={() => deleteHistoryItem(item.id)}
                            className="p-2 bg-white/20 rounded-lg hover:bg-red-500/50 transition"
                            title="Excluir"
                          >
                            <Icons.Trash size={18} className="text-white" />
                          </button>
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
