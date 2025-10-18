#!/usr/bin/env node
// Run SQL files against a Postgres database using POSTGRES_URL env var
import fs from 'fs'
import path from 'path'
import { Client } from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const sqlFiles = [
  'scripts/001_create_database_schema.sql',
  'scripts/002_configure_rls_policies.sql',
  'scripts/003_insert_default_data.sql'
]

async function run() {
  const connectionString = process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL_NON_POOLING
  if (!connectionString) {
    console.error('Missing POSTGRES_URL in environment')
    process.exit(1)
  }

  const client = new Client({ connectionString })
  await client.connect()

  for (const file of sqlFiles) {
    const abs = path.resolve(process.cwd(), file)
    console.log('Running', abs)
    const sql = fs.readFileSync(abs, 'utf8')
    try {
      await client.query(sql)
      console.log('✔ Ran', file)
    } catch (err) {
      console.error('✖ Error running', file, err.message)
      await client.end()
      process.exit(1)
    }
  }

  await client.end()
  console.log('All SQL files executed')
}

run()
