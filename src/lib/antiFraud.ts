// ============================================
// SISTEMA ANTI-FRAUDE AVANCADO
// Protecao contra abusos, bots e fraudes
// ============================================

export interface FraudSignal {
  type: 'rate_abuse' | 'bot_detected' | 'suspicious_pattern' | 'ip_blocked' | 'device_fingerprint' | 'payment_fraud';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: string;
  userId?: string;
  ip?: string;
  metadata?: Record<string, any>;
}

export interface FraudReport {
  riskScore: number; // 0-100
  signals: FraudSignal[];
  blocked: boolean;
  reason?: string;
}

// ============================================
// DEVICE FINGERPRINTING
// ============================================
export const deviceFingerprint = {
  generate: (): string => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('fingerprint', 2, 2);
    }
    const canvasHash = canvas.toDataURL().slice(-50);

    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || 0,
      canvasHash,
    ];

    // Simple hash
    const str = components.join('|');
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return 'fp_' + Math.abs(hash).toString(36);
  },

  store: (): string => {
    let fp = localStorage.getItem('device_fingerprint');
    if (!fp) {
      fp = deviceFingerprint.generate();
      localStorage.setItem('device_fingerprint', fp);
    }
    return fp;
  },

  get: (): string => {
    return localStorage.getItem('device_fingerprint') || deviceFingerprint.store();
  }
};

// ============================================
// BOT DETECTION
// ============================================
export const botDetection = {
  // Sinais de bot
  signals: {
    hasWebdriver: (): boolean => {
      return !!(navigator as any).webdriver;
    },

    hasPhantom: (): boolean => {
      return !!(window as any).callPhantom || !!(window as any)._phantom;
    },

    hasSelenium: (): boolean => {
      return !!(document as any).__selenium_unwrapped ||
             !!(document as any).__webdriver_evaluate ||
             !!(document as any).__driver_evaluate;
    },

    hasHeadless: (): boolean => {
      return /HeadlessChrome/.test(navigator.userAgent);
    },

    hasSuspiciousUA: (): boolean => {
      const ua = navigator.userAgent.toLowerCase();
      const suspicious = ['bot', 'crawler', 'spider', 'scraper', 'curl', 'wget', 'python', 'java'];
      return suspicious.some(s => ua.includes(s));
    },

    hasNoPlugins: (): boolean => {
      return navigator.plugins.length === 0;
    },

    hasNoLanguages: (): boolean => {
      return !navigator.languages || navigator.languages.length === 0;
    },

    hasInconsistentScreen: (): boolean => {
      return screen.width === 0 || screen.height === 0;
    }
  },

  analyze: (): { isBot: boolean; score: number; reasons: string[] } => {
    const reasons: string[] = [];
    let score = 0;

    if (botDetection.signals.hasWebdriver()) {
      reasons.push('WebDriver detected');
      score += 40;
    }
    if (botDetection.signals.hasPhantom()) {
      reasons.push('PhantomJS detected');
      score += 50;
    }
    if (botDetection.signals.hasSelenium()) {
      reasons.push('Selenium detected');
      score += 50;
    }
    if (botDetection.signals.hasHeadless()) {
      reasons.push('Headless browser');
      score += 30;
    }
    if (botDetection.signals.hasSuspiciousUA()) {
      reasons.push('Suspicious User-Agent');
      score += 40;
    }
    if (botDetection.signals.hasNoPlugins()) {
      reasons.push('No browser plugins');
      score += 15;
    }
    if (botDetection.signals.hasNoLanguages()) {
      reasons.push('No languages configured');
      score += 20;
    }
    if (botDetection.signals.hasInconsistentScreen()) {
      reasons.push('Inconsistent screen dimensions');
      score += 25;
    }

    return {
      isBot: score >= 50,
      score: Math.min(score, 100),
      reasons
    };
  }
};

// ============================================
// BEHAVIOR ANALYSIS
// ============================================
interface BehaviorEvent {
  type: 'click' | 'scroll' | 'keypress' | 'mousemove';
  timestamp: number;
  x?: number;
  y?: number;
}

const behaviorBuffer: BehaviorEvent[] = [];
const MAX_BEHAVIOR_EVENTS = 100;

