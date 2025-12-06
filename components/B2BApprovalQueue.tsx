import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config/api';
import { AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';

interface PendingVisit {
  id: number;
  visit_code: string;
  registration_datetime: string;
  patient: {
    name: string;
    age_years: number;
    sex: string;
    phone?: string;
  };
  b2bClient: {
    name: string;
  };
  tests: Array<{
    id: number;
    template: {
      name: string;
      code: string;
    };
  }>;
  total_cost: number;
}

export const B2BApprovalQueue: React.FC = () => {
  const { user } = useAuth();
  const [pendingVisits, setPendingVisits] = useState<PendingVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    fetchPendingVisits();
    // Poll for new requests every 30 seconds
    const interval = setInterval(fetchPendingVisits, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchPendingVisits = async () => {
    try {
      const token = sessionStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/visits?b2b_pending=true`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const allVisits = await response.json();
        const pending = allVisits.filter((v: any) => v.b2b_pending_approval === true);
        setPendingVisits(pending);
      } else {
        setError('Failed to load pending visits');
      }
    } catch (err) {
      console.error('Error fetching pending B2B visits:', err);
      setError('Failed to load pending visits');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (visitId: number, approve: boolean) => {
    setProcessingId(visitId);
    setError(null);

    try {
      const token = sessionStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/visits/${visitId}/approve-b2b`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approve,
          reason: approve ? '' : 'Rejected by reception staff',
        }),
      });

      if (response.ok) {
        // Remove from pending list
        setPendingVisits(prev => prev.filter(v => v.id !== visitId));
        
        // Show success message briefly
        const successMsg = approve ? 'Visit approved!' : 'Visit rejected!';
        alert(successMsg);
      } else {
        const errorData = await response.json();
        setError(errorData.error || `Failed to ${approve ? 'approve' : 'reject'} visit`);
      }
    } catch (err) {
      console.error('Error processing B2B visit:', err);
      setError('Failed to process request');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-blue-600 animate-pulse" />
          <p className="text-sm text-blue-800">Loading B2B requests...</p>
        </div>
      </div>
    );
  }

  if (error && pendingVisits.length === 0) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (pendingVisits.length === 0) {
    return null; // Don't show anything if no pending visits
  }

  return (
    <div className="mb-6 bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-300 rounded-lg p-6 shadow-lg">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-orange-500 text-white rounded-full p-2">
          <AlertCircle className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-orange-900">
            🔔 Pending B2B Visit Requests
          </h3>
          <p className="text-sm text-orange-700">
            {pendingVisits.length} visit{pendingVisits.length !== 1 ? 's' : ''} awaiting your approval
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {pendingVisits.map((visit) => (
          <div
            key={visit.id}
            className="bg-white border-2 border-orange-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Visit Info */}
              <div>
                <div className="text-xs text-gray-500 mb-1">Visit Code</div>
                <div className="font-bold text-gray-900">{visit.visit_code}</div>
                <div className="text-xs text-gray-600 mt-2">
                  {new Date(visit.registration_datetime).toLocaleString('en-IN')}
                </div>
              </div>

              {/* Patient & Client Info */}
              <div>
                <div className="text-xs text-gray-500 mb-1">Patient</div>
                <div className="font-semibold text-gray-900">{visit.patient.name}</div>
                <div className="text-sm text-gray-600">
                  {visit.patient.age_years}Y / {visit.patient.sex}
                  {visit.patient.phone && ` • ${visit.patient.phone}`}
                </div>
                <div className="text-xs text-blue-600 mt-1 font-medium">
                  Client: {visit.b2bClient.name}
                </div>
              </div>

              {/* Tests & Actions */}
              <div>
                <div className="text-xs text-gray-500 mb-1">
                  Tests ({visit.tests.length})
                </div>
                <div className="text-xs text-gray-700 mb-2 max-h-16 overflow-y-auto">
                  {visit.tests.map((test, idx) => (
                    <div key={test.id}>
                      • {test.template.name}
                    </div>
                  ))}
                </div>
                <div className="text-sm font-bold text-gray-900 mb-3">
                  Total: ₹{visit.total_cost.toFixed(2)}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(visit.id, true)}
                    disabled={processingId === visit.id}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-semibold"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {processingId === visit.id ? 'Processing...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleApprove(visit.id, false)}
                    disabled={processingId === visit.id}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-semibold"
                  >
                    <XCircle className="h-4 w-4" />
                    {processingId === visit.id ? 'Processing...' : 'Reject'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
