// popup.js
// This script runs when the extension popup is opened and displays sustainability data.
// It uses chrome.storage.onChanged to react to real-time status updates from the background script.

// --- Diagnostic Check ---
if (typeof document === 'undefined') {
    console.error("CRITICAL ERROR: 'document' is not defined. This script is running in an unexpected environment (e.g., a service worker).");
    throw new Error("'document' object not found. Script cannot proceed.");
}
// --- End Diagnostic Check ---

// Get references to all main display sections from popup.html
const loadingDiv = document.getElementById('loading');
const errorDiv = document.getElementById('error');
const errorMessageSpan = document.getElementById('errorMessage');
const resultsDiv = document.getElementById('results');
const notEcommerceDomainDiv = document.getElementById('notEcommerceDomain');
const noMainProductDiv = document.getElementById('noMainProduct');
const noProductMessageSpan = document.getElementById('noProductMessage');
const initialWelcomeMessageDiv = document.getElementById('initial-welcome-message');

// Elements within the resultsDiv that will display product info
const productTitleDisplay = document.getElementById('productTitleDisplay');
const brandNameDisplay = document.getElementById('brandNameDisplay');
const scorePhraseDisplay = document.getElementById('scorePhraseDisplay'); // Element for the score phrase
const ecoScoreMeterFill = document.getElementById('ecoScoreMeterFill'); // New element for the meter fill
const sustainabilityResultsDisplay = document.getElementById('sustainabilityResultsDisplay');

// Toggle button elements
const toggleExtensionCheckbox = document.getElementById('toggleExtension');


// Helper to hide all main display sections/messages
function hideAllSections() {
    loadingDiv.classList.add('hidden');
    errorDiv.classList.add('hidden');
    resultsDiv.classList.add('hidden');
    notEcommerceDomainDiv.classList.add('hidden');
    noMainProductDiv.classList.add('hidden');
    initialWelcomeMessageDiv.classList.add('hidden'); // Also hide the welcome message
}

/**
 * Renders the popup UI based on the current data from storage.
 * This function will be called on DOMContentLoaded and whenever storage changes.
 */
async function renderPopupUI() {
    try {
        // Retrieve data from chrome.storage.local
        const storedData = await chrome.storage.local.get([
            'analysisStatus',
            'errorMessage',
            'hasMainProduct',
            'productTitle',
            'brandName',
            'sustainabilityData',
            'justifyingLinks',
            'alternativeProducts',
            'extensionEnabled' // Get the extension enabled state
        ]);
        console.log("Popup: Re-rendering UI. Current stored data:", storedData);

        hideAllSections(); // Start by hiding everything

        // Set the toggle button's state
        toggleExtensionCheckbox.checked = storedData.extensionEnabled !== false; // Default to true if not set

        // Determine which section to show based on analysisStatus
        if (storedData.analysisStatus === 'loading') {
            loadingDiv.classList.remove('hidden');
            loadingDiv.querySelector('p').textContent = "Analyzing page content. This might take a moment...";
            loadingDiv.querySelector('.spinner').classList.remove('hidden'); // Ensure spinner is visible
        } else if (storedData.analysisStatus === 'not-ecommerce-domain') {
            notEcommerceDomainDiv.classList.remove('hidden');
        } else if (storedData.analysisStatus === 'no-main-product') {
            noMainProductDiv.classList.remove('hidden');
            noProductMessageSpan.textContent = storedData.errorMessage || "The page you are on does not contain a specific product to analyze.";
        } else if (storedData.analysisStatus === 'error') {
            errorDiv.classList.remove('hidden');
            errorMessageSpan.textContent = storedData.errorMessage || "An unknown error occurred.";
        } else if (storedData.analysisStatus === 'success' && storedData.hasMainProduct && storedData.sustainabilityData) {
            resultsDiv.classList.remove('hidden'); // Show the results container
            displaySustainabilityResults(storedData); // Populate the results container with all data
        } else if (storedData.analysisStatus === 'disabled') { // New status for when extension is explicitly off
            initialWelcomeMessageDiv.classList.remove('hidden');
            initialWelcomeMessageDiv.querySelector('p').textContent = "Eco-Sense is currently turned OFF. Toggle the switch above to enable analysis.";
        }
        else {
            // Default or uninitialized state: show the welcome message
            initialWelcomeMessageDiv.classList.remove('hidden');
        }

    } catch (error) {
        console.error("Popup: Error retrieving or rendering data:", error);
        hideAllSections();
        errorMessageSpan.textContent = `Failed to load popup data: ${error.message}`;
        errorDiv.classList.remove('hidden');
    }
}

