{
  "info": {
    "name": "Life-RPG · M10 Notificaciones de Acompañamiento",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    "description": "Corre primero `pnpm seed:m10` y luego `pnpm dev`. Autenticación temporal con el encabezado X-User-Id (se reemplaza por JWT cuando M00 lo entregue)."
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000/api/v1"
    },
    {
      "key": "ana",
      "value": "650000000000000000000001"
    },
    {
      "key": "beto",
      "value": "650000000000000000000002"
    },
    {
      "key": "carla",
      "value": "650000000000000000000003"
    },
    {
      "key": "admin",
      "value": "650000000000000000000004"
    },
    {
      "key": "dani",
      "value": "650000000000000000000005"
    },
    {
      "key": "sticker1",
      "value": "650000000000000000000501"
    },
    {
      "key": "sticker2",
      "value": "650000000000000000000503"
    },
    {
      "key": "stickerId",
      "value": ""
    }
  ],
  "item": [
    {
      "name": "0 · Preparación (corre primero)",
      "item": [
        {
          "name": "Estado del servidor",
          "event": [
            {
              "listen": "test",
              "script": {
                "type": "text/javascript",
                "exec": [
                  "pm.test('Status 200', () => pm.response.to.have.status(200));"
                ]
              }
            }
          ],
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/estado",
              "host": [
                "{{baseUrl}}"
              ],
              "path": [
                "estado"
              ]
            }
          }
        }
      ]
    },
    {
      "name": "RDF107 · Catálogo de stickers",
      "item": [
        {
          "name": "Catálogo completo (Ana)",
          "event": [
            {
              "listen": "test",
              "script": {
                "type": "text/javascript",
                "exec": [
                  "pm.test('Status 200', () => pm.response.to.have.status(200));"
                ]
              }
            }
          ],
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "X-User-Id",
                "value": "{{ana}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/notificaciones/stickers/catalogo",
              "host": [
                "{{baseUrl}}"
              ],
              "path": [
                "notificaciones",
                "stickers",
                "catalogo"
              ]
            }
          }
        },
        {
          "name": "Catálogo de una categoría",
          "event": [
            {
              "listen": "test",
              "script": {
                "type": "text/javascript",
                "exec": [
                  "pm.test('Status 200', () => pm.response.to.have.status(200));"
                ]
              }
            }
          ],
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "X-User-Id",
                "value": "{{ana}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/notificaciones/stickers/catalogo?categoryId=650000000000000000000401",
              "host": [
                "{{baseUrl}}"
              ],
              "path": [
                "notificaciones",
                "stickers",
                "catalogo"
              ],
              "query": [
                {
                  "key": "categoryId",
                  "value": "650000000000000000000401"
                }
              ]
            }
          }
        },
        {
          "name": "categoryId inválido → 400",
          "event": [
            {
              "listen": "test",
              "script": {
                "type": "text/javascript",
                "exec": [
                  "pm.test('Status 400', () => pm.response.to.have.status(400));"
                ]
              }
            }
          ],
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "X-User-Id",
                "value": "{{ana}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/notificaciones/stickers/catalogo?categoryId=abc",
              "host": [
                "{{baseUrl}}"
              ],
              "path": [
                "notificaciones",
                "stickers",
                "catalogo"
              ],
              "query": [
                {
                  "key": "categoryId",
                  "value": "abc"
                }
              ]
            }
          }
        },
        {
          "name": "Sin X-User-Id → 401",
          "event": [
            {
              "listen": "test",
              "script": {
                "type": "text/javascript",
                "exec": [
                  "pm.test('Status 401', () => pm.response.to.have.status(401));"
                ]
              }
            }
          ],
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/notificaciones/stickers/catalogo",
              "host": [
                "{{baseUrl}}"
              ],
              "path": [
                "notificaciones",
                "stickers",
                "catalogo"
              ]
            }
          }
        }
      ]
    },
    {
      "name": "RDF108 · Enviar sticker",
      "item": [
        {
          "name": "Ana envía a Beto",
          "event": [
            {
              "listen": "test",
              "script": {
                "type": "text/javascript",
                "exec": [
                  "pm.test('Status 201', () => pm.response.to.have.status(201));"
                ]
              }
            },
            {
              "listen": "test",
              "script": {
                "type": "text/javascript",
                "exec": [
                  "const b = pm.response.json(); if (Array.isArray(b) && b[0]) pm.collectionVariables.set('stickerId', b[0].id);"
                ]
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "X-User-Id",
                "value": "{{ana}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/notificaciones/stickers",
              "host": [
                "{{baseUrl}}"
              ],
              "path": [
                "notificaciones",
                "stickers"
              ]
            },
            "body": {
              "mode": "raw",
              "raw": "{\n  \"recipientIds\": [\n    \"{{beto}}\"\n  ],\n  \"catalogItemId\": \"{{sticker1}}\",\n  \"message\": \"¡Tú puedes!\"\n}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            }
          }
        },
        {
          "name": "Ana envía a Beto y Carla",
          "event": [
            {
              "listen": "test",
              "script": {
                "type": "text/javascript",
                "exec": [
                  "pm.test('Status 201', () => pm.response.to.have.status(201));"
                ]
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "X-User-Id",
                "value": "{{ana}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/notificaciones/stickers",
              "host": [
                "{{baseUrl}}"
              ],
              "path": [
                "notificaciones",
                "stickers"
              ]
            },
            "body": {
              "mode": "raw",
              "raw": "{\n  \"recipientIds\": [\n    \"{{beto}}\",\n    \"{{carla}}\"\n  ],\n  \"catalogItemId\": \"{{sticker2}}\"\n}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            }
          }
        },
        {
          "name": "A alguien que no es amigo → 403",
          "event": [
            {
              "listen": "test",
              "script": {
                "type": "text/javascript",
                "exec": [
                  "pm.test('Status 403', () => pm.response.to.have.status(403));"
                ]
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "X-User-Id",
                "value": "{{ana}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/notificaciones/stickers",
              "host": [
                "{{baseUrl}}"
              ],
              "path": [
                "notificaciones",
                "stickers"
              ]
            },
            "body": {
              "mode": "raw",
              "raw": "{\n  \"recipientIds\": [\n    \"{{dani}}\"\n  ],\n  \"catalogItemId\": \"{{sticker1}}\"\n}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            }
          }
        },
        {
          "name": "A sí misma → 400",
          "event": [
            {
              "listen": "test",
              "script": {
                "type": "text/javascript",
                "exec": [
                  "pm.test('Status 400', () => pm.response.to.have.status(400));"
                ]
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "X-User-Id",
                "value": "{{ana}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/notificaciones/stickers",
              "host": [
                "{{baseUrl}}"
              ],
              "path": [
                "notificaciones",
                "stickers"
              ]
            },
            "body": {
              "mode": "raw",
              "raw": "{\n  \"recipientIds\": [\n    \"{{ana}}\"\n  ],\n  \"catalogItemId\": \"{{sticker1}}\"\n}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            }
          }
        },
        {
          "name": "Sin destinatarios → 400",
          "event": [
            {
              "listen": "test",
              "script": {
                "type": "text/javascript",
                "exec": [
                  "pm.test('Status 400', () => pm.response.to.have.status(400));"
                ]
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "X-User-Id",
                "value": "{{ana}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/notificaciones/stickers",
              "host": [
                "{{baseUrl}}"
              ],
              "path": [
                "notificaciones",
                "stickers"
              ]
            },
            "body": {
              "mode": "raw",
              "raw": "{\n  \"catalogItemId\": \"{{sticker1}}\"\n}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            }
          }
        },
        {
          "name": "Sticker inexistente → 404",
          "event": [
            {
              "listen": "test",
              "script": {
                "type": "text/javascript",
                "exec": [
                  "pm.test('Status 404', () => pm.response.to.have.status(404));"
                ]
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "X-User-Id",
                "value": "{{ana}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/notificaciones/stickers",
              "host": [
                "{{baseUrl}}"
              ],
              "path": [
                "notificaciones",
                "stickers"
              ]
            },
            "body": {
              "mode": "raw",
              "raw": "{\n  \"recipientIds\": [\n    \"{{beto}}\"\n  ],\n  \"catalogItemId\": \"650000000000000000000999\"\n}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            }
          }
        },
        {
          "name": "Mensaje de más de 140 caracteres → 400",
          "event": [
            {
              "listen": "test",
              "script": {
                "type": "text/javascript",
                "exec": [
                  "pm.test('Status 400', () => pm.response.to.have.status(400));"
                ]
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "X-User-Id",
                "value": "{{ana}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/notificaciones/stickers",
              "host": [
                "{{baseUrl}}"
              ],
              "path": [
                "notificaciones",
                "stickers"
              ]
            },
            "body": {
              "mode": "raw",
              "raw": "{\n  \"recipientIds\": [\n    \"{{beto}}\"\n  ],\n  \"catalogItemId\": \"{{sticker1}}\",\n  \"message\": \"xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\"\n}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            }
          }
        }
      ]
    },
    {
      "name": "RDF109 · Historial de stickers",
      "item": [
        {
          "name": "Historial de Ana (todos)",
          "event": [
            {
              "listen": "test",
              "script": {
                "type": "text/javascript",
                "exec": [
                  "pm.test('Status 200', () => pm.response.to.have.status(200));"
                ]
              }
            }
          ],
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "X-User-Id",
                "value": "{{ana}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/notificaciones/stickers/historial",
              "host": [
                "{{baseUrl}}"
              ],
              "path": [
                "notificaciones",
                "stickers",
                "historial"
              ]
            }
          }
        },
        {
          "name": "Solo enviados por Ana",
          "event": [
            {
              "listen": "test",
              "script": {
                "type": "text/javascript",
                "exec": [
                  "pm.test('Status 200', () => pm.response.to.have.status(200));"
                ]
              }
            }
          ],
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "X-User-Id",
                "value": "{{ana}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/notificaciones/stickers/historial?tipo=enviados",
              "host": [
                "{{baseUrl}}"
              ],
              "path": [
                "notificaciones",
                "stickers",
                "historial"
              ],
              "query": [
                {
                  "key": "tipo",
                  "value": "enviados"
                }
              ]
            }
          }
        },
        {
          "name": "Recibidos por Beto",
          "event": [
            {
              "listen": "test",
              "script": {
                "type": "text/javascript",
                "exec": [
                  "pm.test('Status 200', () => pm.response.to.have.status(200));"
                ]
              }
            }
          ],
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "X-User-Id",
                "value": "{{beto}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/notificaciones/stickers/historial?tipo=recibidos",
              "host": [
                "{{baseUrl}}"
              ],
              "path": [
                "notificaciones",
                "stickers",
                "historial"
              ],
              "query": [
                {
                  "key": "tipo",
                  "value": "recibidos"
                }
              ]
            }
          }
        },
        {
          "name": "Recibidos de Ana, solo no vistos (Beto)",
          "event": [
            {
              "listen": "test",
              "script": {
                "type": "text/javascript",
                "exec": [
                  "pm.test('Status 200', () => pm.response.to.have.status(200));"
                ]
              }
            }
          ],
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "X-User-Id",
                "value": "{{beto}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/notificaciones/stickers/historial?soloNoVistos=true&friendId={{ana}}",
              "host": [
                "{{baseUrl}}"
              ],
              "path": [
                "notificaciones",
                "stickers",
                "historial"
              ],
              "query": [
                {
                  "key": "soloNoVistos",
                  "value": "true"
                },
                {
                  "key": "friendId",
                  "value": "{{ana}}"
                }
              ]
            }
          }
        },
        {
          "name": "Paginado (limit=1, page=1)",
          "event": [
            {
              "listen": "test",
              "script": {
                "type": "text/javascript",
                "exec": [
                  "pm.test('Status 200', () => pm.response.to.have.status(200));"
                ]
              }
            }
          ],
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "X-User-Id",
                "value": "{{ana}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/notificaciones/stickers/historial?limit=1&page=1",
              "host": [
                "{{baseUrl}}"
              ],
              "path": [
                "notificaciones",
                "stickers",
                "historial"
              ],
              "query": [
                {
                  "key": "limit",
                  "value": "1"
                },
                {
                  "key": "page",
                  "value": "1"
                }
              ]
            }
          }
        },
        {
          "name": "tipo inválido → 400",
          "event": [
            {
              "listen": "test",
              "script": {
                "type": "text/javascript",
                "exec": [
                  "pm.test('Status 400', () => pm.response.to.have.status(400));"
                ]
              }
            }
          ],
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "X-User-Id",
                "value": "{{ana}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/notificaciones/stickers/historial?tipo=otro",
              "host": [
                "{{baseUrl}}"
              ],
              "path": [
                "notificaciones",
                "stickers",
                "historial"
              ],
              "query": [
                {
                  "key": "tipo",
                  "value": "otro"
                }
              ]
            }
          }
        }
      ]
    },
    {
      "name": "RDF110 · Marcar stickers como vistos",
      "item": [
        {
          "name": "Beto marca uno como visto (usa el último enviado)",
          "event": [
            {
              "listen": "test",
              "script": {
                "type": "text/javascript",
                "exec": [
                  "pm.test('Status 200', () => pm.response.to.have.status(200));"
                ]
              }
            }
          ],
          "request": {
            "method": "PATCH",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "X-User-Id",
                "value": "{{beto}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/notificaciones/stickers/{{stickerId}}/visto",
              "host": [
                "{{baseUrl}}"
              ],
              "path": [
                "notificaciones",
                "stickers",
                "{{stickerId}}",
                "visto"
              ]
            }
          }
        },
        {
          "name": "Ana (remitente) no puede marcarlo → 404",
          "event": [
            {
              "listen": "test",
              "script": {
                "type": "text/javascript",
                "exec": [
                  "pm.test('Status 404', () => pm.response.to.have.status(404));"
                ]
              }
            }
          ],
          "request": {
            "method": "PATCH",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "X-User-Id",
                "value": "{{ana}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/notificaciones/stickers/{{stickerId}}/visto",
              "host": [
                "{{baseUrl}}"
              ],
              "path": [
                "notificaciones",
                "stickers",
                "{{stickerId}}",
                "visto"
              ]
            }
          }
        },
        {
          "name": "Beto marca todos los pendientes",
          "event": [
            {
              "listen": "test",
              "script": {
                "type": "text/javascript",
                "exec": [
                  "pm.test('Status 200', () => pm.response.to.have.status(200));"
                ]
              }
            }
          ],
          "request": {
            "method": "PATCH",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "X-User-Id",
                "value": "{{beto}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/notificaciones/stickers/visto",
              "host": [
                "{{baseUrl}}"
              ],
              "path": [
                "notificaciones",
                "stickers",
                "visto"
              ]
            },
            "body": {
              "mode": "raw",
              "raw": "{}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            }
          }
        },
        {
          "name": "Carla intenta marcar un sticker ajeno (updated: 0)",
          "event": [
            {
              "listen": "test",
              "script": {
                "type": "text/javascript",
                "exec": [
                  "pm.test('Status 200', () => pm.response.to.have.status(200));"
                ]
              }
            }
          ],
          "request": {
            "method": "PATCH",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "X-User-Id",
                "value": "{{carla}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/notificaciones/stickers/visto",
              "host": [
                "{{baseUrl}}"
              ],
              "path": [
                "notificaciones",
                "stickers",
                "visto"
              ]
            },
            "body": {
              "mode": "raw",
              "raw": "{\n  \"ids\": [\n    \"{{stickerId}}\"\n  ]\n}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            }
          }
        }
      ]
    },
    {
      "name": "RDF104/105 · Detectar y notificar inactividad (ADMIN)",
      "item": [
        {
          "name": "Simulación (dryRun) con umbral de 3 días",
          "event": [
            {
              "listen": "test",
              "script": {
                "type": "text/javascript",
                "exec": [
                  "pm.test('Status 200', () => pm.response.to.have.status(200));"
                ]
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "X-User-Id",
                "value": "{{admin}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/notificaciones/inactividad/ejecutar",
              "host": [
                "{{baseUrl}}"
              ],
              "path": [
                "notificaciones",
                "inactividad",
                "ejecutar"
              ]
            },
            "body": {
              "mode": "raw",
              "raw": "{\n  \"dryRun\": true,\n  \"thresholdDays\": 3\n}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            }
          }
        },
        {
          "name": "Ejecutar revisión real",
          "event": [
            {
              "listen": "test",
              "script": {
                "type": "text/javascript",
                "exec": [
                  "pm.test('Status 200', () => pm.response.to.have.status(200));"
                ]
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "X-User-Id",
                "value": "{{admin}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/notificaciones/inactividad/ejecutar",
              "host": [
                "{{baseUrl}}"
              ],
              "path": [
                "notificaciones",
                "inactividad",
                "ejecutar"
              ]
            },
            "body": {
              "mode": "raw",
              "raw": "{\n  \"thresholdDays\": 3\n}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            }
          }
        },
        {
          "name": "Ejecutar otra vez (no duplica avisos)",
          "event": [
            {
              "listen": "test",
              "script": {
                "type": "text/javascript",
                "exec": [
                  "pm.test('Status 200', () => pm.response.to.have.status(200));"
                ]
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "X-User-Id",
                "value": "{{admin}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/notificaciones/inactividad/ejecutar",
              "host": [
                "{{baseUrl}}"
              ],
              "path": [
                "notificaciones",
                "inactividad",
                "ejecutar"
              ]
            },
            "body": {
              "mode": "raw",
              "raw": "{}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            }
          }
        },
        {
          "name": "Un jugador no puede ejecutarla → 403",
          "event": [
            {
              "listen": "test",
              "script": {
                "type": "text/javascript",
                "exec": [
                  "pm.test('Status 403', () => pm.response.to.have.status(403));"
                ]
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "X-User-Id",
                "value": "{{ana}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/notificaciones/inactividad/ejecutar",
              "host": [
                "{{baseUrl}}"
              ],
              "path": [
                "notificaciones",
                "inactividad",
                "ejecutar"
              ]
            },
            "body": {
              "mode": "raw",
              "raw": "{}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            }
          }
        },
        {
          "name": "thresholdDays inválido → 400",
          "event": [
            {
              "listen": "test",
              "script": {
                "type": "text/javascript",
                "exec": [
                  "pm.test('Status 400', () => pm.response.to.have.status(400));"
                ]
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "X-User-Id",
                "value": "{{admin}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/notificaciones/inactividad/ejecutar",
              "host": [
                "{{baseUrl}}"
              ],
              "path": [
                "notificaciones",
                "inactividad",
                "ejecutar"
              ]
            },
            "body": {
              "mode": "raw",
              "raw": "{\n  \"thresholdDays\": 0\n}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            }
          }
        }
      ]
    },
    {
      "name": "RDF106 · Avisos de inactividad",
      "item": [
        {
          "name": "Avisos propios de Carla",
          "event": [
            {
              "listen": "test",
              "script": {
                "type": "text/javascript",
                "exec": [
                  "pm.test('Status 200', () => pm.response.to.have.status(200));"
                ]
              }
            }
          ],
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "X-User-Id",
                "value": "{{carla}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/notificaciones/avisos-inactividad?alcance=propios",
              "host": [
                "{{baseUrl}}"
              ],
              "path": [
                "notificaciones",
                "avisos-inactividad"
              ],
              "query": [
                {
                  "key": "alcance",
                  "value": "propios"
                }
              ]
            }
          }
        },
        {
          "name": "Avisos de los amigos de Ana",
          "event": [
            {
              "listen": "test",
              "script": {
                "type": "text/javascript",
                "exec": [
                  "pm.test('Status 200', () => pm.response.to.have.status(200));"
                ]
              }
            }
          ],
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "X-User-Id",
                "value": "{{ana}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/notificaciones/avisos-inactividad?alcance=amigos",
              "host": [
                "{{baseUrl}}"
              ],
              "path": [
                "notificaciones",
                "avisos-inactividad"
              ],
              "query": [
                {
                  "key": "alcance",
                  "value": "amigos"
                }
              ]
            }
          }
        },
        {
          "name": "Todos (propios + amigos) de Beto",
          "event": [
            {
              "listen": "test",
              "script": {
                "type": "text/javascript",
                "exec": [
                  "pm.test('Status 200', () => pm.response.to.have.status(200));"
                ]
              }
            }
          ],
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "X-User-Id",
                "value": "{{beto}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/notificaciones/avisos-inactividad",
              "host": [
                "{{baseUrl}}"
              ],
              "path": [
                "notificaciones",
                "avisos-inactividad"
              ]
            }
          }
        },
        {
          "name": "Incluir resueltos",
          "event": [
            {
              "listen": "test",
              "script": {
                "type": "text/javascript",
                "exec": [
                  "pm.test('Status 200', () => pm.response.to.have.status(200));"
                ]
              }
            }
          ],
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "X-User-Id",
                "value": "{{ana}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/notificaciones/avisos-inactividad?incluirResueltos=true",
              "host": [
                "{{baseUrl}}"
              ],
              "path": [
                "notificaciones",
                "avisos-inactividad"
              ],
              "query": [
                {
                  "key": "incluirResueltos",
                  "value": "true"
                }
              ]
            }
          }
        },
        {
          "name": "Dani no tiene amigos → lista vacía",
          "event": [
            {
              "listen": "test",
              "script": {
                "type": "text/javascript",
                "exec": [
                  "pm.test('Status 200', () => pm.response.to.have.status(200));"
                ]
              }
            }
          ],
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              },
              {
                "key": "X-User-Id",
                "value": "{{dani}}"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/notificaciones/avisos-inactividad?alcance=amigos",
              "host": [
                "{{baseUrl}}"
              ],
              "path": [
                "notificaciones",
                "avisos-inactividad"
              ],
              "query": [
                {
                  "key": "alcance",
                  "value": "amigos"
                }
              ]
            }
          }
        }
      ]
    }
  ]
}