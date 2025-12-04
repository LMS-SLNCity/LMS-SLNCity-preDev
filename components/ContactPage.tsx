import React, { useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002';

export const ContactPage: React.FC = () => {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      setStatus({ type: 'error', text: 'Name and email are required' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/test-inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name, email: formData.email, phone: formData.phone, message: formData.message })
      });
      if (res.ok) {
        setStatus({ type: 'success', text: 'Thank you — we will contact you shortly.' });
        setFormData({ name: '', email: '', phone: '', message: '' });
        setTimeout(() => setStatus(null), 5000);
      } else {
        const err = await res.json();
        setStatus({ type: 'error', text: err.error || 'Failed to submit' });
      }
    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', text: 'Network error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '2rem 1rem', maxWidth: 700, margin: '0 auto' }}>
      <h1>Contact Us</h1>
      <p style={{ color: '#444' }}>Have questions or need pricing? Send us a message and we'll get back within 24 hours.</p>

      <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
        {status && <div style={{ padding: '0.75rem', borderRadius: 6, marginBottom: 12, background: status.type === 'success' ? '#ECFDF5' : '#FEF3F2', border: status.type === 'success' ? '1px solid #D1FAE5' : '1px solid #FEE2E2' }}>{status.text}</div>}

        <div style={{ marginBottom: 8 }}>
          <label>Name *</label>
          <input name="name" value={formData.name} onChange={handleChange} required style={{ width: '100%', padding: '8px', marginTop: 4 }} />
        </div>

        <div style={{ marginBottom: 8 }}>
          <label>Email *</label>
          <input name="email" type="email" value={formData.email} onChange={handleChange} required style={{ width: '100%', padding: '8px', marginTop: 4 }} />
        </div>

        <div style={{ marginBottom: 8 }}>
          <label>Phone</label>
          <input name="phone" value={formData.phone} onChange={handleChange} style={{ width: '100%', padding: '8px', marginTop: 4 }} />
        </div>

        <div style={{ marginBottom: 8 }}>
          <label>Message</label>
          <textarea name="message" value={formData.message} onChange={handleChange} rows={4} style={{ width: '100%', padding: '8px', marginTop: 4 }} />
        </div>

        <button type="submit" disabled={submitting} style={{ padding: '10px 16px' }}>{submitting ? 'Sending...' : 'Send Message'}</button>
      </form>
    </div>
  );
};

export default ContactPage;
