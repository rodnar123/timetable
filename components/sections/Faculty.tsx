import React from 'react';
import { motion } from 'framer-motion';
import { Plus, User, Search, Grid, List, Users, Mail, Building2, Upload } from 'lucide-react';
import { Faculty, Department, ModalType } from '@/types/database';
import BulkImportComponent from '@/components/common/BulkImportComponent';
import { facultyImportConfig } from '@/utils/importConfigs';

interface FacultyProps {
  faculty: Faculty[];
  departments: Department[];
  openModal: (type: ModalType, item?: any) => void;
  handleDelete: (type: string, id: string) => void;
  handleBulkImport?: (faculty: Partial<Faculty>[]) => void;
}

export default function FacultySection({
  faculty,
  departments,
  openModal,
  handleDelete,
  handleBulkImport
}: FacultyProps) {
  // Local state for search, view, and department filter
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedView, setSelectedView] = React.useState<'grid' | 'list'>('grid');
  const [selectedDepartment, setSelectedDepartment] = React.useState('all');
  const [showImportModal, setShowImportModal] = React.useState(false);

  // Helper function to format faculty name
  const formatFacultyName = (member: Faculty) => {
    return `${member.title || ''} ${member.firstName || ''} ${member.lastName || ''}`.trim();
  };

  // Filter faculty based on search and department
  const filteredFaculty = faculty.filter(member => {
    const fullName = formatFacultyName(member).toLowerCase();
    const matchesSearch = !searchTerm || 
      fullName.includes(searchTerm.toLowerCase()) ||
      (member.staffId && member.staffId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (member.email && member.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesDept = selectedDepartment === 'all' || member.departmentId === selectedDepartment;
    return matchesSearch && matchesDept;
  });

  // Calculate summary statistics
  const facultyByDept = departments.map(dept => ({
    dept: dept.name,
    count: faculty.filter(f => f.departmentId === dept.id).length
  })).sort((a, b) => b.count - a.count)[0];

  const facultyWithOfficeHours = faculty.filter(f => f.officeHours && f.officeHours.trim() !== '').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-800">Faculty Members</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Bulk Import
          </button>
          <button
            onClick={() => openModal('faculty')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Faculty
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Faculty</p>
              <p className="text-2xl font-bold text-gray-800">{faculty.length}</p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">With Office Hours</p>
              <p className="text-2xl font-bold text-gray-800">{facultyWithOfficeHours}</p>
            </div>
            <Building2 className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Largest Department</p>
              <p className="text-lg font-bold text-gray-800">{facultyByDept?.dept || 'N/A'}</p>
              <p className="text-sm text-gray-500">{facultyByDept?.count || 0} members</p>
            </div>
            <Mail className="w-8 h-8 text-purple-500" />
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
              placeholder="Search faculty by name, ID, or email..."
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

      {/* Faculty Display */}
      {selectedView === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFaculty.map((member, index) => {
            const dept = departments.find(d => d.id === member.departmentId);

            return (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02 }}
                className="bg-white p-6 rounded-xl shadow-lg border border-gray-100"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-gray-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      {formatFacultyName(member)}
                    </h3>
                    <p className="text-sm text-gray-600">{dept?.name || 'N/A'}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="text-gray-500">Staff ID:</span>
                    <p className="text-gray-700">{member.staffId || 'N/A'}</p>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">Email:</span>
                    <p className="text-gray-700 truncate">{member.email || 'N/A'}</p>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">Office:</span>
                    <p className="text-gray-700">{member.officeNumber || 'N/A'}</p>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">Office Hours:</span>
                    <p className="text-gray-700">{member.officeHours || 'Not set'}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t flex gap-2">
                  <button
                    onClick={() => openModal('faculty', member)}
                    className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete('faculty', member.id)}
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
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Staff ID</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Department</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Office</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFaculty.map((member, index) => {
                const dept = departments.find(d => d.id === member.departmentId);
                return (
                  <motion.tr 
                    key={member.id} 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {formatFacultyName(member)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{member.staffId || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{dept?.name || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{member.email || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{member.officeNumber || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => openModal('faculty', member)}
                        className="text-blue-600 hover:text-blue-800 mr-3 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete('faculty', member.id)}
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
          
          {filteredFaculty.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No faculty members found matching your search criteria.
            </div>
          )}
        </div>
      )}

      {/* Bulk Import Modal */}
      {showImportModal && (
        <BulkImportComponent
          config={facultyImportConfig}
          existingData={{ faculty, departments }}
          onImport={(importedFaculty) => {
            if (handleBulkImport) {
              handleBulkImport(importedFaculty);
            }
            setShowImportModal(false);
          }}
          onClose={() => setShowImportModal(false)}
        />
      )}
    </motion.div>
  );
}