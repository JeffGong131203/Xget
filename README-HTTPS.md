# Xget HTTPS Configuration

This document explains how to configure and deploy Xget with HTTPS support.

## SSL Certificate Files

The following SSL certificate files are required for HTTPS functionality:
- `domain.crt` - SSL certificate file
- `domain.key` - SSL private key file

These files should be placed in the project root directory.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SSL_ENABLED` | `false` | Enable HTTPS support |
| `PORT` | `3000` | HTTP port (also used for redirects when SSL is enabled) |
| `HTTPS_PORT` | `3443` | HTTPS port |

## Running with HTTPS

### Local Development

1. Generate or obtain SSL certificates
2. Place `domain.crt` and `domain.key` in the project root
3. Set environment variables:
   ```bash
   export SSL_ENABLED=true
   export HTTPS_PORT=3443
   node server.js
   ```

### Docker Deployment

#### Using Docker Compose (Recommended)

```bash
# Build and start the service
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the service
docker-compose down
```

#### Using Docker directly

```bash
# Build the image
docker build -t xget .

# Run with HTTPS enabled
docker run -d \
  -p 3000:3000 \
  -p 3443:3443 \
  -e SSL_ENABLED=true \
  -e HTTPS_PORT=3443 \
  -v $(pwd)/domain.crt:/app/domain.crt:ro \
  -v $(pwd)/domain.key:/app/domain.key:ro \
  --name xget \
  xget
```

## SSL Redirect

When `SSL_ENABLED=true`, the server will:
- Run both HTTP and HTTPS servers
- Automatically redirect HTTP requests to HTTPS
- Serve HTTPS traffic on the configured HTTPS port

## Health Check

The application includes health checks for both HTTP and HTTPS:
- HTTPS: `https://localhost:3443/api/health`
- HTTP: `http://localhost:3000/api/health` (redirects to HTTPS if SSL is enabled)

## Troubleshooting

### Certificate Issues
- Ensure certificate files have correct permissions
- Verify certificate validity with: `openssl x509 -in domain.crt -text -noout`
- Check private key format: `openssl rsa -in domain.key -check`

### Port Issues
- Ensure ports 3000 and 3443 are available
- For production, consider using standard ports (80/443) with a reverse proxy

### Docker Issues
- Verify certificate files are properly mounted
- Check container logs: `docker logs <container-name>`
- Ensure environment variables are set correctly