# STEADFAST website (Cloudflare Worker)

```
public/            the website (what visitors see)
  index.html
  site-config.js   <- edit prices, sizes, dates and text here
  *.webp, *.png    photos and logo
src/worker.js      the Worker: serves the site and runs Stripe checkout at /api/checkout
wrangler.jsonc     Cloudflare settings
```

The Worker reads the price, sizes, sold-out sizes and shipping costs from
`public/site-config.js`, so the site and what Stripe charges always match.
Change something there, deploy, and both update.

## Deploying (automatic)

This repository is connected to Cloudflare. Every change committed to the `main` branch
deploys the site automatically in about a minute. You can edit files right on github.com:
open a file, click the pencil, make the change, then click **Commit changes**.

The Stripe key goes in the Cloudflare dashboard, not in this repository:
Workers & Pages > steadfast > Settings > Variables and Secrets > Add >
Type **Secret**, Name `STRIPE_SECRET_KEY`, Value your key.

## Deploying from your own computer (optional)


1. Install Node.js (LTS) from https://nodejs.org
2. Open a terminal in this folder and run:
   ```
   npm install
   npx wrangler login
   ```
   The second command opens Cloudflare in your browser so you can approve it.
3. Add your Stripe secret key (Stripe Dashboard > Developers > API keys).
   Use the **test** key (`sk_test_...`) first, then the live key (`sk_live_...`) when you're ready to sell:
   ```
   npx wrangler secret put STRIPE_SECRET_KEY
   ```
   Paste the key when asked. Cloudflare stores it encrypted; it is never in these files.
4. Deploy:
   ```
   npm run deploy
   ```
   Wrangler prints your address, for example `https://steadfast.<your-subdomain>.workers.dev`.

## Every update after that

Edit the files, then run `npm run deploy`. The site updates in a few seconds.

Or connect a GitHub repository in Cloudflare (Workers & Pages > steadfast > Settings > Build >
Connect repository). Then every push to GitHub deploys automatically.

## Your own domain

Cloudflare dashboard > Workers & Pages > steadfast > Settings > Domains & Routes > Add > Custom domain.

## Check it's working

Open `https://<your-site>/api/health`:
- `"stripeKeySet": true` means the Stripe key is in place.
- `"config"` shows the price, sizes and shipping the Worker read from site-config.js.

## Testing payments

With the `sk_test_` key, pay with card 4242 4242 4242 4242, any future expiry date and any CVC.
Orders appear in Stripe > Payments (test mode). Each order lists the sizes in its line items
and under Metadata. When you're ready to sell, run `npx wrangler secret put STRIPE_SECRET_KEY`
again with the `sk_live_` key.

## Test on your own computer

Copy `.dev.vars.example` to `.dev.vars`, paste your test key, run `npm run dev`
and open http://localhost:8787
