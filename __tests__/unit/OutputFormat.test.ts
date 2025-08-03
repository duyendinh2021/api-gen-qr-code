import { OutputFormatValue, OutputFormat } from '@domain/valueObjects/OutputFormat';

describe('OutputFormat Edge Cases', () => {
  describe('Format Validation', () => {
    it('should accept valid formats', () => {
      expect(() => OutputFormatValue.create('png')).not.toThrow();
      expect(() => OutputFormatValue.create('jpeg')).not.toThrow();
      expect(() => OutputFormatValue.create('jpg')).not.toThrow();
      expect(() => OutputFormatValue.create('gif')).not.toThrow();
      expect(() => OutputFormatValue.create('svg')).not.toThrow();
      expect(() => OutputFormatValue.create('eps')).not.toThrow();
    });

    it('should handle case insensitive formats', () => {
      expect(() => OutputFormatValue.create('PNG')).not.toThrow();
      expect(() => OutputFormatValue.create('JPEG')).not.toThrow();
      expect(() => OutputFormatValue.create('SVG')).not.toThrow();
    });

    it('should reject invalid formats', () => {
      expect(() => OutputFormatValue.create('webp')).toThrow('Invalid output format');
      expect(() => OutputFormatValue.create('bmp')).toThrow('Invalid output format');
      expect(() => OutputFormatValue.create('tiff')).toThrow('Invalid output format');
      expect(() => OutputFormatValue.create('pdf')).toThrow('Invalid output format');
    });

    it('should reject empty or invalid input', () => {
      expect(() => OutputFormatValue.create('')).toThrow('Invalid output format');
      expect(() => OutputFormatValue.create(null as any)).toThrow();
      expect(() => OutputFormatValue.create(undefined as any)).toThrow();
    });
  });

  describe('Format Properties', () => {
    it('should return correct format value', () => {
      const format = OutputFormatValue.create('png');
      expect(format.getValue()).toBe(OutputFormat.PNG);
    });

    it('should normalize format to lowercase', () => {
      const format = OutputFormatValue.create('PNG');
      expect(format.getValue()).toBe(OutputFormat.PNG);
    });

    it('should handle jpg format', () => {
      const format = OutputFormatValue.create('jpg');
      expect(format.getValue()).toBe(OutputFormat.JPG);
    });

    it('should provide correct MIME types', () => {
      expect(OutputFormatValue.create('png').getMimeType()).toBe('image/png');
      expect(OutputFormatValue.create('jpeg').getMimeType()).toBe('image/jpeg');
      expect(OutputFormatValue.create('jpg').getMimeType()).toBe('image/jpeg');
      expect(OutputFormatValue.create('gif').getMimeType()).toBe('image/gif');
      expect(OutputFormatValue.create('svg').getMimeType()).toBe('image/svg+xml');
      expect(OutputFormatValue.create('eps').getMimeType()).toBe('application/postscript');
    });

    it('should identify bitmap vs vector formats', () => {
      expect(OutputFormatValue.create('png').isBitmapFormat()).toBe(true);
      expect(OutputFormatValue.create('jpeg').isBitmapFormat()).toBe(true);
      expect(OutputFormatValue.create('gif').isBitmapFormat()).toBe(true);
      expect(OutputFormatValue.create('svg').isBitmapFormat()).toBe(false);
      expect(OutputFormatValue.create('eps').isBitmapFormat()).toBe(false);
      
      expect(OutputFormatValue.create('svg').isVectorFormat()).toBe(true);
      expect(OutputFormatValue.create('eps').isVectorFormat()).toBe(true);
      expect(OutputFormatValue.create('png').isVectorFormat()).toBe(false);
    });
  });

  describe('Format Defaults and Methods', () => {
    it('should provide default format', () => {
      const defaultFormat = OutputFormatValue.default();
      expect(defaultFormat.getValue()).toBe(OutputFormat.PNG);
    });

    it('should handle toString conversion', () => {
      const format = OutputFormatValue.create('jpeg');
      expect(format.toString()).toBe('jpeg');
    });

    it('should handle equality comparison', () => {
      const format1 = OutputFormatValue.create('png');
      const format2 = OutputFormatValue.create('PNG');
      const format3 = OutputFormatValue.create('jpeg');
      
      expect(format1.equals(format2)).toBe(true);
      expect(format1.equals(format3)).toBe(false);
    });
  });
});