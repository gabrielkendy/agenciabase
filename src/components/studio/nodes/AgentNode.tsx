import { memo, useState, useCallback } from 'react';
import { NodeProps } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { Icons } from '../../Icons';
import { useStore } from '../../../store';
import { useStudioStore } from '../../../store/studioStore';
import { sendMessageToGeminiWithHistory } from '../../../services/geminiService';
import toast from 'react-hot-toast';

const SCRIPT_SYSTEM_PROMPT = `Você é um roteirista especializado em criar roteiros para vídeos curtos de formato vertical (Reels/TikTok/Shorts).

Quando o usuário descrever um tema, crie um roteiro COMPLETO seguindo este formato:

**ROTEIRO: [Título do Vídeo]**

**Duração:** ~60 segundos

**CENAS:**

[Cena 1 - 0:00-0:05]
Narração: "texto da narração"
Visual: descrição da cena/imagem

[Cena 2 - 0:05-0:10]
Narração: "texto da narração"
Visual: descrição da cena/imagem

(continue até 12 cenas)

**TEXTO COMPLETO DA NARRAÇÃO:**
[Toda a narração junta para gerar o áudio]

Crie roteiros engajantes, com ganchos fortes no início e call-to-action no final.`;

export const AgentNode = memo((_props: NodeProps) => {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { apiConfig } = useStore();
  const { setScript, setIsGeneratingScript, script, scriptApproved } = useStudioStore();

  const handleSend = useCallback(async () => {
    if (!message.trim() || isLoading) return;

    const userMessage = message.trim();
    setMessage('');
    setChatHistory((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    setIsGeneratingScript(true);

    try {
      // Use Gemini to generate script
      const fullPrompt = chatHistory.length === 0
        ? `${SCRIPT_SYSTEM_PROMPT}\n\nUsuário: ${userMessage}`
        : userMessage;

      const response = await sendMessageToGeminiWithHistory(
        fullPrompt,
        apiConfig.gemini_key || '',
        chatHistory.map((m) => ({ role: m.role, content: m.content })),
        'gemini-2.0-flash-exp'
      );

      setChatHistory((prev) => [...prev, { role: 'assistant', content: response }]);

      // Extract script if it contains the markers
      if (response.includes('ROTEIRO:') || response.includes('CENAS:')) {
        setScript(response);
        toast.success('Roteiro gerado! Veja o nó de Roteiro para aprovar.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao gerar resposta');
      setChatHistory((prev) => [...prev, { role: 'assistant', content: 'Erro ao processar. Tente novamente.' }]);
    } finally {
      setIsLoading(false);
      setIsGeneratingScript(false);
    }
  }, [message, chatHistory, apiConfig.gemini_key, setScript, setIsGeneratingScript, isLoading]);

  const status = isLoading ? 'processing' : script ? 'completed' : 'idle';

  return (
    <BaseNode
      type="agent"
      title="Agente IA"
      icon="🤖"
      status={status}
      approved={scriptApproved}
      hasInput={false}
    >
      <div className="space-y-3">
        {/* Chat History */}
        <div className="max-h-[200px] overflow-y-auto space-y-2 text-xs">
          {chatHistory.length === 0 && (
            <p className="text-gray-400 text-center py-4">
              Descreva o vídeo que deseja criar...
            </p>
          )}
          {chatHistory.map((msg, i) => (
            <div
              key={i}
              className={`p-2 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-orange-500/20 text-orange-200 ml-4'
                  : 'bg-gray-700/50 text-gray-200 mr-4'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content.slice(0, 300)}{msg.content.length > 300 ? '...' : ''}</p>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-gray-400 p-2">
              <Icons.Loader className="w-4 h-4 animate-spin" />
              <span>Gerando roteiro...</span>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ex: Vídeo sobre 5 dicas de produtividade..."
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-orange-500"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !message.trim()}
            className="px-3 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition"
          >
            <Icons.Send className="w-4 h-4" />
          </button>
        </div>

        {script && (
          <p className="text-xs text-green-400 flex items-center gap-1">
            <Icons.CheckCircle className="w-3 h-3" />
            Roteiro criado! Confira no próximo nó.
          </p>
        )}
      </div>
    </BaseNode>
  );
});

AgentNode.displayName = 'AgentNode';
