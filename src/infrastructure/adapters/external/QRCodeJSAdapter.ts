import { IQRCodeGenerator } from '../../../application/ports';
import { QRCode } from '../../../domain/entities/QRCode';
import { QRCodeConfiguration } from '../../../domain/entities/QRCodeConfiguration';
import { OutputFormat } from '../../../domain/valueObjects/OutputFormat';
import { ErrorCorrectionLevel } from '../../../domain/valueObjects/ErrorCorrectionLevel';
import { GenerationError } from '../../../shared/errors';
import * as QRCodeLib from 'qrcode';

export class QRCodeJSAdapter implements IQRCodeGenerator {
  private readonly supportedFormats = [
    OutputFormat.PNG,
    OutputFormat.JPEG,
    OutputFormat.JPG,
    OutputFormat.SVG
  ];

  async generate(configuration: QRCodeConfiguration): Promise<QRCode> {
    try {
      const format = configuration.getFormat().getValue();
      
      if (!this.supports(format)) {
        throw new GenerationError(`Unsupported format: ${format}`);
      }

      const options = this.buildQRCodeOptions(configuration);
      const data = configuration.getData().getContent();

      let imageBuffer: Buffer;

      if (format === OutputFormat.SVG) {
        // Generate SVG as string then convert to buffer
        const svgString = await QRCodeLib.toString(data, {
          ...options,
          type: 'svg'
        });
        imageBuffer = Buffer.from(svgString, 'utf-8');
      } else {
        // Generate as buffer for raster formats
        imageBuffer = await QRCodeLib.toBuffer(data, options);

        // Convert PNG to JPEG if requested
        if (format === OutputFormat.JPEG || format === OutputFormat.JPG) {
          imageBuffer = await this.convertPNGToJPEG(imageBuffer, configuration);
        }
      }

      return new QRCode(configuration, imageBuffer);

    } catch (error) {
      throw new GenerationError(
        `Failed to generate QR code: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  supports(format: string): boolean {
    return this.supportedFormats.includes(format as OutputFormat);
  }

  getCapabilities(): string[] {
    return [
      'PNG generation',
      'JPEG generation', 
      'SVG generation',
      'Error correction levels (L, M, Q, H)',
      'Custom colors',
      'Custom dimensions',
      'Margin control'
    ];
  }

  private buildQRCodeOptions(configuration: QRCodeConfiguration) {
    const size = configuration.getSize();
    const foreground = configuration.getForegroundColor();
    const background = configuration.getBackgroundColor();
    const ecc = configuration.getErrorCorrectionLevel();

    return {
      errorCorrectionLevel: this.mapErrorCorrectionLevel(ecc.getValue()),
      width: size.getWidth(),
      height: size.getHeight(),
      margin: configuration.getMargin(),
      color: {
        dark: foreground.toHex(),
        light: background.toHex()
      }
    };
  }

  private mapErrorCorrectionLevel(level: ErrorCorrectionLevel): 'low' | 'medium' | 'quartile' | 'high' {
    switch (level) {
      case ErrorCorrectionLevel.LOW:
        return 'low';
      case ErrorCorrectionLevel.MEDIUM:
        return 'medium';
      case ErrorCorrectionLevel.QUARTILE:
        return 'quartile';
      case ErrorCorrectionLevel.HIGH:
        return 'high';
      default:
        return 'low';
    }
  }

  private async convertPNGToJPEG(pngBuffer: Buffer, configuration: QRCodeConfiguration): Promise<Buffer> {
    try {
      // For now, we'll use a simple approach. In a full implementation,
      // you might want to use Sharp or similar for better quality conversion
      const sharp = await import('sharp');
      
      return await sharp.default(pngBuffer)
        .jpeg({ 
          quality: 90
        })
        .toBuffer();
    } catch (error) {
      // Fallback: return PNG buffer if Sharp is not available or conversion fails
      console.warn('JPEG conversion failed, returning PNG:', error);
      return pngBuffer;
    }
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      // Test with a simple QR code generation
      const testData = 'health-check';
      const testBuffer = await QRCodeLib.toBuffer(testData, {
        width: 100,
        margin: 1
      });
      
      return testBuffer.length > 0;
    } catch (error) {
      return false;
    }
  }

  // Get library information
  getLibraryInfo() {
    return {
      name: 'qrcode',
      version: '1.5.x', // This would come from package.json in real implementation
      supportedFormats: this.supportedFormats,
      maxDataSize: 2953, // Maximum data capacity for QR codes
      features: this.getCapabilities()
    };
  }
}