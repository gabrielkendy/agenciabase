import { memo, useState } from 'react';
import { NodeProps } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { Icons } from '../../Icons';
import { useStore } from '../../../store';
import { useStudioStore } from '../../../store/studioStore';
import { falaiService } from '../../../services/falaiService';
import { GeneratedVideo } from '../../../types/studio';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

export const VideoGeneratorNode = memo((_props: NodeProps) => {
  const { apiConfig } = useStore();
  const {
    generatedImages,
    imagesApproved,
    generatedVideos,
    videosApproved,
    setGeneratedVideos,
    updateGeneratedVideo,
    approveVideo,
    approveAllVideos,
    isGeneratingVideos,
    setIsGeneratingVideos,
  } = useStudioStore();

  const [model, setModel] = useState<'fal-ai/kling-video/v1.5/pro/image-to-video' | 'fal-ai/minimax-video/image-to-video' | 'fal-ai/luma-dream-machine'>('fal-ai/kling-video/v1.5/pro/image-to-video');
  const [duration, setDuration] = useState<'5' | '10'>('5');

  const falaiKey = (apiConfig as any).falai_key;

  const generateMotionPrompt = (imagePrompt: string): string => {
    // Create a simple motion prompt based on the image prompt
    const motionKeywords = [
      'slow zoom in',
      'gentle camera movement',
      'subtle motion',
      'cinematic pan',
      'slight parallax effect',
    ];
    const randomMotion = motionKeywords[Math.floor(Math.random() * motionKeywords.length)];
    return `${randomMotion}, ${imagePrompt.slice(0, 100)}`;
  };

  const handleGenerateAll = async () => {
    if (!falaiKey) {
      toast.error('Configure a chave do FAL.ai nas configurações');
      return;
    }

    const approvedImages = generatedImages.filter((img) => img.approved && img.url);
    if (approvedImages.length === 0) {
      toast.error('Aprove as imagens primeiro');
      return;
    }

    setIsGeneratingVideos(true);

    // Initialize videos array
    const initialVideos: GeneratedVideo[] = approvedImages.map((image) => ({
      id: uuidv4(),
      imageId: image.id,
      imageUrl: image.url!,
      motionPrompt: generateMotionPrompt(image.prompt),
      status: 'pending',
      approved: false,
    }));

    setGeneratedVideos(initialVideos);

    // Generate videos one by one
    for (let i = 0; i < initialVideos.length; i++) {
      const video = initialVideos[i];

      try {
        updateGeneratedVideo(video.id, { status: 'generating' });

        const result = await falaiService.generateVideo(
          video.imageUrl,
          video.motionPrompt,
          falaiKey,
          { model, duration }
        );

        if (result.video && result.video.url) {
          updateGeneratedVideo(video.id, {
            url: result.video.url,
            status: 'completed',
          });
        } else {
          throw new Error('No video returned');
        }
      } catch (error: any) {
        updateGeneratedVideo(video.id, {
          status: 'error',
          error: error.message,
        });
        toast.error(`Erro no vídeo ${i + 1}: ${error.message}`);
      }
    }

    setIsGeneratingVideos(false);
    toast.success('Geração de vídeos concluída!');
  };

  const handleRegenerateOne = async (videoId: string) => {
    if (!falaiKey) return;

    const video = generatedVideos.find((v) => v.id === videoId);
    if (!video) return;

    try {
      updateGeneratedVideo(videoId, { status: 'generating', error: undefined });

      const result = await falaiService.generateVideo(
        video.imageUrl,
        video.motionPrompt,
        falaiKey,
        { model, duration }
      );

      if (result.video && result.video.url) {
        updateGeneratedVideo(videoId, {
          url: result.video.url,
          status: 'completed',
        });
        toast.success('Vídeo regenerado!');
      }
    } catch (error: any) {
      updateGeneratedVideo(videoId, { status: 'error', error: error.message });
      toast.error(error.message);
    }
  };

  const enabled = imagesApproved;
  const status = isGeneratingVideos ? 'processing' : generatedVideos.length > 0 ? 'completed' : 'idle';
  const completedCount = generatedVideos.filter((v) => v.status === 'completed').length;
  const approvedCount = generatedVideos.filter((v) => v.approved).length;

  return (
    <BaseNode
      type="videoGenerator"
      title="Gerar Vídeos"
      icon="🎬"
      status={status}
      approved={videosApproved}
      enabled={enabled}
    >
      <div className="space-y-3">
        {!enabled ? (
          <p className="text-gray-400 text-sm text-center py-4">
            Aguardando aprovação das imagens...
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
                  disabled={isGeneratingVideos}
                >
                  <option value="fal-ai/kling-video/v1.5/pro/image-to-video">Kling 1.5 Pro</option>
                  <option value="fal-ai/minimax-video/image-to-video">Minimax</option>
                  <option value="fal-ai/luma-dream-machine">Luma Dream</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Duração</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value as any)}
                  className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-xs"
                  disabled={isGeneratingVideos}
                >
                  <option value="5">5 segundos</option>
                  <option value="10">10 segundos</option>
                </select>
              </div>
            </div>

            {/* Videos Grid */}
            {generatedVideos.length > 0 && (
              <div className="grid grid-cols-4 gap-1 max-h-[200px] overflow-y-auto">
                {generatedVideos.map((video, index) => (
                  <div
                    key={video.id}
                    className={`relative aspect-[9/16] bg-gray-800 rounded overflow-hidden border-2 ${
                      video.approved ? 'border-green-500' : 'border-transparent'
                    }`}
                  >
                    {video.status === 'generating' && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                        <Icons.Loader className="w-4 h-4 text-purple-400 animate-spin" />
                        <span className="text-xs text-gray-500">~2min</span>
                      </div>
                    )}
                    {video.status === 'completed' && video.url && (
                      <>
                        <video
                          src={video.url}
                          className="w-full h-full object-cover"
                          muted
                          loop
                          playsInline
                          onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                          onMouseLeave={(e) => (e.target as HTMLVideoElement).pause()}
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition flex items-center justify-center gap-1">
                          <button
                            onClick={() => approveVideo(video.id)}
                            className="p-1 bg-green-500 rounded"
                          >
                            <Icons.Check className="w-3 h-3 text-white" />
                          </button>
                          <button
                            onClick={() => handleRegenerateOne(video.id)}
                            className="p-1 bg-blue-500 rounded"
                          >
                            <Icons.Refresh className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      </>
                    )}
                    {video.status === 'error' && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Icons.XCircle className="w-4 h-4 text-red-400" />
                      </div>
                    )}
                    {video.status === 'pending' && (
                      <div className="absolute inset-0">
                        <img
                          src={video.imageUrl}
                          alt=""
                          className="w-full h-full object-cover opacity-50"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs text-white">{index + 1}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Progress */}
            {generatedVideos.length > 0 && (
              <div className="text-xs text-gray-400 flex justify-between">
                <span>{completedCount}/{generatedVideos.length} gerados</span>
                <span>{approvedCount} aprovados</span>
              </div>
            )}

            {/* Actions */}
            {generatedVideos.length === 0 ? (
              <button
                onClick={handleGenerateAll}
                disabled={isGeneratingVideos || !falaiKey}
                className="w-full px-3 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-700 text-white rounded-lg text-sm flex items-center justify-center gap-2"
              >
                {isGeneratingVideos ? (
                  <>
                    <Icons.Loader className="w-4 h-4 animate-spin" />
                    Gerando vídeos...
                  </>
                ) : (
                  <>
                    <Icons.Video className="w-4 h-4" />
                    Gerar Vídeos
                  </>
                )}
              </button>
            ) : !videosApproved ? (
              <div className="flex gap-2">
                <button
                  onClick={approveAllVideos}
                  disabled={completedCount < generatedVideos.length}
                  className="flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-700 text-white rounded-lg text-sm flex items-center justify-center gap-2"
                >
                  <Icons.CheckCheck className="w-4 h-4" />
                  Aprovar Todos
                </button>
                <button
                  onClick={handleGenerateAll}
                  disabled={isGeneratingVideos}
                  className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm"
                >
                  <Icons.Refresh className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <span className="text-xs text-green-400 flex items-center gap-1">
                <Icons.CheckCircle className="w-4 h-4" />
                Todos os vídeos aprovados!
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

VideoGeneratorNode.displayName = 'VideoGeneratorNode';
