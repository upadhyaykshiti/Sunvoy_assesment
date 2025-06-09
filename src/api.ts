
import type { User } from './types.js';
import type { RequestInit } from 'node-fetch';
import { Response } from 'node-fetch';
import * as crypto from 'node:crypto';
import { JSDOM } from 'jsdom';
import { CookieJar } from 'tough-cookie';
import { URLSearchParams } from 'url';


export type CustomFetch = (url: string, init?: RequestInit) => Promise<Response>;

export async function fetchAllUsers(fetchWithAuth: CustomFetch): Promise<User[]> {
  const res = await fetchWithAuth('https://challenge.sunvoy.com/api/users', {
    method: 'POST',
  });

  

  if (!res.ok) {
    throw new Error(`❌ Failed to fetch users: ${res.status}`);
  }

  return res.json();
}





export async function fetchCurrentUser(fetchWithAuth: CustomFetch, cookieJar: CookieJar): Promise<User> {
  console.log('👤 Fetching current user from /settings/tokens...');

  const res = await fetchWithAuth('https://challenge.sunvoy.com/settings/tokens');
  const html = await res.text();
  console.log('📄 Loaded /settings/tokens HTML');

  const dom = new JSDOM(html);
  const document = dom.window.document;
  const getInputValue = (id: string) =>
    (document.querySelector(`input[id="${id}"]`) as HTMLInputElement)?.value ?? '';

  const access_token = getInputValue('access_token');
  const openId = getInputValue('openId');
  const userId = getInputValue('userId');
  const apiuser = getInputValue('apiuser');
  const operateId = getInputValue('operateId');
  const language = getInputValue('language') || 'en_US';

  const timestamp = Math.floor(Date.now() / 1000).toString();

  if (!access_token || !userId) {
    throw new Error('❌ Missing access_token or userId from /settings/tokens page');
  }

  console.log('🔑 access_token:', access_token);
  console.log('🔢 timestamp:', timestamp);
  console.log('🧑 userId:', userId);

  const payloadObj = {
    access_token,
    apiuser,
    language,
    openId,
    operateId,
    timestamp,
    userId,
  };

  const sortedKeys = Object.keys(payloadObj).sort();
  const queryString = sortedKeys
.map((key) => `${key}=${encodeURIComponent((payloadObj as Record<string, string>)[key])}`)
    .join("&");

  const hmac = crypto.createHmac('sha1', 'mys3cr3t');
  hmac.update(queryString);
  const checkcode = hmac.digest('hex').toUpperCase(); // required by backend

  const payload = new URLSearchParams(payloadObj);
  payload.append('checkcode', checkcode);

  console.log('📤 Sending payload to /api/settings:', Object.fromEntries(payload));

  const res2 = await fetchWithAuth('https://api.challenge.sunvoy.com/api/settings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Origin': 'https://challenge.sunvoy.com',
      'Referer': 'https://challenge.sunvoy.com/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
    },
    body: payload.toString(),
  });

  if (!res2.ok) {
    const errorText = await res2.text();
    throw new Error(`❌ Failed to fetch current user: ${res2.status} - ${errorText}`);
  }

  const user: User = await res2.json();
  return user;
}



