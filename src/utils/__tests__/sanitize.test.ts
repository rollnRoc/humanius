import { describe, it, expect } from 'vitest';
import { escapeHtml, getTodayYYYYMMDD, secureStorage } from '../sanitize';

describe('Security & Utility Functions (TEST-01)', () => {
  it('should escape HTML tags to prevent XSS (SEC-01)', () => {
    const maliciousInput = '<script>alert("XSS")</script>';
    const sanitized = escapeHtml(maliciousInput);
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
  });

  it('should return valid YYYY-MM-DD local date format (DAT-01)', () => {
    const todayStr = getTodayYYYYMMDD();
    expect(todayStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should encrypt and decrypt localStorage data safely (SEC-02)', () => {
    const sampleData = { id: 'emp-100', name: 'Ahmet Yılmaz', tc: '12345678901' };
    secureStorage.setItem('test_emp_key', sampleData);

    const retrieved = secureStorage.getItem<typeof sampleData>('test_emp_key');
    expect(retrieved).toEqual(sampleData);
    
    // Clean up
    secureStorage.removeItem('test_emp_key');
  });
});
