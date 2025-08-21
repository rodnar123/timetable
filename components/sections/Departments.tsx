import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Building2, Edit, Trash2, Search, Grid, List, Users, GraduationCap, Award, MapPin, Calendar, Phone, Mail, Globe, Info, ChevronDown, ChevronUp, Upload } from 'lucide-react';
import { Department, Program, Faculty, ModalType } from '@/types/database';
import BulkImportComponent from '@/components/common/BulkImportComponent';
import { departmentImportConfig } from '@/utils/importConfigs';

interface DepartmentsProps {
  departments: Department[];
  programs: Program[];
  faculty: Faculty[];
  openModal: (type: ModalType, item?: any) => void;
  handleDelete: (type: string, id: string) => void;
  handleBulkImport?: (departments: Partial<Department>[]) => void;
  selectedView: 'grid' | 'list';
  setSelectedView: React.Dispatch<React.SetStateAction<'grid' | 'list'>>;
}

export default function Departments({
  departments,
  programs,
  faculty,
  openModal,
  handleDelete,
  handleBulkImport,
  selectedView,
  setSelectedView
}: DepartmentsProps) {
  // Local state for search and expanded cards
  const [searchTerm, setSearchTerm] = React.useState('');
  const [expandedDescriptions, setExpandedDescriptions] = React.useState<Set<string>>(new Set());
  const [expandedCards, setExpandedCards] = React.useState<Set<string>>(new Set());
  const [showImportModal, setShowImportModal] = React.useState(false);

  // Toggle description expansion
  const toggleDescription = (deptId: string) => {
    setExpandedDescriptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(deptId)) {
        newSet.delete(deptId);
      } else {
        newSet.add(deptId);
      }
      return newSet;
    });
  };

  // Toggle card expansion (for contact info)
  const toggleCardExpansion = (deptId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(deptId)) {
        newSet.delete(deptId);
      } else {
        newSet.add(deptId);
      }
      return newSet;
    });
  };

  // Filter departments based on search
  const filteredDepartments = departments.filter(dept => {
    const matchesSearch = !searchTerm || 
      (dept.name && dept.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (dept.code && dept.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (dept.head && dept.head.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (dept.description && dept.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (dept.location && dept.location.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  // Calculate summary statistics
  const totalPrograms = programs.length;
  const totalFaculty = faculty.length;
  const avgDeptAge = departments.reduce((sum, dept) => {
    if (dept.establishedYear) {
      return sum + (new Date().getFullYear() - dept.establishedYear);
    }
    return sum;
  }, 0) / departments.filter(d => d.establishedYear).length || 0;

  const deptWithMostPrograms = departments
    .map(dept => ({
      name: dept.name,
      count: programs.filter(p => p.departmentId === dept.id).length
    }))
    .sort((a, b) => b.count - a.count)[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-800">Departments</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Bulk Import
          </button>
          <button
            onClick={() => openModal('department')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Department
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Departments</p>
              <p className="text-2xl font-bold text-gray-800">{departments.length}</p>
            </div>
            <Building2 className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Programs</p>
              <p className="text-2xl font-bold text-gray-800">{totalPrograms}</p>
              <p className="text-sm text-gray-500">Across all depts</p>
            </div>
            <GraduationCap className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Faculty</p>
              <p className="text-2xl font-bold text-gray-800">{totalFaculty}</p>
              <p className="text-sm text-gray-500">All departments</p>
            </div>
            <Users className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Department Age</p>
              <p className="text-2xl font-bold text-gray-800">{Math.round(avgDeptAge)}</p>
              <p className="text-sm text-gray-500">Years</p>
            </div>
            <Calendar className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Search and View Toggle */}
      <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search departments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
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

      {/* Departments Display */}
      {selectedView === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDepartments.map((dept, index) => {
            const deptPrograms = programs.filter(p => p.departmentId === dept.id);
            const deptFaculty = faculty.filter(f => f.departmentId === dept.id);
            const isExpanded = expandedCards.has(dept.id);
            const isDescExpanded = expandedDescriptions.has(dept.id);

            return (
              <motion.div
                key={dept.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02 }}
                className="bg-white p-6 rounded-xl shadow-lg border border-gray-100"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">{dept.name}</h3>
                    <p className="text-sm text-gray-600">Code: {dept.code}</p>
                  </div>
                  <Building2 className="w-8 h-8 text-blue-500" />
                </div>

                {dept.description && (
                  <div className="mb-3">
                    <p className={`text-sm text-gray-600 ${isDescExpanded ? '' : 'line-clamp-2'}`}>
                      {dept.description}
                    </p>
                    {dept.description.length > 100 && (
                      <button
                        onClick={() => toggleDescription(dept.id)}
                        className="text-xs text-blue-600 hover:text-blue-700 mt-1"
                      >
                        {isDescExpanded ? 'Show less' : 'Show more'}
                      </button>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="text-gray-500">Department Head:</span>
                    <p className="text-gray-700 font-medium">{dept.head || 'Not Assigned'}</p>
                  </div>
                  
                  {dept.location && (
                    <div className="text-sm flex items-start gap-1">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                      <span className="text-gray-700">{dept.location}</span>
                    </div>
                  )}

                  {dept.establishedYear && (
                    <div className="text-sm flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700">Est. {dept.establishedYear}</span>
                    </div>
                  )}

                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center">
                      <GraduationCap className="w-4 h-4 mr-1 text-gray-500" />
                      <span className="text-gray-700">{deptPrograms.length} programs</span>
                    </div>
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-1 text-gray-500" />
                      <span className="text-gray-700">{deptFaculty.length} faculty</span>
                    </div>
                  </div>

                  {deptPrograms.length > 0 && (
                    <div className="text-sm">
                      <span className="text-gray-500">Program Types:</span>
                      <div className="flex gap-1 mt-1">
                        {deptPrograms.some(p => p.level === 'undergraduate') && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">UG</span>
                        )}
                        {deptPrograms.some(p => p.level === 'postgraduate') && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">PG</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Expandable Contact Info */}
                {(dept.email || dept.phone || dept.website) && (
                  <div className="mt-3 pt-3 border-t">
                    <button
                      onClick={() => toggleCardExpansion(dept.id)}
                      className="flex items-center justify-between w-full text-sm text-gray-600 hover:text-gray-800"
                    >
                      <span>Contact Info</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {isExpanded && (
                      <div className="mt-2 space-y-1">
                        {dept.phone && (
                          <div className="text-sm flex items-center gap-1">
                            <Phone className="w-3 h-3 text-gray-400" />
                            <span className="text-gray-600">{dept.phone}</span>
                          </div>
                        )}
                        {dept.email && (
                          <div className="text-sm flex items-center gap-1">
                            <Mail className="w-3 h-3 text-gray-400" />
                            <span className="text-gray-600 truncate">{dept.email}</span>
                          </div>
                        )}
                        {dept.website && (
                          <div className="text-sm flex items-center gap-1">
                            <Globe className="w-3 h-3 text-gray-400" />
                            <a href={dept.website} target="_blank" rel="noopener noreferrer" 
                               className="text-blue-600 hover:underline truncate">
                              Website
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-4 pt-4 border-t flex gap-2">
                  <button
                    onClick={() => openModal('department', dept)}
                    className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm flex items-center justify-center gap-1"
                  >
                    <Edit className="w-3 h-3" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete('department', dept.id)}
                    className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm flex items-center justify-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
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
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Head</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Location</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Established</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Programs</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Faculty</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                    <Info className="w-4 h-4 inline" />
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDepartments.map((dept, index) => {
                  const deptPrograms = programs.filter(p => p.departmentId === dept.id);
                  const deptFaculty = faculty.filter(f => f.departmentId === dept.id);

                  return (
                    <motion.tr 
                      key={dept.id} 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{dept.code}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{dept.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{dept.head || 'Not Assigned'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{dept.location || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{dept.establishedYear || '-'}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className="inline-flex items-center">
                          <GraduationCap className="w-4 h-4 mr-1 text-gray-500" />
                          {deptPrograms.length}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="inline-flex items-center">
                          <Users className="w-4 h-4 mr-1 text-gray-500" />
                          {deptFaculty.length}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-center">
                        {(dept.description || dept.email || dept.phone || dept.website) && (
                          <button
                            onClick={() => toggleDescription(dept.id)}
                            className="text-gray-400 hover:text-gray-600"
                            title={expandedDescriptions.has(dept.id) ? 'Hide details' : 'Show details'}
                          >
                            <Info className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => openModal('department', dept)}
                          className="text-blue-600 hover:text-blue-800 mr-3 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete('department', dept.id)}
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
            {filteredDepartments.map((dept) => 
              expandedDescriptions.has(dept.id) && (dept.description || dept.email || dept.phone || dept.website) ? (
                <div key={`details-${dept.id}`} className="px-6 py-3 bg-gray-50 border-t">
                  {dept.description && (
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Description:</span> {dept.description}
                    </p>
                  )}
                  {(dept.email || dept.phone || dept.website) && (
                    <div className="flex gap-4 text-sm text-gray-600">
                      {dept.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {dept.email}
                        </span>
                      )}
                      {dept.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {dept.phone}
                        </span>
                      )}
                      {dept.website && (
                        <a href={dept.website} target="_blank" rel="noopener noreferrer" 
                           className="flex items-center gap-1 text-blue-600 hover:underline">
                          <Globe className="w-3 h-3" /> Website
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ) : null
            )}
          </div>
          
          {filteredDepartments.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No departments found matching your search criteria.
            </div>
          )}
        </div>
      )}

      {deptWithMostPrograms && filteredDepartments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-gray-700">
                <strong>{deptWithMostPrograms.name}</strong> leads with {deptWithMostPrograms.count} programs
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Bulk Import Modal */}
      {showImportModal && (
        <BulkImportComponent
          config={departmentImportConfig}
          existingData={departments}
          onImport={(importedDepartments) => {
            if (handleBulkImport) {
              handleBulkImport(importedDepartments);
            }
            setShowImportModal(false);
          }}
          onClose={() => setShowImportModal(false)}
        />
      )}
    </motion.div>
  );
}