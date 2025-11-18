import { NextRequest } from 'next/server';
import sendBotMessage from '../../../../lib/botid';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const secret = process.env.INTERNAL_BOT_SECRET || process.env.BOTID_INTERNAL_SECRET;
  const header = request.headers.get('x-internal-secret');
  const auth = request.headers.get('authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const urlSecret = request.nextUrl.searchParams.get('secret');

  // Accept either x-internal-secret, Authorization: Bearer <secret>, or ?secret=<secret>
  const authorized = secret && (header === secret || bearer === secret || urlSecret === secret);
  if (!authorized) {
    return new Response(JSON.stringify({ok: false, reason: 'unauthorized'}), {status: 401, headers: {'content-type': 'application/json'}});
  }

  try {
    const body = await request.json().catch(() => ({}));
    const title = body.title || 'Vercel Bot Trigger';
    const text = body.text || `Triggered at ${new Date().toISOString()}`;
    const conversation = body.conversation;

    const res = await sendBotMessage(title, text, conversation ? {conversation} : undefined);
    return new Response(JSON.stringify(res), {status: 200, headers: {'content-type': 'application/json'}});
  } catch (err) {
    return new Response(JSON.stringify({ok: false, reason: 'error', error: String(err)}), {status: 500, headers: {'content-type': 'application/json'}});
  }
}

export async function GET() {
  return new Response(JSON.stringify({ok: true, info: 'POST to this route with x-internal-secret header or Authorization: Bearer <secret> to send message'}), {status: 200, headers: {'content-type': 'application/json'}});
}
