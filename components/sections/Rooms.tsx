import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Grid, List, Building2, Users, CheckCircle, Upload } from 'lucide-react';
import { Room, ModalType } from '@/types/database';
import BulkImportComponent from '@/components/common/BulkImportComponent';
import { roomImportConfig } from '@/utils/importConfigs';

interface RoomsProps {
  rooms: Room[];
  openModal: (type: ModalType, item?: any) => void;
  handleDelete: (type: string, id: string) => void;
  handleBulkImport?: (rooms: Partial<Room>[]) => void;
}

export default function Rooms({
  rooms,
  openModal,
  handleDelete,
  handleBulkImport
}: RoomsProps) {
  // Local state for search, view, and filters
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedView, setSelectedView] = React.useState<'grid' | 'list'>('grid');
  const [selectedBuilding, setSelectedBuilding] = React.useState('all');
  const [selectedType, setSelectedType] = React.useState('all');
  const [selectedAvailability, setSelectedAvailability] = React.useState('all');
  const [showImportModal, setShowImportModal] = React.useState(false);

  // Get unique buildings and types
  const buildings = Array.from(new Set(rooms.map(room => room.building).filter(Boolean)));
  const roomTypes = Array.from(new Set(rooms.map(room => room.type).filter(Boolean)));

  // Helper function to format room type
  const formatRoomType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ');
  };

  // Filter rooms based on search and filters
  const filteredRooms = rooms.filter(room => {
    const matchesSearch = !searchTerm || 
      (room.code && room.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (room.name && room.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (room.building && room.building.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesBuilding = selectedBuilding === 'all' || room.building === selectedBuilding;
    const matchesType = selectedType === 'all' || room.type === selectedType;
    const matchesAvailability = selectedAvailability === 'all' || 
      (selectedAvailability === 'available' ? room.available : !room.available);
    return matchesSearch && matchesBuilding && matchesType && matchesAvailability;
  });

  // Calculate summary statistics
  const availableRooms = rooms.filter(r => r.available).length;
  const totalCapacity = rooms.reduce((sum, room) => sum + (room.capacity || 0), 0);
  const avgCapacity = rooms.length > 0 ? Math.round(totalCapacity / rooms.length) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-800">Room Management</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Bulk Import
          </button>
          <button
            onClick={() => openModal('room')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Room
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Rooms</p>
              <p className="text-2xl font-bold text-gray-800">{rooms.length}</p>
            </div>
            <Building2 className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Available</p>
              <p className="text-2xl font-bold text-gray-800">{availableRooms}</p>
              <p className="text-sm text-gray-500">{rooms.length > 0 ? Math.round((availableRooms / rooms.length) * 100) : 0}%</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg. Capacity</p>
              <p className="text-2xl font-bold text-gray-800">{avgCapacity}</p>
              <p className="text-sm text-gray-500">students</p>
            </div>
            <Users className="w-8 h-8 text-purple-500" />
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
              placeholder="Search rooms by code, name, or building..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={selectedBuilding}
            onChange={(e) => setSelectedBuilding(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Buildings</option>
            {buildings.map(building => (
              <option key={building} value={building}>{building}</option>
            ))}
          </select>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            {roomTypes.map(type => (
              <option key={type} value={type}>{formatRoomType(type)}</option>
            ))}
          </select>
          <select
            value={selectedAvailability}
            onChange={(e) => setSelectedAvailability(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Rooms</option>
            <option value="available">Available</option>
            <option value="occupied">Occupied</option>
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

      {/* Rooms Display */}
      {selectedView === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRooms.map((room, index) => (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.02 }}
              className="bg-white p-6 rounded-xl shadow-lg border border-gray-100"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{room.code}</h3>
                  <p className="text-sm text-gray-600">{room.name}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${room.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {room.available ? 'Available' : 'Occupied'}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Building:</span>
                  <span className="text-gray-700">{room.building || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Floor:</span>
                  <span className="text-gray-700">{room.floor || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Capacity:</span>
                  <span className="text-gray-700">{room.capacity || 0} students</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Type:</span>
                  <span className="text-gray-700">{formatRoomType(room.type || '')}</span>
                </div>
                {room.equipment && room.equipment.length > 0 && (
                  <div className="text-sm">
                    <span className="text-gray-500">Equipment:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {room.equipment.map((item, index) => (
                        <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-4 pt-4 border-t flex gap-2">
                <button
                  onClick={() => openModal('room', room)}
                  className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete('room', room.id)}
                  className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Code</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Building</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Floor</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Capacity</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRooms.map((room, index) => (
                <motion.tr 
                  key={room.id} 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                >
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{room.code}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{room.name || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{room.building || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{room.floor || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{room.capacity || 0}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{formatRoomType(room.type || '')}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${room.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {room.available ? 'Available' : 'Occupied'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <button
                      onClick={() => openModal('room', room)}
                      className="text-blue-600 hover:text-blue-800 mr-3 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete('room', room.id)}
                      className="text-red-600 hover:text-red-800 font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          
          {filteredRooms.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No rooms found matching your search criteria.
            </div>
          )}
        </div>
      )}

      {/* Bulk Import Modal */}
      {showImportModal && (
        <BulkImportComponent
          config={roomImportConfig}
          existingData={rooms}
          onImport={(importedRooms) => {
            if (handleBulkImport) {
              handleBulkImport(importedRooms);
            }
            setShowImportModal(false);
          }}
          onClose={() => setShowImportModal(false)}
        />
      )}
    </motion.div>
  );
}