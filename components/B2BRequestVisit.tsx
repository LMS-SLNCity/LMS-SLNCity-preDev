import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppContext } from '../context/AppContext';
import { PatientSearchModal } from './PatientSearchModal';
import { SearchableSelect } from './form/SearchableSelect';
import { API_BASE_URL } from '../config/api';
import { Patient, Salutation, Sex } from '../types';
import { Plus, Trash2, Search } from 'lucide-react';

type AgeUnit = 'Years' | 'Months' | 'Days';
type PaymentMode = 'CASH' | 'CARD' | 'UPI' | 'CREDIT' | '';

type FormState = Omit<Patient, 'age_years' | 'age_months' | 'age_days'> & {
  age: number;
  age_unit: AgeUnit;
  referred_doctor_id?: number;
  other_ref_doctor?: string;
  registration_date: string;
  registration_time_hh: string;
  registration_time_mm: string;
  selected_tests: number[];
  amount_paid: number;
  payment_mode: PaymentMode;
};

const getDefaultTime = () => {
  const now = new Date();
  return {
    hh: String(now.getHours()).padStart(2, '0'),
    mm: String(now.getMinutes()).padStart(2, '0'),
  };
};

const initialFormState: FormState = {
  salutation: 'Mr',
  name: '',
  age: 1,
  age_unit: 'Years',
  sex: 'Male',
  guardian_name: '',
  phone: '',
  address: '',
  email: '',
  clinical_history: '',
  referred_doctor_id: undefined,
  other_ref_doctor: '',
  registration_date: new Date().toISOString().split('T')[0],
  registration_time_hh: getDefaultTime().hh,
  registration_time_mm: getDefaultTime().mm,
  selected_tests: [],
  amount_paid: 0,
  payment_mode: 'CREDIT',
};

