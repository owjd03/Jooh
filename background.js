// background.js
// This script runs in the background, handles communication with the Flask backend,
// and manages data for the extension popup.

const FLASK_BACKEND_URL_ANALYZE = "http://127.0.0.1:5000/analyze-product-page"; // New combined endpoint

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

        // Set initial loading status for popup
        await chrome.storage.local.set({
            analysisStatus: 'loading',
            sustainabilityData: null,
            errorMessage: null,
            hasMainProduct: null, // Reset this flag
            productTitle: null, // Reset product info
            brandName: null,
            justifyingLinks: null,
            alternativeProducts: null
        });

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
                    // Store all comprehensive data for success state
                    await chrome.storage.local.set({
                        analysisStatus: 'success',
                        hasMainProduct: true,
                        productTitle: result.productTitle,
                        brandName: result.brandName,
                        sustainabilityData: {
                            overallScore: result.overallScore,
                            overallExplanation: result.overallExplanation,
                            pillarScores: result.pillarScores,
                            pillarExplanations: result.pillarExplanations
                        },
                        justifyingLinks: result.justifyingLinks,
                        alternativeProducts: result.alternativeProducts,
                        errorMessage: null
                    });
                    console.log("Background: Product analysis successful and data stored.");
                } else {
                    // Page analyzed, but no main product found (e.g., homepage, category page)
                    await chrome.storage.local.set({
                        analysisStatus: 'no-main-product', // New status for popup
                        hasMainProduct: false,
                        errorMessage: result.message || "No specific product found on this page.",
                        sustainabilityData: null // Clear previous data
                    });
                    console.log("Background: No main product found on this page.");
                }
            } else {
                // Backend explicitly reported an error
                await chrome.storage.local.set({
                    analysisStatus: 'error',
                    errorMessage: result.message || "Unknown backend error during analysis.",
                    hasMainProduct: false
                });
                console.error("Background: Flask backend reported an error:", result.message);
            }

        } catch (error) {
            // Network or communication error with backend
            await chrome.storage.local.set({
                analysisStatus: 'error',
                errorMessage: `Network or communication error: ${error.message}. Make sure your Flask server is running!`,
                hasMainProduct: false
            });
            console.error("Background: Error communicating with Flask backend:", error);
        }
        return true; // Indicates that sendResponse will be called asynchronously
    }
});
