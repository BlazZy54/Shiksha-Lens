# Rural School Attendance System

A comprehensive web-based attendance system designed specifically for rural schools, built with React and TailwindCSS. The system supports four different user roles with tailored functionality for each.

## 🎯 Features

### 👨‍🏫 Teacher Dashboard
- **Photo Capture**: Take classroom photos using device camera
- **Photo Upload**: Upload existing photos for offline mode
- **Form Fields**: Class, Section, Date (auto-filled)
- **Preview**: Review attendance record before submission
- **Success/Error Messages**: Clear feedback for all operations

### 👨‍💼 Administrator Dashboard
- **User Management**: CRUD operations for students and teachers
- **Simple Forms**: Easy-to-use forms for adding/editing users
- **Attendance Records**: View all uploaded attendance records
- **Tabbed Interface**: Organized view of different data types

### 📊 Officer Dashboard
- **Monthly Reports**: Comprehensive attendance analytics
- **Export Functionality**: Download reports as PDF or CSV
- **Quality Indicators**: Track suspicious entries and data quality
- **Summary Cards**: Quick overview of key metrics
- **Trend Analysis**: Visual insights into attendance patterns

### 👨‍🎓 Student Dashboard
- **Personal History**: View individual attendance records
- **Period Filtering**: Filter by week, month, or semester
- **Download Reports**: Export personal attendance data
- **Performance Insights**: Attendance statistics and trends
- **Recent Activity**: Quick view of recent attendance

## 🚀 Getting Started

### Prerequisites
- Node.js (version 14 or higher)
- npm or yarn package manager

### Installation

1. **Clone or download the project**
   ```bash
   cd SIH
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

## 🔐 Demo Credentials

The system includes demo credentials for testing all roles:

| Role | Username | Password |
|------|----------|----------|
| Teacher | teacher | teacher123 |
| Administrator | admin | admin123 |
| Officer | officer | officer123 |
| Student | student | student123 |

## 📱 Mobile-First Design

The system is designed with rural areas in mind:
- **Responsive Design**: Works on all device sizes
- **Touch-Friendly**: Large buttons and easy navigation
- **Offline Support**: Functions without internet connection
- **Low-Spec Friendly**: Optimized for older devices
- **Simple UI**: Clean, intuitive interface

## 🛠️ Technology Stack

- **Frontend**: React 18
- **Styling**: TailwindCSS
- **Routing**: React Router DOM
- **State Management**: React Context API
- **Offline Storage**: localStorage
- **Icons**: Heroicons (SVG)

## 📁 Project Structure

```
src/
├── components/           # React components
│   ├── Login.js         # Authentication component
│   ├── TeacherDashboard.js
│   ├── AdminDashboard.js
│   ├── OfficerDashboard.js
│   ├── StudentDashboard.js
│   ├── Message.js       # Notification component
│   └── LoadingSpinner.js
├── contexts/            # React contexts
│   └── AuthContext.js   # Authentication state
├── services/            # Utility services
│   └── offlineService.js # Offline data management
├── data/               # Mock data
│   └── mockData.js     # Sample data for testing
├── App.js              # Main application component
├── index.js            # Application entry point
└── index.css           # Global styles
```

## 🔧 Key Features

### Offline Support
- Data is stored in localStorage when offline
- Automatic sync when connection is restored
- Visual indicators for online/offline status
- Pending uploads tracking

### Photo Management
- Camera integration for real-time capture
- File upload for existing photos
- Image preview before submission
- Optimized for mobile devices

### Export Functionality
- CSV export for data analysis
- PDF generation for reports
- Personal attendance reports
- Monthly summary reports

### Responsive Design
- Mobile-first approach
- Touch-friendly interface
- Accessible design patterns
- Cross-browser compatibility

## 🎨 UI/UX Features

- **Clean Interface**: Minimal, distraction-free design
- **Color Coding**: Intuitive status indicators
- **Loading States**: Clear feedback during operations
- **Error Handling**: User-friendly error messages
- **Accessibility**: Screen reader friendly
- **Progressive Enhancement**: Works without JavaScript

## 🔮 Future Enhancements

The system is designed to be easily extensible:
- Backend API integration
- Real-time notifications
- Advanced analytics
- Multi-language support
- Biometric integration
- SMS notifications

## 📞 Support

For technical support or questions about the system, please refer to the documentation or contact the development team.

## 📄 License

This project is developed for educational and rural development purposes.

---

**Built with ❤️ for rural education**
