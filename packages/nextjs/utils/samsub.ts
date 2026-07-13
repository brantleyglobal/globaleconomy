// app/utils/sumsub.ts
import crypto from 'crypto';

export async function fetchSumsub(urlPath: string, method: string, bodyText: string = '') {
  const ts = Math.floor(Date.now() / 1000).toString();
  const stringToSign = ts + method.toUpperCase() + urlPath + bodyText;
  
  const signature = crypto
    .createHmac('sha256', process.env.SUMSUB_SECRET_KEY!)
    .update(stringToSign)
    .digest('hex');

  const response = await fetch(`https://api.sumsub.com${urlPath}`, {
    method,
    headers: {
      'X-App-Token': process.env.SUMSUB_APP_TOKEN!,
      'X-App-Access-Sig': signature,
      'X-App-Access-Ts': ts,
      'Content-Type': 'application/json',
    },
    body: bodyText || undefined,
  });

  return response.json();
}