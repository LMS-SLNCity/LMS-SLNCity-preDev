import React, { useState, useEffect } from 'react';
import './TestMenuInquiry.css';

interface Test {
  id: number;
  name: string;
  category: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002';

export const TestMenuInquiry: React.FC = () => {
  const [tests, setTests] = useState<Test[]>([]);
  const [selectedTests, setSelectedTests] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [locations, setLocations] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    organization: '',
    message: '',
  });

  useEffect(() => {
    // Fetch tests from backend
    const fetchTests = async () => {
      try {
        const response = await fetch('http://localhost:5002/api/public/test-templates');
        if (response.ok) {
          const data = await response.json();
          setTests(data);
        }
      } catch (error) {
        console.error('Error fetching tests:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchLocations = async () => {
      try {
        const r = await fetch('http://localhost:5002/api/public/locations');
        if (r.ok) {
          const d = await r.json();
          setLocations(d);
          if (d.length > 0) setSelectedLocationId(d[0].id);
        }
      } catch (err) {
        console.error('Error fetching locations', err);
      }
    };

    fetchTests();
    fetchLocations();
  }, []);

  const handleTestToggle = (testId: number) => {
    setSelectedTests(prev =>
      prev.includes(testId)
        ? prev.filter(id => id !== testId)
        : [...prev, testId]
    );
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email) {
      setMessage({ type: 'error', text: 'Please fill in Name and Email' });
      return;
    }

    if (selectedTests.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one test' });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/test-inquiries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || undefined,
          organization: formData.organization || undefined,
          testIds: selectedTests,
          message: formData.message || undefined,
          locationId: selectedLocationId || undefined,
        }),
      });

      if (response.ok) {
        setMessage({
          type: 'success',
          text: 'Thank you! We\'ve received your inquiry. Our team will contact you shortly.',
        });
        // Reset form
        setFormData({ name: '', email: '', phone: '', organization: '', message: '' });
        setSelectedTests([]);
        // Clear message after 5 seconds
        setTimeout(() => setMessage(null), 5000);
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Failed to submit inquiry' });
      }
    } catch (error) {
      console.error('Error submitting inquiry:', error);
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Group tests by category
  const testsByCategory = tests.reduce((acc, test) => {
    if (!acc[test.category]) acc[test.category] = [];
    acc[test.category].push(test);
    return acc;
  }, {} as Record<string, Test[]>);

  return (
    <section className="test-menu-inquiry">
      <div className="test-menu-container">
        <div className="inquiry-wrapper">
          {/* Test Selection */}
          <div className="test-selection">
            <div className="test-list">
              {loading ? (
                <p className="loading">Loading tests...</p>
              ) : Object.keys(testsByCategory).length === 0 ? (
                <p className="no-tests">No tests available</p>
              ) : (
                Object.entries(testsByCategory).map(([category, categoryTests]) => (
                  <div key={category} className="test-category">
                    <h3 className="category-title">{category}</h3>
                    <div className="test-items">
                      {(Array.isArray(categoryTests) ? categoryTests : []).map(test => (
                        <label key={test.id} className="test-checkbox">
                          <input
                            type="checkbox"
                            checked={selectedTests.includes(test.id)}
                            onChange={() => handleTestToggle(test.id)}
                          />
                          <span className="test-name">{test.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Selected Tests Summary */}
            {selectedTests.length > 0 && (
              <div className="selected-summary">
                <p className="selected-count">
                  {selectedTests.length} test{selectedTests.length !== 1 ? 's' : ''} selected
                </p>
                <div className="selected-list">
                  {selectedTests.map(testId => {
                    const test = tests.find(t => t.id === testId);
                    return test ? (
                      <span key={testId} className="selected-tag">
                        {test.name}
                        <button
                          type="button"
                          className="remove-btn"
                          onClick={() => handleTestToggle(testId)}
                        >
                          ×
                        </button>
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Inquiry Form */}
          <form className="inquiry-form" onSubmit={handleSubmit}>
            <h3 className="form-title">Contact Us for More Information</h3>

            {message && (
              <div className={`message message-${message.type}`}>
                {message.text}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="name">Name *</label>
              <input
                id="name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Your full name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="your@email.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone</label>
              <input
                id="phone"
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="+91 XXXXX XXXXX"
              />
            </div>

            <div className="form-group">
              <label htmlFor="organization">Organization / Clinic</label>
              <input
                id="organization"
                type="text"
                name="organization"
                value={formData.organization}
                onChange={handleInputChange}
                placeholder="Organization name (optional)"
              />
            </div>

            <div className="form-group">
              <label htmlFor="message">Message</label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                placeholder="Tell us more about your requirements..."
                rows={4}
              />
            </div>

            <div className="form-group">
              <label htmlFor="location">Preferred Location</label>
              <select id="location" value={selectedLocationId ?? ''} onChange={(e) => setSelectedLocationId(Number(e.target.value))}>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="submit-btn"
              disabled={submitting || selectedTests.length === 0}
            >
              {submitting ? 'Submitting...' : 'Submit Inquiry'}
            </button>

            <p className="form-note">
              ✓ We'll get back to you within 24 hours with pricing and details for your selected tests.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
};
