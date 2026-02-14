import puppeteer from 'puppeteer'

async function test() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 720 })

  console.log('🌐 페이지 접속 중...')
  await page.goto('http://129.154.63.231:8000', { waitUntil: 'networkidle2' })

  // 스크린샷 저장
  await page.screenshot({ path: 'screenshot-1-login.png' })
  console.log('✅ 스크린샷 저장: screenshot-1-login.png')

  // 페이지 타이틀 확인
  const title = await page.title()
  console.log('📄 페이지 타이틀:', title)

  // 로그인 폼 확인
  const emailInput = await page.$('input[type="email"]')
  const passwordInput = await page.$('input[type="password"]')
  console.log('📝 이메일 입력 필드:', emailInput ? '있음' : '없음')
  console.log('📝 비밀번호 입력 필드:', passwordInput ? '있음' : '없음')

  // 로그인 테스트
  if (emailInput && passwordInput) {
    console.log('\n🔐 로그인 테스트...')
    await page.type('input[type="email"]', 'browser-test@example.com')
    await page.type('input[type="password"]', 'test1234')
    await page.click('button[type="submit"]')

    // 로그인 후 대기
    await new Promise(r => setTimeout(r, 2000))
    await page.screenshot({ path: 'screenshot-2-after-login.png' })
    console.log('✅ 스크린샷 저장: screenshot-2-after-login.png')

    // 로그인 성공 여부 확인
    const url = page.url()
    console.log('🔗 현재 URL:', url)

    // 대시보드 요소 확인
    const dashboardText = await page.evaluate(() => document.body.innerText)
    console.log('📊 페이지 내용 미리보기:', dashboardText.substring(0, 300))
  }

  await browser.close()
  console.log('\n✅ 테스트 완료!')
}

test().catch(console.error)
