import { QRCodeRequestDTO } from '../dto';
import { ValidationResult, ValidationError, ValidationErrorType } from '../../domain/entities/ValidationResult';
import { Size } from '../../domain/valueObjects/Size';
import { ColorValue } from '../../domain/valueObjects/ColorValue';
import { ErrorCorrectionLevelValue } from '../../domain/valueObjects/ErrorCorrectionLevel';
import { OutputFormatValue } from '../../domain/valueObjects/OutputFormat';
import { DataPayload } from '../../domain/valueObjects/DataPayload';
import { Logo } from '../../domain/valueObjects/Logo';

export class ValidateParametersUseCase {
  async execute(request: QRCodeRequestDTO): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    // Validate required data field
    const dataValidation = this.validateData(request.data);
    if (!dataValidation.isValid()) {
      errors.push(...dataValidation.getErrors());
    }

    // Validate optional fields
    if (request.size) {
      const sizeValidation = this.validateSize(request.size);
      if (!sizeValidation.isValid()) {
        errors.push(...sizeValidation.getErrors());
      }
    }

    if (request.format) {
      const formatValidation = this.validateFormat(request.format);
      if (!formatValidation.isValid()) {
        errors.push(...formatValidation.getErrors());
      }
    }

    if (request.ecc) {
      const eccValidation = this.validateErrorCorrectionLevel(request.ecc);
      if (!eccValidation.isValid()) {
        errors.push(...eccValidation.getErrors());
      }
    }

    if (request.color) {
      const colorValidation = this.validateColor(request.color, 'color');
      if (!colorValidation.isValid()) {
        errors.push(...colorValidation.getErrors());
      }
    }

    if (request.bgcolor) {
      const bgColorValidation = this.validateColor(request.bgcolor, 'bgcolor');
      if (!bgColorValidation.isValid()) {
        errors.push(...bgColorValidation.getErrors());
      }
    }

    if (request.margin !== undefined) {
      const marginValidation = this.validateMargin(request.margin);
      if (!marginValidation.isValid()) {
        errors.push(...marginValidation.getErrors());
      }
    }

    if (request.qzone !== undefined) {
      const qzoneValidation = this.validateQuietZone(request.qzone);
      if (!qzoneValidation.isValid()) {
        errors.push(...qzoneValidation.getErrors());
      }
    }

    if (request['charset-source']) {
      const charsetValidation = this.validateCharset(request['charset-source'], 'charset-source');
      if (!charsetValidation.isValid()) {
        errors.push(...charsetValidation.getErrors());
      }
    }

    if (request['charset-target']) {
      const charsetValidation = this.validateCharset(request['charset-target'], 'charset-target');
      if (!charsetValidation.isValid()) {
        errors.push(...charsetValidation.getErrors());
      }
    }

    // Validate logo parameters
    if (request.logo) {
      const logoValidation = this.validateLogo(request.logo, request.logo_size, request.logo_margin);
      if (!logoValidation.isValid()) {
        errors.push(...logoValidation.getErrors());
      }
    }

    // Cross-field validations
    if (request.color && request.bgcolor) {
      const contrastValidation = this.validateColorContrast(request.color, request.bgcolor);
      if (!contrastValidation.isValid()) {
        errors.push(...contrastValidation.getErrors());
      }
    }

    // Validate logo size relative to QR code size
    if (request.logo && request.size && request.logo_size) {
      const logoSizeValidation = this.validateLogoSizeRelativeToQR(request.size, request.logo_size);
      if (!logoSizeValidation.isValid()) {
        errors.push(...logoSizeValidation.getErrors());
      }
    }

