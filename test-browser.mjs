import puppeteer from 'puppeteer'

async function test() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 900 })

  console.log('🌐 페이지 접속 중...')
  await page.goto('http://129.154.63.231:8000', { waitUntil: 'networkidle2' })

  await page.screenshot({ path: 'screenshot-1.png' })
  console.log('✅ 스크린샷 1 저장')

  const title = await page.title()
  console.log('📄 타이틀:', title)

  // 로그인
  console.log('\n🔐 로그인 중...')
  await page.type('input[type="email"]', 'user@test.com')
  await page.type('input[type="password"]', 'password123')
  await page.click('button[type="submit"]')

  await new Promise(r => setTimeout(r, 2000))
  await page.screenshot({ path: 'screenshot-2-dashboard.png' })
  console.log('✅ 스크린샷 2 저장 (대시보드)')

  const content = await page.evaluate(() => document.body.innerText)
  console.log('📊 페이지 내용:', content.substring(0, 200))

  // 새 프로젝트 버튼 찾기
  const newProjectBtn = await page.$('button:has-text("새 프로젝트")')
  if (newProjectBtn) {
    console.log('\n📝 새 프로젝트 버튼 클릭...')
    await newProjectBtn.click()
    await new Promise(r => setTimeout(r, 2000))
    await page.screenshot({ path: 'screenshot-3-editor.png' })
    console.log('✅ 스크린샷 3 저장 (에디터)')
  }

  await browser.close()
  console.log('\n✅ 테스트 완료!')
}

test().catch(console.error)