/**
 * Determines a short phrase and meter class based on the overall sustainability score (0-10 scale).
 * @param {number} score - The overall sustainability score.
 * @returns {Object} An object containing the phrase and a corresponding CSS class for the meter fill.
 */
function getScoreInfo(score) {
    let phrase = "";
    let className = ""; // For the meter fill
    let textClassName = ""; // To adjust text color if background is light

    if (score >= 9) {
        phrase = "Planet's Best Friend!";
        className = "meter-fill-green";
    } else if (score >= 7) {
        phrase = "Eco-Conscious Choice";
        className = "meter-fill-light-green";
    } else if (score >= 5) {
        phrase = "Middle Ground Impact";
        className = "meter-fill-yellow";
        textClassName = "text-dark"; // For better contrast on yellow
    } else if (score >= 3) {
        phrase = "Eco Effort Needed";
        className = "meter-fill-amber";
        textClassName = "text-dark"; // For better contrast on amber
    } else { // 0-2
        phrase = "Heavy impact Alert!";
        className = "meter-fill-red";
    }
    return { phrase, className, textClassName };
}


/**
 * Displays the sustainability results in the popup UI.
 * This function now expects the entire `data` object from storage directly.
 * @param {Object} data - The comprehensive data from storage including product info, scores, links, alternatives.
 */
