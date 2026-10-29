/*
  STEADFAST Cloudflare Worker
  ---------------------------
  - Serves the website from the /public folder.
  - POST /api/checkout turns the cart into a Stripe Checkout page.

  Prices, sizes and shipping are read from public/site-config.js, the same
  file the website uses, so the amount charged always matches the site.
  The browser only sends sizes and quantities; it never decides the price.

  Needs one secret: STRIPE_SECRET_KEY (see README.md).
*/

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/checkout") {
      if (request.method !== "POST") return json({ error: "Use POST." }, 405);
      try {
        return await checkout(request, env, url);
      } catch (err) {
        console.error(err);
        return json({ error: "Checkout isn't available right now. Please try again in a minute." }, 500);
      }
    }

    if (url.pathname === "/api/health") {
      const cfg = await loadConfig(env, url).catch(err => ({ error: err.message }));
      return json({ ok: !cfg.error, stripeKeySet: Boolean(env.STRIPE_SECRET_KEY), config: cfg });
    }

    // Everything else is a file from /public
    return env.ASSETS.fetch(request);
  },
};

async function checkout(request, env, url) {
  if (!env.STRIPE_SECRET_KEY) return json({ error: "Checkout isn't connected yet." }, 503);

  const cfg = await loadConfig(env, url);
  const body = await request.json().catch(() => null);
  const items = Array.isArray(body?.items) ? body.items : [];
  if (!items.length) return json({ error: "Your cart is empty." }, 400);
  if (items.length > 20) return json({ error: "Too many items in the cart." }, 400);

  // Merge duplicate sizes and check each one against site-config.js
  const bySize = new Map();
  for (const item of items) {
    const size = String(item?.size ?? "");
    const qty = Math.floor(Number(item?.qty));
    if (!cfg.sizes.includes(size)) return json({ error: `Size "${size}" isn't available.` }, 400);
    if (cfg.soldOut.includes(size)) return json({ error: `Size ${size} is sold out.` }, 400);
    if (!(qty >= 1 && qty <= 10)) return json({ error: "Quantity must be between 1 and 10." }, 400);
    bySize.set(size, (bySize.get(size) || 0) + qty);
  }

  const unit = Math.round(cfg.price * 100);
  const subtotal = [...bySize.values()].reduce((a, q) => a + q * unit, 0);
  const freeShipping = subtotal >= Math.round(cfg.freeOver * 100);

  const p = new URLSearchParams();
  p.set("mode", "payment");
  p.set("success_url", `${url.origin}/?checkout=success#home`);
  p.set("cancel_url", `${url.origin}/#product`);
  p.set("billing_address_collection", "auto");
  p.set("phone_number_collection[enabled]", "true");
  p.set("shipping_address_collection[allowed_countries][0]", "US");

  let i = 0;
  for (const [size, qty] of bySize) {
    p.set(`line_items[${i}][quantity]`, String(qty));
    p.set(`line_items[${i}][price_data][currency]`, "usd");
    p.set(`line_items[${i}][price_data][unit_amount]`, String(unit));
    p.set(`line_items[${i}][price_data][product_data][name]`, `${cfg.name} (${cfg.color}, ${size})`);
    if (cfg.preSale) p.set(`line_items[${i}][price_data][product_data][description]`, `Pre-order. Ships ${cfg.shipDateText}.`);
    i++;
  }

  addShipping(p, 0, freeShipping ? "Free standard shipping" : "Standard shipping", freeShipping ? 0 : cfg.standardPrice, cfg.standardDays);
  addShipping(p, 1, "Express shipping", cfg.expressPrice, cfg.expressDays);

  // Shown in the Stripe dashboard on every order
  p.set("metadata[sizes]", [...bySize].map(([s, q]) => `${s} x${q}`).join(", "));
  p.set("metadata[type]", cfg.preSale ? "pre-order" : "order");
  if (cfg.preSale) {
    p.set("custom_text[submit][message]", `This is a pre-order. Shipping starts ${cfg.shipDateText}.`);
    p.set("payment_intent_data[description]", `Pre-order: ${p.get("metadata[sizes]")}`);
  }

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: p,
  });
  const session = await res.json();
  if (!res.ok) {
    console.error("Stripe error", session?.error);
    return json({ error: "Checkout isn't available right now. Please try again in a minute." }, 502);
  }
  return json({ url: session.url });
}

function addShipping(p, n, name, dollars, days) {
  const k = `shipping_options[${n}][shipping_rate_data]`;
  p.set(`${k}[type]`, "fixed_amount");
  p.set(`${k}[display_name]`, name);
  p.set(`${k}[fixed_amount][amount]`, String(Math.round(dollars * 100)));
  p.set(`${k}[fixed_amount][currency]`, "usd");
  const [min, max] = String(days).split(/[–-]/).map(n => parseInt(n, 10));
  if (min && max) {
    p.set(`${k}[delivery_estimate][minimum][unit]`, "business_day");
    p.set(`${k}[delivery_estimate][minimum][value]`, String(min));
    p.set(`${k}[delivery_estimate][maximum][unit]`, "business_day");
    p.set(`${k}[delivery_estimate][maximum][value]`, String(max));
  }
}

/* Read the settings the website uses out of public/site-config.js */
async function loadConfig(env, url) {
  const res = await env.ASSETS.fetch(new Request(`${url.origin}/site-config.js`));
  if (!res.ok) throw new Error("site-config.js not found");
  const src = (await res.text())
    .replace(/\/\*[\s\S]*?\*\//g, "")          // block comments
    .replace(/(^|[^:"\\])\/\/.*$/gm, "$1");    // line comments

  const str = key => src.match(new RegExp(`\\b${key}\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`))?.[1]?.replace(/\\"/g, '"');
  const num = key => Number(src.match(new RegExp(`\\b${key}\\s*:\\s*(-?[\\d.]+)`))?.[1]);
  const list = key => {
    const m = src.match(new RegExp(`\\b${key}\\s*:\\s*\\[([^\\]]*)\\]`));
    return m ? [...m[1].matchAll(/"([^"]*)"/g)].map(x => x[1]) : null;
  };

  const cfg = {
    name: str("name"),
    color: str("color") || "",
    price: num("price"),
    sizes: list("sizes"),
    soldOut: list("soldOut") || [],
    preSale: /\bon\s*:\s*true\b/.test(src),
    shipDateText: str("shipDateText") || "",
    freeOver: num("freeOver"),
    standardPrice: num("standardPrice"),
    standardDays: str("standardDays") || "",
    expressPrice: num("expressPrice"),
    expressDays: str("expressDays") || "",
  };
  for (const k of ["name", "price", "sizes", "freeOver", "standardPrice", "expressPrice"]) {
    if (cfg[k] == null || Number.isNaN(cfg[k])) throw new Error(`site-config.js: couldn't read "${k}"`);
  }
  if (!(cfg.price > 0)) throw new Error('site-config.js: "price" must be more than 0');
  return cfg;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
