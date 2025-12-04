import React, { useEffect, useRef, useState } from 'react';
import { Visit, VisitTest, Signatory, Approver } from '../types';
import { useAppContext } from '../context/AppContext';
import { API_BASE_URL } from '../config/api';
import { MicrobiologyReportDisplay } from './MicrobiologyReportDisplay';

/*
  TestReport.tsx
  - Named export: export const TestReport
  - Culture tests ALWAYS start on their own page
  - Row-count pagination to avoid splitting tests across pages
*/

/* ----------------------- Helpers & Constants ----------------------- */

const DEFAULT_MICROBIOLOGY_BLOCK_ROWS = 12;
const HEADER_ROWS_RESERVE = 8;      // Header section + spacing
const FOOTER_ROWS_RESERVE = 8;      // Footer section with signatures
const CONTENT_ROWS_PER_PAGE = 20;   // Available rows for test content (max 20 rows per page)

const formatAge = (p: Visit['patient']) => {
  if (!p) return 'N/A';
  if (p.age_years > 0) return `${p.age_years} Year(s)`;
  if (p.age_months > 0) return `${p.age_months} Month(s)`;
  if (p.age_days > 0) return `${p.age_days} Day(s)`;
  return 'N/A';
};

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

const isCultureTest = (test: VisitTest) => !!test.cultureResult;

const estimateMicrobiologyRows = (test: VisitTest) => {
  try {
    const r: any = test.cultureResult as any;
    if (!r) return DEFAULT_MICROBIOLOGY_BLOCK_ROWS;
    if (Array.isArray(r.lines) && r.lines.length > 0) return Math.max(DEFAULT_MICROBIOLOGY_BLOCK_ROWS, r.lines.length + 4);
    if (typeof r.description === 'string') {
      const lines = r.description.split(/\r?\n/).filter(Boolean).length;
      return Math.max(DEFAULT_MICROBIOLOGY_BLOCK_ROWS, lines + 4);
    }
  } catch { /* ignore */ }
  return DEFAULT_MICROBIOLOGY_BLOCK_ROWS;
};

const countDisplayRowsForTest = (test: VisitTest) => {
  // Culture tests take more space
  if (isCultureTest(test)) {
    return estimateMicrobiologyRows(test);
  }
  
  // For regular tests: title(1) + header(1) + parameters
  let rows = 2;
  const fields = test.template?.parameters?.fields || [];
  rows += Math.max(1, fields.length); // at least 1 row for parameters
  
  return rows;
};

/* ----------------------- Pagination Types & Algorithm ----------------------- */

interface PageGroup {
  department: string;
  tests: VisitTest[];
  displayRows: number; // includes group header
}

interface ReportPage {
  pageNumber: number;
  groups: PageGroup[];
  usedRows: number;
}

