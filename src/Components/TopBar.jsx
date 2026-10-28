import { useState, useEffect } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { useStudent } from "../context/useStudent";
import {
  User,
  ShieldCheck,
  Menu,
  X,
  LogOut,
  Home,
  Video,
  FileQuestion,
  BookOpen,
  LayoutDashboard,
} from "lucide-react";

export default function TopBar() {
  const { student, userRole, logout } = useStudent();
  const { pathname } = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  // Update the top bar appearance when scrolling.
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const isTeacher = userRole === "teacher";
  const homePath = isTeacher ? "/teacher-dashboard" : "/";

  const isSectionActive = (target) => {
    if (target === "/lessons") {
      return pathname === target || pathname.startsWith("/watch/");
    }

    if (target === "/exams") {
      return pathname === target || pathname.startsWith("/quiz/");
    }

    return (
      pathname === target ||
      (target !== "/" && pathname.startsWith(`${target}/`))
    );
  };

  const getNavClassName =
    (target, className) =>
    ({ isActive }) =>
      `${className} ${isActive || isSectionActive(target) ? "active" : ""}`;

  const studentName = isTeacher
    ? "لوحة المعلم"
    : student?.name ||
      (student?.first_name
        ? `${student.first_name} ${student.last_name || ""}`.trim()
        : "طالب");

  const studentGrade = student?.grade || "";

  const studentCode =
    (typeof student?.code === "string" && student.code) ||
    (typeof student?.subscription_code === "string" &&
      student.subscription_code) ||
    student?.subscription_code?.code ||
    student?.subscription?.code ||
    student?.subscription?.subscription_code ||
    "";

  return (
    <>
      <header className={`topbar${isScrolled ? " is-scrolled" : ""}`}>
        <div className="container topbar-inner">
          {/* Logo and Brand */}
          <Link
            to={homePath}
            className="brand-wrapper"
            onClick={closeMobileMenu}
          >
            <div className="brand-logo-box">
              <img
                src="/logo.png"
                alt="لوجو منصة العميد"
                className="brand-logo-img"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "/favicon.svg";
                }}
              />
            </div>

            <div className="brand-text-col">
              <div className="brand-title">
                <span>منصة العميد</span>
                <span className="badge-tag">الرياضيات</span>
              </div>
              <div className="brand-subtitle">أ / محمد عبد الخالق</div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="nav-menu">
            {isTeacher ? (
              <>
                <NavLink
                  to={homePath}
                  end
                  className={getNavClassName(homePath, "nav-link")}
                >
                  <LayoutDashboard size={15} />
                  <span>لوحة الإدارة</span>
                </NavLink>

                <NavLink
                  to="/lessons"
                  className={getNavClassName("/lessons", "nav-link")}
                >
                  <Video size={15} />
                  <span>معاينة الدروس</span>
                </NavLink>

                <NavLink
                  to="/exams"
                  className={getNavClassName("/exams", "nav-link")}
                >
                  <FileQuestion size={15} />
                  <span>معاينة الامتحانات</span>
                </NavLink>

                <NavLink
                  to="/memos"
                  className={getNavClassName("/memos", "nav-link")}
                >
                  <BookOpen size={15} />
                  <span>مذكرات PDF</span>
                </NavLink>
              </>
            ) : (
              <>
                <NavLink
                  to="/"
                  end
                  className={getNavClassName("/", "nav-link")}
                >
                  <Home size={15} />
                  <span>الرئيسية</span>
                </NavLink>

                <NavLink
                  to="/lessons"
                  className={getNavClassName("/lessons", "nav-link")}
                >
                  <Video size={15} />
                  <span>الدروس</span>
                </NavLink>

                <NavLink
                  to="/exams"
                  className={getNavClassName("/exams", "nav-link")}
                >
                  <FileQuestion size={15} />
                  <span>الامتحانات</span>
                </NavLink>

                <NavLink
                  to="/memos"
                  className={getNavClassName("/memos", "nav-link")}
                >
                  <BookOpen size={15} />
                  <span>مذكرات PDF</span>
                </NavLink>
              </>
            )}
          </nav>

          {/* User Actions */}
          <div className="topbar-actions">
            {isTeacher ? (
              <div
                className="teacher-topbar-badge"
                title="حساب المعلم: أ/ محمد عبد الخالق"
              >
                <ShieldCheck size={16} />
                <span className="teacher-badge-text">أ/ محمد عبد الخالق</span>
              </div>
            ) : (
              <Link
                to="/profile"
                className="student-pill"
                title="عرض وتعديل بيانات الطالب"
                onClick={closeMobileMenu}
              >
                <div className="student-pill-info">
                  <div className="student-pill-name">
                    <span>{studentName}</span>
                  </div>

                  <div className="student-pill-sub">
                    <span className="student-pill-grade">{studentGrade}</span>
                    <span className="student-pill-code">[{studentCode}]</span>
                  </div>
                </div>

                <div className="student-pill-avatar">
                  {studentName ? (
                    studentName.trim().charAt(0)
                  ) : (
                    <User size={18} />
                  )}
                </div>
              </Link>
            )}

            {/* Desktop Logout */}
            <button
              onClick={logout}
              className="topbar-logout-btn"
              title="تسجيل الخروج"
            >
              <LogOut size={15} className="logout-icon" />
              <span>تسجيل الخروج</span>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className={`mobile-menu-btn${mobileMenuOpen ? " is-open" : ""}`}
              aria-label="قائمة التنقل"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation-drawer"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-drawer-backdrop" onClick={closeMobileMenu}>
          <div
            id="mobile-navigation-drawer"
            className="mobile-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer User Card */}
            <div className="drawer-user-card">
              {isTeacher ? (
                <div className="drawer-user-info">
                  <div className="drawer-avatar teacher-avatar">
                    <ShieldCheck size={22} />
                  </div>

                  <div>
                    <div className="drawer-user-name">أ/ محمد عبد الخالق</div>
                    <div className="drawer-user-role">
                      معلم الرياضيات • لوحة الإدارة
                    </div>
                  </div>
                </div>
              ) : (
                <div className="drawer-user-info">
                  <div className="drawer-avatar student-avatar">
                    {studentName ? (
                      studentName.trim().charAt(0)
                    ) : (
                      <User size={20} />
                    )}
                  </div>

                  <div>
                    <div className="drawer-user-name">{studentName}</div>

                    <div className="drawer-user-sub">
                      {studentGrade && (
                        <span className="drawer-pill">{studentGrade}</span>
                      )}
                      {studentCode && (
                        <span className="drawer-code">[{studentCode}]</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Navigation Links */}
            <div className="drawer-links-group">
              {isTeacher ? (
                <>
                  <NavLink
                    to={homePath}
                    end
                    onClick={closeMobileMenu}
                    className={getNavClassName(homePath, "mobile-nav-link")}
                  >
                    <LayoutDashboard size={18} />
                    <span>لوحة تحكم المستر</span>
                  </NavLink>

                  <NavLink
                    to="/lessons"
                    onClick={closeMobileMenu}
                    className={getNavClassName("/lessons", "mobile-nav-link")}
                  >
                    <Video size={18} />
                    <span>معاينة الدروس</span>
                  </NavLink>

                  <NavLink
                    to="/exams"
                    onClick={closeMobileMenu}
                    className={getNavClassName("/exams", "mobile-nav-link")}
                  >
                    <FileQuestion size={18} />
                    <span>معاينة الامتحانات</span>
                  </NavLink>

                  <NavLink
                    to="/memos"
                    onClick={closeMobileMenu}
                    className={getNavClassName("/memos", "mobile-nav-link")}
                  >
                    <BookOpen size={18} />
                    <span>مذكرات PDF</span>
                  </NavLink>
                </>
              ) : (
                <>
                  <NavLink
                    to="/"
                    end
                    onClick={closeMobileMenu}
                    className={getNavClassName("/", "mobile-nav-link")}
                  >
                    <Home size={18} />
                    <span>الرئيسية</span>
                  </NavLink>

                  <NavLink
                    to="/lessons"
                    onClick={closeMobileMenu}
                    className={getNavClassName("/lessons", "mobile-nav-link")}
                  >
                    <Video size={18} />
                    <span>الدروس والمحاضرات</span>
                  </NavLink>

                  <NavLink
                    to="/exams"
                    onClick={closeMobileMenu}
                    className={getNavClassName("/exams", "mobile-nav-link")}
                  >
                    <FileQuestion size={18} />
                    <span>امتحانات التابلت</span>
                  </NavLink>

                  <NavLink
                    to="/memos"
                    onClick={closeMobileMenu}
                    className={getNavClassName("/memos", "mobile-nav-link")}
                  >
                    <BookOpen size={18} />
                    <span>مذكرات PDF</span>
                  </NavLink>

                  <NavLink
                    to="/profile"
                    onClick={closeMobileMenu}
                    className={getNavClassName("/profile", "mobile-nav-link")}
                  >
                    <User size={18} />
                    <span>الملف الشخصي للطالب</span>
                  </NavLink>
                </>
              )}
            </div>

            {/* Drawer Logout */}
            <div className="drawer-footer">
              <button
                onClick={() => {
                  closeMobileMenu();
                  logout();
                }}
                className="mobile-logout-btn"
              >
                <LogOut size={17} />
                <span>تسجيل الخروج من الحساب</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
