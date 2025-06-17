# app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
from dotenv import load_dotenv
import os
import json

app = Flask(__name__)
CORS(app) # Enable CORS for all routes, allowing your extension to access it

# Configure Gemini API key from environment variable for security
# IMPORTANT: Replace 'GEMINI_API_KEY' in .env with your actual key or set it as an environment variable.
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") # Replace with your key for local testing or set ENV var
genai.configure(api_key=GEMINI_API_KEY)

# Use a single, powerful Gemini model for combined analysis
model_combined_analysis = genai.GenerativeModel(
    model_name="gemini-2.0-flash", # Use a fast model
    generation_config={
        "response_mime_type": "application/json",
        "temperature": 0.1, # Use low temperature for consistent, factual responses
        "response_schema": {
            "type": "OBJECT",
            "properties": {
                "hasMainProduct": { "type": "BOOLEAN" },
                "message": { "type": "STRING"},
                "productTitle": { "type": "STRING" },
                "brandName": { "type": "STRING" },
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
                "justifyingLinks": { # Simulated links
                    "type": "ARRAY",
                    "items": {
                        "type": "OBJECT",
                        "properties": {
                            "title": { "type": "STRING" },
                            "url": { "type": "STRING" }
                        }
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
            "required": [ # IMPORTANT: Required fields for the response
                "hasMainProduct",
                "message",
                "productTitle",
                "brandName",
                "overallScore",
                "overallExplanation",
                "pillarScores",
                "pillarExplanations",
                "justifyingLinks",
                "alternativeProducts"
            ]
        }
    }
)

@app.route('/analyze-product-page', methods=['POST'])
def analyze_product_page():
    data = request.get_json()
    url = data.get('url', '')
    html_content = data.get('html_content', '')

    if not html_content or not url:
        return jsonify({"success": False, "message": "URL and HTML content are required."}), 400

    print(f"Received request for combined analysis of URL: {url}")

    # Prompt for LLM to perform all tasks: identify product, analyze sustainability, provide links and alternatives
    prompt = f"""
    You are given a webpage's URL. Your task is to determine whether this page is a detailed product page for a single item (not a category page, homepage, or listing). If it is, extract product details and generate a structured environmental sustainability assessment in JSON format.

    Step 1: Determine Page Type
    If the HTML represents a detailed product page for a single product, proceed with the following steps.

    If it is a homepage, category, search result, or non-product page, return a JSON with only:

    {{
    "hasMainProduct": false,
    "message": "short explanation (e.g., 'This is a category page with multiple products listed.')"
    }}

    Step 2: If It IS a Product Page (hasMainProduct = true)
    Return the following fields in JSON format:

    {{
    "hasMainProduct": true,
    "productTitle": "<Concise main product name without specifications, extra details, or repetition (max 100 characters)>",
    "brandName": "<Brand name only, without model or qualifiers (max 50 characters)>",
    "overallScore": <Environmental score from 0-10>,
    "overallExplanation": "<1-2 sentence summary explaining the score holistically>",
    "pillarScores": {{
        "Carbon Footprint": 0-10,
        "Water Usage": 0-10,
        "Waste Generation & Circularity": 0-10,
        "Resource Depletion": 0-10,
        "Biodiversity & Ecosystem Impact": 0-10,
        "Pollution": 0-10
    }},
    "pillarExplanations": {{
        "Carbon Footprint": "<1-2 sentences>",
        "Water Usage": "<1-2 sentences>",
        "Waste Generation & Circularity": "<1-2 sentences>",
        "Resource Depletion": "<1-2 sentences>",
        "Biodiversity & Ecosystem Impact": "<1-2 sentences>",
        "Pollution": "<1-2 sentences>"
    }},
    "justifyingLinks": [
        {{
        "title": "<Article Title 1>",
        "url": "<Article Link 1>"
        }},
        {{
        "title": "<Article Title 2>",
        "url": "<Article Link 2>"
        }},
        {{
        "title": "<Article Title 3>",
        "url": "<Article Link 3>"
        }}
    ],
    "alternativeProducts": [
        {{
        "name": "<Alternative Product Name>",
        "estimatedScore": <Environmental score from 0-10>,
        "reason": "<1 sentence reason why this is a more sustainable alternative>"
        }},
        {{
        "name": "<Alternative Product Name>",
        "estimatedScore": <Environmental score from 0-10>,
        "reason": "<1 sentence reason why this is a more sustainable alternative>"
        }},
        {{
        "name": "<Alternative Product Name>",
        "estimatedScore": <Environmental score from 0-10>,
        "reason": "<1 sentence reason why this is a more sustainable alternative>"
        }}
    ]
    }}

    Strict Formatting Instructions:
    - Do not include specifications, dimensions, or promotional language in productTitle.
        Valid ProductTitle -> "EcoBottle Stainless Steel Water Bottle"
        Invalid ProductTitle -> "EcoBottle 750ml Stainless Steel BPA-Free Insulated Water Bottle with Lid"
    - Keep brand names simple and clean (e.g., "Samsung", "Patagonia", "Dell").
    - overallScore and each pillarScore must be a number from 0 to 10.
    - Only return valid and accessible article links that are relevant and recent.
    - **Trim all leading/trailing whitespace** in every string.
    - **Condense internal spaces** so `"LG   Monitor"` becomes `"LG Monitor"`.
    - productTitle ≤ 100 chars, brandName ≤ 50 chars.
    - No newline or tab characters inside values.
    - Only return valid JSON
    - No markdown, no comments, no special characters, and no non-JSON text.

    Input:
    URL: {url}
    """


    try:
        print("Sending combined analysis prompt to LLM...")
        llm_response = model_combined_analysis.generate_content(
            [{"text": prompt}]
        )
        print("LLM Combined Analysis Raw Response Text:", llm_response.text) # <-- Added for debugging

        if not llm_response.text:
            return jsonify({"success": False, "message": "LLM returned an empty response."}), 500

        try:
            llm_result = json.loads(llm_response.text)
        except json.JSONDecodeError as e:
            print(f"JSON Decode Error: {e}")
            print(f"Problematic LLM response: {llm_response.text}") # Print raw response for debugging
            return jsonify({
                "success": False,
                "message": f"LLM returned invalid JSON: {e}. Raw response logged for debugging."
            }), 500

        print("LLM Combined Analysis Parsed Result:", llm_result)

        # Structure the response consistently
        if llm_result.get('hasMainProduct'):
            return jsonify({
                "success": True,
                "hasMainProduct": True,
                "productTitle": llm_result.get('productTitle', ''),
                "brandName": llm_result.get('brandName', ''),
                "overallScore": llm_result.get('overallScore'),
                "overallExplanation": llm_result.get('overallExplanation', ''),
                "pillarScores": llm_result.get('pillarScores', {}),
                "pillarExplanations": llm_result.get('pillarExplanations', {}),
                "justifyingLinks": llm_result.get('justifyingLinks', []),
                "alternativeProducts": llm_result.get('alternativeProducts', [])
            })
        else:
            return jsonify({
                "success": True,
                "hasMainProduct": False,
                "message": llm_result.get('message', "No main product identified on this page.")
            })

    except Exception as e:
        print(f"Error during combined LLM analysis: {e}")
        return jsonify({"success": False, "message": f"An error occurred during analysis: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
