export class Size {
  private constructor(
    private readonly width: number,
    private readonly height: number
  ) {}

  static create(width: number, height: number): Size {
    if (!Number.isInteger(width) || !Number.isInteger(height)) {
      throw new Error('Width and height must be integers');
    }

    if (width < 10 || width > 1000) {
      throw new Error('Width must be between 10 and 1000 pixels');
    }

    if (height < 10 || height > 1000) {
      throw new Error('Height must be between 10 and 1000 pixels');
    }

    return new Size(width, height);
  }

  static fromString(sizeStr: string): Size {
    const match = sizeStr.match(/^(\d+)x(\d+)$/i);
    if (!match) {
      throw new Error('Size must be in format WxH (e.g., 200x200)');
    }

    const width = parseInt(match[1], 10);
    const height = parseInt(match[2], 10);

    return Size.create(width, height);
  }

  static default(): Size {
    return new Size(200, 200);
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  toString(): string {
    return `${this.width}x${this.height}`;
  }

  equals(other: Size): boolean {
    return this.width === other.width && this.height === other.height;
  }

  isSquare(): boolean {
    return this.width === this.height;
  }

  getArea(): number {
    return this.width * this.height;
  }

  getAspectRatio(): number {
    return this.width / this.height;
  }
}