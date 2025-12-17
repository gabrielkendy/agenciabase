import { memo, useState } from 'react';
import { NodeProps } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { Icons } from '../../Icons';
import { useStudioStore } from '../../../store/studioStore';
import toast from 'react-hot-toast';
import JSZip from 'jszip';

export const ExportNode = memo((_props: NodeProps) => {
  const {
    narrationUrl,
    narrationApproved,
    generatedImages,
    generatedVideos,
    videosApproved,
  } = useStudioStore();

  const [isExporting, setIsExporting] = useState(false);

  const enabled = videosApproved;

  const approvedVideos = generatedVideos.filter((v) => v.approved && v.url);
  const approvedImages = generatedImages.filter((img) => img.approved && img.url);

  const downloadFile = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Download error:', error);
      throw error;
    }
  };

  const handleDownloadVideos = async () => {
    setIsExporting(true);
    try {
      for (let i = 0; i < approvedVideos.length; i++) {
        const video = approvedVideos[i];
        if (video.url) {
          await downloadFile(video.url, `video_${i + 1}.mp4`);
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
      toast.success(`${approvedVideos.length} vídeos baixados!`);
    } catch (error: any) {
      toast.error('Erro ao baixar vídeos');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadImages = async () => {
    setIsExporting(true);
    try {
      for (let i = 0; i < approvedImages.length; i++) {
        const image = approvedImages[i];
        if (image.url) {
          await downloadFile(image.url, `imagem_${i + 1}.png`);
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }
      toast.success(`${approvedImages.length} imagens baixadas!`);
    } catch (error: any) {
      toast.error('Erro ao baixar imagens');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadAudio = async () => {
    if (!narrationUrl) return;
    try {
      // Convert data URL to blob
      const response = await fetch(narrationUrl);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'narracao.mp3';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      toast.success('Narração baixada!');
    } catch (error) {
      toast.error('Erro ao baixar narração');
    }
  };

  const handleDownloadZip = async () => {
    setIsExporting(true);
    try {
      const zip = new JSZip();

      // Add videos
      const videosFolder = zip.folder('videos');
      for (let i = 0; i < approvedVideos.length; i++) {
        const video = approvedVideos[i];
        if (video.url) {
          const response = await fetch(video.url);
          const blob = await response.blob();
          videosFolder?.file(`video_${i + 1}.mp4`, blob);
        }
      }

      // Add images
      const imagesFolder = zip.folder('imagens');
      for (let i = 0; i < approvedImages.length; i++) {
        const image = approvedImages[i];
        if (image.url) {
          const response = await fetch(image.url);
          const blob = await response.blob();
          imagesFolder?.file(`imagem_${i + 1}.png`, blob);
        }
      }

      // Add narration
      if (narrationUrl) {
        const audioResponse = await fetch(narrationUrl);
        const audioBlob = await audioResponse.blob();
        zip.file('narracao.mp3', audioBlob);
      }

      // Generate and download zip
      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = 'creator_studio_export.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      toast.success('ZIP exportado com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao criar ZIP');
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <BaseNode
      type="export"
      title="Exportar"
      icon="📦"
      status={enabled ? 'completed' : 'idle'}
      approved={false}
      enabled={enabled}
      hasOutput={false}
    >
      <div className="space-y-3">
        {!enabled ? (
          <p className="text-gray-400 text-sm text-center py-4">
            Aguardando aprovação dos vídeos...
          </p>
        ) : (
          <>
            {/* Summary */}
            <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Vídeos:</span>
                <span className="text-white font-medium">{approvedVideos.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Imagens:</span>
                <span className="text-white font-medium">{approvedImages.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Narração:</span>
                <span className="text-white font-medium">
                  {narrationApproved ? '1 arquivo' : 'Não incluída'}
                </span>
              </div>
            </div>

            {/* Individual Downloads */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={handleDownloadVideos}
                disabled={isExporting || approvedVideos.length === 0}
                className="px-2 py-2 bg-purple-500/20 hover:bg-purple-500/30 disabled:bg-gray-800 border border-purple-500/50 text-purple-300 rounded-lg text-xs flex flex-col items-center gap-1"
              >
                <Icons.Video className="w-4 h-4" />
                <span>Vídeos</span>
              </button>
              <button
                onClick={handleDownloadImages}
                disabled={isExporting || approvedImages.length === 0}
                className="px-2 py-2 bg-pink-500/20 hover:bg-pink-500/30 disabled:bg-gray-800 border border-pink-500/50 text-pink-300 rounded-lg text-xs flex flex-col items-center gap-1"
              >
                <Icons.Image className="w-4 h-4" />
                <span>Imagens</span>
              </button>
              <button
                onClick={handleDownloadAudio}
                disabled={isExporting || !narrationApproved}
                className="px-2 py-2 bg-green-500/20 hover:bg-green-500/30 disabled:bg-gray-800 border border-green-500/50 text-green-300 rounded-lg text-xs flex flex-col items-center gap-1"
              >
                <Icons.Sparkles className="w-4 h-4" />
                <span>Áudio</span>
              </button>
            </div>

            {/* ZIP Export */}
            <button
              onClick={handleDownloadZip}
              disabled={isExporting}
              className="w-full px-3 py-3 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-700 text-black font-medium rounded-lg text-sm flex items-center justify-center gap-2"
            >
              {isExporting ? (
                <>
                  <Icons.Loader className="w-4 h-4 animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <Icons.FolderOpen className="w-4 h-4" />
                  Exportar Tudo (ZIP)
                </>
              )}
            </button>

            <p className="text-xs text-gray-500 text-center">
              Inclui todos os vídeos, imagens e narração
            </p>
          </>
        )}
      </div>
    </BaseNode>
  );
});

ExportNode.displayName = 'ExportNode';
