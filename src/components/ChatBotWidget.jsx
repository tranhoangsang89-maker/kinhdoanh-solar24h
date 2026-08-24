import React, { useState } from 'react';
import './ChatBotWidget.css';

const ChatBotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        className={`chatbot-toggle-btn ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Trợ lý ảo Solar Girl"
      >
        {isOpen ? (
          <i className="fa-solid fa-xmark"></i>
        ) : (
          <img src="/SolarGirl.png" alt="Solar Girl" className="chatbot-avatar" />
        )}
      </button>

      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <h3>☀️ Solar Girl AI</h3>
            <button onClick={() => setIsOpen(false)} className="close-btn-sm">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
          <iframe 
            src="https://solargirlai.onrender.com/" 
            title="Solar Girl AI Chatbot"
            className="chatbot-iframe"
          />
        </div>
      )}
    </>
  );
};

export default ChatBotWidget;
