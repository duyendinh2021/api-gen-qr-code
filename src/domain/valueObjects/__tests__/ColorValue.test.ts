import { ColorValue } from '../ColorValue';

describe('ColorValue', () => {
  describe('create method with hex colors', () => {
    it('should handle hex colors with # prefix', () => {
      const color = ColorValue.create('#FF0000');
      expect(color.toHex()).toBe('#ff0000');
      expect(color.getRGB()).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('should handle hex colors without # prefix', () => {
      const color = ColorValue.create('FF0000');
      expect(color.toHex()).toBe('#ff0000');
      expect(color.getRGB()).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('should handle 3-digit hex colors with # prefix', () => {
      const color = ColorValue.create('#F00');
      expect(color.toHex()).toBe('#ff0000');
      expect(color.getRGB()).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('should handle 3-digit hex colors without # prefix', () => {
      const color = ColorValue.create('F00');
      expect(color.toHex()).toBe('#ff0000');
      expect(color.getRGB()).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('should handle lowercase hex colors without # prefix', () => {
      const color = ColorValue.create('0066ff');
      expect(color.toHex()).toBe('#0066ff');
      expect(color.getRGB()).toEqual({ r: 0, g: 102, b: 255 });
    });

    it('should handle uppercase hex colors without # prefix', () => {
      const color = ColorValue.create('0066FF');
      expect(color.toHex()).toBe('#0066ff');
      expect(color.getRGB()).toEqual({ r: 0, g: 102, b: 255 });
    });

    it('should handle mixed case hex colors without # prefix', () => {
      const color = ColorValue.create('AbCdEf');
      expect(color.toHex()).toBe('#abcdef');
      expect(color.getRGB()).toEqual({ r: 171, g: 205, b: 239 });
    });
  });

  describe('create method with RGB format', () => {
    it('should handle RGB format', () => {
      const color = ColorValue.create('255-0-0');
      expect(color.getRGB()).toEqual({ r: 255, g: 0, b: 0 });
      expect(color.toHex()).toBe('#ff0000');
    });
  });

  describe('error cases', () => {
    it('should throw error for invalid hex format', () => {
      expect(() => ColorValue.create('#ZZZZZZ')).toThrow('Invalid hex color format');
    });

    it('should throw error for invalid hex format without # prefix', () => {
      expect(() => ColorValue.create('ZZZZZZ')).toThrow('Invalid color format');
    });

    it('should throw error for wrong length hex colors', () => {
      expect(() => ColorValue.create('#FFFF')).toThrow('Invalid hex color format');
      expect(() => ColorValue.create('FFFF')).toThrow('Invalid color format');
    });

    it('should throw error for invalid RGB format', () => {
      expect(() => ColorValue.create('255-0')).toThrow('Invalid RGB format');
      expect(() => ColorValue.create('255-0-0-0')).toThrow('Invalid RGB format');
    });

    it('should throw error for RGB values out of range', () => {
      expect(() => ColorValue.create('256-0-0')).toThrow('Invalid red value: 256');
      expect(() => ColorValue.create('0-256-0')).toThrow('Invalid green value: 256');
      expect(() => ColorValue.create('0-0-256')).toThrow('Invalid blue value: 256');
      // Negative values with dash cause parsing issues, so test a different way
      expect(() => ColorValue.fromRGB(-1, 0, 0)).toThrow('Invalid red value: -1');
    });

    it('should throw error for unsupported format', () => {
      expect(() => ColorValue.create('red')).toThrow('Invalid color format');
      expect(() => ColorValue.create('rgb(255,0,0)')).toThrow('Invalid color format');
    });
  });

  describe('contrast validation', () => {
    it('should calculate contrast ratio correctly', () => {
      const white = ColorValue.create('#FFFFFF');
      const black = ColorValue.create('#000000');
      
      const contrastRatio = white.getContrastRatio(black);
      expect(contrastRatio).toBeCloseTo(21, 1); // White-black has highest contrast
    });

    it('should pass WCAG AA compliance for high contrast colors', () => {
      const white = ColorValue.create('#FFFFFF');
      const black = ColorValue.create('#000000');
      
      expect(white.hasAccessibleContrast(black)).toBe(true);
      expect(black.hasAccessibleContrast(white)).toBe(true);
    });

    it('should fail WCAG AA compliance for low contrast colors', () => {
      const lightGray = ColorValue.create('#EEEEEE');
      const blue = ColorValue.create('#0066FF');
      
      expect(lightGray.hasAccessibleContrast(blue)).toBe(false);
      expect(blue.hasAccessibleContrast(lightGray)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle pure colors correctly', () => {
      const red = ColorValue.create('FF0000');
      const green = ColorValue.create('00FF00');
      const blue = ColorValue.create('0000FF');
      
      expect(red.getRGB()).toEqual({ r: 255, g: 0, b: 0 });
      expect(green.getRGB()).toEqual({ r: 0, g: 255, b: 0 });
      expect(blue.getRGB()).toEqual({ r: 0, g: 0, b: 255 });
    });

    it('should handle grayscale colors correctly', () => {
      const black = ColorValue.create('000000');
      const gray = ColorValue.create('808080');
      const white = ColorValue.create('FFFFFF');
      
      expect(black.getRGB()).toEqual({ r: 0, g: 0, b: 0 });
      expect(gray.getRGB()).toEqual({ r: 128, g: 128, b: 128 });
      expect(white.getRGB()).toEqual({ r: 255, g: 255, b: 255 });
    });

    it('should handle edge hex values correctly', () => {
      const minColor = ColorValue.create('000');
      const maxColor = ColorValue.create('FFF');
      
      expect(minColor.getRGB()).toEqual({ r: 0, g: 0, b: 0 });
      expect(maxColor.getRGB()).toEqual({ r: 255, g: 255, b: 255 });
    });
  });
});