const createReportPages = (testsByCategory: Record<string, VisitTest[]>) => {
  const pages: ReportPage[] = [];
  let currentPage: ReportPage = { pageNumber: 1, groups: [], usedRows: 0 };
  const usableRows = CONTENT_ROWS_PER_PAGE;

  const pushPage = () => {
    if (currentPage.groups.length > 0) pages.push(currentPage);
    currentPage = { pageNumber: pages.length + 1, groups: [], usedRows: 0 };
  };

  Object.entries(testsByCategory).forEach(([department, tests]) => {
    tests.forEach((test) => {
      const isCulture = isCultureTest(test);
      const testRows = countDisplayRowsForTest(test);

      // Culture test MUST start on a fresh page
      if (isCulture) {
        if (currentPage.groups.length > 0) pushPage();
        const cultureRows = Math.max(testRows, estimateMicrobiologyRows(test));
        const group: PageGroup = { department, tests: [test], displayRows: cultureRows + 2 };
        currentPage.groups.push(group);
        currentPage.usedRows += group.displayRows;
        // Save this page and start new one
        pushPage();
        return;
      }

      // Non-culture test handling
      const existing = currentPage.groups.find(g => g.department === department);
      const testRowsOnly = testRows; // Just the test rows, no extra spacing

      if (existing) {
        // If adding this test exceeds usable rows -> new page
        if (currentPage.usedRows + testRowsOnly > usableRows) {
          pushPage();
          const newGroup: PageGroup = { department, tests: [test], displayRows: testRowsOnly };
          currentPage.groups.push(newGroup);
          currentPage.usedRows += newGroup.displayRows;
        } else {
          // Append to existing group
          existing.tests.push(test);
          existing.displayRows += testRowsOnly;
          currentPage.usedRows += testRowsOnly;
        }
      } else {
        // New department group - add 1 row for department header
        const groupHeaderAndTest = 1 + testRowsOnly;
        
        // Check if this new group would fit
        if (currentPage.groups.length > 0 && currentPage.usedRows + groupHeaderAndTest > usableRows) {
          pushPage();
        }
        
        const newGroup: PageGroup = { department, tests: [test], displayRows: groupHeaderAndTest };
        currentPage.groups.push(newGroup);
        currentPage.usedRows += groupHeaderAndTest;
      }
    });
  });

  if (currentPage.groups.length > 0) pages.push(currentPage);

  // Verification
  try {
    const totalTestsInPages = pages.reduce((s, p) => s + p.groups.reduce((gs, g) => gs + g.tests.length, 0), 0);
    const totalTestsOriginal = Object.values(testsByCategory).reduce((s, arr) => s + arr.length, 0);
    if (totalTestsInPages !== totalTestsOriginal) {
      // eslint-disable-next-line no-console
      console.error('PAGINATION MISMATCH', { totalTestsOriginal, totalTestsInPages, pages });
    }
  } catch { /* ignore */ }

  return pages;
};

/* ----------------------- Barcode Component (lazy) ----------------------- */

const BarcodeComponent: React.FC<{ value: string }> = ({ value }) => {
  const barcodeRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!barcodeRef.current || typeof window === 'undefined') return;
    let cancelled = false;
    import('jsbarcode')
      .then((JsBarcode) => {
        if (cancelled) return;
        if (barcodeRef.current) {
          JsBarcode.default(barcodeRef.current, value, {
            format: 'CODE128',
            width: 1,
            height: 25,
            displayValue: false,
          });
        }
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('Error loading jsbarcode', err);
      });
    return () => { cancelled = true; };
  }, [value]);

  return <svg ref={barcodeRef} style={{ maxWidth: '100%', height: 'auto', display: 'block' }} />;
};

/* ----------------------- Main Component ----------------------- */

interface TestReportProps {
  visit: Visit;
  signatory?: Signatory | null;
}

