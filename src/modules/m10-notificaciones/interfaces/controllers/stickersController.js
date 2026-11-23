const { asyncHandler } = require('../../../../shared/utils/asyncHandler');
const {
  parseId, validateSendSticker, validateCatalogQuery, validateHistoryQuery, validateMarkSeenBody,
} = require('../validators/m10Validators');

function createStickersController({ consultarCatalogo, enviar, consultarHistorial, marcarVisto }) {
  return {
    // GET /stickers/catalogo
    catalogo: asyncHandler(async (req, res) => {
      res.json(await consultarCatalogo(validateCatalogQuery(req.query)));
    }),

    // POST /stickers
    enviar: asyncHandler(async (req, res) => {
      const input = validateSendSticker(req.body);
      const created = await enviar({ senderId: req.user.id, senderName: req.user.displayName, ...input });
      res.status(201).json(created);
    }),

    // GET /stickers/historial  (el total viaja en X-Total-Count; el cuerpo es la lista)
    historial: asyncHandler(async (req, res) => {
      const { items, total } = await consultarHistorial({ userId: req.user.id, ...validateHistoryQuery(req.query) });
      res.set('X-Total-Count', String(total));
      res.set('Access-Control-Expose-Headers', 'X-Total-Count');
      res.json(items);
    }),

    // PATCH /stickers/:id/visto
    marcarUno: asyncHandler(async (req, res) => {
      res.json(await marcarVisto({ userId: req.user.id, id: parseId(req.params.id, 'id') }));
    }),

    // PATCH /stickers/visto  (body opcional { ids }: sin ids marca todos los pendientes)
    marcarVarios: asyncHandler(async (req, res) => {
      res.json(await marcarVisto({ userId: req.user.id, ...validateMarkSeenBody(req.body) }));
    }),
  };
}

module.exports = { createStickersController };
