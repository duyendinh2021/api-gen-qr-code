import request from 'supertest';
import QRCodeGeneratorApp from '../src/app';

describe('Logo Integration Tests', () => {
  let app: QRCodeGeneratorApp;
  let server: any;

  beforeAll(() => {
    app = new QRCodeGeneratorApp();
    server = app.getApp();
  });

  afterAll(async () => {
    await app.shutdown();
  });

  describe('Logo parameter validation', () => {
    it('should accept request with predefined logo', async () => {
      const response = await request(server)
        .get('/v1/create-qr-code')
        .query({
          data: 'https://www.google.com',
          size: '300x300',
          logo: 'google',
          logo_size: '50'
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('image/png');
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should accept request with logo and custom margin', async () => {
      const response = await request(server)
        .post('/v1/create-qr-code')
        .send({
          data: 'https://www.example.com',
          size: '250x250',
          logo: 'facebook',
          logo_size: '40',
          logo_margin: '8'
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('image/png');
    });

    it('should reject logo with invalid size', async () => {
      const response = await request(server)
        .get('/v1/create-qr-code')
        .query({
          data: 'test data',
          logo: 'google',
          logo_size: '300' // Too large
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject logo with size too large for QR code', async () => {
      const response = await request(server)
        .get('/v1/create-qr-code')
        .query({
          data: 'test data',
          size: '100x100',
          logo: 'google',
          logo_size: '50' // More than 30% of 100px
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject invalid predefined logo', async () => {
      const response = await request(server)
        .get('/v1/create-qr-code')
        .query({
          data: 'test data',
          logo: 'invalid-logo'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should work without logo parameters (backward compatibility)', async () => {
      const response = await request(server)
        .get('/v1/create-qr-code')
        .query({
          data: 'test without logo',
          size: '200x200'
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('image/png');
    });
  });

  describe('Logo with different QR formats', () => {
    it('should work with PNG format', async () => {
      const response = await request(server)
        .get('/v1/create-qr-code')
        .query({
          data: 'PNG test',
          format: 'png',
          logo: 'github',
          logo_size: '30'
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('image/png');
    });

    it('should work with JPEG format', async () => {
      const response = await request(server)
        .get('/v1/create-qr-code')
        .query({
          data: 'JPEG test',
          format: 'jpeg',
          logo: 'apple',
          logo_size: '35'
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('image/jpeg');
    });

    it('should warn about SVG with logo but still generate', async () => {
      const response = await request(server)
        .get('/v1/create-qr-code')
        .query({
          data: 'SVG test',
          format: 'svg',
          logo: 'linkedin'
        });

      // SVG should still work but without logo overlay
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('image/svg');
    });
  });

  describe('Logo caching behavior', () => {
    it('should generate same result for identical logo requests', async () => {
      const requestData = {
        data: 'cache test logo',
        logo: 'twitter',
        logo_size: '45'
      };

      const response1 = await request(server)
        .post('/v1/create-qr-code')
        .send(requestData);

      const response2 = await request(server)
        .post('/v1/create-qr-code')
        .send(requestData);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response1.body.length).toBe(response2.body.length);
      
      // Second request might be from cache
      if (response2.headers['x-cache-status']) {
        expect(response2.headers['x-cache-status']).toBe('HIT');
      }
    });
  });

  describe('Logo edge cases', () => {
    it('should handle minimum logo size', async () => {
      const response = await request(server)
        .get('/v1/create-qr-code')
        .query({
          data: 'min size test',
          size: '200x200',
          logo: 'google',
          logo_size: '10'
        });

      expect(response.status).toBe(200);
    });

    it('should handle maximum logo size within limits', async () => {
      const response = await request(server)
        .get('/v1/create-qr-code')
        .query({
          data: 'max size test',
          size: '400x400', // 30% would be 120px max
          logo: 'facebook',
          logo_size: '100' // Within 30% limit
        });

      expect(response.status).toBe(200);
    });

    it('should handle zero margin', async () => {
      const response = await request(server)
        .get('/v1/create-qr-code')
        .query({
          data: 'zero margin test',
          logo: 'github',
          logo_size: '40',
          logo_margin: '0'
        });

      expect(response.status).toBe(200);
    });
  });
});