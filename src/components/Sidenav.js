import React from 'react';

const Sidenav = ({ isOpen, setIsOpen }) => {
    return (
        <div className={`sidenav ${isOpen ? 'open' : ''}`}>
            <div className="sidenav-content">
                <h2>AI PC Builder</h2>
                {/* Add more navigation items here if needed */}
            </div>
        </div>
    );
};

export default Sidenav;
