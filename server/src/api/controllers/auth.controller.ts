import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { supabase } from '../../config/database.js';
import { config } from '../../config/index.js';
import { creditsService } from '../../services/billing/credits.service.js';
import { logger } from '../../utils/logger.js';
import { generateId } from '../../utils/helpers.js';

export const authController = {
  /**
   * Login
   */
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // Verificar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData.user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Buscar dados do usuário
      const { data: user, error: userError } = await supabase
        .from('users')
        .select(`
          *,
          organizations (
            id, name, slug,
            subscriptions (
              status,
              plans (slug)
            )
          )
        `)
        .eq('auth_id', authData.user.id)
        .single();

      if (userError || !user) {
        return res.status(404).json({ error: 'User profile not found' });
      }

      // Atualizar last_login
      await supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', user.id);

      // Gerar JWT
      const token = jwt.sign(
        {
          sub: authData.user.id,
          email: user.email,
          org_id: user.organization_id,
          role: user.role,
        },
        config.jwt.secret,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar_url: user.avatar_url,
            role: user.role,
            organization: user.organizations,
          },
        },
      });
    } catch (error: any) {
      logger.error('Login error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Register
   */
  async register(req: Request, res: Response) {
    try {
      const { email, password, name, organizationName } = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({ error: 'Email, password and name are required' });
      }

      // Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        return res.status(400).json({ error: authError.message });
      }

      if (!authData.user) {
        return res.status(400).json({ error: 'Failed to create user' });
      }

      // Criar organização
      const orgSlug = (organizationName || name)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 50) + '-' + generateId().slice(0, 8);

      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: organizationName || `${name}'s Organization`,
          slug: orgSlug,
        })
        .select()
        .single();

      if (orgError) {
        logger.error('Error creating organization:', orgError);
        return res.status(500).json({ error: 'Failed to create organization' });
      }

      // Criar usuário no banco
      const { data: user, error: userError } = await supabase
        .from('users')
        .insert({
          auth_id: authData.user.id,
          email,
          name,
          organization_id: org.id,
          role: 'admin',
        })
        .select()
        .single();

      if (userError) {
        logger.error('Error creating user:', userError);
        return res.status(500).json({ error: 'Failed to create user profile' });
      }

      // Buscar plano free
      const { data: freePlan } = await supabase
        .from('plans')
        .select('id')
        .eq('slug', 'free')
        .single();

      // Criar assinatura free
      if (freePlan) {
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        await supabase.from('subscriptions').insert({
          organization_id: org.id,
          plan_id: freePlan.id,
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
        });
      }

      // Inicializar créditos (50 para plano free)
      await creditsService.initializeBalance(org.id, 50);

      // Gerar JWT
      const token = jwt.sign(
        {
          sub: authData.user.id,
          email: user.email,
          org_id: org.id,
          role: 'admin',
        },
        config.jwt.secret,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            organization: org,
          },
        },
      });
    } catch (error: any) {
      logger.error('Register error:', error);
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Logout
   */
  async logout(req: Request, res: Response) {
    try {
      await supabase.auth.signOut();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Get current user
   */
  async me(req: Request, res: Response) {
    try {
      const { userId } = req.user!;

      const { data: user, error } = await supabase
        .from('users')
        .select(`
          *,
          organizations (
            id, name, slug, logo_url, settings,
            subscriptions (
              status,
              current_period_end,
              plans (*)
            )
          )
        `)
        .eq('id', userId)
        .single();

      if (error || !user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get credit balance
      const balance = await creditsService.getBalance(user.organization_id);

      res.json({
        success: true,
        data: {
          ...user,
          creditBalance: balance,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Refresh token
   */
  async refresh(req: Request, res: Response) {
    try {
      const { userId, email, organizationId, role } = req.user!;

      // Gerar novo token
      const token = jwt.sign(
        {
          sub: userId,
          email,
          org_id: organizationId,
          role,
        },
        config.jwt.secret,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        data: { token },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Change password
   */
  async changePassword(req: Request, res: Response) {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current and new passwords are required' });
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Forgot password - send reset email
   */
  async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${config.frontendUrl}/reset-password`,
      });

      if (error) {
        logger.error('Forgot password error:', error);
        // Don't reveal if email exists
      }

      // Always return success for security
      res.json({
        success: true,
        message: 'If an account with that email exists, a reset link has been sent.',
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * Reset password with token
   */
  async resetPassword(req: Request, res: Response) {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({ error: 'Token and password are required' });
      }

      // Verify token with Supabase
      const { error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'recovery',
      });

      if (error) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        return res.status(400).json({ error: updateError.message });
      }

      res.json({
        success: true,
        message: 'Password has been reset successfully.',
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  },
};

export default authController;
