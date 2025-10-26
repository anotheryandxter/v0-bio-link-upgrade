#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import { Client } from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const files = ['scripts/000_combined_migration.sql']

async function run() {
  const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL
  if (!connectionString) {
    console.error('Missing POSTGRES_URL in environment')
    process.exit(1)
  }
  const client = new Client({ connectionString })
  await client.connect()
  for (const file of files) {
    const sql = fs.readFileSync(path.resolve(process.cwd(), file), 'utf8')
    try {
      await client.query(sql)
      console.log('✔', file)
    } catch (err) {
      console.error('✖', file, err.message)
    }
  }
  await client.end()
}

run()
