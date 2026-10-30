/*
  STEADFAST site settings
  -----------------------
  Edit the values below, save, and re-upload (or push) the site.
  Keep the quotes "..." around text, and the commas at the end of lines.
  Numbers (prices, shipping costs) go without quotes or a $ sign.
*/
window.SITE = {

  // Black bar across the very top of every page
  announcement: "Pre-sale now open · Shipping starts January 12 · Built on the word.",

  // Pre-sale mode. Set on: false to switch the whole site back to normal selling:
  // buttons say "Add to cart", countdowns disappear and the Pre-sale tags go away.
  preSale: {
    on: true,
    // When shipping starts. The countdown runs to this moment.
    // Format: YYYY-MM-DDTHH:MM:SS then your time zone offset (-05:00 is US Eastern in winter).
    shipDate: "2027-01-12T00:00:00-05:00",
    shipDateText: "January 12, 2027",   // how the date is written in sentences on the site
    buttonText: "Pre-order",            // the main buy button on the product page
    heroButtonText: "Pre-order now",    // the red button on the home page
    badge: "Pre-sale",                  // the red tag on photos and shop cards
  },

  // Home page banner text
  hero: {
    eyebrow: "Pre-sale now open",
    text: "Pre-order the Script Hoodie now. Heavyweight black fleece with our script on the chest and across the back. Shipping starts January 12.",
  },

  // The hoodie
  product: {
    name: "Steadfast Script Hoodie",
    tagline: "Built on the word.",
    sku: "SF-HD-001-BLK",
    color: "Black",
    price: 90,
    badge: "New",                       // tag shown when pre-sale is off (use "" for none)
    sizes: ["S", "M", "L", "XL", "XXL"],
    soldOut: [],                        // e.g. ["S", "XXL"] crosses those sizes out
    details: [
      "Black heavyweight fleece pullover hoodie",
      "Red Steadfast script on the left chest",
      "Large Steadfast script on the back, outlined in blue, with \"Built on the word.\" underneath",
      "Two-panel hood without drawcords",
      "Kangaroo pocket",
      "Ribbed cuffs and hem",
    ],
    fitNote: "Relaxed, boxy fit with a dropped shoulder. Take your usual size for a roomy fit, or size down for a closer one. Measurements are taken flat, in inches.",
    sizeChart: {
      headers: ["Size", "Chest (½)", "Body length", "Sleeve"],
      rows: [
        ["S",   "22.5\"",  "27.25\"", "34\""],
        ["M",   "23.5\"",  "28\"",    "35\""],
        ["L",   "24.5\"",  "28.75\"", "36\""],
        ["XL",  "25.75\"", "29.5\"",  "37\""],
        ["XXL", "27\"",    "30.25\"", "38\""],
      ],
    },
  },

  // Shipping and returns (used in the cart, product page and help pages)
  shipping: {
    freeOver: 150,          // free standard shipping at or above this order total
    standardPrice: 8,
    standardDays: "3–5",
    expressPrice: 20,
    expressDays: "1–2",
    returnDays: 30,
  },
};
