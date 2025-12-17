import { memo, useState, useEffect, useRef } from 'react';
import { NodeProps } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { Icons } from '../../Icons';
import { useStore } from '../../../store';
import { useStudioStore } from '../../../store/studioStore';
import { elevenLabsService, ElevenLabsVoice } from '../../../services/elevenLabsService';
import toast from 'react-hot-toast';

export const NarrationNode = memo((_props: NodeProps) => {
  const { apiConfig } = useStore();
  const {
    script,
    scriptApproved,
    narrationUrl,
    narrationApproved,
    setNarrationUrl,
    approveNarration,
    rejectNarration,
    isGeneratingNarration,
    setIsGeneratingNarration,
    selectedVoiceId,
    setSelectedVoiceId,
  } = useStudioStore();

  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const elevenLabsKey = (apiConfig as any).elevenlabs_key;

  // Load voices
  useEffect(() => {
    const loadVoices = async () => {
      if (elevenLabsKey) {
        try {
          const loadedVoices = await elevenLabsService.getVoices(elevenLabsKey);
          setVoices(loadedVoices);
        } catch (error) {
          // Use default voices
          setVoices(elevenLabsService.defaultVoices);
        }
      } else {
        setVoices(elevenLabsService.defaultVoices);
      }
    };
    loadVoices();
  }, [elevenLabsKey]);

  // Extract narration text from script
  const extractNarration = (scriptText: string): string => {
    // Try to find the full narration section
    const narrationMatch = scriptText.match(/TEXTO COMPLETO DA NARRAÇÃO:\s*([\s\S]*?)(?=\n\n\*\*|$)/i);
    if (narrationMatch) {
      return narrationMatch[1].trim();
    }

    // Extract all narration lines
    const narrationLines = scriptText.match(/Narração:\s*"([^"]+)"/gi);
    if (narrationLines) {
      return narrationLines
        .map((line) => line.replace(/Narração:\s*"/i, '').replace(/"$/, ''))
        .join(' ');
    }

    // Fallback: use first 500 chars
    return scriptText.slice(0, 500);
  };

  const handleGenerate = async () => {
    if (!elevenLabsKey) {
      toast.error('Configure a chave do ElevenLabs nas configurações');
      return;
    }

    if (!script) {
      toast.error('Aguarde o roteiro ser aprovado');
      return;
    }

    setIsGeneratingNarration(true);

    try {
      const narrationText = extractNarration(script);
      const audioDataUrl = await elevenLabsService.generateSpeechAsDataUrl(
        narrationText,
        selectedVoiceId,
        elevenLabsKey
      );

      setNarrationUrl(audioDataUrl);
      toast.success('Narração gerada com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao gerar narração');
    } finally {
      setIsGeneratingNarration(false);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const enabled = scriptApproved;
  const status = isGeneratingNarration ? 'processing' : narrationUrl ? 'completed' : 'idle';

  return (
    <BaseNode
      type="narration"
      title="Narração"
      icon="🎙️"
      status={status}
      approved={narrationApproved}
      enabled={enabled}
    >
      <div className="space-y-3">
        {!enabled ? (
          <p className="text-gray-400 text-sm text-center py-4">
            Aguardando aprovação do roteiro...
          </p>
        ) : (
          <>
            {/* Voice Selection */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Voz</label>
              <select
                value={selectedVoiceId}
                onChange={(e) => setSelectedVoiceId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-green-500"
                disabled={isGeneratingNarration}
              >
                {voices.map((voice) => (
                  <option key={voice.voice_id} value={voice.voice_id}>
                    {voice.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Audio Player */}
            {narrationUrl && (
              <div className="bg-gray-800/50 rounded-lg p-3">
                <audio
                  ref={audioRef}
                  src={narrationUrl}
                  onEnded={() => setIsPlaying(false)}
                  className="hidden"
                />
                <div className="flex items-center gap-3">
                  <button
                    onClick={togglePlay}
                    className="w-10 h-10 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center text-white"
                  >
                    {isPlaying ? (
                      <Icons.Loader className="w-5 h-5" />
                    ) : (
                      <Icons.ArrowRight className="w-5 h-5" />
                    )}
                  </button>
                  <div className="flex-1">
                    <p className="text-xs text-gray-400">Narração gerada</p>
                    <p className="text-sm text-white">Clique para ouvir</p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            {!narrationUrl ? (
              <button
                onClick={handleGenerate}
                disabled={isGeneratingNarration || !elevenLabsKey}
                className="w-full px-3 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg text-sm flex items-center justify-center gap-2"
              >
                {isGeneratingNarration ? (
                  <>
                    <Icons.Loader className="w-4 h-4 animate-spin" />
                    Gerando narração...
                  </>
                ) : (
                  <>
                    <Icons.Sparkles className="w-4 h-4" />
                    Gerar Narração
                  </>
                )}
              </button>
            ) : !narrationApproved ? (
              <div className="flex gap-2">
                <button
                  onClick={approveNarration}
                  className="flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm flex items-center justify-center gap-2"
                >
                  <Icons.Check className="w-4 h-4" />
                  Aprovar
                </button>
                <button
                  onClick={handleGenerate}
                  className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm flex items-center justify-center gap-2"
                >
                  <Icons.Refresh className="w-4 h-4" />
                </button>
                <button
                  onClick={rejectNarration}
                  className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm flex items-center justify-center gap-2"
                >
                  <Icons.X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-xs text-green-400 flex items-center gap-1">
                  <Icons.CheckCircle className="w-4 h-4" />
                  Narração aprovada!
                </span>
                <button
                  onClick={rejectNarration}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Regenerar
                </button>
              </div>
            )}

            {!elevenLabsKey && (
              <p className="text-xs text-yellow-400 flex items-center gap-1">
                <Icons.AlertTriangle className="w-3 h-3" />
                Configure ElevenLabs API Key
              </p>
            )}
          </>
        )}
      </div>
    </BaseNode>
  );
});

NarrationNode.displayName = 'NarrationNode';
