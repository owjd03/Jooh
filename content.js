// content.js
// This script runs on every web page and sends the current URL to the background script
// for page type checking and product info extraction via the Flask backend (LLM).

console.log("Eco-Sense Shopping Companion: Content script loaded.");

// Function to send current page URL to background script for page type check
async function initiatePageAnalysis() {
    const productUrl = window.location.href; // Get only the URL from the content script

    console.log("Content: Sending page URL to background script for type check and product info extraction.");
    try {
        // Send message to background script to check page type.
        // Product title and brand name are intentionally NOT extracted here;
        // they will be determined by the LLM in the backend.
        await chrome.runtime.sendMessage({
            action: "checkPageType",
            productUrl: productUrl
        });
        console.log("Content: Page type check request sent for URL:", productUrl);
    } catch (error) {
        console.error("Content: Error sending message for page type check:", error);
    }
}

// Initiate page analysis when the DOM is ready or immediately if already ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initiatePageAnalysis);
} else {
    initiatePageAnalysis();
}
