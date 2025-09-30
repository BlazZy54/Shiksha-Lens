import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { mockMonthlyReports } from '../data/mockData';
import Message from './Message';

const OfficerDashboard = () => {
  const { user, logout } = useAuth();
  const [reports] = useState(mockMonthlyReports);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [message, setMessage] = useState({ show: false, type: '', text: '' });

  const showMessage = (type, text) => {
    setMessage({ show: true, type, text });
    setTimeout(() => setMessage({ show: false, type: '', text: '' }), 5000);
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Class', 'Section', 'Total Days', 'Avg Attendance %', 'Suspicious Entries', 'Status'],
      ...reports.map(report => [
        report.class,
        report.section,
        report.totalDays,
        report.avgAttendance,
        report.suspiciousEntries,
        report.status
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-report-${selectedMonth}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showMessage('success', 'Report exported as CSV successfully');
  };

  const exportToPDF = () => {
    // Create a simple PDF-like view
    const printWindow = window.open('', '_blank');
    const reportHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Monthly Attendance Report - ${selectedMonth}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { color: #333; margin-bottom: 10px; }
            .header p { color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .status-valid { color: #059669; font-weight: bold; }
            .status-review { color: #d97706; font-weight: bold; }
            .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Monthly Attendance Report</h1>
            <p>Period: ${selectedMonth}</p>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Class</th>
                <th>Section</th>
                <th>Total Days</th>
                <th>Avg Attendance %</th>
                <th>Suspicious Entries</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${reports.map(report => `
                <tr>
                  <td>${report.class}</td>
                  <td>${report.section}</td>
                  <td>${report.totalDays}</td>
                  <td>${report.avgAttendance}%</td>
                  <td>${report.suspiciousEntries}</td>
                  <td class="${report.status === 'Valid' ? 'status-valid' : 'status-review'}">${report.status}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            <p>Rural School Attendance System - Officer Report</p>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(reportHTML);
    printWindow.document.close();
    printWindow.print();
    
    showMessage('success', 'Report opened for printing');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Valid':
        return 'bg-green-100 text-green-800';
      case 'Needs Review':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getAttendanceColor = (attendance) => {
    if (attendance >= 90) return 'text-green-600';
    if (attendance >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Officer Dashboard</h1>
              <p className="text-sm text-gray-600">Welcome, {user.name}</p>
            </div>
            <button
              onClick={logout}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters and Export */}
        <div className="mb-8 bg-white shadow rounded-lg p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <div>
                <label htmlFor="month" className="block text-sm font-medium text-gray-700">
                  Select Month
                </label>
                <input
                  type="month"
                  id="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="mt-1 block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={exportToCSV}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export CSV
              </button>
              <button
                onClick={exportToPDF}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export PDF
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Classes</dt>
                    <dd className="text-lg font-medium text-gray-900">{reports.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Valid Reports</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {reports.filter(r => r.status === 'Valid').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Needs Review</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {reports.filter(r => r.status === 'Needs Review').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Avg Attendance</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {(reports.reduce((sum, r) => sum + r.avgAttendance, 0) / reports.length).toFixed(1)}%
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reports Table */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Monthly Attendance Reports - {selectedMonth}
            </h2>
            <p className="text-sm text-gray-600">
              Detailed attendance analysis for all classes and sections
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Class
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Section
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Days
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Attendance %
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Suspicious Entries
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reports.map((report, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {report.class}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {report.section}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {report.totalDays}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-medium ${getAttendanceColor(report.avgAttendance)}`}>
                        {report.avgAttendance}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        report.suspiciousEntries > 3 
                          ? 'bg-red-100 text-red-800' 
                          : report.suspiciousEntries > 0 
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                      }`}>
                        {report.suspiciousEntries}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(report.status)}`}>
                        {report.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-primary-600 hover:text-primary-900 mr-3">
                        View Details
                      </button>
                      {report.status === 'Needs Review' && (
                        <button className="text-yellow-600 hover:text-yellow-900">
                          Flag for Review
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Additional Insights */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Attendance Trends</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">High Attendance (≥90%)</span>
                <span className="text-sm font-medium text-green-600">
                  {reports.filter(r => r.avgAttendance >= 90).length} classes
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Medium Attendance (75-89%)</span>
                <span className="text-sm font-medium text-yellow-600">
                  {reports.filter(r => r.avgAttendance >= 75 && r.avgAttendance < 90).length} classes
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Low Attendance (&lt;75%)</span>
                <span className="text-sm font-medium text-red-600">
                  {reports.filter(r => r.avgAttendance < 75).length} classes
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quality Indicators</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Classes with No Suspicious Entries</span>
                <span className="text-sm font-medium text-green-600">
                  {reports.filter(r => r.suspiciousEntries === 0).length} classes
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Classes Needing Review</span>
                <span className="text-sm font-medium text-yellow-600">
                  {reports.filter(r => r.status === 'Needs Review').length} classes
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Data Quality Score</span>
                <span className="text-sm font-medium text-blue-600">
                  {Math.round((reports.filter(r => r.status === 'Valid').length / reports.length) * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Message */}
      {message.show && (
        <Message
          type={message.type}
          message={message.text}
          onClose={() => setMessage({ show: false, type: '', text: '' })}
        />
      )}
    </div>
  );
};

export default OfficerDashboard;
