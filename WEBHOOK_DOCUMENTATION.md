# Game Submission Webhook System

This document explains the webhook system for processing game idea submissions and automatically creating GitHub issues.

## Quick Start Guide

### 🚀 5-Minute Setup

1. **Create GitHub Token**
   - Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Generate new token with `repo` and `workflow` scopes
   - Copy the token (you won't see it again!)

2. **Configure Repository Secret**
   - Go to your repository Settings → Secrets and variables → Actions
   - Add new secret: `GAME_SUBMISSION_TOKEN` = your token

3. **Deploy Application**
   - Set environment variable `GAME_SUBMISSION_TOKEN` on your platform
   - Deploy the Next.js application

4. **Test Setup**
   - Visit `/submit-game` on your deployed app
   - Submit a test game idea
   - Check repository Issues tab for new issue

✅ **Setup Complete!** Game submissions will now automatically create GitHub issues.

### 📋 Requirements Checklist

Before starting, ensure you have:
- [ ] GitHub repository with admin access
- [ ] GitHub personal access token with correct permissions
- [ ] Deployment platform account (Vercel, Netlify, or server)
- [ ] Next.js application environment

## Overview

The system implements a webhook-based workflow for game idea submissions that:

1. **Captures form submissions** from the game submission form
2. **Sends payload as JSON** via GitHub repository dispatch events
3. **Processes webhook data** using GitHub Actions
4. **Creates GitHub issues** automatically with proper labels and assignments
5. **Automates assignment workflow** from @BorDevTech to @copilot after review

## Architecture

### 1. Form Submission
- Users fill out the game submission form at `/submit-game`
- Form data is sent to secure API route at `/api/submit-game`
- API route handles GitHub repository dispatch event server-side
- Falls back to localStorage if GitHub API is not available

### 2. GitHub Actions Workflow
- **Trigger**: Repository dispatch event with type `game-submission`
- **Action**: `.github/workflows/game-submissions.yml`
- **Process**: Creates GitHub issue with submission data

### 3. Review and Assignment Process
- Issues are initially assigned to @BorDevTech with `needs-review` label
- When @BorDevTech adds the `reviewed` label, the workflow automatically:
  - Removes `needs-review` label
  - Adds `approved` label  
  - Assigns @copilot for implementation consideration
  - Posts automated comment explaining next steps

## Setup Instructions

### 1. GitHub Repository Configuration

#### Step 1: Enable GitHub Actions
1. Navigate to your repository on GitHub
2. Go to **Settings** → **Actions** → **General**
3. Ensure **Allow all actions and reusable workflows** is selected
4. Save changes

#### Step 2: Configure Repository Secrets (Option A - Recommended)
1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add one of the following secrets:

**For Production:**
- **Name**: `GAME_SUBMISSION_TOKEN`
- **Value**: Your GitHub personal access token (see token creation below)

**For Testing:**
- **Name**: `GAME_SUBMISSION_TEST_TOKEN` 
- **Value**: Your GitHub personal access token for testing

#### Step 3: Create GitHub Personal Access Token
1. Go to GitHub **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. Click **Generate new token (classic)**
3. Configure the token:
   - **Note**: `Game Submission Webhook Token`
   - **Expiration**: Choose appropriate expiration (90 days recommended)
   - **Scopes**: Select the following permissions:
     - ✅ `repo` (Full control of private repositories)
     - ✅ `workflow` (Update GitHub Action workflows)
4. Click **Generate token**
5. **⚠️ Important**: Copy the token immediately (you won't see it again)

#### Step 4: Verify Repository Access
Ensure the token has access to:
- Create issues in the repository
- Trigger repository dispatch events
- Access repository actions

### 2. Environment Variables Configuration

The system supports multiple environment variable names for flexibility:

#### Priority Order (highest to lowest):
1. `GAME_SUBMISSION_TEST_TOKEN` - For testing environments
2. `TEST_GITHUB_TOKEN` - Alternative test token name
3. `GITHUB_TEST_TOKEN` - Another test token variant
4. `GAME_SUBMISSION_TOKEN` - Production token
5. `GITHUB_WEBHOOK_TOKEN` - Alternative production token
6. `GITHUB_TOKEN` - Fallback (automatically available in GitHub Actions)

#### Platform-Specific Setup:

**Vercel Deployment:**
1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add new environment variable:
   - **Name**: `GAME_SUBMISSION_TOKEN`
   - **Value**: Your GitHub token
   - **Environments**: Production, Preview, Development

**Netlify Deployment:**
1. Go to your Netlify site dashboard
2. Navigate to **Site settings** → **Environment variables**
3. Add new variable:
   - **Key**: `GAME_SUBMISSION_TOKEN`
   - **Value**: Your GitHub token

**Self-Hosted/Local Development:**
```bash
# Create .env.local file in project root
GAME_SUBMISSION_TOKEN=your_github_token_here

# For testing
GAME_SUBMISSION_TEST_TOKEN=your_test_token_here
```

**Docker Deployment:**
```bash
# Using environment variables
docker run -e GAME_SUBMISSION_TOKEN=your_token_here your-app

# Using .env file
docker run --env-file .env your-app
```

**✅ Security Note**: Tokens are kept server-side only and never exposed to client-side code. The secure API route at `/api/submit-game` handles all GitHub API interactions.

### 3. Verification and Testing

#### Step 1: Verify Environment Setup
```bash
# For local development, check if token is loaded
node -e "console.log('Token status:', process.env.GAME_SUBMISSION_TOKEN ? 'Found' : 'Missing')"
```

#### Step 2: Test API Endpoint
```bash
# Test the submission API endpoint
curl -X POST http://localhost:3000/api/submit-game \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Game",
    "description": "Test submission",
    "submitterName": "Test User",
    "genre": "Action",
    "players": "Single Player",
    "difficulty": "Easy",
    "features": "Test features"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Game submission dispatched to GitHub Actions"
}
```

#### Step 3: Verify GitHub Actions Execution
1. Go to your repository's **Actions** tab
2. Look for "Game Submission Workflow" runs
3. Check that the workflow completed successfully
4. Verify a new issue was created in the **Issues** tab

#### Step 4: Test Complete Workflow
1. Navigate to `/submit-game` on your deployed app
2. Fill out the form with test data
3. Submit the form
4. Check the GitHub repository for a new issue
5. Add the `reviewed` label to test auto-assignment

#### Step 5: Test Review Process
1. Find a game submission issue with `needs-review` label
2. Add the `reviewed` label to the issue
3. Verify that @copilot is automatically assigned and the issue is relabeled

### 4. Alternative Webhook Implementation

While the current system uses GitHub repository dispatch events, you can also implement traditional webhooks:

#### Option A: Repository Dispatch (Current - Recommended)
- ✅ Uses GitHub Actions directly
- ✅ Built-in authentication with repository secrets
- ✅ No external webhook endpoints needed
- ✅ Integrated with GitHub's infrastructure

#### Option B: Traditional Webhook Endpoint
Create an additional webhook endpoint for external integrations:

**Add to `app/api/webhook/route.ts`:**
```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature (recommended)
    const signature = request.headers.get('x-hub-signature-256');
    const body = await request.text();
    
    // Verify signature matches expected value
    // Implementation depends on your webhook provider
    
    const payload = JSON.parse(body);
    
    // Process webhook payload
    // Convert to game submission format if needed
    const submission = {
      title: payload.title,
      description: payload.description,
      // ... map other fields
    };
    
    // Forward to existing submission handler
    const response = await fetch(`${process.env.NEXTJS_URL}/api/submit-game`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submission)
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
```

**Webhook URL**: `https://your-domain.com/api/webhook`

#### Option C: GitHub Webhooks (Advanced)
Configure GitHub repository webhooks to trigger on specific events:

1. Go to **Settings** → **Webhooks** → **Add webhook**
2. **Payload URL**: `https://your-domain.com/api/github-webhook`
3. **Content type**: `application/json`
4. **Secret**: Add a secret for verification
5. **Events**: Select specific events to trigger webhook

### 5. Deployment Platform Guides

#### Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on pushes to main branch
4. Verify webhook endpoints are accessible

**Vercel-specific considerations:**
- Functions have a 10-second timeout limit
- Use Vercel's built-in environment variable UI
- Consider using Vercel's Edge Runtime for better performance

#### Netlify Deployment
1. Connect repository to Netlify
2. Add environment variables in site settings
3. Configure build settings:
   ```toml
   # netlify.toml
   [build]
     command = "npm run build"
     publish = ".next"
   
   [[functions]]
     directory = "netlify/functions"
   ```

#### Self-Hosted Deployment
```bash
# Using PM2 for process management
npm install -g pm2
npm run build
pm2 start npm --name "games-app" -- start

# Using Docker
docker build -t games-app .
docker run -p 3000:3000 -e GAME_SUBMISSION_TOKEN=your_token games-app
```

### 6. Advanced Configuration

#### Custom Repository Target
To send submissions to a different repository:

```typescript
// In app/api/submit-game/route.ts
const targetRepo = process.env.TARGET_REPOSITORY || 'BorDevTech/games';
const [owner, repo] = targetRepo.split('/');

const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/dispatches`, {
  // ... rest of the configuration
});
```

#### Multiple Environment Support
```bash
# Development
GAME_SUBMISSION_TOKEN=dev_token_here
TARGET_REPOSITORY=BorDevTech/games-dev

# Staging  
GAME_SUBMISSION_TOKEN=staging_token_here
TARGET_REPOSITORY=BorDevTech/games-staging

# Production
GAME_SUBMISSION_TOKEN=prod_token_here
TARGET_REPOSITORY=BorDevTech/games
```

#### Rate Limiting and Security
```typescript
// Add rate limiting to API routes
import { NextRequest } from 'next/server';

const submissions = new Map();

export async function POST(request: NextRequest) {
  const ip = request.ip || 'unknown';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  
  // Check rate limit (5 submissions per 15 minutes per IP)
  const userSubmissions = submissions.get(ip) || [];
  const recentSubmissions = userSubmissions.filter(time => now - time < windowMs);
  
  if (recentSubmissions.length >= 5) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }
  
  // Record this submission
  submissions.set(ip, [...recentSubmissions, now]);
  
  // ... rest of submission handling
}
```

## Security Considerations

- **Secure token handling**: GitHub tokens are kept server-side only through the `/api/submit-game` API route
- **No client-side exposure**: Sensitive tokens are never exposed to the frontend
- **Graceful fallback**: If GitHub API is unavailable, submissions are stored locally
- **Input validation**: All form data is validated on both client and server side
- **Automated workflow**: Reduces manual intervention and potential errors

## Issue Labels

The system uses these labels for workflow management:

- `game-idea`: Identifies issues created from game submissions
- `needs-review`: Initial state requiring @BorDevTech review
- `reviewed`: Added by @BorDevTech when approved
- `approved`: Automatically added when reviewed, triggers @copilot assignment

## Workflow States

1. **Submitted**: Issue created with `game-idea` and `needs-review` labels, assigned to @BorDevTech
2. **Under Review**: @BorDevTech evaluates the submission
3. **Approved**: @BorDevTech adds `reviewed` label, triggering automatic reassignment to @copilot
4. **In Development**: @copilot evaluates for technical implementation

## Customization

### Modifying the Workflow
Edit `.github/workflows/game-submissions.yml` to:
- Change assignees
- Modify labels
- Update notification messages
- Add additional processing steps

### Updating Form Fields
Edit `app/submit-game/page.tsx` to:
- Add new form fields
- Update validation rules
- Modify submission format

## Troubleshooting

### Common Issues and Solutions

#### 1. Form Submissions Not Creating Issues

**Problem**: Submissions complete but no GitHub issues are created

**Diagnostic Steps:**
```bash
# Check API endpoint response
curl -v -X POST http://localhost:3000/api/submit-game \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","description":"Test","submitterName":"Test"}'
```

**Solutions:**
- **Check GitHub Actions are enabled**: Go to Settings → Actions → General
- **Verify workflow file syntax**: Check `.github/workflows/game-submissions.yml` for YAML errors
- **Check workflow execution logs**: Go to Actions tab → Game Submission Workflow
- **Verify token permissions**: Ensure token has `repo` and `workflow` scopes
- **Check repository name**: Verify `BorDevTech/games` is correct in API route

**Error Messages:**
- `401 Unauthorized`: Token is invalid or expired
- `403 Forbidden`: Token lacks required permissions
- `404 Not Found`: Repository name is incorrect
- `422 Unprocessable Entity`: Workflow file has syntax errors

#### 2. Issues Not Auto-Assigning to @copilot

**Problem**: Issues stay assigned to @BorDevTech even after adding `reviewed` label

**Diagnostic Steps:**
1. Check that issue has both `game-idea` and `reviewed` labels
2. Verify @copilot has repository access
3. Check workflow logs in Actions tab

**Solutions:**
- **Verify label names**: Labels are case-sensitive (`reviewed` not `Reviewed`)
- **Check user permissions**: @copilot must have write access to repository
- **Review workflow conditions**: Check `.github/workflows/game-submissions.yml` line 91
- **Manual assignment**: If workflow fails, assign manually and investigate logs

#### 3. Environment Variables Not Working

**Problem**: API returns "GitHub integration not configured" error

**Diagnostic Steps:**
```bash
# For local development
node -e "console.log(Object.keys(process.env).filter(k => k.includes('TOKEN')))"

