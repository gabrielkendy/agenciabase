// Upload Service - Cloudinary via Edge Function
// Suporta arquivos até 100MB

export interface UploadResult {
  url: string;
  publicId: string;
  format: string;
  width?: number;
  height?: number;
  bytes: number;
  resourceType: string;
}

export interface UploadOptions {
  folder?: string;
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
  onProgress?: (progress: number) => void;
}

// Converter File para base64
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Upload via Edge Function (seguro, sem expor credenciais)
export async function uploadFile(
  file: File,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const { folder = 'base-agency', resourceType = 'auto', onProgress } = options;

  // Validar tamanho (100MB max)
  const maxSize = 100 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('Arquivo muito grande. Máximo: 100MB');
  }

  onProgress?.(10);

  // Converter para base64
  const base64 = await fileToBase64(file);
  
  onProgress?.(30);

  // Enviar para Edge Function
  const response = await fetch('/api/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      file: base64,
      folder,
      resourceType,
    }),
  });

  onProgress?.(80);

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error || 'Erro no upload');
  }

  onProgress?.(100);

  return result.data;
}

// Upload múltiplos arquivos
export async function uploadFiles(
  files: File[],
  options: UploadOptions = {}
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const result = await uploadFile(file, {
      ...options,
      onProgress: (p) => {
        const totalProgress = ((i + p / 100) / files.length) * 100;
        options.onProgress?.(totalProgress);
      },
    });
    results.push(result);
  }

  return results;
}

export const uploadService = {
  uploadFile,
  uploadFiles,
  fileToBase64,
};
