import { supabase } from '../../config/database.js';
import { logger } from '../../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

interface UploadOptions {
  bucket?: string;
  folder?: string;
  fileName?: string;
  contentType?: string;
  upsert?: boolean;
}

interface UploadResult {
  path: string;
  publicUrl: string;
  size: number;
}

export const storageService = {
  /**
   * Upload a file from Buffer
   */
  async uploadBuffer(
    buffer: Buffer,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const {
      bucket = 'generations',
      folder = 'uploads',
      fileName = `${uuidv4()}.bin`,
      contentType = 'application/octet-stream',
      upsert = false,
    } = options;

    const path = `${folder}/${fileName}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, buffer, {
        contentType,
        upsert,
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    logger.info('File uploaded', { bucket, path });

    return {
      path,
      publicUrl: urlData.publicUrl,
      size: buffer.length,
    };
  },

  /**
   * Upload a file from base64 string
   */
  async uploadBase64(
    base64Data: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    // Remove data URL prefix if present
    const base64 = base64Data.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');

    return this.uploadBuffer(buffer, options);
  },

  /**
   * Upload a file from URL (download and re-upload)
   */
  async uploadFromUrl(
    url: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const buffer = Buffer.from(await response.arrayBuffer());

    // Determine file extension from content type
    const ext = this.getExtensionFromContentType(contentType);
    const fileName = options.fileName || `${uuidv4()}.${ext}`;

    return this.uploadBuffer(buffer, {
      ...options,
      fileName,
      contentType,
    });
  },

  /**
   * Delete a file
   */
  async delete(path: string, bucket: string = 'generations'): Promise<boolean> {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      logger.error('Delete failed:', error);
      return false;
    }

    logger.info('File deleted', { bucket, path });
    return true;
  },

  /**
   * Delete multiple files
   */
  async deleteMany(paths: string[], bucket: string = 'generations'): Promise<number> {
    const { error } = await supabase.storage
      .from(bucket)
      .remove(paths);

    if (error) {
      logger.error('Bulk delete failed:', error);
      return 0;
    }

    logger.info('Files deleted', { bucket, count: paths.length });
    return paths.length;
  },

  /**
   * Get a signed URL for private access
   */
  async getSignedUrl(
    path: string,
    bucket: string = 'generations',
    expiresIn: number = 3600
  ): Promise<string | null> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      logger.error('Signed URL failed:', error);
      return null;
    }

    return data.signedUrl;
  },

  /**
   * Get public URL
   */
  getPublicUrl(path: string, bucket: string = 'generations'): string {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  },

  /**
   * List files in a folder
   */
  async list(
    folder: string = '',
    bucket: string = 'generations',
    options: { limit?: number; offset?: number } = {}
  ): Promise<Array<{ name: string; size: number; createdAt: string }>> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(folder, {
        limit: options.limit || 100,
        offset: options.offset || 0,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) {
      logger.error('List failed:', error);
      return [];
    }

    return (data || []).map(file => ({
      name: file.name,
      size: file.metadata?.size || 0,
      createdAt: file.created_at,
    }));
  },

  /**
   * Move/rename a file
   */
  async move(
    fromPath: string,
    toPath: string,
    bucket: string = 'generations'
  ): Promise<boolean> {
    const { error } = await supabase.storage
      .from(bucket)
      .move(fromPath, toPath);

    if (error) {
      logger.error('Move failed:', error);
      return false;
    }

    logger.info('File moved', { from: fromPath, to: toPath });
    return true;
  },

  /**
   * Copy a file
   */
  async copy(
    fromPath: string,
    toPath: string,
    bucket: string = 'generations'
  ): Promise<boolean> {
    const { error } = await supabase.storage
      .from(bucket)
      .copy(fromPath, toPath);

    if (error) {
      logger.error('Copy failed:', error);
      return false;
    }

    logger.info('File copied', { from: fromPath, to: toPath });
    return true;
  },

  /**
   * Get file extension from content type
   */
  getExtensionFromContentType(contentType: string): string {
    const map: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'audio/mpeg': 'mp3',
      'audio/wav': 'wav',
      'audio/ogg': 'ogg',
      'application/pdf': 'pdf',
      'application/json': 'json',
    };
    return map[contentType] || 'bin';
  },

  /**
   * Get content type from file extension
   */
  getContentTypeFromExtension(ext: string): string {
    const map: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      'pdf': 'application/pdf',
      'json': 'application/json',
    };
    return map[ext.toLowerCase()] || 'application/octet-stream';
  },
};

export default storageService;
