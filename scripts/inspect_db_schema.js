#!/usr/bin/env node
/*
  Inspect DB schema script

  Usage (locally):
    export DATABASE_URL="postgres://..." 
    pnpm add -w pg   # if pg not installed
    node scripts/inspect_db_schema.js

  This prints JSON with tables, columns, indexes, functions (matching get_%stats%), and RLS policies.
*/

const { Client } = require('pg')

async function run() {
  const url = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL
  if (!url) {
    console.error('ERROR: set DATABASE_URL (Supabase) in env before running')
    process.exit(2)
  }

  const client = new Client({ connectionString: url })
  try {
    await client.connect()

    const out = {}

    // list public tables
    const tablesRes = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `)
    out.tables = tablesRes.rows.map(r => r.table_name)

    // columns for links and link_clicks
    async function columnsFor(table) {
      const res = await client.query("SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position", [table])
      return res.rows
    }
    out.links_columns = await columnsFor('links')
    out.link_clicks_columns = await columnsFor('link_clicks')

    // indexes
    const idxRes = await client.query("SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname='public' AND tablename IN ('links','link_clicks') ORDER BY tablename, indexname")
    out.indexes = idxRes.rows

    // functions: list functions matching patterns used for analytics
    const fnRes = await client.query("SELECT proname, pg_get_functiondef(p.oid) AS def FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND (proname ILIKE 'get_%' OR proname ILIKE 'insert_%' OR proname ILIKE 'refresh_%') ORDER BY proname")
    out.functions = fnRes.rows

    // RLS policies (pg_policies view may exist)
    try {
      const polRes = await client.query("SELECT * FROM pg_policies WHERE schemaname = 'public'")
      out.policies = polRes.rows
    } catch (e) {
      // fallback: try pg_catalog listing
      try {
        const polRes2 = await client.query("SELECT polname, polrelid::regclass::text AS table_name, polcmd, polpermissive, polroles, polqual::text AS using, polwithcheck::text AS with_check FROM pg_policy JOIN pg_class ON pg_policy.polrelid = pg_class.oid WHERE pg_namespace = 'public'")
        out.policies = polRes2.rows
      } catch (e2) {
        out.policies_error = String(e2)
      }
    }

    // check existence of profile_id column in links
    const colCheck = out.links_columns.find(c => c.column_name === 'profile_id')
    out.links_has_profile_id = !!colCheck

    console.log(JSON.stringify(out, null, 2))
  } catch (err) {
    console.error('Error inspecting DB:', err)
    process.exitCode = 1
  } finally {
    try { await client.end() } catch (e) {}
  }
}

run()
