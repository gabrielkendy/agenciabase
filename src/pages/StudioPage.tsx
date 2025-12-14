import React, { useState } from 'react';
import { Icons } from '../components/Icons';
import { useStore } from '../store';
import { generateImage, generateCaption } from '../services/geminiService';
import { GeneratedMedia } from '../types';

const ASPECT_RATIOS = [
  { id: '1:1', label: '1:1', desc: 'Quadrado' },
  { id: '16:9', label: '16:9', desc: 'Paisagem' },
  { id: '9:16', label: '9:16', desc: 'Stories' },
  { id: '4:3', label: '4:3', desc: 'Padrão' },
  { id: '3:4', label: '3:4', desc: 'Retrato' },
];

export const StudioPage: React.FC = () => {
  const { mediaGallery, addMedia, addTask, addNotification } = useStore();
  const [activeTab, setActiveTab] = useState<'image' | 'video' | 'gallery'>('image');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedCaption, setGeneratedCaption] = useState('');

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      addNotification({
        id: Date.now().toString(),
        title: 'Prompt vazio',
        message: 'Digite uma descrição para gerar a imagem',
        type: 'warning',
        read: false,
        timestamp: new Date()
      });
      return;
    }
    
    setIsGenerating(true);
    setGeneratedImage(null);
    setGeneratedCaption('');
    
    try {
      // Generate image
      const imageUrl = await generateImage(prompt, aspectRatio);
      
      if (imageUrl) {
        setGeneratedImage(imageUrl);
        
        // Generate caption
        const caption = await generateCaption(prompt, prompt, 'Instagram');
        setGeneratedCaption(caption);
        
        // Save to gallery
        const newMedia: GeneratedMedia = {
          id: Date.now().toString(),
          type: 'image',
          url: imageUrl,
          prompt,
          timestamp: new Date(),
          aspectRatio,
          modelUsed: 'gemini-2.0-flash',
        };
        addMedia(newMedia);
        
        addNotification({
          id: Date.now().toString(),
          title: 'Imagem Gerada! 🎨',
          message: 'Sua imagem foi criada e salva na galeria',
          type: 'success',
          read: false,
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error('Generation error:', error);
      addNotification({
        id: Date.now().toString(),
        title: 'Erro na Geração',
        message: 'Falha ao gerar imagem. Tente novamente.',
        type: 'error',
        read: false,
        timestamp: new Date()
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateTask = (media: GeneratedMedia) => {
    addTask({
      id: Date.now().toString(),
      title: `Post: ${media.prompt.substring(0, 40)}...`,
      description: media.prompt,
      caption: generatedCaption,
      status: 'backlog',
      priority: 'medium',
      channel: 'instagram',
      mediaUrls: [media.url],
      createdAt: new Date(),
      clientName: 'Cliente',
    });
    
    addNotification({
      id: Date.now().toString(),
      title: 'Demanda Criada! 📋',
      message: 'Nova demanda adicionada ao Workflow',
      type: 'success',
      read: false,
      timestamp: new Date()
    });
  };

  const handleDownload = (url: string, name: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.png`;
    a.click();
  };

  return (
    <div className="flex h-full bg-gray-950">
      {/* Sidebar */}
      <div className="w-80 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h2 className="font-bold text-white flex items-center gap-2">
            <Icons.Wand size={20} className="text-orange-400" />
            Estúdio Criativo
          </h2>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800">
          <button
            onClick={() => setActiveTab('image')}
            className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'image' ? 'text-orange-400 bg-orange-500/10 border-b-2 border-orange-400' : 'text-gray-500 hover:text-white'
            }`}
          >
            <Icons.Image size={16} /> Imagem
          </button>
          <button
            onClick={() => setActiveTab('gallery')}
            className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'gallery' ? 'text-orange-400 bg-orange-500/10 border-b-2 border-orange-400' : 'text-gray-500 hover:text-white'
            }`}
          >
            <Icons.Image size={16} /> Galeria ({mediaGallery.length})
          </button>
        </div>

        {activeTab !== 'gallery' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Prompt */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Descreva sua imagem</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ex: Uma foto profissional de um café gourmet com latte art em formato de coração, luz natural suave..."
                rows={5}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:border-orange-500 focus:outline-none resize-none"
              />
            </div>

            {/* Aspect Ratio */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Formato</label>
              <div className="grid grid-cols-5 gap-2">
                {ASPECT_RATIOS.map(ar => (
                  <button
                    key={ar.id}
                    onClick={() => setAspectRatio(ar.id)}
                    className={`py-2 px-1 rounded-lg text-xs font-medium transition-colors ${
                      aspectRatio === ar.id
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                    title={ar.desc}
                  >
                    {ar.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-500/20"
            >
              {isGenerating ? (
                <>
                  <Icons.Loader size={20} className="animate-spin" /> Gerando...
                </>
              ) : (
                <>
                  <Icons.Sparkles size={20} /> Gerar Imagem
                </>
              )}
            </button>

            {/* Generated Caption */}
            {generatedCaption && (
              <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-gray-500 uppercase">Legenda Sugerida</h4>
                  <button
                    onClick={() => navigator.clipboard.writeText(generatedCaption)}
                    className="text-gray-500 hover:text-orange-400 transition-colors"
                  >
                    <Icons.Copy size={14} />
                  </button>
                </div>
                <p className="text-xs text-gray-300 whitespace-pre-wrap max-h-32 overflow-y-auto">{generatedCaption}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'gallery' && (
          <div className="flex-1 overflow-y-auto p-2">
            {mediaGallery.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-600 p-4">
                <Icons.Image size={48} className="mb-4 opacity-30" />
                <p className="text-sm text-center">Galeria vazia</p>
                <p className="text-xs text-center mt-1">Gere imagens para ver aqui</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {mediaGallery.map(media => (
                  <div key={media.id} className="relative group">
                    <img src={media.url} className="w-full aspect-square object-cover rounded-lg" alt="" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleCreateTask(media)}
                        className="p-2 bg-orange-600 rounded-lg text-white hover:bg-orange-500"
                        title="Criar Demanda"
                      >
                        <Icons.Plus size={16} />
                      </button>
                      <button
                        onClick={() => handleDownload(media.url, media.prompt.substring(0, 20))}
                        className="p-2 bg-gray-700 rounded-lg text-white hover:bg-gray-600"
                        title="Download"
                      >
                        <Icons.Download size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
        {generatedImage ? (
          <div className="max-w-2xl w-full">
            <div className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 shadow-2xl">
              <img src={generatedImage} className="w-full" alt="Generated" />
              <div className="p-4 space-y-3">
                <p className="text-sm text-gray-400">{prompt}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const media: GeneratedMedia = {
                        id: Date.now().toString(),
                        type: 'image',
                        url: generatedImage,
                        prompt,
                        timestamp: new Date(),
                        aspectRatio,
                        modelUsed: 'gemini-2.0-flash',
                      };
                      handleCreateTask(media);
                    }}
                    className="flex-1 py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-500 flex items-center justify-center gap-2"
                  >
                    <Icons.Plus size={18} /> Criar Demanda
                  </button>
                  <button
                    onClick={() => handleDownload(generatedImage, prompt.substring(0, 20))}
                    className="px-4 py-3 bg-gray-800 text-white rounded-xl hover:bg-gray-700"
                  >
                    <Icons.Download size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-600">
            <div className="w-40 h-40 bg-gradient-to-br from-orange-500/10 to-pink-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-orange-500/20">
              <Icons.Sparkles size={64} className="text-orange-400/50" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Estúdio Criativo</h3>
            <p className="text-sm max-w-md">
              Descreva a imagem que você quer criar e a IA vai gerar para você, junto com uma legenda pronta para publicar!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
