// content.js
// This script runs on every web page.
// It checks if the current domain is a whitelisted e-commerce site.
// If it is, it sends the full page HTML and URL to the background script for analysis by LLM.

console.log("Eco-Sense Shopping Companion: Content script loaded.");

// Ensure ECOMMERCE_DOMAINS is available from ecommerceSites.js
// If ecommerceSites.js is loaded before content.js in manifest.json, ECOMMERCE_DOMAINS will be global.
// If not, you might need to structure it as an import or directly include its content.
// For this setup, we assume it's loaded as a global variable.
if (typeof ECOMMERCE_DOMAINS === 'undefined') {
    console.error("E-commerce domains list not found. Ensure ecommerceSites.js is loaded before content.js in manifest.json.");
    // Fallback or exit if list isn't available
    const ECOMMERCE_DOMAINS = [
        "amazon.com", "ebay.com", "walmart.com", "target.com" // Minimal fallback
    ];
}


// Function to check if the current domain is in our hardcoded e-commerce list
function isEcommerceDomain(url) {
    try {
        const hostname = new URL(url).hostname;
        // Check both exact match and subdomain match (e.g., store.shopify.com matches shopify.com)
        return ECOMMERCE_DOMAINS.some(domain => hostname === domain || hostname.endsWith(`.${domain}`));
    } catch (e) {
        console.error("Error parsing URL for domain check:", e);
        return false;
    }
}

// Function to send page URL and full HTML to background script for analysis
async function initiatePageAnalysis() {
    const productUrl = window.location.href;

    if (!isEcommerceDomain(productUrl)) {
        console.log("Content: Not an approved e-commerce domain. Skipping analysis.");
        // If not an e-commerce page, clear previous analysis data and set status for popup
        await chrome.storage.local.set({
            analysisStatus: 'not-ecommerce-domain', // New status for popup
            sustainabilityData: null,
            errorMessage: "Not Browse an approved e-commerce website for analysis.",
            hasMainProduct: false // Ensure this is false
        });
        return;
    }

    // Capture the entire HTML of the page
    // This can be very large and might exceed message limits for extremely complex pages.
    // Consider sending only relevant sections or a summary in a production environment.
    const fullHtmlContent = document.documentElement.outerHTML;

    console.log("Content: Approved e-commerce domain. Sending URL and HTML to background script.");
    try {
        // Send message to background script for full page content analysis
        await chrome.runtime.sendMessage({
            action: "analyzePageContent",
            productUrl: productUrl,
            htmlContent: fullHtmlContent
        });
        console.log("Content: Page content analysis request sent for URL:", productUrl);
        // Set initial loading state for popup
        await chrome.storage.local.set({
            analysisStatus: 'loading',
            sustainabilityData: null,
            errorMessage: null,
            hasMainProduct: null // Reset this
        });
    } catch (error) {
        console.error("Content: Error sending message to background script:", error);
        await chrome.storage.local.set({
            analysisStatus: 'error',
            errorMessage: `Failed to send page data for analysis: ${error.message}`,
            hasMainProduct: false
        });
    }
}

// Initiate page analysis when the DOM is ready or immediately if already ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initiatePageAnalysis);
} else {
    initiatePageAnalysis();
}
