# Troubleshooting Guide

## Common Issues and Solutions

### 1. API Request Issues

#### Issue: "Data field is required" Error
**Error Code**: `INVALID_REQUEST_STRUCTURE`

**Symptoms**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST_STRUCTURE",
    "message": "Request structure validation failed",
    "details": ["Missing required parameter: data"]
  }
}
```

**Solutions**:
1. Ensure the `data` parameter is included in your request
2. For POST requests, include it in the JSON body
3. For GET requests, include it as a query parameter
4. Make sure the data is not empty or just whitespace

**Examples**:
```bash
# Correct POST request
curl -X POST https://api.example.com/create-qr-code \
  -H "Content-Type: application/json" \
  -d '{"data": "Hello World"}'

# Correct GET request
curl "https://api.example.com/create-qr-code?data=Hello%20World"
```

#### Issue: Content Type Error
**Error Code**: `INVALID_CONTENT_TYPE`

**Symptoms**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CONTENT_TYPE",
    "message": "Content-Type must be application/json for POST requests"
  }
}
```

**Solutions**:
1. Always include `Content-Type: application/json` header for POST requests
2. Ensure your request body is valid JSON

**Example**:
```bash
curl -X POST https://api.example.com/create-qr-code \
  -H "Content-Type: application/json" \
  -d '{"data": "test"}'
```

### 2. Validation Errors

#### Issue: Color Contrast Validation
**Error Code**: `VALIDATION_ERROR`

**Symptoms**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": [{
      "field": "color_contrast",
      "message": "Color combination may not meet WCAG AA accessibility standards (contrast ratio < 4.5:1)",
      "type": "CONSTRAINT_VIOLATION",
      "value": {
        "color": "#FF0000",
        "bgcolor": "#FFFFFF",
        "ratio": 3.998
      }
    }]
  }
}
```

**Solutions**:
1. Use colors with better contrast ratio (≥4.5:1)
2. Test color combinations with online contrast checkers
3. Use high-contrast combinations like black (#000000) on white (#FFFFFF)

**Recommended Color Combinations**:
- Black on White: `color: "#000000"`, `bgcolor: "#FFFFFF"`
- Dark Blue on White: `color: "#1e3a8a"`, `bgcolor: "#FFFFFF"`
- White on Dark Blue: `color: "#FFFFFF"`, `bgcolor: "#1e3a8a"`

#### Issue: Invalid Color Format
**Error Code**: `VALIDATION_ERROR`

**Symptoms**:
```json
{
  "error": {
    "details": [{
      "field": "color",
      "message": "Invalid color format: red. Use hex (#RRGGBB) or RGB (r-g-b) format"
    }]
  }
}
```

**Solutions**:
1. Use hex format: `#FF0000` (with # symbol)
2. Use RGB format: `255-0-0` (dash-separated)
3. Don't use color names like "red", "blue", etc.

**Valid Examples**:
```json
{
  "color": "#FF0000",     // Hex format
  "bgcolor": "255-255-255" // RGB format
}
```

#### Issue: Invalid Size Format
**Error Code**: `VALIDATION_ERROR`

**Symptoms**:
```json
{
  "error": {
    "details": [{
      "field": "size",
      "message": "Invalid size format: 200. Expected format: WIDTHxHEIGHT"
    }]
  }
}
```

**Solutions**:
1. Use format "WIDTHxHEIGHT" with lowercase 'x'
2. Both width and height must be numbers
3. Size range: 50x50 to 2000x2000

**Valid Examples**:
- `"size": "200x200"`
- `"size": "150x300"`
- `"size": "1000x1000"`

### 3. Rate Limiting Issues

#### Issue: Too Many Requests
**Error Code**: `RATE_LIMIT_EXCEEDED`

**Symptoms**:
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
  }
}
```

**Solutions**:
1. Implement exponential backoff retry logic
2. Check rate limit headers in responses:
   - `X-RateLimit-Limit`: Maximum requests allowed
   - `X-RateLimit-Remaining`: Remaining requests
   - `X-RateLimit-Reset`: When limit resets
3. Cache QR codes on your end to reduce API calls
4. Contact support for higher limits if needed

**Example Retry Logic (JavaScript)**:
```javascript
async function generateQRWithRetry(data, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('/create-qr-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data })
      });
      
      if (response.ok) return response;
      
      if (response.status === 429) {
        const resetHeader = response.headers.get('X-RateLimit-Reset');
        const waitTime = resetHeader ? 
          (parseInt(resetHeader) * 1000 - Date.now()) : 
          Math.pow(2, attempt) * 1000;
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await new Promise(resolve => 
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    }
  }
}
```

### 4. Data Issues

#### Issue: Data Too Long
**Error Code**: `VALIDATION_ERROR`

**Symptoms**:
```json
{
  "error": {
    "details": [{
      "field": "data",
      "message": "Data content cannot exceed 900 characters"
    }]
  }
}
```

**Solutions**:
1. Reduce the amount of data being encoded
2. For URLs, use URL shorteners
3. For complex data, consider splitting into multiple QR codes
4. Use higher error correction levels (Q or H) for better reliability with large data

#### Issue: Invalid URL Format
**Error Code**: `VALIDATION_ERROR`

**Symptoms**:
```json
{
  "error": {
    "details": [{
      "field": "data",
      "message": "Invalid URL format in data content"
    }]
  }
}
```

**Solutions**:
1. Ensure URLs start with `http://` or `https://`
2. Check for proper URL encoding of special characters
3. Validate URL structure before sending to API

