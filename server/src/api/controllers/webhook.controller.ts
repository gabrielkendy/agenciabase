import { Request, Response } from 'express';
import { supabase } from '../../config/database.js';
import crypto from 'crypto';

export const webhookController = {
  /**
   * Listar webhooks
   */
  async list(req: Request, res: Response) {
    try {
      const { organizationId } = req.user!;

      const { data, error } = await supabase
        .from('webhooks')
        .select('*')
        .eq('organization_id', organizationId)
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
   * Criar webhook
   */
  async create(req: Request, res: Response) {
    try {
      const { organizationId } = req.user!;
      const { name, url, events } = req.body;

      if (!name || !url || !events || !Array.isArray(events)) {
        return res.status(400).json({ error: 'Name, URL and events are required' });
      }

      // Gerar secret
      const secret = crypto.randomBytes(32).toString('hex');

      const { data, error } = await supabase
        .from('webhooks')
        .insert({
          organization_id: organizationId,
          name,
          url,
          events,
          secret,
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      res.status(201).json({
        success: true,
        data: {
          ...data,
          secret, // Mostrar secret apenas na criação
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Obter webhook
   */
  async get(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { organizationId } = req.user!;

      const { data, error } = await supabase
        .from('webhooks')
        .select('*')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single();

      if (error || !data) {
        return res.status(404).json({ error: 'Webhook not found' });
      }

      // Remover secret da resposta
      delete data.secret;

      res.json({
        success: true,
        data,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Atualizar webhook
   */
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { organizationId } = req.user!;
      const { name, url, events, is_active } = req.body;

      const updateData: Record<string, unknown> = {};
      if (name) updateData.name = name;
      if (url) updateData.url = url;
      if (events) updateData.events = events;
      if (is_active !== undefined) updateData.is_active = is_active;

      const { data, error } = await supabase
        .from('webhooks')
        .update(updateData)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      // Remover secret da resposta
      delete data.secret;

      res.json({
        success: true,
        data,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Deletar webhook
   */
  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { organizationId } = req.user!;

      const { error } = await supabase
        .from('webhooks')
        .delete()
        .eq('id', id)
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
   * Regenerar secret
   */
  async regenerateSecret(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { organizationId } = req.user!;

      const newSecret = crypto.randomBytes(32).toString('hex');

      const { data, error } = await supabase
        .from('webhooks')
        .update({ secret: newSecret })
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      res.json({
        success: true,
        data: {
          id: data.id,
          secret: newSecret,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Listar deliveries de um webhook
   */
  async getDeliveries(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { organizationId } = req.user!;
      const { limit = 50, offset = 0 } = req.query;

      // Verificar se webhook pertence à org
      const { data: webhook } = await supabase
        .from('webhooks')
        .select('id')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single();

      if (!webhook) {
        return res.status(404).json({ error: 'Webhook not found' });
      }

      const { data, error } = await supabase
        .from('webhook_deliveries')
        .select('*')
        .eq('webhook_id', id)
        .order('created_at', { ascending: false })
        .range(Number(offset), Number(offset) + Number(limit) - 1);

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
   * Testar webhook
   */
  async test(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { organizationId } = req.user!;

      // Buscar webhook
      const { data: webhook, error: webhookError } = await supabase
        .from('webhooks')
        .select('*')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single();

      if (webhookError || !webhook) {
        return res.status(404).json({ error: 'Webhook not found' });
      }

      // Payload de teste
      const testPayload = {
        event: 'test',
        timestamp: new Date().toISOString(),
        data: {
          message: 'This is a test webhook delivery',
          webhookId: webhook.id,
        },
      };

      // Assinar payload
      const signature = crypto
        .createHmac('sha256', webhook.secret)
        .update(JSON.stringify(testPayload))
        .digest('hex');

      // Enviar
      const startTime = Date.now();
      let statusCode = 0;
      let responseBody = '';
      let error = '';

      try {
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Event': 'test',
          },
          body: JSON.stringify(testPayload),
        });

        statusCode = response.status;
        responseBody = await response.text().catch(() => '');
      } catch (err: any) {
        error = err.message;
      }

      const durationMs = Date.now() - startTime;

      // Salvar delivery
      await supabase.from('webhook_deliveries').insert({
        webhook_id: webhook.id,
        event: 'test',
        payload: testPayload,
        status_code: statusCode,
        response_body: responseBody.slice(0, 1000),
        duration_ms: durationMs,
        delivered: statusCode >= 200 && statusCode < 300,
        error,
      });

      res.json({
        success: true,
        data: {
          statusCode,
          durationMs,
          delivered: statusCode >= 200 && statusCode < 300,
          error: error || undefined,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
};

export default webhookController;
