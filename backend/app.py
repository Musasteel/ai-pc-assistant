from flask import Flask, request, jsonify, session
from groq import Groq
import os
from flask_cors import CORS
from fuzzywuzzy import process
from dotenv import load_dotenv
from pathlib import Path
from amazon_paapi import AmazonApi
import re
from datetime import datetime, timedelta

# Load environment variables
load_dotenv(Path(__file__).parent / 'key.env')

app = Flask(__name__)
CORS(app)
app.secret_key = os.urandom(24)

# Initialize clients
client = Groq(api_key=os.getenv("GROQ_API_KEY"))
amazon_api = AmazonApi(
    key=os.getenv("AMAZON_ACCESS_KEY"),
    secret=os.getenv("AMAZON_SECRET_KEY"),
    tag=os.getenv("AMAZON_ASSOCIATE_TAG"),
    country="US"  
)

# Simple cache for Amazon product results
product_cache = {}
CACHE_DURATION = timedelta(hours=1)

# Define PC-related keywords for validation
PC_KEYWORDS = {
    # General PC Terms
    'cpu', 'gpu', 'processor', 'graphics card', 'motherboard', 'ram', 'memory',
    'storage', 'ssd', 'hdd', 'power supply', 'psu', 'case', 'cooling', 'fan',
    'build', 'computer', 'pc', 'gaming', 'benchmark', 'performance', 'upgrade',
    'compatibility', 'temperature', 'overclock', 'budget', 'monitor',
    
    # Manufacturers
    'amd', 'intel', 'nvidia', 'ryzen', 'core i', 'rtx', 'radeon',
    'asus', 'msi', 'gigabyte', 'asrock', 'evga', 'corsair', 'nzxt',
    'crucial', 'western digital', 'seagate', 'samsung', 'thermaltake',
    'cooler master', 'g.skill', 'kingston', 'sapphire', 'zotac',
    
    # Specific Components and other categories...
    'ddr4', 'ddr5', 'm.2', 'nvme', 'sata', 'atx', 'micro atx', 'mini itx',
    'rgb', 'argb', 'displayport', 'hdmi', 'usb', 'pcie', 'ethernet'
}

SYSTEM_MESSAGE = """You are a specialized PC building assistant with extensive knowledge of computer hardware. Your primary goal is to recommend current-generation components that provide the best value and performance. When making recommendations:

1. Always format product recommendations with double brackets: [[Product Name]]
2. Follow these guidelines for current generation awareness:

Component Selection Guidelines:
- Always recommend the most recent generation of components available as of the current date
- For CPUs, specify the generation (e.g., "13th/14th gen" for Intel, "7000 series" for AMD)
- For RAM, specify the generation and speed (e.g., "DDR5-6000")
- For storage, specify the interface generation (e.g., "PCIe Gen 4", "PCIe Gen 5")

Price-Performance Guidelines:
- Consider the release date and price-to-performance ratio
- Factor in real-world availability and pricing
- Account for user's budget constraints

Example Format:

Recommended Core Components:
• CPU: [[Latest Generation CPU Model]]
• GPU: [[Latest Generation GPU Model]]
• RAM: [[Current Gen RAM with Speed]]

Try to keep responses concise and use bullet points where applicable. Additionally only reccomened one product per category, and provide only the link to the reccomended part. (i.e. instead of reccommending both an AMD and NVIDIA graphics card, choose one and reccommend it)

Always specify the generation/series in your recommendations to help users identify current components."""

def extract_generation_info(product_name):
    """Extract generation information from product names"""
    product_lower = product_name.lower()
    generation_indicators = {
        'cpu_intel': r'i[3579]-1[0-9]',  # Intel 10th gen and up
        'cpu_amd': r'ryzen [3579] [567]',  # Ryzen 5000 and up
        'gpu_nvidia': r'rtx [234]',  # RTX 20, 30, 40 series
        'gpu_amd': r'rx [567]',  # RX 5000, 6000, 7000 series
        'ram': r'ddr[45]',  # DDR4 or DDR5
        'storage': r'pcie [45]'  # PCIe Gen 4 or 5
    }
    
    for component_type, pattern in generation_indicators.items():
        if re.search(pattern, product_lower):
            return component_type
    return None

def is_pc_related(question, threshold=70):
    """Check if the question is PC-related using fuzzy matching"""
    words = question.lower().split()
    
    # Check single words
    for word in words:
        best_match, score = process.extractOne(word, PC_KEYWORDS)
        if score >= threshold:
            return True
            
    # Check two-word combinations
    if len(words) >= 2:
        two_word_phrases = [' '.join(words[i:i+2]) for i in range(len(words)-1)]
        for phrase in two_word_phrases:
            best_match, score = process.extractOne(phrase, PC_KEYWORDS)
            if score >= threshold:
                return True
    
    return False

