import React from 'react';
import { Department, Program } from '@/types/database';
import { CourseFormData } from '@/types/forms';
import { BookOpen, Hash, Calendar, CreditCard, Palette, FileText, Tag } from 'lucide-react';

interface CourseFormProps {
  formData: CourseFormData;
  setFormData: (data: CourseFormData) => void;
  departments: Department[];
  programs: Program[];
}

// Predefined color options for courses
const colorOptions = [
  { name: 'Blue', value: 'bg-blue-400' },
  { name: 'Green', value: 'bg-green-400' },
  { name: 'Purple', value: 'bg-purple-400' },
  { name: 'Red', value: 'bg-red-400' },
  { name: 'Yellow', value: 'bg-yellow-400' },
  { name: 'Pink', value: 'bg-pink-400' },
  { name: 'Indigo', value: 'bg-indigo-400' },
  { name: 'Gray', value: 'bg-gray-400' },
];

export default function CourseForm({ formData, setFormData, departments, programs }: CourseFormProps) {
  // Ensure yearLevel and semester are always numbers, never null
  React.useEffect(() => {
    let needsUpdate = false;
    const updates: any = {};

    // Convert string values to numbers
    if (formData.yearLevel && typeof formData.yearLevel === 'string') {
      updates.yearLevel = parseInt(formData.yearLevel);
      needsUpdate = true;
    }
    if (formData.semester && typeof formData.semester === 'string') {
      updates.semester = parseInt(formData.semester);
      needsUpdate = true;
    }

    // Ensure we never have null values for yearLevel or semester
    if (formData.yearLevel === null || formData.yearLevel === undefined) {
      updates.yearLevel = 1; // Default to 1 instead of null
      needsUpdate = true;
    }
    if (formData.semester === null || formData.semester === undefined) {
      updates.semester = 1; // Default to 1 instead of null
      needsUpdate = true;
    }

    if (needsUpdate) {
      setFormData({ ...formData, ...updates });
    }
  }, []);

  const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const deptId = e.target.value;
    setFormData({ 
      ...formData, 
      departmentId: deptId,
      programId: '' // Reset program when department changes
    });
  };

  const handleYearLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    // Always convert to number, never null
    const yearLevel = e.target.value ? parseInt(e.target.value) : 1;
    console.log('Setting course yearLevel to:', yearLevel, 'Type:', typeof yearLevel);
    setFormData({ ...formData, yearLevel });
  };

  const handleSemesterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    // Always convert to number, never null
    const semester = e.target.value ? parseInt(e.target.value) as 1 | 2 : 1;
    console.log('Setting course semester to:', semester, 'Type:', typeof semester);
    setFormData({ ...formData, semester });
  };

  const handleCreditsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const credits = e.target.value ? parseInt(e.target.value) : 0;
    setFormData({ ...formData, credits });
  };

  // Filter programs based on selected department
  const availablePrograms = formData.departmentId 
    ? programs.filter(p => p.departmentId === formData.departmentId)
    : programs;

  return (
    <div className="space-y-6">
      {/* Basic Course Information */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-gray-600" />
          Course Information
        </h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 items-center gap-2">
                <Hash className="w-4 h-4 text-gray-400" />
                Course Code
              </label>
              <input
                type="text"
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., CS101"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Course Name</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Introduction to Programming"
                required
              />
            </div>
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 items-center gap-2">
              <Palette className="w-4 h-4 text-gray-400" />
              Course Color
            </label>
            <div className="flex gap-2 flex-wrap">
              {colorOptions.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, color: color.value })}
                  className={`w-10 h-10 rounded-lg ${color.value} border-2 ${
                    formData.color === color.value ? 'border-gray-800' : 'border-transparent'
                  } hover:scale-110 transition-transform`}
                  title={color.name}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Academic Assignment */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Academic Assignment</h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
              <select
                value={formData.departmentId || ''}
                onChange={handleDepartmentChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Department</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Program
                {formData.departmentId && availablePrograms.length === 0 && (
                  <span className="text-xs text-amber-600 ml-2">(No programs in this department)</span>
                )}
              </label>
              <select
                value={formData.programId || ''}
                onChange={(e) => setFormData({ ...formData, programId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={!formData.departmentId}
              >
                <option value="">
                  {formData.departmentId ? 'Select Program' : 'Select department first'}
                </option>
                {availablePrograms.map(prog => (
                  <option key={prog.id} value={prog.id}>{prog.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 items-center gap-2">
                <CreditCard className="w-4 h-4 text-gray-400" />
                Credits
              </label>
              <input
                type="number"
                value={formData.credits || ''}
                onChange={handleCreditsChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 3"
                min="1"
                max="6"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                Year Level
              </label>
              <select
                value={formData.yearLevel?.toString() || '1'} // Default to '1' string for select
                onChange={handleYearLevelChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="1">Year 1</option>
                <option value="2">Year 2</option>
                <option value="3">Year 3</option>
                <option value="4">Year 4</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                The year level when students take this course
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Semester</label>
              <select
                value={formData.semester?.toString() || '1'} // Default to '1' string for select
                onChange={handleSemesterChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Course Details */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Course Details</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 items-center gap-2">
              <Tag className="w-4 h-4 text-gray-400" />
              Course Type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="isCore"
                  checked={formData.isCore === true}
                  onChange={() => setFormData({ ...formData, isCore: true })}
                  className="mr-2"
                />
                <span className="text-sm">Core Course</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="isCore"
                  checked={formData.isCore === false}
                  onChange={() => setFormData({ ...formData, isCore: false })}
                  className="mr-2"
                />
                <span className="text-sm">Elective Course</span>
              </label>
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
              placeholder="Course description..."
            />
          </div>
        </div>
      </div>

      {/* Form Summary */}
      {formData.code && formData.name && formData.programId && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">Course Summary</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <p><span className="font-medium">Code:</span> {formData.code}</p>
            <p><span className="font-medium">Name:</span> {formData.name}</p>
            <p><span className="font-medium">Program:</span> {programs.find(p => p.id === formData.programId)?.name}</p>
            <p><span className="font-medium">Schedule:</span> Year {formData.yearLevel || 1}, Semester {formData.semester || 1}</p>
            <p><span className="font-medium">Credits:</span> {formData.credits || 'Not set'}</p>
            <p><span className="font-medium">Type:</span> {formData.isCore ? 'Core' : formData.isCore === false ? 'Elective' : 'Not set'}</p>
            {formData.color && (
              <p className="flex items-center gap-2">
                <span className="font-medium">Color:</span>
                <span className={`w-4 h-4 rounded ${formData.color}`}></span>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}