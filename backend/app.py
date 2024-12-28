from flask import Flask, request, jsonify, session
from groq import Groq
import os
from flask_cors import CORS
from fuzzywuzzy import process
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables from ~/.env file
load_dotenv(Path.home() / '.env')

app = Flask(__name__)
CORS(app)
app.secret_key = os.urandom(24)  # Required for session management

# Initialize the Groq client
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

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
    
    # Specific Components
    'ddr4', 'ddr5', 'm.2', 'nvme', 'sata', 'atx', 'micro atx', 'mini itx',
    'rgb', 'argb', 'displayport', 'hdmi', 'usb', 'pcie', 'ethernet',
    'wifi', 'bluetooth', 'heatsink', 'thermal paste', 'air cooling',
    'liquid cooling', 'aio', 'water cooling', 'cable management',
    
    # Performance Terms
    'fps', 'refresh rate', 'resolution', 'clock speed', 'boost clock',
    'bottleneck', 'latency', 'temps', 'voltage', 'wattage', 'tdp',
    '1080p', '1440p', '4k', 'ultra', 'gaming pc', 'workstation',
    
    # Specific Product Lines
    'geforce', 'rtx 4090', 'rtx 4080', 'rtx 4070', 'rtx 3090', 'rtx 3080',
    'rtx 3070', 'rtx 3060', 'rx 7900', 'rx 6900', 'rx 6800', 'rx 6700',
    'core i9', 'core i7', 'core i5', 'core i3', 'ryzen 9', 'ryzen 7',
    'ryzen 5', 'ryzen 3', 'threadripper',
    
    # Building Terms
    'build guide', 'tutorial', 'installation', 'setup', 'bios', 'uefi',
    'drivers', 'mounting', 'screws', 'standoffs', 'thermal compound',
    'cable ties', 'modular', 'non-modular', 'tempered glass',
    
    # Shopping Terms
    'price', 'cost', 'worth', 'value', 'cheap', 'expensive', 'high-end',
    'mid-range', 'budget build', 'premium', 'msrp', 'deal', 'sale',
    'recommendation', 'suggest', 'compare', 'versus', 'vs',
    
    # Problems & Solutions
    'troubleshoot', 'issue', 'problem', 'error', 'crash', 'blue screen',
    'bsod', 'freeze', 'overheat', 'noise', 'loud', 'quiet', 'debug',
    'fix', 'repair', 'replace', 'upgrade path'
}

# Updated system message to handle follow-up questions
SYSTEM_MESSAGE = """You are a specialized PC building assistant. Your role is to help users with:
1. PC component selection and compatibility
2. Building process guidance
3. Troubleshooting PC building issues
4. Performance optimization recommendations
5. Budget considerations for PC builds

Remember previous context when answering follow-up questions. If a user asks for clarification
or has additional questions about their build, refer back to the previous discussion.

Always encourage users to ask follow-up questions if they need more clarity. End your responses
with a question or invitation for follow-up if the topic might need more clarification.

Only answer questions related to PC building and hardware."""

def is_pc_related(question, threshold=70):
    """
    Check if the question is PC-related using fuzzy matching.
    threshold: minimum similarity score (0-100) to consider a match
    """
    # Split the question into words
    words = question.lower().split()
    
    # Check each word against our keywords
    for word in words:
        # Get the best match and score for this word
        best_match, score = process.extractOne(word, PC_KEYWORDS)
        if score >= threshold:
            return True
            
    # Check for two-word combinations (for terms like "graphics card")
    if len(words) >= 2:
        two_word_phrases = [' '.join(words[i:i+2]) for i in range(len(words)-1)]
        for phrase in two_word_phrases:
            best_match, score = process.extractOne(phrase, PC_KEYWORDS)
            if score >= threshold:
                return True
    
    return False

@app.route('/api/ask', methods=['POST'])
def ask_assistant():
    """Endpoint to process PC-related questions and return the assistant's response."""
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
        # Prepare conversation history for context
        messages = [{"role": "system", "content": SYSTEM_MESSAGE}]
        
        # Add conversation history (last 5 exchanges)
        for msg in session['conversation'][-5:]:
            messages.append(msg)
            
        # Add current user message
        messages.append({"role": "user", "content": user_input})

        # Create a chat completion with conversation history
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.7,
            max_tokens=2048,
            top_p=1,
            stream=False,
            stop=None,
        )

        # Extract the assistant's reply
        reply = completion.choices[0].message.content

        # Update conversation history
        session['conversation'].append({"role": "user", "content": user_input})
        session['conversation'].append({"role": "assistant", "content": reply})
        
        # Suggest follow-up if not already present in reply
        if not any(phrase in reply.lower() for phrase in [
            "anything else", "follow-up", "more questions", "let me know if",
            "feel free to ask", "would you like to know"
        ]):
            reply += "\n\nFeel free to ask any follow-up questions about your PC build!"

        return jsonify({"reply": reply})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
