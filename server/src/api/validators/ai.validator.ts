import { Request, Response, NextFunction } from 'express';

const VALID_PROVIDERS = ['freepik', 'falai', 'openai', 'google', 'elevenlabs'];
const VALID_IMAGE_SIZES = ['256x256', '512x512', '1024x1024', '1024x1792', '1792x1024'];
const VALID_STYLES = ['realistic', 'anime', 'artistic', 'photo', '3d', 'digital-art', 'fantasy', 'cinematic'];

export const aiValidator = {
  generateImage(req: Request, res: Response, next: NextFunction) {
    const { prompt, provider, model, size, style, negativePrompt, samples } = req.body;

    const errors: string[] = [];

    // Prompt validation
    if (!prompt) {
      errors.push('Prompt is required');
    } else if (typeof prompt !== 'string') {
      errors.push('Prompt must be a string');
    } else if (prompt.length < 3) {
      errors.push('Prompt must be at least 3 characters');
    } else if (prompt.length > 2000) {
      errors.push('Prompt must not exceed 2000 characters');
    }

    // Provider validation
    if (provider && !VALID_PROVIDERS.includes(provider)) {
      errors.push(`Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}`);
    }

    // Model validation (optional - provider-specific)
    if (model && typeof model !== 'string') {
      errors.push('Model must be a string');
    }

    // Size validation
    if (size && !VALID_IMAGE_SIZES.includes(size)) {
      errors.push(`Invalid size. Must be one of: ${VALID_IMAGE_SIZES.join(', ')}`);
    }

    // Style validation
    if (style && !VALID_STYLES.includes(style)) {
      errors.push(`Invalid style. Must be one of: ${VALID_STYLES.join(', ')}`);
    }

    // Negative prompt validation
    if (negativePrompt) {
      if (typeof negativePrompt !== 'string') {
        errors.push('Negative prompt must be a string');
      } else if (negativePrompt.length > 1000) {
        errors.push('Negative prompt must not exceed 1000 characters');
      }
    }

    // Samples validation
    if (samples !== undefined) {
      if (typeof samples !== 'number' || !Number.isInteger(samples)) {
        errors.push('Samples must be an integer');
      } else if (samples < 1 || samples > 4) {
        errors.push('Samples must be between 1 and 4');
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(', ') });
    }

    next();
  },

  generateVideo(req: Request, res: Response, next: NextFunction) {
    const { prompt, provider, model, duration, aspectRatio, imageUrl } = req.body;

    const errors: string[] = [];

    // Prompt validation
    if (!prompt) {
      errors.push('Prompt is required');
    } else if (typeof prompt !== 'string') {
      errors.push('Prompt must be a string');
    } else if (prompt.length < 3) {
      errors.push('Prompt must be at least 3 characters');
    } else if (prompt.length > 2000) {
      errors.push('Prompt must not exceed 2000 characters');
    }

    // Provider validation
    if (provider && !VALID_PROVIDERS.includes(provider)) {
      errors.push(`Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}`);
    }

    // Duration validation
    if (duration !== undefined) {
      if (typeof duration !== 'number') {
        errors.push('Duration must be a number');
      } else if (duration < 1 || duration > 60) {
        errors.push('Duration must be between 1 and 60 seconds');
      }
    }

    // Aspect ratio validation
    const validAspectRatios = ['16:9', '9:16', '1:1', '4:3', '3:4'];
    if (aspectRatio && !validAspectRatios.includes(aspectRatio)) {
      errors.push(`Invalid aspect ratio. Must be one of: ${validAspectRatios.join(', ')}`);
    }

    // Image URL validation (for image-to-video)
    if (imageUrl) {
      if (typeof imageUrl !== 'string') {
        errors.push('Image URL must be a string');
      } else if (!isValidUrl(imageUrl)) {
        errors.push('Invalid image URL format');
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(', ') });
    }

    next();
  },

  generateAudio(req: Request, res: Response, next: NextFunction) {
    const { text, voice, provider, model } = req.body;

    const errors: string[] = [];

    // Text validation
    if (!text) {
      errors.push('Text is required');
    } else if (typeof text !== 'string') {
      errors.push('Text must be a string');
    } else if (text.length < 1) {
      errors.push('Text cannot be empty');
    } else if (text.length > 5000) {
      errors.push('Text must not exceed 5000 characters');
    }

    // Voice validation
    if (voice && typeof voice !== 'string') {
      errors.push('Voice must be a string');
    }

    // Provider validation
    if (provider && !VALID_PROVIDERS.includes(provider)) {
      errors.push(`Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}`);
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(', ') });
    }

    next();
  },

  chat(req: Request, res: Response, next: NextFunction) {
    const { messages, model, provider, temperature, maxTokens } = req.body;

    const errors: string[] = [];

    // Messages validation
    if (!messages) {
      errors.push('Messages are required');
    } else if (!Array.isArray(messages)) {
      errors.push('Messages must be an array');
    } else if (messages.length === 0) {
      errors.push('Messages array cannot be empty');
    } else {
      messages.forEach((msg, index) => {
        if (!msg.role || !['user', 'assistant', 'system'].includes(msg.role)) {
          errors.push(`Message ${index}: Invalid role`);
        }
        if (!msg.content || typeof msg.content !== 'string') {
          errors.push(`Message ${index}: Content is required and must be a string`);
        }
      });
    }

    // Temperature validation
    if (temperature !== undefined) {
      if (typeof temperature !== 'number') {
        errors.push('Temperature must be a number');
      } else if (temperature < 0 || temperature > 2) {
        errors.push('Temperature must be between 0 and 2');
      }
    }

    // Max tokens validation
    if (maxTokens !== undefined) {
      if (typeof maxTokens !== 'number' || !Number.isInteger(maxTokens)) {
        errors.push('Max tokens must be an integer');
      } else if (maxTokens < 1 || maxTokens > 128000) {
        errors.push('Max tokens must be between 1 and 128000');
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(', ') });
    }

    next();
  },
};

// Helper function
function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

export default aiValidator;
