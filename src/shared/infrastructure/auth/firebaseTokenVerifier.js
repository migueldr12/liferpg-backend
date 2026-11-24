const crypto = require('node:crypto');
const { unauthorized } = require('../../errors/AppError');

// Verifica los ID tokens de Firebase Authentication SIN dependencias extra, siguiendo
// la guía oficial ("Verify ID tokens using a third-party JWT library"):
//   1. Firma RS256 con una de las llaves públicas de Google (se descargan y se guardan
//      en caché el tiempo que indica Cache-Control).
//   2. aud = Project ID de Firebase, iss = https://securetoken.google.com/<Project ID>.
//   3. exp en el futuro, iat y auth_time en el pasado, sub (uid) no vacío.
// Solo necesita FIREBASE_PROJECT_ID (no es secreto: es el mismo de la app).
//
// fetchImpl y now se reemplazan en las pruebas.

const CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
const TOLERANCIA_S = 60; // diferencia de reloj aceptada entre servidores

const decode = (part) => JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));

function createFirebaseTokenVerifier({ projectId = process.env.FIREBASE_PROJECT_ID, fetchImpl = fetch, now = () => Date.now() } = {}) {
  let cache = { keys: null, expiresAt: 0 };

  const isConfigured = () => Boolean(projectId);

  async function publicKeys() {
    if (cache.keys && cache.expiresAt > now()) return cache.keys;
    const res = await fetchImpl(CERTS_URL);
    if (!res.ok) throw new Error(`Firebase: no se pudieron descargar las llaves públicas (${res.status}).`);
    const maxAge = Number(/max-age=(\d+)/.exec(res.headers?.get?.('cache-control') ?? '')?.[1] ?? 3600);
    const pems = await res.json();
    const keys = Object.fromEntries(Object.entries(pems).map(([kid, pem]) => [kid, crypto.createPublicKey(pem)]));
    cache = { keys, expiresAt: now() + maxAge * 1000 };
    return keys;
  }

  // Devuelve los datos del usuario del token o lanza 401 con un mensaje para la app
  async function verify(token) {
    if (!isConfigured()) {
      throw unauthorized('El servidor no tiene FIREBASE_PROJECT_ID en su .env: no puede validar el inicio de sesión.');
    }
    const parts = String(token ?? '').split('.');
    if (parts.length !== 3) throw unauthorized('La sesión no es válida. Vuelve a iniciar sesión.');

    let header;
    let claims;
    try {
      header = decode(parts[0]);
      claims = decode(parts[1]);
    } catch {
      throw unauthorized('La sesión no es válida. Vuelve a iniciar sesión.');
    }
    if (header.alg !== 'RS256' || !header.kid) throw unauthorized('La sesión no es válida. Vuelve a iniciar sesión.');

    let keys = await publicKeys();
    if (!keys[header.kid]) {
      cache.expiresAt = 0; // Google rota sus llaves: se vuelven a pedir una vez
      keys = await publicKeys();
    }
    const key = keys[header.kid];
    const firma = Buffer.from(parts[2], 'base64url');
    if (!key || !crypto.verify('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), key, firma)) {
      throw unauthorized('La sesión no es válida. Vuelve a iniciar sesión.');
    }

    const ahora = Math.floor(now() / 1000);
    if (claims.aud !== projectId || claims.iss !== `https://securetoken.google.com/${projectId}`) {
      throw unauthorized('La sesión es de otro proyecto de Firebase.');
    }
    if (!(claims.exp > ahora - TOLERANCIA_S)) throw unauthorized('La sesión expiró. Vuelve a iniciar sesión.');
    if (claims.iat > ahora + TOLERANCIA_S || claims.auth_time > ahora + TOLERANCIA_S) {
      throw unauthorized('La sesión no es válida. Vuelve a iniciar sesión.');
    }
    if (typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 128) {
      throw unauthorized('La sesión no es válida. Vuelve a iniciar sesión.');
    }

    return {
      uid: claims.sub,
      email: claims.email ? String(claims.email).toLowerCase() : null,
      emailVerified: claims.email_verified === true,
      name: claims.name ?? null,
      picture: claims.picture ?? null,
      provider: claims.firebase?.sign_in_provider ?? null, // "password" | "google.com"
    };
  }

  return { isConfigured, verify };
}

module.exports = { createFirebaseTokenVerifier };
