import { useState, useRef, useEffect } from 'react';
import { Icons } from '../components/Icons';
import { useStore } from '../store';
import { useStudioStore } from '../store/studioStore';
import { sendMessageToGemini } from '../services/geminiService';
import { freepikService, FREEPIK_STYLES, FREEPIK_SIZES } from '../services/freepikService';
import clsx from 'clsx';
import toast from 'react-hot-toast';

interface ScenePrompt {
  id: string;
  number: number;
  text: string;
  imageUrl?: string;
  videoUrl?: string;
  isGenerating: boolean;
  approved: boolean;
}

export const CreatorStudioPage = () => {
  const { apiConfig, agents } = useStore();
  const {
    script, setScript, scriptApproved, approveScript, rejectScript,
    narrationUrl, setNarrationUrl, narrationApproved, approveNarration,
    isGeneratingScript, setIsGeneratingScript,
    isGeneratingNarration, setIsGeneratingNarration,
    isGeneratingImages, setIsGeneratingImages,
    resetStudio,
  } = useStudioStore();

  // Project state
  const [projectName, setProjectName] = useState('Novo Projeto');
  const [currentStep, setCurrentStep] = useState(1);

  // Chat with agent
  const [agentInput, setAgentInput] = useState('');
  const [agentMessages, setAgentMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');

  // Scene prompts
  const [scenePrompts, setScenePrompts] = useState<ScenePrompt[]>([]);

  // Image generation options
  const [selectedStyle, setSelectedStyle] = useState('photo');
  const [selectedSize, setSelectedSize] = useState('widescreen_16_9');
  const [selectedColor] = useState<string | undefined>(undefined);
  const [negativePrompt] = useState('blurry, ugly, distorted, low quality, watermark, text');

  // Narration settings
  const [voiceId] = useState('EXAVITQu4vr4xnSDxMaL'); // Sarah

  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [agentMessages]);

  // Available agents (video/studio focused)
  const studioAgents = agents.filter(a => a.is_active);

  // Steps for the workflow
  const steps = [
    { id: 1, name: 'Roteiro', icon: '📝' },
    { id: 2, name: 'Prompts', icon: '💡' },
    { id: 3, name: 'Imagens', icon: '🖼️' },
    { id: 4, name: 'Vídeos', icon: '🎬' },
    { id: 5, name: 'Exportar', icon: '📦' },
  ];

  // Chat with agent to generate script
  const sendToAgent = async () => {
    if (!agentInput.trim() || isGeneratingScript) return;

    const userMessage = agentInput;
    setAgentInput('');
    setAgentMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsGeneratingScript(true);

    try {
      const agent = agents.find(a => a.id === selectedAgentId) || agents[0];
      const systemPrompt = `${agent?.system_prompt || 'Você é um especialista em criar roteiros para vídeos curtos (reels, shorts).'}

TAREFA: Crie um roteiro detalhado para um vídeo com exatamente 12 cenas.
Cada cena deve ter:
- Duração aproximada de 2-3 segundos
- Descrição visual detalhada
- Texto de narração

FORMATO DE RESPOSTA (siga exatamente):
CENA 1:
Visual: [descrição detalhada do que aparece na tela]
Narração: [texto que será falado]

CENA 2:
...

Continue até a CENA 12.`;

      let response = '';

      if (apiConfig.gemini_key) {
        response = await sendMessageToGemini(userMessage, systemPrompt, apiConfig.gemini_key);
      } else {
        throw new Error('Configure uma API Key nas configurações');
      }

      setAgentMessages(prev => [...prev, { role: 'assistant', content: response }]);
      setScript(response);

      // Parse scenes from response
      parseScriptToScenes(response);

      toast.success('Roteiro gerado com sucesso!');
    } catch (error: any) {
      setAgentMessages(prev => [...prev, { role: 'assistant', content: `❌ Erro: ${error.message}` }]);
      toast.error('Erro ao gerar roteiro');
    } finally {
      setIsGeneratingScript(false);
    }
  };

  // Parse script into 12 scenes
  const parseScriptToScenes = (scriptText: string) => {
    const scenes: ScenePrompt[] = [];
    const sceneRegex = /CENA\s*(\d+):\s*(?:Visual:|VISUAL:)?\s*([^]*?)(?:Narração:|NARRAÇÃO:|Narration:)\s*([^]*?)(?=CENA\s*\d+:|$)/gi;

    let match;
    while ((match = sceneRegex.exec(scriptText)) !== null) {
      const number = parseInt(match[1]);
      const visual = match[2].trim();

      scenes.push({
        id: `scene_${number}`,
        number,
        text: visual,
        isGenerating: false,
        approved: false,
      });
    }

    // If parsing failed, create 12 generic scenes
    if (scenes.length === 0) {
      for (let i = 1; i <= 12; i++) {
        scenes.push({
          id: `scene_${i}`,
          number: i,
          text: `Cena ${i} - Prompt para gerar imagem`,
          isGenerating: false,
          approved: false,
        });
      }
    }

    setScenePrompts(scenes);
  };

  // Update a scene prompt
  const updateScenePrompt = (id: string, text: string) => {
    setScenePrompts(prev => prev.map(s => s.id === id ? { ...s, text } : s));
  };

  // Generate image for a single scene
  const generateSceneImage = async (sceneId: string) => {
    if (!apiConfig.freepik_key) {
      toast.error('Configure a API Key da Freepik nas configurações');
      return;
    }

    const scene = scenePrompts.find(s => s.id === sceneId);
    if (!scene) return;

    setScenePrompts(prev => prev.map(s => s.id === sceneId ? { ...s, isGenerating: true } : s));

    try {
      freepikService.setApiKey(apiConfig.freepik_key);

      const urls = await freepikService.generateAndWait({
        prompt: scene.text,
        negative_prompt: negativePrompt,
        guidance_scale: 7.5,
        num_images: 1,
        image: {
          size: selectedSize as any,
        },
        styling: {
          style: selectedStyle as any,
          color: selectedColor as any,
        },
      });

      if (urls.length > 0) {
        setScenePrompts(prev => prev.map(s =>
          s.id === sceneId ? { ...s, imageUrl: urls[0], isGenerating: false, approved: true } : s
        ));
        toast.success(`Imagem da Cena ${scene.number} gerada!`);
      }
    } catch (error: any) {
      setScenePrompts(prev => prev.map(s => s.id === sceneId ? { ...s, isGenerating: false } : s));
      toast.error(`Erro na Cena ${scene.number}: ${error.message}`);
    }
  };

  // Generate all images
  const generateAllImages = async () => {
    if (!apiConfig.freepik_key) {
      toast.error('Configure a API Key da Freepik nas configurações');
      return;
    }

    setIsGeneratingImages(true);

    for (const scene of scenePrompts) {
      if (!scene.imageUrl) {
        await generateSceneImage(scene.id);
        // Small delay between requests
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    setIsGeneratingImages(false);
    toast.success('Todas as imagens foram geradas!');
    setCurrentStep(3);
  };

  // Generate narration with ElevenLabs
  const generateNarration = async () => {
    if (!apiConfig.elevenlabs_key) {
      toast.error('Configure a API Key do ElevenLabs nas configurações');
      return;
    }

    setIsGeneratingNarration(true);

    try {
      // Extract all narration texts from script
      const narrationRegex = /(?:Narração:|NARRAÇÃO:|Narration:)\s*([^]*?)(?=CENA\s*\d+:|Visual:|VISUAL:|$)/gi;
      const narrations: string[] = [];
      let match;

      while ((match = narrationRegex.exec(script)) !== null) {
        narrations.push(match[1].trim());
      }

      const fullNarration = narrations.join(' ');

      // Call ElevenLabs API
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiConfig.elevenlabs_key,
        },
        body: JSON.stringify({
          text: fullNarration,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
          },
        }),
      });

      if (!response.ok) throw new Error('Erro ao gerar narração');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      setNarrationUrl(audioUrl);
      toast.success('Narração gerada com sucesso!');
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    } finally {
      setIsGeneratingNarration(false);
    }
  };

  // Download all images as ZIP
  const downloadAllAsZip = async () => {
    const images = scenePrompts.filter(s => s.imageUrl);
    if (images.length === 0) {
      toast.error('Nenhuma imagem para baixar');
      return;
    }

    // For now, download individually
    images.forEach((scene) => {
      if (scene.imageUrl) {
        const link = document.createElement('a');
        link.href = scene.imageUrl;
        link.download = `cena_${scene.number}.png`;
        link.click();
      }
    });

    toast.success('Download iniciado!');
  };

  // Reset everything
  const handleReset = () => {
    if (confirm('Tem certeza que deseja resetar o projeto? Isso apagará todo o progresso.')) {
      resetStudio();
      setAgentMessages([]);
      setScenePrompts([]);
      setCurrentStep(1);
      setProjectName('Novo Projeto');
      toast.success('Projeto resetado!');
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-950">
      {/* Header */}
      <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <Icons.Film className="text-white" size={20} />
          </div>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="bg-transparent text-white font-bold text-lg focus:outline-none border-b border-transparent hover:border-gray-700 focus:border-orange-500 transition"
          />
        </div>

        {/* Steps Progress */}
        <div className="hidden lg:flex items-center gap-2">
          {steps.map((step) => (
            <div
              key={step.id}
              onClick={() => setCurrentStep(step.id)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition',
                currentStep === step.id
                  ? 'bg-orange-500 text-white'
                  : currentStep > step.id
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-gray-800 text-gray-500'
              )}
            >
              <span>{step.icon}</span>
              <span className="text-sm font-medium">{step.name}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition text-sm flex items-center gap-2"
          >
            <Icons.RefreshCw size={16} />
            Resetar
          </button>
          <button
            onClick={() => toast.success('Projeto salvo!')}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition text-sm flex items-center gap-2"
          >
            <Icons.Save size={16} />
            Salvar
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Step 1: Script Generation */}
        {currentStep === 1 && (
          <div className="flex-1 flex">
            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
              <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🤖</span>
                  <div>
                    <h2 className="text-white font-semibold">Criar Roteiro com IA</h2>
                    <p className="text-xs text-gray-500">Descreva o vídeo que deseja criar</p>
                  </div>
                </div>
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
                >
                  <option value="">Selecione um agente</option>
                  {studioAgents.map(a => (
                    <option key={a.id} value={a.id}>{a.avatar} {a.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {agentMessages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center max-w-md">
                      <div className="text-6xl mb-4">🎬</div>
                      <h3 className="text-xl font-bold text-white mb-2">Creator Studio</h3>
                      <p className="text-gray-400 mb-4">
                        Descreva o vídeo que você quer criar. O agente IA vai gerar um roteiro
                        com 12 cenas, incluindo descrições visuais e narração.
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        <button
                          onClick={() => setAgentInput('Crie um vídeo sobre dicas de produtividade para empreendedores')}
                          className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition"
                        >
                          💡 Produtividade
                        </button>
                        <button
                          onClick={() => setAgentInput('Crie um vídeo mostrando receita rápida de café da manhã saudável')}
                          className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition"
                        >
                          🍳 Receita
                        </button>
                        <button
                          onClick={() => setAgentInput('Crie um vídeo motivacional sobre superação de desafios')}
                          className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition"
                        >
                          🔥 Motivacional
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {agentMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={clsx(
                          'flex gap-3',
                          msg.role === 'user' ? 'justify-end' : 'justify-start'
                        )}
                      >
                        {msg.role === 'assistant' && (
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white">
                            🤖
                          </div>
                        )}
                        <div
                          className={clsx(
                            'max-w-[80%] rounded-2xl px-4 py-3',
                            msg.role === 'user'
                              ? 'bg-orange-500 text-white'
                              : 'bg-gray-800 text-gray-200'
                          )}
                        >
                          <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </>
                )}
              </div>

              <div className="p-4 border-t border-gray-800">
                <div className="flex gap-2">
                  <textarea
                    value={agentInput}
                    onChange={(e) => setAgentInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendToAgent();
                      }
                    }}
                    placeholder="Descreva o vídeo que você quer criar..."
                    rows={2}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none resize-none"
                  />
                  <button
                    onClick={sendToAgent}
                    disabled={isGeneratingScript || !agentInput.trim()}
                    className="px-6 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl transition flex items-center gap-2"
                  >
                    {isGeneratingScript ? (
                      <Icons.Loader size={20} className="animate-spin" />
                    ) : (
                      <Icons.Send size={20} />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Script Preview */}
            {script && (
              <div className="w-96 bg-gray-900 border-l border-gray-800 flex flex-col">
                <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                  <h3 className="text-white font-semibold flex items-center gap-2">
                    📝 Roteiro
                    {scriptApproved && <span className="text-green-400 text-xs">✓ Aprovado</span>}
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">{script}</pre>
                </div>
                <div className="p-4 border-t border-gray-800 flex gap-2">
                  <button
                    onClick={() => {
                      approveScript();
                      setCurrentStep(2);
                      toast.success('Roteiro aprovado!');
                    }}
                    className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition flex items-center justify-center gap-2"
                  >
                    <Icons.Check size={16} />
                    Aprovar
                  </button>
                  <button
                    onClick={() => {
                      rejectScript();
                      setAgentMessages([]);
                    }}
                    className="flex-1 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition"
                  >
                    Refazer
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Image Prompts */}
        {currentStep === 2 && (
          <div className="flex-1 flex flex-col p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  💡 Prompts de Imagem
                </h2>
                <p className="text-sm text-gray-400">
                  Edite os prompts para cada cena antes de gerar as imagens
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Style selector */}
                <select
                  value={selectedStyle}
                  onChange={(e) => setSelectedStyle(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
                >
                  {FREEPIK_STYLES.map(s => (
                    <option key={s.id} value={s.id}>{s.icon} {s.label}</option>
                  ))}
                </select>

                {/* Size selector */}
                <select
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
                >
                  {FREEPIK_SIZES.map(s => (
                    <option key={s.id} value={s.id}>{s.icon} {s.label}</option>
                  ))}
                </select>

                <button
                  onClick={generateAllImages}
                  disabled={isGeneratingImages || scenePrompts.length === 0}
                  className="px-6 py-2 bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white rounded-lg transition flex items-center gap-2"
                >
                  {isGeneratingImages ? (
                    <>
                      <Icons.Loader size={16} className="animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Icons.Sparkles size={16} />
                      Gerar Todas (Freepik)
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {scenePrompts.map((scene) => (
                <div
                  key={scene.id}
                  className={clsx(
                    'bg-gray-900 border rounded-xl overflow-hidden transition',
                    scene.approved ? 'border-green-500/50' : 'border-gray-800'
                  )}
                >
                  {/* Image preview */}
                  <div className="aspect-video bg-gray-800 relative">
                    {scene.imageUrl ? (
                      <img
                        src={scene.imageUrl}
                        alt={`Cena ${scene.number}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600">
                        {scene.isGenerating ? (
                          <Icons.Loader size={32} className="animate-spin" />
                        ) : (
                          <Icons.Image size={32} />
                        )}
                      </div>
                    )}
                    <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 rounded text-xs text-white font-bold">
                      CENA {scene.number}
                    </div>
                    {scene.approved && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <Icons.Check size={14} className="text-white" />
                      </div>
                    )}
                  </div>

                  {/* Prompt editor */}
                  <div className="p-3">
                    <textarea
                      value={scene.text}
                      onChange={(e) => updateScenePrompt(scene.id, e.target.value)}
                      rows={3}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:border-orange-500 focus:outline-none resize-none"
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => generateSceneImage(scene.id)}
                        disabled={scene.isGenerating}
                        className="flex-1 py-1.5 bg-pink-500/20 text-pink-400 hover:bg-pink-500/30 rounded-lg text-xs flex items-center justify-center gap-1 transition"
                      >
                        {scene.isGenerating ? (
                          <Icons.Loader size={12} className="animate-spin" />
                        ) : (
                          <Icons.Sparkles size={12} />
                        )}
                        Gerar
                      </button>
                      {scene.imageUrl && (
                        <button
                          onClick={() => setScenePrompts(prev =>
                            prev.map(s => s.id === scene.id ? { ...s, approved: !s.approved } : s)
                          )}
                          className={clsx(
                            'flex-1 py-1.5 rounded-lg text-xs transition',
                            scene.approved
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                          )}
                        >
                          {scene.approved ? '✓ Aprovada' : 'Aprovar'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-4 border-t border-gray-800 mt-4">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-6 py-2 text-gray-400 hover:text-white transition flex items-center gap-2"
              >
                <Icons.ArrowLeft size={16} />
                Voltar ao Roteiro
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                disabled={scenePrompts.filter(s => s.imageUrl).length === 0}
                className="px-6 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg transition flex items-center gap-2"
              >
                Próximo: Imagens
                <Icons.ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Images Gallery */}
        {currentStep === 3 && (
          <div className="flex-1 flex flex-col p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  🖼️ Galeria de Imagens
                </h2>
                <p className="text-sm text-gray-400">
                  {scenePrompts.filter(s => s.imageUrl).length} de {scenePrompts.length} imagens geradas
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={generateNarration}
                  disabled={isGeneratingNarration}
                  className="px-4 py-2 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg transition flex items-center gap-2"
                >
                  {isGeneratingNarration ? (
                    <Icons.Loader size={16} className="animate-spin" />
                  ) : (
                    '🎙️'
                  )}
                  Gerar Narração
                </button>
                <button
                  onClick={downloadAllAsZip}
                  className="px-4 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg transition flex items-center gap-2"
                >
                  <Icons.Download size={16} />
                  Baixar Imagens
                </button>
              </div>
            </div>

            {/* Narration player */}
            {narrationUrl && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-4">
                  <span className="text-2xl">🎙️</span>
                  <div className="flex-1">
                    <p className="text-green-400 font-medium">Narração Gerada</p>
                    <audio src={narrationUrl} controls className="w-full mt-2" />
                  </div>
                  <button
                    onClick={approveNarration}
                    className={clsx(
                      'px-4 py-2 rounded-lg transition',
                      narrationApproved
                        ? 'bg-green-500 text-white'
                        : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                    )}
                  >
                    {narrationApproved ? '✓ Aprovada' : 'Aprovar'}
                  </button>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {scenePrompts.map((scene) => (
                <div
                  key={scene.id}
                  className={clsx(
                    'aspect-[9/16] bg-gray-900 rounded-xl overflow-hidden relative group border-2 transition',
                    scene.approved ? 'border-green-500' : 'border-transparent'
                  )}
                >
                  {scene.imageUrl ? (
                    <>
                      <img
                        src={scene.imageUrl}
                        alt={`Cena ${scene.number}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                        <button
                          onClick={() => generateSceneImage(scene.id)}
                          className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition"
                          title="Regenerar"
                        >
                          <Icons.RefreshCw size={16} className="text-white" />
                        </button>
                        <a
                          href={scene.imageUrl}
                          download={`cena_${scene.number}.png`}
                          className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition"
                          title="Download"
                        >
                          <Icons.Download size={16} className="text-white" />
                        </a>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                      <Icons.Image size={24} />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                    <span className="text-xs text-white font-bold">CENA {scene.number}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-4 border-t border-gray-800 mt-4">
              <button
                onClick={() => setCurrentStep(2)}
                className="px-6 py-2 text-gray-400 hover:text-white transition flex items-center gap-2"
              >
                <Icons.ArrowLeft size={16} />
                Voltar aos Prompts
              </button>
              <button
                onClick={() => setCurrentStep(4)}
                className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition flex items-center gap-2"
              >
                Próximo: Vídeos
                <Icons.ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Videos */}
        {currentStep === 4 && (
          <div className="flex-1 flex flex-col p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  🎬 Geração de Vídeos
                </h2>
                <p className="text-sm text-gray-400">
                  Transforme suas imagens em vídeos animados (em breve)
                </p>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="text-6xl mb-4">🎬</div>
                <h3 className="text-xl font-bold text-white mb-2">Em Breve!</h3>
                <p className="text-gray-400 mb-6">
                  A geração de vídeos via FAL.ai será implementada em breve.
                  Por enquanto, você pode usar as imagens geradas para criar seus vídeos
                  em ferramentas como CapCut, Canva ou Premiere.
                </p>
                <button
                  onClick={() => setCurrentStep(5)}
                  className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition"
                >
                  Ir para Exportação
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Export */}
        {currentStep === 5 && (
          <div className="flex-1 flex flex-col p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  📦 Exportar Projeto
                </h2>
                <p className="text-sm text-gray-400">
                  Baixe todos os assets do seu projeto
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="max-w-2xl mx-auto space-y-6">
                {/* Project Summary */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    📊 Resumo do Projeto
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-800 rounded-lg p-4">
                      <p className="text-3xl font-bold text-orange-400">
                        {scenePrompts.filter(s => s.imageUrl).length}
                      </p>
                      <p className="text-sm text-gray-400">Imagens Geradas</p>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-4">
                      <p className="text-3xl font-bold text-green-400">
                        {narrationUrl ? '1' : '0'}
                      </p>
                      <p className="text-sm text-gray-400">Narração</p>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-4">
                      <p className="text-3xl font-bold text-blue-400">
                        {scenePrompts.length}
                      </p>
                      <p className="text-sm text-gray-400">Total de Cenas</p>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-4">
                      <p className="text-3xl font-bold text-purple-400">
                        {scenePrompts.filter(s => s.approved).length}
                      </p>
                      <p className="text-sm text-gray-400">Aprovadas</p>
                    </div>
                  </div>
                </div>

                {/* Download Options */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    ⬇️ Downloads
                  </h3>
                  <div className="space-y-3">
                    <button
                      onClick={downloadAllAsZip}
                      className="w-full py-4 bg-pink-500/20 text-pink-400 hover:bg-pink-500/30 rounded-xl transition flex items-center justify-center gap-3"
                    >
                      <Icons.Download size={20} />
                      Baixar Todas as Imagens
                    </button>

                    {narrationUrl && (
                      <a
                        href={narrationUrl}
                        download="narracao.mp3"
                        className="w-full py-4 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-xl transition flex items-center justify-center gap-3"
                      >
                        <Icons.Download size={20} />
                        Baixar Narração (MP3)
                      </a>
                    )}

                    <button
                      onClick={() => {
                        const data = {
                          projectName,
                          script,
                          scenePrompts,
                          narrationUrl,
                          exportedAt: new Date().toISOString(),
                        };
                        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${projectName.replace(/\s+/g, '_')}_projeto.json`;
                        a.click();
                        toast.success('Projeto exportado!');
                      }}
                      className="w-full py-4 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-xl transition flex items-center justify-center gap-3"
                    >
                      <Icons.Download size={20} />
                      Exportar Projeto (JSON)
                    </button>
                  </div>
                </div>

                {/* Next Steps */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    🚀 Próximos Passos
                  </h3>
                  <ul className="space-y-3 text-gray-400">
                    <li className="flex items-center gap-3">
                      <span className="w-6 h-6 bg-orange-500/20 rounded flex items-center justify-center text-orange-400 text-xs">1</span>
                      Importe as imagens no CapCut ou Canva
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="w-6 h-6 bg-orange-500/20 rounded flex items-center justify-center text-orange-400 text-xs">2</span>
                      Adicione a narração ao vídeo
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="w-6 h-6 bg-orange-500/20 rounded flex items-center justify-center text-orange-400 text-xs">3</span>
                      Adicione transições e efeitos
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="w-6 h-6 bg-orange-500/20 rounded flex items-center justify-center text-orange-400 text-xs">4</span>
                      Exporte e publique nas redes sociais!
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-4 border-t border-gray-800 mt-4">
              <button
                onClick={() => setCurrentStep(3)}
                className="px-6 py-2 text-gray-400 hover:text-white transition flex items-center gap-2"
              >
                <Icons.ArrowLeft size={16} />
                Voltar
              </button>
              <button
                onClick={handleReset}
                className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition flex items-center gap-2"
              >
                <Icons.Plus size={16} />
                Novo Projeto
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
