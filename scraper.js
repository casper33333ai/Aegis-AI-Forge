const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function aegisScrape() {
  const url = process.env.AI_URL || "https://aistudio.google.com/u/1/apps/drive/1C95LlT34ylBJSzh30JU2J1ZlwMZSIQrx?showPreview=true&showAssistant=true";
  const rawCookies = process.env.SESSION_COOKIES || '[]';
  
  console.log('🛡️ [V15.1] Initializing Aegis Extraction Protocol...');

  if (!url || url === 'undefined') {
    console.error('❌ [CONFIG] No target URL provided. Aborting.');
    process.exit(1);
  }

  const launchOptions = {
    headless: "new",
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-extensions',
      '--hide-scrollbars',
      '--mute-audio',
      '--window-size=1280,960'
    ]
  };

  let browser;
  try {
    console.log('🚀 [LAUNCH] Attempting Aegis Browser Boot...');
    browser = await puppeteer.launch(launchOptions);
    console.log('✅ [LAUNCH] Browser instance ready.');
  } catch (launchError) {
    console.error('💥 [CRASH] Browser launch failed:', launchError.message);
    process.exit(1);
  }
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 960 });
    
    const androidUA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36';
    await page.setUserAgent(androidUA);

    // Safe Cookie Parsing
    if (rawCookies && rawCookies.length > 10) {
      try {
        console.log('🍪 [AUTH] Decoding Identity Vault...');
        const cookies = JSON.parse(rawCookies);
        if (Array.isArray(cookies)) {
          await page.setCookie(...cookies.map(c => ({
            ...c, 
            domain: c.domain || '.google.com',
            secure: true,
            httpOnly: c.httpOnly || false,
            sameSite: 'Lax'
          })));
          console.log('✅ [AUTH] Cookies injected successfully.');
        }
      } catch (cookieErr) {
        console.warn('⚠️ [AUTH] Cookie parsing failed. Proceeding without session:', cookieErr.message);
      }
    }

    console.log('🌐 [NAVIGATE] Establishing Tunnel: ' + url);
    await page.goto(url, { 
      waitUntil: ['networkidle2', 'domcontentloaded'], 
      timeout: 120000 
    }).catch(e => {
      console.warn('⚠️ [NAVIGATE] Navigation reached timeout, attempting capture anyway:', e.message);
    });
    
    console.log('⏳ [STABILIZE] Synchronizing assets (30s)...');
    await delay(30000); 

    const bundleData = await page.evaluate(() => {
      // Cleanup UI noise
      const selectors = ['.modal', '.overlay', '.popup', 'header', 'footer'];
      selectors.forEach(s => {
        try { document.querySelectorAll(s).forEach(el => el.remove()); } catch(e) {}
      });
      
      return {
        html: document.body.innerHTML,
        head: document.head.innerHTML,
        origin: window.location.origin,
        cookies: document.cookie
      };
    });

    if (!bundleData.html || bundleData.html.length < 100) {
      throw new Error('Capture yielded empty or invalid HTML. Extraction failed.');
    }

    const finalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <base href="${bundleData.origin}/">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
  <title>Aegis AI Native</title>
  ${bundleData.head}
  <script>
    (function() {
      try {
        const cookies = ${JSON.stringify(bundleData.cookies)};
        if (cookies) {
          cookies.split(';').forEach(c => {
            document.cookie = c.trim() + "; domain=.google.com; path=/; SameSite=Lax";
          });
        }
      } catch(e) {}
      window.isNativeApp = true;
    })();
  </script>
  <style>
    body { background: #000 !important; color: #fff !important; margin: 0; padding: 0; overflow-x: hidden; }
    #forge-container { width: 100vw; height: 100vh; overflow-y: auto; -webkit-overflow-scrolling: touch; }
    ::-webkit-scrollbar { display: none; }
  </style>
</head>
<body class="aegis-v15-1">
  <div id="forge-container">${bundleData.html}</div>
</body>
</html>`;

    const outDir = path.resolve('www');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'index.html'), finalHtml);
    console.log('✅ [AEGIS] Interface locked and written to: ' + outDir);
  } catch (err) {
    console.error('❌ [FATAL] Aegis Sequence Aborted:', err.message);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}
aegisScrape();