import { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import { useStudent } from "../context/useStudent";
import { User, ShieldCheck, Menu, X, LogOut } from "lucide-react";

export default function TopBar() {
  const { student, userRole, logout } = useStudent();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isTeacher = userRole === "teacher";
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
    <header className="topbar">
      <div className="container topbar-inner">
        {/* Brand Logo & Title */}
        <Link
          to="/"
          className="brand-wrapper"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div className="brand-logo-box">
            <img
              src="/logo.png"
              alt="لوجو منصة العميد"
              className="brand-logo-img"
              onError={(e) => {
                e.target.src = "/favicon.svg";
              }}
            />
          </div>
          <div>
            <div className="brand-title">
              منصة العميد
              <span className="badge-tag">الرياضيات</span>
            </div>
            <div className="brand-subtitle">أ / محمد عبد الخالق</div>
          </div>
        </Link>

        {/* Center Nav Links */}
        <nav className="nav-menu" style={{ justifyContent: "center" }}>
          {isTeacher ? (
            <>
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `nav-link ${isActive ? "active" : ""}`
                }
                style={{
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                }}
              >
                لوحة تحكم المستر 👨‍🏫
              </NavLink>
              <NavLink
                to="/lessons"
                className={({ isActive }) =>
                  `nav-link ${isActive ? "active" : ""}`
                }
                style={{ whiteSpace: "nowrap" }}
              >
                معاينة الدروس
              </NavLink>
              <NavLink
                to="/exams"
                className={({ isActive }) =>
                  `nav-link ${isActive ? "active" : ""}`
                }
                style={{ whiteSpace: "nowrap" }}
              >
                معاينة الامتحانات
              </NavLink>
              <NavLink
                to="/memos"
                className={({ isActive }) =>
                  `nav-link ${isActive ? "active" : ""}`
                }
                style={{ whiteSpace: "nowrap" }}
              >
                مذكرات PDF
              </NavLink>
            </>
          ) : (
            <>
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `nav-link ${isActive ? "active" : ""}`
                }
                style={{ whiteSpace: "nowrap" }}
              >
                الرئيسية
              </NavLink>
              <NavLink
                to="/lessons"
                className={({ isActive }) =>
                  `nav-link ${isActive ? "active" : ""}`
                }
                style={{ whiteSpace: "nowrap" }}
              >
                الدروس
              </NavLink>
              <NavLink
                to="/exams"
                className={({ isActive }) =>
                  `nav-link ${isActive ? "active" : ""}`
                }
                style={{ whiteSpace: "nowrap" }}
              >
                الامتحانات
              </NavLink>
              <NavLink
                to="/memos"
                className={({ isActive }) =>
                  `nav-link ${isActive ? "active" : ""}`
                }
                style={{ whiteSpace: "nowrap" }}
              >
                مذكرات PDF
              </NavLink>
            </>
          )}
        </nav>

        {/* Right Side — flexShrink:0 so it NEVER gets hidden */}
        <div
          className="topbar-actions"
          style={{ flexShrink: 0, gap: "0.6rem" }}
        >
          {/* User Badge */}
          {isTeacher ? (
            <div className="teacher-topbar-badge">
              <ShieldCheck size={15} />
              <span style={{ whiteSpace: "nowrap" }}>أ/ محمد عبد الخالق</span>
            </div>
          ) : (
            <Link
              to="/profile"
              className="student-pill"
              title="عرض وتعديل بيانات الطالب"
              onClick={() => setMobileMenuOpen(false)}
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

          {/* Logout Button */}
          <button
            onClick={logout}
            className="topbar-logout-btn"
            title="تسجيل الخروج"
          >
            <LogOut size={15} className="logout-icon" />
            <span>تسجيل الخروج</span>
          </button>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="mobile-menu-btn"
            aria-label="قائمة التنقل"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-drawer">
          {isTeacher ? (
            <>
              <NavLink
                to="/"
                end
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `mobile-nav-link ${isActive ? "active" : ""}`
                }
                style={{ color: "var(--cyan)" }}
              >
                لوحة تحكم المستر 👨‍🏫
              </NavLink>
              <NavLink
                to="/lessons"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `mobile-nav-link ${isActive ? "active" : ""}`
                }
              >
                معاينة الدروس
              </NavLink>
              <NavLink
                to="/exams"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `mobile-nav-link ${isActive ? "active" : ""}`
                }
              >
                معاينة الامتحانات
              </NavLink>
              <NavLink
                to="/memos"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `mobile-nav-link ${isActive ? "active" : ""}`
                }
              >
                مذكرات الـ PDF
              </NavLink>
            </>
          ) : (
            <>
              <NavLink
                to="/"
                end
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `mobile-nav-link ${isActive ? "active" : ""}`
                }
              >
                الرئيسية
              </NavLink>
              <NavLink
                to="/lessons"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `mobile-nav-link ${isActive ? "active" : ""}`
                }
              >
                الدروس والمحاضرات
              </NavLink>
              <NavLink
                to="/exams"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `mobile-nav-link ${isActive ? "active" : ""}`
                }
              >
                امتحانات التابلت
              </NavLink>
              <NavLink
                to="/memos"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `mobile-nav-link ${isActive ? "active" : ""}`
                }
              >
                مذكرات PDF
              </NavLink>
            </>
          )}

          <div className="mobile-drawer-divider"></div>

          <button
            onClick={() => {
              logout();
              setMobileMenuOpen(false);
            }}
            className="mobile-logout-btn"
          >
            <LogOut size={16} />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      )}
    </header>
  );
}
