import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TestMenuInquiry } from './TestMenuInquiry';
import './TestMenuPage.css';

const TestMenuPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="test-menu-page" style={{ padding: '2rem 1rem', maxWidth: 1100, margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => navigate('/') }>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
            <path d="M12 6v6l4 2"/>
          </svg>
          <strong>SLNCity Diagnostics</strong>
        </div>
        <button className="btn-back" onClick={() => navigate('/') }>← Back to Home</button>
      </header>

      <main>
        <h1 style={{ marginBottom: '0.5rem' }}>Test Menu</h1>
        <p style={{ marginBottom: '1rem', color: '#444' }}>Browse our available tests and submit an inquiry for pricing or bookings.</p>
        <TestMenuInquiry />
      </main>

      <footer style={{ marginTop: '2rem', color: '#666', fontSize: 14 }}>
        <div>© 2025 SLNCity Diagnostics</div>
      </footer>
    </div>
  );
};

export default TestMenuPage;
