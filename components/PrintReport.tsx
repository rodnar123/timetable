'use client';

import React, { useRef, useState } from 'react';
import { X, Printer, Download, FileText, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface PrintReportProps {
  data: {
    title: string;
    subtitle?: string;
    data: any[];
    filters?: Record<string, string>;
    appIcon?: string; // Add app icon URL/path
  };
  onClose: () => void;
}

const PrintReport: React.FC<PrintReportProps> = ({ data, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  // Set default app icon if not provided
  const appIcon = data.appIcon || '/images/logo.jpeg';

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;

    setIsGeneratingPDF(true);
    
    try {
      // Clone the element and fix color issues before html2canvas
      const clonedElement = printRef.current.cloneNode(true) as HTMLElement;
      
      // Fix all color issues in the cloned element
      clonedElement.querySelectorAll('*').forEach((element) => {
        const el = element as HTMLElement;
        const computedStyle = window.getComputedStyle(el);
        
        // Check and replace problematic colors
        ['backgroundColor', 'color', 'borderColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor'].forEach(prop => {
          const value = computedStyle[prop as any];
          if (value && (value.includes('lab') || value.includes('lch') || value.includes('oklch'))) {
            if (prop.includes('background')) {
              el.style[prop as any] = '#ffffff';
            } else {
              el.style[prop as any] = '#000000';
            }
          }
        });
        
        // Remove any color-scheme that might cause issues
        el.style.removeProperty('color-scheme');
      });
      
      // Add the cloned element to body temporarily
      clonedElement.style.position = 'absolute';
      clonedElement.style.left = '-9999px';
      document.body.appendChild(clonedElement);
      
      const canvas = await html2canvas(clonedElement, {
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        windowWidth: clonedElement.scrollWidth,
        windowHeight: clonedElement.scrollHeight,
      });
      
      // Remove the cloned element
      document.body.removeChild(clonedElement);
      
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Save the PDF
      const fileName = `${data.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Detailed PDF generation error:', error);
      
      // Fallback: Try alternative approach
      try {
        const pdf = new jsPDF('p', 'pt', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        // Add text content as fallback
        pdf.setFontSize(20);
        pdf.text(data.title, pageWidth / 2, 40, { align: 'center' });
        
        if (data.subtitle) {
          pdf.setFontSize(14);
          pdf.text(data.subtitle, pageWidth / 2, 60, { align: 'center' });
        }
        
        pdf.setFontSize(10);
        pdf.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, 80, { align: 'center' });
        
        // Add table data
        let yPosition = 120;
        if (data.data.length > 0) {
          const headers = Object.keys(data.data[0]);
          
          // Headers
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          headers.forEach((header, index) => {
            pdf.text(header.replace(/_/g, ' '), 40 + (index * 100), yPosition);
          });
          
          // Data rows
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10);
          data.data.forEach((row) => {
            yPosition += 20;
            if (yPosition > pageHeight - 40) {
              pdf.addPage();
              yPosition = 40;
            }
            
            Object.values(row).forEach((value: any, index) => {
              pdf.text(String(value || ''), 40 + (index * 100), yPosition);
            });
          });
        }
        
        const fileName = `${data.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`;
        pdf.save(fileName);
      } catch (fallbackError) {
        console.error('Fallback PDF generation also failed:', fallbackError);
        alert('Failed to generate PDF. Please try printing the page instead (Ctrl+P or Cmd+P).');
      }
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!data.data.length) return;

    try {
      const headers = Object.keys(data.data[0]);
      
      // Helper function to escape CSV values
      const escapeCSV = (value: any) => {
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      };

      // Create CSV content with BOM for Excel compatibility
      const BOM = '\uFEFF';
      const csvHeaders = headers.map(h => escapeCSV(h.replace(/_/g, ' ').toUpperCase())).join(',');
      const csvRows = data.data.map(row => 
        headers.map(header => escapeCSV(row[header])).join(',')
      );
      
      // Add metadata at the top
      const metadata = [
        `${escapeCSV(data.title)}`,
        data.subtitle ? `${escapeCSV(data.subtitle)}` : '',
        `Generated on: ${new Date().toLocaleString()}`,
        '', // Empty line
      ].filter(line => line !== '').join('\n');

      // Combine all parts
      const csvContent = BOM + metadata + '\n' + csvHeaders + '\n' + csvRows.join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileName = `${data.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating CSV:', error);
      alert('Failed to generate CSV. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold">Print/Download Report</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 border-b bg-gray-50">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Printer className="w-5 h-5" />
            Print
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed"
          >
            {isGeneratingPDF ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <FileText className="w-5 h-5" />
            )}
            {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
          </button>
          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Download className="w-5 h-5" />
            Download CSV
          </button>
        </div>

        {/* Print Preview */}
        <div className="overflow-auto max-h-[60vh] p-6">
          <div ref={printRef} className="bg-white p-8 print-content">
            {/* Report Header */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <img 
                  src={appIcon} 
                  alt="App Logo" 
                  className="h-8 w-8 object-contain"
                />
                <h1 className="text-2xl font-bold">{data.title}</h1>
              </div>
              {data.subtitle && (
                <p className="text-gray-600">{data.subtitle}</p>
              )}
              <div className="mt-4 text-sm text-gray-500">
                Generated on: {new Date().toLocaleString()}
              </div>
            </div>

            {/* Filters */}
            {data.filters && (
              <div className="mb-6 p-4 rounded" style={{ backgroundColor: '#f9fafb' }}>
                <h3 className="font-semibold mb-2">Applied Filters:</h3>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  {Object.entries(data.filters).map(([key, value]) => (
                    <div key={key}>
                      <span className="font-medium capitalize">{key}:</span> {value}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Data Table */}
            {data.data.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead style={{ backgroundColor: '#f9fafb' }}>
                  <tr>
                    {Object.keys(data.data[0]).map((header) => (
                      <th
                        key={header}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {header.replace(/_/g, ' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.data.map((row, index) => (
                    <tr key={index}>
                      {Object.values(row).map((value: any, idx) => (
                        <td key={idx} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-center text-gray-500 py-8">No data to display</p>
            )}

            {/* Footer */}
            <div className="mt-8 pt-4 border-t text-center text-sm text-gray-500">
              <p>University Timetable Management System</p>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-content, .print-content * {
            visibility: visible;
          }
          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          /* Ensure gray backgrounds are preserved in print */
          .bg-gray-50 {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background-color: #f9fafb !important;
          }
        }
      `}</style>
    </div>
  );
};

export default PrintReport;
