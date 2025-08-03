import request from 'supertest';
import QRCodeGeneratorApp from '../src/app';

describe('QR Code Generator API Integration Tests', () => {
  let app: QRCodeGeneratorApp;
  let server: any;

  beforeAll(() => {
    app = new QRCodeGeneratorApp();
    server = app.getApp();
  });

  afterAll(async () => {
    await app.shutdown();
  });

  describe('Health Endpoints', () => {
    it('GET /health should return health status', async () => {
      const response = await request(server)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: expect.any(String),
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        version: expect.any(String),
        services: expect.any(Object)
      });
    });

    it('GET /health/live should return liveness check', async () => {
      const response = await request(server)
        .get('/health/live')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'alive',
        timestamp: expect.any(String),
        uptime: expect.any(Number)
      });
    });

    it('GET /metrics should return metrics', async () => {
      const response = await request(server)
        .get('/metrics')
        .expect(200);

      expect(response.body).toMatchObject({
        timestamp: expect.any(String),
        metrics: expect.any(Object)
      });
    });
  });

  describe('QR Code Generation', () => {
    it('POST /v1/create-qr-code should generate QR code with valid data', async () => {
      const response = await request(server)
        .post('/v1/create-qr-code')
        .send({ data: 'Hello World' })
        .expect(200);

      expect(response.headers['content-type']).toContain('image/png');
      expect(response.headers['x-qr-code-id']).toBeDefined();
      expect(response.headers['x-cache-status']).toBeDefined();
      expect(response.body).toBeInstanceOf(Buffer);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('GET /v1/create-qr-code should generate QR code with query params', async () => {
      const response = await request(server)
        .get('/v1/create-qr-code')
        .query({ 
          data: 'https://example.com',
          size: '100x100',
          format: 'png'
        })
        .expect(200);

      expect(response.headers['content-type']).toContain('image/png');
      expect(response.body).toBeInstanceOf(Buffer);
    });

    it('should return 400 for missing data parameter', async () => {
      const response = await request(server)
        .post('/v1/create-qr-code')
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_PARAMETER',
          message: expect.stringContaining('data')
        }
      });
    });

    it('should return 400 for invalid parameters', async () => {
      const response = await request(server)
        .post('/v1/create-qr-code')
        .send({
          data: 'test',
          size: 'invalid-size',
          format: 'unsupported-format'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.any(Object)
      });
    });

    it('should handle different formats', async () => {
      // Test PNG format
      const pngResponse = await request(server)
        .post('/v1/create-qr-code')
        .send({ data: 'test', format: 'png' })
        .expect(200);

      expect(pngResponse.headers['content-type']).toContain('image/png');

      // Test JPEG format
      const jpegResponse = await request(server)
        .post('/v1/create-qr-code')
        .send({ data: 'test', format: 'jpeg' })
        .expect(200);

      expect(jpegResponse.headers['content-type']).toContain('image/jpeg');
    });

    it('should handle custom colors', async () => {
      const response = await request(server)
        .post('/v1/create-qr-code')
        .send({ 
          data: 'colored test',
          color: '#FF0000',
          bgcolor: '#FFFFFF'
        })
        .expect(200);

      expect(response.headers['content-type']).toContain('image/png');
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should handle colors without # prefix (problem statement fix)', async () => {
      // Test the exact case from the problem statement
      const response = await request(server)
        .get('/v1/create-qr-code')
        .query({
          data: 'https://www.goqr.me',
          size: '300x300',
          color: '0066ff',
          bgcolor: 'eeeeee'
        })
        .expect(200);

      expect(response.headers['content-type']).toContain('image/png');
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should handle custom size', async () => {
      const response = await request(server)
        .post('/v1/create-qr-code')
        .send({ 
          data: 'size test',
          size: '300x300'
        })
        .expect(200);

      expect(response.headers['content-type']).toContain('image/png');
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should cache QR codes (second request should be faster)', async () => {
      const testData = { data: 'cache-test-unique-' + Date.now() };

      // First request
      const start1 = Date.now();
      const response1 = await request(server)
        .post('/v1/create-qr-code')
        .send(testData)
        .expect(200);
      const time1 = Date.now() - start1;

      expect(response1.headers['x-cache-status']).toBe('MISS');

      // Second request (should be cached)
      const start2 = Date.now();
      const response2 = await request(server)
        .post('/v1/create-qr-code')
        .send(testData)
        .expect(200);
      const time2 = Date.now() - start2;

      expect(response2.headers['x-cache-status']).toBe('HIT');
      expect(time2).toBeLessThan(time1); // Cached request should be faster
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(server)
        .get('/non-existent-route')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'NOT_FOUND'
        }
      });
    });

    it('should handle large data payloads gracefully', async () => {
      const largeData = 'x'.repeat(1000); // Exceeds 900 character limit

      const response = await request(server)
        .post('/v1/create-qr-code')
        .send({ data: largeData })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Root Endpoint', () => {
    it('GET / should return API information', async () => {
      const response = await request(server)
        .get('/')
        .expect(200);

      expect(response.body).toMatchObject({
        name: expect.any(String),
        version: expect.any(String),
        description: expect.any(String),
        endpoints: expect.any(Object)
      });
    });
  });
});