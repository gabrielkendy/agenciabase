import { Request, Response, NextFunction } from 'express';

export const authValidator = {
  register(req: Request, res: Response, next: NextFunction) {
    const { email, password, name, organizationName } = req.body;

    const errors: string[] = [];

    if (!email) {
      errors.push('Email is required');
    } else if (!isValidEmail(email)) {
      errors.push('Invalid email format');
    }

    if (!password) {
      errors.push('Password is required');
    } else if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    } else if (!isStrongPassword(password)) {
      errors.push('Password must contain at least one uppercase letter, one lowercase letter, and one number');
    }

    if (!name) {
      errors.push('Name is required');
    } else if (name.length < 2) {
      errors.push('Name must be at least 2 characters');
    }

    if (!organizationName) {
      errors.push('Organization name is required');
    } else if (organizationName.length < 2) {
      errors.push('Organization name must be at least 2 characters');
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(', ') });
    }

    next();
  },

  login(req: Request, res: Response, next: NextFunction) {
    const { email, password } = req.body;

    const errors: string[] = [];

    if (!email) {
      errors.push('Email is required');
    } else if (!isValidEmail(email)) {
      errors.push('Invalid email format');
    }

    if (!password) {
      errors.push('Password is required');
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(', ') });
    }

    next();
  },

  forgotPassword(req: Request, res: Response, next: NextFunction) {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    next();
  },

  resetPassword(req: Request, res: Response, next: NextFunction) {
    const { token, password } = req.body;

    const errors: string[] = [];

    if (!token) {
      errors.push('Reset token is required');
    }

    if (!password) {
      errors.push('Password is required');
    } else if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    } else if (!isStrongPassword(password)) {
      errors.push('Password must contain at least one uppercase letter, one lowercase letter, and one number');
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(', ') });
    }

    next();
  },

  changePassword(req: Request, res: Response, next: NextFunction) {
    const { currentPassword, newPassword } = req.body;

    const errors: string[] = [];

    if (!currentPassword) {
      errors.push('Current password is required');
    }

    if (!newPassword) {
      errors.push('New password is required');
    } else if (newPassword.length < 8) {
      errors.push('New password must be at least 8 characters');
    } else if (!isStrongPassword(newPassword)) {
      errors.push('New password must contain at least one uppercase letter, one lowercase letter, and one number');
    }

    if (currentPassword === newPassword) {
      errors.push('New password must be different from current password');
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(', ') });
    }

    next();
  },
};

// Helper functions
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isStrongPassword(password: string): boolean {
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  return hasUpperCase && hasLowerCase && hasNumber;
}

export default authValidator;
