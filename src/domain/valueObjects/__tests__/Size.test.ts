import { Size } from '../Size';

describe('Size Value Object', () => {
  describe('create', () => {
    it('should create a valid size with integer dimensions', () => {
      const size = Size.create(200, 200);
      expect(size.getWidth()).toBe(200);
      expect(size.getHeight()).toBe(200);
    });

    it('should throw error for non-integer dimensions', () => {
      expect(() => Size.create(200.5, 200)).toThrow('Width and height must be integers');
      expect(() => Size.create(200, 200.5)).toThrow('Width and height must be integers');
    });

    it('should throw error for dimensions below minimum', () => {
      expect(() => Size.create(5, 200)).toThrow('Width must be between 10 and 1000 pixels');
      expect(() => Size.create(200, 5)).toThrow('Height must be between 10 and 1000 pixels');
    });

    it('should throw error for dimensions above maximum', () => {
      expect(() => Size.create(1001, 200)).toThrow('Width must be between 10 and 1000 pixels');
      expect(() => Size.create(200, 1001)).toThrow('Height must be between 10 and 1000 pixels');
    });
  });

  describe('fromString', () => {
    it('should create size from valid string format', () => {
      const size = Size.fromString('300x400');
      expect(size.getWidth()).toBe(300);
      expect(size.getHeight()).toBe(400);
    });

    it('should handle case insensitive format', () => {
      const size = Size.fromString('300X400');
      expect(size.getWidth()).toBe(300);
      expect(size.getHeight()).toBe(400);
    });

    it('should throw error for invalid string format', () => {
      expect(() => Size.fromString('300-400')).toThrow('Size must be in format WxH');
      expect(() => Size.fromString('300')).toThrow('Size must be in format WxH');
      expect(() => Size.fromString('invalid')).toThrow('Size must be in format WxH');
    });
  });

  describe('default', () => {
    it('should return default 200x200 size', () => {
      const size = Size.default();
      expect(size.getWidth()).toBe(200);
      expect(size.getHeight()).toBe(200);
    });
  });

  describe('utility methods', () => {
    const size = Size.create(200, 300);

    it('should return correct string representation', () => {
      expect(size.toString()).toBe('200x300');
    });

    it('should check equality correctly', () => {
      const sameSizeAnother = Size.create(200, 300);
      const differentSize = Size.create(100, 200);
      
      expect(size.equals(sameSizeAnother)).toBe(true);
      expect(size.equals(differentSize)).toBe(false);
    });

    it('should check if size is square', () => {
      const squareSize = Size.create(200, 200);
      const nonSquareSize = Size.create(200, 300);
      
      expect(squareSize.isSquare()).toBe(true);
      expect(nonSquareSize.isSquare()).toBe(false);
    });

    it('should calculate area correctly', () => {
      expect(size.getArea()).toBe(60000);
    });

    it('should calculate aspect ratio correctly', () => {
      expect(size.getAspectRatio()).toBeCloseTo(0.667, 3);
    });
  });
});