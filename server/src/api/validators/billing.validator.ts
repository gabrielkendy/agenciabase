import { Request, Response, NextFunction } from 'express';

export const billingValidator = {
  calculateCost(req: Request, res: Response, next: NextFunction) {
    const { provider, model, type, options } = req.body;

    const errors: string[] = [];

    // Provider validation
    const validProviders = ['freepik', 'falai', 'openai', 'google', 'elevenlabs'];
    if (!provider) {
      errors.push('Provider is required');
    } else if (!validProviders.includes(provider)) {
      errors.push(`Invalid provider. Must be one of: ${validProviders.join(', ')}`);
    }

    // Model validation
    if (!model) {
      errors.push('Model is required');
    } else if (typeof model !== 'string') {
      errors.push('Model must be a string');
    }

    // Type validation
    const validTypes = ['image', 'video', 'audio', 'chat'];
    if (!type) {
      errors.push('Type is required');
    } else if (!validTypes.includes(type)) {
      errors.push(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
    }

    // Options validation (optional)
    if (options) {
      if (typeof options !== 'object') {
        errors.push('Options must be an object');
      } else {
        // Validate specific options
        if (options.samples !== undefined) {
          if (typeof options.samples !== 'number' || !Number.isInteger(options.samples)) {
            errors.push('Options.samples must be an integer');
          } else if (options.samples < 1 || options.samples > 10) {
            errors.push('Options.samples must be between 1 and 10');
          }
        }

        if (options.duration !== undefined) {
          if (typeof options.duration !== 'number') {
            errors.push('Options.duration must be a number');
          } else if (options.duration < 1 || options.duration > 300) {
            errors.push('Options.duration must be between 1 and 300 seconds');
          }
        }

        if (options.characters !== undefined) {
          if (typeof options.characters !== 'number' || !Number.isInteger(options.characters)) {
            errors.push('Options.characters must be an integer');
          } else if (options.characters < 1) {
            errors.push('Options.characters must be positive');
          }
        }

        if (options.tokens !== undefined) {
          if (typeof options.tokens !== 'number' || !Number.isInteger(options.tokens)) {
            errors.push('Options.tokens must be an integer');
          } else if (options.tokens < 1) {
            errors.push('Options.tokens must be positive');
          }
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(', ') });
    }

    next();
  },

  addCredits(req: Request, res: Response, next: NextFunction) {
    const { amount, description } = req.body;

    const errors: string[] = [];

    // Amount validation
    if (amount === undefined) {
      errors.push('Amount is required');
    } else if (typeof amount !== 'number') {
      errors.push('Amount must be a number');
    } else if (!Number.isInteger(amount)) {
      errors.push('Amount must be an integer');
    } else if (amount < 1) {
      errors.push('Amount must be positive');
    } else if (amount > 1000000) {
      errors.push('Amount cannot exceed 1,000,000 credits');
    }

    // Description validation (optional)
    if (description) {
      if (typeof description !== 'string') {
        errors.push('Description must be a string');
      } else if (description.length > 500) {
        errors.push('Description cannot exceed 500 characters');
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(', ') });
    }

    next();
  },

  purchaseCredits(req: Request, res: Response, next: NextFunction) {
    const { packageId, paymentMethod } = req.body;

    const errors: string[] = [];

    // Package validation
    if (!packageId) {
      errors.push('Package ID is required');
    } else if (typeof packageId !== 'string') {
      errors.push('Package ID must be a string');
    }

    // Payment method validation
    const validPaymentMethods = ['stripe', 'paypal', 'pix'];
    if (!paymentMethod) {
      errors.push('Payment method is required');
    } else if (!validPaymentMethods.includes(paymentMethod)) {
      errors.push(`Invalid payment method. Must be one of: ${validPaymentMethods.join(', ')}`);
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(', ') });
    }

    next();
  },

  changePlan(req: Request, res: Response, next: NextFunction) {
    const { planId, billingCycle } = req.body;

    const errors: string[] = [];

    // Plan ID validation
    if (!planId) {
      errors.push('Plan ID is required');
    } else if (typeof planId !== 'string') {
      errors.push('Plan ID must be a string');
    }

    // Billing cycle validation
    const validCycles = ['monthly', 'yearly'];
    if (!billingCycle) {
      errors.push('Billing cycle is required');
    } else if (!validCycles.includes(billingCycle)) {
      errors.push(`Invalid billing cycle. Must be one of: ${validCycles.join(', ')}`);
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(', ') });
    }

    next();
  },
};

export default billingValidator;
