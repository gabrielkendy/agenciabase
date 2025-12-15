#!/bin/bash

# BASE Agency - Script de Deploy
# ================================

echo "🚀 BASE Agency - Deploy Script"
echo "================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Build Frontend
echo -e "${YELLOW}📦 Building frontend...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful!${NC}"

# Deploy options
echo ""
echo "Choose deploy target:"
echo "1) Vercel (Frontend)"
echo "2) Netlify (Frontend)"  
echo "3) GitHub Pages (Frontend)"
echo "4) Skip deploy"

read -p "Option [1-4]: " option

case $option in
    1)
        echo -e "${YELLOW}🚀 Deploying to Vercel...${NC}"
        npx vercel --prod
        ;;
    2)
        echo -e "${YELLOW}🚀 Deploying to Netlify...${NC}"
        npx netlify deploy --prod --dir=dist
        ;;
    3)
        echo -e "${YELLOW}🚀 Deploying to GitHub Pages...${NC}"
        npx gh-pages -d dist
        ;;
    *)
        echo -e "${GREEN}Skipping deploy. Your build is in ./dist${NC}"
        ;;
esac

echo ""
echo -e "${GREEN}✅ Done!${NC}"
echo ""
echo "Next steps for backend:"
echo "1. Push to GitHub"
echo "2. Connect to Render.com or Railway"
echo "3. Set environment variables"
echo "4. Deploy!"