export const TestReport: React.FC<TestReportProps> = ({ visit, signatory = null }) => {
  const { visitTests } = useAppContext();
  const [approvers, setApprovers] = useState<Approver[]>([]);

  if (!visit) {
    return <div className="bg-white p-8 max-w-4xl mx-auto text-red-500">Error: Visit data not found.</div>;
  }

  // Only include APPROVED or PRINTED tests (support reprint)
  const approvedTestsForVisit = visit.tests
    .map((testId: number) => visitTests.find(vt => vt.id === testId && (vt.status === 'APPROVED' || vt.status === 'PRINTED')))
    .filter(Boolean) as VisitTest[];

  if (approvedTestsForVisit.length === 0) {
    return <div className="bg-white p-8 max-w-4xl mx-auto text-yellow-600">Report not ready. No approved or printed tests found for this visit.</div>;
  }

  const firstTest = approvedTestsForVisit[0];

  const doctorName = visit.referred_doctor_name
    ? (visit.referred_doctor_designation ? `${visit.referred_doctor_name}, ${visit.referred_doctor_designation}` : visit.referred_doctor_name)
    : (visit.other_ref_doctor || 'N/A');

  // Group tests by category / department
  const testsByCategory = approvedTestsForVisit.reduce((acc, test) => {
    const category = test.template?.category || 'Uncategorized';
    if (!acc[category]) acc[category] = [];
    acc[category].push(test);
    return acc;
  }, {} as Record<string, VisitTest[]>);

  const reportPages = createReportPages(testsByCategory);

  // Fetch approvers (optimized: attempt to deduce approvers from tests; fallback to /approvers)
  useEffect(() => {
    let mounted = true;

    const fetchApprovers = async () => {
      try {
        const approverUsernames = [...new Set(approvedTestsForVisit.map(t => t.approvedBy).filter(Boolean))] as string[];

        // If no approvers listed in tests -> fallback to /approvers endpoint
        if (approverUsernames.length === 0) {
          const resp = await fetch(`${API_BASE_URL}/approvers`);
          const data = await resp.json();
          if (!mounted) return;
          setApprovers((data || []).filter((a: Approver) => a.show_on_print));
          return;
        }

        // Fetch users once and map to approvers (single request)
        const authToken = (typeof sessionStorage !== 'undefined') ? sessionStorage.getItem('authToken') : null;
        const respUsers = await fetch(`${API_BASE_URL}/users`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
        });
        const users = await respUsers.json();
        if (!mounted) return;

        const fetchedApprovers = approverUsernames.map((username) => {
          const user = users.find((u: any) => u.username === username || u.display_name === username);
          if (!user) return null;
          return {
            id: user.id,
            name: user.display_name || user.username,
            title: user.role || user.designation || '-',
            signature_image_url: user.signature_image_url,
            show_on_print: true
          } as Approver;
        }).filter(Boolean) as Approver[];

        if (fetchedApprovers.length === 0) {
          const resp = await fetch(`${API_BASE_URL}/approvers`);
          const data = await resp.json();
          if (!mounted) return;
          setApprovers((data || []).filter((a: Approver) => a.show_on_print));
          return;
        }

        setApprovers(fetchedApprovers);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error fetching approvers', err);
        try {
          const resp = await fetch(`${API_BASE_URL}/approvers`);
          const data = await resp.json();
          if (mounted) setApprovers((data || []).filter((a: Approver) => a.show_on_print));
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('Fallback approvers fetch failed', e);
        }
      }
    };

    fetchApprovers();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visit.id]); // run when visit changes

  // Derive sample drawn and reported dates
  const testsForVisit = visitTests.filter(t => visit.tests.includes(t.id));
  const sampleDrawnDate = testsForVisit.map(t => t.collectedAt).filter(Boolean).sort()[0];
  const reportedDate = testsForVisit.map(t => t.approvedAt).filter(Boolean).sort()[0];

  const IMAGE_BASE_URL = API_BASE_URL.replace('/api', '');

  /* ----------------------- Render pages ----------------------- */
  return (
    <>
      <style>{`
        /* CRITICAL: Perfect consistency across all OS & browsers */
        
        /* Reset & Base Consistency */
        .report-page, .report-page * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeLegibility;
        }
        
        .report-page {
          background: #ffffff;
          color: #000000;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
          font-size: 11px;
          line-height: 1.4;
          letter-spacing: 0;
          word-spacing: 0;
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
          -moz-print-color-adjust: exact;
          /* Flexbox for footer at bottom */
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 297mm;
        }
        
        .report-page div { font-family: inherit; }
        .report-page strong { font-weight: 700; font-family: inherit; }
        .report-page table { font-family: inherit; border-spacing: 0; border-collapse: collapse; }
        .report-page th, .report-page td { font-family: inherit; vertical-align: top; }
        
        /* Content wrapper - grows to fill available space */
        .report-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          word-wrap: break-word;
        }
        
        /* Header section */
        .report-page-header {
          margin: 25mm 0 10px 0;
          border-bottom: 1px solid #cccccc;
          padding: 0 0 8px 0;
          line-height: 1.2;
          font-size: 11px;
        }
        
        .report-page-header div {
          margin: 0;
          padding: 0;
          font-size: 11px;
          line-height: 1.2;
        }
        
        .report-page-header div:first-child {
          margin-bottom: 6px;
        }
        
        /* Department headers */
        .report-department {
          background: #eeeeee;
          padding: 6px;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 11px;
          margin-bottom: 8px;
          line-height: 1.3;
          color: #000000;
        }
        
        /* Test tables */
        .report-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 6px;
          margin-bottom: 6px;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        .report-table thead tr {
          background: #f3f3f3;
          border: none;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        .report-table tbody {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        /* Test wrapper - keep all parameters together */
        .test-wrapper {
          page-break-inside: avoid;
          break-inside: avoid;
          margin-top: 6px;
          overflow: hidden;
        }
        
        .report-table th {
          text-align: left;
          padding: 6px;
          font-weight: 700;
          font-size: 11px;
          background: #f3f3f3;
          color: #000000;
          border: 1px solid #e0e0e0;
          line-height: 1.3;
          word-wrap: break-word;
        }
        
        .report-table td {
          padding: 6px;
          font-size: 11px;
          border: 1px solid #e0e0e0;
          line-height: 1.3;
          vertical-align: top;
          word-wrap: break-word;
          word-break: break-word;
          overflow-wrap: break-word;
          max-width: 100px;
        }
        
        .report-table tbody tr:nth-child(odd) { background: #ffffff; }
        .report-table tbody tr:nth-child(even) { background: #fafafa; }
        .report-table .test-name { font-weight: 700; background: #fafafa; }
        .report-table .section-heading { font-weight: 700; background: #f3f4f6; }
        
        /* Test result values */
        .test-result-value {
          text-align: center;
          font-weight: 700;
          font-size: 11px;
          font-family: 'Courier New', monospace;
          letter-spacing: 0.5px;
        }
        
        .test-result-unit {
          text-align: center;
          font-size: 10px;
        }
        
        .test-method {
          font-size: 9px;
          color: #555555;
          margin-top: 2px;
        }
        
        /* Barcode */
        .barcode-container {
          width: 120px;
          height: auto;
          display: flex;
          align-items: flex-start;
          margin: 0;
          padding: 0;
        }
        
        .barcode-container svg {
          width: 100%;
          height: auto;
          display: block;
          max-width: 100%;
        }
        
        /* Header grid */
        .header-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          margin-top: 6px;
          font-size: 11px;
          gap: 4px;
        }
        
        .header-grid div { line-height: 1.3; }
        .header-grid strong { font-weight: 700; }
        
        /* Footer */
        .report-page-footer {
          border-top: 1px solid #cccccc;
          margin-top: auto;
          padding-top: 8px;
          font-size: 11px;
          line-height: 1.2;
          flex-shrink: 0;
        }
        
        .footer-signatures {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 8px;
          margin-bottom: 8px;
          min-height: 60px;
        }
        
        .signature-block {
          text-align: center;
          flex: 1;
          font-size: 11px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
        }
        
        .signature-image {
          max-width: 90px;
          max-height: 28px;
          display: block;
          margin: 0 auto 4px auto;
          height: auto;
        }
        
        .signature-line {
          height: 1px;
          border-bottom: 1px solid #666666;
          margin-bottom: 4px;
        }
        
        .signature-name {
          font-weight: 700;
          font-size: 10px;
          margin: 0;
          padding: 0;
          line-height: 1.2;
        }
        
        .signature-title {
          font-size: 9px;
          color: #333333;
          margin: 0;
          padding: 0;
          line-height: 1.2;
        }
        
        .qr-block {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          justify-content: flex-end;
          flex: 0.8;
          min-height: 60px;
        }
        
        .qr-block img {
          width: 48px;
          height: 48px;
          display: block;
          image-rendering: pixelated;
          margin: 0;
          padding: 0;
        }
        
        .qr-text {
          font-size: 8px;
          color: #000000;
          margin: 0;
          padding: 0;
          line-height: 1.2;
        }
        
        .lab-tech {
          text-align: right;
          font-size: 10px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          flex: 0.8;
          min-height: 60px;
        }
        
        .lab-tech-name {
          font-weight: 700;
          font-size: 10px;
          margin: 0;
          padding: 0;
          line-height: 1.2;
        }
        
        .lab-tech-title {
          font-size: 9px;
          color: #333333;
          margin: 0;
          padding: 0;
          line-height: 1.2;
        }
        
        .footer-notes {
          margin-top: 8px;
          font-size: 10px;
          line-height: 1.3;
          border-top: 1px solid #e0e0e0;
          padding-top: 6px;
        }
        
        .footer-note-line {
          margin: 2px 0;
          padding: 0;
          line-height: 1.3;
        }
        
        .footer-note-critical {
          font-weight: 700;
          color: #000000;
        }
        
        .page-number {
          text-align: center;
          margin-top: 6px;
          font-size: 10px;
          color: #666666;
          line-height: 1.2;
        }
        
        /* Print media - critical for consistency */
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          
          body { margin: 0; padding: 0; overflow: visible; }
          
          .report-page {
            page-break-after: always;
            break-after: page;
            margin: 0;
            padding: 12mm;
            width: 210mm;
            height: auto;
            min-height: 297mm;
            box-shadow: none;
            border: none;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          .report-page-header {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          .report-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            page-break-inside: auto;
            break-inside: auto;
          }
          
          .report-page-footer {
            flex-shrink: 0;
            margin-top: auto;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          
          .report-page:last-child { page-break-after: avoid; break-after: avoid; }
          
          /* Prevent orphaning of tests and departments */
          .report-department { 
            page-break-inside: avoid; 
            break-inside: avoid;
            page-break-before: auto;
            break-before: auto;
          }
          
          .test-wrapper {
            page-break-inside: avoid;
            break-inside: avoid;
            page-break-before: auto;
            break-before: auto;
          }
          
          .report-table { 
            page-break-inside: avoid; 
            break-inside: avoid;
          }
          
          /* Image consistency */
          .signature-image, .qr-block img { image-rendering: pixelated; }
          img { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        
        /* Screen display for preview */
        @media screen {
          .report-page {
            border: 1px solid #ddd;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            margin: 8px auto;
          }
        }
      `}</style>

      {reportPages.map((page, pageIndex) => (
        <div
          key={pageIndex}
          className="report-page"
          style={{
            minWidth: '210mm',
            maxWidth: '210mm',
            padding: '12mm',
            margin: '0 auto',
            pageBreakAfter: pageIndex < reportPages.length - 1 ? 'always' : 'auto',
            color: '#000000',
            background: '#ffffff',
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
          }}
        >
          {/* Header - 25mm top margin for pre-printed header */}
          <div className="report-page-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 0, marginTop: 0, padding: 0 }}>
              <div>
                <div style={{ margin: 0, padding: 0 }}><strong>Patient Name:</strong> {visit.patient?.name || 'N/A'}</div>
                <div style={{ margin: 0, padding: 0 }}><strong>Age / Gender:</strong> {formatAge(visit.patient)} / {visit.patient?.sex || 'N/A'}</div>
                <div style={{ margin: 0, padding: 0 }}><strong>Referred By:</strong> {doctorName}</div>
              </div>

              <div className="barcode-container" style={{ margin: 0, padding: 0 }}>
                <BarcodeComponent value={visit.visit_code || ''} />
              </div>
            </div>

            <div className="header-grid" style={{ marginTop: 8 }}>
              <div><strong>Visit Id</strong><div style={{ marginTop: 2 }}>{visit.visit_code}</div></div>
              <div><strong>Sample Drawn</strong><div style={{ marginTop: 2 }}>{formatDate(sampleDrawnDate)}</div></div>
              <div><strong>Registration</strong><div style={{ marginTop: 2 }}>{formatDate(visit.created_at)}</div></div>
              <div><strong>Reported</strong><div style={{ marginTop: 2 }}>{formatDate(reportedDate)}</div></div>
            </div>
          </div>

          {/* Content wrapper - grows to fill available space */}
          <div className="report-content">
          {page.groups.map((group, gi) => (
            <div key={`${pageIndex}-${gi}`} style={{ marginBottom: 8 }}>
              <div className="report-department">{group.department}</div>

              {group.tests.map((test) => (
                <div key={test.id} className="test-wrapper">
                  {isCultureTest(test) ? (
                    <div>
                      <MicrobiologyReportDisplay test={test} visit={visit} />
                    </div>
                  ) : (
                    <table className="report-table">
                      <thead>
                        <tr>
                          <th style={{ width: '40%' }}>Test Description</th>
                          <th style={{ width: '15%', textAlign: 'center' }}>Result</th>
                          <th style={{ width: '15%', textAlign: 'center' }}>Units</th>
                          <th style={{ width: '30%' }}>Biological Reference Range</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="test-name">
                          <td colSpan={4}>{test.template?.name}{test.specimen_type ? ` (Specimen: ${test.specimen_type})` : ''}</td>
                        </tr>

                        {test.template?.parameters?.fields && test.template.parameters.fields.length > 0 ? (
                          test.template.parameters.fields.map((param: any, idx: number) => (
                            param.type === 'heading' ? (
                              <tr key={`heading-${test.id}-${idx}`} className="section-heading">
                                <td colSpan={4}>{param.name}</td>
                              </tr>
                            ) : (
                              <tr key={`${test.id}-${param.name}`}>
                                <td>
                                  <div>{param.name}</div>
                                  {param.method && <div className="test-method">{param.method}</div>}
                                </td>
                                <td className="test-result-value">{String(test.results?.[param.name] ?? '-')}</td>
                                <td className="test-result-unit">{param.unit ?? ''}</td>
                                <td>{param.reference_range ?? ''}</td>
                              </tr>
                            )
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} style={{ textAlign: 'center' }}>No parameters</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              ))}
            </div>
          ))}
          </div>

          {/* Footer area - always at bottom */}
          <div className="report-page-footer">
            <div className="footer-signatures">
              {approvers.length > 0 ? (
                approvers.map((a, idx) => (
                  <div key={a.id} className="signature-block">
                    {a.signature_image_url ? (
                      <img 
                        src={`${IMAGE_BASE_URL}${a.signature_image_url}`} 
                        alt="signature" 
                        className="signature-image"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} 
                      />
                    ) : (
                      <div className="signature-line" />
                    )}
                    <div className="signature-name">{a.name}</div>
                    <div className="signature-title">{a.title}</div>
                  </div>
                ))
              ) : (
                <div className="signature-block">
                  <div className="signature-line" />
                  <div className="signature-name">Lab Director</div>
                  <div className="signature-title">Pathologist</div>
                </div>
              )}

              {visit.qr_code && (
                <div className="qr-block">
                  <img src={visit.qr_code} alt="qr" />
                  <div className="qr-text">Scan to verify</div>
                </div>
              )}

              <div className="lab-tech">
                <div className="lab-tech-name">{firstTest.enteredBy || 'N/A'}</div>
                <div className="lab-tech-title">Lab Technician</div>
              </div>
            </div>

            <div className="footer-notes">
              <div className="footer-note-line">Assay result should be correlated clinically with other laboratory finding and the total clinical status of the patient.</div>
              <div className="footer-note-line">Note :- This Report is subject to the terms and conditions mentioned overleaf</div>
              <div className="footer-note-line footer-note-critical">Note :- PARTIAL REPRODUCTION OF THIS REPORT IS NOT PERMITTED</div>
            </div>

            <div className="page-number">Page {pageIndex + 1} of {reportPages.length}</div>
          </div>
        </div>
      ))}
    </>
  );
};
