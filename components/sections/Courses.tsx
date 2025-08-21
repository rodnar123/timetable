import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Grid, List, BookOpen, Clock, Users, Info, Tag, Upload } from 'lucide-react';
import { Course, Department, Program, ModalType } from '@/types/database';
import BulkImportComponent from '@/components/common/BulkImportComponent';
import { courseImportConfig } from '@/utils/importConfigs';

interface CoursesProps {
  courses: Course[];
  departments: Department[];
  programs: Program[];
  openModal: (type: ModalType, item?: any) => void;
  handleDelete: (type: string, id: string) => void;
  handleBulkImport?: (courses: Partial<Course>[]) => void;
  selectedView: 'grid' | 'list';
  setSelectedView: React.Dispatch<React.SetStateAction<'grid' | 'list'>>;
}

export default function Courses({
  courses,
  departments,
  programs,
  openModal,
  handleDelete,
  handleBulkImport,
  selectedView,
  setSelectedView
}: CoursesProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedDepartment, setSelectedDepartment] = React.useState('all');
  const [selectedProgram, setSelectedProgram] = React.useState('all');
  const [selectedType, setSelectedType] = React.useState<'all' | 'core' | 'elective'>('all');
  const [expandedDescriptions, setExpandedDescriptions] = React.useState<Set<string>>(new Set());
  const [showImportModal, setShowImportModal] = React.useState(false);

  // Toggle description expansion
  const toggleDescription = (courseId: string) => {
    setExpandedDescriptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(courseId)) {
        newSet.delete(courseId);
      } else {
        newSet.add(courseId);
      }
      return newSet;
    });
  };

  // Filter courses based on search and filters
  const filteredCourses = courses.filter(course => {
    const matchesSearch = !searchTerm || 
      (course.name && course.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (course.code && course.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (course.description && course.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesDept = selectedDepartment === 'all' || course.departmentId === selectedDepartment;
    const matchesProgram = selectedProgram === 'all' || course.programId === selectedProgram;
    const matchesType = selectedType === 'all' || 
      (selectedType === 'core' && course.isCore === true) ||
      (selectedType === 'elective' && course.isCore === false);
    return matchesSearch && matchesDept && matchesProgram && matchesType;
  });

  // Calculate summary statistics
  const totalCredits = courses.reduce((sum, course) => sum + (course.credits || 0), 0);
  const avgCredits = courses.length > 0 ? (totalCredits / courses.length).toFixed(1) : '0';
  const coreCoursesCount = courses.filter(c => c.isCore === true).length;
  const electiveCoursesCount = courses.filter(c => c.isCore === false).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-800">Courses</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Bulk Import
          </button>
          <button
            onClick={() => openModal('course')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Course
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Courses</p>
              <p className="text-2xl font-bold text-gray-800">{courses.length}</p>
            </div>
            <BookOpen className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Average Credits</p>
              <p className="text-2xl font-bold text-gray-800">{avgCredits}</p>
            </div>
            <Clock className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Core Courses</p>
              <p className="text-2xl font-bold text-gray-800">{coreCoursesCount}</p>
            </div>
            <Tag className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Electives</p>
              <p className="text-2xl font-bold text-gray-800">{electiveCoursesCount}</p>
            </div>
            <Users className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Departments</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
          <select
            value={selectedProgram}
            onChange={(e) => setSelectedProgram(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Programs</option>
            {programs.map(prog => (
              <option key={prog.id} value={prog.id}>{prog.name}</option>
            ))}
          </select>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as 'all' | 'core' | 'elective')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="core">Core Only</option>
            <option value="elective">Electives Only</option>
          </select>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedView('grid')}
              className={`p-2 rounded-lg transition-colors ${selectedView === 'grid' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setSelectedView('list')}
              className={`p-2 rounded-lg transition-colors ${selectedView === 'list' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Courses Display */}
      {selectedView === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course, index) => {
            const program = programs.find(p => p.id === course.programId);
            const dept = departments.find(d => d.id === course.departmentId);
            const isExpanded = expandedDescriptions.has(course.id);

            return (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02 }}
                className="bg-white p-6 rounded-xl shadow-lg border border-gray-100"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-800">{course.code}</h3>
                      {course.isCore !== undefined && (
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          course.isCore ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {course.isCore ? 'Core' : 'Elective'}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{course.name}</p>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${course.color || 'bg-gray-400'}`}></div>
                </div>
                
                {course.description && (
                  <div className="mb-3">
                    <p className={`text-sm text-gray-600 ${isExpanded ? '' : 'line-clamp-2'}`}>
                      {course.description}
                    </p>
                    {course.description.length > 100 && (
                      <button
                        onClick={() => toggleDescription(course.id)}
                        className="text-xs text-blue-600 hover:text-blue-700 mt-1"
                      >
                        {isExpanded ? 'Show less' : 'Show more'}
                      </button>
                    )}
                  </div>
                )}
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Department:</span>
                    <span className="text-gray-700">{dept?.name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Program:</span>
                    <span className="text-gray-700">{program?.name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Credits:</span>
                    <span className="text-gray-700">{course.credits || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Year/Semester:</span>
                    <span className="text-gray-700">
                      {course.yearLevel
                        ? `Y${course.yearLevel} S${course.semester || 1}`
                        : <span className="text-red-500 font-semibold">Not Set</span>
                      }
                    </span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t flex gap-2">
                  <button
                    onClick={() => openModal('course', course)}
                    className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete('course', course.id)}
                    className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Code</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Department</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Credits</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Year/Sem</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                    <Info className="w-4 h-4 inline" />
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCourses.map((course, index) => {
                  const dept = departments.find(d => d.id === course.departmentId);

                  return (
                    <motion.tr 
                      key={course.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 flex items-center gap-2">
                        {course.color && (
                          <div className={`w-3 h-3 rounded-full ${course.color}`}></div>
                        )}
                        {course.code}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{course.name || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm">
                        {course.isCore !== undefined && (
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            course.isCore ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
                          }`}>
                            {course.isCore ? 'Core' : 'Elective'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{dept?.name || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{course.credits || 0}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {course.yearLevel
                          ? `Y${course.yearLevel} S${course.semester || 1}`
                          : <span className="text-red-500 font-semibold">Not Set</span>
                        }
                      </td>
                      <td className="px-6 py-4 text-sm text-center">
                        {course.description && (
                          <button
                            onClick={() => toggleDescription(course.id)}
                            className="text-gray-400 hover:text-gray-600"
                            title={expandedDescriptions.has(course.id) ? 'Hide description' : 'Show description'}
                          >
                            <Info className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => openModal('course', course)}
                          className="text-blue-600 hover:text-blue-800 mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete('course', course.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
            
            {/* Expanded descriptions row */}
            {filteredCourses.map((course) => 
              expandedDescriptions.has(course.id) && course.description ? (
                <div key={`desc-${course.id}`} className="px-6 py-3 bg-gray-50 border-t">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Description:</span> {course.description}
                  </p>
                </div>
              ) : null
            )}
          </div>
          
          {filteredCourses.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No courses found matching your search criteria.
            </div>
          )}
        </div>
      )}

      {/* Bulk Import Modal */}
      {showImportModal && (
        <BulkImportComponent
          config={courseImportConfig}
          existingData={{ courses, departments }}
          onImport={(importedCourses) => {
            if (handleBulkImport) {
              handleBulkImport(importedCourses);
            }
            setShowImportModal(false);
          }}
          onClose={() => setShowImportModal(false)}
        />
      )}
    </motion.div>
  );
}