import { Request, Response } from 'express';
import { supabase } from '../../config/database.js';
import { creditsService } from '../../services/billing/credits.service.js';
import { logger } from '../../utils/logger.js';
import { generateId } from '../../utils/helpers.js';
import { encrypt } from '../../utils/encryption.js';
import crypto from 'crypto';

export const organizationsController = {
  /**
   * Obter organização atual
   */
  async get(req: Request, res: Response) {
    try {
      const { organizationId } = req.user!;

      const { data, error } = await supabase
        .from('organizations')
        .select(`
          *,
          subscriptions (
            *,
            plans (*)
          )
        `)
        .eq('id', organizationId)
        .single();

      if (error || !data) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      // Get credit balance
      const balance = await creditsService.getBalance(organizationId);
      const usage = await creditsService.getPeriodUsage(organizationId);

      res.json({
        success: true,
        data: {
          ...data,
          creditBalance: balance,
          usage,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Atualizar organização
   */
  async update(req: Request, res: Response) {
    try {
      const { organizationId, role } = req.user!;
      const { name, logo_url, settings } = req.body;

      // Apenas admin pode editar
      if (!['admin', 'super_admin'].includes(role)) {
        return res.status(403).json({ error: 'Admin permission required' });
      }

      const updateData: Record<string, unknown> = {};
      if (name) updateData.name = name;
      if (logo_url !== undefined) updateData.logo_url = logo_url;
      if (settings) updateData.settings = settings;

      const { data, error } = await supabase
        .from('organizations')
        .update(updateData)
        .eq('id', organizationId)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      res.json({
        success: true,
        data,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Obter membros da organização
   */
  async getMembers(req: Request, res: Response) {
    try {
      const { organizationId } = req.user!;

      const { data, error } = await supabase
        .from('users')
        .select('id, email, name, avatar_url, role, is_active, last_login_at, created_at')
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .order('role', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      res.json({
        success: true,
        data,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Obter estatísticas da organização
   */
  async getStats(req: Request, res: Response) {
    try {
      const { organizationId } = req.user!;

      // Total de membros
      const { count: membersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .is('deleted_at', null);

      // Total de gerações
      const { count: generationsCount } = await supabase
        .from('generations')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .is('deleted_at', null);

      // Créditos
      const balance = await creditsService.getBalance(organizationId);
      const usage = await creditsService.getPeriodUsage(organizationId);

      // Gerações por tipo este mês
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: monthlyGenerations } = await supabase
        .from('generations')
        .select('type')
        .eq('organization_id', organizationId)
        .gte('created_at', startOfMonth.toISOString())
        .is('deleted_at', null);

      const generationsByType = {
        image: 0,
        video: 0,
        audio: 0,
      };

      monthlyGenerations?.forEach(g => {
        if (g.type in generationsByType) {
          generationsByType[g.type as keyof typeof generationsByType]++;
        }
      });

      res.json({
        success: true,
        data: {
          members: membersCount || 0,
          totalGenerations: generationsCount || 0,
          creditBalance: balance,
          usage,
          monthlyGenerations: generationsByType,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Obter API keys da organização
   */
  async getApiKeys(req: Request, res: Response) {
    try {
      const { organizationId } = req.user!;

      const { data, error } = await supabase
        .from('api_keys')
        .select('id, name, key_prefix, scopes, is_active, last_used_at, expires_at, created_at')
        .eq('organization_id', organizationId)
        .is('revoked_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      res.json({
        success: true,
        data,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Obter provider API keys da organização
   */
  async getProviderKeys(req: Request, res: Response) {
    try {
      const { organizationId } = req.user!;

      const { data, error } = await supabase
        .from('provider_api_keys')
        .select('id, provider, key_hint, is_active, is_valid, last_validated_at, last_used_at, total_requests, created_at')
        .eq('organization_id', organizationId)
        .order('provider');

      if (error) {
        throw new Error(error.message);
      }

      res.json({
        success: true,
        data,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Criar API key
   */
  async createApiKey(req: Request, res: Response) {
    try {
      const { organizationId, userId } = req.user!;
      const { name, scopes = ['*'], expiresIn } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Name is required' });
      }

      // Gerar key
      const rawKey = `bak_${crypto.randomBytes(32).toString('hex')}`;
      const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
      const keyPrefix = rawKey.slice(0, 12);

      // Calcular expiração
      let expiresAt = null;
      if (expiresIn) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresIn);
      }

      const { data, error } = await supabase
        .from('api_keys')
        .insert({
          id: generateId(),
          organization_id: organizationId,
          created_by: userId,
          name,
          key_hash: keyHash,
          key_prefix: keyPrefix,
          scopes,
          expires_at: expiresAt?.toISOString(),
        })
        .select('id, name, key_prefix, scopes, expires_at, created_at')
        .single();

      if (error) {
        throw new Error(error.message);
      }

      // Retornar key completa apenas uma vez
      res.status(201).json({
        success: true,
        data: {
          ...data,
          key: rawKey, // Só retorna na criação
        },
        message: 'Save this key securely. It will not be shown again.',
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Deletar API key
   */
  async deleteApiKey(req: Request, res: Response) {
    try {
      const { keyId } = req.params;
      const { organizationId } = req.user!;

      const { error } = await supabase
        .from('api_keys')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', keyId)
        .eq('organization_id', organizationId);

      if (error) {
        throw new Error(error.message);
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Criar provider API key
   */
  async createProviderKey(req: Request, res: Response) {
    try {
      const { organizationId, userId } = req.user!;
      const { provider, apiKey } = req.body;

      if (!provider || !apiKey) {
        return res.status(400).json({ error: 'Provider and API key are required' });
      }

      const validProviders = ['freepik', 'falai', 'openai', 'google', 'elevenlabs', 'openrouter'];
      if (!validProviders.includes(provider)) {
        return res.status(400).json({ error: 'Invalid provider' });
      }

      // Encriptar key
      const encryptedKey = encrypt(apiKey);
      const keyHint = `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`;

      // Verificar se já existe
      const { data: existing } = await supabase
        .from('provider_api_keys')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('provider', provider)
        .single();

      let data;
      if (existing) {
        // Atualizar
        const { data: updated, error } = await supabase
          .from('provider_api_keys')
          .update({
            api_key_encrypted: encryptedKey,
            key_hint: keyHint,
            is_valid: true,
            is_active: true,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw new Error(error.message);
        data = updated;
      } else {
        // Criar novo
        const { data: created, error } = await supabase
          .from('provider_api_keys')
          .insert({
            id: generateId(),
            organization_id: organizationId,
            provider,
            api_key_encrypted: encryptedKey,
            key_hint: keyHint,
            created_by: userId,
          })
          .select()
          .single();

        if (error) throw new Error(error.message);
        data = created;
      }

      // Remover campo encriptado da resposta
      delete data.api_key_encrypted;

      res.status(201).json({
        success: true,
        data,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Deletar provider API key
   */
  async deleteProviderKey(req: Request, res: Response) {
    try {
      const { keyId } = req.params;
      const { organizationId } = req.user!;

      const { error } = await supabase
        .from('provider_api_keys')
        .delete()
        .eq('id', keyId)
        .eq('organization_id', organizationId);

      if (error) {
        throw new Error(error.message);
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
};

export default organizationsController;
