// ecommerceSites.js
// A hardcoded list of popular e-commerce domains for the extension to analyze.

const ECOMMERCE_DOMAINS = [
    "amazon.com",
    "amazon.sg", // For Singapore context
    "ebay.com",
    "walmart.com",
    "target.com",
    "etsy.com",
    "nike.com",
    "adidas.com",
    "bestbuy.com",
    "zara.com",
    "hm.com",
    "shein.com", // Example: include or exclude based on your criteria
    "aliexpress.com",
    "shopify.com", // Generic for many Shopify stores, might need sub-domains for specificity
    "lazada.sg", // For Singapore context
    "shopee.sg"  // For Singapore context
    // Add more domains as needed
];

// Export for use in other scripts (e.g., content.js)
// This works because content.js will include it directly.
// For service worker (background.js), you'd typically import via importScripts().