export const behaviorAnalysis = {
  track: (type: BehaviorEvent['type'], x?: number, y?: number) => {
    behaviorBuffer.push({
      type,
      timestamp: Date.now(),
      x,
      y
    });

    if (behaviorBuffer.length > MAX_BEHAVIOR_EVENTS) {
      behaviorBuffer.shift();
    }
  },

  analyze: (): { suspicious: boolean; reasons: string[] } => {
    const reasons: string[] = [];

    if (behaviorBuffer.length < 5) {
      reasons.push('Very few interactions detected');
    }

    // Check for identical timestamps (bot pattern)
    const timestamps = behaviorBuffer.map(e => e.timestamp);
    const uniqueTimestamps = new Set(timestamps);
    if (uniqueTimestamps.size < timestamps.length * 0.5) {
      reasons.push('Repetitive timing pattern');
    }

    // Check for perfect linear mouse movements
    const mouseEvents = behaviorBuffer.filter(e => e.type === 'mousemove' && e.x !== undefined);
    if (mouseEvents.length >= 3) {
      let linearCount = 0;
      for (let i = 2; i < mouseEvents.length; i++) {
        const dx1 = (mouseEvents[i].x || 0) - (mouseEvents[i-1].x || 0);
        const dy1 = (mouseEvents[i].y || 0) - (mouseEvents[i-1].y || 0);
        const dx2 = (mouseEvents[i-1].x || 0) - (mouseEvents[i-2].x || 0);
        const dy2 = (mouseEvents[i-1].y || 0) - (mouseEvents[i-2].y || 0);

        if (Math.abs(dx1 - dx2) < 2 && Math.abs(dy1 - dy2) < 2) {
          linearCount++;
        }
      }
      if (linearCount > mouseEvents.length * 0.7) {
        reasons.push('Robotic mouse movement pattern');
      }
    }

    return {
      suspicious: reasons.length >= 2,
      reasons
    };
  },

  init: () => {
    if (typeof window !== 'undefined') {
      document.addEventListener('click', (e) => behaviorAnalysis.track('click', e.clientX, e.clientY));
      document.addEventListener('scroll', () => behaviorAnalysis.track('scroll'));
      document.addEventListener('keypress', () => behaviorAnalysis.track('keypress'));
      document.addEventListener('mousemove', (e) => behaviorAnalysis.track('mousemove', e.clientX, e.clientY), { passive: true });
    }
  }
};

// ============================================
// ADVANCED RATE LIMITING
// ============================================
interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  blockDurationMs: number;
}

interface RateLimitEntry {
  count: number;
  firstRequest: number;
  blocked: boolean;
  blockedUntil?: number;
  violations: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

type RateLimitAction = 'api_general' | 'api_image' | 'api_video' | 'api_voice' | 'login' | 'register';

const rateLimitConfigs: Record<RateLimitAction, RateLimitConfig> = {
  api_general: { maxRequests: 60, windowMs: 60000, blockDurationMs: 300000 },
  api_image: { maxRequests: 30, windowMs: 60000, blockDurationMs: 600000 },
  api_video: { maxRequests: 10, windowMs: 60000, blockDurationMs: 900000 },
  api_voice: { maxRequests: 20, windowMs: 60000, blockDurationMs: 300000 },
  login: { maxRequests: 5, windowMs: 60000, blockDurationMs: 900000 },
  register: { maxRequests: 3, windowMs: 3600000, blockDurationMs: 3600000 },
};

export const advancedRateLimit = {
  configs: rateLimitConfigs,

  check: (key: string, action: RateLimitAction): { allowed: boolean; remaining: number; resetIn: number } => {
    const config = rateLimitConfigs[action] || rateLimitConfigs.api_general;
    const fullKey = `${String(action)}:${key}`;
    const now = Date.now();

    let entry = rateLimitStore.get(fullKey);

    // Check if blocked
    if (entry?.blocked && entry.blockedUntil && now < entry.blockedUntil) {
      return {
        allowed: false,
        remaining: 0,
        resetIn: entry.blockedUntil - now
      };
    }

    // Reset if window expired
    if (!entry || now - entry.firstRequest > config.windowMs) {
      entry = {
        count: 0,
        firstRequest: now,
        blocked: false,
        violations: entry?.violations || 0
      };
    }

    // Check limit
    if (entry.count >= config.maxRequests) {
      entry.violations++;
      entry.blocked = true;

      // Progressive blocking
      const blockMultiplier = Math.min(entry.violations, 5);
      entry.blockedUntil = now + (config.blockDurationMs * blockMultiplier);

      rateLimitStore.set(fullKey, entry);

      return {
        allowed: false,
        remaining: 0,
        resetIn: entry.blockedUntil - now
      };
    }

    entry.count++;
    rateLimitStore.set(fullKey, entry);

    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetIn: entry.firstRequest + config.windowMs - now
    };
  },

  unblock: (key: string, action: string) => {
    const fullKey = `${action}:${key}`;
    rateLimitStore.delete(fullKey);
  }
};

// ============================================
// IP REPUTATION
// ============================================
const blockedIPs = new Set<string>();
const suspiciousIPs = new Map<string, number>(); // IP -> risk score

