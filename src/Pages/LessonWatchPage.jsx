import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useStudent } from "../context/useStudent";
import { FileText, Award, ArrowRight, CheckCircle2 } from "lucide-react";
import ProtectedVideoPlayer from "../Components/ProtectedVideoPlayer";
import { getYouTubeVideoId } from "../utils/youtube";

export default function LessonWatchPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast, lessonsList, student, userRole, getStudentVideo } =
    useStudent();
  const isTeacher = userRole === "teacher";

  const lesson = (lessonsList || []).find((l) => l.id === parseInt(id));
  const videoId =
    lesson?.videoId ||
    lesson?.video?.id ||
    lesson?.video_id ||
    lesson?.videos?.[0]?.id ||
    null;
  const [videoAccess, setVideoAccess] = useState({
    id: null,
    status: "checking",
    video: null,
  });

  useEffect(() => {
    if (!lesson || isTeacher) {
      return;
    }

    if (!videoId) {
      return;
    }

    let isActive = true;

    getStudentVideo(videoId)
      .then((response) => {
        if (!isActive) return;

        const video =
          response?.video ||
          response?.data?.video ||
          response?.data ||
          response;

        const resolvedVideoUrl =
          video?.video_url ||
          video?.videoUrl ||
          video?.url ||
          lesson.videoUrl;
        const isLocked =
          video?.is_locked ||
          video?.access_status === "locked" ||
          video?.status === "locked";

        setVideoAccess({
          id: videoId,
          status: isLocked
            ? "locked"
            : getYouTubeVideoId(resolvedVideoUrl)
              ? "allowed"
              : "unavailable",
          video,
        });
      })
      .catch((error) => {
        if (!isActive) return;

        setVideoAccess({
          id: videoId,
          status: error?.isLocked || error?.status === 403 ? "locked" : "error",
        });
      });

    return () => {
      isActive = false;
    };
  }, [getStudentVideo, isTeacher, lesson, videoId]);

  const videoAccessStatus = isTeacher
    ? videoId &&
      getYouTubeVideoId(
        lesson.videoUrl || lesson.video?.video_url || lesson.video?.url,
      )
      ? "allowed"
      : "unavailable"
    : !videoId
      ? "unavailable"
      : videoAccess.id === videoId
      ? videoAccess.status
      : "checking";

  if (!lesson) {
    return (
      <div
        className="container"
        style={{ textAlign: "center", padding: "5rem 1rem" }}
      >
        <h2>الدرس غير موجود</h2>
        <Link
          to="/lessons"
          className="btn-primary"
          style={{ marginTop: "1rem" }}
        >
          العودة للدروس
        </Link>
      </div>
    );
  }

  // If student tries to view another grade's lesson
  const isDifferentGrade =
    !isTeacher &&
    student?.grade &&
    lesson.grade &&
    student.grade !== lesson.grade;

  if (isDifferentGrade) {
    return (
      <div
        className="container"
        style={{ textAlign: "center", padding: "5rem 1rem", maxWidth: "600px" }}
      >
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid rgba(244, 63, 94, 0.3)",
            borderRadius: "var(--radius-xl)",
            padding: "2.5rem 1.5rem",
          }}
        >
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background: "rgba(244, 63, 94, 0.15)",
              color: "var(--rose)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1rem",
              fontSize: "1.8rem",
            }}
          >
            🔒
          </div>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 900, color: "#fff" }}>
            محتوى غير مصرح
          </h2>
          <p
            style={{
              fontSize: "0.85rem",
              color: "var(--text-muted)",
              marginTop: "8px",
              lineHeight: "1.6",
            }}
          >
            هذا الدرس مخصص لطلاب{" "}
            <strong style={{ color: "var(--cyan)" }}>({lesson.grade})</strong>،
            وأنت مسجل في{" "}
            <strong style={{ color: "var(--amber)" }}>({student.grade})</strong>
            .
          </p>
          <Link
            to="/lessons"
            className="btn-primary"
            style={{ marginTop: "1.5rem", display: "inline-flex" }}
          >
            الانتقال لدروس صفك الدراسي
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: "1.5rem" }}>
      {/* Back Button */}
      <div style={{ marginBottom: "1.25rem" }}>
        <button
          onClick={() => navigate(-1)}
          className="btn-secondary"
          style={{ fontSize: "0.8rem", padding: "6px 14px" }}
        >
          <ArrowRight size={14} />
          <span>الرجوع</span>
        </button>
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.5rem" }}
      >
        {/* Main Video Box */}
        <div
          style={{
            background: "var(--bg-card)",
            borderRadius: "var(--radius-xl)",
            padding: "1.5rem",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1rem",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                className="lesson-num-badge"
                style={{ width: "36px", height: "36px", fontSize: "0.9rem" }}
              >
                {lesson.number}
              </span>
              <h1
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 800,
                  color: "#ffffff",
                }}
              >
                {lesson.title}
              </h1>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "0.75rem",
                color: "var(--text-muted)",
              }}
            >
              <span className="badge-tag">{lesson.branch}</span>
              <span>{lesson.grade}</span>
            </div>
          </div>

          {/* Secure Protected Video Player */}
          <div style={{ marginBottom: "1.5rem" }}>
            {videoAccessStatus === "allowed" ? (
              <ProtectedVideoPlayer
                key={videoId}
                videoUrl={
                  videoAccess.video?.video_url ||
                  videoAccess.video?.videoUrl ||
                  videoAccess.video?.url ||
                  lesson.videoUrl
                }
                title={lesson.title}
                duration={lesson.duration}
                thumbnail={lesson.videoThumbnail || "/teacher.png"}
                videoId={videoId}
              />
            ) : (
              <div className="form-card" style={{ textAlign: "center" }}>
                {videoAccessStatus === "checking"
                  ? "جاري التحقق من صلاحية مشاهدة الفيديو..."
                  : videoAccessStatus === "locked"
                    ? "هذا الفيديو مقفل أو غير متاح لاشتراكك."
                    : videoAccessStatus === "unavailable"
                      ? "لا يوجد فيديو مرتبط بهذه المحاضرة حتى الآن."
                    : "تعذر التحقق من صلاحية مشاهدة الفيديو. يُرجى المحاولة مرة أخرى لاحقًا."}
              </div>
            )}
          </div>

          {/* Action Row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "1rem",
              paddingBottom: "1.25rem",
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
            >
              <Link to={`/quiz/${lesson.id}`} className="btn-primary">
                <Award size={16} />
                <span>امتحان تقييمي للدرس</span>
              </Link>
              <button
                onClick={() =>
                  showToast(
                    `تم بدء تحميل مذكرة: ${lesson.pdfFile || lesson.title} 📥`,
                  )
                }
                className="btn-secondary"
              >
                <FileText size={16} />
                <span>تحميل المذكرة PDF</span>
              </button>
            </div>
          </div>

          {/* Explanation / Keypoints Tabs */}
          <div style={{ marginTop: "1.25rem" }}>
            <h3
              style={{
                fontSize: "1rem",
                fontWeight: 800,
                color: "#ffffff",
                marginBottom: "0.5rem",
              }}
            >
              عن هذا الدرس:
            </h3>
            <p
              style={{
                fontSize: "0.85rem",
                color: "var(--text-muted)",
                lineHeight: "1.7",
                marginBottom: "1.25rem",
              }}
            >
              {lesson.description}
            </p>

            <h4
              style={{
                fontSize: "0.9rem",
                fontWeight: 700,
                color: "var(--cyan)",
                marginBottom: "0.75rem",
              }}
            >
              أهم النقاط التي يغطيها الشرح:
            </h4>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "0.75rem",
              }}
            >
              {lesson.keyPoints?.map((pt, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "rgba(10, 16, 30, 0.7)",
                    border: "1px solid var(--border-subtle)",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-md)",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "0.8rem",
                    color: "var(--text-main)",
                  }}
                >
                  <CheckCircle2
                    size={16}
                    style={{ color: "var(--emerald)", flexShrink: 0 }}
                  />
                  <span>{pt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
