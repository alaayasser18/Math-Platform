import { Link } from "react-router-dom";
import { PlayCircle, Award, FileText, Trash2 } from "lucide-react";
import { useStudent } from "../context/useStudent";

export default function LessonCard({ lesson, onDelete }) {
  const { showToast, userRole, studentExamsList } = useStudent();
  const isTeacher = userRole === "teacher";
  const studentExam = (studentExamsList || []).find(
    (exam) =>
      String(exam.lesson_id || exam.lesson?.id) === String(lesson.id),
  );
  const examRouteId = isTeacher
    ? lesson.exam_id || lesson.exam?.id || lesson.id
    : studentExam?.id || studentExam?.exam_id;

  return (
    <div className="lesson-card">
      <div className="lesson-info-group">
        {/* Number Badge (Matches 01, 02 in Figma) */}
        <div className="lesson-num-badge">{lesson.number}</div>

        <div>
          <h3 className="lesson-title">{lesson.title}</h3>
          <div className="lesson-meta">
            <span
              style={{
                color: "#a5b4fc",
                background: "rgba(99, 102, 241, 0.15)",
                padding: "2px 8px",
                borderRadius: "4px",
                border: "1px solid rgba(99, 102, 241, 0.25)",
              }}
            >
              {lesson.branch}
            </span>
            <span
              style={{
                color: "var(--cyan)",
                background: "rgba(6, 182, 212, 0.12)",
                padding: "2px 8px",
                borderRadius: "4px",
                border: "1px solid rgba(6, 182, 212, 0.2)",
              }}
            >
              {lesson.grade}
            </span>
          </div>
        </div>
      </div>

      <div className="lesson-card-actions" style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        <Link
          to={`/watch/${lesson.id}`}
          className="btn-primary"
          style={{ padding: "8px 16px", fontSize: "0.8rem" }}
        >
          <PlayCircle size={15} />
          <span>مشاهدة الشرح</span>
        </Link>
        {examRouteId && (
          <Link
            to={`/quiz/${examRouteId}`}
            className="btn-secondary"
            style={{
              padding: "8px 14px",
              fontSize: "0.8rem",
              color: "var(--amber)",
            }}
          >
            <Award size={15} />
            <span>امتحان الدرس</span>
          </Link>
        )}
        {isTeacher && (
          <button
            onClick={() =>
              showToast(
                `جاري تجهيز وتحميل مذكرة الدرس PDF: ${lesson.pdfFile || lesson.title} 📥`,
              )
            }
            className="btn-secondary"
            style={{ padding: "8px 12px" }}
            title="تحميل مذكرة الدرس PDF"
          >
            <FileText size={15} />
          </button>
        )}
        {isTeacher && onDelete && (
          <button
            onClick={() => onDelete(lesson)}
            className="btn-secondary"
            style={{
              padding: "8px 12px",
              color: "#fb7185",
              borderColor: "rgba(244, 63, 94, 0.3)",
            }}
            title="حذف هذا الدرس"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
