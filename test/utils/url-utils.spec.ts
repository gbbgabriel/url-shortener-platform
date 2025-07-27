import {
  isValidUrl,
  generateRandomCode,
} from '../../apps/url-shortener-service/src/common/utils/url-utils';

describe('URL Utils', () => {
  describe('isValidUrl', () => {
    it('should accept valid HTTP and HTTPS URLs', () => {
      const validUrls = [
        'http://example.com',
        'https://www.google.com',
        'https://github.com/nestjs/nest',
        'http://subdomain.domain.com/path?query=value#fragment',
        'https://api.example.com/v1/users?filter[name]=João&include=profile',
      ];

      validUrls.forEach((url) => {
        expect(isValidUrl(url)).toBe(true);
      });
    });

    it('should reject malicious and invalid URLs', () => {
      const invalidUrls = [
        'javascript:alert("xss")',
        'data:text/html,<script>alert("xss")</script>',
        'file:///etc/passwd',
        'ftp://example.com',
        'not-a-url',
        '',
        'http://',
        'https://',
      ];

      invalidUrls.forEach((url) => {
        expect(isValidUrl(url)).toBe(false);
      });
    });

    it('should reject localhost and private IPs for security', () => {
      const privateUrls = [
        'http://localhost:3000',
        'https://127.0.0.1',
        'http://192.168.1.1',
        'https://10.0.0.1',
        'http://172.16.0.1',
      ];

      privateUrls.forEach((url) => {
        expect(isValidUrl(url)).toBe(false);
      });
    });

    it('should handle edge cases gracefully', () => {
      const edgeCases = [
        'http://example.com:8080/path',
        'https://user:pass@example.com/path',
        'https://xn--nxasmq6b.xn--o3cw4h', // IDN domain
      ];

      edgeCases.forEach((url) => {
        expect(isValidUrl(url)).toBe(true);
      });
    });
  });

  describe('generateRandomCode', () => {
    it('should generate 6-character codes by default', () => {
      const code = generateRandomCode();
      expect(code).toHaveLength(6);
      expect(code).toMatch(/^[A-Za-z0-9]{6}$/);
    });

    it('should generate codes with custom length', () => {
      const lengths = [4, 8, 10];

      lengths.forEach((length) => {
        const code = generateRandomCode(length);
        expect(code).toHaveLength(length);
        expect(code).toMatch(new RegExp(`^[A-Za-z0-9]{${length}}$`));
      });
    });

    it('should generate different codes on multiple calls', () => {
      const codes = new Set();
      for (let i = 0; i < 100; i++) {
        codes.add(generateRandomCode());
      }

      // Com 100 códigos de 6 caracteres alfanuméricos,
      // a probabilidade de colisão é muito baixa
      expect(codes.size).toBeGreaterThan(95);
    });

    it('should use all available characters', () => {
      const codes = new Set();
      for (let i = 0; i < 1000; i++) {
        const code = generateRandomCode();
        code.split('').forEach((char) => codes.add(char));
      }

      // Deve ter usado uma boa variedade de caracteres
      expect(codes.size).toBeGreaterThan(50); // 62 total possíveis
    });
  });
});