function displaySustainabilityResults(data) {
    // Populate product title and brand
    productTitleDisplay.textContent = data.productTitle || 'Product Name Not Available';
    brandNameDisplay.textContent = data.brandName ? `by ${data.brandName}` : '';

    // Set the score meter and phrase display
    const overallScore = data.sustainabilityData.overallScore;
    const { phrase, className, textClassName } = getScoreInfo(overallScore);

    // Update meter fill - reset width to 0 and force reflow to ensure transition plays
    ecoScoreMeterFill.style.width = '0%';
    void ecoScoreMeterFill.offsetWidth; // Force reflow
    ecoScoreMeterFill.style.width = `${overallScore * 10}%`; // Score is 0-10, so multiply by 10 for percentage
    ecoScoreMeterFill.className = 'eco-score-meter-fill ' + className; // Apply color class

    // Update score phrase
    scorePhraseDisplay.textContent = phrase;
    scorePhraseDisplay.className = 'eco-score-phrase ' + textClassName; // Apply text color class


    sustainabilityResultsDisplay.innerHTML = ''; // Clear previous content

    // Note: Scores are 0-10 as per your working app.py's required structure and scaling
    const scoreColor = (score) => {
        if (score >= 8) return '#4CAF50'; // Green (Excellent)
        if (score >= 6) return '#8BC34A'; // Light Green (Good)
        if (score >= 4) return '#FFEB3B'; // Yellow (Moderate)
        if (score >= 2) return '#FFC107'; // Amber (Poor)
        return '#F44336'; // Red (Very Poor)
    };

    // Overall Score
    sustainabilityResultsDisplay.innerHTML += `
        <div class="eco-sense-section eco-sense-overall-score">
            <h3>Overall Sustainability Score: <span style="color: ${scoreColor(overallScore)};">${overallScore}/10</span></h3>
            <p>${data.sustainabilityData.overallExplanation}</p>
        </div>
    `;

    // Pillar Scores
    sustainabilityResultsDisplay.innerHTML += `
        <div class="eco-sense-section">
            <h4>Detailed Impact Breakdown:</h4>
            <div class="eco-sense-pillars-grid">
                ${Object.keys(data.sustainabilityData.pillarScores).map(pillar => `
                    <div class="eco-sense-pillar-item">
                        <strong>${formatPillarName(pillar)}:</strong>
                        <span style="color: ${scoreColor(data.sustainabilityData.pillarScores[pillar])};">${data.sustainabilityData.pillarScores[pillar]}/10</span>
                        <p>${data.sustainabilityData.pillarExplanations[pillar]}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    // Justifying Links
    if (data.justifyingLinks && data.justifyingLinks.length > 0) {
        sustainabilityResultsDisplay.innerHTML += `
            <div class="eco-sense-section eco-sense-links">
                <h4>Learn More:</h4>
                <ul>
                    ${data.justifyingLinks.map(link => `
                        <li>
                            <a href="${link.url}" target="_blank" rel="noopener noreferrer">${link.title}</a>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    }

    // Alternative Products
    if (data.alternativeProducts && data.alternativeProducts.length > 0) {
        sustainabilityResultsDisplay.innerHTML += `
            <div class="eco-sense-section eco-sense-alternatives">
                <h4>Sustainable Alternatives:</h4>
                <ul>
                    ${data.alternativeProducts.map(alt => `
                        <li>
                            <strong>${alt.name}</strong> (Score: <span style="color: ${scoreColor(alt.score)};">${alt.score}/10</span>)
                            <p>${alt.reason}</p>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    } else {
        sustainabilityResultsDisplay.innerHTML += `
            <div class="eco-sense-section eco-sense-alternatives">
                <h4>Sustainable Alternatives:</h4>
                <p>No specific alternatives suggested at this time.</p>
            </div>
        `;
    }
}

/**
 * Formats a camelCase pillar name into a more readable string.
 * @param {string} name - The pillar name in camelCase.
 * @returns {string} - Formatted name.
 */
function formatPillarName(name) {
    return name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
}

// Initial render when the popup DOM is loaded
document.addEventListener('DOMContentLoaded', renderPopupUI);

// Listen for changes in chrome.storage.local and re-render the UI
chrome.storage.onChanged.addListener((changes, areaName) => {
    // Check if any relevant keys for the popup's display have changed
    if (areaName === 'local' && (
        changes.analysisStatus ||
        changes.errorMessage ||
        changes.hasMainProduct ||
        changes.productTitle ||
        changes.brandName ||
        changes.sustainabilityData ||
        changes.justifyingLinks ||
        changes.alternativeProducts ||
        changes.extensionEnabled // Listen for toggle changes too
    )) {
        console.log("Popup: Storage changed, re-rendering UI.");
        renderPopupUI();
    }
});

// Event listener for the toggle button
toggleExtensionCheckbox.addEventListener('change', async (event) => {
    const isChecked = event.target.checked;
    await chrome.storage.local.set({ extensionEnabled: isChecked });
    console.log(`Extension enabled state set to: ${isChecked}`);

    // If turned off, update status in storage to reflect disabled state in popup
    if (!isChecked) {
        await chrome.storage.local.set({
            analysisStatus: 'disabled',
            errorMessage: "Extension is temporarily off."
        });
        // Also inform content script immediately if it's active
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.id) {
            chrome.tabs.sendMessage(tab.id, { action: "updateToast", status: "info", message: "Eco-Sense: Extension is OFF." });
        }
    } else {
        // If turned on, trigger re-analysis of the current page
        // This will update the status to 'loading' etc.
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.id) {
            // Re-inject content.js to trigger initiatePageAnalysis.
            // This is the cleanest way to restart analysis on the current tab.
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            });
        }
    }
});
