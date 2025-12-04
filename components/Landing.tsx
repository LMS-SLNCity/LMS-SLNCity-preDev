import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Landing.css';

export const Landing: React.FC = () => {
    const navigate = useNavigate();

    useEffect(() => {
        // Smooth scroll behavior
        document.documentElement.style.scrollBehavior = 'smooth';

        // Mobile menu toggle
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const navbarMenu = document.getElementById('navbarMenu');

        if (mobileMenuBtn && navbarMenu) {
            mobileMenuBtn.addEventListener('click', () => {
                navbarMenu.classList.toggle('active');
            });

            const navLinks = navbarMenu.querySelectorAll('.nav-link');
            navLinks.forEach(link => {
                link.addEventListener('click', () => {
                    navbarMenu.classList.remove('active');
                });
            });
        }

        // Intersection Observer for fade-in animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        document.querySelectorAll('.feature-card, .service-card').forEach(card => {
            card.classList.add('fade-in');
            observer.observe(card);
        });

        return () => {
            observer.disconnect();
        };
    }, []);

    const handleCtaClick = (action: string) => {
        if (action === 'book') {
            navigate('/login');
        } else if (action === 'menu') {
            navigate('/tests');
        }
    };

    return (
        <>
            <style>{`
                .fade-in {
                    opacity: 0;
                    transform: translateY(20px);
                    transition: opacity 0.6s ease, transform 0.6s ease;
                }

                .fade-in.visible {
                    opacity: 1;
                    transform: translateY(0);
                }
            `}</style>

            {/* Navigation */}
            <nav className="navbar">
                <div className="navbar-container">
                    <div className="navbar-logo">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                            <path d="M12 6v6l4 2"/>
                        </svg>
                        <span>SLNCity Diagnostics</span>
                    </div>

                    <button className="mobile-menu-btn" id="mobileMenuBtn">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                        </svg>
                    </button>

                    <ul className="navbar-menu" id="navbarMenu">
                        <li><a href="#home" className="nav-link">Home</a></li>
                        <li><a href="#services" className="nav-link">Services</a></li>
                        <li><a href="#tests" className="nav-link">Test Menu</a></li>
                        <li><a href="#contact" className="nav-link">Contact</a></li>
                        <li><a href="#login" className="nav-link nav-login" onClick={() => navigate('/login')}>Login</a></li>
                    </ul>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="hero" id="home">
                <div className="hero-container">
                    <div className="hero-content">
                        <h1 className="hero-title">Accurate Diagnostics.<br />Trusted Care.</h1>
                        <p className="hero-subtitle">
                            Comprehensive laboratory testing with fast, reliable results. 
                            Your health is our priority. Secure, confidential, and patient-first care.
                        </p>
                        <div className="hero-buttons">
                            <button className="btn btn-primary" onClick={() => handleCtaClick('book')}>Book a Test</button>
                            <button className="btn btn-outline" onClick={() => handleCtaClick('menu')}>View Test Menu</button>
                        </div>
                    </div>
                    <div className="hero-image">
                        <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" className="medical-illustration">
                            <circle cx="200" cy="100" r="60" fill="#E8EEF3" stroke="#0A67C2" strokeWidth="2"/>
                            <rect x="170" y="160" width="60" height="150" rx="8" fill="none" stroke="#0A67C2" strokeWidth="2"/>
                            <rect x="180" y="170" width="40" height="80" fill="#0A67C2" opacity="0.2"/>
                            <circle cx="200" cy="330" r="50" fill="#F7FAFC" stroke="#0A67C2" strokeWidth="2"/>
                            <rect x="190" y="250" width="20" height="80" fill="#0A67C2" opacity="0.3"/>
                            <circle cx="80" cy="120" r="30" fill="#E8EEF3" opacity="0.6"/>
                            <circle cx="320" cy="200" r="40" fill="#E8EEF3" opacity="0.4"/>
                            <circle cx="100" cy="300" r="25" fill="#E8EEF3" opacity="0.5"/>
                        </svg>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="features" id="features">
                <div className="features-container">
                    <h2 className="section-title">Why Choose SLNCity</h2>
                    <div className="features-grid">
                        <div className="feature-card">
                            <div className="feature-icon">
                                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="#0A67C2" strokeWidth="2">
                                    <circle cx="24" cy="24" r="20"/>
                                    <path d="M24 12v12l8 5"/>
                                </svg>
                            </div>
                            <h3 className="feature-title">Fast Reporting</h3>
                            <p className="feature-text">Get accurate results quickly. Most tests completed within 24 hours with online access to your reports.</p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">
                                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="#0A67C2" strokeWidth="2">
                                    <path d="M24 4L6 12v12c0 12 18 16 18 16s18-4 18-16V12l-18-8z"/>
                                    <path d="M17 24l5 5 10-10"/>
                                </svg>
                            </div>
                            <h3 className="feature-title">Secure Records</h3>
                            <p className="feature-text">Your health data is encrypted and protected. Complete privacy and confidentiality guaranteed.</p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">
                                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="#0A67C2" strokeWidth="2">
                                    <circle cx="12" cy="12" r="4"/>
                                    <circle cx="36" cy="12" r="4"/>
                                    <circle cx="24" cy="36" r="4"/>
                                    <path d="M16 12h16M24 16v16M12 16l12 20M36 16l-12 20"/>
                                </svg>
                            </div>
                            <h3 className="feature-title">Automated Workflow</h3>
                            <p className="feature-text">Modern lab equipment ensures precision and consistency in every test we perform.</p>
                        </div>

                        <div className="feature-card">
                            <div className="feature-icon">
                                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="#0A67C2" strokeWidth="2">
                                    <rect x="6" y="8" width="36" height="32" rx="2"/>
                                    <path d="M6 16h36"/>
                                    <circle cx="12" cy="28" r="2" fill="#0A67C2"/>
                                    <circle cx="24" cy="28" r="2" fill="#0A67C2"/>
                                    <circle cx="36" cy="28" r="2" fill="#0A67C2"/>
                                </svg>
                            </div>
                            <h3 className="feature-title">Online Tracking</h3>
                            <p className="feature-text">Track your test status in real-time. Download reports anytime, anywhere from your dashboard.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Services Section */}
            <section className="services" id="services">
                <div className="services-container">
                    <h2 className="section-title">Our Services</h2>
                    <div className="services-grid">
                        <div className="service-card">
                            <div className="service-icon">
                                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="#0A67C2" strokeWidth="2">
                                    <circle cx="20" cy="12" r="3"/>
                                    <path d="M20 15v10M15 22l-5 8h20l-5-8"/>
                                    <path d="M10 30h20"/>
                                </svg>
                            </div>
                            <h3>Hematology</h3>
                            <p>Blood cell analysis and coagulation studies</p>
                        </div>

                        <div className="service-card">
                            <div className="service-icon">
                                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="#0A67C2" strokeWidth="2">
                                    <rect x="8" y="8" width="24" height="24" rx="2"/>
                                    <path d="M14 14h12M14 20h12M14 26h8"/>
                                </svg>
                            </div>
                            <h3>Biochemistry</h3>
                            <p>Metabolic and enzyme analysis</p>
                        </div>

                        <div className="service-card">
                            <div className="service-icon">
                                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="#0A67C2" strokeWidth="2">
                                    <path d="M12 10h16v20H12z"/>
                                    <circle cx="20" cy="18" r="4" fill="#0A67C2" opacity="0.3"/>
                                    <path d="M14 20h12M14 24h12"/>
                                </svg>
                            </div>
                            <h3>Microbiology</h3>
                            <p>Culture and sensitivity testing</p>
                        </div>

                        <div className="service-card">
                            <div className="service-icon">
                                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="#0A67C2" strokeWidth="2">
                                    <path d="M20 8c6.6 0 12 5.4 12 12s-5.4 12-12 12-12-5.4-12-12 5.4-12 12-12z"/>
                                    <path d="M20 14v12M14 20h12"/>
                                </svg>
                            </div>
                            <h3>Immunology</h3>
                            <p>Antibody and antigen testing</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Test Menu Section (static preview) */}
            <section className="test-menu" id="tests">
                <div className="test-menu-container">
                    <h2 className="section-title">Comprehensive Test Menu</h2>
                    <p className="section-subtitle">From routine checkups to specialized diagnostics, we offer a complete range of laboratory tests. For pricing and bookings, please view the full menu or contact our team.</p>
                    <div style={{ marginTop: '1rem' }}>
                        <button className="btn btn-primary" onClick={() => navigate('/tests')}>View Test Menu</button>
                        <button className="btn btn-outline" style={{ marginLeft: 12 }} onClick={() => navigate('/contact')}>Contact Us</button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="footer" id="contact">
                <div className="footer-container">
                    <div className="footer-content">
                        <div className="footer-section">
                            <h4>Sri Lakshmi Narasimha City Diagnostic Center</h4>
                            <p>Providing trusted diagnostic services since 2020.</p>
                        </div>
                        <div className="footer-section">
                            <h4>Contact</h4>
                            <p>Email: <a href="mailto:info@slncity.com">info@slncity.com</a></p>
                            <p>Phone: <a href="tel:+911234567890">+91 123-456-7890</a></p>
                        </div>
                        <div className="footer-section">
                            <h4>Location</h4>
                            <p>123 Medical Plaza, Healthcare Avenue<br />City, State 560001</p>
                        </div>
                    </div>
                    <div className="footer-divider"></div>
                    <div className="footer-bottom">
                        <p>&copy; 2025 SLNCity Diagnostics. All rights reserved.</p>
                        <div className="footer-links">
                            <a href="#privacy">Privacy Policy</a>
                            <a href="#terms">Terms of Service</a>
                        </div>
                    </div>
                </div>
            </footer>
        </>
    );
};
