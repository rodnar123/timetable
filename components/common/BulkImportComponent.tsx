import React, { useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, X, Download, Info } from 'lucide-react';
import * as XLSX from 'xlsx';

export interface ImportField {
  key: string;
  label: string;
  required: boolean;
  type: 'string' | 'number' | 'email' | 'phone' | 'boolean';
  validation?: (value: any) => string | null;
  options?: string[]; // For dropdown validation
}

export interface ImportConfig<T> {
  entityName: string;
  entityNamePlural: string;
  fields: ImportField[];
  columnMappings: Record<string, string[]>; // Maps field keys to possible Excel column names
  validateRow: (row: any, index: number, existingData?: any) => { isValid: boolean; errors: string[] };
  transformRow: (row: any, existingData?: any) => Partial<T>;
  sampleData: Record<string, any>[];
}

interface ImportedRow<T> {
  data: Partial<T>;
  isValid: boolean;
  errors: string[];
  originalRow: any;
}

interface BulkImportComponentProps<T> {
  config: ImportConfig<T>;
  existingData?: any;
  onImport: (items: Partial<T>[]) => void;
  onClose: () => void;
}

export default function BulkImportComponent<T>({
  config,
  existingData,
  onImport,
  onClose
}: BulkImportComponentProps<T>) {
  const [file, setFile] = useState<File | null>(null);
  const [importedData, setImportedData] = useState<ImportedRow<T>[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');
  const [showTemplate, setShowTemplate] = useState(false);

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
      
      // Process each row
      const processedData = jsonData.map((row: any, index: number) => {
        // Map columns using the configuration
        const mappedRow: any = {};
        
        config.fields.forEach(field => {
          const possibleColumns = config.columnMappings[field.key] || [field.key];
          const columnValue = possibleColumns.find(col => 
            Object.keys(row).some(rowKey => 
              rowKey.toLowerCase().trim() === col.toLowerCase().trim()
            )
          );
          
          if (columnValue) {
            const actualKey = Object.keys(row).find(rowKey => 
              rowKey.toLowerCase().trim() === columnValue.toLowerCase().trim()
            );
            if (actualKey) {
              mappedRow[field.key] = row[actualKey];
            }
          }
        });
        
        // Validate the mapped row
        const validation = config.validateRow(mappedRow, index, existingData);
        const transformedData = config.transformRow(mappedRow, existingData);
        
        return {
          data: transformedData,
          isValid: validation.isValid,
          errors: validation.errors,
          originalRow: mappedRow
        };
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
    const validItems = importedData
      .filter(item => item.isValid)
      .map(item => item.data);
    
    onImport(validItems);
  };

  const generateTemplate = () => {
    const ws = XLSX.utils.json_to_sheet(config.sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, config.entityNamePlural);
    XLSX.writeFile(wb, `${config.entityName}_Template.xlsx`);
  };

  const validCount = importedData.filter(item => item.isValid).length;
  const invalidCount = importedData.filter(item => !item.isValid).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">
            Import {config.entityNamePlural} from Excel
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 max-h-[calc(90vh-140px)] overflow-y-auto">
          {/* Template Download Section */}
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <Info className="w-5 h-5 text-blue-600 mr-2" />
                  <h3 className="font-semibold text-blue-800">Excel Template</h3>
                </div>
                <p className="text-blue-700 text-sm mb-3">
                  Download the Excel template with the correct column headers and sample data to ensure proper import format.
                </p>
                
                {showTemplate && (
                  <div className="bg-white p-3 rounded border mt-3">
                    <h4 className="font-medium text-gray-800 mb-2">Required Columns:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                      {config.fields.map(field => (
                        <div key={field.key} className="flex items-center">
                          <span className={`w-2 h-2 rounded-full mr-2 ${field.required ? 'bg-red-500' : 'bg-gray-400'}`} />
                          <span className={field.required ? 'font-medium' : ''}>
                            {field.label}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-gray-600 text-xs mt-2">
                      🔴 Required fields • ⚪ Optional fields
                    </p>
                  </div>
                )}
              </div>
              
              <div className="ml-4 flex flex-col gap-2">
                <button
                  onClick={generateTemplate}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </button>
                <button
                  onClick={() => setShowTemplate(!showTemplate)}
                  className="text-blue-600 hover:text-blue-700 text-sm underline"
                >
                  {showTemplate ? 'Hide' : 'Show'} Details
                </button>
              </div>
            </div>
          </div>

          {/* File Upload Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Excel File
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-500 transition-colors">
              <div className="text-center">
                <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-gray-900">
                      {file ? file.name : `Choose ${config.entityName} Excel file`}
                    </span>
                    <span className="mt-1 block text-xs text-gray-500">
                      Supports .xlsx and .xls files
                    </span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      accept=".xlsx,.xls"
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5" />
                <div>
                  <h3 className="text-red-800 font-medium">Import Error</h3>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Processing State */}
          {isProcessing && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                <span className="text-blue-800">Processing Excel file...</span>
              </div>
            </div>
          )}

          {/* Results Summary */}
          {importedData.length > 0 && (
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                  <div>
                    <p className="text-green-800 font-medium">Valid Records</p>
                    <p className="text-green-700 text-2xl font-bold">{validCount}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
                  <div>
                    <p className="text-red-800 font-medium">Invalid Records</p>
                    <p className="text-red-700 text-2xl font-bold">{invalidCount}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Data Preview */}
          {importedData.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-800 mb-4">
                Preview ({importedData.length} records)
              </h3>
              <div className="overflow-x-auto max-h-96">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      {config.fields.slice(0, 4).map(field => (
                        <th key={field.key} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          {field.label}
                        </th>
                      ))}
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Errors</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {importedData.slice(0, 10).map((item, index) => (
                      <tr key={index} className={item.isValid ? 'bg-white' : 'bg-red-50'}>
                        <td className="px-3 py-2">
                          {item.isValid ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-600" />
                          )}
                        </td>
                        {config.fields.slice(0, 4).map(field => (
                          <td key={field.key} className="px-3 py-2 text-sm text-gray-900">
                            {String((item.data as any)[field.key] || '')}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-sm">
                          {item.errors.length > 0 && (
                            <div className="text-red-600">
                              {item.errors.slice(0, 2).map((error, i) => (
                                <div key={i} className="text-xs">{error}</div>
                              ))}
                              {item.errors.length > 2 && (
                                <div className="text-xs">+{item.errors.length - 2} more</div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {importedData.length > 10 && (
                  <p className="text-center text-gray-500 text-sm mt-2">
                    ... and {importedData.length - 10} more records
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {importedData.length > 0 && (
              <span>
                Ready to import {validCount} valid {config.entityNamePlural.toLowerCase()}
              </span>
            )}
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={validCount === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import {validCount} {config.entityNamePlural}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
