import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

const TypewriterText = ({ text }) => {
    const [displayedText, setDisplayedText] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (currentIndex < text.length) {
            const timer = setTimeout(() => {
                setDisplayedText(text.substring(0, currentIndex + 1));
                setCurrentIndex(currentIndex + 1);
            }, 10); // Adjust speed here (lower = faster)
            return () => clearTimeout(timer);
        }
    }, [currentIndex, text]);

    return <ReactMarkdown>{displayedText}</ReactMarkdown>;
};

export default TypewriterText;