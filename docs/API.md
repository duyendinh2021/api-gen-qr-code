# QR Code Generator API Documentation

## Overview

A robust RESTful API for generating QR codes with various customization options. Built with Clean Architecture principles, featuring comprehensive validation, caching, and monitoring capabilities.

## Base URL

```
https://your-api-domain.com
```

## Authentication

Currently, this API does not require authentication. Rate limiting is applied based on IP address.

## Rate Limiting

- **Limit**: 100 requests per minute per IP address
- **Headers**: Rate limit information is included in response headers:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Remaining requests in current window
  - `X-RateLimit-Reset`: Unix timestamp when the limit resets

## API Endpoints

### 1. Generate QR Code (User-Friendly)

#### POST /create-qr-code

Generate a QR code with the provided data and optional customization parameters.

**Request Body:**
```json
{
  "data": "string (required)",
  "size": "string (optional)",
  "format": "string (optional)",
  "color": "string (optional)",
  "bgcolor": "string (optional)",
  "ecc": "string (optional)",
  "margin": "number (optional)",
  "qzone": "number (optional)"
}
```

**Example Request:**
```bash
curl -X POST https://your-api-domain.com/create-qr-code \
  -H "Content-Type: application/json" \
  -d '{
    "data": "https://example.com",
    "size": "200x200",
    "format": "png",
    "color": "#000000",
    "bgcolor": "#FFFFFF"
  }'
```

#### GET /create-qr-code

Generate a QR code using query parameters.

**Query Parameters:**
- `data` (required): The data to encode in the QR code
- `size` (optional): Size in format "WIDTHxHEIGHT" (e.g., "200x200")
- `format` (optional): Output format (png, jpeg, gif, svg, eps)
- `color` (optional): Foreground color (hex format like #000000 or RGB format like 255-0-0)
- `bgcolor` (optional): Background color (hex format like #FFFFFF or RGB format like 255-255-255)
- `ecc` (optional): Error correction level (L, M, Q, H)
- `margin` (optional): Margin in pixels (0-50)
- `qzone` (optional): Quiet zone in modules (0-100)

**Example Request:**
```bash
curl "https://your-api-domain.com/create-qr-code?data=Hello%20World&size=150x150&format=png"
```

### 2. Generate QR Code (API v1)

#### POST /v1/create-qr-code
#### GET /v1/create-qr-code

Same functionality as the user-friendly endpoints above, but with versioned API path.

## Parameter Details

### Data Parameter
- **Type**: String
- **Required**: Yes
- **Max Length**: 900 characters
- **Description**: The content to encode in the QR code. Can be text, URLs, contact information, etc.
- **Examples**:
  - Plain text: "Hello World"
  - URL: "https://example.com"
  - Email: "mailto:user@example.com"
  - Phone: "tel:+1234567890"

### Size Parameter
- **Type**: String
- **Format**: "WIDTHxHEIGHT"
- **Default**: "200x200"
- **Valid Range**: 50x50 to 2000x2000
- **Examples**: "100x100", "300x300", "500x500"

### Format Parameter
- **Type**: String
- **Default**: "png"
- **Valid Values**: png, jpeg, jpg, gif, svg, eps
- **Description**: Output image format

### Color Parameters
- **Type**: String
- **Formats**:
  - Hex: "#000000" (with #)
  - RGB: "255-0-0" (dash-separated)
- **color**: Foreground color (QR code modules)
- **bgcolor**: Background color
- **Accessibility**: Colors must meet WCAG AA contrast ratio (≥4.5:1)

### Error Correction Level (ecc)
- **Type**: String
- **Default**: "L"
- **Valid Values**:
  - "L": Low (~7% error correction)
  - "M": Medium (~15% error correction)
  - "Q": Quartile (~25% error correction)
  - "H": High (~30% error correction)

### Margin & Quiet Zone
- **margin**: Border padding in pixels (0-50)
- **qzone**: Quiet zone around QR code in modules (0-100)

## Response Format

### Success Response (200 OK)

The API returns the generated QR code as binary image data with appropriate headers:

**Headers:**
```
Content-Type: image/png (or requested format)
X-QR-Code-ID: unique-identifier
X-Cache-Status: HIT | MISS
X-Processing-Time-Ms: processing-time
```

**Body:** Binary image data

### Error Responses

#### 400 Bad Request
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": [
      {
        "field": "data",
        "message": "Data field is required",
        "type": "REQUIRED_FIELD"
      }
    ]
  },
  "meta": {
    "timestamp": "2025-08-03T12:00:00.000Z",
    "requestId": "req_1234567890_abcdef12",
    "processingTimeMs": 5
  }
}
```

#### 413 Request Too Large
```json
{
  "success": false,
  "error": {
    "code": "REQUEST_TOO_LARGE",
    "message": "Request size exceeds maximum allowed size",
    "details": {
      "maxSize": 1048576,
      "actualSize": 2097152
    }
  },
  "meta": {
    "timestamp": "2025-08-03T12:00:00.000Z",
    "requestId": "req_1234567890_abcdef12"
  }
}
```

#### 429 Too Many Requests
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Limit: 100 requests per 60 seconds",
    "details": {
      "limit": 100,
      "windowMs": 60000,
      "resetIn": 45
    }
  },
  "meta": {
    "timestamp": "2025-08-03T12:00:00.000Z",
    "requestId": "req_1234567890_abcdef12"
  }
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred"
  },
  "meta": {
    "timestamp": "2025-08-03T12:00:00.000Z",
    "requestId": "req_1234567890_abcdef12"
  }
}
```

