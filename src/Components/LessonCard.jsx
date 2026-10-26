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

  const formattedNumber =
    typeof lesson.number === "number" && lesson.number < 10
      ? `0${lesson.number}`
      : lesson.number || "01";

  return (
    <div className="lesson-card">
      <div className="lesson-info-group">
        {/* Number Badge */}
        <div className="lesson-num-badge">{formattedNumber}</div>

        <div style={{ minWidth: 0, flex: 1 }}>
          <h3 className="lesson-title">{lesson.title}</h3>
          <div className="lesson-meta">
            {lesson.branch && (
              <span
                style={{
                  color: "#a5b4fc",
                  background: "rgba(99, 102, 241, 0.14)",
                  padding: "2px 8px",
                  borderRadius: "999px",
                  border: "1px solid rgba(99, 102, 241, 0.28)",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                }}
              >
                {lesson.branch}
              </span>
            )}
            {lesson.grade && (
              <span
                style={{
                  color: "var(--cyan)",
                  background: "rgba(6, 182, 212, 0.12)",
                  padding: "2px 8px",
                  borderRadius: "999px",
                  border: "1px solid rgba(6, 182, 212, 0.25)",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                }}
              >
                {lesson.grade}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="lesson-card-actions">
        <Link
          to={`/watch/${lesson.id}`}
          className="btn-primary"
          style={{ padding: "8px 16px", fontSize: "0.82rem" }}
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
              borderColor: "rgba(245, 158, 11, 0.35)",
            }}
          >
            <Award size={15} />
            <span>امتحان الدرس</span>
          </Link>
        )}

        {isTeacher && (
          <button
            type="button"
            onClick={() =>
              showToast(
                `جاري تجهيز وتحميل مذكرة الدرس PDF: ${lesson.pdfFile || lesson.title} 📥`,
              )
            }
            className="btn-secondary btn-icon-only"
            title="تحميل مذكرة الدرس PDF"
          >
            <FileText size={15} />
          </button>
        )}

        {isTeacher && onDelete && (
          <button
            type="button"
            onClick={() => onDelete(lesson)}
            className="btn-secondary btn-icon-only"
            style={{
              color: "#fb7185",
              borderColor: "rgba(244, 63, 94, 0.35)",
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
