const crypto = require('node:crypto');

// Firebase FALSO para pruebas: genera un par de llaves, sirve la llave pública como lo hace
// Google (fetchImpl) y firma ID tokens con la misma forma que los de Firebase Authentication.
// Así se prueba el verificador real sin internet.

const PROJECT_ID = 'liferpg-pruebas';

function crearFirebaseFalso({ projectId = PROJECT_ID, kid = 'llave-1' } = {}) {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  let descargas = 0;

  const fetchImpl = async () => {
    descargas += 1;
    return {
      ok: true,
      headers: { get: (h) => (h.toLowerCase() === 'cache-control' ? 'public, max-age=3600' : null) },
      json: async () => ({ [kid]: publicKey.export({ type: 'spki', format: 'pem' }) }),
    };
  };

  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');

  // Token como el de Firebase; "cambios" permite romperlo a propósito en las pruebas
  function token({ uid = 'uid-1', email = 'yess@liferpg.mx', verified = false, provider = 'password', name, ...cambios } = {}) {
    const ahora = Math.floor(Date.now() / 1000);
    const claims = {
      iss: `https://securetoken.google.com/${projectId}`,
      aud: projectId,
      auth_time: ahora - 10,
      iat: ahora - 10,
      exp: ahora + 3600,
      sub: uid,
      user_id: uid,
      email,
      email_verified: verified,
      ...(name && { name }),
      firebase: { sign_in_provider: provider },
      ...cambios.claims,
    };
    const header = b64({ alg: 'RS256', kid: cambios.kid ?? kid, typ: 'JWT' });
    const body = b64(claims);
    const firma = crypto.sign('RSA-SHA256', Buffer.from(`${header}.${body}`), cambios.otraLlave ?? privateKey).toString('base64url');
    return `${header}.${body}.${firma}`;
  }

  return { projectId, fetchImpl, token, descargas: () => descargas };
}

module.exports = { crearFirebaseFalso, PROJECT_ID };
