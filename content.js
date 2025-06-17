// content.js
// This script runs only on pages matched by manifest.json (i.e., approved e-commerce sites).
// It sends the full page HTML and URL to the background script for analysis by LLM.
// It also displays an on-page toast notification to provide real-time status.

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

    // Set initial loading state in storage for the popup to reflect immediately
    await chrome.storage.local.set({
        analysisStatus: 'loading', // Using your existing key
        sustainabilityData: null, // Clear previous product data to show loading for current analysis
        errorMessage: null,
        hasMainProduct: null,
        productTitle: null,
        brandName: null,
        justifyingLinks: null,
        alternativeProducts: null
    });
    showEcoSenseToast('Eco-Sense: Analyzing...', 'loading'); // Show toast on the page

    const fullHtmlContent = document.documentElement.outerHTML;

    console.log("Content: Approved e-commerce domain (via manifest.json). Sending URL and HTML to background script.");
    try {
        // Send message to background script for full page content analysis
        await chrome.runtime.sendMessage({
            action: "analyzePageContent",
            productUrl: productUrl,
            htmlContent: fullHtmlContent
        });
        console.log("Content: Page content analysis request sent for URL:", productUrl);
        // Background script will update storage, and storage.onChanged will handle popup updates.
        // Toast updates will also come from background.js.
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
