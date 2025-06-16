# app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import os
import json # Import json for parsing stringified JSON from Gemini
import requests # For fetching page content in a more robust real-world scenario
# from bs4 import BeautifulSoup # For parsing HTML if needed (optional for direct LLM feeding)

app = Flask(__name__)
CORS(app) # Enable CORS for all routes, allowing your extension to access it

# Configure Gemini API key from environment variable for security
# IMPORTANT: Replace 'YOUR_GEMINI_API_KEY' with your actual key or set it as an environment variable.
# Example: export GEMINI_API_KEY="AIza..."
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "YOUR_GEMINI_API_KEY") # Replace with your key for local testing or set ENV var
genai.configure(api_key=GEMINI_API_KEY)

# Initialize the Gemini model for sustainability analysis
model_sustainability = genai.GenerativeModel(
    model_name="gemini-2.0-flash",
    generation_config={
        "response_mime_type": "application/json",
        "response_schema": {
            "type": "OBJECT",
            "properties": {
                "overallScore": { "type": "INTEGER" },
                "overallExplanation": { "type": "STRING" },
                "pillarScores": {
                    "type": "OBJECT",
                    "properties": {
                        "carbonFootprint": { "type": "INTEGER" },
                        "waterUsage": { "type": "INTEGER" },
                        "wasteGenerationCircularity": { "type": "INTEGER" },
                        "resourceDepletion": { "type": "INTEGER" },
                        "biodiversityEcosystemImpact": { "type": "INTEGER" },
                        "pollution": { "type": "INTEGER" }
                    }
                },
                "pillarExplanations": {
                    "type": "OBJECT",
                    "properties": {
                        "carbonFootprint": { "type": "STRING" },
                        "waterUsage": { "type": "STRING" },
                        "wasteGenerationCircularity": { "type": "STRING" },
                        "resourceDepletion": { "type": "STRING" },
                        "biodiversityEcosystemImpact": { "type": "STRING" },
                        "pollution": { "type": "STRING" }
                    }
                },
                "alternativeProducts": {
                    "type": "ARRAY",
                    "items": {
                        "type": "OBJECT",
                        "properties": {
                            "name": { "type": "STRING" },
                            "score": { "type": "INTEGER" },
                            "reason": { "type": "STRING" }
                        }
                    }
                }
            },
            "required": ["overallScore", "overallExplanation", "pillarScores", "pillarExplanations", "alternativeProducts"]
        }
    }
)

# Model for checking page type and extracting product info
# IMPORTANT: The LLM directly analyzing a URL to determine page type and extract product info
# is a conceptual design. In a real application, fetching the full HTML content and then
# providing that to the LLM for analysis is more robust, as LLMs cannot directly browse the web.
# For this demo, the LLM will *simulate* understanding based on the URL and *hypothetical* content.
model_page_type = genai.GenerativeModel(
    model_name="gemini-2.0-flash",
    generation_config={
        "response_mime_type": "application/json",
        "response_schema": {
            "type": "OBJECT",
            "properties": {
                "isEcommercePage": { "type": "BOOLEAN" },
                "productTitle": { "type": "STRING" },
                "brandName": { "type": "STRING" },
                "message": { "type": "STRING" }
            },
            "required": ["isEcommercePage"]
        }
    }
)

def simulate_google_search(queries):
    """
    Simulates a call to a search API. In a real application, you would
    integrate with Google Custom Search API, SerpApi, or a web scraping solution.
    For this demo, it returns dummy article snippets.
    """
    print(f"Simulating Google Search for queries: {queries}")
    dummy_results = []
    for query in queries:
        dummy_results.append({
            "query": query,
            "results": [
                {
                    "title": f"Article about {query.split(' ')[0]} sustainability",
                    "snippet": f"This article discusses the environmental practices of {query.split(' ')[0]} and its impact on carbon footprint and waste.",
                    "url": f"https://example.com/article/{query.replace(' ', '-')}"
                },
                {
                    "title": f"Review of {query.split(' ')[0]} and ethical sourcing",
                    "snippet": f"A deep dive into {query.split(' ')[0]}'s supply chain, water usage, and biodiversity efforts.",
                    "url": f"https://example.com/review/{query.replace(' ', '-')}"
                },
                {
                    "title": f"Is {query.split(' ')[0]} truly eco-friendly?",
                    "snippet": f"An independent analysis of {query.split(' ')[0]}'s resource depletion and pollution control measures.",
                    "url": f"https://example.com/eco/{query.replace(' ', '-')}"
                }
            ]
        })
    return dummy_results

