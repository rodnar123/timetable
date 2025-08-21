import React from 'react';
import { Department } from '@/types/database';
import { GraduationCap, Hash, Building2, Clock, Award, Users, CreditCard, FileText, BookOpen, Globe } from 'lucide-react';
import { useFormValidation } from '@/hooks/useFormValidation';
import { validateProgramForm, ValidationError } from '@/utils/formValidation';
import { InputField } from '@/components/common/FieldError';

interface ProgramFormProps {
  formData: any;
  setFormData: (data: any) => void;
  departments: Department[];
  onValidationChange?: (isValid: boolean, errors: ValidationError[]) => void;
}

const degreeTypes = {
  undergraduate: [
    { value: 'bachelor', label: "Bachelor's Degree" },
    { value: 'associate', label: "Associate Degree" },
    { value: 'diploma', label: "Diploma" },
    { value: 'certificate', label: "Certificate" }
  ],
  postgraduate: [
    { value: 'master', label: "Master's Degree" },
    { value: 'phd', label: "PhD/Doctorate" },
    { value: 'postgrad_diploma', label: "Postgraduate Diploma" },
    { value: 'postgrad_certificate', label: "Postgraduate Certificate" }
  ]
};

export default function ProgramForm({ formData, setFormData, departments, onValidationChange }: ProgramFormProps) {
  const { hasFieldError, getFieldError } = useFormValidation({ 
    validateFn: validateProgramForm, 
    formData,
    onValidationChange 
  });
  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const duration = e.target.value ? parseFloat(e.target.value) : null;
    setFormData({ ...formData, duration });
  };

  const handleCreditsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const totalCredits = e.target.value ? parseInt(e.target.value) : null;
    setFormData({ ...formData, totalCredits });
  };

  const handleMaxEnrollmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const maxEnrollment = e.target.value ? parseInt(e.target.value) : null;
    setFormData({ ...formData, maxEnrollment });
  };

  // Get appropriate degree types based on selected level
  const availableDegreeTypes = formData.level ? degreeTypes[formData.level as keyof typeof degreeTypes] : [];

  // Reset degree type when level changes
  React.useEffect(() => {
    if (formData.level && formData.degreeType) {
      const validDegreeTypes = degreeTypes[formData.level as keyof typeof degreeTypes].map(dt => dt.value);
      if (!validDegreeTypes.includes(formData.degreeType)) {
        setFormData({ ...formData, degreeType: '' });
      }
    }
  }, [formData.level]);

  return (
    <div className="space-y-6">
      {/* Basic Program Information */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-gray-600" />
          Program Information
        </h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <InputField 
              label="Program Code" 
              required 
              error={getFieldError('code')}
            >
              <input
                type="text"
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  hasFieldError('code') ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g., BCS"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Short code for the program (3-10 characters)
              </p>
            </InputField>
            <InputField 
              label="Program Name" 
              required 
              error={getFieldError('name')}
            >
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  hasFieldError('name') ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g., Bachelor of Computer Science"
                required
              />
            </InputField>
          </div>
        </div>
      </div>

      {/* Academic Details */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Academic Details</h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <InputField 
              label="Department" 
              required 
              error={getFieldError('departmentId')}
            >
              <select
                value={formData.departmentId || ''}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  hasFieldError('departmentId') ? 'border-red-300' : 'border-gray-300'
                }`}
                required
              >
                <option value="">Select Department</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </InputField>
            <InputField 
              label="Level" 
              required 
              error={getFieldError('level')}
            >
              <select
                value={formData.level || ''}
                onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  hasFieldError('level') ? 'border-red-300' : 'border-gray-300'
                }`}
                required
              >
                <option value="">Select Level</option>
                <option value="undergraduate">Undergraduate</option>
                <option value="postgraduate">Postgraduate</option>
              </select>
            </InputField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InputField 
              label="Degree Type" 
              required 
              error={getFieldError('degreeType')}
            >
              <select
                value={formData.degreeType || ''}
                onChange={(e) => setFormData({ ...formData, degreeType: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  hasFieldError('degreeType') ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={!formData.level}
                required
              >
                <option value="">Select Degree Type</option>
                {availableDegreeTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </InputField>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mode of Study
              </label>
              <select
                value={formData.mode || 'full-time'}
                onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="online">Online</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <InputField 
              label="Duration (years)" 
              required 
              error={getFieldError('duration')}
            >
              <input
                type="number"
                value={formData.duration ?? ''}
                onChange={handleDurationChange}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  hasFieldError('duration') ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g., 4"
                min="0.5"
                max="8"
                step="0.5"
                required
              />
            </InputField>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 items-center gap-2">
                <CreditCard className="w-4 h-4 text-gray-400" />
                Total Credits
              </label>
              <input
                type="number"
                value={formData.totalCredits ?? ''}
                onChange={handleCreditsChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 120"
                min="30"
                max="300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                Max Enrollment
              </label>
              <input
                type="number"
                value={formData.maxEnrollment ?? ''}
                onChange={handleMaxEnrollmentChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 100"
                min="1"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Program Details */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Program Details</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Program Coordinator
            </label>
            <input
              type="text"
              value={formData.coordinator || ''}
              onChange={(e) => setFormData({ ...formData, coordinator: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Dr. Jane Smith"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 items-center gap-2">
              <FileText className="w-4 h-4 text-gray-400" />
              Description
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="Brief description of the program, its objectives, and career prospects..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 items-center gap-2">
              <BookOpen className="w-4 h-4 text-gray-400" />
              Prerequisites
            </label>
            <textarea
              value={formData.prerequisites || ''}
              onChange={(e) => setFormData({ ...formData, prerequisites: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="Entry requirements or prerequisites for this program..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 items-center gap-2">
              <Globe className="w-4 h-4 text-gray-400" />
              Accreditation
            </label>
            <input
              type="text"
              value={formData.accreditation || ''}
              onChange={(e) => setFormData({ ...formData, accreditation: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., ABET Accredited, AACSB Certified"
            />
          </div>
        </div>
      </div>

      {/* Form Summary */}
      {formData.code && formData.name && formData.departmentId && formData.duration && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">Program Summary</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <p><span className="font-medium">Code:</span> {formData.code}</p>
            <p><span className="font-medium">Name:</span> {formData.name}</p>
            <p><span className="font-medium">Department:</span> {departments.find(d => d.id === formData.departmentId)?.name}</p>
            <p><span className="font-medium">Level:</span> {formData.level === 'undergraduate' ? 'Undergraduate' : 'Postgraduate'}</p>
            {formData.degreeType && (
              <p><span className="font-medium">Degree Type:</span> {availableDegreeTypes.find(dt => dt.value === formData.degreeType)?.label}</p>
            )}
            <p><span className="font-medium">Duration:</span> {formData.duration} year{formData.duration !== 1 ? 's' : ''}</p>
            {formData.totalCredits && (
              <p><span className="font-medium">Total Credits:</span> {formData.totalCredits}</p>
            )}
            {formData.mode && (
              <p><span className="font-medium">Mode:</span> {formData.mode.charAt(0).toUpperCase() + formData.mode.slice(1).replace('-', ' ')}</p>
            )}
            {formData.coordinator && (
              <p><span className="font-medium">Coordinator:</span> {formData.coordinator}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}