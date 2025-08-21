import React from 'react';
import { Department } from '@/types/database';
import { FacultyFormData } from '@/types/forms';
import { validateFacultyForm, ValidationError } from '@/utils/formValidation';
import { useFormValidation } from '@/hooks/useFormValidation';
import FieldError, { InputField } from '@/components/common/FieldError';

interface FacultyFormProps {
  formData: FacultyFormData;
  setFormData: (data: FacultyFormData) => void;
  departments: Department[];
  onValidationChange?: (isValid: boolean, errors: ValidationError[]) => void;
}

export default function FacultyForm({ formData, setFormData, departments, onValidationChange }: FacultyFormProps) {
  const { validationErrors, hasFieldError, getFieldError } = useFormValidation({
    validateFn: validateFacultyForm,
    formData,
    onValidationChange
  });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
          <select
            value={formData.title || ''}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select</option>
            <option value="Mr.">Mr.</option>
            <option value="Mrs.">Mrs.</option>
            <option value="Ms.">Ms.</option>
            <option value="Dr.">Dr.</option>
            <option value="Prof.">Prof.</option>
          </select>
        </div>
        <InputField 
          label="First Name" 
          required 
          error={getFieldError('firstName')}
        >
          <input
            type="text"
            value={formData.firstName || ''}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              hasFieldError('firstName') ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="John"
            required
          />
        </InputField>
        <InputField 
          label="Last Name" 
          required 
          error={getFieldError('lastName')}
        >
          <input
            type="text"
            value={formData.lastName || ''}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              hasFieldError('lastName') ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Smith"
            required
          />
        </InputField>
      </div>
      
      <InputField 
        label="Staff ID" 
        required 
        error={getFieldError('staffId')}
      >
        <input
          type="text"
          value={formData.staffId || ''}
          onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            hasFieldError('staffId') ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="e.g., FAC001"
          required
        />
      </InputField>
      
      <div className="grid grid-cols-2 gap-4">
        <InputField 
          label="Email" 
          error={getFieldError('email')}
        >
          <input
            type="email"
            value={formData.email || ''}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              hasFieldError('email') ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="john.smith@pnguot.ac.pg"
          />
        </InputField>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
          <input
            type="tel"
            value={formData.phone || ''}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="+675 7XX XXXXX"
          />
        </div>
      </div>
      
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
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Office Number</label>
          <input
            type="text"
            value={formData.officeNumber || ''}
            onChange={(e) => setFormData({ ...formData, officeNumber: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., A201"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Office Hours</label>
          <input
            type="text"
            value={formData.officeHours || ''}
            onChange={(e) => setFormData({ ...formData, officeHours: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Mon-Wed 2-4pm"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Specialization</label>
        <input
          type="text"
          value={formData.specialization || ''}
          onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., Artificial Intelligence"
        />
      </div>
    </div>
  );
}
