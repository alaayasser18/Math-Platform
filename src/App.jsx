import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { StudentProvider } from "./context/StudentContext";
import { useStudent } from "./context/useStudent";
import TopBar from "./Components/TopBar";
import Footer from "./Components/Footer";
import Toast from "./Components/Toast";
import AuthModal from "./Components/AuthModal";
import AuthPage from "./Pages/AuthPage";
import HomePage from "./Pages/HomePage";
import LessonsPage from "./Pages/LessonsPage";
import LessonWatchPage from "./Pages/LessonWatchPage";
import ExamsPage from "./Pages/ExamsPage";
import MemosPage from "./Pages/MemosPage";
import ProfilePage from "./Pages/ProfilePage";
import TeacherDashboardPage from "./Pages/TeacherDashboardPage";
import NotFoundPage from "./Pages/NotFoundPage";

function AuthLoading() {
  return <div className="auth-loading" role="status" aria-live="polite">جارٍ التحقق من الجلسة...</div>;
}

function LoginRoute({ role }) {
  const { isAuthenticated, isAuthReady, userRole } = useStudent();
  if (!isAuthReady) return <AuthLoading />;
  if (isAuthenticated) return <Navigate to={userRole === "teacher" ? "/teacher-dashboard" : "/"} replace />;
  return <AuthPage role={role} />;
}

function ProtectedRoute({ allowedRole, children }) {
  const { isAuthenticated, isAuthReady, userRole } = useStudent();
  if (!isAuthReady) return <AuthLoading />;
  if (!isAuthenticated) return <Navigate to={allowedRole === "teacher" ? "/teacher-login" : "/student-login"} replace />;
  if (userRole !== allowedRole) return <Navigate to={userRole === "teacher" ? "/teacher-dashboard" : "/"} replace />;
  return children;
}

function AppContent() {
  const { isAuthenticated, isAuthReady, userRole } = useStudent();
  if (!isAuthReady) return <div className="app-container"><AuthLoading /></div>;
  if (!isAuthenticated) {
    return <div className="app-container"><Routes>
      <Route path="/teacher-login" element={<LoginRoute role="teacher" />} />
      <Route path="/student-login" element={<LoginRoute role="student" />} />
      <Route path="*" element={<Navigate to="/student-login" replace />} />
    </Routes><Toast /></div>;
  }

  return <div className="app-container">
    <TopBar />
    <main className="main-content">
      <Routes>
        <Route path="/teacher-login" element={<Navigate to={userRole === "teacher" ? "/teacher-dashboard" : "/"} replace />} />
        <Route path="/student-login" element={<Navigate to={userRole === "teacher" ? "/teacher-dashboard" : "/"} replace />} />
        <Route path="/" element={<ProtectedRoute allowedRole="student"><HomePage /></ProtectedRoute>} />
        <Route path="/teacher-dashboard" element={<ProtectedRoute allowedRole="teacher"><TeacherDashboardPage /></ProtectedRoute>} />
        <Route path="/lessons" element={<LessonsPage />} />
        <Route path="/watch/:id" element={<LessonWatchPage />} />
        <Route path="/exams" element={<ExamsPage />} />
        <Route path="/quiz/:id" element={<ExamsPage />} />
        <Route path="/memos" element={<MemosPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </main>
    <Footer /><Toast /><AuthModal />
  </div>;
}

function App() {
  return <StudentProvider><BrowserRouter><AppContent /></BrowserRouter></StudentProvider>;
}

export default App;
