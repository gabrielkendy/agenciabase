// ============================================
// SISTEMA DE SEGURANÇA - BASE AGENCY
// Proteção contra XSS, CSRF, Injection e mais
// ============================================

// ============================================
// CRIPTOGRAFIA SIMPLES PARA API KEYS
// ============================================
export const encrypt = (text: string): string => {
  if (!text) return '';
  try {
    const encoded = btoa(encodeURIComponent(text));
    // Adiciona prefixo para identificar dados criptografados
    return `enc_${encoded.split('').reverse().join('')}`;
  } catch {
    return text;
  }
};

export const decrypt = (encryptedText: string): string => {
  if (!encryptedText) return '';
  try {
    if (!encryptedText.startsWith('enc_')) return encryptedText;
    const encoded = encryptedText.slice(4).split('').reverse().join('');
    return decodeURIComponent(atob(encoded));
  } catch {
    return encryptedText;
  }
};

// ============================================
// SANITIZAÇÃO DE INPUTS (Anti-XSS)
// ============================================
export const sanitizeHTML = (input: string): string => {
  if (!input) return '';
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };
  return input.replace(/[&<>"'`=/]/g, (char) => map[char] || char);
};

export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  // Remove scripts e tags perigosas
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/data:/gi, '')
    .trim();
};

// Sanitizar objeto inteiro
export const sanitizeObject = <T extends Record<string, any>>(obj: T): T => {
  const sanitized: Record<string, any> = {};
  for (const key in obj) {
    const value = obj[key];
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized as T;
};

// ============================================
// VALIDAÇÃO DE DADOS
// ============================================
export const validators = {
  email: (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },

  password: (password: string): { valid: boolean; message: string } => {
    if (password.length < 6) {
      return { valid: false, message: 'Senha deve ter no mínimo 6 caracteres' };
    }
    return { valid: true, message: '' };
  },

  apiKey: (key: string): boolean => {
    // API keys geralmente têm formato específico
    return key.length >= 10 && /^[a-zA-Z0-9_-]+$/.test(key.replace(/^(sk-|fpk_|xi_|fal_|\$aact_)/, ''));
  },

  url: (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  phone: (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 15;
  }
};

// ============================================
// RATE LIMITING (Client-side)
// ============================================
interface RateLimitEntry {
  count: number;
  firstRequest: number;
}

const rateLimitStore: Map<string, RateLimitEntry> = new Map();

export const rateLimit = {
  check: (action: string, maxRequests: number = 10, windowMs: number = 60000): boolean => {
    const now = Date.now();
    const entry = rateLimitStore.get(action);

    if (!entry || now - entry.firstRequest > windowMs) {
      rateLimitStore.set(action, { count: 1, firstRequest: now });
      return true;
    }

    if (entry.count >= maxRequests) {
      return false;
    }

    entry.count++;
    return true;
  },

  reset: (action: string): void => {
    rateLimitStore.delete(action);
  }
};

// ============================================
// PROTEÇÃO CSRF
// ============================================
export const csrf = {
  generateToken: (): string => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  },

  getToken: (): string => {
    let token = sessionStorage.getItem('csrf_token');
    if (!token) {
      token = csrf.generateToken();
      sessionStorage.setItem('csrf_token', token);
    }
    return token;
  },

  validateToken: (token: string): boolean => {
    const storedToken = sessionStorage.getItem('csrf_token');
    return token === storedToken;
  }
};

// ============================================
// AUDIT LOG
// ============================================
interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  action: string;
  resource: string;
  details?: string;
  ip?: string;
  userAgent?: string;
}

const AUDIT_LOG_KEY = 'base_agency_audit_log';
const MAX_AUDIT_ENTRIES = 1000;

