#!/bin/bash

# Setup script for CI/CD deployment to Fly.io
# This script sets up the Fly.io app and GitHub secrets

set -e

echo "🚀 Setting up VietinBank AI Interviewer deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check required tools
echo "📋 Checking required tools..."

if ! command -v flyctl &> /dev/null; then
    print_error "Fly CLI not found. Please install it first:"
    echo "curl -L https://fly.io/install.sh | sh"
    exit 1
fi

if ! command -v gh &> /dev/null; then
    print_error "GitHub CLI not found. Please install it first:"
    echo "brew install gh"
    exit 1
fi

print_status "All required tools are installed"

# Check if logged in to Fly.io
echo "🔐 Checking Fly.io authentication..."
if ! flyctl auth whoami &> /dev/null; then
    print_warning "Not logged in to Fly.io. Please login:"
    flyctl auth login
fi

print_status "Authenticated with Fly.io"

# Check if logged in to GitHub
echo "🔐 Checking GitHub authentication..."
if ! gh auth status &> /dev/null; then
    print_warning "Not logged in to GitHub CLI. Please login:"
    gh auth login
fi

print_status "Authenticated with GitHub"

# Create Fly.io app
echo "🛠️  Creating Fly.io application..."

APP_NAME="viettinbank-ai-interviewer"

if flyctl apps list | grep -q "$APP_NAME"; then
    print_warning "App '$APP_NAME' already exists"
else
    echo "Creating new app '$APP_NAME'..."
    flyctl apps create "$APP_NAME" --org personal
    print_status "Created Fly.io app: $APP_NAME"
fi

# Create volume for database
echo "💾 Setting up database volume..."
VOLUME_NAME="viettinbank_data"

if flyctl volumes list -a "$APP_NAME" | grep -q "$VOLUME_NAME"; then
    print_warning "Volume '$VOLUME_NAME' already exists"
else
    echo "Creating volume '$VOLUME_NAME'..."
    flyctl volumes create "$VOLUME_NAME" --region sin --size 1 -a "$APP_NAME"
    print_status "Created database volume: $VOLUME_NAME"
fi

# Get Fly.io API token
echo "🔑 Getting Fly.io API token..."
FLY_API_TOKEN=$(flyctl auth token)

if [ -z "$FLY_API_TOKEN" ]; then
    print_error "Failed to get Fly.io API token"
    exit 1
fi

# Set GitHub secret
echo "🔐 Setting GitHub secrets..."
echo "$FLY_API_TOKEN" | gh secret set FLY_API_TOKEN

print_status "GitHub secret FLY_API_TOKEN set successfully"

# Set environment variables for the app
echo "⚙️  Setting up environment variables..."

echo "Please provide the following environment variables:"

read -p "OpenAI API Key: " OPENAI_API_KEY
read -p "Soniox API Key: " SONIOX_API_KEY
read -p "Gemini API Key (optional): " GEMINI_API_KEY

# Set secrets in Fly.io
flyctl secrets set OPENAI_API_KEY="$OPENAI_API_KEY" -a "$APP_NAME"
flyctl secrets set SONIOX_API_KEY="$SONIOX_API_KEY" -a "$APP_NAME"

if [ ! -z "$GEMINI_API_KEY" ]; then
    flyctl secrets set GEMINI_API_KEY="$GEMINI_API_KEY" -a "$APP_NAME"
fi

flyctl secrets set DATABASE_URL="/data/app.db" -a "$APP_NAME"

print_status "Environment variables configured"

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Push your code to the main branch to trigger deployment"
echo "2. Monitor deployment: flyctl logs -a $APP_NAME"
echo "3. Check app status: flyctl status -a $APP_NAME"
echo ""
echo "App URL: https://$APP_NAME.fly.dev"
echo ""