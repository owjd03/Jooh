// popup.js
// This script runs when the extension popup is opened and displays sustainability data.

document.addEventListener('DOMContentLoaded', async () => {
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const errorMessageSpan = document.getElementById('errorMessage');
    const resultsDiv = document.getElementById('results');

    // Show loading state initially
    loadingDiv.classList.remove('hidden');
    errorDiv.classList.add('hidden');
    resultsDiv.classList.add('hidden');

    try {
        // Retrieve data from chrome.storage.local
        const storedData = await chrome.storage.local.get(['sustainabilityData', 'analysisStatus', 'errorMessage']);
        console.log("Popup: Retrieved data from storage:", storedData);

        if (storedData.analysisStatus === 'success' && storedData.sustainabilityData) {
            displaySustainabilityResults(storedData.sustainabilityData);
            loadingDiv.classList.add('hidden');
            resultsDiv.classList.remove('hidden');
            // Removed: chrome.action.setBadgeText({ text: "" });
        } else if (storedData.analysisStatus === 'error') {
            errorMessageSpan.textContent = storedData.errorMessage || "An unknown error occurred.";
            loadingDiv.classList.add('hidden');
            errorDiv.classList.remove('hidden');
        } else if (storedData.analysisStatus === 'loading') {
             // If analysis is still loading, show loading message
            errorMessageSpan.textContent = "Analysis is still in progress. Please wait a moment and try opening the popup again.";
            loadingDiv.classList.add('hidden');
            errorDiv.classList.remove('hidden'); // Show error div as a general message area
        } else {
            // No data or analysis not yet performed for current page
            errorMessageSpan.textContent = "No sustainability data available for this product yet. Browse to a product page and open the popup after the page has loaded to trigger analysis.";
            loadingDiv.classList.add('hidden');
            errorDiv.classList.remove('hidden');
        }
    } catch (error) {
        console.error("Popup: Error retrieving data from storage:", error);
        errorMessageSpan.textContent = `Failed to load data: ${error.message}`;
        loadingDiv.classList.add('hidden');
        errorDiv.classList.remove('hidden');
    }
});

/**
 * Displays the sustainability results in the popup UI.
 * @param {Object} data - The sustainability data from the LLM.
 */
function displaySustainabilityResults(data) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = ''; // Clear previous content

    const scoreColor = (score) => {
        if (score >= 80) return '#4CAF50'; // Green (Excellent)
        if (score >= 60) return '#8BC34A'; // Light Green (Good)
        if (score >= 40) return '#FFEB3B'; // Yellow (Moderate)
        if (score >= 20) return '#FFC107'; // Amber (Poor)
        return '#F44336'; // Red (Very Poor)
    };

    // Overall Score
    resultsDiv.innerHTML += `
        <div class="eco-sense-section eco-sense-overall-score">
            <h3>Overall Sustainability Score: <span style="color: ${scoreColor(data.overallScore)};">${data.overallScore}/100</span></h3>
            <p>${data.overallExplanation}</p>
        </div>
    `;

    // Pillar Scores
    resultsDiv.innerHTML += `
        <div class="eco-sense-section">
            <h4>Detailed Impact Breakdown:</h4>
            <div class="eco-sense-pillars-grid">
                ${Object.keys(data.pillarScores).map(pillar => `
                    <div class="eco-sense-pillar-item">
                        <strong>${formatPillarName(pillar)}:</strong>
                        <span style="color: ${scoreColor(data.pillarScores[pillar])};">${data.pillarScores[pillar]}/100</span>
                        <p>${data.pillarExplanations[pillar]}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    // Alternative Products
    if (data.alternativeProducts && data.alternativeProducts.length > 0) {
        resultsDiv.innerHTML += `
            <div class="eco-sense-section eco-sense-alternatives">
                <h4>Sustainable Alternatives:</h4>
                <ul>
                    ${data.alternativeProducts.map(alt => `
                        <li>
                            <strong>${alt.name}</strong> (Score: <span style="color: ${scoreColor(alt.score)};">${alt.score}/100</span>)
                            <p>${alt.reason}</p>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    } else {
        resultsDiv.innerHTML += `
            <div class="eco-sense-section eco-sense-alternatives">
                <h4>Sustainable Alternatives:</h4>
                <p>No specific alternatives suggested at this time. Please check back later or research similar products.</p>
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
