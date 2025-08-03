export enum ErrorCorrectionLevel {
  LOW = 'L',      // ~7% error correction
  MEDIUM = 'M',   // ~15% error correction
  QUARTILE = 'Q', // ~25% error correction
  HIGH = 'H'      // ~30% error correction
}

export class ErrorCorrectionLevelValue {
  private constructor(private readonly value: ErrorCorrectionLevel) {}

  static create(level: string): ErrorCorrectionLevelValue {
    const upperLevel = level.toUpperCase();
    
    if (!Object.values(ErrorCorrectionLevel).includes(upperLevel as ErrorCorrectionLevel)) {
      throw new Error(`Invalid error correction level: ${level}. Valid values: L, M, Q, H`);
    }
    
    return new ErrorCorrectionLevelValue(upperLevel as ErrorCorrectionLevel);
  }

  static default(): ErrorCorrectionLevelValue {
    return new ErrorCorrectionLevelValue(ErrorCorrectionLevel.LOW);
  }

  getValue(): ErrorCorrectionLevel {
    return this.value;
  }

  toString(): string {
    return this.value;
  }

  equals(other: ErrorCorrectionLevelValue): boolean {
    return this.value === other.value;
  }
}