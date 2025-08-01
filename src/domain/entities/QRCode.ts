import { QRCodeConfiguration } from './QRCodeConfiguration';
import { v4 as uuidv4 } from 'uuid';

export interface QRCodeMetadata {
  id: string;
  createdAt: Date;
  configuration: QRCodeConfiguration;
  dataSize: number;
  mimeType: string;
  cacheKey?: string;
}

export class QRCode {
  private readonly id: string;
  private readonly createdAt: Date;
  private readonly configuration: QRCodeConfiguration;
  private readonly imageData: Buffer;
  private readonly metadata: QRCodeMetadata;

  constructor(
    configuration: QRCodeConfiguration,
    imageData: Buffer,
    id?: string
  ) {
    this.id = id || uuidv4();
    this.createdAt = new Date();
    this.configuration = configuration;
    this.imageData = imageData;
    
    this.metadata = {
      id: this.id,
      createdAt: this.createdAt,
      configuration: this.configuration,
      dataSize: imageData.length,
      mimeType: configuration.getFormat().getMimeType(),
      cacheKey: configuration.getHashKey()
    };
  }

  // Getters
  getId(): string {
    return this.id;
  }

  getCreatedAt(): Date {
    return new Date(this.createdAt);
  }

  getConfiguration(): QRCodeConfiguration {
    return this.configuration;
  }

  getImageData(): Buffer {
    return Buffer.from(this.imageData);
  }

  getMetadata(): QRCodeMetadata {
    return {
      ...this.metadata,
      createdAt: new Date(this.metadata.createdAt)
    };
  }

  // Utility methods
  getDataSize(): number {
    return this.imageData.length;
  }

  getMimeType(): string {
    return this.configuration.getFormat().getMimeType();
  }

  getCacheKey(): string {
    return this.configuration.getHashKey();
  }

  getFileExtension(): string {
    return this.configuration.getFormat().toString();
  }

  // Validation
  isValid(): boolean {
    return (
      this.id.length > 0 &&
      this.imageData.length > 0 &&
      this.createdAt instanceof Date &&
      !isNaN(this.createdAt.getTime())
    );
  }

  // Size optimization check
  isOptimalSize(): boolean {
    const sizeThresholds = {
      small: 50 * 1024,    // 50KB
      medium: 200 * 1024,  // 200KB
      large: 500 * 1024    // 500KB
    };

    const complexity = this.configuration.getData().getComplexityLevel();
    const dataSize = this.getDataSize();

    switch (complexity) {
      case 'low':
        return dataSize <= sizeThresholds.small;
      case 'medium':
        return dataSize <= sizeThresholds.medium;
      case 'high':
        return dataSize <= sizeThresholds.large;
      default:
        return true;
    }
  }

  // Performance metrics
  getPerformanceMetrics() {
    return {
      dataSize: this.getDataSize(),
      complexity: this.configuration.getData().getComplexityLevel(),
      format: this.configuration.getFormat().toString(),
      dimensions: this.configuration.getSize().toString(),
      isOptimal: this.isOptimalSize(),
      createdAt: this.createdAt.toISOString()
    };
  }

  // Serialization for caching
  toJSON() {
    return {
      id: this.id,
      createdAt: this.createdAt.toISOString(),
      configuration: {
        data: this.configuration.getData().toString(),
        size: this.configuration.getSize().toString(),
        format: this.configuration.getFormat().toString(),
        errorCorrectionLevel: this.configuration.getErrorCorrectionLevel().toString(),
        foregroundColor: this.configuration.getForegroundColor().toString(),
        backgroundColor: this.configuration.getBackgroundColor().toString(),
        margin: this.configuration.getMargin(),
        quietZone: this.configuration.getQuietZone(),
        charsetSource: this.configuration.getCharsetSource(),
        charsetTarget: this.configuration.getCharsetTarget()
      },
      metadata: {
        ...this.metadata,
        createdAt: this.metadata.createdAt.toISOString()
      },
      imageDataBase64: this.imageData.toString('base64')
    };
  }

  toString(): string {
    return `QRCode{id=${this.id}, size=${this.getDataSize()} bytes, format=${this.configuration.getFormat()}}`;
  }
}