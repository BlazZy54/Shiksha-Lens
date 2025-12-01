import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Message from './Message';
import apiClient from '../services/apiClient';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('students');
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState({ students: true, teachers: true, classes: true, attendance: true, users: true });
  const [userFilters, setUserFilters] = useState({ role: 'all', search: '', authorized: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddClassForm, setShowAddClassForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [classFormData, setClassFormData] = useState({ name: '', section: 'A', teacher_id: '' });
  const [filters, setFilters] = useState({ classId: '', status: '', selectedDate: '', selectedClassSection: '' });
  const [selectedClassFilter, setSelectedClassFilter] = useState('');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState('');
  const [studentImages, setStudentImages] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [message, setMessage] = useState({ show: false, type: '', text: '' });

  const showMessage = useCallback((type, text) => {
    setMessage({ show: true, type, text });
    setTimeout(() => setMessage({ show: false, type: '', text: '' }), 5000);
  }, []);

  const classOptions = useMemo(() => classes.map(cls => ({
    value: String(cls.id),
    label: `${cls.name}${cls.section ? ` (${cls.section})` : ''}`,
    name: cls.name,
    section: cls.section || 'A'
  })), [classes]);

  // Generate class numbers 1-10 and sections A, B, C
  const classNumbers = Array.from({ length: 10 }, (_, i) => i + 1);
  const sections = ['A', 'B', 'C'];

  // Filter students by selected class and section
  useEffect(() => {
    if (selectedClassFilter && selectedSectionFilter) {
      const filtered = students.filter(student => {
        return student.classes?.some(cls => 
          cls.class_name === selectedClassFilter && cls.section === selectedSectionFilter
        );
      });
      setFilteredStudents(filtered);
    } else {
      setFilteredStudents(students);
    }
  }, [selectedClassFilter, selectedSectionFilter, students]);

  const refreshClasses = useCallback(async () => {
    setLoading(prev => ({ ...prev, classes: true }));
    try {
      const data = await apiClient.adminListClasses();
      setClasses(data);
    } catch (err) {
      console.error('Failed to load classes', err);
      showMessage('error', 'Failed to load classes');
    } finally {
      setLoading(prev => ({ ...prev, classes: false }));
    }
  }, [showMessage]);

  const refreshStudents = useCallback(async () => {
    setLoading(prev => ({ ...prev, students: true }));
    try {
      const data = await apiClient.adminListStudents();
      setStudents(data);
    } catch (err) {
      console.error('Failed to load students', err);
      showMessage('error', 'Failed to load students');
    } finally {
      setLoading(prev => ({ ...prev, students: false }));
    }
  }, [showMessage]);

  const refreshTeachers = useCallback(async () => {
    setLoading(prev => ({ ...prev, teachers: true }));
    try {
      const data = await apiClient.adminListTeachers();
      setTeachers(data);
    } catch (err) {
      console.error('Failed to load teachers', err);
      showMessage('error', 'Failed to load teachers');
    } finally {
      setLoading(prev => ({ ...prev, teachers: false }));
    }
  }, [showMessage]);

  const refreshAttendance = useCallback(async () => {
    setLoading(prev => ({ ...prev, attendance: true }));
    try {
      const params = {};
      if (filters.classId) params.classId = filters.classId;
      if (filters.status) params.status = filters.status;
      const data = await apiClient.adminListAttendanceSessions(params);
      setAttendanceRecords(data);
    } catch (err) {
      console.error('Failed to load attendance sessions', err);
      showMessage('error', 'Failed to load attendance sessions');
    } finally {
      setLoading(prev => ({ ...prev, attendance: false }));
    }
  }, [filters, showMessage]);

  const refreshUsers = useCallback(async () => {
    setLoading(prev => ({ ...prev, users: true }));
    try {
      const params = {};
      if (userFilters.role && userFilters.role !== 'all') params.role = userFilters.role;
      if (userFilters.search && userFilters.search.trim()) params.search = userFilters.search.trim();
      if (userFilters.authorized && userFilters.authorized !== '') params.authorized = userFilters.authorized;
      const data = await apiClient.adminListAllUsers(params);
      setAllUsers(data);
    } catch (err) {
      console.error('Failed to load users', err);
      showMessage('error', 'Failed to load users');
    } finally {
      setLoading(prev => ({ ...prev, users: false }));
    }
  }, [userFilters.role, userFilters.search, userFilters.authorized, showMessage]);

  useEffect(() => {
    refreshClasses();
    refreshTeachers();
    refreshStudents();
    // Users will be loaded when Users tab is activated
  }, [refreshClasses, refreshTeachers, refreshStudents]);

  useEffect(() => {
    refreshAttendance();
  }, [refreshAttendance]);

  // Load users when Users tab is activated
  useEffect(() => {
    if (activeTab === 'users') {
      refreshUsers();
    }
  }, [activeTab, refreshUsers]);

  // Handle filter changes with debounce for search
  useEffect(() => {
    if (activeTab !== 'users') return;
    
    // Debounce search input
    if (userFilters.search && userFilters.search.trim()) {
      const timeoutId = setTimeout(() => {
        refreshUsers();
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      // For role/authorized changes or cleared search, update immediately
      refreshUsers();
    }
  }, [userFilters.role, userFilters.authorized, userFilters.search, activeTab, refreshUsers]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // const handleImageChange = (e) => {
  //   const files = Array.from(e.target.files || []);
  //   if (files.length > 0) {
  //     // Limit to 5 images
  //     const limitedFiles = files.slice(0, 5);
  //     setStudentImages(limitedFiles);
  //   } else {
  //     setStudentImages([]);
  //   }
  // };

  const openFormForTab = (tab) => {
    if (tab === 'students') {
      setFormData({
        name: '',
        rollNumber: '',
        className: '',
        section: 'A',
        classId: ''
      });
      setStudentImages([]);
    } else {
      setFormData({
        name: '',
        email: '',
        password: '',
        assignedClasses: []
      });
    }
  };

  const handleAdd = () => {
    setEditingItem(null);
    openFormForTab(activeTab);
    setShowAddForm(true);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    if (activeTab === 'students') {
      const primaryClass = item.classes?.[0] || {};
      setFormData({
        name: item.name,
        rollNumber: item.roll,
        classId: primaryClass.class_id ? String(primaryClass.class_id) : ''
      });
    } else {
      // Get classes assigned to this teacher
      const assignedClasses = classes.filter(c => c.teacher_id === item.id).map(c => String(c.id));
      setFormData({
        name: item.name,
        email: item.email,
        password: '',
        assignedClasses: assignedClasses
      });
    }
    setShowAddForm(true);
  };

  const handleDelete = async (id, type) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      if (type === 'student') {
        await apiClient.adminDeleteStudent(id);
        await refreshStudents();
        showMessage('success', 'Student deleted successfully');
      } else {
        await apiClient.adminDeleteTeacher(id);
        await Promise.all([refreshTeachers(), refreshClasses()]);
        showMessage('success', 'Teacher deleted successfully');
      }
    } catch (err) {
      console.error('Delete failed', err);
      showMessage('error', 'Deletion failed. Please try again.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (activeTab === 'students') {
        if (!formData.name || !formData.rollNumber) {
          showMessage('error', 'Name and roll number are required');
          return;
        }
        if (!editingItem && !formData.className) {
          showMessage('error', 'Please select a class');
          return;
        }
        
        // Find or create class FIRST (before creating student)
        let targetClassId = formData.classId;
        if (!targetClassId && formData.className) {
          // Find existing class
          const existingClass = classes.find(c => 
            c.name === formData.className && (c.section || 'A') === formData.section
          );
          if (existingClass) {
            targetClassId = existingClass.id;
          } else {
            // Create new class
            const newClassResponse = await apiClient.adminCreateClass({
              name: formData.className,
              section: formData.section || 'A'
            });
            targetClassId = newClassResponse?.klass?.id;
            await refreshClasses();
          }
        }

        let studentId = editingItem?.id;
        if (editingItem) {
          const response = await apiClient.adminUpdateStudent(editingItem.id, {
            name: formData.name,
            roll: formData.rollNumber
          });
          studentId = response?.student?.id || studentId;
        } else {
          const studentPayload = {
            name: formData.name,
            roll: formData.rollNumber
          };
          
          // Add class_id if available
          if (targetClassId) {
            studentPayload.class_id = targetClassId;
          }
          
          // Add image files if provided (REQUIRED for new students)
          if (studentImages && studentImages.length > 0) {
            studentPayload.imageFiles = studentImages;
          }
          
          const response = await apiClient.adminCreateStudent(studentPayload);
          studentId = response?.student?.id;
          
          // Check if there was a warning about ML service
          if (response?.warning) {
            console.warn('Student created but ML service warning:', response.warning);
          }
        }

        // Assign student to class (only if not already assigned during creation)
        if (targetClassId && studentId && !editingItem) {
          // Only assign if class_id wasn't included in student creation
          // (The backend now handles class assignment during creation if class_id is provided)
          // But we still need to ensure the assignment exists
          try {
            await apiClient.adminAssignStudent({
              class_id: Number(targetClassId),
              student_id: studentId
            });
          } catch (assignErr) {
            // Ignore if already assigned
            console.warn('Class assignment:', assignErr);
          }
        }

        // Note: Face registration is now handled automatically during student creation
        // No need for separate face registration call

        await refreshStudents();
        showMessage('success', editingItem ? 'Student updated successfully' : 'Student created successfully');
      } else {
        if (!formData.name || !formData.email) {
          showMessage('error', 'Name and email are required');
          return;
        }
        if (editingItem) {
          const payload = {
            name: formData.name,
            email: formData.email
          };
          if (formData.password && formData.password.trim()) {
            payload.password = formData.password;
          }
          await apiClient.adminUpdateTeacher(editingItem.id, payload);
          
          // Handle class assignments
          const currentAssignedClasses = classes.filter(c => c.teacher_id === editingItem.id).map(c => String(c.id));
          const newAssignedClasses = formData.assignedClasses || [];
          
          // Find classes to unassign (were assigned, now not in new list)
          const toUnassign = currentAssignedClasses.filter(id => !newAssignedClasses.includes(id));
          // Find classes to assign (not assigned, now in new list)
          const toAssign = newAssignedClasses.filter(id => !currentAssignedClasses.includes(id));
          
          // Unassign classes
          for (const classId of toUnassign) {
            await apiClient.adminUpdateClass(Number(classId), { teacher_id: null });
          }
          
          // Assign classes
          for (const classId of toAssign) {
            await apiClient.adminUpdateClass(Number(classId), { teacher_id: editingItem.id });
          }
          
          showMessage('success', 'Teacher updated successfully');
        } else {
          if (!formData.password) {
            showMessage('error', 'Password is required for new teachers');
            return;
          }
          const response = await apiClient.adminCreateTeacher({
            name: formData.name,
            email: formData.email,
            password: formData.password
          });
          
          // Assign classes if any selected
          const teacherId = response?.teacher?.id;
          if (teacherId && formData.assignedClasses && formData.assignedClasses.length > 0) {
            for (const classId of formData.assignedClasses) {
              await apiClient.adminUpdateClass(Number(classId), { teacher_id: teacherId });
            }
          }
          
          showMessage('success', 'Teacher created successfully');
        }
        await Promise.all([refreshTeachers(), refreshClasses()]);
      }
      setShowAddForm(false);
      setEditingItem(null);
    } catch (err) {
      console.error('Submit failed', err);
      const msg = err?.payload?.error || err?.message || 'Operation failed';
      showMessage('error', msg);
    }
  };

  const closeForm = () => {
    setShowAddForm(false);
    setEditingItem(null);
    setStudentImages(null);
    openFormForTab(activeTab);
  };

  const handleAddClass = async (e) => {
    e.preventDefault();
    try {
      if (!classFormData.name) {
        showMessage('error', 'Class name is required');
        return;
      }
      await apiClient.adminCreateClass({
        name: classFormData.name,
        section: classFormData.section || 'A',
        teacher_id: classFormData.teacher_id || null
      });
      await refreshClasses();
      setShowAddClassForm(false);
      setClassFormData({ name: '', section: 'A', teacher_id: '' });
      showMessage('success', 'Class created successfully');
    } catch (err) {
      console.error('Create class failed', err);
      const msg = err?.payload?.error || err?.message || 'Failed to create class';
      showMessage('error', msg);
    }
  };

  // const handleImageChange = (e) => {
  //   const file = e.target.files[0];
  //   if (file) {
  //     if (file.size > 5 * 1024 * 1024) {
  //       showMessage('error', 'Image size should be less than 5MB');
  //       return;
  //     }
  //     setStudentImage(file);
  //   }
  // };
  //   const handleImageChange = (e) => {
  //   const files = Array.from(e.target.files || []);
  //   if (files.length > 0) {
  //     // Limit to 5 images
  //     const limitedFiles = files.slice(0, 5);
  //     setStudentImages(limitedFiles);
  //   } else {
  //     setStudentImages([]);
  //   }
  // };
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);

    if (files.length === 0) {
      setStudentImages([]);
      return;
    }

    // Apply size + count limits
    const validFiles = files
      .slice(0, 5) // Limit to 5 images max
      .filter(file => {
        if (file.size > 5 * 1024 * 1024) {
          showMessage('error', `Image "${file.name}" exceeds 5MB limit`);
          return false;
        }
        return true;
      });

    setStudentImages(validFiles);
  };


  const handleAuthorizeUser = async (userId, isAuthorized) => {
    try {
      await apiClient.adminAuthorizeUser(userId, isAuthorized);
      await refreshUsers();
      showMessage('success', `User ${isAuthorized ? 'authorized' : 'unauthorized'} successfully`);
    } catch (err) {
      console.error('Authorize user failed', err);
      const msg = err?.payload?.error || err?.message || 'Failed to update authorization';
      showMessage('error', msg);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    try {
      await apiClient.adminDeleteUser(userId);
      await refreshUsers();
      showMessage('success', 'User deleted successfully');
    } catch (err) {
      console.error('Delete user failed', err);
      const msg = err?.payload?.error || err?.message || 'Failed to delete user';
      showMessage('error', msg);
    }
  };

  const teacherClassMap = useMemo(() => {
    const map = new Map();
    classes.forEach(cls => {
      if (!cls.teacher_id) return;
      const bucket = map.get(cls.teacher_id) || [];
      bucket.push(cls);
      map.set(cls.teacher_id, bucket);
    });
    return map;
  }, [classes]);

  const renderStudentsTable = () => {
    if (loading.students) {
      return <div className="p-6 text-center text-sm text-gray-500">Loading students...</div>;
    }
    
    // Filter controls
    const displayStudents = (selectedClassFilter && selectedSectionFilter) ? filteredStudents : students;
    
    if (displayStudents.length === 0) {
      return (
        <>
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row md:items-center md:space-x-4 space-y-3 md:space-y-0">
            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="filterClassSelect">Filter by Class</label>
              <select
                id="filterClassSelect"
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">All Classes</option>
                {classNumbers.map(num => (
                  <option key={num} value={`Class ${num}`}>Class {num}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700" htmlFor="filterSectionSelect">Filter by Section</label>
              <select
                id="filterSectionSelect"
                value={selectedSectionFilter}
                onChange={(e) => setSelectedSectionFilter(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">All Sections</option>
                {sections.map(sec => (
                  <option key={sec} value={sec}>Section {sec}</option>
                ))}
              </select>
            </div>
            {(selectedClassFilter || selectedSectionFilter) && (
              <div className="md:ml-auto flex items-end">
                <button
                  onClick={() => {
                    setSelectedClassFilter('');
                    setSelectedSectionFilter('');
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
          <div className="p-6 text-center text-sm text-gray-500">No students found.</div>
        </>
      );
    }
    
    return (
      <>
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row md:items-center md:space-x-4 space-y-3 md:space-y-0">
          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="filterClassSelect">Filter by Class</label>
            <select
              id="filterClassSelect"
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Classes</option>
              {classNumbers.map(num => (
                <option key={num} value={`Class ${num}`}>Class {num}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="filterSectionSelect">Filter by Section</label>
            <select
              id="filterSectionSelect"
              value={selectedSectionFilter}
              onChange={(e) => setSelectedSectionFilter(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Sections</option>
              {sections.map(sec => (
                <option key={sec} value={sec}>Section {sec}</option>
              ))}
            </select>
          </div>
          {(selectedClassFilter || selectedSectionFilter) && (
            <div className="md:ml-auto flex items-end">
              <button
                onClick={() => {
                  setSelectedClassFilter('');
                  setSelectedSectionFilter('');
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roll</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Classes</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {displayStudents.map(student => {
              const classLabel = (student.classes || [])
                .map(cls => `${cls.class_name}${cls.section ? ` (${cls.section})` : ''}`)
                .join(', ') || 'Unassigned';
              return (
                <tr key={student.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.roll}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{classLabel}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-primary-600 hover:text-primary-900 mr-3" onClick={() => handleEdit(student)}>Edit</button>
                    <button className="text-red-600 hover:text-red-900" onClick={() => handleDelete(student.id, 'student')}>Delete</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </>
    );
  };

  const renderTeachersTable = () => {
    if (loading.teachers) {
      return <div className="p-6 text-center text-sm text-gray-500">Loading teachers...</div>;
    }
    if (teachers.length === 0) {
      return <div className="p-6 text-center text-sm text-gray-500">No teachers found.</div>;
    }
    return (
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Classes</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {teachers.map(teacher => {
            const assigned = teacherClassMap.get(teacher.id) || [];
            const classLabel = assigned.length
              ? assigned.map(cls => `${cls.name}${cls.section ? ` (${cls.section})` : ''}`).join(', ')
              : 'No classes assigned';
            return (
              <tr key={teacher.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{teacher.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{teacher.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{classLabel}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button className="text-primary-600 hover:text-primary-900 mr-3" onClick={() => handleEdit(teacher)}>Edit</button>
                  <button className="text-red-600 hover:text-red-900" onClick={() => handleDelete(teacher.id, 'teacher')}>Delete</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  const renderUsersTable = () => {
    if (loading.users) {
      return <div className="p-6 text-center text-sm text-gray-500">Loading users...</div>;
    }

    const pendingUsers = allUsers.filter(u => (u.role === 'admin' || u.role === 'teacher' || u.role === 'gov') && !u.is_authorized);
    
    return (
      <>
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row md:items-center md:space-x-4 space-y-3 md:space-y-0">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700" htmlFor="userSearch">Search</label>
            <input
              id="userSearch"
              type="text"
              placeholder="Search by name or email..."
              value={userFilters.search}
              onChange={(e) => {
                setUserFilters(prev => ({ ...prev, search: e.target.value }));
              }}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="userRoleFilter">Role</label>
            <select
              id="userRoleFilter"
              value={userFilters.role}
              onChange={(e) => setUserFilters(prev => ({ ...prev, role: e.target.value }))}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="teacher">Teacher</option>
              <option value="gov">Government Officer</option>
              <option value="student">Student</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="userAuthFilter">Authorization</label>
            <select
              id="userAuthFilter"
              value={userFilters.authorized}
              onChange={(e) => setUserFilters(prev => ({ ...prev, authorized: e.target.value }))}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All</option>
              <option value="true">Authorized</option>
              <option value="false">Pending</option>
            </select>
          </div>
          <div className="md:ml-auto flex items-end">
            <button onClick={refreshUsers} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">Refresh</button>
          </div>
        </div>

        {pendingUsers.length > 0 && (
          <div className="px-6 py-3 bg-yellow-50 border-b border-yellow-200">
            <p className="text-sm text-yellow-800">
              <strong>{pendingUsers.length}</strong> user(s) pending authorization
            </p>
          </div>
        )}

        {allUsers.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">No users found.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {allUsers.map(user => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {user.role === 'admin' ? 'Administrator' : user.role === 'gov' ? 'Government Officer' : user.role === 'teacher' ? 'Teacher' : 'Student'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {user.role === 'admin' || user.role === 'student' ? (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        Authorized
                      </span>
                    ) : user.is_authorized ? (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        Authorized
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {(user.role === 'admin' || user.role === 'teacher' || user.role === 'gov')&&(
                      <>
                        {!user.is_authorized ? (
                          <button
                            onClick={() => handleAuthorizeUser(user.id, true)}
                            className="text-green-600 hover:text-green-900 mr-3"
                          >
                            Authorize
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAuthorizeUser(user.id, false)}
                            className="text-yellow-600 hover:text-yellow-900 mr-3"
                          >
                            Revoke
                          </button>
                        )}
                      </>
                    )}
                    {user.role !== 'admin' && (
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </>
    );
  };

  const renderAttendanceTable = () => (
    <>
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row md:items-center md:space-x-4 space-y-3 md:space-y-0">
        <div>
          <label className="block text-sm font-medium text-gray-700" htmlFor="filterClass">Class Filter</label>
          <select
            id="filterClass"
            value={filters.classId}
            onChange={(e) => setFilters(prev => ({ ...prev, classId: e.target.value }))}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All classes</option>
            {classOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700" htmlFor="filterStatus">Status</label>
          <select
            id="filterStatus"
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="saved">Saved</option>
          </select>
        </div>
        <div className="md:ml-auto">
          <button onClick={refreshAttendance} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">Refresh</button>
        </div>
      </div>
      {loading.attendance ? (
        <div className="p-6 text-center text-sm text-gray-500">Loading attendance sessions...</div>
      ) : attendanceRecords.length === 0 ? (
        <div className="p-6 text-center text-sm text-gray-500">No attendance sessions found.</div>
      ) : (
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Session Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teacher</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marked</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Present</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {attendanceRecords.map(record => (
              <tr key={record.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(record.session_time).toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.class_name}{record.section ? ` (${record.section})` : ''}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.teacher_name || 'Unassigned'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.total_marked}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.total_present}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    record.status === 'saved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {record.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );

  const renderForm = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">{editingItem ? 'Edit' : 'Add'} {activeTab === 'students' ? 'Student' : 'Teacher'}</h3>
            <button onClick={closeForm} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                name="name"
                required
                value={formData.name || ''}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            {activeTab === 'students' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Roll Number</label>
                  <input
                    type="text"
                    name="rollNumber"
                    required
                    value={formData.rollNumber || ''}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                {!editingItem && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Class</label>
                      <select
                        name="className"
                        required={!editingItem}
                        value={formData.className || ''}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">Select Class</option>
                        {classNumbers.map(num => (
                          <option key={num} value={`Class ${num}`}>Class {num}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Section</label>
                      <select
                        name="section"
                        required={!editingItem}
                        value={formData.section || 'A'}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      >
                        {sections.map(sec => (
                          <option key={sec} value={sec}>Section {sec}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Student Photos (for face recognition)</label>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageChange}
                        className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                      />
                      {studentImages.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {studentImages.map((img, idx) => (
                            <div key={idx} className="relative">
                              <img 
                                src={URL.createObjectURL(img)} 
                                alt={`Preview ${idx + 1}`} 
                                className="h-24 w-24 object-cover rounded-md border border-gray-300"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const newImages = studentImages.filter((_, i) => i !== idx);
                                  setStudentImages(newImages);
                                }}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        Upload 1-5 clear face photos for better recognition accuracy. Multiple angles recommended.
                      </p>
                    </div>
                  </>
                )}
                {editingItem && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Class (optional)</label>
                    <select
                      name="classId"
                      value={formData.classId || ''}
                      onChange={handleInputChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">Unassigned</option>
                      {classOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email || ''}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {editingItem ? 'New Password (optional)' : 'Password'}
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password || ''}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder={editingItem ? 'Leave blank to keep current password' : ''}
                    required={!editingItem}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Assign Classes</label>
                  <select
                    multiple
                    name="assignedClasses"
                    value={formData.assignedClasses || []}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                      setFormData(prev => ({ ...prev, assignedClasses: selected }));
                    }}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 min-h-[120px]"
                    size="5"
                  >
                    {classOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    {editingItem 
                      ? 'Hold Ctrl/Cmd to select multiple classes. Selected classes will be assigned to this teacher.'
                      : 'Hold Ctrl/Cmd to select multiple classes. These classes will be assigned to the new teacher.'}
                  </p>
                  {editingItem && formData.assignedClasses && formData.assignedClasses.length > 0 && (
                    <p className="mt-1 text-xs text-blue-600">
                      {formData.assignedClasses.length} class(es) selected
                    </p>
                  )}
                </div>
              </>
            )}
            <div className="flex justify-end space-x-3 pt-4">
              <button type="button" onClick={closeForm} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">
                {editingItem ? 'Update' : 'Add'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Administrator Dashboard</h1>
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
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('students')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'students'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Students ({students.length})
              </button>
              <button
                onClick={() => setActiveTab('teachers')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'teachers'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Teachers ({teachers.length})
              </button>
              <button
                onClick={() => setActiveTab('attendance')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'attendance'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Attendance Records ({attendanceRecords.length})
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'users'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Users ({allUsers.length})
              </button>
            </nav>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">
              {activeTab === 'students' && 'Manage Students'}
              {activeTab === 'teachers' && 'Manage Teachers'}
              {activeTab === 'attendance' && 'Attendance Records'}
              {activeTab === 'users' && 'User Management'}
            </h2>
            {activeTab !== 'attendance' && activeTab !== 'users' && (
              <div className="flex space-x-2">
                {activeTab === 'students' && (
                  <button
                    onClick={() => setShowAddClassForm(true)}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                  >
                    Add Class
                  </button>
                )}
                <button
                  onClick={handleAdd}
                  className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors"
                >
                  Add {activeTab === 'students' ? 'Student' : 'Teacher'}
                </button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            {activeTab === 'students' && renderStudentsTable()}
            {activeTab === 'teachers' && renderTeachersTable()}
            {activeTab === 'attendance' && renderAttendanceTable()}
            {activeTab === 'users' && renderUsersTable()}
          </div>
        </div>
      </div>

      {showAddForm && renderForm()}

      {showAddClassForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Add Class</h3>
                <button onClick={() => setShowAddClassForm(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleAddClass} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Class Name</label>
                  <select
                    name="name"
                    required
                    value={classFormData.name}
                    onChange={(e) => setClassFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select Class</option>
                    {classNumbers.map(num => (
                      <option key={num} value={`Class ${num}`}>Class {num}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Section</label>
                  <select
                    name="section"
                    required
                    value={classFormData.section}
                    onChange={(e) => setClassFormData(prev => ({ ...prev, section: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    {sections.map(sec => (
                      <option key={sec} value={sec}>Section {sec}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Teacher (optional)</label>
                  <select
                    name="teacher_id"
                    value={classFormData.teacher_id}
                    onChange={(e) => setClassFormData(prev => ({ ...prev, teacher_id: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Unassigned</option>
                    {teachers.map(teacher => (
                      <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button type="button" onClick={() => setShowAddClassForm(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">Create Class</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

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

export default AdminDashboard;
