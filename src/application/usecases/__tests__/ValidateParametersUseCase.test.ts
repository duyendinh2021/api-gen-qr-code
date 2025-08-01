import { ValidateParametersUseCase } from '../ValidateParametersUseCase';
import { QRCodeRequestDTO } from '../../dto';

describe('ValidateParametersUseCase', () => {
  let useCase: ValidateParametersUseCase;

  beforeEach(() => {
    useCase = new ValidateParametersUseCase();
  });

  describe('execute', () => {
    it('should validate a valid request successfully', async () => {
      const request: QRCodeRequestDTO = {
        data: 'https://example.com',
        size: '200x200',
        format: 'png',
        ecc: 'L',
        color: '#000000',
        bgcolor: '#FFFFFF',
        margin: 1,
        qzone: 0
      };

      const result = await useCase.execute(request);
      expect(result.isValid()).toBe(true);
      expect(result.hasErrors()).toBe(false);
    });

    it('should fail validation when data is missing', async () => {
      const request: QRCodeRequestDTO = {
        data: ''
      };

      const result = await useCase.execute(request);
      expect(result.isValid()).toBe(false);
      expect(result.hasErrors()).toBe(true);
      expect(result.getErrorsForField('data')).toHaveLength(1);
      expect(result.getErrorsForField('data')[0].message).toContain('required');
    });

    it('should fail validation for invalid size format', async () => {
      const request: QRCodeRequestDTO = {
        data: 'test data',
        size: '200-200' // Invalid format
      };

      const result = await useCase.execute(request);
      expect(result.isValid()).toBe(false);
      expect(result.hasErrorForField('size')).toBe(true);
    });

    it('should fail validation for unsupported format', async () => {
      const request: QRCodeRequestDTO = {
        data: 'test data',
        format: 'bmp' // Unsupported format
      };

      const result = await useCase.execute(request);
      expect(result.isValid()).toBe(false);
      expect(result.hasErrorForField('format')).toBe(true);
    });

    it('should fail validation for invalid error correction level', async () => {
      const request: QRCodeRequestDTO = {
        data: 'test data',
        ecc: 'X' // Invalid ECC level
      };

      const result = await useCase.execute(request);
      expect(result.isValid()).toBe(false);
      expect(result.hasErrorForField('ecc')).toBe(true);
    });

    it('should fail validation for invalid color format', async () => {
      const request: QRCodeRequestDTO = {
        data: 'test data',
        color: 'invalid-color'
      };

      const result = await useCase.execute(request);
      expect(result.isValid()).toBe(false);
      expect(result.hasErrorForField('color')).toBe(true);
    });

    it('should fail validation for out-of-range margin', async () => {
      const request: QRCodeRequestDTO = {
        data: 'test data',
        margin: 100 // Above maximum
      };

      const result = await useCase.execute(request);
      expect(result.isValid()).toBe(false);
      expect(result.hasErrorForField('margin')).toBe(true);
    });

    it('should fail validation for out-of-range quiet zone', async () => {
      const request: QRCodeRequestDTO = {
        data: 'test data',
        qzone: 150 // Above maximum
      };

      const result = await useCase.execute(request);
      expect(result.isValid()).toBe(false);
      expect(result.hasErrorForField('qzone')).toBe(true);
    });

    it('should warn about poor color contrast', async () => {
      const request: QRCodeRequestDTO = {
        data: 'test data',
        color: '#808080', // Gray
        bgcolor: '#909090' // Similar gray - poor contrast
      };

      const result = await useCase.execute(request);
      // This should still pass validation but potentially log a warning
      expect(result.isValid()).toBe(false); // Should fail due to poor contrast
      expect(result.hasErrorForField('color_contrast')).toBe(true);
    });

    it('should validate multiple errors correctly', async () => {
      const request: QRCodeRequestDTO = {
        data: '', // Missing
        size: 'invalid', // Invalid format
        format: 'unsupported', // Invalid format
        margin: -1 // Invalid range
      };

      const result = await useCase.execute(request);
      expect(result.isValid()).toBe(false);
      expect(result.getErrors().length).toBeGreaterThan(1);
      expect(result.hasErrorForField('data')).toBe(true);
      expect(result.hasErrorForField('size')).toBe(true);
      expect(result.hasErrorForField('format')).toBe(true);
      expect(result.hasErrorForField('margin')).toBe(true);
    });

    it('should validate charset parameters', async () => {
      const request: QRCodeRequestDTO = {
        data: 'test data',
        'charset-source': 'INVALID-CHARSET'
      };

      const result = await useCase.execute(request);
      expect(result.isValid()).toBe(false);
      expect(result.hasErrorForField('charset-source')).toBe(true);
    });

    it('should accept valid hex colors', async () => {
      const request: QRCodeRequestDTO = {
        data: 'test data',
        color: '#000000', // Black
        bgcolor: '#FFFFFF' // White - good contrast
      };

      const result = await useCase.execute(request);
      
      if (!result.isValid()) {
        console.log('Validation errors:', result.getErrors());
      }
      
      expect(result.isValid()).toBe(true);
    });

    it('should accept valid RGB colors', async () => {
      const request: QRCodeRequestDTO = {
        data: 'test data',
        color: '0-0-0', // Black
        bgcolor: '255-255-255' // White - good contrast
      };

      const result = await useCase.execute(request);
      
      if (!result.isValid()) {
        console.log('Validation errors:', result.getErrors());
      }
      
      expect(result.isValid()).toBe(true);
    });
  });
});