import { memo, useState } from 'react';
import { NodeProps } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { Icons } from '../../Icons';
import { useStore } from '../../../store';
import { useStudioStore } from '../../../store/studioStore';
import { falaiService } from '../../../services/falaiService';
import { GeneratedImage } from '../../../types/studio';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

export const ImageGeneratorNode = memo((_props: NodeProps) => {
  const { apiConfig } = useStore();
  const {
    imagePrompts,
    imagePromptsApproved,
    generatedImages,
    imagesApproved,
    setGeneratedImages,
    updateGeneratedImage,
    approveImage,
    approveAllImages,
    isGeneratingImages,
    setIsGeneratingImages,
  } = useStudioStore();

  const [model, setModel] = useState<'fal-ai/flux-pro' | 'fal-ai/flux/dev'>('fal-ai/flux/dev');
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | '1:1'>('9:16');

  const falaiKey = (apiConfig as any).falai_key;

  const handleGenerateAll = async () => {
    if (!falaiKey) {
      toast.error('Configure a chave do FAL.ai nas configurações');
      return;
    }

    if (imagePrompts.length === 0) {
      toast.error('Gere os prompts primeiro');
      return;
    }

    setIsGeneratingImages(true);

    // Initialize images array
    const initialImages: GeneratedImage[] = imagePrompts.map((prompt) => ({
      id: uuidv4(),
      promptId: prompt.id,
      prompt: prompt.text,
      status: 'pending',
      approved: false,
    }));

    setGeneratedImages(initialImages);

    // Generate images one by one
    for (let i = 0; i < initialImages.length; i++) {
      const image = initialImages[i];

      try {
        updateGeneratedImage(image.id, { status: 'generating' });

        const result = await falaiService.generateImage(image.prompt, falaiKey, {
          model,
          aspectRatio,
        });

        if (result.images && result.images.length > 0) {
          updateGeneratedImage(image.id, {
            url: result.images[0].url,
            status: 'completed',
          });
        } else {
          throw new Error('No image returned');
        }
      } catch (error: any) {
        updateGeneratedImage(image.id, {
          status: 'error',
          error: error.message,
        });
        toast.error(`Erro na imagem ${i + 1}: ${error.message}`);
      }
    }

    setIsGeneratingImages(false);
    toast.success('Geração de imagens concluída!');
  };

  const handleRegenerateOne = async (imageId: string) => {
    if (!falaiKey) return;

    const image = generatedImages.find((img) => img.id === imageId);
    if (!image) return;

    try {
      updateGeneratedImage(imageId, { status: 'generating', error: undefined });

      const result = await falaiService.generateImage(image.prompt, falaiKey, {
        model,
        aspectRatio,
      });

      if (result.images && result.images.length > 0) {
        updateGeneratedImage(imageId, {
          url: result.images[0].url,
          status: 'completed',
        });
        toast.success('Imagem regenerada!');
      }
    } catch (error: any) {
      updateGeneratedImage(imageId, { status: 'error', error: error.message });
      toast.error(error.message);
    }
  };

  const enabled = imagePromptsApproved;
  const status = isGeneratingImages ? 'processing' : generatedImages.length > 0 ? 'completed' : 'idle';
  const completedCount = generatedImages.filter((img) => img.status === 'completed').length;
  const approvedCount = generatedImages.filter((img) => img.approved).length;

  return (
    <BaseNode
      type="imageGenerator"
      title="Gerar Imagens"
      icon="🖼️"
      status={status}
      approved={imagesApproved}
      enabled={enabled}
    >
      <div className="space-y-3">
        {!enabled ? (
          <p className="text-gray-400 text-sm text-center py-4">
            Aguardando aprovação dos prompts...
          </p>
        ) : (
          <>
            {/* Config */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Modelo</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value as any)}
                  className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-xs"
                  disabled={isGeneratingImages}
                >
                  <option value="fal-ai/flux/dev">Flux Dev</option>
                  <option value="fal-ai/flux-pro">Flux Pro</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Aspecto</label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value as any)}
                  className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-xs"
                  disabled={isGeneratingImages}
                >
                  <option value="9:16">9:16 (Vertical)</option>
                  <option value="16:9">16:9 (Horizontal)</option>
                  <option value="1:1">1:1 (Quadrado)</option>
                </select>
              </div>
            </div>

            {/* Images Grid */}
            {generatedImages.length > 0 && (
              <div className="grid grid-cols-4 gap-1 max-h-[200px] overflow-y-auto">
                {generatedImages.map((image, index) => (
                  <div
                    key={image.id}
                    className={`relative aspect-[9/16] bg-gray-800 rounded overflow-hidden border-2 ${
                      image.approved ? 'border-green-500' : 'border-transparent'
                    }`}
                  >
                    {image.status === 'generating' && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Icons.Loader className="w-4 h-4 text-pink-400 animate-spin" />
                      </div>
                    )}
                    {image.status === 'completed' && image.url && (
                      <>
                        <img
                          src={image.url}
                          alt={`Scene ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition flex items-center justify-center gap-1">
                          <button
                            onClick={() => approveImage(image.id)}
                            className="p-1 bg-green-500 rounded"
                          >
                            <Icons.Check className="w-3 h-3 text-white" />
                          </button>
                          <button
                            onClick={() => handleRegenerateOne(image.id)}
                            className="p-1 bg-blue-500 rounded"
                          >
                            <Icons.Refresh className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      </>
                    )}
                    {image.status === 'error' && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Icons.XCircle className="w-4 h-4 text-red-400" />
                      </div>
                    )}
                    {image.status === 'pending' && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs text-gray-500">{index + 1}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Progress */}
            {generatedImages.length > 0 && (
              <div className="text-xs text-gray-400 flex justify-between">
                <span>{completedCount}/{generatedImages.length} geradas</span>
                <span>{approvedCount} aprovadas</span>
              </div>
            )}

            {/* Actions */}
            {generatedImages.length === 0 ? (
              <button
                onClick={handleGenerateAll}
                disabled={isGeneratingImages || !falaiKey}
                className="w-full px-3 py-2 bg-pink-500 hover:bg-pink-600 disabled:bg-gray-700 text-white rounded-lg text-sm flex items-center justify-center gap-2"
              >
                {isGeneratingImages ? (
                  <>
                    <Icons.Loader className="w-4 h-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Icons.Image className="w-4 h-4" />
                    Gerar 12 Imagens
                  </>
                )}
              </button>
            ) : !imagesApproved ? (
              <div className="flex gap-2">
                <button
                  onClick={approveAllImages}
                  disabled={completedCount < generatedImages.length}
                  className="flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-700 text-white rounded-lg text-sm flex items-center justify-center gap-2"
                >
                  <Icons.CheckCheck className="w-4 h-4" />
                  Aprovar Todas
                </button>
                <button
                  onClick={handleGenerateAll}
                  disabled={isGeneratingImages}
                  className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm"
                >
                  <Icons.Refresh className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <span className="text-xs text-green-400 flex items-center gap-1">
                <Icons.CheckCircle className="w-4 h-4" />
                Todas as imagens aprovadas!
              </span>
            )}

            {!falaiKey && (
              <p className="text-xs text-yellow-400 flex items-center gap-1">
                <Icons.AlertTriangle className="w-3 h-3" />
                Configure FAL.ai API Key
              </p>
            )}
          </>
        )}
      </div>
    </BaseNode>
  );
});

ImageGeneratorNode.displayName = 'ImageGeneratorNode';
