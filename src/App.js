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
    const [isSideNavOpen, setIsSideNavOpen] = useState(true);
    const [isDarkMode, setIsDarkMode] = useState(false);

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

    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode);
        document.body.classList.toggle('dark-mode');
    };

    if (authLoading) {
        return <div>Loading...</div>;
    }

    if (!user) {
        return <Login />;
    }

    return (
        <div className="app-container">
            <div className="sign-out-container">
                <button 
                    onClick={() => auth.signOut()}
                    className="sign-out-button"
                >
                    Sign Out
                </button>
            </div>

            <div className="main-content">
                <div className={`side-nav ${isSideNavOpen ? 'open' : 'closed'}`}>
                    <div className="nav-header">
                        <button 
                            className="hamburger-menu"
                            onClick={() => setIsSideNavOpen(!isSideNavOpen)}
                        >
                            ☰
                        </button>
                        <span className="nav-title">AI PC Assistant</span>
                    </div>
                    <div className="nav-content">
                        <ul>
                            <li className="active">Chat</li>
                            <li>History</li>
                        </ul>
                    </div>
                    <div className="nav-footer">
                        <button className="settings-button">
                            ⚙️
                        </button>
                        <button 
                            className="theme-toggle"
                            onClick={toggleTheme}
                        >
                            {isDarkMode ? '☀️' : '🌙'}
                        </button>
                    </div>
                </div>

                <div className="chat-area">
                    <div className="chat-container">
                        <div className="messages-container">
                            {messages.length === 0 ? (
                                <div className="welcome-message">
                                    <div className="typewriter">
                                        Hello, Welcome to the AI PC Builder
                                    </div>
                                </div>
                            ) : (
                                messages.map((message, index) => (
                                    <div key={index} 
                                        className={`message ${message.type === 'user' ? 'user-message' : 'assistant-message'}`}
                                    >
                                        {message.type === 'user' ? (
                                            <ReactMarkdown>{message.content}</ReactMarkdown>
                                        ) : (
                                            <TypewriterText text={message.content} />
                                        )}
                                    </div>
                                ))
                            )}
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
