import { Size } from '../valueObjects/Size';
import { ColorValue } from '../valueObjects/ColorValue';
import { ErrorCorrectionLevelValue } from '../valueObjects/ErrorCorrectionLevel';
import { OutputFormatValue } from '../valueObjects/OutputFormat';
import { DataPayload } from '../valueObjects/DataPayload';

export interface QRCodeConfigurationParams {
  data: DataPayload;
  size?: Size;
  format?: OutputFormatValue;
  errorCorrectionLevel?: ErrorCorrectionLevelValue;
  foregroundColor?: ColorValue;
  backgroundColor?: ColorValue;
  margin?: number;
  quietZone?: number;
  charsetSource?: string;
  charsetTarget?: string;
}

export class QRCodeConfiguration {
  private readonly data: DataPayload;
  private readonly size: Size;
  private readonly format: OutputFormatValue;
  private readonly errorCorrectionLevel: ErrorCorrectionLevelValue;
  private readonly foregroundColor: ColorValue;
  private readonly backgroundColor: ColorValue;
  private readonly margin: number;
  private readonly quietZone: number;
  private readonly charsetSource: string;
  private readonly charsetTarget: string;

  constructor(params: QRCodeConfigurationParams) {
    this.data = params.data;
    this.size = params.size || Size.default();
    this.format = params.format || OutputFormatValue.default();
    this.errorCorrectionLevel = params.errorCorrectionLevel || ErrorCorrectionLevelValue.default();
    this.foregroundColor = params.foregroundColor || ColorValue.black();
    this.backgroundColor = params.backgroundColor || ColorValue.white();
    this.margin = this.validateMargin(params.margin);
    this.quietZone = this.validateQuietZone(params.quietZone);
    this.charsetSource = params.charsetSource || 'UTF-8';
    this.charsetTarget = params.charsetTarget || 'UTF-8';

    this.validateConfiguration();
  }

  private validateMargin(margin?: number): number {
    const defaultMargin = 1;
    if (margin === undefined) return defaultMargin;
    
    if (!Number.isInteger(margin) || margin < 0 || margin > 50) {
      throw new Error('Margin must be an integer between 0 and 50 pixels');
    }
    
    return margin;
  }

  private validateQuietZone(quietZone?: number): number {
    const defaultQuietZone = 0;
    if (quietZone === undefined) return defaultQuietZone;
    
    if (!Number.isInteger(quietZone) || quietZone < 0 || quietZone > 100) {
      throw new Error('Quiet zone must be an integer between 0 and 100 modules');
    }
    
    return quietZone;
  }

  private validateConfiguration(): void {
    // Validate charset compatibility
    if (!this.data.isCompatibleWithCharset(this.charsetSource)) {
      throw new Error(`Data content is not compatible with charset: ${this.charsetSource}`);
    }

    // Validate supported charsets
    const supportedCharsets = ['UTF-8', 'ISO-8859-1'];
    if (!supportedCharsets.includes(this.charsetSource)) {
      throw new Error(`Unsupported source charset: ${this.charsetSource}. Supported: ${supportedCharsets.join(', ')}`);
    }
    if (!supportedCharsets.includes(this.charsetTarget)) {
      throw new Error(`Unsupported target charset: ${this.charsetTarget}. Supported: ${supportedCharsets.join(', ')}`);
    }

    // Validate color contrast for accessibility (optional warning)
    if (!this.foregroundColor.hasAccessibleContrast(this.backgroundColor)) {
      console.warn('Warning: Color combination may not meet WCAG AA accessibility standards');
    }
  }

  // Getters
  getData(): DataPayload {
    return this.data;
  }

  getSize(): Size {
    return this.size;
  }

  getFormat(): OutputFormatValue {
    return this.format;
  }

  getErrorCorrectionLevel(): ErrorCorrectionLevelValue {
    return this.errorCorrectionLevel;
  }

  getForegroundColor(): ColorValue {
    return this.foregroundColor;
  }

  getBackgroundColor(): ColorValue {
    return this.backgroundColor;
  }

  getMargin(): number {
    return this.margin;
  }

  getQuietZone(): number {
    return this.quietZone;
  }

  getCharsetSource(): string {
    return this.charsetSource;
  }

  getCharsetTarget(): string {
    return this.charsetTarget;
  }

  // Utility methods
  equals(other: QRCodeConfiguration): boolean {
    return (
      this.data.equals(other.data) &&
      this.size.equals(other.size) &&
      this.format.equals(other.format) &&
      this.errorCorrectionLevel.equals(other.errorCorrectionLevel) &&
      this.foregroundColor.equals(other.foregroundColor) &&
      this.backgroundColor.equals(other.backgroundColor) &&
      this.margin === other.margin &&
      this.quietZone === other.quietZone &&
      this.charsetSource === other.charsetSource &&
      this.charsetTarget === other.charsetTarget
    );
  }

  // Generate a unique hash for caching
  getHashKey(): string {
    const components = [
      this.data.toString(),
      this.size.toString(),
      this.format.toString(),
      this.errorCorrectionLevel.toString(),
      this.foregroundColor.toString(),
      this.backgroundColor.toString(),
      this.margin.toString(),
      this.quietZone.toString(),
      this.charsetSource,
      this.charsetTarget
    ];
    
    return Buffer.from(components.join('|')).toString('base64');
  }

  toString(): string {
    return `QRCodeConfiguration{data=${this.data.getLength()} chars, size=${this.size}, format=${this.format}}`;
  }
}