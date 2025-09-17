import { supabase } from '@/lib/supabase';
import CryptoJS from 'crypto-js';

// Security Configuration
const SECURITY_CONFIG = {
  encryption: {
    algorithm: 'AES',
    mode: CryptoJS.mode.GCM,
    keySize: 256 / 32,
    iterations: 10000
  },
  session: {
    timeout: 30 * 60 * 1000, // 30 minutes
    renewThreshold: 5 * 60 * 1000, // 5 minutes before expiry
  },
  rateLimit: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  }
};

// Encryption/Decryption utilities
export class CryptoUtils {
  private static generateKey(password: string, salt: string): string {
    return CryptoJS.PBKDF2(password, salt, {
      keySize: SECURITY_CONFIG.encryption.keySize,
      iterations: SECURITY_CONFIG.encryption.iterations
    }).toString();
  }

  static encrypt(data: string, password: string): string {
    try {
      const salt = CryptoJS.lib.WordArray.random(128/8);
      const key = this.generateKey(password, salt.toString());
      
      const encrypted = CryptoJS.AES.encrypt(data, key).toString();
      
      return salt.toString() + encrypted;
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  static decrypt(encryptedData: string, password: string): string {
    try {
      const salt = encryptedData.substring(0, 32);
      const encrypted = encryptedData.substring(32);
      
      const key = this.generateKey(password, salt);
      const decrypted = CryptoJS.AES.decrypt(encrypted, key);
      
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  static generateSecureToken(length: number = 32): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  static hashPassword(password: string, salt?: string): { hash: string; salt: string } {
    const saltToUse = salt || CryptoJS.lib.WordArray.random(128/8).toString();
    const hash = CryptoJS.PBKDF2(password, saltToUse, {
      keySize: 256/32,
      iterations: 10000
    }).toString();
    
    return { hash, salt: saltToUse };
  }

  static verifyPassword(password: string, hash: string, salt: string): boolean {
    const { hash: computedHash } = this.hashPassword(password, salt);
    return computedHash === hash;
  }
}

// Two-Factor Authentication
export class TwoFactorAuth {
  private static readonly TOTP_WINDOW = 30; // 30 seconds
  private static readonly BACKUP_CODES_COUNT = 10;

  static generateSecret(): string {
    const buffer = new Uint8Array(20);
    crypto.getRandomValues(buffer);
    return this.base32Encode(buffer);
  }

  static generateTOTP(secret: string, timestamp?: number): string {
    const time = Math.floor((timestamp || Date.now()) / 1000 / this.TOTP_WINDOW);
    const timeBuffer = new ArrayBuffer(8);
    const timeView = new DataView(timeBuffer);
    timeView.setUint32(4, time, false);

    const key = this.base32Decode(secret);
    const hmac = CryptoJS.HmacSHA1(CryptoJS.lib.WordArray.create(timeView), CryptoJS.lib.WordArray.create(key));
    
    const offset = hmac.words[hmac.words.length - 1] & 0x0f;
    const binary = ((hmac.words[Math.floor(offset / 4)] >> (24 - (offset % 4) * 8)) & 0x7fffffff) % 1000000;
    
    return binary.toString().padStart(6, '0');
  }

  static verifyTOTP(token: string, secret: string, window: number = 1): boolean {
    const currentTime = Date.now();
    
    for (let i = -window; i <= window; i++) {
      const testTime = currentTime + (i * this.TOTP_WINDOW * 1000);
      const expectedToken = this.generateTOTP(secret, testTime);
      
      if (token === expectedToken) {
        return true;
      }
    }
    
    return false;
  }

  static generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < this.BACKUP_CODES_COUNT; i++) {
      codes.push(CryptoUtils.generateSecureToken(8));
    }
    return codes;
  }

  static generateQRCodeUrl(secret: string, email: string, issuer: string = 'CryptoTracker'): string {
    const otpauth = `otpauth://totp/${issuer}:${email}?secret=${secret}&issuer=${issuer}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauth)}`;
  }

  private static base32Encode(buffer: Uint8Array): string {
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let result = '';
    let bits = 0;
    let value = 0;

    for (const byte of buffer) {
      value = (value << 8) | byte;
      bits += 8;

      while (bits >= 5) {
        result += base32Chars[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }

    if (bits > 0) {
      result += base32Chars[(value << (5 - bits)) & 31];
    }

    return result;
  }

  private static base32Decode(base32: string): Uint8Array {
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const buffer = [];
    let bits = 0;
    let value = 0;

    for (const char of base32.toUpperCase()) {
      const index = base32Chars.indexOf(char);
      if (index === -1) continue;

      value = (value << 5) | index;
      bits += 5;

      if (bits >= 8) {
        buffer.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }

    return new Uint8Array(buffer);
  }
}

// Rate Limiting
export class RateLimiter {
  private attempts = new Map<string, { count: number; resetTime: number }>();

  isAllowed(key: string): boolean {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record || now > record.resetTime) {
      this.attempts.set(key, {
        count: 1,
        resetTime: now + SECURITY_CONFIG.rateLimit.windowMs
      });
      return true;
    }

    if (record.count >= SECURITY_CONFIG.rateLimit.maxAttempts) {
      return false;
    }

    record.count++;
    return true;
  }

  getRemainingTime(key: string): number {
    const record = this.attempts.get(key);
    if (!record) return 0;

    const remaining = record.resetTime - Date.now();
    return Math.max(0, remaining);
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }
}

// Session Management
export class SessionManager {
  private static readonly SESSION_KEY = 'crypto_tracker_session';
  private static readonly DEVICE_ID_KEY = 'device_id';

  static generateDeviceId(): string {
    let deviceId = localStorage.getItem(this.DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = CryptoUtils.generateSecureToken(32);
      localStorage.setItem(this.DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  }

  static createSecureSession(userId: string, additionalData: any = {}): void {
    const deviceId = this.generateDeviceId();
    const session = {
      userId,
      deviceId,
      createdAt: Date.now(),
      expiresAt: Date.now() + SECURITY_CONFIG.session.timeout,
      ...additionalData
    };

    const encryptedSession = CryptoUtils.encrypt(
      JSON.stringify(session),
      `${userId}_${deviceId}_${Date.now()}`
    );

    sessionStorage.setItem(this.SESSION_KEY, encryptedSession);
  }

  static getSession(): any {
    try {
      const encryptedSession = sessionStorage.getItem(this.SESSION_KEY);
      if (!encryptedSession) return null;

      const deviceId = this.generateDeviceId();
      // Note: In a real implementation, you'd need to store the encryption key securely
      // This is a simplified version for demonstration
      
      return JSON.parse(encryptedSession);
    } catch (error) {
      console.error('Failed to decrypt session:', error);
      this.clearSession();
      return null;
    }
  }

  static isSessionValid(): boolean {
    const session = this.getSession();
    if (!session) return false;

    const now = Date.now();
    if (now > session.expiresAt) {
      this.clearSession();
      return false;
    }

    // Check if session needs renewal
    if (now > session.expiresAt - SECURITY_CONFIG.session.renewThreshold) {
      this.renewSession();
    }

    return true;
  }

  static renewSession(): void {
    const session = this.getSession();
    if (session) {
      session.expiresAt = Date.now() + SECURITY_CONFIG.session.timeout;
      this.createSecureSession(session.userId, session);
    }
  }

  static clearSession(): void {
    sessionStorage.removeItem(this.SESSION_KEY);
  }
}

// Secure API Client
export class SecureApiClient {
  private baseURL: string;
  private rateLimiter = new RateLimiter();

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  async secureRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.baseURL}${endpoint}`;
    const requestKey = `${options.method || 'GET'}_${endpoint}`;

    // Rate limiting check
    if (!this.rateLimiter.isAllowed(requestKey)) {
      const remainingTime = this.rateLimiter.getRemainingTime(requestKey);
      throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(remainingTime / 1000)} seconds.`);
    }

    // Add security headers
    const secureHeaders = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-Device-ID': SessionManager.generateDeviceId(),
      ...options.headers
    };

    // Add authentication if available
    const session = SessionManager.getSession();
    if (session) {
      secureHeaders['Authorization'] = `Bearer ${session.accessToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers: secureHeaders,
    });

    // Handle authentication errors
    if (response.status === 401) {
      SessionManager.clearSession();
      throw new Error('Authentication failed');
    }

    return response;
  }
}

// Input Validation and Sanitization
export class InputValidator {
  static sanitizeString(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .trim()
      .substring(0, 1000); // Limit length
  }

  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 255;
  }

  static validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  static validateAmount(amount: string | number): boolean {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return !isNaN(num) && num > 0 && num < 1e12; // Reasonable upper limit
  }

  static sanitizeSearchQuery(query: string): string {
    return query
      .replace(/[^\w\s-]/g, '') // Only allow word characters, spaces, and hyphens
      .trim()
      .substring(0, 100);
  }
}

// Content Security Policy
export class CSPManager {
  static generateNonce(): string {
    return CryptoUtils.generateSecureToken(16);
  }

  static setCSPHeaders(nonce: string): string {
    return [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' https://api.coingecko.com`,
      `style-src 'self' 'unsafe-inline'`,
      "img-src 'self' data: https:",
      "connect-src 'self' https://api.coingecko.com wss: https:",
      "font-src 'self' data:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests"
    ].join('; ');
  }
}

// Security Event Logger
export class SecurityLogger {
  static async logSecurityEvent(event: {
    type: 'login' | 'logout' | 'failed_login' | '2fa_enabled' | '2fa_disabled' | 'password_change' | 'suspicious_activity';
    userId?: string;
    deviceId?: string;
    ipAddress?: string;
    userAgent?: string;
    details?: any;
  }): Promise<void> {
    try {
      const logEntry = {
        ...event,
        timestamp: new Date().toISOString(),
        deviceId: event.deviceId || SessionManager.generateDeviceId(),
      };

      // In a real application, you'd send this to your logging service
      console.log('Security Event:', logEntry);

      // Store in Supabase security_logs table (if it exists)
      try {
        await supabase.from('security_logs').insert([logEntry]);
      } catch (dbError) {
        console.warn('Failed to store security log in database:', dbError);
      }
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }
}

// Export all security utilities
export const securityUtils = {
  crypto: CryptoUtils,
  twoFA: TwoFactorAuth,
  rateLimiter: new RateLimiter(),
  sessionManager: SessionManager,
  inputValidator: InputValidator,
  cspManager: CSPManager,
  securityLogger: SecurityLogger,
  secureApiClient: (baseURL: string) => new SecureApiClient(baseURL)
};
