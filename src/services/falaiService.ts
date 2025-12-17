// FAL.ai API Service for Image and Video Generation

const FAL_API_URL = 'https://queue.fal.run';

export interface FalImageOptions {
  model?: 'fal-ai/flux-pro' | 'fal-ai/flux/dev' | 'fal-ai/flux-lora';
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3' | '3:4';
  numImages?: number;
  seed?: number;
}

export interface FalVideoOptions {
  model?: 'fal-ai/kling-video/v1.5/pro/image-to-video' | 'fal-ai/minimax-video/image-to-video' | 'fal-ai/luma-dream-machine';
  duration?: '5' | '10';
}

export interface FalQueueResponse {
  request_id: string;
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  response_url?: string;
}

export interface FalImageResult {
  images: { url: string; content_type: string; width: number; height: number }[];
  seed: number;
  prompt: string;
}

export interface FalVideoResult {
  video: { url: string; content_type?: string };
}

export const falaiService = {
  // Generate image with Flux
  generateImage: async (
    prompt: string,
    apiKey: string,
    options: FalImageOptions = {}
  ): Promise<FalImageResult> => {
    const model = options.model || 'fal-ai/flux/dev';

    // Map aspect ratio to image size
    const sizeMap: Record<string, { width: number; height: number }> = {
      '16:9': { width: 1344, height: 768 },
      '9:16': { width: 768, height: 1344 },
      '1:1': { width: 1024, height: 1024 },
      '4:3': { width: 1152, height: 896 },
      '3:4': { width: 896, height: 1152 },
    };

    const size = sizeMap[options.aspectRatio || '9:16'];

    const response = await fetch(`${FAL_API_URL}/${model}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${apiKey}`,
      },
      body: JSON.stringify({
        prompt,
        image_size: size,
        num_images: options.numImages || 1,
        seed: options.seed,
        enable_safety_checker: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `FAL.ai error: ${response.status}`);
    }

    return response.json();
  },

  // Queue image generation (for multiple images)
  queueImageGeneration: async (
    prompt: string,
    apiKey: string,
    options: FalImageOptions = {}
  ): Promise<FalQueueResponse> => {
    const model = options.model || 'fal-ai/flux/dev';

    const sizeMap: Record<string, { width: number; height: number }> = {
      '16:9': { width: 1344, height: 768 },
      '9:16': { width: 768, height: 1344 },
      '1:1': { width: 1024, height: 1024 },
      '4:3': { width: 1152, height: 896 },
      '3:4': { width: 896, height: 1152 },
    };

    const size = sizeMap[options.aspectRatio || '9:16'];

    const response = await fetch(`${FAL_API_URL}/${model}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${apiKey}`,
      },
      body: JSON.stringify({
        prompt,
        image_size: size,
        num_images: 1,
        enable_safety_checker: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `FAL.ai error: ${response.status}`);
    }

    return response.json();
  },

  // Generate video from image
  generateVideo: async (
    imageUrl: string,
    prompt: string,
    apiKey: string,
    options: FalVideoOptions = {}
  ): Promise<FalVideoResult> => {
    const model = options.model || 'fal-ai/kling-video/v1.5/pro/image-to-video';

    const body: Record<string, any> = {
      prompt,
      image_url: imageUrl,
    };

    // Model-specific parameters
    if (model.includes('kling')) {
      body.duration = options.duration || '5';
      body.aspect_ratio = '9:16';
    } else if (model.includes('minimax')) {
      body.prompt_optimizer = true;
    } else if (model.includes('luma')) {
      body.aspect_ratio = '9:16';
    }

    const response = await fetch(`${FAL_API_URL}/${model}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `FAL.ai video error: ${response.status}`);
    }

    return response.json();
  },

  // Check queue status
  checkStatus: async (
    requestId: string,
    model: string,
    apiKey: string
  ): Promise<FalQueueResponse> => {
    const response = await fetch(`${FAL_API_URL}/${model}/requests/${requestId}/status`, {
      headers: {
        'Authorization': `Key ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to check status: ${response.status}`);
    }

    return response.json();
  },

  // Get result from queue
  getResult: async <T>(
    requestId: string,
    model: string,
    apiKey: string
  ): Promise<T> => {
    const response = await fetch(`${FAL_API_URL}/${model}/requests/${requestId}`, {
      headers: {
        'Authorization': `Key ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get result: ${response.status}`);
    }

    return response.json();
  },
};
