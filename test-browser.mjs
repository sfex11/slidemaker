import puppeteer from 'puppeteer'

async function test() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  const page = await browser.newPage()
  await page.setViewport({ width: 1400, height: 900 })

  console.log('🌐 페이지 접속...')
  await page.goto('http://129.154.63.231:8000', { waitUntil: 'networkidle2' })

  // 로그인
  console.log('🔐 로그인...')
  await page.type('input[type="email"]', 'editor@test.com')
  await page.type('input[type="password"]', 'test1234')
  await page.click('button[type="submit"]')
  await new Promise(r => setTimeout(r, 2000))

  await page.screenshot({ path: 's1-dashboard.png' })
  console.log('✅ 대시보드')

  // 새 프로젝트 버튼 클릭
  const buttons = await page.$$('button')
  for (const btn of buttons) {
    const text = await btn.evaluate(el => el.innerText)
    if (text.includes('새 프로젝트')) {
      await btn.click()
      break
    }
  }

  await new Promise(r => setTimeout(r, 2000))
  await page.screenshot({ path: 's2-editor.png' })
  console.log('✅ 슬라이드 에디터')

  // 페이지 내용 확인
  const content = await page.evaluate(() => document.body.innerText)
  console.log('📄 내용 미리보기:', content.substring(0, 300))

  await browser.close()
  console.log('\n✅ 테스트 완료!')
}

test().catch(console.error)
