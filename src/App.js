import React, { useState } from "react";
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase-config';
import Login from './components/Login';
import './App.css';
import ReactMarkdown from 'react-markdown';
import TypewriterText from './components/TypewriterText';

function App() {
    const [question, setQuestion] = useState("");
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [user, authLoading] = useAuthState(auth);

    const askAssistant = async () => {
        if (!question.trim()) {
            return;
        }

        const userMessage = question;
        setMessages(prevMessages => [...prevMessages, 
            { type: 'user', content: userMessage }
        ]);
        
        setLoading(true);
        setQuestion("");

        try {
            const res = await fetch("http://127.0.0.1:5000/api/ask", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question: userMessage }),
            });

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            const data = await res.json();

            if (data.reply) {
                setMessages(prevMessages => [...prevMessages, 
                    { type: 'assistant', content: data.reply }
                ]);
            } else {
                setMessages(prevMessages => [...prevMessages, 
                    { type: 'assistant', content: data.error || "No response received." }
                ]);
            }
        } catch (err) {
            setMessages(prevMessages => [...prevMessages, 
                { type: 'assistant', content: `Error: ${err.message}. Make sure the backend server is running at http://127.0.0.1:5000` }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            if (e.ctrlKey) {
                setQuestion(prev => prev + '\n');
                e.preventDefault();
            } else if (!e.shiftKey) {
                e.preventDefault();
                askAssistant();
            }
        }
    };

    if (authLoading) {
        return <div>Loading...</div>;
    }

    if (!user) {
        return <Login />;
    }

    return (
        <div className="app-container">
            <nav className="top-nav">
                <div className="nav-brand">AI PC Assistant</div>
                <button 
                    onClick={() => auth.signOut()}
                    className="sign-out-button"
                >
                    Sign Out
                </button>
            </nav>

            <div className="main-content">
                <nav className="side-nav">
                    <ul>
                        <li className="active">Chat</li>
                        <li>History</li>
                        <li>Settings</li>
                    </ul>
                </nav>

                <div className="chat-area">
                    <div className="chat-container">
                        <div className="messages-container">
                            {messages.map((message, index) => (
                                <div key={index} 
                                    className={`message ${message.type === 'user' ? 'user-message' : 'assistant-message'}`}
                                >
                                    {message.type === 'user' ? (
                                        <ReactMarkdown>{message.content}</ReactMarkdown>
                                    ) : (
                                        <TypewriterText text={message.content} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="input-container">
                        <textarea
                            className="chat-input"
                            rows="4"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            onKeyDown={handleKeyPress}
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
