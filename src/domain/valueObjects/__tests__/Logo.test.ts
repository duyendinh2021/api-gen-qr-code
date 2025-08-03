import { Logo } from '../Logo';

describe('Logo Value Object', () => {
  describe('creation with URL', () => {
    it('should create logo with valid HTTPS URL', () => {
      const logo = Logo.create('https://example.com/logo.png', 50, 5);
      
      expect(logo.getSource()).toBe('https://example.com/logo.png');
      expect(logo.getSize()).toBe(50);
      expect(logo.getMargin()).toBe(5);
      expect(logo.isUrl()).toBe(true);
      expect(logo.isPredefined()).toBe(false);
    });

    it('should create logo with valid HTTP URL', () => {
      const logo = Logo.create('http://example.com/logo.jpg');
      
      expect(logo.isUrl()).toBe(true);
      expect(logo.getSize()).toBe(50); // default
      expect(logo.getMargin()).toBe(5); // default
    });

    it('should reject invalid URL', () => {
      expect(() => Logo.create('not-a-url')).toThrow('Invalid logo source');
    });

    it('should reject localhost URL', () => {
      expect(() => Logo.create('http://localhost/logo.png')).toThrow('Private IP addresses and localhost are not allowed');
    });

    it('should reject private IP URL', () => {
      expect(() => Logo.create('http://192.168.1.1/logo.png')).toThrow('Private IP addresses and localhost are not allowed');
    });

    it('should reject unsupported file extension', () => {
      expect(() => Logo.create('https://example.com/logo.gif')).toThrow('Logo URL must point to a supported image format');
    });
  });

  describe('creation with predefined logo', () => {
    it('should create logo with predefined identifier', () => {
      const logo = Logo.create('google', 60, 10);
      
      expect(logo.getSource()).toBe('google');
      expect(logo.getSize()).toBe(60);
      expect(logo.getMargin()).toBe(10);
      expect(logo.isUrl()).toBe(false);
      expect(logo.isPredefined()).toBe(true);
    });

    it('should support all predefined logo types', () => {
      const predefinedLogos = ['google', 'facebook', 'twitter', 'linkedin', 'github', 'apple'];
      
      predefinedLogos.forEach(logoType => {
        const logo = Logo.create(logoType);
        expect(logo.isPredefined()).toBe(true);
        expect(logo.getPredefinedLogoUrl()).toBeTruthy();
      });
    });

    it('should be case insensitive for predefined logos', () => {
      const logo = Logo.create('GOOGLE');
      expect(logo.isPredefined()).toBe(true);
      expect(logo.getPredefinedLogoUrl()).toBeTruthy();
    });
  });

  describe('size validation', () => {
    it('should accept valid size range', () => {
      const smallLogo = Logo.create('google', 10);
      const largeLogo = Logo.create('google', 200);
      
      expect(smallLogo.getSize()).toBe(10);
      expect(largeLogo.getSize()).toBe(200);
    });

    it('should reject size too small', () => {
      expect(() => Logo.create('google', 5)).toThrow('Logo size must be an integer between 10 and 200 pixels');
    });

    it('should reject size too large', () => {
      expect(() => Logo.create('google', 300)).toThrow('Logo size must be an integer between 10 and 200 pixels');
    });

    it('should reject non-integer size', () => {
      expect(() => Logo.create('google', 50.5)).toThrow('Logo size must be an integer between 10 and 200 pixels');
    });
  });

  describe('margin validation', () => {
    it('should accept valid margin range', () => {
      const noMarginLogo = Logo.create('google', 50, 0);
      const maxMarginLogo = Logo.create('google', 50, 50);
      
      expect(noMarginLogo.getMargin()).toBe(0);
      expect(maxMarginLogo.getMargin()).toBe(50);
    });

    it('should reject negative margin', () => {
      expect(() => Logo.create('google', 50, -1)).toThrow('Logo margin must be an integer between 0 and 50 pixels');
    });

    it('should reject margin too large', () => {
      expect(() => Logo.create('google', 50, 100)).toThrow('Logo margin must be an integer between 0 and 50 pixels');
    });
  });

  describe('effective URL resolution', () => {
    it('should return URL for URL-based logos', () => {
      const logo = Logo.create('https://example.com/logo.png');
      expect(logo.getEffectiveUrl()).toBe('https://example.com/logo.png');
    });

    it('should return predefined URL for predefined logos', () => {
      const logo = Logo.create('google');
      const effectiveUrl = logo.getEffectiveUrl();
      expect(effectiveUrl).toContain('google');
    });
  });

  describe('equality', () => {
    it('should be equal when all properties match', () => {
      const logo1 = Logo.create('google', 50, 5);
      const logo2 = Logo.create('google', 50, 5);
      
      expect(logo1.equals(logo2)).toBe(true);
    });

    it('should not be equal when properties differ', () => {
      const logo1 = Logo.create('google', 50, 5);
      const logo2 = Logo.create('facebook', 50, 5);
      const logo3 = Logo.create('google', 60, 5);
      const logo4 = Logo.create('google', 50, 10);
      
      expect(logo1.equals(logo2)).toBe(false);
      expect(logo1.equals(logo3)).toBe(false);
      expect(logo1.equals(logo4)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should provide readable string representation', () => {
      const logo = Logo.create('google', 50, 5);
      const str = logo.toString();
      
      expect(str).toContain('google');
      expect(str).toContain('50px');
      expect(str).toContain('5px');
    });
  });
});