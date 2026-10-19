import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { StudentProvider } from "./context/StudentContext";
import { useStudent } from "./context/useStudent";
import TopBar from "./Components/TopBar";
import Footer from "./Components/Footer";
import Toast from "./Components/Toast";
import AuthModal from "./Components/AuthModal";

// Pages
import LoginPage from "./Pages/LoginPage";
import HomePage from "./Pages/HomePage";
import LessonsPage from "./Pages/LessonsPage";
import LessonWatchPage from "./Pages/LessonWatchPage";
import ExamsPage from "./Pages/ExamsPage";
import MemosPage from "./Pages/MemosPage";
import ProfilePage from "./Pages/ProfilePage";
import TeacherDashboardPage from "./Pages/TeacherDashboardPage";
import NotFoundPage from "./Pages/NotFoundPage";

function AppContent() {
  const { isAuthenticated, isAuthReady, userRole } = useStudent();

  if (!isAuthReady) {
    return (
      <div
        className="app-container"
        style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}
      >
        <p>جارٍ التحقق من الجلسة...</p>
      </div>
    );
  }

  // If not logged in, render the Login / Access Code Portal
  if (!isAuthenticated) {
    return (
      <div className="app-container">
        <LoginPage />
        <Toast />
      </div>
    );
  }

  // If Logged in (Teacher or Student)
  return (
    <div className="app-container">
      {/* Shared Adaptive TopBar */}
      <TopBar />

      {/* Main Routed Page Content */}
      <main className="main-content">
        <Routes>
          {/* Main Home Route: Shows Teacher Dashboard if teacher, or Student Grade Hub if student */}
          <Route
            path="/"
            element={
              userRole === "teacher" ? <TeacherDashboardPage /> : <HomePage />
            }
          />

          <Route path="/lessons" element={<LessonsPage />} />
          <Route path="/watch/:id" element={<LessonWatchPage />} />
          <Route path="/exams" element={<ExamsPage />} />
          <Route path="/quiz/:id" element={<ExamsPage />} />
          <Route path="/memos" element={<MemosPage />} />
          <Route path="/profile" element={<ProfilePage />} />

          {/* Teacher Dashboard */}
          <Route
            path="/teacher-dashboard"
            element={
              userRole === "teacher" ? (
                <TeacherDashboardPage />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      {/* Reusable Shared Footer */}
      <Footer />

      {/* Global Toast Notification */}
      <Toast />

      {/* Authentication & Student Switcher Modal */}
      <AuthModal />
    </div>
  );
}

function App() {
  return (
    <StudentProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </StudentProvider>
  );
}

export default App;
