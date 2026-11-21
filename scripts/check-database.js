const { getPrisma, disconnect } = require('../src/shared/infrastructure/database/prisma');

const expected = [
  'users', 'devices', 'sessions', 'password_resets', 'player_profiles', 'outfits', 'habits',
  'habit_check_ins', 'missions', 'focus_sessions', 'inventory_entries', 'inventory_movements',
  'achievements', 'user_achievements', 'mood_logs', 'journal_entries', 'friendships', 'friend_codes',
  'gift_requests', 'gift_transfers', 'activity_notes', 'inactivity_alerts', 'sticker_messages',
  'daily_closures', 'group_challenges', 'challenge_participants', 'challenge_contributions',
  'request_logs', 'catalog_categories', 'catalog_items', 'economy_versions', 'push_campaigns',
  'icon_assets', 'backup_records', 'purge_runs',
];

async function main() {
  const db = getPrisma();
  await db.$runCommandRaw({ ping: 1 });

  const result = await db.$runCommandRaw({ listCollections: 1, nameOnly: true });
  const names = result.cursor.firstBatch.map((c) => c.name);
  const missing = expected.filter((name) => !names.includes(name));
  if (missing.length) throw new Error(`Faltan colecciones: ${missing.join(', ')}`);

  const extra = names.filter((name) => !expected.includes(name));
  if (extra.length) throw new Error(`Colecciones inesperadas: ${extra.join(', ')}`);

  const [users, catalogItems] = await Promise.all([db.user.count(), db.catalogItem.count()]);
  console.log(`Conexión correcta · ${expected.length} colecciones · users=${users} · catalog_items=${catalogItems}`);
}

main()
  .catch((err) => {
    console.error('No se pudo verificar MongoDB. Revisa la URI, permisos y acceso de red.', err.code || '');
    process.exitCode = 1;
  })
  .finally(disconnect);
