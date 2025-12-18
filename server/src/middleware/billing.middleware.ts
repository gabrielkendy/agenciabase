import { Request, Response, NextFunction } from 'express';
import { creditsService } from '../services/billing/credits.service.js';
import { pricingService } from '../services/billing/pricing.service.js';

/**
 * Middleware para verificar créditos antes de operações de IA
 */
export async function checkCreditsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      });
    }

    const { organizationId } = req.user;
    const { model, provider } = req.body;

    // Calcular custo estimado
    const { credits } = await pricingService.calculateCost({
      provider: provider || 'falai',
      model: model || 'flux-schnell',
      operation: 'generate',
    });

    // Verificar saldo
    const hasCredits = await creditsService.hasEnoughCredits(organizationId, credits);

    if (!hasCredits) {
      const balance = await creditsService.getBalance(organizationId);
      return res.status(402).json({
        error: 'Insufficient credits',
        code: 'INSUFFICIENT_CREDITS',
        required: credits,
        balance,
      });
    }

    // Passar custo estimado para o controller
    req.estimatedCredits = credits;

    next();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Middleware para debitar créditos após operação bem-sucedida
 */
export async function debitCreditsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Interceptar res.json para debitar após sucesso
  const originalJson = res.json.bind(res);

  res.json = (data: any) => {
    // Se a operação foi bem-sucedida e temos um ID de geração
    if (res.statusCode < 400 && data.generationId && req.user) {
      const { organizationId, userId } = req.user;

      // Debitar em background (não bloqueia resposta)
      creditsService.debit({
        organizationId,
        userId,
        amount: req.estimatedCredits || 1,
        referenceType: 'generation',
        referenceId: data.generationId,
      }).catch(err => {
        console.error('Error debiting credits:', err);
      });
    }

    return originalJson(data);
  };

  next();
}

// Alias for billingMiddleware
export const billingMiddleware = checkCreditsMiddleware;

export default { checkCreditsMiddleware, debitCreditsMiddleware, billingMiddleware };
