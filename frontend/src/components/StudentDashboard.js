import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { mockStudentAttendance } from '../data/mockData';
import Message from './Message';
import apiClient from '../services/apiClient';

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const [attendanceData] = useState(mockStudentAttendance);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [message, setMessage] = useState({ show: false, type: '', text: '' });
  const [isDownloading, setIsDownloading] = useState(false);

  const showMessage = (type, text) => {
    setMessage({ show: true, type, text });
    setTimeout(() => setMessage({ show: false, type: '', text: '' }), 5000);
  };

  const getFilteredData = () => {
    const now = new Date();
    const filteredData = attendanceData.filter(record => {
      const recordDate = new Date(record.date);
      switch (selectedPeriod) {
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return recordDate >= weekAgo;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return recordDate >= monthAgo;
        case 'semester':
          const semesterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          return recordDate >= semesterAgo;
        default:
          return true;
      }
    });
    return filteredData.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const getAttendanceStats = () => {
    const data = getFilteredData();
    const totalDays = data.length;
    const presentDays = data.filter(record => record.status === 'Present').length;
    const absentDays = totalDays - presentDays;
    const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    return {
      totalDays,
      presentDays,
      absentDays,
      attendancePercentage
    };
  };

  const downloadReport = async () => {
    setIsDownloading(true);
    const data = getFilteredData();
    const stats = getAttendanceStats();

    const createCsvFallback = (type = 'success', text = 'Attendance report downloaded successfully') => {
      const csvContent = [
        ['Date', 'Class', 'Section', 'Status'],
        ...data.map(record => [
          record.date,
          record.class,
          record.section,
          record.status
        ]),
        ['', '', '', ''],
        ['Summary', '', '', ''],
        ['Total Days', stats.totalDays, '', ''],
        ['Present Days', stats.presentDays, '', ''],
        ['Absent Days', stats.absentDays, '', ''],
        ['Attendance %', `${stats.attendancePercentage}%`, '', '']
      ].map(row => row.join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-attendance-report-${selectedPeriod}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showMessage(type, text);
    };

    try {
      const response = await apiClient.downloadStudentReport();
      if (!response) {
        createCsvFallback('warning', 'Backend report unavailable. Downloaded CSV fallback.');
        return;
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `student-attendance-${selectedPeriod}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showMessage('success', 'Downloaded Excel report from backend');
    } catch (error) {
      console.error('Student report download failed', error);
      createCsvFallback('error', 'Failed to download backend report. Generated CSV fallback.');
    } finally {
      setIsDownloading(false);
    }
  };

  const getStatusColor = (status) => {
    return status === 'Present' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800';
  };

  const getAttendanceColor = (percentage) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredData = getFilteredData();
  const stats = getAttendanceStats();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Student Dashboard</h1>
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
        {/* Filters and Actions */}
        <div className="mb-8 bg-white shadow rounded-lg p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <div>
                <label htmlFor="period" className="block text-sm font-medium text-gray-700">
                  View Period
                </label>
                <select
                  id="period"
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="mt-1 block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="week">Last Week</option>
                  <option value="month">Last Month</option>
                  <option value="semester">Last 3 Months</option>
                  <option value="all">All Time</option>
                </select>
              </div>
            </div>
            
            <button
              onClick={downloadReport}
              disabled={isDownloading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {isDownloading ? 'Preparing…' : 'Download Report'}
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Days</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.totalDays}</dd>
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
                    <dt className="text-sm font-medium text-gray-500 truncate">Present Days</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.presentDays}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Absent Days</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.absentDays}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Attendance %</dt>
                    <dd className={`text-lg font-medium ${getAttendanceColor(stats.attendancePercentage)}`}>
                      {stats.attendancePercentage}%
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance History Table */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              My Attendance History
            </h2>
            <p className="text-sm text-gray-600">
              Detailed attendance record for the selected period
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Class
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Section
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Day of Week
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.length > 0 ? (
                  filteredData.map((record, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(record.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {record.class}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {record.section}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(record.status)}`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(record.date).toLocaleDateString('en-US', { weekday: 'long' })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                      No attendance records found for the selected period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Attendance Insights */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Attendance Insights</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${
                    stats.attendancePercentage >= 90 ? 'bg-green-500' : 
                    stats.attendancePercentage >= 75 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                  <span className="text-sm font-medium text-gray-700">Overall Performance</span>
                </div>
                <span className={`text-sm font-medium ${
                  stats.attendancePercentage >= 90 ? 'text-green-600' : 
                  stats.attendancePercentage >= 75 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {stats.attendancePercentage >= 90 ? 'Excellent' : 
                   stats.attendancePercentage >= 75 ? 'Good' : 'Needs Improvement'}
                </span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Present Rate</span>
                  <span className="font-medium text-green-600">
                    {stats.totalDays > 0 ? Math.round((stats.presentDays / stats.totalDays) * 100) : 0}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Absent Rate</span>
                  <span className="font-medium text-red-600">
                    {stats.totalDays > 0 ? Math.round((stats.absentDays / stats.totalDays) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {filteredData.slice(0, 5).map((record, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-3 ${
                      record.status === 'Present' ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <span className="text-sm text-gray-700">
                      {new Date(record.date).toLocaleDateString()}
                    </span>
                  </div>
                  <span className={`text-xs font-medium ${
                    record.status === 'Present' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {record.status}
                  </span>
                </div>
              ))}
              {filteredData.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No recent activity
                </p>
              )}
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

export default StudentDashboard;
