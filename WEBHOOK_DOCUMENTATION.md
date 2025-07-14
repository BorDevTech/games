# Game Submission Webhook System

This document explains the webhook system for processing game idea submissions and automatically creating GitHub issues.

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
- Form data is sent via GitHub API repository dispatch event
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

### 1. Repository Configuration
No additional setup required - the system uses GitHub's built-in `GITHUB_TOKEN` which is automatically available in GitHub Actions.

### 2. Environment Variables (Optional)
For local development or direct API calls, you can set:
```bash
NEXT_PUBLIC_GITHUB_WEBHOOK_TOKEN=your_github_token_here
```

**⚠️ Security Note**: The `NEXT_PUBLIC_` prefix exposes this token to client-side code. Only use this for testing. In production, rely on the GitHub Actions workflow for security.

### 3. Testing the Workflow

#### Test Form Submission:
1. Navigate to `/submit-game`
2. Fill out the form with test data
3. Submit the form
4. Check the GitHub repository for a new issue

#### Test Review Process:
1. Find a game submission issue with `needs-review` label
2. Add the `reviewed` label to the issue
3. Verify that @copilot is automatically assigned and the issue is relabeled

## Security Considerations

- **No sensitive tokens exposed**: The system uses repository dispatch events which are processed server-side by GitHub Actions
- **Fallback mechanism**: If GitHub API is unavailable, submissions are stored locally
- **Input validation**: All form data is validated before processing
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

### Form Submissions Not Creating Issues
1. Check if GitHub Actions are enabled for the repository
2. Verify the workflow file syntax in `.github/workflows/game-submissions.yml`
3. Check the Actions tab for workflow execution logs

### Issues Not Auto-Assigning to @copilot
1. Ensure the issue has both `game-idea` and `reviewed` labels
2. Check that @copilot has access to the repository
3. Review the workflow logs in the Actions tab

### Fallback to localStorage
- This happens when GitHub API is not available or not configured
- Submissions are stored locally and can be manually processed
- Check browser developer tools for API error messages