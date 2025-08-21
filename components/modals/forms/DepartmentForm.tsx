import React from 'react';
import { Building2, Hash, User, MapPin, Calendar, FileText, Phone, Mail, Globe } from 'lucide-react';
import { DepartmentFormData } from '@/types/forms';
import { validateDepartmentForm, ValidationError } from '@/utils/formValidation';
import { useFormValidation } from '@/hooks/useFormValidation';
import FieldError, { InputField } from '@/components/common/FieldError';

interface DepartmentFormProps {
  formData: DepartmentFormData;
  setFormData: (data: DepartmentFormData) => void;
  onValidationChange?: (isValid: boolean, errors: ValidationError[]) => void;
}

export default function DepartmentForm({ formData, setFormData, onValidationChange }: DepartmentFormProps) {
  const { validationErrors, hasFieldError, getFieldError } = useFormValidation({
    validateFn: validateDepartmentForm,
    formData,
    onValidationChange
  });
  const handleEstablishedYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const year = e.target.value ? parseInt(e.target.value) : undefined;
    setFormData({ ...formData, establishedYear: year });
  };

  return (
    <div className="space-y-6">
      {/* Basic Department Information */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-gray-600" />
          Department Information
        </h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <InputField 
              label="Department Code" 
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
                placeholder="e.g., CS"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Short code for the department (2-5 characters)
              </p>
            </InputField>
            <InputField 
              label="Department Name" 
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
                placeholder="e.g., Computer Science"
                required
              />
            </InputField>
          </div>

          <InputField 
            label="Department Head" 
            required 
            error={getFieldError('head')}
          >
            <input
              type="text"
              value={formData.head || ''}
              onChange={(e) => setFormData({ ...formData, head: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                hasFieldError('head') ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="e.g., Dr. John Smith"
              required
            />
          </InputField>
        </div>
      </div>

      {/* Department Details */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Department Details</h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                Location/Building
              </label>
              <input
                type="text"
                value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Science Building, Floor 3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                Established Year
              </label>
              <input
                type="number"
                value={formData.establishedYear ?? ''}
                onChange={handleEstablishedYearChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 1995"
                min="1900"
                max={new Date().getFullYear()}
              />
            </div>
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
              placeholder="Brief description of the department, its mission, and focus areas..."
            />
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Contact Information</h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., +1 234 567 8900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                Email Address
              </label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., cs.dept@university.edu"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 items-center gap-2">
              <Globe className="w-4 h-4 text-gray-400" />
              Website
            </label>
            <input
              type="url"
              value={formData.website || ''}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., https://cs.university.edu"
            />
          </div>
        </div>
      </div>

      {/* Form Summary */}
      {formData.code && formData.name && formData.head && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">Department Summary</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <p><span className="font-medium">Code:</span> {formData.code}</p>
            <p><span className="font-medium">Name:</span> {formData.name}</p>
            <p><span className="font-medium">Head:</span> {formData.head}</p>
            {formData.location && (
              <p><span className="font-medium">Location:</span> {formData.location}</p>
            )}
            {formData.establishedYear && (
              <p><span className="font-medium">Established:</span> {formData.establishedYear}</p>
            )}
            {formData.email && (
              <p><span className="font-medium">Email:</span> {formData.email}</p>
            )}
            {formData.phone && (
              <p><span className="font-medium">Phone:</span> {formData.phone}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}