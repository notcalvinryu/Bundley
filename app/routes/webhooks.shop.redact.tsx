import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

/**
 * GDPR compliance webhook: shop/redact
 *
 * Shopify sends this 48 hours after a shop uninstalls your app, signalling that
 * you must erase all data you hold for that shop. We delete every record scoped
 * to the shop: offers (tiers cascade via the relation) and any sessions.
 *
 * Webhooks can be delivered more than once, so this is written to be
 * idempotent — deleting already-deleted rows is a no-op.
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} for ${shop}; erasing all shop data.`);

  // Tier rows are removed automatically via `onDelete: Cascade` on Offer.
  await db.offer.deleteMany({ where: { shop } });
  await db.session.deleteMany({ where: { shop } });

  return new Response();
};
