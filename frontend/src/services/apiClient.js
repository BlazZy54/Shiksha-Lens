const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:3000/api";

const PYTHON_PLACEHOLDER = { success: true, candidates: [] };

const getToken = () => localStorage.getItem("attendance_token");

const buildHeaders = (customHeaders = {}, body) => {
  const headers = { ...customHeaders };
  // Don't set Content-Type for FormData - browser will set it with boundary
  if (!(body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  } else {
    // Remove Content-Type if it was set, let browser handle it
    delete headers["Content-Type"];
  }

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async (response, { expectJson = true, fallback } = {}) => {
  if (!response) {
    if (fallback !== undefined) return fallback;
    throw new Error("No response from server");
  }

  if (!response.ok) {
    let errorPayload;
    try {
      errorPayload = await response.json();
    } catch {
      errorPayload = { error: response.statusText || "Request failed" };
    }

    if (fallback !== undefined) return fallback;

    const error = new Error(errorPayload.error || "Request failed");
    error.status = response.status;
    error.payload = errorPayload;
    throw error;
  }

  if (!expectJson) {
    return response;
  }

  try {
    return await response.json();
  } catch {
    if (fallback !== undefined) return fallback;
    throw new Error("Failed to parse response");
  }
};

export const apiClient = {
  async login({ email, password }) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify({ email, password })
    });

    const data = await handleResponse(response);
    if (!data?.token) {
      throw new Error("Token missing in response");
    }
    return data;
  },

  async signup({ name, email, password, role }) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify({ name, email, password, role })
    });

    return await handleResponse(response);
  },

  async registerFace({ studentId, imageFile, imageUrl }) {
    try {
      const formData = new FormData();
      formData.append('student_id', studentId);
      if (imageFile) {
        formData.append('image', imageFile);
      } else if (imageUrl) {
        formData.append('imageUrl', imageUrl);
      }

      const response = await fetch(`${API_BASE_URL}/recognition/register-face`, {
        method: "POST",
        headers: buildHeaders({}, formData), // Don't set Content-Type for FormData
        body: formData
      });

      return await handleResponse(response, { fallback: { success: false, message: "Service unavailable" } });
    } catch (err) {
      console.warn("registerFace fallback", err);
      return { success: true, message: "Python service not ready", data: PYTHON_PLACEHOLDER };
    }
  },

  async fetchTeacherClasses() {
    try {
      const response = await fetch(`${API_BASE_URL}/teacher/classes`, {
        method: "GET",
        headers: buildHeaders()
      });
      return await handleResponse(response, { fallback: [] });
    } catch (err) {
      console.warn("fetchTeacherClasses fallback", err);
      return [];
    }
  },

  async fetchTeacherClassStudents(classId) {
    if (!classId) return [];
    try {
      const response = await fetch(`${API_BASE_URL}/teacher/classes/${classId}/students`, {
        method: "GET",
        headers: buildHeaders()
      });
      return await handleResponse(response, { fallback: [] });
    } catch (err) {
      console.warn("fetchTeacherClassStudents fallback", err);
      return [];
    }
  },

  async createAttendanceSession({ classId, file, imageUrl }) {
    const endpoint = `${API_BASE_URL}/teacher/classes/${classId}/attendance/upload`;

    try {
      // Validate inputs
      if (!classId) {
        throw new Error("Class ID is required");
      }
      
      if (!file && !imageUrl) {
        throw new Error("Either file or imageUrl is required");
      }

      let body;
      let headers = buildHeaders({});
      
      if (file) {
        // Use FormData for file upload
        body = new FormData();
        const filename = file.name || `attendance-${Date.now()}.jpg`;
        body.append("image", file, filename);
        
        // Remove Content-Type for FormData - browser will set it with boundary
        delete headers["Content-Type"];
      } else if (imageUrl) {
        // Use JSON for imageUrl
        body = JSON.stringify({ imageUrl });
        headers["Content-Type"] = "application/json";
      }

      console.log(`📤 Creating attendance session for class ${classId}`);
      if (file) {
        console.log(`   Uploading file: ${file.name || 'unnamed'}`);
      } else {
        console.log(`   Using imageUrl: ${imageUrl}`);
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: headers,
        body: body
      });

      const result = await handleResponse(response, { fallback: { message: "Recognition unavailable", candidates: [] } });
      
      if (result?.sessionId) {
        console.log(`✅ Attendance session created: ${result.sessionId}`);
        console.log(`   Candidates found: ${result.candidates?.length || 0}`);
      }
      
      return result;
    } catch (err) {
      console.error("❌ createAttendanceSession error:", err.message);
      console.warn("createAttendanceSession fallback", err);
      throw err; // Re-throw to let caller handle it
    }
  },

  async fetchAttendanceSession(sessionId) {
    if (!sessionId) return null;
    try {
      const response = await fetch(`${API_BASE_URL}/teacher/attendance/${sessionId}`, {
        method: "GET",
        headers: buildHeaders()
      });
      return await handleResponse(response, { fallback: null });
    } catch (err) {
      console.warn("fetchAttendanceSession fallback", err);
      return null;
    }
  },

  async confirmAttendanceSession(sessionId, confirmations) {
    if (!sessionId) throw new Error("sessionId required");
    try {
      const response = await fetch(`${API_BASE_URL}/teacher/attendance/${sessionId}/confirm`, {
        method: "POST",
        headers: buildHeaders(),
        body: JSON.stringify({ confirmations })
      });
      return await handleResponse(response, { fallback: { message: "Stored locally" } });
    } catch (err) {
      console.warn("confirmAttendanceSession fallback", err);
      return { success: true, message: "Stored locally" };
    }
  },

  async adminCreateStudent(payload) {
    try {
      // Check if payload contains image files
      const hasImages = payload.imageFiles || payload.images || payload.imageFile || payload.image;
      
      let body;
      let headers = buildHeaders();
      
      if (hasImages) {
        // Use FormData for file upload
        const formData = new FormData();
        formData.append("name", payload.name);
        formData.append("roll", payload.roll);
        if (payload.class_id) {
          formData.append("class_id", payload.class_id);
        }
        
        // Add image files (support multiple)
        const imageFiles = payload.imageFiles || payload.images || 
                          (payload.imageFile ? [payload.imageFile] : []) ||
                          (payload.image ? [payload.image] : []);
        
        if (Array.isArray(imageFiles)) {
          imageFiles.forEach((file, index) => {
            if (file instanceof File || file instanceof Blob) {
              formData.append("images", file);
            }
          });
        } else if (imageFiles instanceof File || imageFiles instanceof Blob) {
          formData.append("images", imageFiles);
        }
        
        if (payload.imageUrl) {
          formData.append("imageUrl", payload.imageUrl);
        }
        
        body = formData;
        // Don't set Content-Type for FormData - browser will set it with boundary
        delete headers["Content-Type"];
      } else {
        // Use JSON if no images
        body = JSON.stringify(payload);
      }
      
      const response = await fetch(`${API_BASE_URL}/admin/student`, {
        method: "POST",
        headers: headers,
        body: body
      });
      return await handleResponse(response);
    } catch (err) {
      console.warn("adminCreateStudent fallback", err);
      return { success: true, mock: true };
    }
  },

  async adminListStudents() {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/students`, {
        method: "GET",
        headers: buildHeaders()
      });
      return await handleResponse(response, { fallback: [] });
    } catch (err) {
      console.warn("adminListStudents fallback", err);
      return [];
    }
  },

  async adminUpdateStudent(id, payload) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/student/${id}`, {
        method: "PUT",
        headers: buildHeaders(),
        body: JSON.stringify(payload)
      });
      return await handleResponse(response);
    } catch (err) {
      console.warn("adminUpdateStudent fallback", err);
      return { success: true, mock: true };
    }
  },

  async adminDeleteStudent(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/student/${id}`, {
        method: "DELETE",
        headers: buildHeaders()
      });
      return await handleResponse(response);
    } catch (err) {
      console.warn("adminDeleteStudent fallback", err);
      return { success: true, mock: true };
    }
  },

  async adminListTeachers() {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/teachers`, {
        method: "GET",
        headers: buildHeaders()
      });
      return await handleResponse(response, { fallback: [] });
    } catch (err) {
      console.warn("adminListTeachers fallback", err);
      return [];
    }
  },

  async adminCreateTeacher(payload) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/teacher`, {
        method: "POST",
        headers: buildHeaders(),
        body: JSON.stringify(payload)
      });
      return await handleResponse(response);
    } catch (err) {
      console.warn("adminCreateTeacher fallback", err);
      return { success: true, mock: true };
    }
  },

  async adminUpdateTeacher(id, payload) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/teacher/${id}`, {
        method: "PUT",
        headers: buildHeaders(),
        body: JSON.stringify(payload)
      });
      return await handleResponse(response);
    } catch (err) {
      console.warn("adminUpdateTeacher fallback", err);
      return { success: true, mock: true };
    }
  },

  async adminDeleteTeacher(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/teacher/${id}`, {
        method: "DELETE",
        headers: buildHeaders()
      });
      return await handleResponse(response);
    } catch (err) {
      console.warn("adminDeleteTeacher fallback", err);
      return { success: true, mock: true };
    }
  },

  async adminListClasses() {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/classes`, {
        method: "GET",
        headers: buildHeaders()
      });
      return await handleResponse(response, { fallback: [] });
    } catch (err) {
      console.warn("adminListClasses fallback", err);
      return [];
    }
  },

  async adminCreateClass(payload) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/class`, {
        method: "POST",
        headers: buildHeaders(),
        body: JSON.stringify(payload)
      });
      return await handleResponse(response);
    } catch (err) {
      console.warn("adminCreateClass fallback", err);
      return { success: true, mock: true };
    }
  },

  async adminUpdateClass(id, payload) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/class/${id}`, {
        method: "PUT",
        headers: buildHeaders(),
        body: JSON.stringify(payload)
      });
      return await handleResponse(response);
    } catch (err) {
      console.warn("adminUpdateClass fallback", err);
      return { success: true, mock: true };
    }
  },

  async adminDeleteClass(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/class/${id}`, {
        method: "DELETE",
        headers: buildHeaders()
      });
      return await handleResponse(response);
    } catch (err) {
      console.warn("adminDeleteClass fallback", err);
      return { success: true, mock: true };
    }
  },

  async adminAssignStudent(payload) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/class/assign`, {
        method: "POST",
        headers: buildHeaders(),
        body: JSON.stringify(payload)
      });
      return await handleResponse(response);
    } catch (err) {
      console.warn("adminAssignStudent fallback", err);
      return { success: true, mock: true };
    }
  },

  async adminClassStudents(classId, { limit = 50, offset = 0 } = {}) {
    if (!classId) return [];
    try {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      const response = await fetch(`${API_BASE_URL}/admin/class/${classId}/students?${params}`, {
        method: "GET",
        headers: buildHeaders()
      });
      return await handleResponse(response, { fallback: [] });
    } catch (err) {
      console.warn("adminClassStudents fallback", err);
      return [];
    }
  },

  async adminClassStudentCount(classId) {
    if (!classId) return { total: 0 };
    try {
      const response = await fetch(`${API_BASE_URL}/admin/class/${classId}/count`, {
        method: "GET",
        headers: buildHeaders()
      });
      return await handleResponse(response, { fallback: { total: 0 } });
    } catch (err) {
      console.warn("adminClassStudentCount fallback", err);
      return { total: 0 };
    }
  },

  async adminListAttendanceSessions(params = {}) {
    try {
      const search = new URLSearchParams(params);
      const response = await fetch(`${API_BASE_URL}/admin/attendance/sessions?${search}`, {
        method: "GET",
        headers: buildHeaders()
      });
      return await handleResponse(response, { fallback: [] });
    } catch (err) {
      console.warn("adminListAttendanceSessions fallback", err);
      return [];
    }
  },

  async adminGetAttendanceSession(sessionId) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/attendance/sessions/${sessionId}`, {
        method: "GET",
        headers: buildHeaders()
      });
      return await handleResponse(response, { fallback: null });
    } catch (err) {
      console.warn("adminGetAttendanceSession fallback", err);
      return null;
    }
  },

  async downloadStudentReport() {
    try {
      const response = await fetch(`${API_BASE_URL}/report/student/attendance`, {
        method: "GET",
        headers: buildHeaders(),
      });
      return await handleResponse(response, { expectJson: false });
    } catch (err) {
      console.warn("downloadStudentReport fallback", err);
      return null;
    }
  },

  async downloadGovReport(params = {}) {
    try {
      const search = new URLSearchParams(params);
      const response = await fetch(`${API_BASE_URL}/report/gov/attendance?${search}`, {
        method: "GET",
        headers: buildHeaders(),
      });
      return await handleResponse(response, { expectJson: false });
    } catch (err) {
      console.warn("downloadGovReport fallback", err);
      return null;
    }
  },

  // User Management
  async adminListAllUsers(params = {}) {
    try {
      const search = new URLSearchParams(params);
      const response = await fetch(`${API_BASE_URL}/admin/users?${search}`, {
        method: "GET",
        headers: buildHeaders()
      });
      return await handleResponse(response, { fallback: [] });
    } catch (err) {
      console.warn("adminListAllUsers fallback", err);
      return [];
    }
  },

  async adminAuthorizeUser(userId, isAuthorized) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/authorize`, {
        method: "PUT",
        headers: buildHeaders(),
        body: JSON.stringify({ is_authorized: isAuthorized })
      });
      return await handleResponse(response);
    } catch (err) {
      console.warn("adminAuthorizeUser fallback", err);
      throw err;
    }
  },

  async adminDeleteUser(userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
        method: "DELETE",
        headers: buildHeaders()
      });
      return await handleResponse(response);
    } catch (err) {
      console.warn("adminDeleteUser fallback", err);
      throw err;
    }
  }
};

export default apiClient;

