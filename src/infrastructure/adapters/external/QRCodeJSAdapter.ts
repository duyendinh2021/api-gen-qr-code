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
        
        // Note: Logo overlay for SVG would require different handling
        // For now, SVG format will not support logos
        if (configuration.hasLogo()) {
          console.warn('Logo overlay is not supported for SVG format');
        }
      } else {
        // Generate as buffer for raster formats
        imageBuffer = await QRCodeLib.toBuffer(data, options);

        // Convert PNG to JPEG if requested
        if (format === OutputFormat.JPEG || format === OutputFormat.JPG) {
          imageBuffer = await this.convertPNGToJPEG(imageBuffer, configuration);
        }

        // Add logo overlay if configured
        if (configuration.hasLogo()) {
          imageBuffer = await this.addLogoOverlay(imageBuffer, configuration);
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
      'Margin control',
      'Logo overlay (PNG/JPEG only)'
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
      // Throw an error if JPEG conversion fails to avoid silent fallback to PNG
      console.error('JPEG conversion failed:', error);
      throw new GenerationError('Failed to convert PNG to JPEG: ' + (error instanceof Error ? error.message : String(error)));
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

  private async addLogoOverlay(qrBuffer: Buffer, configuration: QRCodeConfiguration): Promise<Buffer> {
    const logo = configuration.getLogo();
    if (!logo) {
      return qrBuffer;
    }

    try {
      const sharp = await import('sharp');
      
      // Get QR code dimensions
      const qrImage = sharp.default(qrBuffer);
      const qrMetadata = await qrImage.metadata();
      const qrWidth = qrMetadata.width || 300;
      const qrHeight = qrMetadata.height || 300;

      // Download or get logo image
      const logoBuffer = await this.getLogoBuffer(logo);
      
      // Process logo image
      const logoSize = logo.getSize();
      const logoMargin = logo.getMargin();
      
      // Create a circular mask for the logo background
      const maskSize = logoSize + (logoMargin * 2);
      const logoWithBackground = await sharp.default(logoBuffer)
        .resize(logoSize, logoSize, { fit: 'inside' })
        .png()
        .toBuffer();

      // Create white circular background
      const circleBackground = Buffer.from(
        `<svg width="${maskSize}" height="${maskSize}">
          <circle cx="${maskSize/2}" cy="${maskSize/2}" r="${maskSize/2}" fill="white" stroke="#e0e0e0" stroke-width="1"/>
        </svg>`
      );

      const backgroundImage = await sharp.default(circleBackground)
        .png()
        .toBuffer();

      // Composite logo onto background
      const logoWithBg = await sharp.default(backgroundImage)
        .composite([{
          input: logoWithBackground,
          left: logoMargin,
          top: logoMargin
        }])
        .png()
        .toBuffer();

      // Calculate position (center of QR code)
      const logoLeft = Math.round((qrWidth - maskSize) / 2);
      const logoTop = Math.round((qrHeight - maskSize) / 2);

      // Composite logo onto QR code
      const result = await qrImage
        .composite([{
          input: logoWithBg,
          left: logoLeft,
          top: logoTop
        }])
        .png()
        .toBuffer();

      return result;

    } catch (error) {
      console.error('Logo overlay failed:', error);
      // Return original QR code if logo overlay fails
      return qrBuffer;
    }
  }

  private logoCache = new Map<string, { buffer: Buffer; timestamp: number }>();
  private readonly LOGO_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private async getLogoBuffer(logo: any): Promise<Buffer> {
    const logoUrl = logo.getEffectiveUrl();
    const cacheKey = logoUrl;

    // Check cache first
    const cached = this.logoCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.LOGO_CACHE_TTL) {
      return cached.buffer;
    }

    try {
      // For predefined logos, we could have local assets
      // For now, we'll create simple colored circles as placeholders
      if (logo.isPredefined()) {
        const logoBuffer = await this.createPredefinedLogo(logo.getSource());
        
        // Cache the result
        this.logoCache.set(cacheKey, {
          buffer: logoBuffer,
          timestamp: Date.now()
        });
        
        return logoBuffer;
      }

      // For URL-based logos, we would fetch them here
      // For this implementation, we'll create a placeholder
      const placeholderBuffer = await this.createPlaceholderLogo(logo.getSource());
      
      // Cache the result
      this.logoCache.set(cacheKey, {
        buffer: placeholderBuffer,
        timestamp: Date.now()
      });

      return placeholderBuffer;

    } catch (error) {
      console.error('Failed to get logo buffer:', error);
      // Return a simple placeholder
      return this.createSimplePlaceholder();
    }
  }

  private async createPredefinedLogo(logoType: string): Promise<Buffer> {
    const sharp = await import('sharp');
    
    // Color mapping for predefined logos
    const logoColors: Record<string, string> = {
      google: '#4285f4',
      facebook: '#1877f2',
      twitter: '#1da1f2',
      linkedin: '#0077b5',
      github: '#333333',
      apple: '#000000'
    };

    const size = 64;
    const color = logoColors[logoType.toLowerCase()] || '#666666';
    
    // Create a simple colored circle with the first letter
    const letter = logoType.charAt(0).toUpperCase();
    const svg = `
      <svg width="${size}" height="${size}">
        <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="${color}" />
        <text x="${size/2}" y="${size/2 + 8}" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="white">${letter}</text>
      </svg>
    `;

    return sharp.default(Buffer.from(svg))
      .png()
      .toBuffer();
  }

  private async createPlaceholderLogo(source: string): Promise<Buffer> {
    const sharp = await import('sharp');
    
    const size = 64;
    // Create a placeholder with URL indicator
    const svg = `
      <svg width="${size}" height="${size}">
        <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="#e0e0e0" stroke="#999" stroke-width="1"/>
        <text x="${size/2}" y="${size/2 + 4}" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#666">IMG</text>
      </svg>
    `;

    return sharp.default(Buffer.from(svg))
      .png()
      .toBuffer();
  }

  private async createSimplePlaceholder(): Promise<Buffer> {
    const sharp = await import('sharp');
    
    const size = 64;
    const svg = `
      <svg width="${size}" height="${size}">
        <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="#f0f0f0" stroke="#ccc" stroke-width="1"/>
        <text x="${size/2}" y="${size/2 + 4}" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#999">?</text>
      </svg>
    `;

    return sharp.default(Buffer.from(svg))
      .png()
      .toBuffer();
  }
}