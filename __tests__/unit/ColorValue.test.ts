import { ColorValue } from '@domain/valueObjects/ColorValue';

describe('ColorValue Edge Cases', () => {
  describe('Color Parsing Edge Cases', () => {
    it('should handle uppercase hex colors', () => {
      const color = ColorValue.create('#FF0000');
      expect(color.toHex()).toBe('#ff0000');
    });

    it('should handle lowercase hex colors', () => {
      const color = ColorValue.create('#ff0000');
      expect(color.toHex()).toBe('#ff0000');
    });

    it('should handle short hex format', () => {
      const color = ColorValue.create('#F0A');
      expect(color.getRGB()).toEqual({ r: 255, g: 0, b: 170 });
    });

    it('should handle RGB format with dashes', () => {
      const color = ColorValue.create('255-128-64');
      expect(color.getRGB()).toEqual({ r: 255, g: 128, b: 64 });
    });

    it('should throw error for invalid hex length', () => {
      expect(() => ColorValue.create('#FF')).toThrow('Invalid hex color format');
    });

    it('should throw error for invalid RGB format with wrong number of parts', () => {
      expect(() => ColorValue.create('255-128')).toThrow('Invalid RGB format');
      expect(() => ColorValue.create('255-128-64-32')).toThrow('Invalid RGB format');
    });

    it('should throw error for RGB values out of range', () => {
      expect(() => ColorValue.create('256-128-64')).toThrow('Invalid red value');
      expect(() => ColorValue.create('128-256-64')).toThrow('Invalid green value');
      expect(() => ColorValue.create('128-64-256')).toThrow('Invalid blue value');
    });

    it('should throw error for non-numeric RGB values', () => {
      expect(() => ColorValue.create('abc-128-64')).toThrow('Invalid RGB values');
      expect(() => ColorValue.create('128-def-64')).toThrow('Invalid RGB values');
      expect(() => ColorValue.create('128-64-ghi')).toThrow('Invalid RGB values');
    });

    it('should throw error for unsupported format', () => {
      expect(() => ColorValue.create('rgb(255,128,64)')).toThrow('Invalid color format');
      expect(() => ColorValue.create('red')).toThrow('Invalid color format');
      expect(() => ColorValue.create('')).toThrow('Invalid color format');
    });
  });

  describe('Color Contrast Edge Cases', () => {
    it('should handle identical colors (no contrast)', () => {
      const color1 = ColorValue.create('#000000');
      const color2 = ColorValue.create('#000000');
      expect(color1.getContrastRatio(color2)).toBe(1);
      expect(color1.hasAccessibleContrast(color2)).toBe(false);
    });

    it('should handle maximum contrast (black vs white)', () => {
      const black = ColorValue.black();
      const white = ColorValue.white();
      expect(black.getContrastRatio(white)).toBeCloseTo(21, 1);
      expect(black.hasAccessibleContrast(white)).toBe(true);
    });

    it('should handle edge case colors for contrast', () => {
      const darkGray = ColorValue.create('#333333');
      const lightGray = ColorValue.create('#CCCCCC');
      const ratio = darkGray.getContrastRatio(lightGray);
      expect(ratio).toBeGreaterThan(1);
      expect(typeof ratio).toBe('number');
    });

    it('should handle luminance calculation for edge values', () => {
      const black = ColorValue.black();
      const white = ColorValue.white();
      expect(black.getLuminance()).toBeCloseTo(0, 2);
      expect(white.getLuminance()).toBeCloseTo(1, 2);
    });
  });

  describe('Color Factory Methods', () => {
    it('should create colors from RGB values', () => {
      const color = ColorValue.fromRGB(128, 64, 192);
      expect(color.getRGB()).toEqual({ r: 128, g: 64, b: 192 });
    });

    it('should validate RGB components in factory method', () => {
      expect(() => ColorValue.fromRGB(-1, 128, 64)).toThrow('Invalid red value');
      expect(() => ColorValue.fromRGB(128, 256, 64)).toThrow('Invalid green value');
      expect(() => ColorValue.fromRGB(128, 64, -1)).toThrow('Invalid blue value');
    });

    it('should create black and white colors', () => {
      const black = ColorValue.black();
      const white = ColorValue.white();
      expect(black.getRGB()).toEqual({ r: 0, g: 0, b: 0 });
      expect(white.getRGB()).toEqual({ r: 255, g: 255, b: 255 });
    });
  });

  describe('Color Conversion and Equality', () => {
    it('should convert to RGB string format', () => {
      const color = ColorValue.create('#FF8040');
      expect(color.toRGBString()).toBe('255-128-64');
    });

    it('should handle color equality comparison', () => {
      const color1 = ColorValue.create('#FF0000');
      const color2 = ColorValue.create('#FF0000');
      const color3 = ColorValue.create('#00FF00');
      
      expect(color1.equals(color2)).toBe(true);
      expect(color1.equals(color3)).toBe(false);
    });

    it('should handle toString conversion', () => {
      const color = ColorValue.create('#FF0000');
      expect(color.toString()).toBe('#ff0000');
    });
  });
});