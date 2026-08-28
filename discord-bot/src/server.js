import express from 'express';
import { buildArchivistRequestComponents } from './archivistActions.js';

/**
 * Internal HTTP server that receives real-time event notifications
 * forwarded from the website (see src/lib/discordBot.ts on the site,
 * called from src/pages/api/webhooks/*.ts webhook handlers).
 *
 * POST /events
 * Headers: Authorization: Bearer <BOT_WEBHOOK_SECRET>
 * Body: { type: 'sprite.created' | 'sprite.approved' | ..., data: {...} }
 */
export function startEventServer(notifier) {
  const app = express();
  app.use(express.json());

  app.post('/events', async (req, res) => {
    const secret = process.env.BOT_WEBHOOK_SECRET;
    const authHeader = req.headers.authorization;

    if (secret && authHeader !== `Bearer ${secret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { type, data } = req.body ?? {};

    try {
      await handleEvent(notifier, type, data);
      res.json({ success: true });
    } catch (err) {
      console.error(`[events] Failed to handle "${type}":`, err);
      res.status(500).json({ error: 'Failed to handle event' });
    }
  });

  app.get('/healthz', (_req, res) => res.json({ ok: true }));

  const port = process.env.PORT || 3100;
  app.listen(port, () => console.log(`[events] listening on :${port}`));
}

async function handleEvent(notifier, type, data) {
  switch (type) {
    case 'sprite.created':
      await notifier.sendToOwner(
        `New sprite uploaded: **${data?.title ?? 'Untitled'}** by ${data?.author ?? 'unknown'}`
      );
      break;
    case 'archivist.requested':
      await notifier.sendToOwner(
        `🗂️ Archivist access requested by **${data?.displayName ?? data?.username ?? 'unknown user'}**` +
          (data?.username ? ` (@${data.username})` : '') +
          `\nUser ID: ${data?.userId ?? 'unknown'}`,
        { components: data?.userId ? buildArchivistRequestComponents(data.userId) : [] }
      );
      break;
    default:
      console.warn(`[events] Unhandled event type: ${type}`);
  }
}
