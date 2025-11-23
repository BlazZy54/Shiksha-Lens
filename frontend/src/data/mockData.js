// Mock data for the attendance system
export const mockUsers = {
  teachers: [
    { id: 1, name: 'John Smith', email: 'john@school.com', class: 'Class 5', section: 'A' },
    { id: 2, name: 'Sarah Johnson', email: 'sarah@school.com', class: 'Class 6', section: 'B' },
    { id: 3, name: 'Mike Wilson', email: 'mike@school.com', class: 'Class 7', section: 'A' }
  ],
  students: [
    { id: 1, name: 'Alice Brown', rollNumber: 'S001', class: 'Class 5', section: 'A' },
    { id: 2, name: 'Bob Davis', rollNumber: 'S002', class: 'Class 5', section: 'A' },
    { id: 3, name: 'Carol Green', rollNumber: 'S003', class: 'Class 6', section: 'B' },
    { id: 4, name: 'David Lee', rollNumber: 'S004', class: 'Class 6', section: 'B' },
    { id: 5, name: 'Emma White', rollNumber: 'S005', class: 'Class 7', section: 'A' }
  ]
};

export const mockAttendanceRecords = [
  {
    id: 1,
    teacherId: 1,
    teacherName: 'John Smith',
    class: 'Class 5',
    section: 'A',
    date: '2024-01-15',
    photoUrl: '/api/placeholder/400/300',
    studentsPresent: 18,
    totalStudents: 20,
    status: 'submitted'
  },
  {
    id: 2,
    teacherId: 2,
    teacherName: 'Sarah Johnson',
    class: 'Class 6',
    section: 'B',
    date: '2024-01-15',
    photoUrl: '/api/placeholder/400/300',
    studentsPresent: 15,
    totalStudents: 18,
    status: 'submitted'
  },
  {
    id: 3,
    teacherId: 1,
    teacherName: 'John Smith',
    class: 'Class 5',
    section: 'A',
    date: '2024-01-14',
    photoUrl: '/api/placeholder/400/300',
    studentsPresent: 19,
    totalStudents: 20,
    status: 'submitted'
  }
];

export const mockMonthlyReports = [
  {
    class: 'Class 5',
    section: 'A',
    totalDays: 22,
    avgAttendance: 85.5,
    suspiciousEntries: 2,
    status: 'Valid'
  },
  {
    class: 'Class 6',
    section: 'B',
    totalDays: 22,
    avgAttendance: 78.2,
    suspiciousEntries: 5,
    status: 'Needs Review'
  },
  {
    class: 'Class 7',
    section: 'A',
    totalDays: 22,
    avgAttendance: 92.1,
    suspiciousEntries: 0,
    status: 'Valid'
  }
];

export const mockStudentAttendance = [
  { date: '2024-01-15', class: 'Class 5', section: 'A', status: 'Present' },
  { date: '2024-01-14', class: 'Class 5', section: 'A', status: 'Present' },
  { date: '2024-01-13', class: 'Class 5', section: 'A', status: 'Absent' },
  { date: '2024-01-12', class: 'Class 5', section: 'A', status: 'Present' },
  { date: '2024-01-11', class: 'Class 5', section: 'A', status: 'Present' },
  { date: '2024-01-10', class: 'Class 5', section: 'A', status: 'Present' },
  { date: '2024-01-09', class: 'Class 5', section: 'A', status: 'Absent' },
  { date: '2024-01-08', class: 'Class 5', section: 'A', status: 'Present' }
];

// Mock login credentials
export const mockCredentials = {
  teacher: { username: 'teacher', password: 'teacher123', role: 'Teacher' },
  admin: { username: 'admin', password: 'admin123', role: 'Administrator' },
  officer: { username: 'officer', password: 'officer123', role: 'Officer' },
  student: { username: 'student', password: 'student123', role: 'Student' }
};
