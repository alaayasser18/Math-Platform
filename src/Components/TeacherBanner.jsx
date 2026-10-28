import { Link } from "react-router-dom";
import { useStudent } from "../context/useStudent";
import { PlayCircle, Sparkles, CheckCircle2, FileQuestion } from "lucide-react";
import { TEACHER_INFO } from "../data/platformData";

export default function TeacherBanner() {
  const { student } = useStudent();
  const studentName = student?.name || "طالب متميز";
  const studentGrade =
    student?.grade ||
    student?.grade_name ||
    student?.subscription?.grade?.name ||
    "";

  return (
    <div className="hero-card">
      <div className="hero-glow-edge"></div>

      <div className="hero-grid">
        {/* Left Side Info (Arabic Right) */}
        <div>
          <div className="hero-welcome-badge">
            <Sparkles size={14} />
            <span>
              أهلاً بك يا <strong>{studentName}</strong> في منصة الرياضيات
            </span>
            {studentGrade && (
              <span
                style={{
                  background: "rgba(6, 182, 212, 0.25)",
                  padding: "1px 6px",
                  borderRadius: "4px",
                  fontSize: "0.65rem",
                }}
              >
                {studentGrade}
              </span>
            )}
          </div>

          <h1 className="hero-title">
            مستر / <span>محمد عبد الخالق</span>
          </h1>

          <div className="hero-subtitle">{TEACHER_INFO.title}</div>

          <p className="hero-desc">{TEACHER_INFO.quote}</p>

          {/* 3 Stats Counters matching Figma */}
          <div className="stats-row">
            <div className="stat-box">
              <div className="stat-box-val" style={{ color: "var(--cyan)" }}>
                +2500
              </div>
              <div className="stat-box-lbl">طالب متفوق</div>
            </div>
            <div className="stat-box">
              <div className="stat-box-val" style={{ color: "#818cf8" }}>
                +120
              </div>
              <div className="stat-box-lbl">محاضرة ودرس</div>
            </div>
            <div className="stat-box">
              <div className="stat-box-val" style={{ color: "var(--purple)" }}>
                99%
              </div>
              <div className="stat-box-lbl">نسبة النجاح</div>
            </div>
          </div>

          <div className="hero-actions">
            <Link to="/lessons" className="btn-primary">
              <PlayCircle size={18} />
              <span>استعراض المحاضرات والدروس</span>
            </Link>
            <Link to="/exams" className="btn-secondary">
              <FileQuestion size={16} />
              <span>بنك الأسئلة والامتحانات</span>
            </Link>
          </div>
        </div>

        {/* Right Side Teacher Image Frame (Arabic Left) */}
        <div>
          <div className="teacher-frame">
            <img
              src="/teacher.png"
              alt="مستر محمد عبد الخالق"
              className="teacher-img"
              onError={(e) => {
                e.target.src = "/logo.png";
              }}
            />
            <div className="teacher-tag">
              <div>
                <div
                  style={{ fontSize: "0.8rem", fontWeight: 800, color: "#fff" }}
                >
                  أ / محمد عبد الخالق
                </div>
                <div style={{ fontSize: "0.7rem", color: "var(--cyan)" }}>
                  سلسلة مذكرات العميد في الرياضيات
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "0.75rem",
                  color: "var(--emerald)",
                  fontWeight: 700,
                }}
              >
                <CheckCircle2 size={14} />
                <span>معتمد</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
