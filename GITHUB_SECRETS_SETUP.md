# GitHub Actions Secrets Setup

To enable continuous deployment, the following secrets need to be set in the GitHub repository:

## Required Secrets

### 1. Cloudflare Account ID
```bash
gh secret set CLOUDFLARE_ACCOUNT_ID --body "9f26393d5ba4186296b36e2af8714b1c" -R Mihai-Codes/cf_ai_canvas
```

### 2. Cloudflare API Token
The API token needs the following permissions:
- Account:Read
- Workers Scripts:Edit

Obtain the token from: https://dash.cloudflare.com/profile/api-tokens

```bash
gh secret set CLOUDFLARE_API_TOKEN -R Mihai-Codes/cf_ai_canvas
```

### 3. tldraw License Key (Optional but recommended for production)
```bash
gh secret set VITE_TLDRAW_LICENSE_KEY --body "your-tldraw-license-key" -R Mihai-Codes/cf_ai_canvas
```

## Verification

After setting the secrets, push a small commit to trigger the deploy workflow:

```bash
git commit -m "chore: test CI/CD deployment" --allow-empty
git push origin main
```

Then check the GitHub Actions workflow at:
https://github.com/Mihai-Codes/cf_ai_canvas/actions

The workflow should run green end-to-end, including the deploy step.
