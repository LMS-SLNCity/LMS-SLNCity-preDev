import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Landing.css';

// Minimal outline icons (non-Lucene) built with plain SVG
const TestTubeIcon = () => (
  <svg viewBox="0 0 64 64" aria-hidden="true" className="icon">
    <path d="M22 6h20v6H22z" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M24 12v30c0 6.6 4.4 12 10 12s10-5.4 10-12V12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M24 20h16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const HeartbeatIcon = () => (
  <svg viewBox="0 0 64 64" aria-hidden="true" className="icon">
    <path d="M12 28c0-8 6-14 14-14 4.6 0 8.6 2.4 11 6 2.4-3.6 6.4-6 11-6 8 0 14 6 14 14 0 14-18 24-25 28-7-4-25-14-25-28z" fill="none" stroke="currentColor" strokeWidth="2.5" />
    <path d="M10 30h10l5-12 6 22 5-12h8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const MicroscopeIcon = () => (
  <svg viewBox="0 0 64 64" aria-hidden="true" className="icon">
    <path d="M26 12h10v16H26z" fill="none" stroke="currentColor" strokeWidth="2.5" />
    <path d="M22 10h18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M32 28v10c0 4-3 7-7 7h-7" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M14 52h36" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="44" cy="34" r="6" fill="none" stroke="currentColor" strokeWidth="2.5" />
  </svg>
);

const DropperIcon = () => (
  <svg viewBox="0 0 64 64" aria-hidden="true" className="icon">
    <path d="M40 10l8 8c2 2 2 5.2 0 7.2l-4.5 4.6-15.3 15.3c-2 2-5.2 2-7.2 0l-2.8-2.8c-2-2-2-5.2 0-7.2l15.3-15.3 4.5-4.6C34.8 12 38 12 40 14z" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M18 46l-8 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M42 22l-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const ShieldIcon = () => (
  <svg viewBox="0 0 64 64" aria-hidden="true" className="icon">
    <path d="M32 6l18 8v12c0 12-7.5 23.2-18 28-10.5-4.8-18-16-18-28V14z" fill="none" stroke="currentColor" strokeWidth="2.5" />
    <path d="M24 30l6 6 10-12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const LightningIcon = () => (
  <svg viewBox="0 0 64 64" aria-hidden="true" className="icon">
    <path d="M30 8h12l-8 16h12L26 56l4-18H18z" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PadlockIcon = () => (
  <svg viewBox="0 0 64 64" aria-hidden="true" className="icon">
    <rect x="14" y="28" width="36" height="26" rx="6" fill="none" stroke="currentColor" strokeWidth="2.5" />
    <path d="M22 28v-8a10 10 0 0 1 20 0v8" fill="none" stroke="currentColor" strokeWidth="2.5" />
    <circle cx="32" cy="40" r="3" fill="currentColor" />
    <path d="M32 43v5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const TechIcon = () => (
  <svg viewBox="0 0 64 64" aria-hidden="true" className="icon">
    <rect x="12" y="14" width="40" height="30" rx="4" fill="none" stroke="currentColor" strokeWidth="2.5" />
    <path d="M18 24h10M18 32h6M34 24h12M34 32h12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <rect x="24" y="46" width="16" height="4" rx="2" fill="currentColor" />
  </svg>
);

const HeartIcon = () => (
  <svg viewBox="0 0 64 64" aria-hidden="true" className="icon">
    <path d="M32 54S10 40 10 24c0-7.2 5.8-13 13-13 4.6 0 8.6 2.4 11 6 2.4-3.6 6.4-6 11-6 7.2 0 13 5.8 13 13 0 16-22 30-22 30z" fill="none" stroke="currentColor" strokeWidth="2.5" />
  </svg>
);

const PhoneIcon = () => (
  <svg viewBox="0 0 64 64" aria-hidden="true" className="icon">
    <path d="M24 6h16c2.2 0 4 1.8 4 4v44c0 2.2-1.8 4-4 4H24c-2.2 0-4-1.8-4-4V10c0-2.2 1.8-4 4-4z" fill="none" stroke="currentColor" strokeWidth="2.5" />
    <circle cx="32" cy="50" r="2.5" fill="currentColor" />
  </svg>
);

const MailIcon = () => (
  <svg viewBox="0 0 64 64" aria-hidden="true" className="icon">
    <rect x="10" y="16" width="44" height="32" rx="4" fill="none" stroke="currentColor" strokeWidth="2.5" />
    <path d="M12 20l20 14 20-14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const MapPinIcon = () => (
  <svg viewBox="0 0 64 64" aria-hidden="true" className="icon">
    <path d="M32 6c10 0 18 8 18 18 0 14-18 30-18 30S14 38 14 24c0-10 8-18 18-18z" fill="none" stroke="currentColor" strokeWidth="2.5" />
    <circle cx="32" cy="24" r="6" fill="none" stroke="currentColor" strokeWidth="2.5" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="icon small">
    <path d="M5 12l4 4 10-10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const gradientHero = 'https://images.unsplash.com/photo-1581090464777-f3220bbe1b8c?auto=format&fit=crop&w=1400&q=80';
const abstractMedical = 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80';

export const Landing: React.FC = () => {
  const navigate = useNavigate();

  const services = [
    { title: 'Hematology', desc: 'Advanced blood analysis for precise diagnostics.', Icon: TestTubeIcon },
    { title: 'Biochemistry', desc: 'Comprehensive metabolic and enzyme profiling.', Icon: DropperIcon },
    { title: 'Microbiology', desc: 'Culture, sensitivity, and pathogen detection.', Icon: MicroscopeIcon },
    { title: 'Specialized Tests', desc: 'Endocrine, cardiac, and oncology panels.', Icon: HeartbeatIcon },
  ];

  const whyUs = [
    { title: 'Fast Results', desc: 'Streamlined lab workflow for under-24-hour reporting.', Icon: LightningIcon },
    { title: 'Secure & Private', desc: 'Encrypted records with controlled access.', Icon: PadlockIcon },
    { title: 'Advanced Technology', desc: 'Medical-grade analyzers and continuous QA.', Icon: TechIcon },
    { title: 'Patient-Centered', desc: 'Compassionate guidance at every step.', Icon: HeartIcon },
  ];

  const stats = [
    { label: '24/7 Availability', value: '24/7' },
    { label: 'Reports < 24 hrs', value: '<24h' },
    { label: '100% Accuracy Standards', value: '100%' },
  ];

  const contact = [
    { title: 'Phone', value: '+91 98765 43210', Icon: PhoneIcon },
    { title: 'Email', value: 'care@slncity.com', Icon: MailIcon },
    { title: 'Location', value: 'Sri Lakshmi Narasimha City Diagnostics, SLNCity', Icon: MapPinIcon },
  ];

  return (
    <div className="landing-page">
      {/* NAVIGATION */}
      <header className="nav-bar">
        <div className="nav-content">
          <div className="brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="brand-mark">SL</div>
            <span className="brand-name">SLNCity Diagnostics</span>
          </div>
          <nav className="nav-links">
            <a href="#why">Why Us</a>
            <a href="#services">Services</a>
            <a href="#tests" onClick={(e) => { e.preventDefault(); navigate('/tests'); }}>Test Menu</a>
            <a href="#contact">Contact</a>
          </nav>
          <button className="nav-cta" onClick={() => navigate('/login')}>Staff Login</button>
        </div>
      </header>

      {/* HERO */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-left">
            <div className="pill">Trusted by 10,000+ Patients</div>
            <h1>Accurate Diagnostics, Compassionate Care</h1>
            <p>Fast, reliable test results backed by advanced medical technology. Experience a premium, patient-first diagnostic journey.</p>
            <div className="hero-actions">
              <button className="btn primary" onClick={() => navigate('/tests')}>View Test Menu</button>
              <button className="btn ghost" onClick={() => navigate('/login')}>Book Appointment</button>
            </div>
            <div className="stat-row">
              {stats.map((stat) => (
                <div key={stat.label} className="stat-card">
                  <div className="stat-value">{stat.value}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="hero-right">
            <div className="hero-image" style={{ backgroundImage: `url(${gradientHero})` }} aria-label="Modern medical laboratory"></div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="stats" aria-label="Key metrics">
        <div className="stats-grid">
          {stats.map((stat) => (
            <div key={stat.label} className="stats-card">
              <div className="stats-icon">
                <ShieldIcon />
              </div>
              <div className="stats-text">
                <span className="stats-value">{stat.value}</span>
                <span className="stats-label">{stat.label}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SERVICES */}
      <section className="section" id="services">
        <div className="section-header">
          <span className="eyebrow">Services</span>
          <h2>Precision Across Every Department</h2>
          <p className="section-lead">Rounded, minimal cards with soft shadows for a premium, clinical-grade interface.</p>
        </div>
        <div className="card-grid">
          {services.map(({ title, desc, Icon }) => (
            <div key={title} className="card">
              <div className="icon-bubble">
                <Icon />
              </div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* WHY CHOOSE US */}
      <section className="section tinted" id="why">
        <div className="section-header">
          <span className="eyebrow">Why Choose Us</span>
          <h2>Medical-Grade Standards, Human-Centered Care</h2>
          <p className="section-lead">Soft gradient icon backgrounds, rounded cards, and generous whitespace for a calm experience.</p>
        </div>
        <div className="card-grid four">
          {whyUs.map(({ title, desc, Icon }) => (
            <div key={title} className="card feature">
              <div className="icon-pill">
                <Icon />
              </div>
              <div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PATIENT CONVENIENCE */}
      <section className="section convenience" id="tests">
        <div className="convenience-inner">
          <div className="convenience-text">
            <span className="eyebrow">Patient Convenience</span>
            <h2>Designed Around Your Time and Comfort</h2>
            <ul className="bullet-list">
              {['Online Reports', 'Home Sample Collection', 'Multiple Payment Options'].map((item) => (
                <li key={item}>
                  <span className="bullet-icon"><CheckIcon /></span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <button className="btn primary" onClick={() => navigate('/tests')}>View All Tests</button>
          </div>
          <div className="convenience-visual" style={{ backgroundImage: `url(${abstractMedical})` }} aria-label="Clean medical illustration"></div>
        </div>
      </section>

      {/* CONTACT */}
      <section className="section" id="contact">
        <div className="section-header">
          <span className="eyebrow">Contact</span>
          <h2>We are here around the clock</h2>
        </div>
        <div className="card-grid contact-grid">
          {contact.map(({ title, value, Icon }) => (
            <div key={title} className="card contact-card">
              <div className="icon-square"><Icon /></div>
              <div>
                <h4>{title}</h4>
                <p>{value}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-inner">
          <div>
            <h4>SLNCity Diagnostics</h4>
            <p>Premium diagnostics with a focus on empathy, accuracy, and privacy.</p>
          </div>
          <div>
            <h5>Quick Links</h5>
            <ul>
              <li><a href="#why">Why Us</a></li>
              <li><a href="#services">Services</a></li>
              <li><a href="#tests">Test Menu</a></li>
            </ul>
          </div>
          <div>
            <h5>Staff</h5>
            <ul>
              <li><button onClick={() => navigate('/login')}>Staff Login</button></li>
              <li><button onClick={() => navigate('/login')}>Admin Panel</button></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">© 2025 SLNCity Diagnostics. All rights reserved.</div>
      </footer>
    </div>
  );
};

export default Landing;
