export interface LogoOptions {
  source: string;
  size: number;
  margin: number;
}

export class Logo {
  private readonly source: string;
  private readonly size: number;
  private readonly margin: number;

  private constructor(source: string, size: number, margin: number) {
    this.source = source;
    this.size = size;
    this.margin = margin;
  }

  static create(source: string, size?: number, margin?: number): Logo {
    const validatedSource = Logo.validateSource(source);
    const validatedSize = Logo.validateSize(size || 50);
    const validatedMargin = Logo.validateMargin(margin !== undefined ? margin : 5);
    
    return new Logo(validatedSource, validatedSize, validatedMargin);
  }

  private static validateSource(source: string): string {
    if (!source || source.trim().length === 0) {
      throw new Error('Logo source cannot be empty');
    }

    const trimmedSource = source.trim();

    // Check if it's a URL
    if (Logo.isUrl(trimmedSource)) {
      Logo.validateUrl(trimmedSource);
      return trimmedSource;
    }

    // Check if it's a predefined logo identifier
    if (Logo.isPredefinedLogo(trimmedSource)) {
      return trimmedSource;
    }

    throw new Error(`Invalid logo source: ${source}. Must be a valid URL or predefined logo identifier (google, facebook, twitter, linkedin)`);
  }

  private static isUrl(source: string): boolean {
    try {
      const url = new URL(source);
      return ['http:', 'https:'].includes(url.protocol);
    } catch {
      return false;
    }
  }

  private static validateUrl(source: string): void {
    try {
      const url = new URL(source);
      
      // Basic security check - prevent localhost and private IPs
      if (url.hostname === 'localhost' || 
          url.hostname === '127.0.0.1' || 
          url.hostname.startsWith('192.168.') ||
          url.hostname.startsWith('10.') ||
          url.hostname.startsWith('172.')) {
        throw new Error('Private IP addresses and localhost are not allowed');
      }

      // Check for supported file extensions
      const supportedExtensions = ['.png', '.jpg', '.jpeg', '.svg'];
      const path = url.pathname.toLowerCase();
      if (!supportedExtensions.some(ext => path.endsWith(ext))) {
        throw new Error('Logo URL must point to a supported image format (PNG, JPG, JPEG, SVG)');
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Invalid logo URL: ${source}`);
    }
  }

  private static isPredefinedLogo(source: string): boolean {
    const predefinedLogos = ['google', 'facebook', 'twitter', 'linkedin', 'github', 'apple'];
    return predefinedLogos.includes(source.toLowerCase());
  }

  private static validateSize(size: number): number {
    if (!Number.isInteger(size) || size < 10 || size > 200) {
      throw new Error('Logo size must be an integer between 10 and 200 pixels');
    }
    return size;
  }

  private static validateMargin(margin: number): number {
    if (!Number.isInteger(margin) || margin < 0 || margin > 50) {
      throw new Error('Logo margin must be an integer between 0 and 50 pixels');
    }
    return margin;
  }

  // Getters
  getSource(): string {
    return this.source;
  }

  getSize(): number {
    return this.size;
  }

  getMargin(): number {
    return this.margin;
  }

  isUrl(): boolean {
    return Logo.isUrl(this.source);
  }

  isPredefined(): boolean {
    return Logo.isPredefinedLogo(this.source);
  }

  // Utility methods
  equals(other: Logo): boolean {
    return (
      this.source === other.source &&
      this.size === other.size &&
      this.margin === other.margin
    );
  }

  toString(): string {
    return `Logo{source=${this.source}, size=${this.size}px, margin=${this.margin}px}`;
  }

  // Get predefined logo URL
  getPredefinedLogoUrl(): string | null {
    if (!this.isPredefined()) {
      return null;
    }

    // Simple mapping to placeholder images - in a real implementation,
    // these would be actual logo assets or a logo service
    const logoMap: Record<string, string> = {
      google: 'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png',
      facebook: 'https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg',
      twitter: 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Logo_of_Twitter.svg',
      linkedin: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png',
      github: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
      apple: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg'
    };

    return logoMap[this.source.toLowerCase()] || null;
  }

  getEffectiveUrl(): string {
    if (this.isUrl()) {
      return this.source;
    }

    const predefinedUrl = this.getPredefinedLogoUrl();
    if (predefinedUrl) {
      return predefinedUrl;
    }

    throw new Error(`Unable to resolve logo URL for: ${this.source}`);
  }
}