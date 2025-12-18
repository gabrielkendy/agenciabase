import { describe, it, expect } from 'vitest';
import {
  generateId,
  sleep,
  retry,
  extractDomain,
  sanitizeString,
  isValidEmail,
  simpleHash,
  formatBytes,
  formatDuration,
} from './helpers.js';

describe('Helpers', () => {
  describe('generateId', () => {
    it('should generate a valid UUID', () => {
      const id = generateId();
      expect(id).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
    });

    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('sleep', () => {
    it('should delay execution', async () => {
      const start = Date.now();
      await sleep(100);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(95);
    });
  });

  describe('retry', () => {
    it('should return result on success', async () => {
      const fn = async () => 'success';
      const result = await retry(fn);
      expect(result).toBe('success');
    });

    it('should retry on failure', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts < 2) throw new Error('fail');
        return 'success';
      };
      const result = await retry(fn, { maxRetries: 3, baseDelay: 10 });
      expect(result).toBe('success');
      expect(attempts).toBe(2);
    });
  });

  describe('extractDomain', () => {
    it('should extract domain from URL', () => {
      expect(extractDomain('https://example.com/path')).toBe('example.com');
      expect(extractDomain('http://sub.example.org')).toBe('sub.example.org');
    });

    it('should return empty string for invalid URL', () => {
      expect(extractDomain('not-a-url')).toBe('');
    });
  });

  describe('sanitizeString', () => {
    it('should remove dangerous characters', () => {
      expect(sanitizeString('<script>alert("xss")</script>')).toBe('scriptalert(xss)/script');
      expect(sanitizeString("Test's & Test\"s")).toBe('Tests  Tests');
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('no@domain')).toBe(false);
      expect(isValidEmail('@nodomain.com')).toBe(false);
    });
  });

  describe('simpleHash', () => {
    it('should generate consistent hash', () => {
      const hash1 = simpleHash('test');
      const hash2 = simpleHash('test');
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different inputs', () => {
      const hash1 = simpleHash('test1');
      const hash2 = simpleHash('test2');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1048576)).toBe('1 MB');
      expect(formatBytes(1073741824)).toBe('1 GB');
    });
  });

  describe('formatDuration', () => {
    it('should format duration correctly', () => {
      expect(formatDuration(30)).toBe('30s');
      expect(formatDuration(90)).toBe('1m 30s');
      expect(formatDuration(3661)).toBe('61m 1s');
    });
  });
});
