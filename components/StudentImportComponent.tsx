import React, { useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Student, Program } from '@/types/database';

interface ImportStudentsProps {
  programs: Program[];
  onImport: (students: Partial<Student>[]) => void;
  onClose: () => void;
  courses?: any[]; // Add this line to accept courses as an optional prop
}

interface ImportedStudent {
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  programName: string;
  year: number;
  isValid: boolean;
  errors: string[];
}

export default function ImportStudents({ programs, onImport, onClose }: ImportStudentsProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importedData, setImportedData] = useState<ImportedStudent[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');

  const validateStudent = (student: any, index: number): ImportedStudent => {
    const errors: string[] = [];
    
    // Required field validation
    if (!student.studentId || String(student.studentId).trim() === '') errors.push('Student ID is required');
    if (!student.firstName || String(student.firstName).trim() === '') errors.push('First name is required');
    if (!student.lastName || String(student.lastName).trim() === '') errors.push('Last name is required');
    if (!student.email || String(student.email).trim() === '') errors.push('Email is required');
    if (!student.programName || String(student.programName).trim() === '') errors.push('Program is required');
    if (!student.year || isNaN(Number(student.year))) errors.push('Valid year is required');
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (student.email && !emailRegex.test(String(student.email).trim())) {
      errors.push('Invalid email format');
    }
    
    // Year validation
    const year = Number(student.year);
    if (year && (year < 1 || year > 6)) {
      errors.push('Year must be between 1 and 6');
    }
    
    // Program validation
    const programExists = programs.some(p => 
      p.name.toLowerCase() === String(student.programName).toLowerCase().trim()
    );
    if (student.programName && !programExists) {
      errors.push(`Program "${student.programName}" not found`);
    }
    
    return {
      studentId: String(student.studentId || '').trim(),
      firstName: String(student.firstName || '').trim(),
      lastName: String(student.lastName || '').trim(),
      email: String(student.email || '').trim(),
      phone: String(student.phone || '').trim(),
      programName: String(student.programName || '').trim(),
      year: Number(student.year) || 0,
      isValid: errors.length === 0,
      errors
    };
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    
    setFile(uploadedFile);
    setIsProcessing(true);
    setError('');
    
    try {
      const data = await uploadedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      
      if (jsonData.length === 0) {
        setError('The Excel file is empty');
        setImportedData([]);
        return;
      }
      
      // Validate and process each row
      const processedData = jsonData.map((row: any, index: number) => {
        // Map common column variations
        const mappedRow = {
          studentId: row['Student ID'] || row['StudentID'] || row['student_id'] || row['ID'] || '',
          firstName: row['First Name'] || row['FirstName'] || row['first_name'] || row['First'] || '',
          lastName: row['Last Name'] || row['LastName'] || row['last_name'] || row['Last'] || '',
          email: row['Email'] || row['email'] || row['E-mail'] || '',
          phone: row['Phone'] || row['phone'] || row['Phone Number'] || '',
          programName: row['Program'] || row['program'] || row['Program Name'] || '',
          year: row['Year'] || row['year'] || row['Year Level'] || ''
        };
        
        return validateStudent(mappedRow, index);
      });
      
      setImportedData(processedData);
    } catch (err) {
      setError('Failed to read Excel file. Please ensure it\'s a valid Excel file.');
      console.error('Excel parsing error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = () => {
    const validStudents = importedData
      .filter(student => student.isValid)
      .map(student => {
        const program = programs.find(p => 
          p.name.toLowerCase() === student.programName.toLowerCase()
        );
        
        return {
          studentId: student.studentId,
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.email,
          phone: student.phone,
          programId: program?.id || '',
          year: student.year
        };
      });
    
    onImport(validStudents);
  };

  const validCount = importedData.filter(s => s.isValid).length;
  const invalidCount = importedData.filter(s => !s.isValid).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Import Students from Excel</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* File Upload Section */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">Upload an Excel file with student data</p>
            <p className="text-sm text-gray-500 mb-4">
              Required columns: Student ID, First Name, Last Name, Email, Program, Year
            </p>
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
              <Upload className="w-4 h-4" />
              Choose File
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            {file && (
              <p className="mt-2 text-sm text-gray-600">
                Selected: {file.name}
              </p>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Import Summary */}
          {importedData.length > 0 && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-600 font-medium">Total Rows</p>
                  <p className="text-2xl font-bold text-blue-900">{importedData.length}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-600 font-medium">Valid Students</p>
                  <p className="text-2xl font-bold text-green-900">{validCount}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="text-sm text-red-600 font-medium">Invalid Entries</p>
                  <p className="text-2xl font-bold text-red-900">{invalidCount}</p>
                </div>
              </div>

              {/* Data Preview */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Student ID</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Program</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Year</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Issues</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importedData.slice(0, 10).map((student, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3">
                          {student.isValid ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-red-600" />
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">{student.studentId}</td>
                        <td className="px-4 py-3 text-sm">{student.firstName} {student.lastName}</td>
                        <td className="px-4 py-3 text-sm">{student.email}</td>
                        <td className="px-4 py-3 text-sm">{student.programName}</td>
                        <td className="px-4 py-3 text-sm">{student.year}</td>
                        <td className="px-4 py-3 text-sm text-red-600">
                          {student.errors.join(', ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {importedData.length > 10 && (
                  <div className="bg-gray-50 px-4 py-3 text-sm text-gray-600 text-center">
                    Showing 10 of {importedData.length} rows
                  </div>
                )}
              </div>

              {/* Download Template */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 mb-2">
                  Need a template? Download our Excel template with the correct column headers.
                </p>
                <button
                  onClick={() => {
                    // Create sample template
                    const templateData = [
                      {
                        'Student ID': '21001234',
                        'First Name': 'John',
                        'Last Name': 'Doe',
                        'Email': 'john.doe@student.pnguot.ac.pg',
                        'Phone': '+675 7XX XXXXX',
                        'Program': 'Computer Science',
                        'Year': 1
                      }
                    ];
                    const ws = XLSX.utils.json_to_sheet(templateData);
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, ws, 'Students');
                    XLSX.writeFile(wb, 'student_import_template.xlsx');
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                >
                  Download Template
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={validCount === 0}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              validCount > 0
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Upload className="w-4 h-4" />
            Import {validCount} Students
          </button>
        </div>
      </div>
    </div>
  );
}