import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useStudent } from "../context/useStudent";
import {
  FileText,
  Award,
  ArrowRight,
  CheckCircle2,
  LockKeyhole,
  PlayCircle,
} from "lucide-react";
import ProtectedVideoPlayer from "../Components/ProtectedVideoPlayer";
import { getYouTubeVideoId } from "../utils/youtube";

export default function LessonWatchPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    showToast,
    lessonsList,
    student,
    userRole,
    getStudentVideo,
    getStudentLessonDetails,
    isLoadingLessons,
  } = useStudent();
  const isTeacher = userRole === "teacher";

  const listedLesson = (lessonsList || []).find(
    (item) => String(item.id) === String(id),
  );
  const listedLessonId = listedLesson?.id;
  const [lessonDetailsResult, setLessonDetailsResult] = useState(null);

  useEffect(() => {
    if (!listedLessonId || isTeacher) return undefined;

    let isActive = true;
    getStudentLessonDetails(listedLessonId)
      .then((response) => {
        if (isActive) {
          setLessonDetailsResult({
            lessonId: listedLessonId,
            details: response?.lesson || response,
            error: "",
          });
        }
      })
      .catch((error) => {
        if (!isActive) return;
        setLessonDetailsResult({
          lessonId: listedLessonId,
          details: null,
          error: error?.message || "تعذر جلب تفاصيل الدرس",
        });
        showToast(error?.message || "تعذر جلب تفاصيل الدرس", "error");
      });

    return () => {
      isActive = false;
    };
  }, [getStudentLessonDetails, isTeacher, listedLessonId, showToast]);

  const lessonDetails =
    lessonDetailsResult?.lessonId === listedLessonId
      ? lessonDetailsResult.details
      : null;
  const lessonDetailsError =
    lessonDetailsResult?.lessonId === listedLessonId
      ? lessonDetailsResult.error
      : "";
  const lesson = useMemo(
    () => (listedLesson ? { ...listedLesson, ...(lessonDetails || {}) } : null),
    [listedLesson, lessonDetails],
  );
  const videoId =
    lesson?.videoId ||
    lesson?.video?.id ||
    lesson?.video?.video_id ||
    lesson?.video_id ||
    lesson?.videos?.[0]?.id ||
    null;
  const lessonSequence = (lessonsList || []).filter((item) => {
    const hasVideo =
      item.videoId || item.video?.id || item.video_id || item.videos?.[0]?.id;
    return (
      hasVideo &&
      item.grade === lesson?.grade &&
      item.branch === lesson?.branch
    );
  });
  const currentLessonIndex = lessonSequence.findIndex(
    (item) => String(item.id) === String(lesson?.id),
  );
  const previousLesson =
    (currentLessonIndex > 0 ? lessonSequence[currentLessonIndex - 1] : null) ||
    (lessonsList || []).find(
      (item) =>
        item.grade === lesson?.grade &&
        Number(item.number) === Number(lesson?.number) - 1,
    ) ||
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
    if (isLoadingLessons) {
      return (
        <div className="container" role="status" style={{ padding: "5rem 1rem", textAlign: "center" }}>
          جارٍ تحميل الدرس من الخادم...
        </div>
      );
    }
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
    {lessonDetailsError && (
      <p role="status" style={{ color: "var(--amber)", marginBottom: "1rem" }}>
        تعذر تحميل تفاصيل الدرس الكاملة من الخادم؛ {lessonDetailsError}
      </p>
    )}
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
            padding: "clamp(1rem, 3vw, 1.5rem)",
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
                  fontSize: "clamp(1rem, 3vw, 1.25rem)",
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
              <div
                className="video-access-notice"
                role={videoAccessStatus === "checking" ? "status" : "alert"}
                aria-live="polite"
              >
                {videoAccessStatus === "locked" ? (
                  <>
                    <span className="video-access-notice__icon" aria-hidden="true">
                      <LockKeyhole size={22} />
                    </span>
                    <h2>
                      {"\u0647\u0630\u0627 \u0627\u0644\u062f\u0631\u0633 \u0645\u0642\u0641\u0648\u0644 \u062d\u0627\u0644\u064a\u064b\u0627"}
                    </h2>
                    <p>
                      {previousLesson
                        ? <>{"\u0644\u0644\u0645\u062a\u0627\u0628\u0639\u0629\u060c \u064a\u062c\u0628 \u0645\u0634\u0627\u0647\u062f\u0629 \u0627\u0644\u062f\u0631\u0633 \u0627\u0644\u0633\u0627\u0628\u0642 \u00ab"}{previousLesson.title}{"\u00bb \u0623\u0648\u0644\u064b\u0627. \u0623\u0643\u0645\u0644\u0647 \u062b\u0645 \u062d\u0627\u0648\u0644 \u0641\u062a\u062d \u0647\u0630\u0627 \u0627\u0644\u0641\u064a\u062f\u064a\u0648 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649."}</>
                        : "\u0644\u0644\u0645\u062a\u0627\u0628\u0639\u0629\u060c \u064a\u062c\u0628 \u0645\u0634\u0627\u0647\u062f\u0629 \u0627\u0644\u062f\u0631\u0633 \u0627\u0644\u0633\u0627\u0628\u0642 \u0623\u0648\u0644\u064b\u0627. \u0623\u0643\u0645\u0644\u0647 \u062b\u0645 \u062d\u0627\u0648\u0644 \u0641\u062a\u062d \u0647\u0630\u0627 \u0627\u0644\u0641\u064a\u062f\u064a\u0648 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649."}
                    </p>
                    <Link to={previousLesson ? `/watch/${previousLesson.id}` : "/lessons"} className="btn-primary video-access-notice__action">
                      <PlayCircle size={17} />
                      <span>{previousLesson ? "\u0645\u0634\u0627\u0647\u062f\u0629 \u0627\u0644\u062f\u0631\u0633 \u0627\u0644\u0633\u0627\u0628\u0642" : "\u0627\u0644\u0639\u0648\u062f\u0629 \u0625\u0644\u0649 \u0627\u0644\u062f\u0631\u0648\u0633"}</span>
                    </Link>
                  </>
                ) : videoAccessStatus === "checking"
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
              {isTeacher && (
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
              )}
            </div>
          </div>

          {/* Explanation / Keypoints Tabs */}
          {isTeacher && (
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
                  gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))",
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
          )}
        </div>
      </div>
    </div>
  );
}
