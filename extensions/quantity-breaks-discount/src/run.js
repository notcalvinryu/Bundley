// @ts-check
import { DiscountApplicationStrategy } from "../generated/api";

/**
 * @typedef {import("../generated/api").RunInput} RunInput
 * @typedef {import("../generated/api").FunctionRunResult} FunctionRunResult
 * @typedef {import("../generated/api").Target} Target
 */

/**
 * @type {FunctionRunResult}
 */
const EMPTY_DISCOUNT = {
  discountApplicationStrategy: DiscountApplicationStrategy.First,
  discounts: [],
};

/**
 * Buy X, get Y across a product's cart lines. The bundle's units may be split
 * over several variant lines (mix-and-match) at different prices, so we expand
 * the lines into individual units, pick the cheapest Y units (Shopify's
 * standard BXGY rule), and discount exactly those units via per-line quantity
 * targets — precise even when variants differ in price.
 *
 * @param {any} config
 * @param {number} totalQty  combined quantity of the product across its lines
 * @param {{ id: string, quantity: number, price: number }[]} lines
 */
function bxgyDiscount(config, totalQty, lines) {
  const tiers = (config.tiers || [])
    .filter((t) => t && typeof t.quantity === "number")
    .map((t) => {
      const y = typeof t.getQuantity === "number" ? t.getQuantity : 0;
      return {
        x: t.quantity,
        y,
        total: t.quantity + y,
        type: t.discountType,
        value: t.discountValue,
        badge: t.badgeText,
      };
    })
    .filter((t) => t.y > 0 && t.value > 0)
    .sort((a, b) => b.total - a.total);

  // Prefer an exact total; otherwise the best tier the total still meets.
  const tier =
    tiers.find((t) => t.total === totalQty) ||
    tiers.find((t) => totalQty >= t.total);
  if (!tier) return null;

  // Expand lines into individual units, then take the cheapest Y as the reward.
  const units = [];
  for (const line of lines) {
    for (let i = 0; i < line.quantity; i++) {
      units.push({ id: line.id, price: line.price });
    }
  }
  units.sort((a, b) => a.price - b.price);
  const rewarded = units.slice(0, tier.y);
  if (rewarded.length === 0) return null;

  // Count how many rewarded units fall on each line → quantity-scoped targets.
  const perLine = new Map();
  for (const u of rewarded) perLine.set(u.id, (perLine.get(u.id) || 0) + 1);
  /** @type {Target[]} */
  const targets = [];
  perLine.forEach((quantity, id) => {
    targets.push({ cartLine: { id, quantity } });
  });

  const message =
    (config.theme && config.theme.discountName) ||
    tier.badge ||
    `Buy ${tier.x}, get ${tier.y} on ${config.title || "this item"}`;

  if (tier.type === "PERCENT") {
    let pct = tier.value;
    if (pct <= 0) return null;
    if (pct > 100) pct = 100;
    return {
      message,
      targets,
      value: { percentage: { value: String(pct) } },
    };
  }

  if (tier.type === "FIXED_PER_UNIT") {
    if (!(tier.value > 0)) return null;
    return {
      message,
      targets,
      value: {
        fixedAmount: {
          amount: String(tier.value),
          appliesToEachItem: true,
        },
      },
    };
  }

  return null;
}

/**
 * Build the quantity-break discount for a product, from its combined quantity
 * across all of its cart lines, applied to every one of those lines.
 *
 * @param {any} config
 * @param {number} totalQty
 * @param {Target[]} targets
 */
function quantityBreakDiscount(config, totalQty, targets) {
  const tiers = (config.tiers || [])
    .filter((tier) => tier && typeof tier.quantity === "number")
    .sort((a, b) => b.quantity - a.quantity);

  // The best tier whose quantity threshold the combined total meets.
  const tier = tiers.find((t) => totalQty >= t.quantity);
  if (!tier || !(tier.discountValue > 0)) return null;

  const message =
    (config.theme && config.theme.discountName) ||
    tier.badgeText ||
    `Buy ${tier.quantity}, save on ${config.title || "this item"}`;

  if (tier.discountType === "PERCENT") {
    return {
      message,
      targets,
      value: { percentage: { value: String(tier.discountValue) } },
    };
  }

  if (tier.discountType === "FIXED_PER_UNIT") {
    return {
      message,
      targets,
      value: {
        fixedAmount: {
          amount: String(tier.discountValue),
          appliesToEachItem: true,
        },
      },
    };
  }

  return null;
}

/**
 * Applies each configured offer's discount. The offer config is read from the
 * product's `quantity_breaks.config` metafield. Because mix-and-match bundles
 * spread a product's units across multiple variant lines, we group cart lines
 * by product, total their quantity, pick the tier from that total, and discount
 * all of the product's lines together.
 *
 * @param {RunInput} input
 * @returns {FunctionRunResult}
 */
export function run(input) {
  /**
   * @type {Map<string, {
   *   config: any,
   *   total: number,
   *   lines: { id: string, quantity: number, price: number }[],
   * }>}
   */
  const groups = new Map();

  for (const line of input.cart.lines) {
    const merchandise = line.merchandise;
    if (merchandise.__typename !== "ProductVariant") continue;

    const raw = merchandise.product?.metafield?.value;
    const productId = merchandise.product?.id;
    if (!raw || !productId) continue;

    let group = groups.get(productId);
    if (!group) {
      let config;
      try {
        config = JSON.parse(raw);
      } catch (_error) {
        continue;
      }
      group = { config, total: 0, lines: [] };
      groups.set(productId, group);
    }
    group.total += line.quantity;
    group.lines.push({
      id: line.id,
      quantity: line.quantity,
      price: parseFloat(line.cost?.amountPerQuantity?.amount ?? "0") || 0,
    });
  }

  const discounts = [];
  for (const { config, total, lines } of groups.values()) {
    if (!lines.length) continue;
    const targets = lines.map((l) => ({ cartLine: { id: l.id } }));
    const discount =
      config.type === "BXGY"
        ? bxgyDiscount(config, total, lines)
        : quantityBreakDiscount(config, total, targets);
    if (discount) discounts.push(discount);
  }

  if (discounts.length === 0) return EMPTY_DISCOUNT;

  return {
    discountApplicationStrategy: DiscountApplicationStrategy.First,
    discounts,
  };
}
