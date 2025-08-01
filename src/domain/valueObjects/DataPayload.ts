export class DataPayload {
  private constructor(private readonly content: string) {}

  static create(data: string): DataPayload {
    if (!data || data.trim().length === 0) {
      throw new Error('Data content cannot be empty');
    }

    if (data.length > 900) {
      throw new Error('Data content cannot exceed 900 characters');
    }

    // Validate that the content is properly URL-encoded for URLs
    if (DataPayload.isUrl(data)) {
      try {
        // Try to parse as URL to validate format
        new URL(data);
      } catch {
        throw new Error('Invalid URL format in data content');
      }
    }

    return new DataPayload(data.trim());
  }

  private static isUrl(content: string): boolean {
    return content.startsWith('http://') || content.startsWith('https://') || content.startsWith('ftp://');
  }

  getContent(): string {
    return this.content;
  }

  getLength(): number {
    return this.content.length;
  }

  toString(): string {
    return this.content;
  }

  equals(other: DataPayload): boolean {
    return this.content === other.content;
  }

  isUrl(): boolean {
    return DataPayload.isUrl(this.content);
  }

  // Get the estimated QR code complexity level based on content
  getComplexityLevel(): 'low' | 'medium' | 'high' {
    if (this.content.length <= 100) return 'low';
    if (this.content.length <= 400) return 'medium';
    return 'high';
  }

  // Validate charset compatibility
  isCompatibleWithCharset(charset: string): boolean {
    try {
      if (charset.toUpperCase() === 'ISO-8859-1') {
        // Check if all characters are within ISO-8859-1 range
        for (let i = 0; i < this.content.length; i++) {
          const charCode = this.content.charCodeAt(i);
          if (charCode > 255) {
            return false;
          }
        }
      }
      return true;
    } catch {
      return false;
    }
  }
}