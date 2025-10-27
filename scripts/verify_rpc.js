const { Client } = require('pg');

const conn = process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
if (!conn) {
  console.error('No DATABASE_URL / POSTGRES_URL_NON_POOLING found in env. Set DATABASE_URL and retry.');
  process.exit(2);
}

const client = new Client({ connectionString: conn });

async function run() {
  await client.connect();

  console.log('\n1) Check functions (insert_click_if_not_exists, get_monthly_stats)');
  const funcs = await client.query(
    `SELECT proname, p.prosecdef AS is_security_definer, pg_get_functiondef(p.oid) AS definition
     FROM pg_proc p
     JOIN pg_namespace n ON p.pronamespace = n.oid
     WHERE p.proname IN ('insert_click_if_not_exists','get_monthly_stats')`
  );
  console.log('Functions found:', funcs.rowCount);
  funcs.rows.forEach(r => {
    console.log('---', r.proname, 'SECURITY_DEFINER=', r.is_security_definer ? true : false);
  });

  console.log('\n2) Check index on link_clicks.user_identifier');
  const idx = await client.query(
    `SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'link_clicks' AND indexname = 'idx_link_clicks_user_identifier'`
  );
  console.log('Index rows:', idx.rows.length, idx.rows);

  console.log('\n3) Select a recent link to test');
  const linkRes = await client.query(`SELECT id::text AS id, title FROM links ORDER BY created_at DESC LIMIT 1`);
  if (!linkRes.rows.length) {
    console.error('No links found in links table. Create a link first.');
    await client.end();
    process.exit(3);
  }
  const link = linkRes.rows[0];
  console.log('Using link:', link);

  const vuid = `vuid-node-${Date.now()}`;

  console.log('\n4) Call insert_click_if_not_exists (first time)');
  const r1 = await client.query(
    `SELECT insert_click_if_not_exists($1::uuid, $2::text, $3::text, $4::text, $5::inet) AS inserted`,
    [link.id, vuid, 'NodeTestAgent/1.0', 'https://example.test', '127.0.0.1']
  );
  console.log('Result 1:', r1.rows);

  console.log('\n5) Call insert_click_if_not_exists (second time, immediate)');
  const r2 = await client.query(
    `SELECT insert_click_if_not_exists($1::uuid, $2::text, $3::text, $4::text, $5::inet) AS inserted`,
    [link.id, vuid, 'NodeTestAgent/1.0', 'https://example.test', '127.0.0.1']
  );
  console.log('Result 2:', r2.rows);

  console.log('\n6) Query link_clicks rows for test vuid/link');
  const clicks = await client.query(
    `SELECT id::text, link_id::text, user_identifier, clicked_at, ip_address::text AS ip_address, user_agent
     FROM link_clicks
     WHERE link_id = $1::uuid AND user_identifier = $2
     ORDER BY clicked_at DESC`,
    [link.id, vuid]
  );
  console.log('link_clicks rows (count=' + clicks.rowCount + '):', clicks.rows);

  console.log('\n7) Call get_link_stats for the selected link (sample)');
  const stats = await client.query('SELECT * FROM get_link_stats($1::date, $2::date, $3::uuid, $4::text, $5::int, $6::int)', [null, null, link.id, null, 10, 0]);
  console.log('Link stats rows (count=' + stats.rowCount + '):', stats.rows);

  await client.end();
  console.log('\nDone.');
}

run().catch(err => {
  console.error('Error during verification:', err.message || err);
  process.exit(1);
});
