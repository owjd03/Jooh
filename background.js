// background.js
// This script runs in the background, handles communication with the Flask backend,
// and manages data for the extension popup.

const FLASK_BACKEND_URL_BASE = "http://127.0.0.1:5000"; // Base URL for Flask backend

/**
 * Handles messages from content scripts.
 * @param {Object} request - The message request.
 * @param {Object} sender - The sender of the message.
 * @param {Function} sendResponse - Function to send a response back to the sender.
 */
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.action === "checkPageType") {
        const { productUrl, productTitle, brandName } = request;
        console.log("Background: Received request to check page type:", productUrl);

        // Clear previous analysis status and data when checking a new page
        await chrome.storage.local.set({
            analysisStatus: 'checking', // New status for page type check
            sustainabilityData: null,
            errorMessage: null,
            isEcommercePage: null // To store the result of the page type check
        });

        try {
            console.log("Background: Calling Flask backend for page type check...");
            const response = await fetch(`${FLASK_BACKEND_URL_BASE}/check-page-type`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productUrl, productTitle, brandName })
            });

            const result = await response.json();
            console.log("Background: Response from Flask backend (page type):", result);

            if (result.success && result.isEcommercePage) {
                // It's an e-commerce page, proceed to analyze product sustainability
                await chrome.storage.local.set({ isEcommercePage: true });
                console.log("Background: Page identified as e-commerce. Triggering sustainability analysis.");

                // Trigger actual sustainability analysis immediately
                await analyzeProductSustainability(result.productInfo);
                sendResponse({ success: true, isEcommercePage: true }); // Inform content script
            } else {
                // Not an e-commerce page or product not found
                await chrome.storage.local.set({
                    analysisStatus: 'not-ecommerce',
                    isEcommercePage: false,
                    errorMessage: result.message || "Not an identified e-commerce product page."
                });
                console.log("Background: Page not identified as e-commerce product page.");
                sendResponse({ success: true, isEcommercePage: false }); // Inform content script
            }

        } catch (error) {
            console.error("Background: Error checking page type with Flask backend:", error);
            await chrome.storage.local.set({
                analysisStatus: 'error',
                errorMessage: `Failed to check page type: ${error.message}. Make sure Flask server is running.`,
                isEcommercePage: false
            });
            sendResponse({ success: false, message: `An error occurred during page type check: ${error.message}` });
        }
        return true; // Indicates that sendResponse will be called asynchronously
    }
});

/**
 * Performs the actual sustainability analysis by calling the Flask backend.
 * This is called internally by the background script after a page is identified as e-commerce.
 * @param {Object} productInfo - Contains productTitle, brandName, productUrl.
 */
async function analyzeProductSustainability(productInfo) {
    console.log("Background: Starting sustainability analysis for product:", productInfo.productTitle);
    await chrome.storage.local.set({ analysisStatus: 'loading', sustainabilityData: null, errorMessage: null }); // Set loading status for sustainability

    try {
        const response = await fetch(`${FLASK_BACKEND_URL_BASE}/analyze-sustainability`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productInfo)
        });

        const result = await response.json();
        console.log("Background: Response from Flask backend (sustainability):", result);

        if (result.success) {
            await chrome.storage.local.set({ sustainabilityData: result.data, analysisStatus: 'success' });
            console.log("Background: Sustainability data stored.");
        } else {
            await chrome.storage.local.set({ analysisStatus: 'error', errorMessage: result.message || "Unknown backend error." });
            console.error("Background: Flask backend reported an error during analysis:", result.message);
        }
    } catch (error) {
        await chrome.storage.local.set({ analysisStatus: 'error', errorMessage: `Network or communication error during analysis: ${error.message}` });
        console.error("Background: Error communicating with Flask backend during analysis:", error);
    }
}
