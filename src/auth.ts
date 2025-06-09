
import fetch from 'node-fetch';
import fetchCookie from 'fetch-cookie';
import { CookieJar, Cookie } from 'tough-cookie';
import { JSDOM } from 'jsdom';
import fs from 'fs';

const LOGIN_URL = 'https://challenge.sunvoy.com/login';
const SETTINGS_PAGE = 'https://challenge.sunvoy.com/settings';
const COOKIE_PATH = './cookies.json';

export const cookieJar = new CookieJar(); 

export async function login() {
  // ✅ Load cookies
  if (fs.existsSync(COOKIE_PATH)) {
    const savedCookies = JSON.parse(fs.readFileSync(COOKIE_PATH, 'utf-8'));
    const restored = CookieJar.deserializeSync(savedCookies);
    Object.assign(cookieJar, restored);
    console.log('🍪 Reusing saved cookies');
  }

  const fetchWithCookies = fetchCookie(fetch, cookieJar);

  // ✅ Check if already logged in
  const testRes = await fetchWithCookies(SETTINGS_PAGE);
  if (testRes.status === 200 && !(await testRes.text()).includes('Login')) {
    console.log('🔓 Already authenticated');
  } else {
    // 🔐 Perform login
    console.log('🔐 Performing login...');
    const loginPage = await fetchWithCookies(LOGIN_URL);
    const loginHtml = await loginPage.text();
    const dom = new JSDOM(loginHtml);
    const nonce = dom.window.document.querySelector('input[name="nonce"]')?.getAttribute('value');
    if (!nonce) throw new Error('❌ Nonce not found');

    const formData = new URLSearchParams({
      nonce,
      username: 'demo@example.org',
      password: 'test',
    });

    const loginRes = await fetchWithCookies(LOGIN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
      redirect: 'manual',
    });



    if (loginRes.status !== 302) throw new Error('❌ Login failed');
    console.log('✅ Login successful');
  }

  // 🩹 Clone necessary cookies to API domain
  const cookies: Cookie[] = cookieJar.getCookiesSync('https://challenge.sunvoy.com');
  const cookiesToClone = ['JSESSIONID', '_csrf_token', 'session_fingerprint'];

  cookies.forEach((cookie: Cookie) => {
    if (cookiesToClone.includes(cookie.key)) {
      const newCookieStr = `${cookie.key}=${cookie.value}; Domain=api.challenge.sunvoy.com; Path=/; HttpOnly`;
      cookieJar.setCookieSync(newCookieStr, 'https://api.challenge.sunvoy.com');
    }
  });

  const cookiesAfterClone = cookieJar.getCookiesSync('https://api.challenge.sunvoy.com');
  console.log('🍪 Cookies for api.challenge.sunvoy.com:', cookiesAfterClone.map(c => `${c.key}=${c.value}`));

  // 💾 Save cookies
  const serialized = await new Promise<any>((resolve, reject) =>
    cookieJar.serialize((err, data) => (err ? reject(err) : resolve(data)))
  );
  fs.writeFileSync(COOKIE_PATH, JSON.stringify(serialized, null, 2));
  console.log('📦 Cookies saved');

  return {
    fetchWithAuth: fetchWithCookies,
    cookieJar 
  };
}

