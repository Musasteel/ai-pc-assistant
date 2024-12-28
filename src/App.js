import React, { useState } from "react";
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase-config';
import Login from './components/Login';
import './App.css';

function App() {
    const [question, setQuestion] = useState("");
    const [response, setResponse] = useState("");
    const [loading, setLoading] = useState(false);
    const [user, authLoading] = useAuthState(auth);

    const askAssistant = async () => {
        if (!question.trim()) {
            setResponse("Please enter a question");
            return;
        }

        setLoading(true);
        setResponse("");

        try {
            const res = await fetch("http://127.0.0.1:5000/api/ask", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question }),
            });

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            const data = await res.json();

            if (data.reply) {
                setResponse(data.reply);
            } else {
                setResponse(data.error || "No response received.");
            }
        } catch (err) {
            setResponse(`Error: ${err.message}. Make sure the backend server is running at http://127.0.0.1:5000`);
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

    if (!user) {
        return <Login />;
    }

    return (
        <div className="app-container">
            {/* Top Navigation */}
            <nav className="top-nav">
                <div className="nav-brand">AI PC Assistant</div>
                <button 
                    onClick={() => auth.signOut()}
                    className="sign-out-button"
                >
                    Sign Out
                </button>
            </nav>

            {/* Main Content Area */}
            <div className="main-content">
                {/* Side Navigation */}
                <nav className="side-nav">
                    <ul>
                        <li className="active">Chat</li>
                        <li>History</li>
                        <li>Settings</li>
                    </ul>
                </nav>

                {/* Chat Area */}
                <div className="chat-area">
                    <div className="chat-container">
                        <div className="messages-container">
                            {question && (
                                <div className="message user-message">
                                    <p>{question}</p>
                                </div>
                            )}
                            {response && (
                                <div className="message assistant-message">
                                    <p>{response}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="input-container">
                        <textarea
                            className="chat-input"
                            rows="4"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            onKeyDown={handleKeyPress}  // Added keyboard shortcuts
                            placeholder="Ask a question... (Press Enter to send, Ctrl+Enter for new line)"
                        />
                        <button
                            onClick={askAssistant}
                            className="send-button"
                            disabled={loading}
                        >
                            {loading ? "Loading..." : "Ask"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;