# Check token priority order
node -e "
const tokens = [
  'GAME_SUBMISSION_TEST_TOKEN',
  'TEST_GITHUB_TOKEN', 
  'GITHUB_TEST_TOKEN',
  'GAME_SUBMISSION_TOKEN',
  'GITHUB_WEBHOOK_TOKEN',
  'GITHUB_TOKEN'
];
tokens.forEach(token => console.log(\`\${token}: \${process.env[token] ? 'Found' : 'Missing'}\`));
"
```

**Solutions:**
- **Verify environment variable name**: Check spelling and case sensitivity
- **Restart application**: Environment changes require restart
- **Check deployment platform**: Verify variables are set in Vercel/Netlify dashboard
- **Test token manually**: Use GitHub API to verify token works

#### 4. Token Permission Issues

**Problem**: Token exists but API calls fail with 403 errors

**GitHub Token Required Scopes:**
- ✅ `repo` - Full control of private repositories
- ✅ `workflow` - Update GitHub Action workflows
- ❌ `public_repo` alone - Insufficient for private repos

**Verification:**
```bash
# Test token permissions
curl -H "Authorization: token YOUR_TOKEN" \
  https://api.github.com/repos/BorDevTech/games
```

#### 5. Deployment Platform Issues

**Vercel-Specific:**
- **Function timeout**: Webhooks must complete within 10 seconds
- **Environment variables**: Set in Vercel dashboard, not .env files
- **Build errors**: Check build logs for missing dependencies

**Netlify-Specific:**
- **Function size limits**: Large dependencies may cause issues
- **Environment context**: Ensure variables are set for correct environment
- **Build settings**: Verify build command and publish directory

**Self-Hosted:**
- **Port availability**: Ensure port 3000 is accessible
- **Process management**: Use PM2 or similar for production
- **SSL certificates**: HTTPS required for webhook security

#### 6. Rate Limiting Issues

**Problem**: Submissions failing with 429 errors

**Solutions:**
- **Implement backoff**: Add retry logic with exponential backoff
- **Increase limits**: Adjust rate limiting if legitimate traffic
- **Use authentication**: Consider API keys for higher limits

#### 7. Webhook Signature Verification

**For external webhooks**, implement signature verification:

```typescript
import crypto from 'crypto';

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
    
  return crypto.timingSafeEqual(
    Buffer.from(`sha256=${expectedSignature}`, 'utf8'),
    Buffer.from(signature, 'utf8')
  );
}
```

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG=true
NODE_ENV=development
```

This will provide additional console output for troubleshooting.

### Getting Help

1. **Check workflow logs**: Actions tab provides detailed execution logs
2. **Review API responses**: Use browser developer tools or curl
3. **Test incrementally**: Start with simple test submissions
4. **Verify permissions**: Ensure all users and tokens have correct access
5. **Check GitHub status**: Visit https://status.github.com for service issues

### Emergency Fallback

If webhooks are completely non-functional, submissions can be handled manually:

1. Check browser localStorage for failed submissions
2. Manually create GitHub issues from stored data
3. Use the GitHub web interface as a temporary solution
4. Debug and fix webhook issues offline