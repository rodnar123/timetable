import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Grid, List, GraduationCap, Award, Clock, Users, CreditCard, BookOpen, Globe, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { Program, Department, ModalType } from '@/types/database';

interface ProgramsProps {
  programs: Program[];
  departments: Department[];
  selectedDepartment: string;
  setSelectedDepartment: (dept: string) => void;
  openModal: (type: ModalType, item?: any) => void;
  handleDelete: (type: string, id: string) => void;
  selectedView: 'grid' | 'list';
  setSelectedView: React.Dispatch<React.SetStateAction<'grid' | 'list'>>;
}

export default function Programs({
  programs,
  departments,
  selectedDepartment,
  setSelectedDepartment,
  openModal,
  handleDelete,
  selectedView,
  setSelectedView
}: ProgramsProps) {
  // Local state
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedLevel, setSelectedLevel] = React.useState<string>('all');
  const [selectedMode, setSelectedMode] = React.useState<string>('all');
  const [expandedDescriptions, setExpandedDescriptions] = React.useState<Set<string>>(new Set());
  const [expandedCards, setExpandedCards] = React.useState<Set<string>>(new Set());

  // Toggle functions
  const toggleDescription = (programId: string) => {
    setExpandedDescriptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(programId)) {
        newSet.delete(programId);
      } else {
        newSet.add(programId);
      }
      return newSet;
    });
  };

  const toggleCardExpansion = (programId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(programId)) {
        newSet.delete(programId);
      } else {
        newSet.add(programId);
      }
      return newSet;
    });
  };

  // Helper functions
  const formatLevel = (level: string | undefined) => {
    if (!level) return 'Not Set';
    
    switch (level) {
      case 'undergraduate':
        return 'Undergraduate';
      case 'postgraduate':
        return 'Postgraduate';
      default:
        return level.charAt(0).toUpperCase() + level.slice(1);
    }
  };

  const getLevelBadgeClass = (level: string | undefined) => {
    if (!level) return 'bg-gray-100 text-gray-600';
    
    switch (level) {
      case 'undergraduate':
        return 'bg-blue-100 text-blue-800';
      case 'postgraduate':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatMode = (mode: string | undefined) => {
    if (!mode) return 'Not Set';
    return mode.charAt(0).toUpperCase() + mode.slice(1).replace('-', ' ');
  };

  const getModeBadgeClass = (mode: string | undefined) => {
    if (!mode) return 'bg-gray-100 text-gray-600';
    
    switch (mode) {
      case 'full-time':
        return 'bg-green-100 text-green-800';
      case 'part-time':
        return 'bg-yellow-100 text-yellow-800';
      case 'online':
        return 'bg-blue-100 text-blue-800';
      case 'hybrid':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Filter programs
  const filteredPrograms = programs.filter(program => {
    const matchesSearch = !searchTerm || 
      (program.name && program.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (program.code && program.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (program.description && program.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (program.coordinator && program.coordinator.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesDept = selectedDepartment === 'all' || program.departmentId === selectedDepartment;
    const matchesLevel = selectedLevel === 'all' || program.level === selectedLevel;
    const matchesMode = selectedMode === 'all' || program.mode === selectedMode;
    return matchesSearch && matchesDept && matchesLevel && matchesMode;
  });

  // Calculate statistics
  const totalCredits = programs.reduce((sum, p) => sum + (p.totalCredits || 0), 0);
  const avgCredits = programs.filter(p => p.totalCredits).length > 0 
    ? Math.round(totalCredits / programs.filter(p => p.totalCredits).length)
    : 0;
  const programsWithCoordinator = programs.filter(p => p.coordinator).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-800">Programs</h2>
        <button
          onClick={() => openModal('program')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Program
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Programs</p>
              <p className="text-2xl font-bold text-gray-800">{programs.length}</p>
            </div>
            <GraduationCap className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Undergraduate</p>
              <p className="text-2xl font-bold text-gray-800">
                {programs.filter(p => p.level === 'undergraduate').length}
              </p>
            </div>
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 font-semibold">UG</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Postgraduate</p>
              <p className="text-2xl font-bold text-gray-800">
                {programs.filter(p => p.level === 'postgraduate').length}
              </p>
            </div>
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-purple-600 font-semibold">PG</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Credits</p>
              <p className="text-2xl font-bold text-gray-800">{avgCredits}</p>
              <p className="text-sm text-gray-500">Per program</p>
            </div>
            <CreditCard className="w-8 h-8 text-green-500" />
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
              placeholder="Search programs..."
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
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Levels</option>
            <option value="undergraduate">Undergraduate</option>
            <option value="postgraduate">Postgraduate</option>
          </select>
          <select
            value={selectedMode}
            onChange={(e) => setSelectedMode(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Modes</option>
            <option value="full-time">Full-time</option>
            <option value="part-time">Part-time</option>
            <option value="online">Online</option>
            <option value="hybrid">Hybrid</option>
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

      {/* Programs Display */}
      {selectedView === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPrograms.map((program, index) => {
            const dept = departments.find(d => d.id === program.departmentId);
            const isExpanded = expandedCards.has(program.id);
            const isDescExpanded = expandedDescriptions.has(program.id);

            return (
              <motion.div
                key={program.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02 }}
                className="bg-white p-6 rounded-xl shadow-lg border border-gray-100"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-800">{program.code}</h3>
                    <p className="text-sm text-gray-600">{program.name}</p>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLevelBadgeClass(program.level)}`}>
                      {program.level === 'postgraduate' && <Award className="w-3 h-3 mr-1" />}
                      {program.level === 'undergraduate' && <GraduationCap className="w-3 h-3 mr-1" />}
                      {formatLevel(program.level)}
                    </span>
                    {program.mode && (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getModeBadgeClass(program.mode)}`}>
                        {formatMode(program.mode)}
                      </span>
                    )}
                  </div>
                </div>

                {program.description && (
                  <div className="mb-3">
                    <p className={`text-sm text-gray-600 ${isDescExpanded ? '' : 'line-clamp-2'}`}>
                      {program.description}
                    </p>
                    {program.description.length > 100 && (
                      <button
                        onClick={() => toggleDescription(program.id)}
                        className="text-xs text-blue-600 hover:text-blue-700 mt-1"
                      >
                        {isDescExpanded ? 'Show less' : 'Show more'}
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
                    <span className="text-gray-500">Duration:</span>
                    <span className="text-gray-700 flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {program.duration} year{program.duration !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {program.totalCredits && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Total Credits:</span>
                      <span className="text-gray-700 flex items-center">
                        <CreditCard className="w-3 h-3 mr-1" />
                        {program.totalCredits}
                      </span>
                    </div>
                  )}
                  {program.coordinator && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Coordinator:</span>
                      <span className="text-gray-700">{program.coordinator}</span>
                    </div>
                  )}
                  {program.accreditation && (
                    <div className="flex items-start gap-1 text-sm mt-2">
                      <Globe className="w-3 h-3 text-gray-400 mt-0.5" />
                      <span className="text-gray-700 text-xs">{program.accreditation}</span>
                    </div>
                  )}
                </div>

                {/* Expandable Additional Info */}
                {(program.prerequisites || program.maxEnrollment) && (
                  <div className="mt-3 pt-3 border-t">
                    <button
                      onClick={() => toggleCardExpansion(program.id)}
                      className="flex items-center justify-between w-full text-sm text-gray-600 hover:text-gray-800"
                    >
                      <span>Additional Info</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {isExpanded && (
                      <div className="mt-2 space-y-2">
                        {program.prerequisites && (
                          <div className="text-sm">
                            <span className="text-gray-500">Prerequisites:</span>
                            <p className="text-gray-600 text-xs mt-1">{program.prerequisites}</p>
                          </div>
                        )}
                        {program.maxEnrollment && (
                          <div className="text-sm flex items-center gap-1">
                            <Users className="w-3 h-3 text-gray-400" />
                            <span className="text-gray-600">Max Enrollment: {program.maxEnrollment}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-4 pt-4 border-t flex gap-2">
                  <button
                    onClick={() => openModal('program', program)}
                    className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete('program', program.id)}
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
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Department</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Level</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Mode</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Duration</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Credits</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                    <Info className="w-4 h-4 inline" />
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPrograms.map((program, index) => {
                  const dept = departments.find(d => d.id === program.departmentId);
                  return (
                    <motion.tr 
                      key={program.id} 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{program.code}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{program.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{dept?.name || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLevelBadgeClass(program.level)}`}>
                          {program.level === 'postgraduate' && <Award className="w-3 h-3 mr-1" />}
                          {program.level === 'undergraduate' && <GraduationCap className="w-3 h-3 mr-1" />}
                          {formatLevel(program.level)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {program.mode && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getModeBadgeClass(program.mode)}`}>
                            {formatMode(program.mode)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        <span className="inline-flex items-center">
                          {program.duration} year{program.duration !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">{program.totalCredits || '-'}</td>
                      <td className="px-6 py-4 text-sm text-center">
                        {(program.description || program.coordinator || program.prerequisites) && (
                          <button
                            onClick={() => toggleDescription(program.id)}
                            className="text-gray-400 hover:text-gray-600"
                            title={expandedDescriptions.has(program.id) ? 'Hide details' : 'Show details'}
                          >
                            <Info className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => openModal('program', program)}
                          className="text-blue-600 hover:text-blue-800 mr-3 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete('program', program.id)}
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>

            {/* Expanded details rows */}
            {filteredPrograms.map((program) => 
              expandedDescriptions.has(program.id) && (program.description || program.coordinator || program.prerequisites || program.accreditation) ? (
                <div key={`details-${program.id}`} className="px-6 py-3 bg-gray-50 border-t">
                  {program.description && (
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Description:</span> {program.description}
                    </p>
                  )}
                  {program.coordinator && (
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Coordinator:</span> {program.coordinator}
                    </p>
                  )}
                  {program.prerequisites && (
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Prerequisites:</span> {program.prerequisites}
                    </p>
                  )}
                  {program.accreditation && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Accreditation:</span> {program.accreditation}
                    </p>
                  )}
                  {program.maxEnrollment && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Max Enrollment:</span> {program.maxEnrollment} students
                    </p>
                  )}
                </div>
              ) : null
            )}
          </div>
          
          {filteredPrograms.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No programs found matching your search criteria.
            </div>
          )}
        </div>
      )}

      {/* Additional Stats */}
      {filteredPrograms.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-gray-700">
                <strong>{programsWithCoordinator}</strong> programs have assigned coordinators 
                ({Math.round((programsWithCoordinator / programs.length) * 100)}%)
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}