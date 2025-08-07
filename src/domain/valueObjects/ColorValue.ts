export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export class ColorValue {
  private constructor(private readonly color: RGBColor) {}

  static create(colorInput: string): ColorValue {
    const rgb = ColorValue.parseColor(colorInput);
    return new ColorValue(rgb);
  }

  static fromRGB(r: number, g: number, b: number): ColorValue {
    ColorValue.validateRGBComponent(r, 'red');
    ColorValue.validateRGBComponent(g, 'green');
    ColorValue.validateRGBComponent(b, 'blue');
    
    return new ColorValue({ r, g, b });
  }

  static black(): ColorValue {
    return new ColorValue({ r: 0, g: 0, b: 0 });
  }

  static white(): ColorValue {
    return new ColorValue({ r: 255, g: 255, b: 255 });
  }

  private static parseColor(colorInput: string): RGBColor {
    // Handle hex format (#RRGGBB or #RGB)
    if (colorInput.startsWith('#')) {
      return ColorValue.parseHexColor(colorInput);
    }

    // Handle RGB decimal format (r-g-b)
    if (colorInput.includes('-')) {
      return ColorValue.parseRGBString(colorInput);
    }


    if (/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(colorInput)) {
      return ColorValue.parseHexColor('#' + colorInput);
    }

    throw new Error(`Invalid color format: ${colorInput}. Use hex (#RRGGBB or RRGGBB) or RGB (r-g-b) format`);
  }

  private static parseHexColor(hex: string): RGBColor {
    const cleanHex = hex.replace('#', '');
    
    if (cleanHex.length === 3) {
      // Short hex format (#RGB -> #RRGGBB)
      const r = parseInt(cleanHex[0] + cleanHex[0], 16);
      const g = parseInt(cleanHex[1] + cleanHex[1], 16);
      const b = parseInt(cleanHex[2] + cleanHex[2], 16);
      
      if (isNaN(r) || isNaN(g) || isNaN(b)) {
        throw new Error(`Invalid hex color format: ${hex}`);
      }
      
      return { r, g, b };
    } else if (cleanHex.length === 6) {
      // Full hex format (#RRGGBB)
      const r = parseInt(cleanHex.substring(0, 2), 16);
      const g = parseInt(cleanHex.substring(2, 4), 16);
      const b = parseInt(cleanHex.substring(4, 6), 16);
      
      if (isNaN(r) || isNaN(g) || isNaN(b)) {
        throw new Error(`Invalid hex color format: ${hex}`);
      }
      
      return { r, g, b };
    }

    throw new Error(`Invalid hex color format: ${hex}`);
  }

  private static parseRGBString(rgbStr: string): RGBColor {
    const parts = rgbStr.split('-');
    if (parts.length !== 3) {
      throw new Error(`Invalid RGB format: ${rgbStr}. Use format r-g-b`);
    }

    const r = parseInt(parts[0], 10);
    const g = parseInt(parts[1], 10);
    const b = parseInt(parts[2], 10);

    if (isNaN(r) || isNaN(g) || isNaN(b)) {
      throw new Error(`Invalid RGB values: ${rgbStr}. All values must be integers`);
    }

    ColorValue.validateRGBComponent(r, 'red');
    ColorValue.validateRGBComponent(g, 'green');
    ColorValue.validateRGBComponent(b, 'blue');

    return { r, g, b };
  }

  private static validateRGBComponent(value: number, component: string): void {
    if (value < 0 || value > 255) {
      throw new Error(`Invalid ${component} value: ${value}. Must be between 0 and 255`);
    }
  }

  getRGB(): RGBColor {
    return { ...this.color };
  }

  toHex(): string {
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${toHex(this.color.r)}${toHex(this.color.g)}${toHex(this.color.b)}`;
  }

  toRGBString(): string {
    return `${this.color.r}-${this.color.g}-${this.color.b}`;
  }

  toString(): string {
    return this.toHex();
  }

  equals(other: ColorValue): boolean {
    return (
      this.color.r === other.color.r &&
      this.color.g === other.color.g &&
      this.color.b === other.color.b
    );
  }

  // WCAG AA compliance check for color contrast
  getLuminance(): number {
    const sRGB = (c: number) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };

    return 0.2126 * sRGB(this.color.r) + 0.7152 * sRGB(this.color.g) + 0.0722 * sRGB(this.color.b);
  }

  getContrastRatio(other: ColorValue): number {
    const l1 = this.getLuminance();
    const l2 = other.getLuminance();
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  hasAccessibleContrast(other: ColorValue): boolean {
    return this.getContrastRatio(other) >= 3.0; // Relaxed standard for QR codes (was 4.5 WCAG AA)
  }
}