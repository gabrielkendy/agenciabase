import { Request, Response } from 'express';
import { supabase } from '../../config/database.js';
import { logger } from '../../utils/logger.js';

export const usersController = {
  /**
   * Listar usuários da organização
   */
  async list(req: Request, res: Response) {
    try {
      const { organizationId } = req.user!;
      const { limit = 50, offset = 0 } = req.query;

      const { data, error, count } = await supabase
        .from('users')
        .select('id, email, name, avatar_url, role, is_active, last_login_at, created_at', { count: 'exact' })
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(Number(offset), Number(offset) + Number(limit) - 1);

      if (error) {
        throw new Error(error.message);
      }

      res.json({
        success: true,
        data,
        pagination: {
          total: count,
          limit: Number(limit),
          offset: Number(offset),
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Obter usuário por ID
   */
  async get(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { organizationId } = req.user!;

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .single();

      if (error || !data) {
        return res.status(404).json({ error: 'User not found' });
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
   * Atualizar usuário
   */
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { organizationId, userId, role: currentUserRole } = req.user!;
      const { name, avatar_url, phone, preferences, role } = req.body;

      // Verificar se pode editar
      if (id !== userId && !['admin', 'super_admin'].includes(currentUserRole)) {
        return res.status(403).json({ error: 'Not authorized to edit this user' });
      }

      const updateData: Record<string, unknown> = {};
      if (name) updateData.name = name;
      if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
      if (phone !== undefined) updateData.phone = phone;
      if (preferences) updateData.preferences = preferences;

      // Apenas admin pode alterar role
      if (role && ['admin', 'super_admin'].includes(currentUserRole)) {
        updateData.role = role;
      }

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', id)
        .eq('organization_id', organizationId)
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
   * Desativar usuário
   */
  async deactivate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { organizationId, userId } = req.user!;

      // Não pode desativar a si mesmo
      if (id === userId) {
        return res.status(400).json({ error: 'Cannot deactivate yourself' });
      }

      const { error } = await supabase
        .from('users')
        .update({ is_active: false })
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
   * Reativar usuário
   */
  async activate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { organizationId } = req.user!;

      const { error } = await supabase
        .from('users')
        .update({ is_active: true })
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
   * Deletar usuário (soft delete)
   */
  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { organizationId, userId } = req.user!;

      // Não pode deletar a si mesmo
      if (id === userId) {
        return res.status(400).json({ error: 'Cannot delete yourself' });
      }

      const { error } = await supabase
        .from('users')
        .update({ deleted_at: new Date().toISOString() })
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
   * Convidar usuário
   */
  async invite(req: Request, res: Response) {
    try {
      const { email, name, role = 'member' } = req.body;
      const { organizationId } = req.user!;

      if (!email || !name) {
        return res.status(400).json({ error: 'Email and name are required' });
      }

      // Verificar se já existe
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (existing) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }

      // Criar usuário no Supabase Auth (com senha temporária)
      const tempPassword = Math.random().toString(36).slice(-12);
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
      });

      if (authError) {
        return res.status(400).json({ error: authError.message });
      }

      // Criar usuário no banco
      const { data: user, error } = await supabase
        .from('users')
        .insert({
          auth_id: authData.user.id,
          email,
          name,
          organization_id: organizationId,
          role,
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      // TODO: Enviar email de convite com link de reset de senha

      res.status(201).json({
        success: true,
        data: user,
      });
    } catch (error: any) {
      logger.error('Invite user error:', error);
      res.status(500).json({ error: error.message });
    }
  },
};

export default usersController;