**Valid URL Examples**:
- `https://example.com`
- `https://example.com/path?param=value`
- `http://localhost:3000`

### 5. Server Errors

#### Issue: Internal Server Error
**Error Code**: `INTERNAL_SERVER_ERROR`

**Symptoms**:
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred"
  },
  "meta": {
    "requestId": "req_1234567890_abcdef12"
  }
}
```

**Solutions**:
1. Retry the request after a short delay
2. Check API service status at `/health` endpoint
3. Contact support with the `requestId` from the error response
4. Verify your request format matches the API documentation

### 6. Debugging Tips

#### Enable Request Logging
1. Include request ID in all support requests
2. Monitor response headers for debugging information:
   - `X-Request-ID`: Unique request identifier
   - `X-Processing-Time-Ms`: Request processing time
   - `X-Cache-Status`: Whether result was cached

#### Check Service Health
```bash
# Basic health check
curl https://api.example.com/health

# Detailed health information
curl https://api.example.com/health/detailed

# Service metrics
curl https://api.example.com/metrics
```

#### Validate Input Before Sending
```javascript
function validateQRRequest(data) {
  const errors = [];
  
  // Check required data
  if (!data.data || data.data.trim().length === 0) {
    errors.push('Data field is required');
  }
  
  // Check data length
  if (data.data && data.data.length > 900) {
    errors.push('Data exceeds 900 character limit');
  }
  
  // Check size format
  if (data.size && !/^\d+x\d+$/.test(data.size)) {
    errors.push('Size must be in format WIDTHxHEIGHT');
  }
  
  // Check color format
  if (data.color && !/^#[0-9A-Fa-f]{6}$|^\d+-\d+-\d+$/.test(data.color)) {
    errors.push('Color must be hex (#RRGGBB) or RGB (r-g-b) format');
  }
  
  return errors;
}
```

### 7. Performance Optimization

#### Caching Strategy
1. API automatically caches identical requests
2. Implement client-side caching for frequently used QR codes
3. Use appropriate cache headers in your application

#### Request Optimization
1. Use GET requests for simple QR codes (better caching)
2. Batch similar requests when possible
3. Choose appropriate image formats:
   - PNG: Best quality, larger file size
   - JPEG: Smaller file size, slight quality loss
   - SVG: Vector format, scalable

### 8. Integration Examples

#### JavaScript/Node.js
```javascript
const axios = require('axios');

async function generateQRCode(data, options = {}) {
  try {
    const response = await axios.post('/create-qr-code', {
      data,
      ...options
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      responseType: 'arraybuffer'
    });
    
    return {
      success: true,
      image: Buffer.from(response.data),
      headers: response.headers
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}
```

#### Python
```python
import requests
import json

def generate_qr_code(data, **options):
    try:
        response = requests.post(
            'https://api.example.com/create-qr-code',
            json={'data': data, **options},
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 200:
            return {
                'success': True,
                'image': response.content,
                'headers': dict(response.headers)
            }
        else:
            return {
                'success': False,
                'error': response.json()
            }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }
```

### 9. Getting Help

When contacting support, please include:

1. **Request ID**: Found in `X-Request-ID` header or error response
2. **Timestamp**: When the issue occurred
3. **Request details**: Method, URL, headers, and body
4. **Response details**: Status code, headers, and body
5. **Expected behavior**: What you expected to happen
6. **Steps to reproduce**: How to recreate the issue

**Support Channels**:
- API Documentation: `/docs/API.md`
- Health Status: `GET /health/detailed`
- Metrics: `GET /metrics`

### 10. Monitoring and Alerting

Set up monitoring for:
- Response time degradation
- Error rate increases
- Rate limit threshold approaching
- Service availability

**Key Metrics to Monitor**:
- Request success rate (should be >99%)
- Average response time (should be <500ms)
- Cache hit rate (should be >80% for repeated requests)
- Error distribution by type