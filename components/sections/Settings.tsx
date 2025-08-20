import React from 'react';
import { motion } from 'framer-motion';
import { Download, Upload } from 'lucide-react';

interface SettingsProps {
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  selectedSemester: number;
  setSelectedSemester: (semester: number) => void;
  handleExport: () => void;
  handleImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRunDiagnostics: () => Promise<void> | Promise<{ success: boolean; message: string; details: any; } | null | undefined>;
  onClearDatabase: () => Promise<void> | Promise<{ success: boolean; message: string; details: any; } | null | undefined>;
}

export default function Settings({
  selectedYear,
  setSelectedYear,
  selectedSemester,
  setSelectedSemester,
  handleExport,
  handleImport,
  onRunDiagnostics,
  onClearDatabase
}: SettingsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <h2 className="text-3xl font-bold text-gray-800">Settings</h2>

      <div className="bg-white rounded-xl shadow-lg divide-y">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">General Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Academic Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2026">2026</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Current Semester</label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>Semester 1</option>
                <option value={2}>Semester 2</option>
              </select>
            </div>
          </div>
        </div>

        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Data Management</h3>
          <div className="space-y-4">
            <button
              onClick={handleExport}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export All Data
            </button>
            <label className="w-full">
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
              <div className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                <Upload className="w-4 h-4" />
                Import Data
              </div>
            </label>
            <button
              onClick={onRunDiagnostics}
              className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center justify-center gap-2"
            >
              Run Diagnostics
            </button>
            <button
              onClick={onClearDatabase}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
            >
              Clear Database
            </button>
          </div>
        </div>

        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">System Information</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Version:</span>
              <span className="text-gray-700">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Database:</span>
              <span className="text-gray-700">IndexedDB (Local)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Last Backup:</span>
              <span className="text-gray-700">{new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
