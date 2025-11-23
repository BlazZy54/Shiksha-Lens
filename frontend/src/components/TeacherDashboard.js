import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { offlineService } from '../services/offlineService';
import apiClient from '../services/apiClient';
import Message from './Message';

const TeacherDashboard = () => {
  const { user, logout } = useAuth();
  const [formData, setFormData] = useState({
    section: 'A',
    date: new Date().toISOString().split('T')[0]
  });
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [classStudents, setClassStudents] = useState([]);
  const [sessionCandidates, setSessionCandidates] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [attendanceConfirmations, setAttendanceConfirmations] = useState([]);
  const [isConfirming, setIsConfirming] = useState(false);
  const [message, setMessage] = useState({ show: false, type: '', text: '' });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingUploads, setPendingUploads] = useState([]);
  const [showCamera, setShowCamera] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchClasses = async () => {
      setIsLoadingClasses(true);
      const remoteClasses = await apiClient.fetchTeacherClasses();
      setClasses(remoteClasses || []);
      if (remoteClasses && remoteClasses.length > 0) {
        setSelectedClassId(String(remoteClasses[0].id));
      }
      setIsLoadingClasses(false);
    };
    fetchClasses();
  }, []);

  useEffect(() => {
    if (!selectedClassId) {
      setClassStudents([]);
      return;
    }
    const fetchStudents = async () => {
      setIsLoadingStudents(true);
      const remoteStudents = await apiClient.fetchTeacherClassStudents(Number(selectedClassId));
      setClassStudents(remoteStudents || []);
      setIsLoadingStudents(false);
    };
    fetchStudents();
  }, [selectedClassId]);

  const getClassLabel = () => {
    const match = classes.find((cls) => String(cls.id) === String(selectedClassId));
    return match ? match.name : 'Select Class';
  };

  const dataUrlToFile = (dataUrl, filename) => {
    if (!dataUrl) return null;
    const arr = dataUrl.split(',');
    const mimeMatch = arr[0]?.match(/:(.*?);/);
    if (!mimeMatch) return null;
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    try {
      return new File([u8arr], filename, { type: mime });
    } catch {
      return new Blob([u8arr], { type: mime });
    }
  };

  useEffect(() => {
    // Check for pending uploads
    const pending = offlineService.getUnsyncedData('attendance');
    setPendingUploads(pending);

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingUploads();
    };
    const handleOffline = () => setIsOnline(false);

    offlineService.onOnline(handleOnline);
    offlineService.onOffline(handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncPendingUploads = async () => {
    const pending = offlineService.getUnsyncedData('attendance');
    let syncedCount = 0;
    for (const upload of pending) {
      try {
        const file = upload.image ? dataUrlToFile(upload.image, `offline-${upload.timestamp || Date.now()}.jpg`) : null;
        const response = await apiClient.createAttendanceSession({
          classId: upload.classId,
          file,
          imageUrl: upload.imageUrl
        });
        if (response?.sessionId) {
          offlineService.markAsSynced('attendance', upload.timestamp);
          syncedCount += 1;
        }
      } catch (error) {
        console.error('Sync failed:', error);
      }
    }
    setPendingUploads(offlineService.getUnsyncedData('attendance'));
    if (pending.length > 0) {
      setMessage({
        show: true,
        type: 'success',
        text: `Attempted sync for ${pending.length} pending upload(s). ${syncedCount} succeeded.`
      });
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment' // Use back camera on mobile
        } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setShowCamera(true);
      }
    } catch (error) {
      setMessage({
        show: true,
        type: 'error',
        text: 'Camera access denied or not available'
      });
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);
      
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(imageData);
      setUploadedImage(null);
      setUploadedFile(null);
      setSessionCandidates([]);
      setSessionId(null);
      setShowCamera(false);
      
      // Stop camera
      const stream = video.srcObject;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target.result);
        setCapturedImage(null);
        setSessionCandidates([]);
        setSessionId(null);
      };
      reader.readAsDataURL(file);
      setUploadedFile(file);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleClassChange = (e) => {
    setSelectedClassId(e.target.value);
    setSessionCandidates([]);
    setSessionId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!selectedClassId) {
      setMessage({
        show: true,
        type: 'error',
        text: 'Please select a class before submitting.'
      });
      setIsSubmitting(false);
      return;
    }

    const attendanceData = {
      ...formData,
      classId: Number(selectedClassId),
      className: getClassLabel(),
      image: capturedImage || uploadedImage,
      teacherId: user.id,
      teacherName: user.name,
      timestamp: new Date().toISOString()
    };

    try {
      if (isOnline) {
        let file = uploadedFile;
        if (!file && capturedImage) {
          file = dataUrlToFile(capturedImage, `capture-${Date.now()}.jpg`);
        }

        // Validate that we have an image
        if (!file && !uploadedImage && !capturedImage) {
          setMessage({
            show: true,
            type: 'error',
            text: 'Please capture or upload an image before submitting attendance.'
          });
          setIsSubmitting(false);
          return;
        }

        const response = await apiClient.createAttendanceSession({
          classId: Number(selectedClassId),
          file: file || null,
          imageUrl: uploadedImage || null
        });

        if (response?.sessionId) {
          setSessionId(response.sessionId);
          const candidates = response.candidates || [];
          setSessionCandidates(candidates);
          
          // Initialize confirmations: detected students are present, others are absent
          const confirmations = classStudents.map(student => {
            const detected = candidates.find(c => c.student_id === student.id);
            return {
              student_id: student.id,
              student_name: student.name,
              student_roll: student.roll,
              status: detected ? 'present' : 'absent',
              confidence: detected?.confidence || null
            };
          });
          setAttendanceConfirmations(confirmations);
          setShowConfirmationModal(true);
          
          setMessage({
            show: true,
            type: 'success',
            text: `Attendance session #${response.sessionId} created. ${candidates.length} student(s) detected. Please confirm attendance.`
          });
        } else {
          offlineService.storeOfflineData('attendance', attendanceData);
          setPendingUploads(offlineService.getUnsyncedData('attendance'));
          setMessage({
            show: true,
            type: 'warning',
            text: 'Recognition service offline. Attendance saved locally for later sync.'
          });
        }
      } else {
        offlineService.storeOfflineData('attendance', attendanceData);
        setPendingUploads(offlineService.getUnsyncedData('attendance'));
        setMessage({
          show: true,
          type: 'warning',
          text: 'Attendance saved offline. Will sync when online.'
        });
      }

      setFormData({
        section: 'A',
        date: new Date().toISOString().split('T')[0]
      });
      setCapturedImage(null);
      setUploadedImage(null);
      setUploadedFile(null);
      setShowPreview(false);
    } catch (error) {
      console.error('Attendance submit failed', error);
      offlineService.storeOfflineData('attendance', attendanceData);
      setPendingUploads(offlineService.getUnsyncedData('attendance'));
      setMessage({
        show: true,
        type: 'error',
        text: 'Failed to submit attendance. Saved locally for retry.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Teacher Dashboard</h1>
              <p className="text-sm text-gray-600">Welcome, {user.name}</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`flex items-center px-3 py-1 rounded-full text-sm ${
                isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  isOnline ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                {isOnline ? 'Online' : 'Offline'}
              </div>
              {pendingUploads.length > 0 && (
                <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
                  {pendingUploads.length} pending
                </div>
              )}
              <button
                onClick={logout}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Offline Sync Button */}
        {!isOnline && pendingUploads.length > 0 && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-yellow-800">
                  {pendingUploads.length} attendance record(s) waiting to sync
                </h3>
                <p className="text-sm text-yellow-600">
                  These will be automatically synced when you're back online
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Form */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Submit Attendance</h2>
            <p className="text-sm text-gray-600">Capture or upload classroom photo and fill attendance details</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Photo Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Classroom Photo
              </label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Camera Capture */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-700">Take Photo</h3>
                  {!capturedImage && !uploadedImage && (
                    <div>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full h-48 bg-gray-100 rounded-lg object-cover"
                        style={{ display: showCamera ? 'block' : 'none' }}
                      />
                      <canvas ref={canvasRef} style={{ display: 'none' }} />
                      <button
                        type="button"
                        onClick={startCamera}
                        className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary-500 hover:text-primary-600 transition-colors"
                      >
                        <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Start Camera
                      </button>
                      {showCamera && (
                        <button
                          type="button"
                          onClick={capturePhoto}
                          className="w-full py-2 px-4 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors mt-2"
                        >
                          Capture Photo
                        </button>
                      )}
                    </div>
                  )}
                  
                  {capturedImage && (
                    <div className="space-y-2">
                      <img src={capturedImage} alt="Captured" className="w-full h-48 object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={() => {
                          setCapturedImage(null);
                          setSessionCandidates([]);
                          setSessionId(null);
                        }}
                        className="w-full py-2 px-4 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                      >
                        Retake Photo
                      </button>
                    </div>
                  )}
                </div>

                {/* File Upload */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-700">Upload Photo</h3>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  {!capturedImage && !uploadedImage && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary-500 hover:text-primary-600 transition-colors"
                    >
                      <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Choose File
                    </button>
                  )}
                  
                  {uploadedImage && (
                    <div className="space-y-2">
                      <img src={uploadedImage} alt="Uploaded" className="w-full h-48 object-cover rounded-lg" />
                      <button
                        type="button"
                    onClick={() => {
                      setUploadedImage(null);
                      setUploadedFile(null);
                    }}
                        className="w-full py-2 px-4 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                      >
                        Remove Photo
                  </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="classId" className="block text-sm font-medium text-gray-700">
                  Class
                </label>
                <select
                  id="classId"
                  name="classId"
                  value={selectedClassId}
                  onChange={handleClassChange}
                  disabled={isLoadingClasses || classes.length === 0}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
                >
                  {classes.length === 0 && (
                    <option value="">
                      {isLoadingClasses ? 'Loading classes...' : 'No classes assigned'}
                    </option>
                  )}
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
                {selectedClassId && (
                  <p className="mt-2 text-xs text-gray-500">
                    {isLoadingStudents ? 'Loading class roster…' : `${classStudents.length} student(s) linked to this class.`}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="section" className="block text-sm font-medium text-gray-700">
                  Section
                </label>
                <select
                  id="section"
                  name="section"
                  value={formData.section}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
              </div>

              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                  Date
                </label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                disabled={!capturedImage && !uploadedImage}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Preview
              </button>
              <button
                type="submit"
                disabled={(!capturedImage && !uploadedImage) || isSubmitting}
                className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Attendance'}
              </button>
            </div>

          </form>
        </div>

        {/* Confirmation Modal */}
        {showConfirmationModal && sessionId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Confirm Attendance - Session #{sessionId}</h3>
                  <button
                    onClick={() => setShowConfirmationModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800">
                    <strong>Instructions:</strong> Detected students are marked as present (✓). Review and adjust attendance using the radio buttons. Click "Save Attendance" when done.
                  </p>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {attendanceConfirmations.map((confirmation, index) => (
                    <div key={confirmation.student_id || index} className="flex items-center justify-between p-3 border border-gray-200 rounded-md hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{confirmation.student_name}</div>
                        <div className="text-sm text-gray-500">Roll: {confirmation.student_roll}</div>
                        {confirmation.confidence && (
                          <div className="text-xs text-blue-600">Confidence: {Math.round(confirmation.confidence * 100)}%</div>
                        )}
                      </div>
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name={`attendance-${confirmation.student_id}`}
                            value="present"
                            checked={confirmation.status === 'present' || confirmation.status === 'manual_present'}
                            onChange={() => {
                              const updated = [...attendanceConfirmations];
                              updated[index].status = 'present';
                              setAttendanceConfirmations(updated);
                            }}
                            className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Present ✓</span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name={`attendance-${confirmation.student_id}`}
                            value="absent"
                            checked={confirmation.status === 'absent'}
                            onChange={() => {
                              const updated = [...attendanceConfirmations];
                              updated[index].status = 'absent';
                              setAttendanceConfirmations(updated);
                            }}
                            className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Absent ✗</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowConfirmationModal(false);
                      setSessionId(null);
                      setSessionCandidates([]);
                      setAttendanceConfirmations([]);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      setIsConfirming(true);
                      try {
                        const confirmations = attendanceConfirmations.map(c => ({
                          student_id: c.student_id,
                          status: c.status === 'present' ? 'present' : 'absent',
                          confidence: c.confidence || null
                        }));
                        
                        await apiClient.confirmAttendanceSession(sessionId, confirmations);
                        setMessage({
                          show: true,
                          type: 'success',
                          text: 'Attendance confirmed and saved successfully!'
                        });
                        setShowConfirmationModal(false);
                        setSessionId(null);
                        setSessionCandidates([]);
                        setAttendanceConfirmations([]);
                        setCapturedImage(null);
                        setUploadedImage(null);
                        setUploadedFile(null);
                      } catch (err) {
                        console.error('Confirm attendance failed', err);
                        setMessage({
                          show: true,
                          type: 'error',
                          text: 'Failed to save attendance. Please try again.'
                        });
                      } finally {
                        setIsConfirming(false);
                      }
                    }}
                    disabled={isConfirming || attendanceConfirmations.length === 0}
                    className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isConfirming ? 'Saving...' : 'Save Attendance'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {showPreview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Preview Attendance Record</h3>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <img 
                      src={capturedImage || uploadedImage} 
                      alt="Classroom" 
                      className="w-full h-64 object-cover rounded-lg"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Class:</span>
                      <span className="ml-2 text-gray-900">{getClassLabel()}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Section:</span>
                      <span className="ml-2 text-gray-900">{formData.section}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Date:</span>
                      <span className="ml-2 text-gray-900">{formData.date}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Teacher:</span>
                      <span className="ml-2 text-gray-900">{user.name}</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => setShowPreview(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowPreview(false);
                      // Trigger form submission
                      const form = document.querySelector('form');
                      if (form) form.requestSubmit();
                    }}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                  >
                    Confirm & Submit
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
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

export default TeacherDashboard;
