import { ErrorCorrectionLevelValue, ErrorCorrectionLevel } from '@domain/valueObjects/ErrorCorrectionLevel';

describe('ErrorCorrectionLevel Edge Cases', () => {
  describe('ECC Level Validation', () => {
    it('should accept valid ECC levels', () => {
      expect(() => ErrorCorrectionLevelValue.create('L')).not.toThrow();
      expect(() => ErrorCorrectionLevelValue.create('M')).not.toThrow();
      expect(() => ErrorCorrectionLevelValue.create('Q')).not.toThrow();
      expect(() => ErrorCorrectionLevelValue.create('H')).not.toThrow();
    });

    it('should accept lowercase ECC levels', () => {
      expect(() => ErrorCorrectionLevelValue.create('l')).not.toThrow();
      expect(() => ErrorCorrectionLevelValue.create('m')).not.toThrow();
      expect(() => ErrorCorrectionLevelValue.create('q')).not.toThrow();
      expect(() => ErrorCorrectionLevelValue.create('h')).not.toThrow();
    });

    it('should reject invalid ECC levels', () => {
      expect(() => ErrorCorrectionLevelValue.create('X')).toThrow('Invalid error correction level');
      expect(() => ErrorCorrectionLevelValue.create('A')).toThrow('Invalid error correction level');
      expect(() => ErrorCorrectionLevelValue.create('1')).toThrow('Invalid error correction level');
      expect(() => ErrorCorrectionLevelValue.create('low')).toThrow('Invalid error correction level');
    });

    it('should handle empty or invalid input', () => {
      expect(() => ErrorCorrectionLevelValue.create('')).toThrow('Invalid error correction level');
      expect(() => ErrorCorrectionLevelValue.create(null as any)).toThrow();
      expect(() => ErrorCorrectionLevelValue.create(undefined as any)).toThrow();
    });

    it('should handle whitespace', () => {
      // These will actually fail because the implementation doesn't trim whitespace
      expect(() => ErrorCorrectionLevelValue.create(' L ')).toThrow('Invalid error correction level');
      expect(() => ErrorCorrectionLevelValue.create('\tM\n')).toThrow('Invalid error correction level');
    });
  });

  describe('ECC Level Properties', () => {
    it('should return correct level value', () => {
      expect(ErrorCorrectionLevelValue.create('L').getValue()).toBe(ErrorCorrectionLevel.LOW);
      expect(ErrorCorrectionLevelValue.create('l').getValue()).toBe(ErrorCorrectionLevel.LOW);
      expect(ErrorCorrectionLevelValue.create('M').getValue()).toBe(ErrorCorrectionLevel.MEDIUM);
      expect(ErrorCorrectionLevelValue.create('Q').getValue()).toBe(ErrorCorrectionLevel.QUARTILE);
      expect(ErrorCorrectionLevelValue.create('H').getValue()).toBe(ErrorCorrectionLevel.HIGH);
    });

    it('should convert to string', () => {
      expect(ErrorCorrectionLevelValue.create('L').toString()).toBe('L');
      expect(ErrorCorrectionLevelValue.create('M').toString()).toBe('M');
    });

    it('should handle equality comparison', () => {
      const level1 = ErrorCorrectionLevelValue.create('L');
      const level2 = ErrorCorrectionLevelValue.create('l');
      const level3 = ErrorCorrectionLevelValue.create('M');
      
      expect(level1.equals(level2)).toBe(true);
      expect(level1.equals(level3)).toBe(false);
    });
  });

  describe('ECC Level Factory Methods', () => {
    it('should provide default level', () => {
      const defaultLevel = ErrorCorrectionLevelValue.default();
      expect(defaultLevel.getValue()).toBe(ErrorCorrectionLevel.LOW);
    });
  });

  describe('ECC Level Edge Cases', () => {
    it('should handle all enum values', () => {
      const levels = ['L', 'M', 'Q', 'H'];
      levels.forEach(level => {
        expect(() => ErrorCorrectionLevelValue.create(level)).not.toThrow();
      });
    });

    it('should be case insensitive', () => {
      const lowercaseLevels = ['l', 'm', 'q', 'h'];
      lowercaseLevels.forEach(level => {
        expect(() => ErrorCorrectionLevelValue.create(level)).not.toThrow();
      });
    });

    it('should handle mixed case', () => {
      expect(() => ErrorCorrectionLevelValue.create('L')).not.toThrow();
      expect(() => ErrorCorrectionLevelValue.create('m')).not.toThrow();
    });
  });
});