## Error Codes Reference

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Input parameters failed validation |
| `INVALID_REQUEST_STRUCTURE` | 400 | Request format is invalid |
| `INVALID_CONTENT_TYPE` | 400 | Wrong Content-Type header |
| `REQUEST_TOO_LARGE` | 413 | Request size exceeds limit |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests from client |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |

## Health Check Endpoints

### GET /health
Basic health check endpoint.

### GET /health/live
Liveness probe for container orchestration.

### GET /health/ready
Readiness probe for container orchestration.

### GET /health/detailed
Detailed health information including service dependencies.

### GET /metrics
Prometheus-compatible metrics endpoint.

## Examples

### Basic QR Code Generation
```bash
# POST request
curl -X POST https://your-api-domain.com/create-qr-code \
  -H "Content-Type: application/json" \
  -d '{"data": "Hello World"}'

# GET request
curl "https://your-api-domain.com/create-qr-code?data=Hello%20World"
```

### Custom Styled QR Code
```bash
curl -X POST https://your-api-domain.com/create-qr-code \
  -H "Content-Type: application/json" \
  -d '{
    "data": "https://example.com",
    "size": "300x300",
    "format": "png",
    "color": "#2563eb",
    "bgcolor": "#ffffff",
    "ecc": "H",
    "margin": 10
  }'
```

### Business Card QR Code
```bash
curl -X POST https://your-api-domain.com/create-qr-code \
  -H "Content-Type: application/json" \
  -d '{
    "data": "BEGIN:VCARD\nVERSION:3.0\nFN:John Doe\nORG:Example Corp\nTEL:+1234567890\nEMAIL:john@example.com\nEND:VCARD",
    "size": "200x200",
    "ecc": "H"
  }'
```

## Best Practices

1. **Use appropriate error correction levels**:
   - URLs: L (Low)
   - Text messages: M (Medium)
   - Business cards: H (High)

2. **Optimize for scanning**:
   - Ensure sufficient contrast between colors
   - Use appropriate sizes (minimum 100x100 for mobile scanning)
   - Include adequate quiet zone

3. **Handle errors gracefully**:
   - Always check response status codes
   - Implement retry logic with exponential backoff
   - Log request IDs for debugging

4. **Performance considerations**:
   - Results are cached automatically
   - Use GET requests for simple QR codes
   - Consider image format based on use case (PNG for quality, JPEG for size)

5. **Security**:
   - Validate and sanitize all input data
   - Be aware of rate limiting
   - Don't include sensitive information in QR codes

## Troubleshooting

### Common Issues

1. **"Data field is required" error**:
   - Ensure the `data` parameter is included and non-empty

2. **"Color combination may not meet WCAG AA accessibility standards"**:
   - Choose colors with better contrast ratio (≥4.5:1)
   - Use online contrast checkers to validate color combinations

3. **"Request size exceeds maximum allowed size"**:
   - Reduce the amount of data being encoded
   - Data parameter is limited to 900 characters

4. **Rate limiting errors**:
   - Implement exponential backoff retry logic
   - Contact support for higher limits if needed

### Getting Help

- Include the `X-Request-ID` from response headers when reporting issues
- Check the detailed error messages in the response body
- Use the `/health/detailed` endpoint to verify service status

## Changelog

### v1.0.0
- Initial API release
- Added user-friendly `/create-qr-code` endpoints
- Implemented comprehensive validation and error handling
- Added rate limiting and caching
- Enhanced logging and monitoring capabilities