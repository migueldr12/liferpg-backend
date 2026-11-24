// RDF006 · iniciarSesion (lado servidor). Va en TODAS las rutas de /api/v1.
// Si la petición trae "Authorization: Bearer <ID token de Firebase>":
//   - token válido   → req.user = { id, firebaseUid, email } (el _id del usuario en MongoDB)
//   - token inválido → req.authError (currentUser lo responde con 401)
// Sin el encabezado no hace nada: siguen funcionando x-user-id / DEV_USER_ID en desarrollo.

const BEARER = /^Bearer\s+(.+)$/i;

function makeSesionFirebase({ verifier, identificarUsuarioFirebase }) {
  return async (req, res, next) => {
    const token = BEARER.exec(req.get('authorization') ?? '')?.[1];
    if (!token) return next();
    try {
      const claims = await verifier.verify(token);
      const user = await identificarUsuarioFirebase(claims);
      req.user = { id: user.id, firebaseUid: claims.uid, email: user.email };
    } catch (err) {
      req.authError = err;
    }
    return next();
  };
}

module.exports = { makeSesionFirebase };
