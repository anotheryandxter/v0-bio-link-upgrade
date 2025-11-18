Title: BotID integration (Vercel)

This project includes a small helper and an internal API route to send messages via the `botid` package.

Environment variables
- `BOTID_TOKEN` or `BOT_ID_TOKEN`: BotID token used to authenticate when sending messages.
- `INTERNAL_BOT_SECRET`: secret string used to authenticate calls to `/api/internal/vercel-bot`.

How to test
1. Add the variables to your Vercel project (Settings -> Environment Variables) for the Production environment.
2. Deploy the app or trigger a new deployment so the runtime can access them.
3. Call the test endpoint from your machine (replace `<DEPLOY_URL>` and `<SECRET>`):

```bash
curl -X POST "https://<DEPLOY_URL>/api/internal/vercel-bot" \
  -H "Content-Type: application/json" \
  -H "x-internal-secret: <SECRET>" \
  -d '{"title":"Deploy complete","text":"Production deploy finished"}'
```

Files added
- `lib/botid.ts`: helper that dynamically imports `botid` and attempts to send messages using a few common client shapes.
- `app/api/internal/vercel-bot/route.ts`: protected route that requires `x-internal-secret` header and calls the helper.

Security
- Keep `BOTID_TOKEN` and `INTERNAL_BOT_SECRET` secret. Do not commit them to git.
- Use Vercel Deploy Hooks or the Vercel dashboard to trigger the route from your CI or deployment scripts.
