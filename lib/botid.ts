"use server";

/**
 * Lightweight BotID helper.
 * - Uses dynamic import and tries a few common client shapes to be resilient across versions.
 * - Safe no-op when BOTID_TOKEN is not provided.
 */
export async function sendBotMessage(title: string, text: string, opts?: {conversation?: string}) {
  const token = process.env.BOTID_TOKEN || process.env.BOT_ID_TOKEN || process.env.VERCEL_BOT_TOKEN;
  if (!token) {
    console.warn('sendBotMessage: BOTID token not configured, skipping message');
    return {ok: false, reason: 'no-token'};
  }

  try {
    const mod = await import('botid');

    // Try common shapes:
    // 1) module itself is a function like send(token, payload)
    if (typeof (mod as any) === 'function') {
      // @ts-ignore
      await (mod as any)(token, {title, text, conversation: opts?.conversation});
      return {ok: true};
    }

    // 2) default export or named 'default' has send
    const client = (mod as any).default ?? mod;

    // 3) If there's a constructor function
    if (typeof client === 'function') {
      try {
        const instance = new client({token});
        if (typeof instance.send === 'function') {
          await instance.send({title, text, conversation: opts?.conversation});
          return {ok: true};
        }
      } catch (e) {
        // fallthrough
      }
    }

    // 4) If client exposes sendMessage or send
    if (client && typeof client.sendMessage === 'function') {
      await client.sendMessage({title, text, conversation: opts?.conversation});
      return {ok: true};
    }

    if (client && typeof client.send === 'function') {
      await client.send({title, text, conversation: opts?.conversation});
      return {ok: true};
    }

    // 5) If module exports a `Bot` class
    if ((mod as any).Bot || (mod as any).BotID) {
      const BotCtor = (mod as any).Bot ?? (mod as any).BotID;
      const inst = new BotCtor({token});
      if (typeof inst.send === 'function') {
        await inst.send({title, text, conversation: opts?.conversation});
        return {ok: true};
      }
    }

    console.warn('sendBotMessage: unrecognized botid client shape', Object.keys(mod as any));
    return {ok: false, reason: 'unknown-client'};
  } catch (err) {
    console.error('sendBotMessage error', err);
    return {ok: false, reason: 'error', error: String(err)};
  }
}

export default sendBotMessage;