@app.route('/check-page-type', methods=['POST'])
def check_page_type():
    """
    Uses LLM to analyze the provided URL to determine if it's an e-commerce product page
    and extract the main product's title and brand name.
    """
    data = request.get_json()
    product_url = data.get('productUrl', '')

    print(f"Checking page type for URL: {product_url}")

    # In a real-world scenario, you would perform a fetch of the URL's content here.
    # For this conceptual demonstration, we'll tell the LLM to analyze the URL itself.
    # If the LLM needs to analyze actual HTML, you would fetch it like this:
    # try:
    #     response = requests.get(product_url, timeout=5)
    #     response.raise_for_status() # Raise an exception for HTTP errors
    #     soup = BeautifulSoup(response.text, 'html.parser')
    #     page_content_snippet = soup.title.string if soup.title else ""
    #     # You might extract more relevant snippets or metadata from here
    #     # For this example, we'll just use the URL directly in the prompt
    # except Exception as e:
    #     print(f"Failed to fetch content from {product_url}: {e}")
    #     page_content_snippet = "Could not fetch page content."

    # Prompt for LLM to determine page type and extract product info
    page_type_prompt = f"""Given the following URL, determine if this is an e-commerce product detail page for a specific product.
    If it is, identify the primary product's title and its brand name from the context of the URL.
    If you determine it's not a product page (e.g., a home page, category page, news article, or blog), set isEcommercePage to false.

    URL: {product_url}

    Provide the response in JSON format with the following keys:
    - isEcommercePage (boolean): true if it's an e-commerce product page, false otherwise.
    - productTitle (string): The identified product title. Empty string if not found or not e-commerce.
    - brandName (string): The identified brand name. Empty string if not found or not e-commerce.
    - message (string): A short message if isEcommercePage is false (e.g., "Not an e-commerce product page" or "Could not identify a main product").

    Examples of E-commerce product URLs and expected product info:
    - URL: https://www.amazon.com/dp/B0BP6L2M54/
      Expected: {{ "isEcommercePage": true, "productTitle": "Echo Dot (5th Gen)", "brandName": "Amazon" }}
    - URL: https://www.nike.com/t/nike-air-force-1-07-mens-shoes-xDFFR1/CV1724-100
      Expected: {{ "isEcommercePage": true, "productTitle": "Nike Air Force 1 '07 Men's Shoes", "brandName": "Nike" }}
    - URL: https://www.walmart.com/ip/Nintendo-Switch-OLED-Model-The-Legend-of-Zelda-Tears-of-the-Kingdom-Edition/1614210086
      Expected: {{ "isEcommercePage": true, "productTitle": "Nintendo Switch OLED Model The Legend of Zelda: Tears of the Kingdom Edition", "brandName": "Nintendo" }}

    Examples of Non-E-commerce URLs:
    - URL: https://www.google.com/
      Expected: {{ "isEcommercePage": false, "message": "This is a search engine." }}
    - URL: https://www.nytimes.com/
      Expected: {{ "isEcommercePage": false, "message": "This is a news website." }}
    - URL: https://en.wikipedia.org/wiki/Main_Page
      Expected: {{ "isEcommercePage": false, "message": "This is an encyclopedia." }}
    """

    try:
        print("Sending page type prompt to LLM...")
        llm_response = model_page_type.generate_content(
            [{"text": page_type_prompt}]
        )
        llm_result = json.loads(llm_response.text)
        print("LLM Page Type Response:", llm_result)

        if llm_result.get('isEcommercePage'):
            return jsonify({
                "success": True,
                "isEcommercePage": True,
                "productInfo": {
                    "productTitle": llm_result.get('productTitle', ''), # Use LLM's extracted title
                    "brandName": llm_result.get('brandName', ''),     # Use LLM's extracted brand
                    "productUrl": product_url
                }
            })
        else:
            return jsonify({
                "success": True,
                "isEcommercePage": False,
                "message": llm_result.get('message', "This does not appear to be an e-commerce product page or product could not be identified.")
            })

    except Exception as e:
        print(f"Error during LLM page type check: {e}")
        return jsonify({"success": False, "message": f"An error occurred during page type check: {str(e)}"}), 500


