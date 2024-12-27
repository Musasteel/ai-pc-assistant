import React, { useState } from "react";
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase-config';
import Login from './components/Login';

function App() {
    const [question, setQuestion] = useState("");
    const [response, setResponse] = useState("");
    const [loading, setLoading] = useState(false);
    const [user, authLoading] = useAuthState(auth);

    const askAssistant = async () => {
        setLoading(true);
        setResponse(""); // Clear previous response
    
        try {
            const res = await fetch("http://127.0.0.1:5000/api/ask", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question }),
            });
    
            const data = await res.json();
    
            if (data.reply) {
                setResponse(data.reply);
            } else {
                setResponse(data.error || "No response received.");
            }
        } catch (err) {
            setResponse("Error: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Updated function to handle different key combinations
    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            if (e.ctrlKey) {
                // Allow new line with Ctrl+Enter
                setQuestion(prev => prev + '\n');
                e.preventDefault();
            } else if (!e.shiftKey) {
                // Send message with Enter
                e.preventDefault();
                askAssistant();
            }
        }
    };

    // Show loading state while checking authentication
    if (authLoading) {
        return <div>Loading...</div>;
    }

    // If user is not authenticated, show login page
    if (!user) {
        return <Login />;
    }

    // If user is authenticated, show the chat interface
    return (
        <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h1>AI PC Assistant</h1>
                <button 
                    onClick={() => auth.signOut()}
                    style={{
                        padding: "8px 16px",
                        background: "#dc3545",
                        color: "white",
                        border: "none",
                        borderRadius: "5px",
                        cursor: "pointer",
                    }}
                >
                    Sign Out
                </button>
            </div>
            <textarea
                rows="4"
                cols="50"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyPress}  // Changed from onKeyPress to onKeyDown
                placeholder="Ask a question... (Press Enter to send, Ctrl+Enter for new line)"
                style={{
                    width: "100%",
                    padding: "10px",
                    marginBottom: "10px",
                    borderRadius: "5px",
                    border: "1px solid #ccc",
                    resize: "vertical",  // Allows vertical resizing only
                    minHeight: "100px",  // Minimum height
                }}
            />
            <br />
            <button
                onClick={askAssistant}
                style={{
                    marginTop: "10px",
                    padding: "10px 20px",
                    background: "#007BFF",
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer",
                }}
                disabled={loading}
            >
                {loading ? "Loading..." : "Ask"}
            </button>
            <h2>Response:</h2>
            <p style={{ whiteSpace: "pre-wrap" }}>{response}</p>
        </div>
    );
}

export default App;
