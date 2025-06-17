// background.js
// This script runs in the background, handles communication with the Flask backend,
// manages data for the extension popup (with persistence), and controls on-page toast notifications.

const FLASK_BACKEND_URL_ANALYZE = "http://127.0.0.1:5000/analyze-product-page";

/**
 * Sends a message to the active content script to update the toast.
 * @param {string} status - 'loading', 'success', 'error', 'info', 'hide'.
 * @param {string} message - The message to display in the toast.
 */
async function sendToastUpdate(status, message) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
        try {
            await chrome.tabs.sendMessage(tab.id, { action: "updateToast", status: status, message: message });
            console.log(`Background: Sent toast update to tab ${tab.id}: ${status} - ${message}`);
        } catch (error) {
            console.warn(`Background: Could not send toast update to tab ${tab.id}. Tab might be closed or content script not loaded.`, error);
        }
    }
}


/**
 * Handles messages from content scripts.
 * @param {Object} request - The message request.
 * @param {Object} sender - The sender of the message.
 * @param {Function} sendResponse - Function to send a response back to the sender.
 */
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.action === "analyzePageContent") {
        const { productUrl, htmlContent } = request;
        console.log("Background: Received request to analyze page content for URL:", productUrl);

        // content.js has already set analysisStatus to 'loading' and shown initial toast.

        try {
            console.log("Background: Calling Flask backend for combined analysis...");
            const response = await fetch(FLASK_BACKEND_URL_ANALYZE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: productUrl, html_content: htmlContent })
            });

            const result = await response.json();
            console.log("Background: Response from Flask backend (combined analysis):", result);

            if (result.success) {
                if (result.hasMainProduct) {
                    // This is a successful product analysis: update ALL product data and status
                    await chrome.storage.local.set({
                        analysisStatus: 'success',
                        hasMainProduct: true,
                        productTitle: result.productTitle,
                        brandName: result.brandName,
                        sustainabilityData: { // This structure matches your popup.js
                            overallScore: result.overallScore,
                            overallExplanation: result.overallExplanation,
                            pillarScores: result.pillarScores,
                            pillarExplanations: result.pillarExplanations
                        },
                        justifyingLinks: result.justifyingLinks,
                        alternativeProducts: result.alternativeProducts,
                        errorMessage: null
                    });
                    sendToastUpdate('success', `Eco-Sense: Product analyzed! Score: ${result.overallScore}/10. Click for details.`);
                    console.log("Background: Product analysis successful and data stored.");
                } else {
                    // Not a main product page, but still on an e-commerce site.
                    // DO NOT clear previous product data. Only update status and message.
                    await chrome.storage.local.set({
                        analysisStatus: 'no-main-product',
                        hasMainProduct: false,
                        errorMessage: result.message || "No specific product found on this page."
                        // Previous productTitle, brandName, sustainabilityData etc. are preserved.
                    });
                    sendToastUpdate('info', 'Eco-Sense: No specific product found here.');
                    console.log("Background: No main product found on this page.");
                }
            } else {
                // Backend explicitly reported an error.
                // DO NOT clear previous product data. Only update status and message.
                await chrome.storage.local.set({
                    analysisStatus: 'error',
                    errorMessage: result.message || "Unknown backend error during analysis.",
                    hasMainProduct: false
                    // Previous productTitle, brandName, sustainabilityData etc. are preserved.
                });
                sendToastUpdate('error', 'Eco-Sense: Analysis failed.');
                console.error("Background: Flask backend reported an error:", result.message);
            }

        } catch (error) {
            // Network or communication error with backend.
            // DO NOT clear previous product data. Only update status and message.
            await chrome.storage.local.set({
                analysisStatus: 'error',
                errorMessage: `Network or communication error: ${error.message}. Make sure your Flask server is running!`,
                hasMainProduct: false
                // Previous productTitle, brandName, sustainabilityData etc. are preserved.
            });
            sendToastUpdate('error', 'Eco-Sense: Network error.');
            console.error("Background: Error communicating with Flask backend:", error);
        }
        return true; // Indicates that sendResponse will be called asynchronously
    }
});
