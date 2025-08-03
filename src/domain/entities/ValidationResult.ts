export enum ValidationErrorType {
  INVALID_FORMAT = 'INVALID_FORMAT',
  OUT_OF_RANGE = 'OUT_OF_RANGE',
  REQUIRED_FIELD = 'REQUIRED_FIELD',
  INVALID_VALUE = 'INVALID_VALUE',
  CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION'
}

export interface ValidationError {
  field: string;
  message: string;
  type: ValidationErrorType;
  value?: any;
}

export class ValidationResult {
  private constructor(
    private readonly isValidFlag: boolean,
    private readonly errors: ValidationError[] = []
  ) {}

  static success(): ValidationResult {
    return new ValidationResult(true, []);
  }

  static failure(errors: ValidationError[]): ValidationResult {
    return new ValidationResult(false, errors);
  }

  static single(error: ValidationError): ValidationResult {
    return new ValidationResult(false, [error]);
  }

  isValid(): boolean {
    return this.isValidFlag;
  }

  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  getErrors(): ValidationError[] {
    return [...this.errors];
  }

  getErrorMessages(): string[] {
    return this.errors.map(error => error.message);
  }

  getErrorsForField(field: string): ValidationError[] {
    return this.errors.filter(error => error.field === field);
  }

  hasErrorForField(field: string): boolean {
    return this.errors.some(error => error.field === field);
  }

  combine(other: ValidationResult): ValidationResult {
    if (this.isValidFlag && other.isValidFlag) {
      return ValidationResult.success();
    }

    const combinedErrors = [...this.errors, ...other.errors];
    return ValidationResult.failure(combinedErrors);
  }

  static combine(results: ValidationResult[]): ValidationResult {
    const allErrors: ValidationError[] = [];
    let hasError = false;

    for (const result of results) {
      if (!result.isValid()) {
        hasError = true;
        allErrors.push(...result.errors);
      }
    }

    return hasError ? ValidationResult.failure(allErrors) : ValidationResult.success();
  }

  toString(): string {
    if (this.isValidFlag) {
      return 'Validation successful';
    }

    return `Validation failed: ${this.getErrorMessages().join(', ')}`;
  }
}