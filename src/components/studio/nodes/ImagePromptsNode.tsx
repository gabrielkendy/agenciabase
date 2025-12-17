import { memo, useState } from 'react';
import { NodeProps } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { Icons } from '../../Icons';
import { useStore } from '../../../store';
import { useStudioStore } from '../../../store/studioStore';
import { sendMessageToGeminiWithHistory } from '../../../services/geminiService';
import { ImagePrompt } from '../../../types/studio';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

const PROMPTS_SYSTEM = `Você é um especialista em criar prompts de imagens para IA generativa.

Com base no roteiro fornecido, crie EXATAMENTE 12 prompts de imagem em inglês, um para cada cena do vídeo.

FORMATO DE SAÍDA (JSON):
{
  "prompts": [
    "prompt 1 in english, detailed, cinematic, high quality",
    "prompt 2 in english...",
    ...até 12 prompts
  ]
}

REGRAS:
- Prompts em INGLÊS
- Cada prompt deve ter 20-50 palavras
- Incluir estilo visual (cinematic, dramatic lighting, etc)
- Incluir qualidade (8k, high detail, professional)
- Manter consistência visual entre as cenas
- Formato vertical (9:16) para redes sociais

RETORNE APENAS O JSON, SEM TEXTO ADICIONAL.`;

export const ImagePromptsNode = memo((_props: NodeProps) => {
  const { apiConfig } = useStore();
  const {
    script,
    scriptApproved,
    imagePrompts,
    imagePromptsApproved,
    setImagePrompts,
    updateImagePrompt,
    approveImagePrompts,
    rejectImagePrompts,
  } = useStudioStore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const handleGenerate = async () => {
    if (!script) return;

    setIsGenerating(true);

    try {
      const response = await sendMessageToGeminiWithHistory(
        `${PROMPTS_SYSTEM}\n\nROTEIRO:\n${script}`,
        apiConfig.gemini_key || '',
        [],
        'gemini-2.0-flash-exp'
      );

      // Parse JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Resposta inválida da IA');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const prompts: ImagePrompt[] = (parsed.prompts || []).slice(0, 12).map((text: string) => ({
        id: uuidv4(),
        text,
        approved: false,
      }));

      if (prompts.length < 12) {
        // Fill remaining with placeholders
        while (prompts.length < 12) {
          prompts.push({
            id: uuidv4(),
            text: `Scene ${prompts.length + 1} - [Edit this prompt]`,
            approved: false,
          });
        }
      }

      setImagePrompts(prompts);
      toast.success('12 prompts gerados!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao gerar prompts');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEdit = (prompt: ImagePrompt) => {
    setEditingId(prompt.id);
    setEditText(prompt.text);
  };

  const handleSaveEdit = (id: string) => {
    updateImagePrompt(id, editText);
    setEditingId(null);
    setEditText('');
  };

  const enabled = scriptApproved;
  const status = isGenerating ? 'processing' : imagePrompts.length > 0 ? 'completed' : 'idle';

  return (
    <BaseNode
      type="imagePrompts"
      title="Prompts de Imagens"
      icon="💡"
      status={status}
      approved={imagePromptsApproved}
      enabled={enabled}
    >
      <div className="space-y-3">
        {!enabled ? (
          <p className="text-gray-400 text-sm text-center py-4">
            Aguardando aprovação do roteiro...
          </p>
        ) : imagePrompts.length === 0 ? (
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full px-3 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-700 text-white rounded-lg text-sm flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Icons.Loader className="w-4 h-4 animate-spin" />
                Gerando prompts...
              </>
            ) : (
              <>
                <Icons.Sparkles className="w-4 h-4" />
                Gerar 12 Prompts
              </>
            )}
          </button>
        ) : (
          <>
            {/* Prompts List */}
            <div className="max-h-[250px] overflow-y-auto space-y-2">
              {imagePrompts.map((prompt, index) => (
                <div
                  key={prompt.id}
                  className="bg-gray-800/50 rounded-lg p-2 text-xs"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-cyan-400 font-bold">{index + 1}</span>
                    {editingId === prompt.id ? (
                      <div className="flex-1 space-y-2">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full px-2 py-1 bg-gray-900 border border-gray-700 rounded text-white text-xs resize-none"
                          rows={3}
                        />
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleSaveEdit(prompt.id)}
                            className="px-2 py-1 bg-green-500 text-white rounded text-xs"
                          >
                            Salvar
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-2 py-1 bg-gray-700 text-white rounded text-xs"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="flex-1 text-gray-300">{prompt.text.slice(0, 100)}...</p>
                        <button
                          onClick={() => handleEdit(prompt)}
                          className="text-gray-500 hover:text-white"
                        >
                          <Icons.Edit className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            {!imagePromptsApproved ? (
              <div className="flex gap-2">
                <button
                  onClick={approveImagePrompts}
                  className="flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm flex items-center justify-center gap-2"
                >
                  <Icons.Check className="w-4 h-4" />
                  Aprovar Todos
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm"
                >
                  <Icons.Refresh className="w-4 h-4" />
                </button>
                <button
                  onClick={rejectImagePrompts}
                  className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm"
                >
                  <Icons.X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-xs text-green-400 flex items-center gap-1">
                  <Icons.CheckCircle className="w-4 h-4" />
                  {imagePrompts.length} prompts aprovados!
                </span>
                <button
                  onClick={rejectImagePrompts}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Editar
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </BaseNode>
  );
});

ImagePromptsNode.displayName = 'ImagePromptsNode';
