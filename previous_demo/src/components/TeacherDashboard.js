import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { offlineService } from '../services/offlineService';
import Message from './Message';

const TeacherDashboard = () => {
  const { user, logout } = useAuth();
  const [formData, setFormData] = useState({
    class: 'Class 5',
    section: 'A',
    date: new Date().toISOString().split('T')[0]
  });
  const [capturedImage, setCapturedImage] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [message, setMessage] = useState({ show: false, type: '', text: '' });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingUploads, setPendingUploads] = useState([]);
  const [showCamera, setShowCamera] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

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
    for (const upload of pending) {
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        offlineService.markAsSynced('attendance', upload.timestamp);
        setMessage({
          show: true,
          type: 'success',
          text: `Synced ${pending.length} pending upload(s)`
        });
      } catch (error) {
        console.error('Sync failed:', error);
      }
    }
    setPendingUploads([]);
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
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const attendanceData = {
      ...formData,
      image: capturedImage || uploadedImage,
      teacherId: user.id,
      teacherName: user.name,
      timestamp: new Date().toISOString()
    };

    try {
      if (isOnline) {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000));
        setMessage({
          show: true,
          type: 'success',
          text: 'Attendance submitted successfully!'
        });
      } else {
        // Store offline
        offlineService.storeOfflineData('attendance', attendanceData);
        setMessage({
          show: true,
          type: 'warning',
          text: 'Attendance saved offline. Will sync when online.'
        });
      }

      // Reset form
      setFormData({
        class: 'Class 5',
        section: 'A',
        date: new Date().toISOString().split('T')[0]
      });
      setCapturedImage(null);
      setUploadedImage(null);
      setShowPreview(false);

    } catch (error) {
      setMessage({
        show: true,
        type: 'error',
        text: 'Failed to submit attendance. Please try again.'
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
                        onClick={() => setCapturedImage(null)}
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
                        onClick={() => setUploadedImage(null)}
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
                <label htmlFor="class" className="block text-sm font-medium text-gray-700">
                  Class
                </label>
                <select
                  id="class"
                  name="class"
                  value={formData.class}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="Class 1">Class 1</option>
                  <option value="Class 2">Class 2</option>
                  <option value="Class 3">Class 3</option>
                  <option value="Class 4">Class 4</option>
                  <option value="Class 5">Class 5</option>
                  <option value="Class 6">Class 6</option>
                  <option value="Class 7">Class 7</option>
                  <option value="Class 8">Class 8</option>
                </select>
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
                      <span className="ml-2 text-gray-900">{formData.class}</span>
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
