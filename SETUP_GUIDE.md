# Complete Setup Guide: GitHub Webhooks & Repository Secrets

This guide provides step-by-step instructions for implementing GitHub webhooks and repository secret environment variables to receive game submissions.

## Prerequisites

Before you begin, ensure you have:
- GitHub account with repository admin access
- Deployment platform account (Vercel, Netlify, or server access)
- Basic familiarity with environment variables and GitHub settings

## Method 1: Repository Dispatch (Recommended)

This method uses GitHub's repository dispatch events with GitHub Actions. It's the most secure and integrated approach.

### Step 1: Create GitHub Personal Access Token

1. **Navigate to GitHub Settings**
   - Click your profile picture → Settings
   - Go to Developer settings → Personal access tokens → Tokens (classic)

2. **Generate New Token**
   - Click "Generate new token (classic)"
   - Fill out the form:
     - **Note**: `Game Submission Webhook Token`
     - **Expiration**: 90 days (recommended) or custom
     - **Select scopes**:
       - ✅ `repo` (Full control of private repositories)
       - ✅ `workflow` (Update GitHub Action workflows)

3. **Save the Token**
   - Click "Generate token"
   - **⚠️ IMPORTANT**: Copy the token immediately (it won't be shown again)
   - Store it securely for the next step

### Step 2: Configure Repository Secrets

1. **Access Repository Settings**
   - Go to your repository on GitHub
   - Click Settings tab
   - Navigate to Secrets and variables → Actions

2. **Add Repository Secret**
   - Click "New repository secret"
   - **Name**: `GAME_SUBMISSION_TOKEN`
   - **Secret**: Paste your GitHub token from Step 1
   - Click "Add secret"

### Step 3: Verify GitHub Actions Configuration

1. **Enable GitHub Actions**
   - In repository Settings → Actions → General
   - Select "Allow all actions and reusable workflows"
   - Click "Save"

2. **Check Workflow File**
   - Verify `.github/workflows/game-submissions.yml` exists
   - Ensure the file has proper permissions and syntax

### Step 4: Configure Application Environment

Choose your deployment platform:

#### For Vercel:
1. Go to your Vercel project dashboard
2. Settings → Environment Variables
3. Add new variable:
   - **Name**: `GAME_SUBMISSION_TOKEN`
   - **Value**: Your GitHub token from Step 1
   - **Environments**: Production, Preview, Development

#### For Netlify:
1. Go to your Netlify site dashboard
2. Site settings → Environment variables
3. Add new variable:
   - **Key**: `GAME_SUBMISSION_TOKEN`
   - **Value**: Your GitHub token from Step 1

#### For Local Development:
```bash
# Create .env.local file in project root
echo "GAME_SUBMISSION_TOKEN=your_github_token_here" > .env.local
```

#### For Self-Hosted/Docker:
```bash
# Set environment variable
export GAME_SUBMISSION_TOKEN=your_github_token_here

# Or add to your deployment script
docker run -e GAME_SUBMISSION_TOKEN=your_token your-app-image
```

### Step 5: Test the Implementation

1. **Start Your Application**
   ```bash
   npm run dev  # For local testing
   ```

2. **Test API Endpoint**
   ```bash
   curl -X POST http://localhost:3000/api/submit-game \
     -H "Content-Type: application/json" \
     -d '{
       "title": "Test Game Submission",
       "description": "This is a test submission to verify the webhook setup",
       "submitterName": "Test User",
       "genre": "Test",
       "players": "Single Player",
       "difficulty": "Easy",
       "features": "Test features"
     }'
   ```

3. **Verify GitHub Integration**
   - Check your repository's Actions tab
   - Look for "Game Submission Workflow" execution
   - Verify a new issue was created in the Issues tab

4. **Test Complete Workflow**
   - Visit `/submit-game` on your application
   - Fill out and submit the form
   - Confirm issue creation and proper labeling

## Method 2: External Webhook Endpoint

This method creates a traditional webhook endpoint that can receive submissions from external services.

### Step 1: Configure Webhook Secret (Optional but Recommended)

1. **Generate a Strong Secret**
   ```bash
   # Generate a random secret
   openssl rand -hex 32
   ```

2. **Add to Environment Variables**
   - Add `WEBHOOK_SECRET=your_generated_secret` to your deployment platform
   - This enables signature verification for security

### Step 2: Set Up External Service

Configure your external service (form provider, CMS, etc.) to send webhooks to:
```
POST https://your-domain.com/api/webhook
Content-Type: application/json

{
  "title": "Game Title",
  "description": "Game description",
  "submitterName": "User Name",
  "submitterEmail": "user@example.com",
  "genre": "Action",
  "players": "Multiplayer",
  "difficulty": "Medium",
  "features": "Special features",
  "source": "External Form"
}
```

### Step 3: Test Webhook Endpoint

```bash
# Test the webhook endpoint
curl -X POST https://your-domain.com/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Webhook Test Game",
    "description": "Testing external webhook integration",
    "submitterName": "Webhook Test",
    "source": "cURL Test"
  }'
```

## Method 3: GitHub Repository Webhooks

For advanced users who want GitHub to send webhooks on repository events.

### Step 1: Configure Repository Webhook

1. **Access Webhook Settings**
   - Repository Settings → Webhooks → Add webhook

2. **Configure Webhook**
   - **Payload URL**: `https://your-domain.com/api/github-webhook`
   - **Content type**: `application/json`
   - **Secret**: Your webhook secret (optional)
   - **Events**: Select specific events you want to monitor

### Step 2: Create GitHub Webhook Handler

Create `app/api/github-webhook/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Handle GitHub webhook events
  const payload = await request.json();
  
  // Process based on event type
  if (payload.action === 'opened' && payload.issue) {
    // Handle new issue events
    console.log('New issue created:', payload.issue.title);
  }
  
  return NextResponse.json({ success: true });
}
```

## Verification Checklist

Use this checklist to verify your setup:

### Basic Setup
- [ ] GitHub personal access token created with correct scopes
- [ ] Repository secret `GAME_SUBMISSION_TOKEN` configured
- [ ] Environment variable set in deployment platform
- [ ] GitHub Actions enabled for repository

### Functionality Tests
- [ ] API endpoint responds correctly to test requests
- [ ] GitHub Actions workflow executes without errors
- [ ] Issues are created with proper labels and assignments
- [ ] Form submissions work end-to-end
- [ ] Review workflow (adding `reviewed` label) works correctly

### Security Verification
- [ ] Tokens are not exposed in client-side code
- [ ] Environment variables are properly secured
- [ ] Webhook signatures are verified (if using external webhooks)
- [ ] Rate limiting is in place for API endpoints

## Troubleshooting Common Issues

### Token Permission Errors
```bash
# Test token permissions manually
curl -H "Authorization: token YOUR_TOKEN" \
  https://api.github.com/repos/YOUR_USERNAME/YOUR_REPO
```

### Environment Variable Issues
```bash
# Verify environment variables are loaded
node -e "console.log('Token found:', !!process.env.GAME_SUBMISSION_TOKEN)"
```

### GitHub Actions Not Triggering
1. Check Actions tab for execution logs
2. Verify workflow file syntax
3. Ensure repository dispatch permissions
4. Check token scopes and expiration

### Webhook Payload Issues
1. Verify JSON format and required fields
2. Check content-type headers
3. Validate signature if security is enabled
4. Review server logs for detailed errors

## Security Best Practices

1. **Token Management**
   - Use repository secrets, not environment files
   - Set appropriate token expiration dates
   - Rotate tokens regularly
   - Use minimal required permissions

2. **Webhook Security**
   - Always verify webhook signatures
   - Use HTTPS for all webhook URLs
   - Implement rate limiting
   - Validate all incoming data

3. **Environment Variables**
   - Never commit secrets to version control
   - Use different tokens for different environments
   - Audit access to production secrets regularly

## Getting Help

If you encounter issues:

1. **Check the logs**: Review GitHub Actions execution logs
2. **Verify configuration**: Double-check all environment variables and secrets
3. **Test incrementally**: Start with simple API calls before full integration
4. **Review documentation**: Consult the detailed WEBHOOK_DOCUMENTATION.md
5. **Check GitHub status**: Visit https://status.github.com for service issues

## Next Steps

After successful setup:
1. Customize the issue template in the workflow file
2. Add additional form fields if needed
3. Set up monitoring and alerting
4. Consider implementing backup submission methods
5. Review and update security settings regularly