// popup.js
// This script runs when the extension popup is opened and displays sustainability data.

document.addEventListener('DOMContentLoaded', async () => {
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const errorMessageSpan = document.getElementById('errorMessage');
    const resultsDiv = document.getElementById('results');
    const notEcommerceDomainDiv = document.getElementById('notEcommerceDomain');
    const noMainProductDiv = document.getElementById('noMainProduct');
    const noProductMessageSpan = document.getElementById('noProductMessage');

    // Show loading state initially
    hideAllSections();
    loadingDiv.classList.remove('hidden');

    try {
        // Retrieve data from chrome.storage.local
        const storedData = await chrome.storage.local.get([
            'sustainabilityData',
            'analysisStatus',
            'errorMessage',
            'hasMainProduct', // New flag
            'productTitle', // New
            'brandName',    // New
            'justifyingLinks', // New
            'alternativeProducts' // New
        ]);
        console.log("Popup: Retrieved data from storage:", storedData);

        if (storedData.analysisStatus === 'not-ecommerce-domain') {
            hideAllSections();
            notEcommerceDomainDiv.classList.remove('hidden');
        } else if (storedData.analysisStatus === 'no-main-product') {
            hideAllSections();
            noMainProductDiv.classList.remove('hidden');
            noProductMessageSpan.textContent = storedData.errorMessage || "The page you are on does not contain a specific product to analyze.";
        } else if (storedData.analysisStatus === 'success' && storedData.hasMainProduct && storedData.sustainabilityData) {
            hideAllSections();
            displaySustainabilityResults(storedData); // Pass all storedData for comprehensive display
            resultsDiv.classList.remove('hidden');
        } else if (storedData.analysisStatus === 'error') {
            hideAllSections();
            errorMessageSpan.textContent = storedData.errorMessage || "An unknown error occurred.";
            errorDiv.classList.remove('hidden');
        } else {
            // Default state: still loading, or no data yet
            // Keep loading spinner or show a general informational message
            hideAllSections();
            loadingDiv.classList.remove('hidden');
            // If loading after a very brief check, provide more context
            if (storedData.analysisStatus === 'loading') {
                loadingDiv.querySelector('p').textContent = "Analyzing page content. This might take a moment...";
            } else {
                 loadingDiv.querySelector('p').textContent = "No analysis initiated yet. Browse to an approved e-commerce product page to start.";
                 // Optionally hide spinner if no analysis is actually running
                 loadingDiv.querySelector('.spinner').classList.add('hidden');
            }
        }
    } catch (error) {
        console.error("Popup: Error retrieving data from storage:", error);
        hideAllSections();
        errorMessageSpan.textContent = `Failed to load data: ${error.message}`;
        errorDiv.classList.remove('hidden');
    }
});

function hideAllSections() {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('error').classList.add('hidden');
    document.getElementById('results').classList.add('hidden');
    document.getElementById('notEcommerceDomain').classList.add('hidden');
    document.getElementById('noMainProduct').classList.add('hidden');
}


/**
 * Displays the sustainability results in the popup UI.
 * @param {Object} data - The comprehensive data from storage including product info, scores, links, alternatives.
 */
function displaySustainabilityResults(data) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = ''; // Clear previous content

    const scoreColor = (score) => {
        if (score >= 8) return '#4CAF50'; // Green (Excellent)
        if (score >= 6) return '#8BC34A'; // Light Green (Good)
        if (score >= 4) return '#FFEB3B'; // Yellow (Moderate)
        if (score >= 2) return '#FFC107'; // Amber (Poor)
        return '#F44336'; // Red (Very Poor)
    };

    // Product Name and Brand
    resultsDiv.innerHTML += `
        <div class="eco-sense-product-info">
            <h3>${data.productTitle || 'Product Name'}</h3>
            <p>${data.brandName ? `by ${data.brandName}` : ''}</p>
        </div>
    `;

    // Overall Score
    resultsDiv.innerHTML += `
        <div class="eco-sense-section eco-sense-overall-score">
            <h3>Overall Sustainability Score: <span style="color: ${scoreColor(data.sustainabilityData.overallScore)};">${data.sustainabilityData.overallScore}/10</span></h3>
            <p>${data.sustainabilityData.overallExplanation}</p>
        </div>
    `;

    // Pillar Scores
    resultsDiv.innerHTML += `
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
        resultsDiv.innerHTML += `
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
        resultsDiv.innerHTML += `
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
