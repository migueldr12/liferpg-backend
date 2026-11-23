// CORS para la app móvil (Expo web) y la PWA. Sin dependencias extra:
// responde el preflight OPTIONS y solo refleja los orígenes permitidos.
function cors(allowedOrigins) {
  const any = allowedOrigins.includes('*');
  return (req, res, next) => {
    const origin = req.headers.origin;
    if (origin && (any || allowedOrigins.includes(origin))) {
      res.setHeader('Access-Control-Allow-Origin', any ? '*' : origin);
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      if (!any) res.setHeader('Vary', 'Origin');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    return next();
  };
}

module.exports = { cors };
