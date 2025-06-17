// content.js
// This script runs only on pages matched by manifest.json (i.e., approved e-commerce sites).
// It sends the full page HTML and URL to the background script for analysis by LLM.
// It also displays an on-page toast notification to provide real-time status,
// respecting the extension's enabled/disabled state.

console.log("Eco-Sense Shopping Companion: Content script loaded.");

let ecoSenseToast = null; // Variable to hold our toast element

// Function to create or update the on-page toast notification
function showEcoSenseToast(message, type = 'info') {
    if (!ecoSenseToast) {
        ecoSenseToast = document.createElement('div');
        ecoSenseToast.id = 'eco-sense-toast';
        document.body.appendChild(ecoSenseToast);
    }

    ecoSenseToast.textContent = message;
    ecoSenseToast.className = 'eco-sense-toast eco-sense-toast-' + type; // Apply type class for styling

    // Make sure it's visible
    ecoSenseToast.classList.remove('eco-sense-toast-hidden');

    // Hide after a few seconds if it's not a loading message
    if (type !== 'loading') {
        clearTimeout(ecoSenseToast.hideTimer);
        ecoSenseToast.hideTimer = setTimeout(() => {
            ecoSenseToast.classList.add('eco-sense-toast-hidden');
        }, 5000); // Hide after 5 seconds
    }
}

function hideEcoSenseToast() {
    if (ecoSenseToast) {
        ecoSenseToast.classList.add('eco-sense-toast-hidden');
        clearTimeout(ecoSenseToast.hideTimer);
    }
}

// Function to send page URL and full HTML to background script for analysis
async function initiatePageAnalysis() {
    const productUrl = window.location.href;

    // Check if the extension is enabled
    const storage = await chrome.storage.local.get('extensionEnabled');
    const isEnabled = storage.extensionEnabled !== false; // Default to true if not set

    if (!isEnabled) {
        console.log("Content: Extension is currently disabled. Skipping analysis.");
        showEcoSenseToast('Eco-Sense: Extension is OFF.', 'info');
        // Clear status in storage to prevent showing old loading/error states in popup
        await chrome.storage.local.set({
            analysisStatus: 'disabled', // New status for popup
            errorMessage: "Extension is temporarily off."
        });
        return;
    }

    // Set initial loading state in storage for the popup to reflect immediately
    await chrome.storage.local.set({
        analysisStatus: 'loading',
        sustainabilityData: null,
        errorMessage: null,
        hasMainProduct: null,
        productTitle: null,
        brandName: null,
        justifyingLinks: null,
        alternativeProducts: null
    });
    showEcoSenseToast('Eco-Sense: Analyzing...', 'loading'); // Show toast on the page

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
    } catch (error) {
        console.error("Content: Error sending message to background script:", error);
        // Set error status in storage for popup
        await chrome.storage.local.set({
            analysisStatus: 'error',
            errorMessage: `Failed to send page data for analysis: ${error.message}`
        });
        showEcoSenseToast('Eco-Sense: Error sending data.', 'error');
    }
}

// Listen for messages from the background script to update the toast
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateToast") {
        console.log("Content: Received toast update:", request.status, request.message);
        if (request.status === 'hide') {
            hideEcoSenseToast();
        } else {
            showEcoSenseToast(request.message, request.status);
        }
    }
    return true; // Keep the message channel open
});

// Initiate page analysis when the DOM is ready or immediately if already ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initiatePageAnalysis);
} else {
    initiatePageAnalysis();
}