export const ipReputation = {
  addBlocked: (ip: string) => {
    blockedIPs.add(ip);
    localStorage.setItem('blocked_ips', JSON.stringify([...blockedIPs]));
  },

  removeBlocked: (ip: string) => {
    blockedIPs.delete(ip);
    localStorage.setItem('blocked_ips', JSON.stringify([...blockedIPs]));
  },

  isBlocked: (ip: string): boolean => {
    return blockedIPs.has(ip);
  },

  addSuspicious: (ip: string, score: number) => {
    const current = suspiciousIPs.get(ip) || 0;
    suspiciousIPs.set(ip, current + score);

    if (current + score >= 100) {
      ipReputation.addBlocked(ip);
    }
  },

  getScore: (ip: string): number => {
    return suspiciousIPs.get(ip) || 0;
  },

  loadFromStorage: () => {
    try {
      const stored = localStorage.getItem('blocked_ips');
      if (stored) {
        const ips = JSON.parse(stored);
        ips.forEach((ip: string) => blockedIPs.add(ip));
      }
    } catch (e) {
      console.error('Error loading blocked IPs:', e);
    }
  }
};

// ============================================
// FRAUD ANALYZER
// ============================================
export const fraudAnalyzer = {
  analyze: (userId?: string, ip?: string): FraudReport => {
    const signals: FraudSignal[] = [];
    let riskScore = 0;

    // Check bot detection
    const botResult = botDetection.analyze();
    if (botResult.isBot) {
      signals.push({
        type: 'bot_detected',
        severity: 'critical',
        description: botResult.reasons.join(', '),
        timestamp: new Date().toISOString(),
        userId,
        ip
      });
      riskScore += 50;
    } else if (botResult.score > 20) {
      signals.push({
        type: 'suspicious_pattern',
        severity: 'medium',
        description: `Bot score: ${botResult.score}`,
        timestamp: new Date().toISOString(),
        userId,
        ip
      });
      riskScore += botResult.score / 2;
    }

    // Check behavior
    const behaviorResult = behaviorAnalysis.analyze();
    if (behaviorResult.suspicious) {
      signals.push({
        type: 'suspicious_pattern',
        severity: 'medium',
        description: behaviorResult.reasons.join(', '),
        timestamp: new Date().toISOString(),
        userId,
        ip
      });
      riskScore += 20;
    }

    // Check IP reputation
    if (ip && ipReputation.isBlocked(ip)) {
      signals.push({
        type: 'ip_blocked',
        severity: 'critical',
        description: 'IP is in blocked list',
        timestamp: new Date().toISOString(),
        userId,
        ip
      });
      riskScore += 100;
    } else if (ip) {
      const ipScore = ipReputation.getScore(ip);
      if (ipScore > 50) {
        signals.push({
          type: 'suspicious_pattern',
          severity: 'high',
          description: `Suspicious IP score: ${ipScore}`,
          timestamp: new Date().toISOString(),
          userId,
          ip
        });
        riskScore += ipScore / 2;
      }
    }

    // Check device fingerprint consistency
    const storedFp = localStorage.getItem('device_fingerprint');
    const currentFp = deviceFingerprint.generate();
    if (storedFp && storedFp !== currentFp) {
      signals.push({
        type: 'device_fingerprint',
        severity: 'medium',
        description: 'Device fingerprint changed',
        timestamp: new Date().toISOString(),
        userId,
        ip
      });
      riskScore += 15;
    }

    const blocked = riskScore >= 80;

    return {
      riskScore: Math.min(riskScore, 100),
      signals,
      blocked,
      reason: blocked ? signals.find(s => s.severity === 'critical')?.description : undefined
    };
  },

  shouldBlock: (userId?: string, ip?: string): boolean => {
    const report = fraudAnalyzer.analyze(userId, ip);
    return report.blocked;
  }
};

// ============================================
// LOGGING DE FRAUDE
// ============================================
const FRAUD_LOG_KEY = 'base_agency_fraud_log';
const MAX_FRAUD_LOGS = 500;

export const fraudLog = {
  log: (signal: FraudSignal) => {
    try {
      const logs = fraudLog.getAll();
      logs.unshift(signal);

      if (logs.length > MAX_FRAUD_LOGS) {
        logs.splice(MAX_FRAUD_LOGS);
      }

      localStorage.setItem(FRAUD_LOG_KEY, JSON.stringify(logs));
    } catch (e) {
      console.error('Error logging fraud signal:', e);
    }
  },

  getAll: (): FraudSignal[] => {
    try {
      const stored = localStorage.getItem(FRAUD_LOG_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  getBySeverity: (severity: FraudSignal['severity']): FraudSignal[] => {
    return fraudLog.getAll().filter(s => s.severity === severity);
  },

  clear: () => {
    localStorage.removeItem(FRAUD_LOG_KEY);
  }
};

// ============================================
// INICIALIZACAO
// ============================================
export const initAntiFraud = () => {
  // Load blocked IPs from storage
  ipReputation.loadFromStorage();

  // Initialize behavior tracking
  behaviorAnalysis.init();

  // Generate/store device fingerprint
  deviceFingerprint.store();

  console.log('[Anti-Fraud] System initialized');
};

// ============================================
// EXPORTS
// ============================================
export const antiFraud = {
  deviceFingerprint,
  botDetection,
  behaviorAnalysis,
  advancedRateLimit,
  ipReputation,
  fraudAnalyzer,
  fraudLog,
  init: initAntiFraud
};

export default antiFraud;
