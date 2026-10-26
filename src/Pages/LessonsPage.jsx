import { useState, useMemo, useEffect } from "react";
import LessonCard from "../Components/LessonCard";
import GradeFilter from "../Components/GradeFilter";
import useUrlState from "../hooks/useUrlState";
import { useStudent } from "../context/useStudent";
import { GRADES, BRANCHES } from "../data/platformData";
import {
  Search,
  BookOpen,
  GraduationCap,
  Shield,
  RefreshCw,
  Plus,
  Video,
  X,
  Trash2,
  AlertTriangle,
  FileText,
  Clock,
  RotateCcw,
} from "lucide-react";
import { getYouTubeVideoId } from "../utils/youtube";

const LESSON_URL_SCHEMA = {
  grade: {
    defaultValue: BRANCHES[0],
    normalize: (value) => value.slice(0, 120),
  },
  branch: {
    defaultValue: BRANCHES[0],
    normalize: (value) => value.slice(0, 120),
  },
  search: {
    defaultValue: "",
    normalize: (value) => value.slice(0, 120),
  },
};

export default function LessonsPage() {
  const {
    student,
    lessonsList,
    userRole,
    fetchLessons,
    isLoadingLessons,
    addLesson,
    deleteLesson,
    showToast,
    saveAdminLessonQuiz,
  } = useStudent();
  const isTeacher = userRole === "teacher";

  const studentGrade = student?.grade || "";
  const [urlState, setUrlState] = useUrlState(LESSON_URL_SCHEMA);
  const selectedGrade = isTeacher ? urlState.grade : studentGrade;
  const selectedBranch = urlState.branch;
  const searchQuery = urlState.search;
  const setSelectedGrade = (grade) =>
    setUrlState({ grade, branch: BRANCHES[0] });
  const setSelectedBranch = (branch) => setUrlState({ branch });

  // Teacher Add Lesson Modal State
  const [isAddLessonOpen, setIsAddLessonOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [deleteConfirmationLesson, setDeleteConfirmationLesson] = useState(null);

  const [newLessonData, setNewLessonData] = useState({
    title: "",
    branch: BRANCHES[0] || "التفاضل والتكامل",
    grade: GRADES[0].name,
    gradeId: GRADES[0].id,
    duration: "",
    videoUrl: "",
    pdfFile: "",
    description: "",
    quizQuestion: "",
    quizOption1: "",
    quizOption2: "",
    quizOption3: "",
    quizOption4: "",
    quizCorrectOption: 1,
  });
  const [durationStatus, setDurationStatus] = useState("");

  useEffect(() => {
    const url = newLessonData.videoUrl.trim();
    if (!isAddLessonOpen || !url) return undefined;

    let cancelled = false;
    let player;
    let video;
    let pollTimer;
    let timeoutTimer;
    const saveDuration = (seconds) => {
      if (cancelled || !Number.isFinite(seconds) || seconds <= 0) return;
      setNewLessonData((current) => ({ ...current, duration: `${Math.ceil(seconds / 60)} دقيقة` }));
      setDurationStatus("تم تحديد المدة تلقائيًا");
    };

    const youtubeId = getYouTubeVideoId(url);
    if (youtubeId) {
      const createPlayer = (YT) => {
        if (cancelled) return;
        setDurationStatus("جارٍ قراءة المدة من YouTube...");
        const container = document.createElement("div");
        container.style.cssText = "position:fixed;left:-10000px;top:0;width:320px;height:180px";
        document.body.appendChild(container);
        player = new YT.Player(container, {
          videoId: youtubeId,
          events: {
            onReady: (event) => {
              const readDuration = () => saveDuration(event.target.getDuration());
              readDuration();
              pollTimer = window.setInterval(readDuration, 500);
              timeoutTimer = window.setTimeout(() => {
                window.clearInterval(pollTimer);
                if (!cancelled) setDurationStatus((status) =>
                  status === "تم تحديد المدة تلقائيًا" ? status : "تعذر قراءة المدة؛ تأكدي أن الفيديو متاح",
                );
              }, 8000);
            },
            onError: () => setDurationStatus("تعذر قراءة مدة هذا الفيديو"),
          },
        });
      };

      if (window.YT?.Player) {
        createPlayer(window.YT);
      } else {
        const previousReady = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          previousReady?.();
          createPlayer(window.YT);
        };
        if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
          const script = document.createElement("script");
          script.src = "https://www.youtube.com/iframe_api";
          script.onerror = () => setDurationStatus("تعذر الاتصال بـ YouTube لقراءة المدة");
          document.head.appendChild(script);
        }
      }
    } else if (/\.mp4(?:$|[?#])/i.test(url)) {
      video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => saveDuration(video.duration);
      video.onerror = () => setDurationStatus("تعذر قراءة مدة ملف الفيديو");
      video.src = url;
    }

    return () => {
      cancelled = true;
      window.clearInterval(pollTimer);
      window.clearTimeout(timeoutTimer);
      video?.removeAttribute("src");
      video?.load();
      player?.destroy();
    };
  }, [isAddLessonOpen, newLessonData.videoUrl]);

  useEffect(() => {
    if (typeof fetchLessons === "function") {
      fetchLessons();
    }
  }, [fetchLessons]);

  // If teacher, they can view all grades; if student, locked strictly to student's grade
  const effectiveGrade = isTeacher ? selectedGrade : studentGrade;


  const filteredLessons = useMemo(() => {
    return (lessonsList || []).filter((lesson) => {
      const matchGrade =
        effectiveGrade === BRANCHES[0] || lesson.grade === effectiveGrade;
      const matchBranch =
        selectedBranch === BRANCHES[0] || lesson.branch === selectedBranch;
      const matchSearch =
        lesson.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lesson.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lesson.branch?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchGrade && matchBranch && matchSearch;
    });
  }, [lessonsList, effectiveGrade, selectedBranch, searchQuery]);

  // Extract unique branches available for this grade
  const gradeBranches = useMemo(() => {
    const branchesInGrade = new Set(
      (lessonsList || [])
        .filter((l) => effectiveGrade === BRANCHES[0] || l.grade === effectiveGrade)
        .map((l) => l.branch?.trim())
        .filter(Boolean),
    );
    return [BRANCHES[0], ...Array.from(branchesInGrade)];
  }, [lessonsList, effectiveGrade]);

  const gradeOptions = useMemo(() => {
    const gradesInLessons = new Map();
    (lessonsList || []).forEach((lesson) => {
      if (lesson.grade) gradesInLessons.set(lesson.grade, lesson.grade);
    });
    return Array.from(gradesInLessons, ([value, label]) => ({ value, label }));
  }, [lessonsList]);

  const handleSaveLesson = async (e) => {
    e.preventDefault();
    if (!newLessonData.title.trim()) {
      showToast("يرجى كتابة عنوان المحاضرة أولاً", "error");
      return;
    }
    const answerOptions = [1, 2, 3, 4].map((number) =>
      String(newLessonData[`quizOption${number}`] || "").trim(),
    );
    const hasQuizContent = newLessonData.quizQuestion.trim() || answerOptions.some(Boolean);
    if (hasQuizContent && (!newLessonData.quizQuestion.trim() || answerOptions.some((option) => !option))) {
      showToast("لو هتضيفي سؤال، اكتبي السؤال والاختيارات الأربعة.", "error");
      return;
    }
    if (!newLessonData.duration) {
      showToast("أدخلي رابط YouTube أو MP4 وانتظري قراءة مدة الفيديو تلقائيًا.", "error");
      return;
    }

    const matchedGrade = GRADES.find((g) => g.name === newLessonData.grade) || GRADES[0];

    setIsProcessing(true);
    try {
      const res = await addLesson({
        ...newLessonData,
        pdfFile: `${newLessonData.title.trim()}.pdf`,
        gradeId: matchedGrade.id,
        grade_id: matchedGrade.numericId || 1,
      });

      if (res?.success) {
        let quizError = "";
        const lessonId = Number(res.data?.id);
        if (hasQuizContent && lessonId) {
          try {
            const quizResult = await saveAdminLessonQuiz(lessonId, {
              title: `اختبار محاضرة: ${newLessonData.title.trim()}`,
              description: "",
              duration_minutes: 10,
              passing_percentage: 60,
              questions: [
                {
                  question_text: newLessonData.quizQuestion.trim(),
                  points: 1,
                  sort_order: 1,
                  options: answerOptions.map((optionText, index) => ({
                    option_text: optionText,
                    is_correct: newLessonData.quizCorrectOption === index + 1,
                    sort_order: index + 1,
                  })),
                },
              ],
            });
            if (!quizResult?.success) {
              throw new Error(quizResult?.message || "لم يتم حفظ سؤال المحاضرة.");
            }
          } catch (error) {
            quizError = error.message || "لم يتم حفظ سؤال المحاضرة.";
          }
        }
        setIsAddLessonOpen(false);
        setNewLessonData({
          title: "",
          branch: BRANCHES[0] || "التفاضل والتكامل",
          grade: GRADES[0].name,
          gradeId: GRADES[0].id,
          duration: "",
          videoUrl: "",
          pdfFile: "",
          description: "",
          quizQuestion: "",
          quizOption1: "",
          quizOption2: "",
          quizOption3: "",
          quizOption4: "",
          quizCorrectOption: 1,
        });
        showToast(quizError || "تم رفع ونشر المحاضرة بنجاح 🎉", quizError ? "error" : "success");
        if (typeof fetchLessons === "function") {
          fetchLessons();
        }
      } else {
        showToast(res?.message || "تعذر حفظ الدرس على الخادم", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("حدث خطأ أثناء حفظ المحاضرة", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmDeleteLesson = async () => {
    if (!deleteConfirmationLesson) return;
    setIsProcessing(true);
    try {
      if (typeof deleteLesson === "function") {
        await deleteLesson(deleteConfirmationLesson.id);
        showToast(`تم حذف درس [ ${deleteConfirmationLesson.title} ] بنجاح`);
      }
      setDeleteConfirmationLesson(null);
    } catch (err) {
      console.error(err);
      showToast("تعذر حذف الدرس، يرجى المحاولة مرة أخرى", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="container"
      style={{ paddingTop: "1.5rem", paddingBottom: "3rem" }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.25rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1 className="section-title">
            {isTeacher ? "المحاضرات والدروس" : `دروس ${studentGrade}`}
          </h1>
          <p className="section-desc">
            {isTeacher
              ? "إدارة ورفع شروحات الفيديو وامتحانات الدروس"
              : `المحاضرات والشروحات المقررة لـ ${student?.name || "طالب المنصة"}`}
          </p>
        </div>

        {isTeacher && (
          <button
            onClick={() => setIsAddLessonOpen(true)}
            className="btn-primary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "0.85rem",
              padding: "9px 18px",
              boxShadow: "0 4px 14px rgba(6, 182, 212, 0.35)",
            }}
          >
            <Plus size={17} />
            <span>رفع درس جديد</span>
          </button>
        )}
      </div>

      {/* Modern Unified Filter Bar */}
      <div className="modern-filter-bar" style={{ marginBottom: "1.5rem" }}>
        {/* Row 1: Search & Controls */}
        <div className="modern-filter-row">
          <div className="modern-search-box">
            <span className="modern-search-icon">
              <Search size={15} />
            </span>
            <input
              type="text"
              placeholder={isTeacher ? "بحث في الدروس بالعنوان أو الفرع..." : "ابحث في دروس صفك..."}
              value={searchQuery}
              onChange={(e) => setUrlState({ search: e.target.value }, { replace: true })}
              className="modern-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setUrlState({ search: "" }, { replace: true })}
                className="modern-search-clear"
                title="مسح البحث"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <button
              onClick={() => fetchLessons()}
              className="btn-secondary"
              title="تحديث قائمة الدروس من الخادم"
              style={{ padding: "8px 14px", fontSize: "0.8rem", gap: "6px" }}
              disabled={isLoadingLessons}
            >
              <RefreshCw
                size={14}
                className={isLoadingLessons ? "animate-spin" : ""}
              />
              <span>تحديث</span>
            </button>

            {(searchQuery || (isTeacher && selectedGrade !== BRANCHES[0]) || selectedBranch !== BRANCHES[0]) && (
              <button
                type="button"
                onClick={() => {
                  setUrlState({
                    search: "",
                    grade: BRANCHES[0],
                    branch: BRANCHES[0],
                  }, { replace: true });
                }}
                className="btn-secondary"
                style={{ fontSize: "0.78rem", padding: "8px 12px", gap: "5px" }}
                title="إلغاء جميع الفلاتر"
              >
                <RotateCcw size={13} />
                <span>إعادة ضبط</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Grade Tabs (Teacher only) & Branch Chips */}
        <div className="modern-filter-row" style={{ paddingTop: "0.35rem", borderTop: "1px solid rgba(148, 163, 184, 0.08)", gap: "0.75rem", flexWrap: "wrap" }}>
          {isTeacher && (
            <GradeFilter
              value={selectedGrade}
              onChange={setSelectedGrade}
              options={gradeOptions}
              includeAll
              showLabel={true}
            />
          )}

          <div className="grade-filter" role="group" aria-label="أفرع المادة">
            <span className="grade-filter-label">الفرع:</span>
            <div className="grade-filter-options">
              {gradeBranches.map((branch) => {
                const isActive = selectedBranch === branch;
                return (
                  <button
                    key={branch}
                    type="button"
                    onClick={() => setSelectedBranch(branch)}
                    className={`grade-filter-option ${isActive ? "is-active" : ""}`}
                  >
                    {branch}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Lessons List */}
      <div>
        {filteredLessons.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "4rem 1rem",
              background: "var(--bg-card)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <Video size={44} style={{ color: "var(--text-dim)", margin: "0 auto 1rem" }} />
            <p
              style={{ fontWeight: 800, fontSize: "1.1rem", color: "#ffffff" }}
            >
              لا توجد محاضرات منشورة لهذا القسم حالياً
            </p>
            <p
              style={{
                fontSize: "0.85rem",
                color: "var(--text-muted)",
                marginTop: "6px",
              }}
            >
              {isTeacher
                ? "يمكنك الضغط على زر 'رفع درس جديد' لإضافة أول محاضرة الآن"
                : "سيقوم أ/ محمد عبد الخالق بإضافة شروحات جديدة قريباً"}
            </p>
            {isTeacher ? (
              <button
                onClick={() => setIsAddLessonOpen(true)}
                className="btn-primary"
                style={{ marginTop: "1.25rem", fontSize: "0.85rem" }}
              >
                <Plus size={16} />
                <span>رفع درس جديد</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setUrlState({ branch: BRANCHES[0], search: "" }, { replace: true });
                }}
                className="btn-primary"
                style={{ marginTop: "1rem", fontSize: "0.8rem" }}
              >
                عرض كل دروس صفك
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {filteredLessons.map((lesson) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                onDelete={(lessonToDelete) => setDeleteConfirmationLesson(lessonToDelete)}
              />
            ))}
          </div>
        )}
      </div>

      {/* MODAL: ADD NEW LESSON FOR TEACHER */}
      {isAddLessonOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(3, 7, 18, 0.8)",
            backdropFilter: "blur(8px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            direction: "rtl",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isProcessing) {
              setIsAddLessonOpen(false);
            }
          }}
        >
          <div
            className="feature-card"
            style={{
              width: "100%",
              maxWidth: "min(560px, 96vw)",
              maxHeight: "90vh",
              overflowY: "auto",
              overflowX: "hidden",
              padding: "clamp(1rem, 4vw, 1.75rem)",
              position: "relative",
              border: "1px solid rgba(6, 182, 212, 0.3)",
              background: "linear-gradient(145deg, #111827, #080d18)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
              borderRadius: "18px",
            }}
          >
            <button
              onClick={() => setIsAddLessonOpen(false)}
              disabled={isProcessing}
              style={{
                position: "absolute",
                top: "16px",
                left: "16px",
                color: "var(--text-muted)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              <X size={20} />
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1.25rem" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "12px",
                  background: "rgba(6, 182, 212, 0.15)",
                  color: "var(--cyan)",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Video size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#fff", margin: 0 }}>
                  رفع محاضرة ودرس جديد
                </h2>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "4px 0 0" }}>
                  أدخل بيانات الدرس ورابط الفيديو، وستُحسب المدة تلقائيًا
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveLesson} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label className="form-label" style={{ fontWeight: 700, marginBottom: "6px", display: "block" }}>
                  عنوان المحاضرة *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: مقدمة في قواعد الاشتقاق وتطبيقاتها"
                  value={newLessonData.title}
                  onChange={(e) =>
                    setNewLessonData({ ...newLessonData, title: e.target.value })
                  }
                  className="form-input"
                  style={{ width: "100%" }}
                />
              </div>

              <div className="grid-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 700, marginBottom: "6px", display: "block" }}>
                    المرحلة الدراسية *
                  </label>
                  <select
                    value={newLessonData.grade}
                    onChange={(e) =>
                      setNewLessonData({ ...newLessonData, grade: e.target.value })
                    }
                    className="form-input"
                    style={{ width: "100%" }}
                  >
                    {GRADES.map((g) => (
                      <option key={g.name} value={g.name}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 700, marginBottom: "6px", display: "block" }}>
                    الفرع *
                  </label>
                  <select
                    value={newLessonData.branch}
                    onChange={(e) =>
                      setNewLessonData({ ...newLessonData, branch: e.target.value })
                    }
                    className="form-input"
                    style={{ width: "100%" }}
                  >
                    {BRANCHES.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 700, marginBottom: "6px", display: "block" }}>
                  رابط الفيديو (YouTube / Embed / Direct URL)
                </label>
                <input
                  type="text"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={newLessonData.videoUrl}
                  onChange={(e) => {
                    setNewLessonData({ ...newLessonData, videoUrl: e.target.value, duration: "" });
                    setDurationStatus("");
                  }}
                  className="form-input"
                  style={{ width: "100%", direction: "ltr", textAlign: "right" }}
                />
                <div role="status" style={{ marginTop: "0.5rem", color: newLessonData.duration ? "var(--emerald)" : "var(--text-muted)", fontSize: "0.82rem" }}>
                  {durationStatus || "مدة الشرح ستُحسب تلقائيًا من رابط الفيديو"}
                  {newLessonData.duration ? ` — ${newLessonData.duration}` : ""}
                </div>
              </div>



              <section style={{ padding: "1rem", border: "1px solid rgba(6, 182, 212, 0.25)", borderRadius: "12px", background: "rgba(15, 23, 42, 0.55)" }}>
                <h3 style={{ color: "#fff", fontWeight: 800, margin: "0 0 0.75rem" }}>سؤال المحاضرة والاختيارات</h3>
                <label className="form-label" htmlFor="lesson-question" style={{ display: "block", marginBottom: "6px" }}>السؤال *</label>
                <textarea
                  id="lesson-question"
                  required={Boolean(newLessonData.quizQuestion.trim() || [1, 2, 3, 4].some((number) => newLessonData[`quizOption${number}`].trim()))}
                  rows={3}
                  className="form-input"
                  style={{ width: "100%", resize: "vertical", marginBottom: "0.75rem" }}
                  value={newLessonData.quizQuestion}
                  onChange={(e) => setNewLessonData({ ...newLessonData, quizQuestion: e.target.value })}
                  placeholder="اكتبي سؤالًا على محتوى المحاضرة"
                />
                {[1, 2, 3, 4].map((number) => (
                  <div key={number} style={{ display: "flex", gap: "0.6rem", alignItems: "center", marginBottom: "0.6rem" }}>
                    <input
                      type="radio"
                      name="lesson-correct-option"
                      aria-label={`تحديد الاختيار ${number} كإجابة صحيحة`}
                      checked={newLessonData.quizCorrectOption === number}
                      onChange={() => setNewLessonData({ ...newLessonData, quizCorrectOption: number })}
                    />
                    <input
                      type="text"
                      required={Boolean(newLessonData.quizQuestion.trim() || [1, 2, 3, 4].some((optionNumber) => newLessonData[`quizOption${optionNumber}`].trim()))}
                      className="form-input"
                      aria-label={`الاختيار ${number}`}
                      style={{ width: "100%" }}
                      value={newLessonData[`quizOption${number}`]}
                      onChange={(e) => setNewLessonData({ ...newLessonData, [`quizOption${number}`]: e.target.value })}
                      placeholder={`الاختيار ${number}${newLessonData.quizCorrectOption === number ? " (الإجابة الصحيحة)" : ""}`}
                    />
                  </div>
                ))}
                <small style={{ color: "var(--text-muted)" }}>حددي الدائرة بجانب الإجابة الصحيحة.</small>
              </section>

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="btn-primary"
                  style={{ flex: 1, justifyContent: "center", padding: "11px" }}
                >
                  {isProcessing ? "جاري الحفظ والرفع..." : "رفع ونشر المحاضرة"}
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setIsAddLessonOpen(false)}
                  className="btn-secondary"
                  style={{ padding: "11px 20px" }}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deleteConfirmationLesson && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(3, 7, 18, 0.8)",
            backdropFilter: "blur(6px)",
            zIndex: 1100,
            display: "grid",
            placeItems: "center",
            padding: "1rem",
            direction: "rtl",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isProcessing) {
              setDeleteConfirmationLesson(null);
            }
          }}
        >
          <div
            className="feature-card"
            style={{
              width: "min(100%, 420px)",
              padding: "1.5rem",
              borderRadius: "18px",
              border: "1px solid rgba(244, 63, 94, 0.3)",
              background: "linear-gradient(145deg, #111827, #080d18)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "1rem" }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: "rgba(244, 63, 94, 0.15)",
                  color: "#fb7185",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, color: "#fff", fontSize: "1.1rem" }}>
                  تأكيد حذف الدرس
                </h3>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  إزالة المحاضرة من المنصة
                </span>
              </div>
            </div>

            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.7, margin: "0 0 1.25rem" }}>
              هل أنت متأكد من حذف درس:{" "}
              <strong style={{ color: "#fff" }}>
                [ {deleteConfirmationLesson.title} ]
              </strong>
              ؟ لن يتمكن الطلاب من مشاهدته بعد الحذف.
            </p>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                disabled={isProcessing}
                onClick={confirmDeleteLesson}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "10px",
                  border: "1px solid rgba(244, 63, 94, 0.4)",
                  background: "linear-gradient(135deg, #e11d48, #be123c)",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {isProcessing ? "جاري الحذف..." : "نعم، حذف المحاضرة"}
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setDeleteConfirmationLesson(null)}
                className="btn-secondary"
                style={{ flex: 1, justifyContent: "center" }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
