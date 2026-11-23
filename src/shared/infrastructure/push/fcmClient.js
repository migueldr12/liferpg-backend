const crypto = require('node:crypto');

// Envío de notificaciones push con Firebase Cloud Messaging (API HTTP v1), sin dependencias.
// Lo usa el M14 (avisos de la PWA Admin) y lo puede reutilizar el M10.
//
// Necesita la cuenta de servicio de Firebase en el .env (nunca en el repositorio):
//   FCM_PROJECT_ID, FCM_CLIENT_EMAIL y FCM_PRIVATE_KEY (con los saltos de línea como \n).
// Sin esas variables isConfigured() es false y el módulo guarda el aviso "en cola".
//
// fetchImpl y now se pueden reemplazar en las pruebas.

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const CONCURRENCIA = 10; // envíos simultáneos como máximo

const base64url = (value) => Buffer.from(value).toString('base64url');

function createFcmClient({
  projectId = process.env.FCM_PROJECT_ID,
  clientEmail = process.env.FCM_CLIENT_EMAIL,
  privateKey = process.env.FCM_PRIVATE_KEY,
  fetchImpl = fetch,
  now = () => Date.now(),
} = {}) {
  const key = privateKey?.replace(/\\n/g, '\n');
  let cached = null; // { token, expiresAt }

  const isConfigured = () => Boolean(projectId && clientEmail && key);

  // Token de acceso OAuth de la cuenta de servicio (JWT firmado con RS256). Se reutiliza ~55 min.
  async function accessToken() {
    if (cached && cached.expiresAt > now()) return cached.token;
    const iat = Math.floor(now() / 1000);
    const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claims = base64url(JSON.stringify({ iss: clientEmail, scope: SCOPE, aud: TOKEN_URL, iat, exp: iat + 3600 }));
    const signature = crypto.createSign('RSA-SHA256').update(`${header}.${claims}`).sign(key, 'base64url');

    const res = await fetchImpl(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: `${header}.${claims}.${signature}`,
      }),
    });
    if (!res.ok) throw new Error(`FCM: no se obtuvo el token de acceso (${res.status}).`);
    const body = await res.json();
    cached = { token: body.access_token, expiresAt: now() + 55 * 60 * 1000 };
    return cached.token;
  }

  // Envía la notificación a cada token. Devuelve cuántos se enviaron y qué tokens
  // ya no existen (la app se desinstaló o el token cambió) para desactivarlos.
  async function send(tokens, { title, body }) {
    const result = { sent: 0, failed: 0, invalidTokens: [] };
    if (!tokens.length) return result;
    const auth = await accessToken();
    const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

    const queue = [...tokens];
    const worker = async () => {
      while (queue.length) {
        const token = queue.shift();
        try {
          const res = await fetchImpl(url, {
            method: 'POST',
            headers: { Authorization: `Bearer ${auth}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: { token, notification: { title, body } } }),
          });
          if (res.ok) {
            result.sent += 1;
          } else {
            result.failed += 1;
            if (res.status === 404) result.invalidTokens.push(token); // UNREGISTERED: el token ya no existe
          }
        } catch {
          result.failed += 1;
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCIA, tokens.length) }, worker));
    return result;
  }

  return { isConfigured, send };
}

module.exports = { createFcmClient };
