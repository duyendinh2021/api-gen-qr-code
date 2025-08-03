import { DataPayload } from '@domain/valueObjects/DataPayload';

describe('DataPayload Edge Cases', () => {
  describe('Data Validation Edge Cases', () => {
    it('should handle empty string', () => {
      expect(() => DataPayload.create('')).toThrow('Data content cannot be empty');
    });

    it('should handle null and undefined', () => {
      expect(() => DataPayload.create(null as any)).toThrow();
      expect(() => DataPayload.create(undefined as any)).toThrow();
    });

    it('should handle whitespace-only strings', () => {
      expect(() => DataPayload.create('   ')).toThrow('Data content cannot be empty');
      expect(() => DataPayload.create('\t\n\r')).toThrow('Data content cannot be empty');
    });

    it('should handle very long strings', () => {
      const longString = 'a'.repeat(1000);
      expect(() => DataPayload.create(longString)).toThrow('Data content cannot exceed 900 characters');
    });

    it('should handle exact length limits', () => {
      const maxLength = 'a'.repeat(900);
      const overLength = 'a'.repeat(901);
      
      expect(() => DataPayload.create(maxLength)).not.toThrow();
      expect(() => DataPayload.create(overLength)).toThrow('Data content cannot exceed 900 characters');
    });

    it('should handle special characters', () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      expect(() => DataPayload.create(specialChars)).not.toThrow();
    });

    it('should handle unicode characters', () => {
      const unicode = '🔧 Hello 世界 नमस्ते';
      expect(() => DataPayload.create(unicode)).not.toThrow();
    });

    it('should handle valid URLs', () => {
      const url = 'https://example.com/path?param=value#anchor';
      expect(() => DataPayload.create(url)).not.toThrow();
    });

    it('should reject invalid URLs', () => {
      const invalidUrl = 'https://';
      expect(() => DataPayload.create(invalidUrl)).toThrow('Invalid URL format in data content');
    });

    it('should handle emails', () => {
      const email = 'user@example.com';
      expect(() => DataPayload.create(email)).not.toThrow();
    });

    it('should handle phone numbers', () => {
      const phone = '+1-555-123-4567';
      expect(() => DataPayload.create(phone)).not.toThrow();
    });

    it('should handle JSON strings', () => {
      const json = '{"key": "value", "number": 123}';
      expect(() => DataPayload.create(json)).not.toThrow();
    });

    it('should handle multi-line text', () => {
      const multiLine = 'Line 1\nLine 2\rLine 3\r\nLine 4';
      expect(() => DataPayload.create(multiLine)).not.toThrow();
    });
  });

  describe('Data Payload Methods', () => {
    it('should create valid data payload', () => {
      const data = DataPayload.create('Hello World');
      expect(data).toBeDefined();
      expect(data.getContent()).toBe('Hello World');
    });

    it('should trim whitespace from valid data', () => {
      const data = DataPayload.create('  Hello World  ');
      expect(data.getContent()).toBe('Hello World');
    });

    it('should preserve internal whitespace', () => {
      const data = DataPayload.create('Hello   World');
      expect(data.getContent()).toBe('Hello   World');
    });

    it('should return correct length', () => {
      const data = DataPayload.create('Hello');
      expect(data.getLength()).toBe(5);
    });

    it('should convert to string', () => {
      const data = DataPayload.create('Test String');
      expect(data.toString()).toBe('Test String');
    });

    it('should handle equality comparison', () => {
      const data1 = DataPayload.create('Hello');
      const data2 = DataPayload.create('Hello');
      const data3 = DataPayload.create('World');
      
      expect(data1.equals(data2)).toBe(true);
      expect(data1.equals(data3)).toBe(false);
    });

    it('should detect URLs', () => {
      const url = DataPayload.create('https://example.com');
      const text = DataPayload.create('Not a URL');
      
      expect(url.isUrl()).toBe(true);
      expect(text.isUrl()).toBe(false);
    });

    it('should calculate complexity level', () => {
      const low = DataPayload.create('Short');
      const medium = DataPayload.create('A'.repeat(200));
      const high = DataPayload.create('A'.repeat(500));
      
      expect(low.getComplexityLevel()).toBe('low');
      expect(medium.getComplexityLevel()).toBe('medium');
      expect(high.getComplexityLevel()).toBe('high');
    });

    it('should check charset compatibility', () => {
      const asciiData = DataPayload.create('Hello World');
      const unicodeData = DataPayload.create('Hello 世界');
      
      expect(asciiData.isCompatibleWithCharset('ISO-8859-1')).toBe(true);
      expect(unicodeData.isCompatibleWithCharset('ISO-8859-1')).toBe(false);
      expect(asciiData.isCompatibleWithCharset('UTF-8')).toBe(true);
      expect(unicodeData.isCompatibleWithCharset('UTF-8')).toBe(true);
    });
  });

  describe('Data Payload Edge Cases with Length', () => {
    it('should handle exactly one character', () => {
      const data = DataPayload.create('a');
      expect(data.getContent()).toBe('a');
    });

    it('should handle boundary lengths', () => {
      // Test various lengths near the boundary
      for (let i = 895; i <= 905; i++) {
        const testString = 'a'.repeat(i);
        if (i <= 900) {
          expect(() => DataPayload.create(testString)).not.toThrow();
        } else {
          expect(() => DataPayload.create(testString)).toThrow('Data content cannot exceed 900 characters');
        }
      }
    });
  });
});