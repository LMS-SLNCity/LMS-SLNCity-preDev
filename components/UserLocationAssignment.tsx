import React, { useState, useEffect } from 'react';

interface User {
  id: number;
  username: string;
  role: string;
  is_active: boolean;
  location_id: number | null;
}

interface Location {
  id: number;
  name: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002';

export const UserLocationAssignment: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);

  useEffect(() => {
    console.log('🔄 UserLocationAssignment mounted - fetching data...');
    fetchUsers();
    fetchLocations();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = sessionStorage.getItem('authToken');
      console.log('🔐 Token available:', !!token);
      const response = await fetch(`${API_BASE_URL}/api/users`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      console.log('📡 Users API response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Users fetched:', data.length, 'users');
        // Show all staff (including SUDO for oversight)
        setUsers(data.sort((a: User, b: User) => {
          // SUDO first, then others
          if (a.role === 'SUDO') return -1;
          if (b.role === 'SUDO') return 1;
          return a.username.localeCompare(b.username);
        }));
      } else {
        const errorText = await response.text();
        console.error('❌ Users API error:', response.status, errorText);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setMessage({ type: 'error', text: 'Failed to load users' });
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/public/locations`);
      if (response.ok) {
        const data = await response.json();
        setLocations(data);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const assignUserToLocation = async (userId: number, locationId: number | null) => {
    setUpdating(userId);
    try {
      const token = sessionStorage.getItem('authToken');
      console.log(`🔄 Updating user ${userId} to location ${locationId}...`);
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ location_id: locationId }),
      });

      console.log(`📡 Update response status: ${response.status}`);
      
      if (response.ok) {
        const updated = await response.json();
        console.log(`✅ Update response:`, updated);
        // Update local state with the new location
        setUsers(users.map(u => u.id === userId ? { ...u, location_id: locationId } : u));
        setMessage({ type: 'success', text: `Location updated to ${locationId ? locations.find(l => l.id === locationId)?.name : 'Unassigned'}` });
        setTimeout(() => setMessage(null), 3000);
      } else {
        const errorText = await response.text();
        console.error(`❌ Update error: ${response.status}`, errorText);
        setMessage({ type: 'error', text: `Failed to update location: ${response.status}` });
      }
    } catch (error) {
      console.error('Error assigning location:', error);
      setMessage({ type: 'error', text: 'Error assigning location: ' + (error instanceof Error ? error.message : 'Unknown error') });
    } finally {
      setUpdating(null);
    }
  };

  const getLocationName = (locationId: number | null) => {
    if (!locationId) return 'Not assigned';
    const location = locations.find(l => l.id === locationId);
    return location?.name || 'Unknown location';
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      SUDO: '#7c3aed',
      ADMIN: '#0891b2',
      RECEPTION: '#059669',
      PHLEBOTOMY: '#dc2626',
      LAB: '#2563eb',
      APPROVER: '#ea580c',
    };
    return colors[role] || '#6b7280';
  };

  console.log('📊 UserLocationAssignment render - users:', users.length, 'locations:', locations.length, 'loading:', loading);

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading staff members...</div>;
  }

  return (
    <div style={{ padding: '2rem', backgroundColor: '#f5f5f5', borderRadius: 8 }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0, marginBottom: '0.5rem' }}>Manage Branch & Location Access</h3>
        <p style={{ margin: 0, fontSize: 14, color: '#666' }}>
          Assign staff to locations. SUDO has access to all locations by default.
        </p>
      </div>

      {message && (
        <div
          style={{
            padding: '0.75rem',
            marginBottom: '1rem',
            borderRadius: 6,
            background: message.type === 'success' ? '#ECFDF5' : '#FEF3F2',
            border: message.type === 'success' ? '1px solid #D1FAE5' : '1px solid #FEE2E2',
            color: message.type === 'success' ? '#065F46' : '#7F1D1D',
          }}
        >
          {message.text}
        </div>
      )}

      <div style={{ backgroundColor: 'white', borderRadius: 8, overflow: 'hidden' }}>
        {users.map((user, idx) => (
          <div
            key={user.id}
            style={{
              borderBottom: idx < users.length - 1 ? '1px solid #e5e7eb' : 'none',
              padding: '1rem',
              backgroundColor: !user.is_active ? '#f3f4f6' : 'white',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
              }}
              onClick={() => setExpandedUserId(expandedUserId === user.id ? null : user.id)}
            >
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: 1 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{user.username}</div>
                  <div style={{ fontSize: 12, color: '#666' }}>
                    Status: {user.is_active ? '✓ Active' : '✗ Inactive'}
                  </div>
                </div>

                <span
                  style={{
                    display: 'inline-block',
                    padding: '0.35rem 0.75rem',
                    backgroundColor: getRoleBadgeColor(user.role),
                    color: 'white',
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {user.role}
                </span>

                <div style={{ textAlign: 'right', minWidth: 180 }}>
                  <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Location</div>
                  <div style={{ fontWeight: 600, color: '#0a67c2' }}>
                    {user.role === 'SUDO' ? '🔑 All Branches' : getLocationName(user.location_id)}
                  </div>
                </div>

                <div style={{ marginLeft: 'auto', color: '#999' }}>
                  {expandedUserId === user.id ? '▼' : '▶'}
                </div>
              </div>
            </div>

            {expandedUserId === user.id && (
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                {user.role === 'SUDO' ? (
                  <div
                    style={{
                      padding: '0.75rem',
                      backgroundColor: '#f0f9ff',
                      borderRadius: 4,
                      border: '1px solid #bfdbfe',
                      fontSize: 14,
                      color: '#1e40af',
                    }}
                  >
                    <strong>SUDO Access:</strong> This user has administrative access to all locations and cannot be restricted to a single branch.
                  </div>
                ) : (
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: 14, fontWeight: 500 }}>
                      Assign to Location:
                    </label>
                    <select
                      value={user.location_id ?? ''}
                      onChange={(e) => assignUserToLocation(user.id, e.target.value ? Number(e.target.value) : null)}
                      disabled={updating === user.id}
                      style={{
                        padding: '0.5rem',
                        borderRadius: 4,
                        border: '1px solid #d1d5db',
                        fontSize: 14,
                        width: '100%',
                        maxWidth: 300,
                        backgroundColor: updating === user.id ? '#f3f4f6' : 'white',
                      }}
                    >
                      <option value="">-- Not assigned --</option>
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                      ))}
                    </select>
                    <div style={{ marginTop: '0.5rem', fontSize: 12, color: '#666' }}>
                      {updating === user.id ? 'Updating...' : 'Select a location to restrict this user to that branch'}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {users.length === 0 && (
        <p style={{ textAlign: 'center', color: '#666', marginTop: '1rem', padding: '2rem' }}>
          No staff members found
        </p>
      )}

      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f0f9ff', borderRadius: 6, border: '1px solid #bfdbfe' }}>
        <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e40af' }}>Access Rules</h4>
        <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: 13, color: '#1e40af', lineHeight: 1.6 }}>
          <li><strong>SUDO:</strong> Has access to all locations (administrative oversight)</li>
          <li><strong>ADMIN / Staff:</strong> Can be assigned to a single location</li>
          <li><strong>Unassigned:</strong> No location access until assigned</li>
        </ul>
      </div>
    </div>
  );
};

export default UserLocationAssignment;
