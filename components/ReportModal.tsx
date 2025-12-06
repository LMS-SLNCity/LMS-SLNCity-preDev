import React, { useState, useEffect } from 'react';
import { Visit, Signatory, VisitTest } from '../types';
import { TestReport } from './TestReport';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { API_BASE_URL } from '../config/api';


interface ReportModalProps {
  visit: Visit;
  signatory: Signatory;
  onClose: () => void;
  onEdit: (test: VisitTest) => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ visit, signatory, onClose, onEdit }) => {
  const { hasPermission } = useAuth();
  const { invalidateCache } = useAppContext();
  const [isExporting, setIsExporting] = useState(false);
  const [visitTests, setVisitTests] = useState<VisitTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load visit tests when modal opens
  useEffect(() => {
    const loadTests = async () => {
      try {
        setLoading(true);
        // Add a small delay to ensure approval has been persisted
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const token = sessionStorage.getItem('authToken');
        const response = await fetch(`${API_BASE_URL}/visit-tests`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const tests = await response.json();
          console.log('DEBUG ReportModal: Fetched tests:', tests.length, 'tests');
          setVisitTests(tests);
        } else {
          console.error('Failed to fetch visit tests:', response.status);
          setError('Failed to load test data');
        }
      } catch (err) {
        console.error('Error loading tests:', err);
        setError('Error loading test data');
      } finally {
        setLoading(false);
      }
    };

    loadTests();
  }, [visit.id]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-center mt-4 text-gray-600">Loading report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const handlePrint = async () => {
    try {
      setIsExporting(true);

      // Find all report pages
      const reportPages = document.querySelectorAll('.report-page');

      if (reportPages.length === 0) {
        alert('Report content not found');
        return;
      }

      // Create PDF with consistent settings
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: false, // Disable compression for consistency
        precision: 2,
      });

      // Process each page
      for (let i = 0; i < reportPages.length; i++) {
        const pageElement = reportPages[i] as HTMLElement;

        // Clone the page to avoid modifying the DOM
        const clonedPage = pageElement.cloneNode(true) as HTMLElement;

        // Create a temporary container with exact A4 dimensions
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.width = '210mm';
        tempContainer.style.height = '297mm';
        tempContainer.style.margin = '0';
        tempContainer.style.padding = '0';
        tempContainer.appendChild(clonedPage);
        document.body.appendChild(tempContainer);

        // Force the cloned page to exact A4 size with consistent rendering
        clonedPage.style.width = '210mm';
        clonedPage.style.height = '297mm';
        clonedPage.style.display = 'flex';
        clonedPage.style.flexDirection = 'column';
        clonedPage.style.margin = '0';
        clonedPage.style.padding = '12mm';
        clonedPage.style.boxSizing = 'border-box';
        clonedPage.style.fontSize = '11px';
        clonedPage.style.lineHeight = '1.4';
        clonedPage.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

        // Create canvas from the cloned page with high DPI for consistency
        const canvas = await html2canvas(clonedPage, {
          scale: 3, // Increased from 2 for better quality and consistency
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          allowTaint: true,
          imageTimeout: 0,
          windowWidth: 794, // A4 width in pixels at 96 DPI
          windowHeight: 1122, // A4 height in pixels at 96 DPI
        });

        // Remove temporary container
        document.body.removeChild(tempContainer);

        // Add page to PDF
        if (i > 0) {
          pdf.addPage();
        }

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 210; // A4 width in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const pdfHeight = 297; // A4 height in mm

        // Fit image to page with proper scaling
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, Math.min(imgHeight, pdfHeight));
      }

      // Get PDF as blob and open in new window for printing
      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);

      const printWindow = window.open(pdfUrl);
      if (printWindow) {
        // Wait for PDF to load, then print
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }

      // Call API to mark tests as PRINTED
      try {
        const token = sessionStorage.getItem('authToken');
        if (!token) {
          console.error('❌ Failed to mark tests as PRINTED: No auth token in sessionStorage');
        } else {
          const response = await fetch(`${API_BASE_URL}/reports/print`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ visit_id: visit.id }),
          });

          if (response.ok) {
            console.log('✅ Tests marked as PRINTED');
            // Invalidate cache to refresh data
            invalidateCache();
            // Dispatch event to refresh visit tests
            window.dispatchEvent(new CustomEvent('visit-test-updated'));
          } else {
            const errorData = await response.json().catch(() => ({}));
            console.error('❌ Failed to mark tests as PRINTED:', response.status, errorData);
          }
        }
      } catch (apiError) {
        console.error('❌ Error calling print API:', apiError);
        // Don't show error to user - printing already succeeded
      }

      console.log('✅ PDF opened for printing');
    } catch (error) {
      console.error('Error printing PDF:', error);
      alert('Failed to print. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setIsExporting(true);

      // Find all report pages
      const reportPages = document.querySelectorAll('.report-page');

      if (reportPages.length === 0) {
        alert('Report content not found');
        return;
      }

      // Create PDF with consistent settings
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: false, // Disable compression for consistency
        precision: 2,
      });

      // Process each page
      for (let i = 0; i < reportPages.length; i++) {
        const pageElement = reportPages[i] as HTMLElement;

        // Clone the page to avoid modifying the DOM
        const clonedPage = pageElement.cloneNode(true) as HTMLElement;

        // Create a temporary container with exact A4 dimensions
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.width = '210mm';
        tempContainer.style.height = '297mm';
        tempContainer.style.margin = '0';
        tempContainer.style.padding = '0';
        tempContainer.appendChild(clonedPage);
        document.body.appendChild(tempContainer);

        // Force the cloned page to exact A4 size with consistent rendering
        clonedPage.style.width = '210mm';
        clonedPage.style.height = '297mm';
        clonedPage.style.display = 'flex';
        clonedPage.style.flexDirection = 'column';
        clonedPage.style.margin = '0';
        clonedPage.style.padding = '12mm';
        clonedPage.style.boxSizing = 'border-box';
        clonedPage.style.fontSize = '11px';
        clonedPage.style.lineHeight = '1.4';
        clonedPage.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

        // Create canvas from the cloned page with high DPI for consistency
        const canvas = await html2canvas(clonedPage, {
          scale: 3, // Increased from 2 for better quality and consistency
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          allowTaint: true,
          imageTimeout: 0,
          windowWidth: 794, // A4 width in pixels at 96 DPI
          windowHeight: 1122, // A4 height in pixels at 96 DPI
        });

        // Remove temporary container
        document.body.removeChild(tempContainer);

        // Add page to PDF
        if (i > 0) {
          pdf.addPage();
        }

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 210; // A4 width in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const pdfHeight = 297; // A4 height in mm

        // Fit image to page with proper scaling
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, Math.min(imgHeight, pdfHeight));
      }

      // Save PDF
      const filename = `report_${visit.visit_code}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);
      console.log('✅ PDF exported:', filename);

      // Call API to mark tests as PRINTED
      try {
        const token = sessionStorage.getItem('authToken');
        const response = await fetch(`${API_BASE_URL}/reports/print`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ visit_id: visit.id }),
        });

        if (response.ok) {
          console.log('✅ Tests marked as PRINTED');
          // Invalidate cache to refresh data
          invalidateCache();
          // Dispatch event to refresh visit tests
          window.dispatchEvent(new CustomEvent('visit-test-updated'));
        } else {
          console.error('❌ Failed to mark tests as PRINTED:', response.status);
        }
      } catch (apiError) {
        console.error('❌ Error calling print API:', apiError);
        // Don't show error to user - download already succeeded
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const canEditReport = hasPermission('EDIT_APPROVED_REPORT');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="bg-gray-200 w-full h-full overflow-y-auto">
        <div className="sticky top-0 z-10 bg-gray-800 p-3 flex justify-end items-center space-x-2 print:hidden flex-wrap gap-2">
            <button
                onClick={handleDownloadPDF}
                disabled={isExporting}
                className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 disabled:bg-purple-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                title="Download report as PDF"
            >
                {isExporting ? 'Exporting...' : '📥 Download PDF'}
            </button>
            <button
                onClick={handlePrint}
                disabled={isExporting}
                className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                title="Print as PDF"
            >
                🖨️ Print as PDF
            </button>
            <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg shadow-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                ✕ Close
            </button>
        </div>
        <div className="p-4 sm:p-8">
          <div id="test-report-content">
            {console.log('DEBUG ReportModal: About to render TestReport with:', {
              visitId: visit.id,
              visitTestIds: visit.tests,
              visitTestsCount: visitTests.length,
              visitTestsStatuses: visitTests.map(vt => ({ id: vt.id, status: vt.status }))
            })}
            <TestReport visit={visit} signatory={signatory} canEdit={canEditReport} onEdit={onEdit} visitTests={visitTests} />
          </div>
        </div>
      </div>
    </div>
  );
};