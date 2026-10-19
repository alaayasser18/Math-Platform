import { Link } from "react-router-dom";
import TeacherBanner from "../Components/TeacherBanner";
import LessonCard from "../Components/LessonCard";
import { useStudent } from "../context/useStudent";
import { Video, FileQuestion, BookOpen, ArrowLeft } from "lucide-react";

export default function HomePage() {
  const { student, lessonsList } = useStudent();
  const currentGrade = student?.grade || "";

  // Filter lessons for the current student's grade
  const displayLessons = currentGrade
    ? (lessonsList || []).filter((l) => l.grade === currentGrade)
    : lessonsList || [];

  return (
    <div className="container">
      {/* Teacher Hero Banner matching Figma */}
      <TeacherBanner />

      {/* 3 Highlight Feature Cards directly beneath Hero */}
      <div className="features-grid">
        <Link to="/lessons" className="feature-card">
          <div>
            <div className="feature-icon-box" style={{ color: "var(--cyan)" }}>
              <Video size={24} />
            </div>
            <h3 className="feature-title">محاضرات وشروحات فيديو</h3>
            <p className="feature-desc">
              شرح تفصيلي مبسط لجميع أجزاء المنهج وحل مسائل المستويات العليا
              والتطبيقات الهندسية.
            </p>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "0.8rem",
              fontWeight: 700,
              color: "var(--cyan)",
            }}
          >
            <span>تصفح دروس صفك ({displayLessons.length})</span>
            <ArrowLeft size={16} />
          </div>
        </Link>

        <Link to="/exams" className="feature-card">
          <div>
            <div className="feature-icon-box" style={{ color: "#818cf8" }}>
              <FileQuestion size={24} />
            </div>
            <h3 className="feature-title">بنك الأسئلة والامتحانات</h3>
            <p className="feature-desc">
              اختبارات إلكترونية دورية بنظام التابلت الحديث مع تصحيح تلقائي فوري
              وتفسير الإجابات.
            </p>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "0.8rem",
              fontWeight: 700,
              color: "#818cf8",
            }}
          >
            <span>ابدأ الامتحانات التقييمية</span>
            <ArrowLeft size={16} />
          </div>
        </Link>

        <Link to="/memos" className="feature-card">
          <div>
            <div
              className="feature-icon-box"
              style={{ color: "var(--purple)" }}
            >
              <BookOpen size={24} />
            </div>
            <h3 className="feature-title">مذكرات العميد وملخصات PDF</h3>
            <p className="feature-desc">
              سلسلة مذكرات العميد الأصلية الشاملة القوانين والأفكار ونماذج
              الوزارة للتحميل المباشر.
            </p>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "0.8rem",
              fontWeight: 700,
              color: "var(--purple)",
            }}
          >
            <span>تحميل مذكرات صفك</span>
            <ArrowLeft size={16} />
          </div>
        </Link>
      </div>

      {/* Recommended Lessons for Student's Grade */}
      <div>
        <div className="section-header">
          <div>
            <h2 className="section-title">
              المحاضرات والشروحات المقررة لـ {student?.name || "الطالب"}
            </h2>
            <p className="section-desc">
              محتوى تعليمي حصري لـ ({currentGrade})
            </p>
          </div>
          <Link to="/lessons" className="btn-secondary">
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              عرض جميع دروس {currentGrade} ({displayLessons.length})
            </span>
            <ArrowLeft size={14} />
          </Link>
        </div>

        <div>
          {displayLessons.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "3rem 1rem",
                background: "var(--bg-card)",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <p style={{ fontWeight: 800, fontSize: "1rem", color: "#fff" }}>
                لا توجد محاضرات منشورة لهذا الصف بعد
              </p>
            </div>
          ) : (
            displayLessons.map((lesson) => (
              <LessonCard key={lesson.id} lesson={lesson} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
