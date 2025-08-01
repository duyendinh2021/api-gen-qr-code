# QR Code Generator API

A RESTful QR Code Generator API built with Clean Architecture principles, featuring high performance, comprehensive caching, and enterprise-grade functionality.

## Features

- ✅ **Clean Architecture Implementation** - Domain-driven design with clear separation of concerns
- ✅ **Multiple Output Formats** - PNG, JPEG, JPG, SVG support
- ✅ **Comprehensive Customization** - Size, colors, error correction, margins
- ✅ **Multi-level Caching** - In-memory caching with performance optimization
- ✅ **Input Validation** - Comprehensive parameter validation with detailed error messages
- ✅ **Health Monitoring** - Health checks and metrics collection
- ✅ **High Performance** - Sub-500ms response times with efficient caching
- ✅ **Security Features** - Helmet security headers, CORS support
- ✅ **Accessibility** - WCAG AA color contrast validation

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/duyendinh2021/api-gen-qr-code.git
cd api-gen-qr-code

# Install dependencies
npm install

# Build the project
npm run build

# Start the server
npm start

# Or run in development mode
npm run dev
```

### Docker Setup

```bash
# Build Docker image
docker build -t qr-code-api .

# Run container
docker run -p 3000:3000 qr-code-api
```

## API Usage

### Generate QR Code (GET)

```bash
curl "http://localhost:3000/v1/create-qr-code?data=Hello%20World&size=200x200&format=png" \
     -o qrcode.png
```

### Generate QR Code (POST)

```bash
curl -X POST http://localhost:3000/v1/create-qr-code \
     -H "Content-Type: application/json" \
     -d '{
       "data": "https://example.com",
       "size": "300x300",
       "format": "png",
       "color": "#000000",
       "bgcolor": "#FFFFFF",
       "ecc": "M"
     }' \
     -o qrcode.png
```

### Parameters

#### Required
- `data` (string): Content to encode (1-900 characters)

#### Optional
- `size` (string): Dimensions in format `WxH` (10x10 to 1000x1000, default: 200x200)
- `format` (string): Output format (`png`, `jpeg`, `jpg`, `svg`, default: `png`)
- `ecc` (string): Error correction level (`L`, `M`, `Q`, `H`, default: `L`)
- `color` (string): Foreground color (hex `#RRGGBB` or RGB `r-g-b`, default: `#000000`)
- `bgcolor` (string): Background color (hex `#RRGGBB` or RGB `r-g-b`, default: `#FFFFFF`)
- `margin` (number): Margin thickness (0-50 pixels, default: 1)
- `qzone` (number): Quiet zone thickness (0-100 modules, default: 0)
- `charset-source` (string): Input charset (`UTF-8`, `ISO-8859-1`, default: `UTF-8`)
- `charset-target` (string): Output charset (`UTF-8`, `ISO-8859-1`, default: `UTF-8`)

### Health Check

```bash
curl http://localhost:3000/health
```

### Metrics

```bash
curl http://localhost:3000/metrics
```

## Performance

- **Response Time**: < 500ms for most requests
- **Cache Hit Rate**: ~80% for repeated requests
- **Throughput**: 10,000+ requests/day capability
- **Memory Usage**: Optimized with configurable cache limits

## Architecture

```
┌─────────────────────────────────────┐
│         Infrastructure Layer        │
│  (Controllers, Repositories, APIs)  │
├─────────────────────────────────────┤
│          Application Layer          │
│     (Use Cases, DTOs, Ports)        │
├─────────────────────────────────────┤
│            Domain Layer             │
│  (Entities, Value Objects, Rules)   │
└─────────────────────────────────────┘
```

### Project Structure

```
src/
├── domain/                 # Business logic and entities
│   ├── entities/           # Core business entities
│   └── valueObjects/       # Value objects with validation
├── application/            # Application business rules
│   ├── usecases/          # Use case implementations  
│   ├── ports/             # Interface definitions
│   └── dto/               # Data transfer objects
├── infrastructure/        # External concerns
│   ├── adapters/          
│   │   ├── controllers/   # HTTP request handlers
│   │   ├── repositories/  # Data persistence
│   │   ├── external/      # External service adapters
│   │   └── presenters/    # Response formatting
│   └── config/            # Configuration management
└── shared/                # Shared utilities
    ├── errors/            # Error handling
    ├── types/             # Type definitions
    └── utils/             # Utility functions
```

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test
npm test -- Size.test.ts

# Run in watch mode
npm run test:watch
```

## Development

### Scripts

- `npm run build` - Build the TypeScript project
- `npm start` - Start the production server
- `npm run dev` - Start development server with hot reload
- `npm test` - Run test suite
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## License

MIT License

## Implementation Status

✅ **Phase 1: Foundation (Complete)**
- [x] Project setup and Clean Architecture structure
- [x] Core domain entities and value objects
- [x] Basic use cases implementation
- [x] QR generation with PNG support
- [x] HTTP API endpoints (GET/POST /v1/create-qr-code)
- [x] Unit tests for domain layer
- [x] In-memory caching system
- [x] Health check endpoints (/health)
- [x] Basic metrics collection (/metrics)
- [x] Input validation and error handling
- [x] Multiple format support (PNG, JPEG, SVG)
- [x] Comprehensive parameter support
- [x] Performance optimization and caching
- [x] Security middleware (Helmet, CORS)
- [x] Request logging and monitoring
