#!/bin/bash
# 오라클 프리티어 서버 초기 설정 스크립트
# 서버에서 한 번만 실행하면 됩니다: bash server-setup.sh

set -e

echo "=== Node.js 설치 (nvm) ==="
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm install 20
nvm use 20

echo "=== PM2 설치 ==="
npm install -g pm2

echo "=== 프로젝트 클론 ==="
cd ~
git clone https://github.com/sfex11/slidemaker.git
cd slidemaker

echo "=== 의존성 설치 ==="
export PUPPETEER_SKIP_DOWNLOAD=true
npm ci --omit=dev

echo "=== Prisma 설정 ==="
npx prisma generate
npx prisma db push

echo "=== 빌드 ==="
npm run build

echo "=== .env 파일 생성 ==="
if [ ! -f .env ]; then
  cat > .env << 'EOF'
# 아래 값들을 실제 값으로 변경하세요
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_URL="http://129.154.63.231:3001"
NEXTAUTH_SECRET="여기에-랜덤-시크릿-입력"
ZAI_API_KEY="여기에-API-키-입력"
EOF
  echo "⚠️  .env 파일이 생성되었습니다. 실제 값으로 수정하세요!"
fi

echo "=== PM2로 서버 시작 (포트 3001) ==="
pm2 start npm --name slidemaker -- start
pm2 save
pm2 startup

echo ""
echo "✅ 설정 완료! http://129.154.63.231:3001 에서 확인하세요."
echo ""
echo "📌 남은 작업:"
echo "  1. .env 파일의 시크릿 값들을 실제 값으로 수정"
echo "  2. GitHub 리포지토리 Settings > Secrets에 다음 추가:"
echo "     - SSH_USER: 서버 SSH 사용자명"
echo "     - SSH_PRIVATE_KEY: SSH 개인키 내용"
