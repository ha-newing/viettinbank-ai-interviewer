# VietinBank AI Interviewer - Deployment Guide

## 🚀 CI/CD Pipeline Setup Complete

Your VietinBank AI Interviewer application now has a complete CI/CD pipeline configured with GitHub Actions and Fly.io deployment.

## 📋 What's Been Set Up

### ✅ Fly.io Configuration
- **App**: `viettinbank-ai-interviewer`
- **Region**: Singapore (sin)
- **Database Volume**: 1GB persistent storage at `/data`
- **Health Check**: Available at `/api/health`

### ✅ GitHub Repository
- **URL**: https://github.com/ha-newing/viettinbank-ai-interviewer
- **Secrets**: FLY_API_TOKEN configured for automatic deployment

### ✅ GitHub Actions Workflow
The CI/CD pipeline includes:

1. **Test & Build Job**
   - TypeScript compilation checks
   - Automated tests (if available)
   - Code linting
   - Runs on every push and pull request

2. **Security Audit Job**
   - npm security vulnerability scanning
   - Dependency audit checks
   - Runs in parallel with tests

3. **Deploy Job**
   - Automatic deployment to Fly.io
   - Only runs on push to main branch
   - Requires tests to pass first

### ✅ Production Configuration
- **Dockerfile**: Multi-stage build optimized for production
- **Health Checks**: Automated monitoring endpoint
- **Database**: SQLite with automatic migrations
- **Secrets Management**: Environment variables via Fly.io secrets

## 🔧 Environment Variables

Set these secrets in Fly.io for your application:

```bash
# Required API Keys
flyctl secrets set OPENAI_API_KEY="your-openai-key" -a viettinbank-ai-interviewer
flyctl secrets set SONIOX_API_KEY="your-soniox-key" -a viettinbank-ai-interviewer

# Optional
flyctl secrets set GEMINI_API_KEY="your-gemini-key" -a viettinbank-ai-interviewer
```

## 🚀 Deployment Process

### Automatic Deployment
1. Push code to the `main` branch
2. GitHub Actions automatically:
   - Runs tests and security checks
   - Builds the application
   - Deploys to Fly.io if tests pass

### Manual Deployment
```bash
# Deploy directly via Fly.io CLI
flyctl deploy

# Check deployment status
flyctl status -a viettinbank-ai-interviewer

# View logs
flyctl logs -a viettinbank-ai-interviewer
```

## 🔍 Monitoring & Health Checks

- **App URL**: https://viettinbank-ai-interviewer.fly.dev
- **Health Check**: https://viettinbank-ai-interviewer.fly.dev/api/health
- **Logs**: `flyctl logs -a viettinbank-ai-interviewer`
- **Status**: `flyctl status -a viettinbank-ai-interviewer`

## 📊 GitHub Actions

Monitor your deployments at:
- **Actions**: https://github.com/ha-newing/viettinbank-ai-interviewer/actions
- **Latest Run**: Check build status and logs

## 🛠️ Setup Script

For easy configuration on new environments:
```bash
./scripts/setup-deployment.sh
```

This script will:
- Verify required tools (flyctl, gh)
- Create Fly.io app and volume
- Configure GitHub secrets
- Set up environment variables

## 🔐 Security Notes

- All sensitive data is managed through Fly.io secrets
- GitHub secret scanning prevents accidental commits
- Dependency vulnerabilities are automatically checked
- HTTPS is enforced for all connections

## 📝 Next Steps

1. **Set Environment Variables**: Configure your API keys in Fly.io secrets
2. **Verify Deployment**: Check the health endpoint after deployment
3. **Monitor Logs**: Watch for any issues during the first deployment
4. **Scale if Needed**: Adjust resources via Fly.io dashboard

## 🔧 Troubleshooting

### Deployment Fails
```bash
# Check logs
flyctl logs -a viettinbank-ai-interviewer

# Verify secrets
flyctl secrets list -a viettinbank-ai-interviewer

# Manual deploy for debugging
flyctl deploy --verbose
```

### Database Issues
```bash
# Check volume status
flyctl volumes list -a viettinbank-ai-interviewer

# SSH into container
flyctl ssh console -a viettinbank-ai-interviewer
```

### GitHub Actions Issues
- Check the Actions tab in your GitHub repository
- Verify the FLY_API_TOKEN secret is set correctly
- Ensure your main branch has the workflow files

---

Your VietinBank AI Interviewer is now ready for production deployment! 🎉