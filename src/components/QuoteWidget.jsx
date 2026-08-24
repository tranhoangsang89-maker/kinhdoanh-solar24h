import React, { useState } from 'react';
import './QuoteWidget.css';

const QuoteWidget = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        className={`quote-toggle-btn ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Tạo Báo Giá Tự Động"
      >
        {isOpen ? (
          <>
            <span style={{fontSize: '1.2rem', lineHeight: 1}}>✕</span> Đóng
          </>
        ) : (
          <>
            <span style={{fontSize: '1.2rem', lineHeight: 1}}>⚡</span> Báo Giá Nhanh
          </>
        )}
      </button>

      {isOpen && (
        <div className="quote-window">
          <div className="quote-header">
            <h3>📄 Báo Giá Tự Động</h3>
            <button onClick={() => setIsOpen(false)} className="close-btn-sm">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
          <iframe 
            src="https://baogia-solar24h.netlify.app/" 
            title="Báo Giá Solar 24h"
            className="quote-iframe"
          />
        </div>
      )}
    </>
  );
};

export default QuoteWidget;