    return errors.length > 0 ? ValidationResult.failure(errors) : ValidationResult.success();
  }

  private validateData(data: string): ValidationResult {
    if (!data) {
      return ValidationResult.single({
        field: 'data',
        message: 'Data field is required',
        type: ValidationErrorType.REQUIRED_FIELD
      });
    }

    try {
      DataPayload.create(data);
      return ValidationResult.success();
    } catch (error) {
      return ValidationResult.single({
        field: 'data',
        message: error instanceof Error ? error.message : 'Invalid data format',
        type: ValidationErrorType.INVALID_VALUE,
        value: data
      });
    }
  }

  private validateSize(size: string): ValidationResult {
    try {
      Size.fromString(size);
      return ValidationResult.success();
    } catch (error) {
      return ValidationResult.single({
        field: 'size',
        message: error instanceof Error ? error.message : 'Invalid size format',
        type: ValidationErrorType.INVALID_FORMAT,
        value: size
      });
    }
  }

  private validateFormat(format: string): ValidationResult {
    try {
      OutputFormatValue.create(format);
      return ValidationResult.success();
    } catch (error) {
      return ValidationResult.single({
        field: 'format',
        message: error instanceof Error ? error.message : 'Invalid format',
        type: ValidationErrorType.INVALID_VALUE,
        value: format
      });
    }
  }

  private validateErrorCorrectionLevel(ecc: string): ValidationResult {
    try {
      ErrorCorrectionLevelValue.create(ecc);
      return ValidationResult.success();
    } catch (error) {
      return ValidationResult.single({
        field: 'ecc',
        message: error instanceof Error ? error.message : 'Invalid error correction level',
        type: ValidationErrorType.INVALID_VALUE,
        value: ecc
      });
    }
  }

  private validateColor(color: string, field: string): ValidationResult {
    try {
      ColorValue.create(color);
      return ValidationResult.success();
    } catch (error) {
      return ValidationResult.single({
        field,
        message: error instanceof Error ? error.message : 'Invalid color format',
        type: ValidationErrorType.INVALID_FORMAT,
        value: color
      });
    }
  }

  private validateMargin(margin: number): ValidationResult {
    if (!Number.isInteger(margin) || margin < 0 || margin > 50) {
      return ValidationResult.single({
        field: 'margin',
        message: 'Margin must be an integer between 0 and 50 pixels',
        type: ValidationErrorType.OUT_OF_RANGE,
        value: margin
      });
    }
    return ValidationResult.success();
  }

  private validateQuietZone(qzone: number): ValidationResult {
    if (!Number.isInteger(qzone) || qzone < 0 || qzone > 100) {
      return ValidationResult.single({
        field: 'qzone',
        message: 'Quiet zone must be an integer between 0 and 100 modules',
        type: ValidationErrorType.OUT_OF_RANGE,
        value: qzone
      });
    }
    return ValidationResult.success();
  }

  private validateCharset(charset: string, field: string): ValidationResult {
    const supportedCharsets = ['UTF-8', 'ISO-8859-1'];
    if (!supportedCharsets.includes(charset)) {
      return ValidationResult.single({
        field,
        message: `Unsupported charset: ${charset}. Supported: ${supportedCharsets.join(', ')}`,
        type: ValidationErrorType.INVALID_VALUE,
        value: charset
      });
    }
    return ValidationResult.success();
  }

  private validateColorContrast(color: string, bgcolor: string): ValidationResult {
    try {
      const foreground = ColorValue.create(color);
      const background = ColorValue.create(bgcolor);
      
      if (!foreground.hasAccessibleContrast(background)) {
        return ValidationResult.single({
          field: 'color_contrast',
          message: 'Color combination may not meet WCAG AA accessibility standards (contrast ratio < 4.5:1)',
          type: ValidationErrorType.CONSTRAINT_VIOLATION,
          value: { color, bgcolor, ratio: foreground.getContrastRatio(background) }
        });
      }
      
      return ValidationResult.success();
    } catch (error) {
      // If color parsing fails, it will be caught by individual color validations
      return ValidationResult.success();
    }
  }

  private validateLogo(logo: string, logoSize?: number, logoMargin?: number): ValidationResult {
    try {
      Logo.create(logo, logoSize, logoMargin);
      return ValidationResult.success();
    } catch (error) {
      return ValidationResult.single({
        field: 'logo',
        message: error instanceof Error ? error.message : 'Invalid logo configuration',
        type: ValidationErrorType.INVALID_VALUE,
        value: { logo, logoSize, logoMargin }
      });
    }
  }

  private validateLogoSizeRelativeToQR(qrSize: string, logoSize: number): ValidationResult {
    try {
      const size = Size.fromString(qrSize);
      const qrCodeSize = Math.min(size.getWidth(), size.getHeight());
      const maxLogoSize = qrCodeSize * 0.3; // Max 30% of QR code size
      
      if (logoSize > maxLogoSize) {
        return ValidationResult.single({
          field: 'logo_size',
          message: `Logo size (${logoSize}px) is too large for QR code size (${qrSize}). Maximum allowed size is ${Math.floor(maxLogoSize)}px (30% of QR code size)`,
          type: ValidationErrorType.CONSTRAINT_VIOLATION,
          value: { logoSize, qrSize, maxAllowed: Math.floor(maxLogoSize) }
        });
      }
      
      return ValidationResult.success();
    } catch (error) {
      // Size validation will be caught by the size validation method
      return ValidationResult.success();
    }
  }
}