import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Visit, Signatory, VisitTest } from '../types';
import { API_BASE_URL } from '../config/api';
import { FileText, Clock, User, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { AppProvider } from '../context/AppContext';
import { TestReport } from './TestReport';

// Standalone TestReport component for public view (doesn't use AppContext)
const PublicTestReport: React.FC<{ visit: any; signatory?: Signatory | null; visitTests: any[] }> = ({ visit, signatory, visitTests }) => {
  // Normalize API payload into shapes expected by TestReport
  const normalizedTests: VisitTest[] = (visitTests || []).map((t: any) => {
    const tpl = t.template || {};
    const templateParameters = tpl.parameters?.fields ? tpl.parameters : { fields: tpl.parameters?.fields ?? tpl.parameters ?? [] };

    const normalizedReportType = (tpl.reportType || tpl.report_type || 'standard').toString().toLowerCase();

    return {
      id: t.id,
      visitId: t.visit_id ?? t.visitId ?? visit.id,
      patientName: visit?.patient?.name || '',
      visitCode: visit?.visit_code || visit?.visitCode || '',
      referredDoctorName: visit?.referred_doctor?.name || visit?.referred_doctor_name || '',
      referredDoctorDesignation: visit?.referred_doctor?.designation || visit?.referred_doctor_designation || '',
      otherRefDoctor: visit?.other_ref_doctor || visit?.otherRefDoctor,
      template: {
        id: tpl.id,
        code: tpl.code,
        name: tpl.name,
        category: tpl.category || 'General',
        price: tpl.price ?? 0,
        b2b_price: tpl.b2b_price ?? tpl.b2bPrice ?? 0,
        isActive: tpl.isActive ?? tpl.is_active ?? true,
        parameters: templateParameters,
        reportType: normalizedReportType,
        defaultAntibioticIds: tpl.defaultAntibioticIds || tpl.default_antibiotic_ids || [],
        sampleType: tpl.sampleType || tpl.sample_type,
        tatHours: tpl.tatHours || tpl.tat_hours,
      },
      status: t.status,
      collectedBy: t.collected_by ?? t.collectedBy,
      collectedAt: t.collected_at ?? t.collectedAt,
      specimen_type: t.specimen_type ?? t.specimenType,
      results: t.results,
      cultureResult: t.culture_result ?? t.cultureResult,
      enteredBy: t.entered_by ?? t.enteredBy,
      enteredAt: t.entered_at ?? t.enteredAt,
      approvedBy: t.approved_by ?? t.approvedBy,
      approvedAt: t.approved_at ?? t.approvedAt,
      rejection_count: t.rejection_count ?? t.rejectionCount,
      last_rejection_at: t.last_rejection_at ?? t.lastRejectionAt,
      created_at: t.created_at ?? t.createdAt,
    } as VisitTest;
  });

  const normalizedVisit: Visit = {
    ...(visit as Visit),
    tests: normalizedTests.map((t) => t.id),
  };

  return (
    <AppProvider>
      <TestReport visit={normalizedVisit} visitTests={normalizedTests} signatory={signatory || null} />
    </AppProvider>
  );
};

export const PublicReportView: React.FC = () => {
  const { visitCode } = useParams<{ visitCode: string }>();
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTimestamps, setShowTimestamps] = useState(false);

  useEffect(() => {
    fetchPublicReport();
  }, [visitCode]);

  const fetchPublicReport = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching public report for visit code:', visitCode);
      console.log('API URL:', `${API_BASE_URL}/public/reports/${visitCode}`);

      const response = await fetch(`${API_BASE_URL}/public/reports/${visitCode}`);

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Error response:', errorData);
        throw new Error(errorData.error || 'Failed to load report');
      }

      const data = await response.json();
      console.log('Report data received:', data);
      setReportData(data);
    } catch (err: any) {
      console.error('Error fetching public report:', err);
      setError(err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100 p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <div className="flex items-center justify-center mb-4">
            <AlertCircle className="h-16 w-16 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-4">Report Not Found</h2>
          <p className="text-gray-600 text-center mb-6">{error}</p>
          <div className="text-center">
            <p className="text-sm text-gray-500">
              Please check the QR code or visit code and try again.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return null;
  }

  const { visit: visitData, signatory } = reportData;

  // Normalize tests for the shared TestReport component
  const visitTestsForReport = visitData?.tests || [];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-6 px-4 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8" />
              <div>
                <h1 className="text-2xl font-bold">Lab Report Verification</h1>
                <p className="text-blue-100 text-sm">Visit Code: {visitData.visit_code}</p>
              </div>
            </div>
            <button
              onClick={() => setShowTimestamps(!showTimestamps)}
              className="px-4 py-2 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors flex items-center gap-2"
            >
              <Clock className="h-5 w-5" />
              {showTimestamps ? 'Hide' : 'Show'} Timestamps
            </button>
          </div>
        </div>
      </div>

      {/* Timestamp Details */}
      {showTimestamps && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Clock className="h-6 w-6 text-blue-600" />
              Test Processing Timeline
            </h2>
            <div className="space-y-4">
              {visitData.tests.map((test: any) => (
                <div key={test.id} className="border-l-4 border-blue-500 pl-4 py-2">
                  <h3 className="font-semibold text-gray-800 mb-2">{test.template.name}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-gray-600 font-medium">Registered</p>
                        <p className="text-gray-800">{formatTimestamp(test.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <User className="h-4 w-4 text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-gray-600 font-medium">Sample Collected</p>
                        <p className="text-gray-800">{formatTimestamp(test.collected_at)}</p>
                        <p className="text-gray-500 text-xs">By: {test.collected_by || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-gray-600 font-medium">Results Entered</p>
                        <p className="text-gray-800">{formatTimestamp(test.entered_at)}</p>
                        <p className="text-gray-500 text-xs">By: {test.entered_by || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <div>
                        <p className="text-gray-600 font-medium">Approved</p>
                        <p className="text-gray-800">{formatTimestamp(test.approved_at)}</p>
                        <p className="text-gray-500 text-xs">By: {test.approved_by || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Clock className="h-4 w-4 text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-gray-600 font-medium">Last Updated</p>
                        <p className="text-gray-800">{formatTimestamp(test.updated_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-gray-600 font-medium">Status</p>
                        <p className="text-gray-800 font-semibold">{test.status}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Report Content - Use shared TestReport for consistent layout */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden p-4 md:p-8">
          <PublicTestReport visit={visitData} signatory={signatory} visitTests={visitTestsForReport} />
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-800 text-white py-6 px-4 mt-8">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm text-gray-300">
            This is an official lab report. For any queries, please contact the laboratory.
          </p>
          <p className="text-xs text-gray-400 mt-2">
            © 2024 Sri Lakshmi Narasimha City Diagnostic Center (SLNCity). All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

