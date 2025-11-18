const puppeteer = require('puppeteer');

async function run() {
  const url = process.env.TEST_URL || 'http://localhost:3002/?source=test-slug';
  console.log('Opening', url);
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 }).catch(e => { return null; });
    if (!response) {
      console.error('No response (connection failed or timeout)');
      await browser.close();
      process.exit(2);
    }
    console.log('Status:', response.status());
    console.log('Final URL:', page.url());
    // finished
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('Error during puppeteer run:', err);
    try { await browser.close(); } catch(e){}
    process.exit(1);
  }
}

run();
