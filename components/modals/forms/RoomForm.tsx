import React from 'react';
import { Department, Room } from '@/types/database';
import { validateRoomForm, ValidationError } from '@/utils/formValidation';
import { useFormValidation } from '@/hooks/useFormValidation';
import FieldError, { InputField } from '@/components/common/FieldError';

interface RoomFormProps {
  formData: Partial<Room>;
  setFormData: (data: Partial<Room>) => void;
  departments: Department[];
  onValidationChange?: (isValid: boolean, errors: ValidationError[]) => void;
}

export default function RoomForm({ formData, setFormData, departments = [], onValidationChange }: RoomFormProps) {
  const { validationErrors, hasFieldError, getFieldError } = useFormValidation({
    validateFn: validateRoomForm,
    formData,
    onValidationChange
  });
  // Handler for department change
  const handleDepartmentChange = (departmentId: string) => {
    setFormData({
      ...formData,
      departmentId
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <InputField 
          label="Room Code" 
          required 
          error={getFieldError('code')}
        >
          <input
            type="text"
            value={formData.code || ''}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              hasFieldError('code') ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="e.g., LT-101"
            required
          />
        </InputField>
        <InputField 
          label="Room Name" 
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
            placeholder="e.g., Lecture Theater 1"
            required
          />
        </InputField>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <InputField 
          label="Building" 
          required 
          error={getFieldError('building')}
        >
          <input
            type="text"
            value={formData.building || ''}
            onChange={(e) => setFormData({ ...formData, building: e.target.value })}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              hasFieldError('building') ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="e.g., Main Building"
            required
          />
        </InputField>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
          <select
            value={formData.departmentId || ''}
            onChange={(e) => handleDepartmentChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Department</option>
            {departments && departments.length > 0 ? (
              departments.map(department => (
                <option key={department.id} value={department.id}>
                  {department.code} - {department.name}
                </option>
              ))
            ) : (
              <option value="" disabled>No departments available</option>
            )}
          </select>
        </div>
        <InputField 
          label="Capacity" 
          required 
          error={getFieldError('capacity')}
        >
          <input
            type="number"
            value={formData.capacity || ''}
            onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              hasFieldError('capacity') ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="e.g., 100"
            min="1"
            required
          />
        </InputField>
        <InputField 
          label="Room Type" 
          required 
          error={getFieldError('type')}
        >
          <select
            value={formData.type || ''}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as Room['type'] })}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              hasFieldError('type') ? 'border-red-300' : 'border-gray-300'
            }`}
            required
          >
            <option value="">Select Type</option>
            <option value="lecture">Lecture Hall</option>
            <option value="tutorial">Tutorial Room</option>
            <option value="lab">Laboratory</option>
            <option value="computer">Computer Lab</option>
            <option value="workshop">Workshop</option>
          </select>
        </InputField>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Floor</label>
        <input
          type="number"
          value={formData.floor || ''}
          onChange={(e) => setFormData({ ...formData, floor: parseInt(e.target.value) })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., 1"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Equipment (comma-separated)</label>
        <input
          type="text"
          value={formData.equipment?.join(', ') || ''}
          onChange={(e) => setFormData({
            ...formData,
            equipment: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
          })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., Projector, Whiteboard, AC"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Features (comma-separated)</label>
        <input
          type="text"
          value={formData.features?.join(', ') || ''}
          onChange={(e) => setFormData({
            ...formData,
            features: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
          })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., Wheelchair Access, Sound System"
        />
      </div>
      <div className="flex items-center">
        <input
          type="checkbox"
          id="available"
          checked={formData.available !== false}
          onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
        />
        <label htmlFor="available" className="ml-2 text-sm text-gray-700">
          Room is available for scheduling
        </label>
      </div>
    </div>
  );
}
  