def get_cached_product(product_name):
    """Get product from cache if it exists and is not expired"""
    if product_name in product_cache:
        cache_entry = product_cache[product_name]
        if datetime.now() - cache_entry['timestamp'] < CACHE_DURATION:
            return cache_entry['data']
    return None

def cache_product(product_name, data):
    """Cache product data with timestamp"""
    product_cache[product_name] = {
        'data': data,
        'timestamp': datetime.now()
    }

def clean_amazon_url(url):
    """Clean Amazon URL to remove tracking parameters and add affiliate tag"""
    asin_match = re.search(r'/dp/([A-Z0-9]{10})', url)
    if asin_match:
        asin = asin_match.group(1)
        return f"https://www.amazon.com/dp/{asin}?tag={os.getenv('AMAZON_ASSOCIATE_TAG')}"
    
    product_name = re.search(r'k=([^&]+)', url)
    if product_name:
        return f"https://www.amazon.com/s?k={product_name.group(1)}&tag={os.getenv('AMAZON_ASSOCIATE_TAG')}"
    
    return url

def search_amazon(product_name):
    """Search Amazon with caching"""
    cached_result = get_cached_product(product_name)
    if cached_result:
        return cached_result

    try:
        response = amazon_api.search_items(
            keywords=product_name,
            search_index='Electronics',
            item_count=1
        )
        
        if response and 'Items' in response and response['Items']:
            item = response['Items'][0]
            original_url = item.get('DetailPageURL', '')
            clean_url = clean_amazon_url(original_url)
            
            result = {
                'name': product_name,
                'url': clean_url,
                'price': item.get('Offers', {}).get('Listings', [{}])[0].get('Price', {}).get('DisplayAmount', 'Check price on Amazon')
            }
            cache_product(product_name, result)
            return result
            
    except Exception as e:
        print(f"Error searching for {product_name}: {e}")
    
    # Fallback: Create a clean search URL
    encoded_name = product_name.replace(' ', '+')
    result = {
        'name': product_name,
        'url': f"https://www.amazon.com/s?k={encoded_name}&tag={os.getenv('AMAZON_ASSOCIATE_TAG')}",
        'price': 'Check price on Amazon'
    }
    cache_product(product_name, result)
    return result

def process_response_with_affiliate_links(assistant_response):
    """Process the assistant's response and add affiliate links"""
    products = list(set(re.findall(r'\[\[(.*?)\]\]', assistant_response)))
    
    if not products:
        return assistant_response, []
    
    affiliate_links = []
    modified_response = assistant_response
    
    for product in products:
        result = search_amazon(product)
        if result:
            affiliate_link = f"• {result['name']}: {result['price']} - [View on Amazon]({result['url']})"
            affiliate_links.append(affiliate_link)
            
            modified_response = modified_response.replace(
                f"[[{product}]]",
                f"{product} ({result['price']})"
            )
    
    if affiliate_links:
        modified_response += "\n\nProduct Links:\n" + "\n".join(affiliate_links)
    
    return modified_response, affiliate_links

@app.route('/api/ask', methods=['POST'])
def ask_assistant():
    """Endpoint to process PC-related questions and return response with affiliate links"""
    data = request.json
    user_input = data.get("question", "")
    
    if not user_input:
        return jsonify({"error": "No question provided."}), 400

    # Initialize conversation history if it doesn't exist
    if 'conversation' not in session:
        session['conversation'] = []

    # Check if it's a follow-up question
    is_followup = any(word in user_input.lower() for word in [
        'what about', 'and', 'then', 'also', 'but', 'why',
        'how about', 'what if', 'follow up', 'another question'
    ])

    # Only check PC-related keywords if it's not a follow-up question
    if not is_followup and not is_pc_related(user_input):
        return jsonify({
            "reply": "I'm specifically designed to help with PC building and hardware questions. "
                    "Could you please ask something related to computer hardware, building a PC, "
                    "or component selection?"
        })
    
    try:
        messages = [{"role": "system", "content": SYSTEM_MESSAGE}]
        messages.extend(session['conversation'][-5:])
        messages.append({"role": "user", "content": user_input})

        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.7,
            max_tokens=2048,
            top_p=1,
            stream=False
        )

        initial_reply = completion.choices[0].message.content
        processed_reply, affiliate_links = process_response_with_affiliate_links(initial_reply)

        # Update conversation history
        session['conversation'].append({"role": "user", "content": user_input})
        session['conversation'].append({"role": "assistant", "content": processed_reply})

        # Add follow-up suggestion if not present
        if not any(phrase in processed_reply.lower() for phrase in [
            "anything else", "follow-up", "more questions", "let me know if",
            "feel free to ask", "would you like to know"
        ]):
            processed_reply += "\n\nFeel free to ask any follow-up questions about your PC build!"

        return jsonify({
            "reply": processed_reply,
            "affiliate_links": affiliate_links
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)