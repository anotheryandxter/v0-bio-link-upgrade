Title: Setting Supabase environment variables on Vercel

Do NOT paste secrets into public channels. The commands below show how to add your Supabase keys to the Vercel project using the Vercel CLI or the Dashboard. Run these locally on your machine where the secret values are available.

Using the Vercel dashboard (recommended)
- Go to your Vercel project -> Settings -> Environment Variables
- Add the following variables for the Production environment:
  - NEXT_PUBLIC_SUPABASE_URL (example: https://your-project.supabase.co)
  - NEXT_PUBLIC_SUPABASE_ANON_KEY
  - SUPABASE_SERVICE_ROLE_KEY

Using the Vercel CLI (example)
Replace <VALUE> with the actual secret on your machine. Run each command once.

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# When prompted, paste the URL and press Enter

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# Paste the anon key

vercel env add SUPABASE_SERVICE_ROLE_KEY production
# Paste the service role key (secret)
```

Alternative (non-interactive) using environment variables + `vercel env add` is intentionally interactive. If you prefer automation you can use the Vercel API to create environment variables — that requires a Vercel token with scope to modify the project.

After setting the variables
- Trigger a new deployment (push a small commit or run `npx vercel --prod`) so the new build can access the secrets. The server handler (`pages/api/uploads.js`) will read `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` at runtime.

Quick smoke-test (once envs are set and deployment finished)

```bash
# Upload a small image to the deployed uploads API (replace <DEPLOY_URL> with your production URL)
curl -v -F "file=@./test/fixtures/1x1.png" "https://<DEPLOY_URL>/api/uploads"
```

Check the JSON response for variant URLs or the original URL if Sharp wasn't available in the build.