@app.route('/analyze-sustainability', methods=['POST'])
def analyze_sustainability():
    data = request.get_json()
    product_title = data.get('productTitle')
    brand_name = data.get('brandName')
    product_url = data.get('productUrl')

    if not product_title:
        return jsonify({"success": False, "message": "Product title is required for sustainability analysis."}), 400

    print(f"Received request for sustainability analysis: {product_title} by {brand_name} at {product_url}")

    try:
        # Step 1: Prepare search queries for sustainability articles
        search_queries = [
            f"{brand_name or product_title} environmental sustainability review",
            f"{brand_name or product_title} carbon footprint",
            f"{brand_name or product_title} eco-friendly practices"
        ]

        # Step 2: Use simulated_google_search to find relevant articles
        search_results = simulate_google_search(search_queries)

        article_content = ""
        for query_result in search_results:
            for article in query_result["results"][:3]: # Take top 3 articles per query
                article_content += f"Title: {article['title']}\nSnippet: {article['snippet']}\nURL: {article['url']}\n\n"

        if not article_content:
            return jsonify({
                "success": False,
                "message": "Could not find sufficient information for sustainability analysis."
            }), 200 # Return 200 as it's a valid response, just no info found

        # Step 3: Call LLM to churn out environmental sustainability score based on the 6 pillars.
        prompt = f"""Analyze the following articles about "{product_title}" by "{brand_name}" and provide a detailed environmental sustainability assessment based on the 6 pillars below.
        Also, suggest 2-3 alternative products that are similar but have a better or comparable environmental score, with their estimated scores.

        **6 Pillars of Environmental Sustainability:**
        1.  **Carbon Footprint**: Emissions from production, transport, use, and disposal.
        2.  **Water Usage**: Amount of water consumed or polluted.
        3.  **Waste Generation & Circularity**: Amount and type of waste produced, focus on recycling, reuse, and circular economy principles.
        4.  **Resource Depletion (Non-Renewable)**: Use of finite natural resources.
        5.  **Biodiversity & Ecosystem Impact**: Effects on natural habitats, species, and ecosystems.
        6.  **Pollution (Air, Water, Soil)**: Release of harmful substances into the environment.

        **Instructions for LLM:**
        * Provide an overall sustainability score for the product/brand (0-100, where 100 is highly sustainable).
        * Provide a score (0-100) for each of the 6 pillars.
        * Give a brief explanation for the overall score and each pillar's score based on the provided text.
        * Provide 2-3 alternative product suggestions, including their names, estimated sustainability scores (0-100), and a brief reason for their recommendation.
        * Output the response in JSON format.

        **Article Content:**
        {article_content}
        """
        print("Sending prompt to LLM (sustainability analysis)...")
        # Make the generative AI API call
        response = model_sustainability.generate_content(
            [{"text": prompt}]
        )
        print("LLM response received (sustainability analysis).")

        # The response.text will already be the JSON string due to response_mime_type and response_schema
        sustainability_data = json.loads(response.text)

        return jsonify({"success": True, "data": sustainability_data})

    except Exception as e:
        print(f"Error during sustainability analysis: {e}")
        return jsonify({"success": False, "message": f"An error occurred: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
