import { describe, it, expect } from 'vitest';
import { redactSecrets } from '../src/ai/security.js';

describe('security', () => {
  it('should redact sensitive tokens and keys from texts', () => {
    const text = 'Here is my GitHub token: ghp_1234567890abcdefghijklmnopqrstuvwxyz12 and my password: password="superSecretPass123"';
    
    const redacted = redactSecrets(text);
    
    expect(redacted).not.toContain('ghp_1234567890abcdefghijklmnopqrstuvwxyz12');
    expect(redacted).not.toContain('superSecretPass123');
    expect(redacted).toContain('Here is my GitHub token: [REDACTED_SECRET] and my password: password="[REDACTED_SECRET]"');
  });

  it('should redact AWS credentials', () => {
    const text = 'AWS_KEY = "AKIA1234567890ABCDEF" and aws_secret_access_key: "abc/def/ghi/jkl/mno/pqr/stu/vwx/yz123456"';
    
    const redacted = redactSecrets(text);
    
    expect(redacted).not.toContain('AKIA1234567890ABCDEF');
    expect(redacted).not.toContain('abc/def/ghi/jkl/mno/pqr/stu/vwx/yz123456');
    expect(redacted).toContain('AWS_KEY = "[REDACTED_SECRET]" and aws_secret_access_key: "[REDACTED_SECRET]"');
  });

  it('should pass normal texts unmodified', () => {
    const normalText = 'This is a normal paragraph with standard documentation guidelines.';
    expect(redactSecrets(normalText)).toBe(normalText);
  });
});