export const B2BRequestVisit: React.FC = () => {
  const { user } = useAuth();
  const { testTemplates, referralDoctors, loadTestTemplates, loadReferralDoctors, loadClientPrices } = useAppContext();
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testSearchQuery, setTestSearchQuery] = useState('');

  const clientId = (user as any)?.clientId;
  const clientName = (user as any)?.clientName;
  const clientBalance = (user as any)?.balance || 0;

  // Load data on mount
  useEffect(() => {
    Promise.all([
      loadTestTemplates(),
      loadReferralDoctors(),
      clientId ? loadClientPrices(clientId) : Promise.resolve(),
    ]);
  }, [clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-set sex based on salutation
  useEffect(() => {
    const salutation = formData.salutation;
    let newSex: Sex = formData.sex;
    if (['Mr', 'Master'].includes(salutation)) {
      newSex = 'Male';
    } else if (['Ms', 'Mrs', 'Baby'].includes(salutation)) {
      newSex = 'Female';
    }
    if (newSex !== formData.sex && salutation !== 'Baby of') {
      setFormData(prev => ({ ...prev, sex: newSex }));
    }
  }, [formData.salutation]);

  const calculateTotal = useMemo(() => {
    return formData.selected_tests.reduce((acc, testId) => {
      const test = testTemplates.find(t => t.id === testId);
      return acc + (test?.b2b_price || 0);
    }, 0);
  }, [formData.selected_tests, testTemplates]);

  const amountDue = calculateTotal - formData.amount_paid;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('amount') || name.includes('age') ? (value ? Number(value) : 0) : value
    }));
  };

  const handlePatientSelect = (patient: Patient) => {
    setFormData(prev => ({
      ...prev,
      salutation: patient.salutation as Salutation,
      name: patient.name,
      age: patient.age_years,
      age_unit: 'Years',
      sex: patient.sex as Sex,
      phone: patient.phone || '',
      address: patient.address || '',
      email: patient.email || '',
      clinical_history: patient.clinical_history || '',
    }));
    setIsSearchModalOpen(false);
  };

  const handleTestToggle = (testId: number) => {
    setFormData(prev => ({
      ...prev,
      selected_tests: prev.selected_tests.includes(testId)
        ? prev.selected_tests.filter(id => id !== testId)
        : [...prev.selected_tests, testId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const token = sessionStorage.getItem('authToken');
      if (!token) throw new Error('Not authenticated');

      // Create or find patient
      let patientId: number;

      // Check if patient exists by phone (only if phone is provided)
      let existingPatient = null;
      
      if (formData.phone && formData.phone.trim()) {
        const patientsResponse = await fetch(`${API_BASE_URL}/patients`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (patientsResponse.ok) {
          const allPatients = await patientsResponse.json();
          existingPatient = allPatients.find((p: Patient) => p.phone === formData.phone);
        }
      }

      if (existingPatient) {
        patientId = existingPatient.id;
      } else {
        const createPatientResponse = await fetch(`${API_BASE_URL}/patients`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            salutation: formData.salutation,
            name: formData.name,
            age_years: formData.age_unit === 'Years' ? formData.age : 0,
            age_months: formData.age_unit === 'Months' ? formData.age : 0,
            age_days: formData.age_unit === 'Days' ? formData.age : 0,
            sex: formData.sex,
            guardian_name: formData.guardian_name,
            phone: formData.phone,
            address: formData.address,
            email: formData.email,
            clinical_history: formData.clinical_history,
          }),
        });

        if (!createPatientResponse.ok) throw new Error('Failed to create patient');
        const newPatient = await createPatientResponse.json();
        patientId = newPatient.id;
      }

      // Create visit with proper datetime
      const registrationDatetime = new Date(`${formData.registration_date}T${formData.registration_time_hh}:${formData.registration_time_mm}`);

      const visitData = {
        patient_id: patientId,
        ref_customer_id: clientId,
        referred_doctor_id: formData.referred_doctor_id || null,
        other_ref_doctor: formData.other_ref_doctor || null,
        registration_datetime: registrationDatetime.toISOString(),
        total_cost: calculateTotal,
        amount_paid: formData.amount_paid,
        payment_mode: formData.payment_mode || 'CREDIT',
        due_amount: amountDue,
        b2b_pending_approval: true,
      };

      const visitResponse = await fetch(`${API_BASE_URL}/visits`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(visitData),
      });

      if (!visitResponse.ok) {
        const errorData = await visitResponse.json();
        throw new Error(errorData.error || 'Failed to create visit');
      }

      const visit = await visitResponse.json();

      // Add tests to visit
      if (formData.selected_tests.length > 0) {
        const editTestsResponse = await fetch(`${API_BASE_URL}/visits/${visit.id}/edit-tests`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            testsToAdd: formData.selected_tests,
            testsToRemove: [],
            editReason: 'B2B client requested tests',
            editedBy: clientName,
          }),
        });

        if (!editTestsResponse.ok) {
          throw new Error('Failed to add tests to visit');
        }
      }

      setSuccess(`✅ Visit created successfully! Visit Code: ${visit.visit_code}`);
      setFormData(initialFormState);
    } catch (err: any) {
      setError(err.message || 'Failed to create visit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTests = testTemplates.filter(test =>
    !testSearchQuery.trim() ||
    (test.name && test.name.toLowerCase().includes(testSearchQuery.toLowerCase())) ||
    (test.code && test.code.toLowerCase().includes(testSearchQuery.toLowerCase()))
  );

  const selectedTestsDetails = testTemplates.filter(t => formData.selected_tests.includes(t.id));

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">New Visit Registration (SLNCity)</h1>
        <p className="text-gray-600">Register a new patient visit and select required tests</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <div className="text-red-600 font-semibold">Error</div>
          <div className="text-red-700">{error}</div>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <div className="text-green-600 font-semibold">Success</div>
          <div className="text-green-700">{success}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient Details Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Patient Information Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Patient Information</h2>
                <button
                  type="button"
                  onClick={() => setIsSearchModalOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                >
                  <Search className="w-4 h-4" />
                  Search Patient
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salutation *</label>
                  <select
                    name="salutation"
                    value={formData.salutation}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Mr">Mr.</option>
                    <option value="Ms">Ms.</option>
                    <option value="Mrs">Mrs.</option>
                    <option value="Master">Master</option>
                    <option value="Baby of">Baby of</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter patient name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age *</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      name="age"
                      value={formData.age}
                      onChange={handleInputChange}
                      min="0"
                      max="150"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Age"
                    />
                    <select
                      name="age_unit"
                      value={formData.age_unit}
                      onChange={handleInputChange}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Years">Years</option>
                      <option value="Months">Months</option>
                      <option value="Days">Days</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sex *</label>
                  <select
                    name="sex"
                    value={formData.sex}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Guardian Name</label>
                  <input
                    type="text"
                    name="guardian_name"
                    value={formData.guardian_name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Guardian name (if applicable)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="10-digit phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Email address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Patient address"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Clinical History</label>
                  <textarea
                    name="clinical_history"
                    value={formData.clinical_history}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Patient clinical history"
                  />
                </div>
              </div>
            </div>

            {/* Registration Details Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Registration Details</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Registration Date *</label>
                  <input
                    type="date"
                    name="registration_date"
                    value={formData.registration_date}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Registration Time *</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      name="registration_time_hh"
                      value={formData.registration_time_hh}
                      onChange={handleInputChange}
                      min="0"
                      max="23"
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="HH"
                    />
                    <span className="py-2 font-semibold">:</span>
                    <input
                      type="number"
                      name="registration_time_mm"
                      value={formData.registration_time_mm}
                      onChange={handleInputChange}
                      min="0"
                      max="59"
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="MM"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Referred Doctor</label>
                  <SearchableSelect
                    options={referralDoctors.map(d => ({ value: d.id, label: `${d.name} (${d.designation})` }))}
                    value={formData.referred_doctor_id}
                    onChange={(id) => setFormData(prev => ({ ...prev, referred_doctor_id: id as number }))}
                    placeholder="Select referring doctor"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Other Ref. Doctor</label>
                  <input
                    type="text"
                    name="other_ref_doctor"
                    value={formData.other_ref_doctor}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Other referring doctor name"
                  />
                </div>
              </div>
            </div>

            {/* Payment Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                  <select
                    name="payment_mode"
                    value={formData.payment_mode}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="CREDIT">Credit (B2B)</option>
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                    <option value="UPI">UPI</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid (₹)</label>
                  <input
                    type="number"
                    name="amount_paid"
                    value={formData.amount_paid}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Tests and Summary */}
          <div className="lg:col-span-1 space-y-6">
            {/* Tests Selection */}
            <div className="bg-white rounded-lg shadow p-6 sticky top-20">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Tests *</h3>

              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search tests..."
                  value={testSearchQuery}
                  onChange={(e) => setTestSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
                {filteredTests.map(test => (
                  <label key={test.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.selected_tests.includes(test.id)}
                      onChange={() => handleTestToggle(test.id)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{test.name || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">₹{(test.b2b_price || 0).toFixed(2)}</div>
                    </div>
                  </label>
                ))}
              </div>

              {formData.selected_tests.length === 0 && (
                <p className="text-sm text-red-600 text-center">Please select at least one test</p>
              )}

              {/* Summary */}
              <div className="border-t pt-4 mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tests:</span>
                  <span className="font-semibold">{formData.selected_tests.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Cost:</span>
                  <span className="font-semibold">₹{calculateTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Amount Paid:</span>
                  <span className="font-semibold">₹{formData.amount_paid.toFixed(2)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <span className="text-gray-900 font-semibold">Due:</span>
                  <span className={`font-bold ${amountDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ₹{amountDue.toFixed(2)}
                  </span>
                </div>

                <div className="bg-blue-50 p-2 rounded text-xs text-blue-700">
                  Client Balance: ₹{clientBalance.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => setFormData(initialFormState)}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50"
          >
            Clear
          </button>
          <button
            type="submit"
            disabled={isSubmitting || formData.selected_tests.length === 0}
            className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating Visit...' : 'Create Visit'}
          </button>
        </div>
      </form>

      {isSearchModalOpen && (
        <PatientSearchModal
          onSelectPatient={handlePatientSelect}
          onClose={() => setIsSearchModalOpen(false)}
        />
      )}
    </div>
  );
};

