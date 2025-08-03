export enum OutputFormat {
  PNG = 'png',
  GIF = 'gif',
  JPEG = 'jpeg',
  JPG = 'jpg',
  SVG = 'svg',
  EPS = 'eps'
}

export class OutputFormatValue {
  private constructor(private readonly value: OutputFormat) {}

  static create(format: string): OutputFormatValue {
    const lowerFormat = format.toLowerCase();
    
    if (!Object.values(OutputFormat).includes(lowerFormat as OutputFormat)) {
      throw new Error(`Invalid output format: ${format}. Valid formats: png, gif, jpeg, jpg, svg, eps`);
    }
    
    return new OutputFormatValue(lowerFormat as OutputFormat);
  }

  static default(): OutputFormatValue {
    return new OutputFormatValue(OutputFormat.PNG);
  }

  getValue(): OutputFormat {
    return this.value;
  }

  toString(): string {
    return this.value;
  }

  equals(other: OutputFormatValue): boolean {
    return this.value === other.value;
  }

  isBitmapFormat(): boolean {
    return [OutputFormat.PNG, OutputFormat.GIF, OutputFormat.JPEG, OutputFormat.JPG].includes(this.value);
  }

  isVectorFormat(): boolean {
    return [OutputFormat.SVG, OutputFormat.EPS].includes(this.value);
  }

  getMimeType(): string {
    switch (this.value) {
      case OutputFormat.PNG:
        return 'image/png';
      case OutputFormat.GIF:
        return 'image/gif';
      case OutputFormat.JPEG:
      case OutputFormat.JPG:
        return 'image/jpeg';
      case OutputFormat.SVG:
        return 'image/svg+xml';
      case OutputFormat.EPS:
        return 'application/postscript';
      default:
        return 'application/octet-stream';
    }
  }
}