from flask import Flask, request, jsonify
from groq import Groq
import os
from flask_cors import CORS


app = Flask(__name__)
CORS(app)

# Initialize the Groq client
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

@app.route('/api/ask', methods=['POST'])
def ask_assistant():
    """Endpoint to process user questions and return the assistant's response."""
    data = request.json
    user_input = data.get("question", "")
    
    if not user_input:
        return jsonify({"error": "No question provided."}), 400

    try:
        # Create a chat completion
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": user_input}],
            temperature=0.7,
            max_tokens=2048,
            top_p=1,
            stream=False,
            stop=None,
        )

        # Extract the assistant's reply
        reply = completion.choices[0].message.content
        return jsonify({"reply": reply})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
