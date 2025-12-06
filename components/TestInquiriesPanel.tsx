import React, { useState, useEffect } from 'react';
import './TestInquiriesPanel.css';

interface TestInquiry {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  organization: string | null;
  test_ids: string | null;
  message: string | null;
  created_at: string;
  is_read: boolean;
  admin_notes: string | null;
}

export const TestInquiriesPanel: React.FC = () => {
  const [inquiries, setInquiries] = useState<TestInquiry[]>([]);
  const [selectedInquiry, setSelectedInquiry] = useState<TestInquiry | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [adminNotes, setAdminNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002';

  useEffect(() => {
    fetchInquiries();
    fetchUnreadCount();

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchInquiries();
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [filter]);

  const fetchInquiries = async () => {
    try {
      const authToken = localStorage.getItem('authToken');
      const isReadParam = filter === 'unread' ? 'false' : filter === 'read' ? 'true' : undefined;
      const url = new URL(`${API_BASE_URL}/api/test-inquiries`);
      if (isReadParam) url.searchParams.append('isRead', isReadParam);

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setInquiries(data.inquiries);
      }
    } catch (error) {
      console.error('Error fetching inquiries:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const authToken = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/test-inquiries/unread/count`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const handleSelectInquiry = (inquiry: TestInquiry) => {
    setSelectedInquiry(inquiry);
    setAdminNotes(inquiry.admin_notes || '');
  };

  const handleSaveNotes = async () => {
    if (!selectedInquiry) return;

    setSavingNotes(true);
    try {
      const authToken = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/test-inquiries/${selectedInquiry.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          adminNotes,
          isRead: true,
        }),
      });

      if (response.ok) {
        const updated = await response.json();
        setSelectedInquiry(updated);
        // Update inquiries list
        setInquiries(prev =>
          prev.map(inq => inq.id === updated.id ? updated : inq)
        );
        fetchUnreadCount();
      }
    } catch (error) {
      console.error('Error saving notes:', error);
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <div className="test-inquiries-panel">
      <div className="inquiries-header">
        <h3>Test Inquiries</h3>
        {unreadCount > 0 && (
          <span className="unread-badge">{unreadCount} new</span>
        )}
      </div>

      <div className="inquiries-layout">
        {/* List Section */}
        <div className="inquiries-list-section">
          <div className="filter-tabs">
            <button
              className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button
              className={`filter-tab ${filter === 'unread' ? 'active' : ''}`}
              onClick={() => setFilter('unread')}
            >
              Unread
            </button>
            <button
              className={`filter-tab ${filter === 'read' ? 'active' : ''}`}
              onClick={() => setFilter('read')}
            >
              Read
            </button>
          </div>

          <div className="inquiries-list">
            {loading ? (
              <p className="loading-text">Loading inquiries...</p>
            ) : inquiries.length === 0 ? (
              <p className="no-inquiries">No inquiries</p>
            ) : (
              inquiries.map(inquiry => (
                <div
                  key={inquiry.id}
                  className={`inquiry-item ${selectedInquiry?.id === inquiry.id ? 'active' : ''} ${!inquiry.is_read ? 'unread' : ''}`}
                  onClick={() => handleSelectInquiry(inquiry)}
                >
                  <div className="inquiry-item-header">
                    <div className="inquiry-name">{inquiry.name}</div>
                    {!inquiry.is_read && <div className="unread-dot"></div>}
                  </div>
                  <div className="inquiry-email">{inquiry.email}</div>
                  <div className="inquiry-date">
                    {new Date(inquiry.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Detail Section */}
        <div className="inquiry-detail-section">
          {selectedInquiry ? (
            <>
              <div className="detail-header">
                <h4>{selectedInquiry.name}</h4>
                <span className={`status-badge ${selectedInquiry.is_read ? 'read' : 'unread'}`}>
                  {selectedInquiry.is_read ? '✓ Read' : '● Unread'}
                </span>
              </div>

              <div className="detail-content">
                <div className="detail-group">
                  <label>Email:</label>
                  <p>{selectedInquiry.email}</p>
                </div>

                {selectedInquiry.phone && (
                  <div className="detail-group">
                    <label>Phone:</label>
                    <p>{selectedInquiry.phone}</p>
                  </div>
                )}

                {selectedInquiry.organization && (
                  <div className="detail-group">
                    <label>Organization:</label>
                    <p>{selectedInquiry.organization}</p>
                  </div>
                )}

                {selectedInquiry.test_ids && (
                  <div className="detail-group">
                    <label>Selected Tests:</label>
                    <p>{selectedInquiry.test_ids}</p>
                  </div>
                )}

                {selectedInquiry.message && (
                  <div className="detail-group">
                    <label>Message:</label>
                    <p>{selectedInquiry.message}</p>
                  </div>
                )}

                <div className="detail-group">
                  <label>Submitted:</label>
                  <p>{new Date(selectedInquiry.created_at).toLocaleString()}</p>
                </div>
              </div>

              <div className="detail-notes">
                <label>Admin Notes:</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add your notes here..."
                  rows={4}
                />
                <button
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  className="save-btn"
                >
                  {savingNotes ? 'Saving...' : 'Save Notes'}
                </button>
              </div>
            </>
          ) : (
            <div className="no-selection">
              <p>Select an inquiry to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
