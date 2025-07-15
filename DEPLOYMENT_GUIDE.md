# Deployment Guide

This project supports multiple deployment scenarios:

## 1. GitHub Pages (Static Deployment)

The repository is configured to automatically deploy to GitHub Pages using static export.

### How it works:
- GitHub Actions builds the project with `STATIC_EXPORT=true`
- API routes are temporarily excluded during build
- Static files are generated in `out/` directory
- Form submissions are stored in localStorage when API isn't available

### Automatic deployment:
- Pushes to `main` branch trigger GitHub Pages deployment
- No additional configuration needed

## 2. Server Deployments (Vercel, Netlify, etc.)

For platforms that support server-side functionality:

### Configuration:
- Set environment variables for webhook functionality
- API routes are included and functional
- Form submissions go through webhook API to create GitHub issues

### Required environment variables:
```bash
GAME_SUBMISSION_TOKEN=your_github_token
# OR
GAME_SUBMISSION_TEST_TOKEN=your_test_token
```

## 3. Hybrid Approach

The project gracefully handles both scenarios:
- **With API routes**: Full webhook functionality
- **Without API routes**: Fallback to localStorage with manual processing option

## Build Commands

### Static export (GitHub Pages):
```bash
STATIC_EXPORT=true npm run build
```

### Server build (with API routes):
```bash
npm run build
```

## Testing

### Test static build:
```bash
STATIC_EXPORT=true npm run build
python3 -m http.server 8080 --directory out
```

### Test server build:
```bash
npm run build
npm start
```

Both approaches ensure the application remains functional regardless of deployment platform.