export const auditLog = {
  log: (userId: string, action: string, resource: string, details?: string): void => {
    try {
      const logs = auditLog.getAll();
      const entry: AuditLogEntry = {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        userId,
        action,
        resource,
        details,
        userAgent: navigator.userAgent
      };

      logs.unshift(entry);

      // Manter apenas últimas entradas
      if (logs.length > MAX_AUDIT_ENTRIES) {
        logs.splice(MAX_AUDIT_ENTRIES);
      }

      localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(logs));
    } catch (error) {
      console.error('Erro ao registrar audit log:', error);
    }
  },

  getAll: (): AuditLogEntry[] => {
    try {
      const stored = localStorage.getItem(AUDIT_LOG_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  getByUser: (userId: string): AuditLogEntry[] => {
    return auditLog.getAll().filter(entry => entry.userId === userId);
  },

  getByAction: (action: string): AuditLogEntry[] => {
    return auditLog.getAll().filter(entry => entry.action === action);
  },

  clear: (): void => {
    localStorage.removeItem(AUDIT_LOG_KEY);
  }
};

// ============================================
// DETECÇÃO DE AMEAÇAS
// ============================================
export const threatDetection = {
  // Detecta tentativas de SQL injection
  detectSQLInjection: (input: string): boolean => {
    const patterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b)/i,
      /(--|#|\/\*|\*\/)/,
      /(\bOR\b\s+\d+\s*=\s*\d+)/i,
      /(\bAND\b\s+\d+\s*=\s*\d+)/i,
      /('\s*(OR|AND)\s*')/i
    ];
    return patterns.some(pattern => pattern.test(input));
  },

  // Detecta tentativas de XSS
  detectXSS: (input: string): boolean => {
    const patterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe/gi,
      /<object/gi,
      /<embed/gi,
      /expression\s*\(/gi
    ];
    return patterns.some(pattern => pattern.test(input));
  },

  // Detecta tentativas de path traversal
  detectPathTraversal: (input: string): boolean => {
    const patterns = [
      /\.\.\//,
      /\.\.\\/,
      /%2e%2e%2f/i,
      /%2e%2e\//i
    ];
    return patterns.some(pattern => pattern.test(input));
  },

  // Verificação completa
  analyze: (input: string): { safe: boolean; threats: string[] } => {
    const threats: string[] = [];

    if (threatDetection.detectSQLInjection(input)) {
      threats.push('SQL Injection');
    }
    if (threatDetection.detectXSS(input)) {
      threats.push('XSS');
    }
    if (threatDetection.detectPathTraversal(input)) {
      threats.push('Path Traversal');
    }

    return {
      safe: threats.length === 0,
      threats
    };
  }
};

// ============================================
// SESSÃO SEGURA
// ============================================
export const secureSession = {
  // Tempo máximo de inatividade (30 minutos)
  INACTIVITY_TIMEOUT: 30 * 60 * 1000,

  updateActivity: (): void => {
    sessionStorage.setItem('last_activity', Date.now().toString());
  },

  checkActivity: (): boolean => {
    const lastActivity = sessionStorage.getItem('last_activity');
    if (!lastActivity) {
      secureSession.updateActivity();
      return true;
    }

    const elapsed = Date.now() - parseInt(lastActivity);
    if (elapsed > secureSession.INACTIVITY_TIMEOUT) {
      return false;
    }

    secureSession.updateActivity();
    return true;
  },

  clearSession: (): void => {
    sessionStorage.clear();
  }
};

// ============================================
// PERMISSÕES E AUTORIZAÇÃO
// ============================================
export type Permission =
  | 'view_dashboard'
  | 'manage_clients'
  | 'manage_team'
  | 'manage_demands'
  | 'approve_demands'
  | 'publish_content'
  | 'view_reports'
  | 'manage_settings'
  | 'manage_integrations'
  | 'view_audit_log'
  | 'super_admin';

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  super_admin: [
    'view_dashboard', 'manage_clients', 'manage_team', 'manage_demands',
    'approve_demands', 'publish_content', 'view_reports', 'manage_settings',
    'manage_integrations', 'view_audit_log', 'super_admin'
  ],
  admin: [
    'view_dashboard', 'manage_clients', 'manage_team', 'manage_demands',
    'approve_demands', 'publish_content', 'view_reports', 'manage_settings'
  ],
  manager: [
    'view_dashboard', 'manage_clients', 'manage_demands', 'approve_demands',
    'publish_content', 'view_reports'
  ],
  redator: [
    'view_dashboard', 'manage_demands'
  ],
  designer: [
    'view_dashboard', 'manage_demands'
  ],
  editor: [
    'view_dashboard', 'manage_demands'
  ],
  viewer: [
    'view_dashboard', 'view_reports'
  ]
};

export const hasPermission = (role: string, permission: Permission): boolean => {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission) || permissions.includes('super_admin');
};

export const requirePermission = (role: string, permission: Permission): void => {
  if (!hasPermission(role, permission)) {
    throw new Error(`Permissão negada: ${permission}`);
  }
};

// ============================================
// MASCARAMENTO DE DADOS SENSÍVEIS
// ============================================
export const maskSensitiveData = {
  apiKey: (key: string): string => {
    if (!key || key.length < 8) return '••••••••';
    return `${key.slice(0, 4)}${'•'.repeat(key.length - 8)}${key.slice(-4)}`;
  },

  email: (email: string): string => {
    if (!email) return '';
    const [local, domain] = email.split('@');
    if (!domain) return email;
    const maskedLocal = local.length > 2
      ? `${local[0]}${'•'.repeat(local.length - 2)}${local[local.length - 1]}`
      : local;
    return `${maskedLocal}@${domain}`;
  },

  phone: (phone: string): string => {
    if (!phone || phone.length < 4) return phone;
    return `${'•'.repeat(phone.length - 4)}${phone.slice(-4)}`;
  },

  cpf: (cpf: string): string => {
    if (!cpf || cpf.length < 4) return cpf;
    return `${'•'.repeat(cpf.length - 4)}${cpf.slice(-4)}`;
  }
};

// ============================================
// EXPORTAR UTILITÁRIOS
// ============================================
export const security = {
  encrypt,
  decrypt,
  sanitizeHTML,
  sanitizeInput,
  sanitizeObject,
  validators,
  rateLimit,
  csrf,
  auditLog,
  threatDetection,
  secureSession,
  hasPermission,
  requirePermission,
  maskSensitiveData
};

export default security;
