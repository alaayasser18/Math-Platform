import { useMemo, useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useStudent } from "../context/useStudent";
import useUrlState from "../hooks/useUrlState";
import {
  Timer,
  CheckCircle,
  Trophy,
  ArrowRight,
  ArrowLeft,
  FileQuestion,
  Plus,
  Clock,
  CheckCircle2,
  Trash2,
  Edit3,
  RefreshCw,
  X,
  AlertTriangle,
  Play,
  HelpCircle,
} from "lucide-react";
import confetti from "canvas-confetti";

function getNestedQuestionId(payload) {
  let current = payload;
  for (let depth = 0; current && depth < 6; depth += 1) {
    if (current.id != null) return current.id;
    current = current.question || current.data || current.result;
  }
  return null;
}

const EXAM_MANAGER_URL_SCHEMA = {
  expandedExam: {
    defaultValue: "",
    normalize: (value) => (value.length <= 100 ? value : null),
  },
};

export default function ExamsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    student,
    showToast,
    lessonsList,
    userRole,
    studentExamsList,
    isLoadingStudentExams,
    fetchStudentExams,

    adminExamsList,
    isLoadingExams,
    fetchAdminExams,
    fetchAdminExamDetails,
    createAdminExam,
    updateAdminExam,
    deleteAdminExam,
    createAdminQuestion,
    updateAdminQuestion,
    deleteAdminQuestion,
    createAdminOption,
    updateAdminOption,
    deleteAdminOption,
  } = useStudent();

  const isTeacher = userRole === "teacher";
  const studentGrade = student?.grade || "";

  const routeInfo = useMemo(() => {
    const gradeLessons = (lessonsList || []).filter(
      (lesson) => isTeacher || lesson.grade === studentGrade,
    );

    // 1) Exact exam-id match first. Only fall back to lesson_id if no exam
    //    has this id, so an exam id can never collide with a lesson id.
    const examList = (isTeacher ? adminExamsList : studentExamsList) || [];
    const examIdOf = (exam) => exam.id ?? exam.exam_id;
    const routeExam =
      examList.find((exam) => String(examIdOf(exam)) === String(id)) ||
      examList.find(
        (exam) => String(exam.lesson_id ?? exam.lesson?.id) === String(id),
      );

    const linkedLessonId = routeExam?.lesson_id ?? routeExam?.lesson?.id;

    // 2) The lesson comes from the exam we found. We only match a lesson by
    //    the raw route id when no exam was found.
    const matchedLesson = id
      ? (linkedLessonId != null
          ? (lessonsList || []).find(
              (lesson) => String(lesson.id) === String(linkedLessonId),
            )
          : undefined) ||
        (!routeExam
          ? (lessonsList || []).find(
              (lesson) =>
                String(lesson.id) === String(id) ||
                String(lesson.exam?.id) === String(id) ||
                String(lesson.quiz?.id) === String(id),
            )
          : undefined)
      : gradeLessons.find(
          (lesson) =>
            (lesson.quiz || lesson.exam) &&
            (lesson.quiz || lesson.exam).questions?.length > 0,
        ) || gradeLessons[0];

    const lesson =
      matchedLesson ||
      (routeExam
        ? {
            ...(routeExam.lesson || {}),
            id: linkedLessonId || routeExam.lesson?.id || routeExam.id || id,
            title:
              routeExam.lesson?.title ||
              routeExam.lesson_title ||
              routeExam.title ||
              "",
            grade:
              routeExam.lesson?.grade?.name ||
              routeExam.grade?.name ||
              routeExam.grade_name ||
              studentGrade,
            branch: routeExam.lesson?.branch || routeExam.branch || "",
            quiz: routeExam,
            exam: routeExam,
          }
        : null);

    const resolvedExamId =
      routeExam?.id ||
      routeExam?.exam_id ||
      lesson?.exam_id ||
      lesson?.exam?.id ||
      lesson?.quiz?.id ||
      lesson?.exams?.[0]?.id ||
      (isTeacher ? lesson?.exam?.id || lesson?.quiz?.id || lesson?.id : null);

    return { lesson, resolvedExamId };
  }, [
    id,
    isTeacher,
    lessonsList,
    studentExamsList,
    adminExamsList,
    studentGrade,
  ]);

  // If teacher and NOT taking/previewing a specific exam, show TeacherExamsManager
  if (isTeacher && !id) {
    return (
      <TeacherExamsManager
        adminExamsList={adminExamsList}
        isLoadingExams={isLoadingExams}
        fetchAdminExams={fetchAdminExams}
        fetchAdminExamDetails={fetchAdminExamDetails}
        createAdminExam={createAdminExam}
        updateAdminExam={updateAdminExam}
        deleteAdminExam={deleteAdminExam}
        createAdminQuestion={createAdminQuestion}
        updateAdminQuestion={updateAdminQuestion}
        deleteAdminQuestion={deleteAdminQuestion}
        createAdminOption={createAdminOption}
        updateAdminOption={updateAdminOption}
        deleteAdminOption={deleteAdminOption}
        lessonsList={lessonsList}
        showToast={showToast}
      />
    );
  }

  if (!isTeacher && !id) {
    return (
      <div
        className="container"
        style={{ paddingTop: "1.5rem", paddingBottom: "3rem" }}
      >
        <div className="section-header">
          <div>
            <h1 className="section-title">امتحانات صفك</h1>
            <p className="section-desc">
              الاختبارات المتاحة وحالة التقدم من الخادم
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary"
            disabled={isLoadingStudentExams}
            onClick={fetchStudentExams}
          >
            <RefreshCw size={15} />
            تحديث
          </button>
        </div>

        {isLoadingStudentExams ? (
          <div
            role="status"
            style={{
              padding: "3rem 1rem",
              textAlign: "center",
              color: "var(--text-muted)",
            }}
          >
            جارٍ تحميل الامتحانات من الخادم...
          </div>
        ) : studentExamsList.length === 0 ? (
          <div
            className="feature-card"
            style={{ padding: "2rem", textAlign: "center" }}
          >
            لا توجد امتحانات متاحة لهذا الحساب حالياً.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill, minmax(min(260px, 100%), 1fr))",
              gap: "1rem",
            }}
          >
            {studentExamsList.map((exam) => {
              const examId = exam.id || exam.exam_id;
              const isLocked =
                exam.is_locked === true ||
                exam.is_locked === 1 ||
                exam.access_status === "locked" ||
                exam.unlock_status === "locked" ||
                exam.can_start === false ||
                exam.is_unlocked === false ||
                exam.is_unlocked === 0;
              const metaParts = [
                exam.duration_minutes ? `${exam.duration_minutes} دقيقة` : "",
                exam.total_questions ? `${exam.total_questions} سؤال` : "",
                exam.attempts_count != null
                  ? `المحاولات: ${exam.attempts_count}`
                  : "",
              ].filter(Boolean);

              return (
                <article
                  key={examId}
                  className="feature-card"
                  style={{
                    padding: "1.25rem",
                    justifyContent: "flex-start",
                    gap: "0.35rem",
                  }}
                >
                  <h2
                    style={{
                      margin: 0,
                      color: "#fff",
                      fontSize: "1.05rem",
                      lineHeight: 1.5,
                    }}
                  >
                    {exam.title || exam.name || "اختبار"}
                  </h2>
                  <p
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "0.8rem",
                      margin: 0,
                    }}
                  >
                    {exam.lesson?.title ||
                      exam.lesson_title ||
                      exam.lesson_name ||
                      "اختبار المنهج"}
                  </p>
                  {metaParts.length > 0 && (
                    <p
                      style={{
                        color: "var(--cyan)",
                        fontSize: "0.75rem",
                        margin: "0.4rem 0 0",
                      }}
                    >
                      {metaParts.join(" · ")}
                    </p>
                  )}

                  <div style={{ marginTop: "auto", paddingTop: "1rem" }}>
                    {isLocked ? (
                      <div
                        className="badge-tag"
                        style={{
                          display: "block",
                          width: "100%",
                          textAlign: "center",
                          padding: "10px 12px",
                          borderRadius: "var(--radius-md)",
                          color: "var(--amber)",
                          background: "rgba(245, 158, 11, 0.1)",
                          borderColor: "rgba(245, 158, 11, 0.3)",
                          fontSize: "0.78rem",
                          lineHeight: 1.6,
                        }}
                      >
                        🔒{" "}
                        {exam.lock_reason || "مقفل حتى استكمال مشاهدة الدروس"}
                      </div>
                    ) : (
                      <Link
                        to={`/quiz/${examId}`}
                        className="btn-primary"
                        style={{
                          width: "100%",
                          padding: "12px 18px",
                          fontSize: "0.95rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <Play size={16} />
                        <span>بدء الاختبار</span>
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const { lesson, resolvedExamId } = routeInfo;

  if (!lesson && !isTeacher && id && isLoadingStudentExams) {
    return (
      <div
        className="container"
        role="status"
        style={{ padding: "5rem 1rem", textAlign: "center" }}
      >
        جارٍ تحميل بيانات الاختبار من الخادم...
      </div>
    );
  }

  if (!lesson) {
    return (
      <div
        className="container"
        style={{ textAlign: "center", padding: "5rem 1rem" }}
      >
        <h2>لا توجد اختبارات متاحة لصفك حالياً</h2>
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

  // Access check for student
  if (
    !isTeacher &&
    studentGrade &&
    lesson.grade &&
    studentGrade !== lesson.grade
  ) {
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
            اختبار غير متاح لصفك
          </h2>
          <p
            style={{
              fontSize: "0.85rem",
              color: "var(--text-muted)",
              marginTop: "8px",
              lineHeight: "1.6",
            }}
          >
            هذا الاختبار خاص بـ{" "}
            <strong style={{ color: "var(--cyan)" }}>({lesson.grade})</strong>،
            وأنت مسجل في{" "}
            <strong style={{ color: "var(--amber)" }}>({studentGrade})</strong>.
          </p>
          <Link
            to="/lessons"
            className="btn-primary"
            style={{ marginTop: "1.5rem", display: "inline-flex" }}
          >
            الانتقال لاختبارات صفك
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="container"
      style={{ paddingTop: "1rem", paddingBottom: "3rem" }}
    >
      {isTeacher && id && (
        <div
          style={{
            marginBottom: "1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <button
            onClick={() => navigate("/exams")}
            className="btn-secondary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              fontSize: "0.85rem",
              borderColor: "rgba(6, 182, 212, 0.4)",
              color: "var(--cyan)",
            }}
          >
            <ArrowRight size={16} />
            <span>العودة لإدارة بنك الامتحانات</span>
          </button>
          <span
            className="student-preview-badge"
            style={{
              fontSize: "0.8rem",
              color: "var(--amber)",
              background: "rgba(245, 158, 11, 0.15)",
              padding: "4px 12px",
              borderRadius: "999px",
              border: "1px solid rgba(245, 158, 11, 0.3)",
            }}
          >
            👁️ وضع معاينة المعلم (تجربة الامتحان)
          </span>
        </div>
      )}

      <QuizView
        key={`${lesson.id}-${resolvedExamId || ""}`}
        lesson={lesson}
        examId={resolvedExamId}
        isTeacher={isTeacher}
        student={student}
        showToast={showToast}
      />
    </div>
  );
}

/* =========================================================================
   TEACHER EXAMS & QUESTION BANK MANAGER COMPONENT
   ========================================================================= */

function TeacherExamsManager({
  adminExamsList,
  isLoadingExams,
  fetchAdminExams,
  fetchAdminExamDetails,
  createAdminExam,
  updateAdminExam,
  deleteAdminExam,
  createAdminQuestion,
  updateAdminQuestion,
  deleteAdminQuestion,
  createAdminOption,
  updateAdminOption,
  deleteAdminOption,
  lessonsList,
  showToast,
}) {
  const [urlState, setUrlState] = useUrlState(EXAM_MANAGER_URL_SCHEMA);
  const expandedExamId = urlState.expandedExam || null;
  const setExpandedExamId = (examId) =>
    setUrlState({ expandedExam: examId == null ? "" : String(examId) });
  const [isAddExamOpen, setIsAddExamOpen] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [newExamData, setNewExamData] = useState({
    lesson_id: "",
    title: "",
    description: "",
    duration_minutes: 20,
    passing_percentage: "",
  });

  // Question Modal State (with Choices fields)
  const [questionModal, setQuestionModal] = useState({
    isOpen: false,
    isEdit: false,
    examId: null,
    questionId: null,
    existingOptions: [],
    question_text: "",
    points: 1,
    opt1: "",
    opt2: "",
    opt3: "",
    opt4: "",
    correctOption: 1,
  });

  // Delete Confirmation State
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);

  useEffect(() => {
    if (typeof fetchAdminExams === "function") {
      fetchAdminExams();
    }
  }, [fetchAdminExams]);

  const handleOpenAddExam = () => {
    setEditingExam(null);
    setNewExamData({
      lesson_id: "",
      title: "",
      description: "",
      duration_minutes: 20,
      passing_percentage: "",
    });
    setIsAddExamOpen(true);
  };

  const handleOpenEditExam = (exam) => {
    setEditingExam(exam);
    setNewExamData({
      lesson_id: exam.lesson_id ?? "",
      title: exam.title || "",
      description: exam.description || "",
      duration_minutes: exam.duration_minutes || 20,
      passing_percentage: exam.passing_percentage || "",
    });
    setIsAddExamOpen(true);
  };

  const handleSaveExam = async (e) => {
    e.preventDefault();
    if (!newExamData.title.trim()) {
      showToast("يرجى كتابة عنوان الامتحان", "error");
      return;
    }
    const payload = {
      ...newExamData,
      passing_percentage:
        newExamData.passing_percentage === "" ||
        newExamData.passing_percentage == null
          ? null
          : Number(newExamData.passing_percentage),
    };
    const duplicateExam =
      !editingExam &&
      newExamData.lesson_id &&
      adminExamsList.find(
        (exam) => String(exam.lesson_id) === String(newExamData.lesson_id),
      );
    if (duplicateExam) {
      showToast(
        `تم إنشاء امتحان للدرس «${lessonsList.find((lesson) => String(lesson.id) === String(newExamData.lesson_id))?.title || duplicateExam.title}» بالفعل. يمكنك إضافة الأسئلة إلى الامتحان الموجود.`,
        "error",
      );
      return;
    }

    setIsProcessing(true);
    try {
      const res = editingExam
        ? await updateAdminExam(editingExam.id, payload)
        : await createAdminExam(payload);

      if (res?.success) {
        setIsAddExamOpen(false);
        setEditingExam(null);
        showToast(
          editingExam
            ? "تم تحديث بيانات الامتحان بنجاح"
            : "تم إنشاء الامتحان بنجاح 🎉",
        );
        if (typeof fetchAdminExams === "function") {
          await fetchAdminExams();
        }
      }
    } catch (err) {
      console.error(err);
      showToast("حدث خطأ أثناء حفظ الامتحان", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenAddQuestion = (examId) => {
    setQuestionModal({
      isOpen: true,
      isEdit: false,
      examId,
      questionId: null,
      existingOptions: [],
      question_text: "",
      points: 1,
      opt1: "",
      opt2: "",
      opt3: "",
      opt4: "",
      correctOption: 1,
    });
  };

  const handleOpenEditQuestion = (examId, question) => {
    const rawOptions = question.options || [];
    const optTexts = rawOptions.map((opt) =>
      typeof opt === "string" ? opt : opt.option_text || opt.text || "",
    );
    const correctIndex = rawOptions.findIndex((opt) =>
      Boolean(typeof opt === "object" && opt.is_correct),
    );

    setQuestionModal({
      isOpen: true,
      isEdit: true,
      examId,
      questionId: question.id,
      existingOptions: rawOptions,
      question_text: question.question_text || question.question || "",
      points: question.points || 1,
      opt1: optTexts[0] || "",
      opt2: optTexts[1] || "",
      opt3: optTexts[2] || "",
      opt4: optTexts[3] || "",
      correctOption: correctIndex !== -1 ? correctIndex + 1 : 1,
    });
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    if (!questionModal.question_text.trim()) {
      showToast("يرجى كتابة نص السؤال أولاً", "error");
      return;
    }
    if (!questionModal.opt1.trim() || !questionModal.opt2.trim()) {
      showToast("يرجى كتابة خيارين على الأقل للسؤال", "error");
      return;
    }

    const optionEntries = [
      { label: "أ", text: questionModal.opt1 },
      { label: "ب", text: questionModal.opt2 },
      { label: "ج", text: questionModal.opt3 },
      { label: "د", text: questionModal.opt4 },
    ].filter(({ text }) => text.trim());
    const seenOptions = new Map();
    for (const option of optionEntries) {
      const normalizedText = option.text
        .normalize("NFC")
        .trim()
        .replace(/\s+/g, " ")
        .toLocaleLowerCase();
      if (seenOptions.has(normalizedText)) {
        showToast(
          `الاختيار (${option.label}) مكرر مع الاختيار (${seenOptions.get(normalizedText)}). غيّر نص الاختيار المكرر.`,
          "error",
        );
        return;
      }
      seenOptions.set(normalizedText, option.label);
    }

    setIsProcessing(true);
    try {
      if (questionModal.isEdit) {
        const updateResult = await updateAdminQuestion(
          questionModal.questionId,
          {
            question_text: questionModal.question_text,
            points: Number(questionModal.points) || 1,
          },
        );
        if (!updateResult?.success) {
          throw new Error(updateResult?.message || "فشل حفظ تعديلات السؤال.");
        }

        const rawOptions = [
          {
            text: questionModal.opt1,
            is_correct: questionModal.correctOption === 1,
          },
          {
            text: questionModal.opt2,
            is_correct: questionModal.correctOption === 2,
          },
          {
            text: questionModal.opt3,
            is_correct: questionModal.correctOption === 3,
          },
          {
            text: questionModal.opt4,
            is_correct: questionModal.correctOption === 4,
          },
        ];

        const existing = questionModal.existingOptions || [];
        const activeInputs = rawOptions.filter(
          (opt) => opt.text && opt.text.trim(),
        );

        for (let i = 0; i < activeInputs.length; i++) {
          const opt = activeInputs[i];
          const existingOpt = existing[i];

          if (
            existingOpt &&
            existingOpt.id &&
            typeof updateAdminOption === "function"
          ) {
            await updateAdminOption(existingOpt.id, {
              option_text: opt.text.trim(),
              is_correct: Boolean(opt.is_correct),
            });
          } else if (typeof createAdminOption === "function") {
            await createAdminOption(questionModal.questionId, {
              option_text: opt.text.trim(),
              is_correct: Boolean(opt.is_correct),
            });
          }
        }

        if (
          existing.length > activeInputs.length &&
          typeof deleteAdminOption === "function"
        ) {
          for (let i = activeInputs.length; i < existing.length; i++) {
            if (existing[i]?.id) {
              await deleteAdminOption(existing[i].id);
            }
          }
        }
      } else {
        const qRes = await createAdminQuestion(questionModal.examId, {
          question_text: questionModal.question_text,
          points: Number(questionModal.points) || 1,
        });

        if (!qRes?.success) {
          throw new Error(qRes?.message || "لم يتم حفظ السؤال.");
        }

        let newQuestionId = getNestedQuestionId(qRes?.data || qRes);

        if (!newQuestionId) {
          // Some API responses omit the created resource. Re-fetch the exam
          // and recover its id from the question that was just submitted.
          const examDetails = await fetchAdminExamDetails(questionModal.examId);
          const refreshedExams = examDetails ? [] : await fetchAdminExams();
          const currentExam =
            examDetails ||
            refreshedExams?.find(
              (exam) => String(exam.id) === String(questionModal.examId),
            );
          const savedQuestions =
            currentExam?.questions ||
            currentExam?.exam_questions ||
            currentExam?.quiz?.questions ||
            [];
          const submittedQuestion = [...savedQuestions]
            .reverse()
            .find(
              (question) =>
                String(
                  question.question_text || question.question || "",
                ).trim() === questionModal.question_text.trim(),
            );
          newQuestionId = getNestedQuestionId(submittedQuestion);
          if (!newQuestionId) {
            throw new Error(
              "وصلت استجابة الخادم بدون معرّف السؤال، ولم يظهر السؤال بعد تحديث الامتحان.",
            );
          }
        }

        // If options were provided in the form, create them immediately!
        if (newQuestionId) {
          const rawOptions = [
            {
              text: questionModal.opt1,
              is_correct: questionModal.correctOption === 1,
            },
            {
              text: questionModal.opt2,
              is_correct: questionModal.correctOption === 2,
            },
            {
              text: questionModal.opt3,
              is_correct: questionModal.correctOption === 3,
            },
            {
              text: questionModal.opt4,
              is_correct: questionModal.correctOption === 4,
            },
          ];

          for (const opt of rawOptions) {
            if (opt.text && opt.text.trim()) {
              const optionResult = await createAdminOption(newQuestionId, {
                option_text: opt.text.trim(),
                is_correct: Boolean(opt.is_correct),
              });
              if (!optionResult?.success) {
                throw new Error(
                  optionResult?.message || "فشل حفظ أحد الاختيارات.",
                );
              }
            }
          }
        }
      }

      setQuestionModal({
        isOpen: false,
        isEdit: false,
        examId: null,
        questionId: null,
        existingOptions: [],
        question_text: "",
        points: 1,
        opt1: "",
        opt2: "",
        opt3: "",
        opt4: "",
        correctOption: 1,
      });

      if (typeof fetchAdminExamDetails === "function") {
        const updatedExam = await fetchAdminExamDetails(questionModal.examId);
        if (!updatedExam && typeof fetchAdminExams === "function") {
          await fetchAdminExams();
        }
      } else if (typeof fetchAdminExams === "function") {
        await fetchAdminExams();
      }
      showToast(
        questionModal.isEdit
          ? "تم حفظ تعديل السؤال وخياراته بنجاح 🎉"
          : "تم حفظ السؤال وخياراته بنجاح 🎉",
      );
    } catch (err) {
      console.error(err);
      showToast(err?.message || "حدث خطأ أثناء حفظ السؤال والخيارات", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmDeleteAction = async () => {
    if (!deleteConfirmation) return;
    setIsProcessing(true);
    try {
      if (deleteConfirmation.type === "exam") {
        await deleteAdminExam(deleteConfirmation.id);
        showToast("تم حذف الامتحان بنجاح");
      } else if (deleteConfirmation.type === "question") {
        await deleteAdminQuestion(deleteConfirmation.id);
        showToast("تم حذف السؤال بنجاح");
      }
      setDeleteConfirmation(null);
      if (typeof fetchAdminExams === "function") {
        await fetchAdminExams();
      }
    } catch (err) {
      console.error(err);
      showToast("حدث خطأ أثناء عملية الحذف", "error");
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
        className="section-header"
        style={{ alignItems: "flex-start", gap: "1.25rem" }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.75rem",
              color: "var(--cyan)",
              fontWeight: 700,
              marginBottom: "6px",
            }}
          >
            <FileQuestion size={15} />
            <span>نظام بنك الأسئلة والاختبارات التفاعلية</span>
          </div>
          <h1 className="section-title">
            معاينة وإدارة الامتحانات وبنك الأسئلة
          </h1>
          <p className="section-desc">
            إنشاء وتعديل الامتحانات، ربطها بالمحاضرات، وإضافة أسئلة الاختيار من
            متعدد وتحديد الإجابات الصحيحة
          </p>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={handleOpenAddExam}
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
            <span>إنشاء امتحان جديد</span>
          </button>

          <button
            onClick={() => fetchAdminExams()}
            className="btn-secondary"
            title="تحديث قائمة الامتحانات"
            style={{ padding: "8px 14px", fontSize: "0.85rem" }}
            disabled={isLoadingExams}
          >
            <RefreshCw
              size={15}
              className={isLoadingExams ? "animate-spin" : ""}
            />
            <span style={{ marginRight: "6px" }}>تحديث</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoadingExams ? (
        <div
          style={{
            textAlign: "center",
            padding: "4rem",
            color: "var(--cyan)",
          }}
        >
          <RefreshCw
            size={28}
            className="animate-spin"
            style={{ margin: "0 auto 12px" }}
          />
          <p style={{ fontWeight: 700 }}>
            جاري تحميل الامتحانات وبنك الأسئلة...
          </p>
        </div>
      ) : adminExamsList.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "4rem 1rem",
            background: "var(--bg-card)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <FileQuestion
            size={48}
            style={{ color: "var(--text-dim)", margin: "0 auto 1rem" }}
          />
          <h3 style={{ color: "#fff", fontSize: "1.15rem", fontWeight: 800 }}>
            لا توجد امتحانات مسجلة حالياً
          </h3>
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "0.85rem",
              marginTop: "6px",
            }}
          >
            اضغط على زر "إنشاء امتحان جديد" لإضافة أول امتحان وربطه بالمحاضرة
            وإضافة أسئلته
          </p>
          <button
            onClick={handleOpenAddExam}
            className="btn-primary"
            style={{ marginTop: "1.25rem", fontSize: "0.85rem" }}
          >
            <Plus size={16} />
            <span>إنشاء أول امتحان الآن</span>
          </button>
        </div>
      ) : (
        <div
          style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
        >
          {adminExamsList.map((exam) => {
            const isExpanded = String(expandedExamId) === String(exam.id);
            const questions =
              exam.questions ||
              exam.exam_questions ||
              exam.quiz?.questions ||
              [];
            const linkedLesson = lessonsList.find(
              (l) => String(l.id) === String(exam.lesson_id),
            );

            return (
              <div
                key={exam.id}
                className="feature-card"
                style={{
                  padding: "1.5rem",
                  border: isExpanded
                    ? "1px solid var(--cyan)"
                    : "1px solid var(--border-subtle)",
                  transition: "all 0.2s ease",
                  borderRadius: "16px",
                  background: "var(--bg-card)",
                }}
              >
                {/* Exam Header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: "1rem",
                    paddingBottom: isExpanded ? "14px" : "0",
                    borderBottom: isExpanded
                      ? "1px solid rgba(255,255,255,0.08)"
                      : "none",
                  }}
                >
                  <div style={{ flex: 1, minWidth: "min(260px, 100%)" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        flexWrap: "wrap",
                        marginBottom: "8px",
                      }}
                    >
                      <span
                        className="badge-tag"
                        style={{
                          background:
                            exam.is_active !== false
                              ? "rgba(16, 185, 129, 0.15)"
                              : "rgba(244, 63, 94, 0.15)",
                          color:
                            exam.is_active !== false
                              ? "var(--emerald)"
                              : "var(--rose)",
                          borderColor:
                            exam.is_active !== false
                              ? "rgba(16, 185, 129, 0.3)"
                              : "rgba(244, 63, 94, 0.3)",
                        }}
                      >
                        {exam.is_active !== false ? "نشط ومتاح للطلاب" : "معطل"}
                      </span>

                      <span
                        className="badge-tag"
                        style={{
                          color: "var(--cyan)",
                          background: "rgba(6, 182, 212, 0.12)",
                        }}
                      >
                        {linkedLesson?.title || `المحاضرة #${exam.lesson_id}`}
                      </span>

                      <span
                        style={{
                          fontSize: "0.8rem",
                          color: "var(--amber)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Clock size={13} />
                        {exam.duration_minutes || 20} دقيقة
                      </span>

                      {exam.passing_percentage != null && (
                        <span
                          style={{
                            fontSize: "0.8rem",
                            color: "var(--emerald)",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <CheckCircle2 size={13} />
                          نسبة النجاح: {exam.passing_percentage}%
                        </span>
                      )}

                      <span
                        style={{
                          fontSize: "0.8rem",
                          color: "var(--purple)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          fontWeight: 700,
                        }}
                      >
                        <HelpCircle size={13} />
                        {questions.length} سؤال
                      </span>
                    </div>

                    <h3
                      style={{
                        fontSize: "1.15rem",
                        fontWeight: 800,
                        color: "#fff",
                        margin: 0,
                      }}
                    >
                      {exam.title}
                    </h3>
                    {exam.description && (
                      <p
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--text-muted)",
                          marginTop: "6px",
                          lineHeight: 1.6,
                        }}
                      >
                        {exam.description}
                      </p>
                    )}
                  </div>

                  {/* Exam Actions */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      onClick={() =>
                        setExpandedExamId(isExpanded ? null : exam.id)
                      }
                      className={isExpanded ? "btn-primary" : "btn-secondary"}
                      style={{ fontSize: "0.8rem", padding: "7px 14px" }}
                    >
                      {isExpanded
                        ? "إغلاق الأسئلة"
                        : `إدارة الأسئلة (${questions.length})`}
                    </button>

                    <button
                      onClick={() => handleOpenEditExam(exam)}
                      className="btn-secondary"
                      style={{ fontSize: "0.8rem", padding: "7px 10px" }}
                      title="تعديل بيانات الامتحان"
                    >
                      <Edit3 size={14} />
                    </button>

                    <button
                      onClick={() =>
                        setDeleteConfirmation({
                          type: "exam",
                          id: exam.id,
                          title: exam.title,
                        })
                      }
                      className="btn-secondary"
                      style={{
                        fontSize: "0.8rem",
                        padding: "7px 10px",
                        color: "#fb7185",
                        borderColor: "rgba(244, 63, 94, 0.3)",
                      }}
                      title="حذف هذا الامتحان"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Expanded Questions Section */}
                {isExpanded && (
                  <div style={{ marginTop: "1.25rem" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "1rem",
                        flexWrap: "wrap",
                        gap: "8px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <HelpCircle
                          size={16}
                          style={{ color: "var(--cyan)" }}
                        />
                        <h4
                          style={{
                            fontSize: "0.95rem",
                            fontWeight: 800,
                            color: "#fff",
                            margin: 0,
                          }}
                        >
                          بنك أسئلة الامتحان ({questions.length})
                        </h4>
                      </div>

                      <button
                        onClick={() => handleOpenAddQuestion(exam.id)}
                        className="btn-primary"
                        style={{
                          fontSize: "0.8rem",
                          padding: "6px 14px",
                          gap: "6px",
                          display: "inline-flex",
                          alignItems: "center",
                        }}
                      >
                        <Plus size={15} />
                        <span>إضافة سؤال مع اختياراته</span>
                      </button>
                    </div>

                    {questions.length === 0 ? (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "2rem",
                          background: "rgba(255,255,255,0.02)",
                          borderRadius: "12px",
                          border: "1px dashed rgba(255,255,255,0.15)",
                        }}
                      >
                        <p
                          style={{
                            color: "var(--text-muted)",
                            fontSize: "0.85rem",
                            margin: 0,
                          }}
                        >
                          لا توجد أسئلة مضافة لهذا الامتحان بعد. اضغط على "+
                          إضافة سؤال مع اختياراته" للبدء.
                        </p>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "1rem",
                        }}
                      >
                        {questions.map((q, idx) => {
                          const options = q.options || [];
                          return (
                            <div
                              key={q.id || idx}
                              style={{
                                background: "rgba(15, 23, 42, 0.6)",
                                border: "1px solid rgba(255,255,255,0.06)",
                                borderRadius: "12px",
                                padding: "1rem",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "flex-start",
                                  gap: "8px",
                                  marginBottom: "0.75rem",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    gap: "10px",
                                    alignItems: "flex-start",
                                  }}
                                >
                                  <span
                                    style={{
                                      width: "24px",
                                      height: "24px",
                                      borderRadius: "6px",
                                      background: "rgba(6, 182, 212, 0.2)",
                                      color: "var(--cyan)",
                                      fontWeight: 800,
                                      fontSize: "0.75rem",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      flexShrink: 0,
                                    }}
                                  >
                                    {idx + 1}
                                  </span>
                                  <div>
                                    <p
                                      style={{
                                        color: "#fff",
                                        fontWeight: 700,
                                        fontSize: "0.95rem",
                                        margin: 0,
                                        lineHeight: 1.5,
                                      }}
                                    >
                                      {q.question_text || q.question}
                                    </p>
                                    <span
                                      style={{
                                        fontSize: "0.75rem",
                                        color: "var(--text-muted)",
                                        marginTop: "4px",
                                        display: "inline-block",
                                      }}
                                    >
                                      الدرجة: {q.points || 1} نقطة
                                    </span>
                                  </div>
                                </div>

                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleOpenEditQuestion(exam.id, q)
                                    }
                                    className="btn-secondary"
                                    style={{
                                      padding: "5px 8px",
                                      color: "var(--cyan)",
                                      borderColor: "rgba(6, 182, 212, 0.3)",
                                    }}
                                    title="تعديل هذا السؤال"
                                  >
                                    <Edit3 size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setDeleteConfirmation({
                                        type: "question",
                                        id: q.id,
                                        title: q.question_text || q.question,
                                      })
                                    }
                                    className="btn-secondary"
                                    style={{
                                      padding: "5px 8px",
                                      color: "#fb7185",
                                      borderColor: "rgba(244, 63, 94, 0.25)",
                                    }}
                                    title="حذف هذا السؤال"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>

                              {/* Question Choices / Options Area */}
                              <div style={{ marginTop: "0.75rem" }}>
                                <span
                                  style={{
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    color: "var(--text-dim)",
                                    marginBottom: "6px",
                                    display: "block",
                                  }}
                                >
                                  اختيارات السؤال:
                                </span>
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                      "repeat(auto-fill, minmax(min(200px, 100%), 1fr))",
                                    gap: "8px",
                                  }}
                                >
                                  {options.map((opt, optIdx) => {
                                    const optText =
                                      typeof opt === "string"
                                        ? opt
                                        : opt.option_text || opt.text || "";
                                    const isCorrect = Boolean(
                                      typeof opt === "object" && opt.is_correct,
                                    );

                                    const optionLetters = [
                                      "أ",
                                      "ب",
                                      "جـ",
                                      "د",
                                      "هـ",
                                    ];

                                    return (
                                      <div
                                        key={opt.id || optIdx}
                                        style={{
                                          padding: "8px 12px",
                                          borderRadius: "8px",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "space-between",
                                          gap: "8px",
                                          fontSize: "0.85rem",
                                          background: isCorrect
                                            ? "rgba(16, 185, 129, 0.15)"
                                            : "rgba(255,255,255,0.03)",
                                          border: isCorrect
                                            ? "1px solid rgba(16, 185, 129, 0.4)"
                                            : "1px solid rgba(255,255,255,0.06)",
                                          color: isCorrect
                                            ? "#34d399"
                                            : "#e2e8f0",
                                        }}
                                      >
                                        <div
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px",
                                          }}
                                        >
                                          <span
                                            style={{
                                              width: "20px",
                                              height: "20px",
                                              borderRadius: "6px",
                                              background: isCorrect
                                                ? "rgba(16, 185, 129, 0.3)"
                                                : "rgba(255,255,255,0.08)",
                                              display: "grid",
                                              placeItems: "center",
                                              fontSize: "0.75rem",
                                              fontWeight: 800,
                                              color: isCorrect
                                                ? "#fff"
                                                : "var(--text-muted)",
                                            }}
                                          >
                                            {optionLetters[optIdx] ||
                                              optIdx + 1}
                                          </span>
                                          <span>{optText}</span>
                                        </div>
                                        {isCorrect && (
                                          <span
                                            style={{
                                              fontSize: "0.7rem",
                                              fontWeight: 800,
                                              color: "var(--emerald)",
                                              display: "flex",
                                              alignItems: "center",
                                              gap: "2px",
                                              background:
                                                "rgba(16, 185, 129, 0.2)",
                                              padding: "2px 6px",
                                              borderRadius: "4px",
                                            }}
                                          >
                                            <CheckCircle2 size={12} />
                                            الإجابة الصحيحة
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: ADD / EDIT EXAM */}
      {isAddExamOpen && (
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
              setIsAddExamOpen(false);
            }
          }}
        >
          <div
            className="feature-card"
            style={{
              width: "100%",
              maxWidth: "min(520px, 96vw)",
              maxHeight: "92vh",
              overflowY: "auto",
              padding: "clamp(1rem, 4vw, 1.75rem)",
              position: "relative",
              border: "1px solid rgba(6, 182, 212, 0.3)",
              background: "linear-gradient(145deg, #111827, #080d18)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
              borderRadius: "18px",
            }}
          >
            <button
              onClick={() => setIsAddExamOpen(false)}
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

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "1.25rem",
              }}
            >
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
                <FileQuestion size={22} />
              </div>
              <div>
                <h2
                  style={{
                    fontSize: "1.2rem",
                    fontWeight: 800,
                    color: "#fff",
                    margin: 0,
                  }}
                >
                  {editingExam ? "تعديل بيانات الامتحان" : "إنشاء امتحان جديد"}
                </h2>
                <p
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text-muted)",
                    margin: "4px 0 0",
                  }}
                >
                  قم بضبط المحاضرة المرتبطة ووقت الامتحان ونسبة النجاح
                </p>
              </div>
            </div>

            <form
              onSubmit={handleSaveExam}
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <div>
                <label
                  className="form-label"
                  style={{
                    fontWeight: 700,
                    marginBottom: "6px",
                    display: "block",
                  }}
                >
                  عنوان الامتحان *
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: امتحان شامل على تطبيقات التفاضل"
                  value={newExamData.title}
                  onChange={(e) =>
                    setNewExamData({ ...newExamData, title: e.target.value })
                  }
                  className="form-input"
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <label
                  className="form-label"
                  style={{
                    fontWeight: 700,
                    marginBottom: "6px",
                    display: "block",
                  }}
                >
                  ربط بالمحاضرة (اختياري)
                </label>
                <select
                  value={newExamData.lesson_id}
                  onChange={(e) =>
                    setNewExamData({
                      ...newExamData,
                      lesson_id: e.target.value ? Number(e.target.value) : "",
                    })
                  }
                  className="form-input"
                  style={{ width: "100%" }}
                >
                  <option value="" disabled>
                    بدون ربط بمحاضرة
                  </option>
                  {lessonsList.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title} ({l.grade})
                    </option>
                  ))}
                </select>
              </div>

              <div
                className="grid-2col"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                }}
              >
                <div>
                  <label
                    className="form-label"
                    style={{
                      fontWeight: 700,
                      marginBottom: "6px",
                      display: "block",
                    }}
                  >
                    المدة بالدقائق
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="180"
                    value={newExamData.duration_minutes}
                    onChange={(e) =>
                      setNewExamData({
                        ...newExamData,
                        duration_minutes: Number(e.target.value),
                      })
                    }
                    className="form-input"
                    style={{ width: "100%" }}
                  />
                </div>

                <div>
                  <label
                    className="form-label"
                    style={{
                      fontWeight: 700,
                      marginBottom: "6px",
                      display: "block",
                    }}
                  >
                    نسبة النجاح % (اختياري)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="بدون نسبة"
                    value={newExamData.passing_percentage ?? ""}
                    onChange={(e) =>
                      setNewExamData({
                        ...newExamData,
                        passing_percentage:
                          e.target.value === "" ? "" : Number(e.target.value),
                      })
                    }
                    className="form-input"
                    style={{ width: "100%" }}
                  />
                </div>
              </div>

              <div>
                <label
                  className="form-label"
                  style={{
                    fontWeight: 700,
                    marginBottom: "6px",
                    display: "block",
                  }}
                >
                  وصف الامتحان (اختياري)
                </label>
                <textarea
                  rows={2}
                  placeholder="ملاحظات أو تنبيهات للطالب قبل بدء هذا الاختبار..."
                  value={newExamData.description}
                  onChange={(e) =>
                    setNewExamData({
                      ...newExamData,
                      description: e.target.value,
                    })
                  }
                  className="form-input"
                  style={{ width: "100%", resize: "vertical" }}
                />
              </div>

              <div
                style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}
              >
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="btn-primary"
                  style={{ flex: 1, justifyContent: "center", padding: "11px" }}
                >
                  {isProcessing
                    ? "جاري الحفظ..."
                    : editingExam
                      ? "حفظ التعديلات"
                      : "إنشاء وحفظ الامتحان"}
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setIsAddExamOpen(false)}
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

      {/* MODAL: ADD / EDIT QUESTION WITH CHOICES (اختيارات السؤال) */}
      {questionModal.isOpen && (
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
              setQuestionModal({ ...questionModal, isOpen: false });
            }
          }}
        >
          <div
            className="feature-card"
            style={{
              width: "100%",
              maxWidth: "min(580px, 96vw)",
              maxHeight: "92vh",
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
              onClick={() =>
                setQuestionModal({ ...questionModal, isOpen: false })
              }
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

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "1.25rem",
              }}
            >
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
                <HelpCircle size={22} />
              </div>
              <div>
                <h2
                  style={{
                    fontSize: "1.2rem",
                    fontWeight: 800,
                    color: "#fff",
                    margin: 0,
                  }}
                >
                  {questionModal.isEdit
                    ? "تعديل السؤال واختيارات الإجابة"
                    : "إضافة سؤال وتعيين اختيارات الإجابة"}
                </h2>
                <p
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text-muted)",
                    margin: "4px 0 0",
                  }}
                >
                  أدخل نص السؤال، وضع اختيارات الإجابة (أ، ب، جـ، د)، وحدد
                  الإجابة الصحيحة
                </p>
              </div>
            </div>

            <form
              onSubmit={handleSaveQuestion}
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <div>
                <label
                  className="form-label"
                  style={{
                    fontWeight: 700,
                    marginBottom: "6px",
                    display: "block",
                  }}
                >
                  نص السؤال *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="مثال: إذا كانت د(س) = س³ - ٣س، فإن النقطة الحرجة للدالة تقع عند س = ..."
                  value={questionModal.question_text}
                  onChange={(e) =>
                    setQuestionModal({
                      ...questionModal,
                      question_text: e.target.value,
                    })
                  }
                  className="form-input"
                  style={{ width: "100%", resize: "vertical" }}
                />
              </div>

              <div>
                <label
                  className="form-label"
                  style={{
                    fontWeight: 700,
                    marginBottom: "6px",
                    display: "block",
                  }}
                >
                  درجة السؤال (النقاط)
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={questionModal.points}
                  onChange={(e) =>
                    setQuestionModal({
                      ...questionModal,
                      points: Number(e.target.value),
                    })
                  }
                  className="form-input"
                  style={{ width: "100px" }}
                />
              </div>

              {/* QUESTION CHOICES SECTION (اختيارات السؤال) */}
              <div
                style={{
                  background: "rgba(15, 23, 42, 0.5)",
                  borderRadius: "12px",
                  border: "1px solid rgba(6, 182, 212, 0.2)",
                  padding: "1rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.75rem",
                  }}
                >
                  <label
                    className="form-label"
                    style={{ fontWeight: 800, color: "var(--cyan)", margin: 0 }}
                  >
                    اختيارات السؤال وتحديد الإجابة الصحيحة *
                  </label>
                  <span
                    style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}
                  >
                    اختر الدائرة للإجابة الصحيحة
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                  }}
                >
                  {/* OPTION 1 */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      background:
                        questionModal.correctOption === 1
                          ? "rgba(16, 185, 129, 0.1)"
                          : "transparent",
                      padding: "4px 8px",
                      borderRadius: "8px",
                      border:
                        questionModal.correctOption === 1
                          ? "1px solid rgba(16, 185, 129, 0.3)"
                          : "1px solid transparent",
                    }}
                  >
                    <input
                      type="radio"
                      id="opt-radio-1"
                      name="correctOption"
                      checked={questionModal.correctOption === 1}
                      onChange={() =>
                        setQuestionModal({ ...questionModal, correctOption: 1 })
                      }
                      style={{
                        cursor: "pointer",
                        width: "18px",
                        height: "18px",
                      }}
                    />
                    <label
                      htmlFor="opt-radio-1"
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        color:
                          questionModal.correctOption === 1
                            ? "var(--emerald)"
                            : "var(--text-muted)",
                        minWidth: "60px",
                        cursor: "pointer",
                      }}
                    >
                      الخيار (أ):
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="أدخل الاختيار الأول"
                      value={questionModal.opt1}
                      onChange={(e) =>
                        setQuestionModal({
                          ...questionModal,
                          opt1: e.target.value,
                        })
                      }
                      className="form-input"
                      style={{ flex: 1 }}
                    />
                  </div>

                  {/* OPTION 2 */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      background:
                        questionModal.correctOption === 2
                          ? "rgba(16, 185, 129, 0.1)"
                          : "transparent",
                      padding: "4px 8px",
                      borderRadius: "8px",
                      border:
                        questionModal.correctOption === 2
                          ? "1px solid rgba(16, 185, 129, 0.3)"
                          : "1px solid transparent",
                    }}
                  >
                    <input
                      type="radio"
                      id="opt-radio-2"
                      name="correctOption"
                      checked={questionModal.correctOption === 2}
                      onChange={() =>
                        setQuestionModal({ ...questionModal, correctOption: 2 })
                      }
                      style={{
                        cursor: "pointer",
                        width: "18px",
                        height: "18px",
                      }}
                    />
                    <label
                      htmlFor="opt-radio-2"
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        color:
                          questionModal.correctOption === 2
                            ? "var(--emerald)"
                            : "var(--text-muted)",
                        minWidth: "60px",
                        cursor: "pointer",
                      }}
                    >
                      الخيار (ب):
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="أدخل الاختيار الثاني"
                      value={questionModal.opt2}
                      onChange={(e) =>
                        setQuestionModal({
                          ...questionModal,
                          opt2: e.target.value,
                        })
                      }
                      className="form-input"
                      style={{ flex: 1 }}
                    />
                  </div>

                  {/* OPTION 3 */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      background:
                        questionModal.correctOption === 3
                          ? "rgba(16, 185, 129, 0.1)"
                          : "transparent",
                      padding: "4px 8px",
                      borderRadius: "8px",
                      border:
                        questionModal.correctOption === 3
                          ? "1px solid rgba(16, 185, 129, 0.3)"
                          : "1px solid transparent",
                    }}
                  >
                    <input
                      type="radio"
                      id="opt-radio-3"
                      name="correctOption"
                      checked={questionModal.correctOption === 3}
                      onChange={() =>
                        setQuestionModal({ ...questionModal, correctOption: 3 })
                      }
                      style={{
                        cursor: "pointer",
                        width: "18px",
                        height: "18px",
                      }}
                    />
                    <label
                      htmlFor="opt-radio-3"
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        color:
                          questionModal.correctOption === 3
                            ? "var(--emerald)"
                            : "var(--text-muted)",
                        minWidth: "60px",
                        cursor: "pointer",
                      }}
                    >
                      الخيار (جـ):
                    </label>
                    <input
                      type="text"
                      placeholder="أدخل الاختيار الثالث (اختياري)"
                      value={questionModal.opt3}
                      onChange={(e) =>
                        setQuestionModal({
                          ...questionModal,
                          opt3: e.target.value,
                        })
                      }
                      className="form-input"
                      style={{ flex: 1 }}
                    />
                  </div>

                  {/* OPTION 4 */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      background:
                        questionModal.correctOption === 4
                          ? "rgba(16, 185, 129, 0.1)"
                          : "transparent",
                      padding: "4px 8px",
                      borderRadius: "8px",
                      border:
                        questionModal.correctOption === 4
                          ? "1px solid rgba(16, 185, 129, 0.3)"
                          : "1px solid transparent",
                    }}
                  >
                    <input
                      type="radio"
                      id="opt-radio-4"
                      name="correctOption"
                      checked={questionModal.correctOption === 4}
                      onChange={() =>
                        setQuestionModal({ ...questionModal, correctOption: 4 })
                      }
                      style={{
                        cursor: "pointer",
                        width: "18px",
                        height: "18px",
                      }}
                    />
                    <label
                      htmlFor="opt-radio-4"
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        color:
                          questionModal.correctOption === 4
                            ? "var(--emerald)"
                            : "var(--text-muted)",
                        minWidth: "60px",
                        cursor: "pointer",
                      }}
                    >
                      الخيار (د):
                    </label>
                    <input
                      type="text"
                      placeholder="أدخل الاختيار الرابع (اختياري)"
                      value={questionModal.opt4}
                      onChange={(e) =>
                        setQuestionModal({
                          ...questionModal,
                          opt4: e.target.value,
                        })
                      }
                      className="form-input"
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>
              </div>

              <div
                style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}
              >
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="btn-primary"
                  style={{ flex: 1, justifyContent: "center", padding: "11px" }}
                >
                  {isProcessing
                    ? "جاري الحفظ..."
                    : questionModal.isEdit
                      ? "حفظ تعديل السؤال"
                      : "حفظ السؤال والخيارات"}
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() =>
                    setQuestionModal({ ...questionModal, isOpen: false })
                  }
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
      {deleteConfirmation && (
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
              setDeleteConfirmation(null);
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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "1rem",
              }}
            >
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
                  {deleteConfirmation.type === "exam"
                    ? "تأكيد حذف الامتحان"
                    : "تأكيد حذف السؤال"}
                </h3>
                <span
                  style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}
                >
                  عملية الحذف لا يمكن التراجع عنها
                </span>
              </div>
            </div>

            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "0.9rem",
                lineHeight: 1.7,
                margin: "0 0 1.25rem",
              }}
            >
              هل أنت متأكد من حذف:{" "}
              <strong style={{ color: "#fff" }}>
                [ {deleteConfirmation.title} ]
              </strong>
              ؟
            </p>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                disabled={isProcessing}
                onClick={confirmDeleteAction}
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
                {isProcessing ? "جاري الحذف..." : "نعم، حذف نهائي"}
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setDeleteConfirmation(null)}
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

/* =========================================================================
   QUIZ VIEW COMPONENT (FOR STUDENTS OR TEACHER TEST-DRIVE)
   ========================================================================= */

function firstArray(...candidates) {
  return candidates.find(Array.isArray) || [];
}

function normalizeExamQuestion(question) {
  const options = Array.isArray(question.options) ? question.options : [];
  const correctIndex = Number.isInteger(question.correctIndex)
    ? question.correctIndex
    : options.findIndex(
        (option) =>
          option?.is_correct || option?.id === question.correct_option_id,
      );

  return {
    ...question,
    question: question.question || question.question_text || "",
    options: options.map((option) =>
      typeof option === "string"
        ? option
        : option.option_text || option.text || "",
    ),
    optionIds: options.map((option) =>
      typeof option === "string" ? null : option.id || option.option_id || null,
    ),
    id: question.id || question.question_id || null,
    correctIndex,
  };
}

// Latest attempt the student already SUBMITTED (GET /student/exams/{exam}/attempts).
// An attempt that is only started / in progress must never count as submitted,
// otherwise starting a fresh exam would reopen it as "already solved".
function pickSubmittedAttempt(attempts, examId) {
  const list = Array.isArray(attempts)
    ? attempts
    : firstArray(attempts?.attempts, attempts?.data);
  const IN_PROGRESS = [
    "in_progress",
    "started",
    "active",
    "ongoing",
    "pending",
  ];
  const DONE = [
    "submitted",
    "completed",
    "finished",
    "graded",
    "passed",
    "failed",
  ];
  const submitted = list.filter((attempt) => {
    const status = String(attempt?.status ?? "").toLowerCase();
    if (IN_PROGRESS.includes(status)) return false;
    const attemptExamId = attempt?.exam_id ?? attempt?.exam?.id;
    if (
      attemptExamId != null &&
      examId != null &&
      String(attemptExamId) !== String(examId)
    ) {
      return false;
    }
    return Boolean(
      attempt?.submitted_at ||
      attempt?.finished_at ||
      attempt?.completed_at ||
      DONE.includes(status),
    );
  });
  if (submitted.length === 0) return null;
  const idOf = (attempt) => Number(attempt.id ?? attempt.attempt_id);
  return submitted.reduce(
    (latest, attempt) => (idOf(attempt) > idOf(latest) ? attempt : latest),
    submitted[0],
  );
}

// Reads GET /student/lessons/{lesson}/quiz/answers into
// { questionId -> { selectedId, correctId, isCorrect } }
function buildReviewMap(data) {
  const attempt = data?.attempt || data;
  const list = firstArray(
    attempt?.answers,
    data?.answers,
    data?.quiz_answers,
    attempt?.quiz_answers,
    data?.questions,
  );
  const map = new Map();
  list.forEach((item) => {
    const questionId = item.question_id ?? item.question?.id ?? item.id;
    if (questionId == null) return;
    const options = item.options || item.question?.options || [];
    const selectedId =
      item.selected_option_id ??
      item.option_id ??
      item.selected_option?.id ??
      item.option?.id;
    const correctId =
      item.correct_option_id ??
      item.correct_option?.id ??
      options.find((option) => option?.is_correct)?.id;
    const isCorrect =
      item.is_correct ??
      (selectedId != null && correctId != null
        ? String(selectedId) === String(correctId)
        : undefined);
    map.set(String(questionId), { selectedId, correctId, isCorrect });
  });
  return map;
}

// Fallback when the exam questions can't be loaded again for a solved exam
function questionsFromReview(data) {
  const attempt = data?.attempt || data;
  return firstArray(
    attempt?.answers,
    data?.answers,
    data?.quiz_answers,
    data?.questions,
  )
    .map((item) => ({
      id: item.question_id ?? item.question?.id ?? item.id,
      question_text: item.question_text ?? item.question?.question_text ?? "",
      options: item.options || item.question?.options || [],
    }))
    .filter((question) => question.id != null && question.options.length > 0);
}

function findOptionIndex(optionIds, target) {
  if (target == null) return -1;
  return optionIds.findIndex(
    (optionId) => optionId != null && String(optionId) === String(target),
  );
}

function QuizView({ lesson, examId, isTeacher, student, showToast }) {
  const {
    startExamAttempt,
    submitExamAttempt,
    getStudentExam,
    getStudentExamAttempts,
    getStudentLessonQuizAnswers,
  } = useStudent();
  const initialQuiz = lesson?.quiz || lesson?.exam || null;
  const [examData, setExamData] = useState(isTeacher ? initialQuiz : null);
  const [examLoadState, setExamLoadState] = useState(
    isTeacher
      ? initialQuiz?.questions?.length
        ? "ready"
        : "loading"
      : "loading",
  );
  const [examLoadError, setExamLoadError] = useState("");
  const [serverResult, setServerResult] = useState(null);
  const questions = (examData?.questions || []).map(normalizeExamQuestion);
  const totalQuestions = questions.length;
  const hasAnswerKey =
    totalQuestions > 0 &&
    questions.every((question) => question.correctIndex >= 0);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(
    (lesson?.quiz?.durationMinutes || 10) * 60,
  );
  const [attemptId, setAttemptId] = useState(null);

  const isMountedRef = useRef(true);
  // Always points to the latest loadExam so the effect below can call it
  // without listing it as a dependency (and without re-running every render).
  const loadExamRef = useRef(null);
  // Prevents loading (and starting an attempt) twice for the same exam.
  const loadedKeyRef = useRef(null);
  const examLessonIdRef = useRef(lesson?.id);
  const loadExam = async () => {
    const isMounted = () => isMountedRef.current;

    if (isTeacher) {
      setExamData(lesson?.quiz || null);
      setExamLoadState("ready");
      return;
    }

    setExamLoadState("loading");

    try {
      if (!examId) throw new Error("معرّف الاختبار غير متاح من الخادم");

      // 1. Ask the backend for the exam FIRST. If it is locked the backend
      //    answers 403 and we show the lock screen, never a review.
      const response = await getStudentExam(examId);
      const exam =
        response?.exam ||
        response?.data?.exam ||
        response?.data?.data ||
        response?.data ||
        response;
      if (!isMounted()) return;

      const examLessonId = exam?.lesson_id ?? exam?.lesson?.id ?? lesson?.id;
      examLessonIdRef.current = examLessonId;

      // 2. Did the student already submit THIS exam?
      let previousAttempt = null;
      try {
        previousAttempt = pickSubmittedAttempt(
          await getStudentExamAttempts(examId),
          examId,
        );
      } catch {
        previousAttempt = null;
      }

      if (previousAttempt) {
        const previousId = previousAttempt.id ?? previousAttempt.attempt_id;

        let reviewData = null;
        if (examLessonId) {
          try {
            const reviewRes = await getStudentLessonQuizAnswers(
              examLessonId,
              previousId,
            );
            reviewData = reviewRes?.data ?? null;
          } catch {
            reviewData = null;
          }
        }

        // Never show a review that belongs to another exam
        const reviewExamId =
          reviewData?.attempt?.exam_id ??
          reviewData?.exam_id ??
          reviewData?.exam?.id;
        if (reviewExamId != null && String(reviewExamId) !== String(examId)) {
          reviewData = null;
        }

        if (!isMounted()) return;

        const examQuestions = exam?.questions?.length
          ? exam.questions
          : questionsFromReview(reviewData);
        setExamData({ ...exam, questions: examQuestions });

        const reviewMap = buildReviewMap(
          reviewData || { answers: previousAttempt.answers },
        );
        const reconstructed = {};
        examQuestions.map(normalizeExamQuestion).forEach((question, idx) => {
          const entry = reviewMap.get(String(question.id));
          const optionIdx = findOptionIndex(
            question.optionIds,
            entry?.selectedId,
          );
          if (optionIdx >= 0) reconstructed[idx] = optionIdx;
        });

        setSelectedAnswers(reconstructed);
        setServerResult({
          ...previousAttempt,
          ...(reviewData?.attempt || {}),
          ...(reviewData || {}),
        });
        setAttemptId(previousId ?? null);
        setIsSubmitted(true);
        setExamLoadState("ready");
        return;
      }

      // 3. Not solved yet: fresh attempt
      if (!Array.isArray(exam?.questions) || exam.questions.length === 0) {
        throw new Error("لم يُرجع الخادم أسئلة هذا الاختبار");
      }
      setExamData(exam);
      setTimeLeft((exam?.duration_minutes || exam?.durationMinutes || 10) * 60);

      const attempt = await startExamAttempt(examId);
      if (!attempt?.success && attempt?.success !== undefined) {
        throw new Error(attempt.message || "تعذر بدء الاختبار");
      }

      const startedAttemptId =
        attempt?.attempt_id ||
        attempt?.attempt?.id ||
        attempt?.data?.attempt_id ||
        attempt?.data?.attempt?.id ||
        attempt?.data?.id;

      if (!startedAttemptId) {
        throw new Error("لم يُرجع الخادم رقم محاولة الاختبار");
      }

      if (isMounted()) {
        setAttemptId(startedAttemptId);
        setExamLoadState("ready");
      }
    } catch (error) {
      if (isMounted()) {
        setExamLoadError(error.message || "تعذر تحميل الاختبار");
        setExamLoadState(
          error.isLocked || error.status === 403 ? "locked" : "error",
        );
      }
    }
  };

  // Keep the ref pointing at the newest loadExam after every render.
  useEffect(() => {
    loadExamRef.current = loadExam;
  });

  useEffect(() => {
    isMountedRef.current = true;

    if (typeof loadExamRef.current === "function") {
      if (isTeacher) {
        loadExamRef.current();
      } else {
        // Student: run once per exam, even if `lesson` changes identity or
        // React StrictMode re-runs the effect.
        const key = String(examId);
        if (loadedKeyRef.current !== key) {
          loadedKeyRef.current = key;
          loadExamRef.current();
        }
      }
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [examId, isTeacher, lesson]);

  useEffect(() => {
    if (examLoadState !== "ready" || isSubmitted || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsSubmitted(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [examLoadState, isSubmitted, timeLeft]);

  const handleSelectOption = (optIdx) => {
    if (isSubmitted) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentIdx]: optIdx,
    }));
  };

  const calculateScore = () => {
    let score = 0;
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctIndex) {
        score += 1;
      }
    });
    return score;
  };

  const handleSubmit = async () => {
    if (!isTeacher && Object.keys(selectedAnswers).length < totalQuestions) {
      showToast("أجب عن جميع الأسئلة قبل التسليم", "error");
      return;
    }

    const score = isTeacher ? calculateScore() : null;
    let submittedPercentage = null;

    if (!isTeacher) {
      try {
        const answersPayload = questions.map((question, index) => {
          const optionId = question.optionIds[selectedAnswers[index]];
          if (!question.id || !optionId) {
            throw new Error(
              "تعذر إرسال إجابة دون معرّفات السؤال والاختيار من الخادم",
            );
          }
          return { question_id: question.id, option_id: optionId };
        });
        const response = await submitExamAttempt(examId, {
          attempt_id: attemptId,
          answers: answersPayload,
        });

        if (response?.success === false) {
          throw new Error(response.message || "تعذر تسليم إجابات الاختبار");
        }

        let resultData =
          response?.result ||
          response?.data?.result ||
          response?.data?.data ||
          response?.data ||
          response ||
          null;
        try {
          const answerReview = await getStudentLessonQuizAnswers(
            lesson.id,
            attemptId,
          );
          if (answerReview?.data) {
            resultData = { ...resultData, ...answerReview.data };
          }
        } catch (error) {
          console.warn("Could not load submitted answer review:", error);
        }
        setServerResult(resultData);
        const resultAttempt =
          resultData?.attempt ||
          resultData?.exam_attempt ||
          resultData?.result ||
          resultData;
        const reportedPercentage = Number(
          resultAttempt?.percentage ??
            resultAttempt?.percentage_score ??
            resultAttempt?.score_percentage,
        );
        const submittedScore = Number(
          resultAttempt?.score ??
            resultAttempt?.correct_answers ??
            resultAttempt?.correctAnswers,
        );
        submittedPercentage = Number.isFinite(reportedPercentage)
          ? reportedPercentage
          : Number.isFinite(submittedScore)
            ? Math.round((submittedScore / (totalQuestions || 1)) * 100)
            : null;
      } catch (error) {
        showToast(error.message || "تعذر تسليم إجابات الاختبار", "error");
        return;
      }
    }

    setIsSubmitted(true);
    const percentage = isTeacher
      ? hasAnswerKey
        ? Math.round((score / (totalQuestions || 1)) * 100)
        : null
      : submittedPercentage;

    if (percentage >= 50) {
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {
        console.error(e);
      }
      showToast(
        `أحسنت يا ${student?.name || "بطل الرياضيات"}! نتيجتك: ${percentage}% 🏆`,
      );
    } else if (percentage !== null) {
      showToast(`درجتك ${percentage}%، راجع الشرح 💪`);
    } else {
      showToast("تم تسليم إجاباتك بنجاح");
    }
  };

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Correct / wrong answers per question, as saved by the backend
  const reviewMap = buildReviewMap(serverResult);
  const reviewEntries = [...reviewMap.values()];
  const reviewCorrectCount =
    reviewEntries.length > 0 &&
    reviewEntries.every((entry) => entry.isCorrect !== undefined)
      ? reviewEntries.filter((entry) => entry.isCorrect).length
      : null;

  const localScore = isTeacher ? calculateScore() : null;
  const reportedScore = Number(
    serverResult?.score ??
      serverResult?.correct_answers ??
      serverResult?.correctAnswers,
  );
  const score = Number.isFinite(reportedScore)
    ? reportedScore
    : isTeacher && hasAnswerKey
      ? localScore
      : reviewCorrectCount;
  const reportedPercentage = Number(serverResult?.percentage);
  const percentage = Number.isFinite(reportedPercentage)
    ? Math.round(reportedPercentage)
    : score !== null
      ? Math.round((score / (totalQuestions || 1)) * 100)
      : null;

  if (examLoadState === "loading") {
    return (
      <div
        className="container"
        style={{ textAlign: "center", padding: "5rem 1rem" }}
      >
        <h2>جارٍ تجهيز الاختبار...</h2>
        <p style={{ color: "var(--text-muted)", marginTop: "8px" }}>
          يتم تجهيز الأسئلة وبدء الجلسة المؤمّنة للطالب
        </p>
      </div>
    );
  }

  if (examLoadState === "locked") {
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
            هذا الاختبار مقفل حالياً
          </h2>
          <p
            style={{
              fontSize: "0.85rem",
              color: "var(--text-muted)",
              marginTop: "8px",
              lineHeight: "1.6",
            }}
          >
            {examLoadError ||
              "يلزم إكمال مشاهدة الفيديو المطلوب بنسبة 80% على الأقل لفتح هذا الاختبار"}
          </p>
          <Link
            to={`/watch/${lesson.id}`}
            className="btn-primary"
            style={{ marginTop: "1.5rem", display: "inline-flex" }}
          >
            الانتقال لمشاهدة شرح الدرس
          </Link>
        </div>
      </div>
    );
  }

  if (examLoadState === "error") {
    return (
      <div
        className="container"
        style={{ textAlign: "center", padding: "5rem 1rem", maxWidth: "600px" }}
      >
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-xl)",
            padding: "2.5rem 1.5rem",
          }}
        >
          <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#fff" }}>
            تعذر فتح الاختبار
          </h2>
          <p
            style={{
              fontSize: "0.85rem",
              color: "var(--text-muted)",
              marginTop: "8px",
              lineHeight: "1.6",
            }}
          >
            {examLoadError || "حدث خطأ غير متوقع أثناء تحميل بيانات الاختبار"}
          </p>
          <Link
            to="/lessons"
            className="btn-primary"
            style={{ marginTop: "1.5rem", display: "inline-flex" }}
          >
            العودة لصفحة الدروس
          </Link>
        </div>
      </div>
    );
  }

  if (!examData || totalQuestions === 0) {
    return (
      <div
        className="container"
        style={{ textAlign: "center", padding: "5rem 1rem" }}
      >
        <h2>لا توجد أسئلة مضافة لهذا الاختبار حالياً</h2>
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

  const currentQ = questions[currentIdx];
  const optionLetters = ["أ", "ب", "جـ", "د"];

  return (
    <div
      style={{
        maxWidth: "750px",
        width: "100%",
        margin: "0 auto",
        boxSizing: "border-box",
      }}
    >
      {/* Top Header & Timer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <span
            style={{
              fontSize: "0.75rem",
              color: "var(--cyan)",
              fontWeight: 800,
            }}
          >
            {lesson.branch} • {lesson.title}
          </span>
          <h1
            style={{
              fontSize: "1.35rem",
              fontWeight: 900,
              color: "#fff",
              marginTop: "4px",
            }}
          >
            {examData?.title || lesson?.quiz?.title || "اختبار الرياضيات"}
          </h1>
          <p className="section-desc">
            طالب:{" "}
            <strong style={{ color: "#fff" }}>
              {student?.name || "طالب متميز"}
            </strong>{" "}
            ({student?.grade || lesson.grade})
          </p>
        </div>

        {!isSubmitted && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(15, 23, 42, 0.9)",
              padding: "8px 16px",
              borderRadius: "var(--radius-md)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              color: "var(--amber)",
              fontWeight: 800,
              fontSize: "0.9rem",
            }}
          >
            <Timer size={18} />
            <span>{formatTime(timeLeft)}</span>
          </div>
        )}
      </div>

      {isSubmitted ? (
        /* Result Screen */
        <div
          className="form-card"
          style={{ textAlign: "center", padding: "3rem 2rem" }}
        >
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "24px",
              background:
                percentage !== null && percentage >= 50
                  ? "linear-gradient(135deg, #10b981 0%, #06b6d4 100%)"
                  : "linear-gradient(135deg, #f43f5e 0%, #ea580c 100%)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.5rem",
            }}
          >
            <Trophy size={40} />
          </div>

          <h2 style={{ fontSize: "1.5rem", fontWeight: 900, color: "#fff" }}>
            {percentage !== null
              ? percentage >= 50
                ? "مبروك! اجتزت الاختبار بنجاح 🎉"
                : "راجع إجاباتك وتعلّم من أخطائك 💪"
              : "تم إرسال إجابات الاختبار بنجاح"}
          </h2>

          <div
            style={{
              fontSize: "3rem",
              fontWeight: 900,
              color:
                percentage !== null && percentage >= 50
                  ? "var(--emerald)"
                  : "var(--rose)",
              margin: "1rem 0",
            }}
          >
            {percentage !== null ? `${percentage}%` : "تم التسليم"}
          </div>

          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "0.9rem",
              marginBottom: "2rem",
            }}
          >
            {score !== null
              ? `أجبت على ${score} من أصل ${totalQuestions} أسئلة بشكل صحيح.`
              : "تم تسجيل إجاباتك في السيرفر بنجاح."}
          </p>

          <section
            className="exam-answer-review"
            aria-labelledby="exam-review-title"
          >
            <h3 id="exam-review-title">مراجعة إجاباتك</h3>
            <div className="exam-answer-review__list">
              {questions.map((question, index) => {
                const entry = reviewMap.get(String(question.id));

                // Student's answer: from the saved selection / the backend
                const selectedFromBackend = findOptionIndex(
                  question.optionIds,
                  entry?.selectedId,
                );
                const selectedIndex =
                  selectedAnswers[index] !== undefined
                    ? selectedAnswers[index]
                    : selectedFromBackend >= 0
                      ? selectedFromBackend
                      : undefined;

                // Correct answer: the backend review first, then the exam data
                const correctFromBackend = findOptionIndex(
                  question.optionIds,
                  entry?.correctId,
                );
                const correctIndex =
                  correctFromBackend >= 0
                    ? correctFromBackend
                    : question.correctIndex;
                const hasCorrectOption =
                  Number.isInteger(correctIndex) && correctIndex >= 0;

                const isCorrect =
                  entry?.isCorrect !== undefined
                    ? Boolean(entry.isCorrect)
                    : hasCorrectOption && selectedIndex === correctIndex;
                const hasVerdict =
                  entry?.isCorrect !== undefined || hasCorrectOption;

                return (
                  <article
                    className="exam-review-question"
                    key={question.id || index}
                  >
                    <div className="exam-review-question__header">
                      <h4>
                        السؤال {index + 1}: {question.question}
                      </h4>
                      <span
                        className={`exam-review-status ${!hasVerdict ? "is-pending" : isCorrect ? "is-correct" : "is-incorrect"}`}
                      >
                        {hasVerdict
                          ? isCorrect
                            ? "إجابة صحيحة"
                            : "إجابة غير صحيحة"
                          : "الإجابة النموذجية غير متاحة"}
                      </span>
                    </div>
                    <div className="exam-review-options">
                      {question.options.map((option, optionIndex) => {
                        const isSelected = selectedIndex === optionIndex;
                        const isCorrectOption =
                          hasCorrectOption && correctIndex === optionIndex;
                        const optionClass = isCorrectOption
                          ? "is-correct"
                          : isSelected
                            ? "is-incorrect"
                            : "";

                        return (
                          <div
                            className={`exam-review-option ${optionClass}`}
                            key={question.optionIds[optionIndex] || optionIndex}
                          >
                            <span>{option}</span>
                            {isSelected && isCorrectOption && (
                              <span className="exam-review-option__label">
                                إجابتك الصحيحة
                              </span>
                            )}
                            {isSelected && !isCorrectOption && (
                              <span className="exam-review-option__label">
                                إجابتك
                              </span>
                            )}
                            {isCorrectOption && !isSelected && (
                              <span className="exam-review-option__label">
                                الإجابة الصحيحة
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <div
            className="exam-result-actions"
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "center",
              flexWrap: "wrap",
              marginTop: "2rem",
            }}
          >
            <Link
              to="/lessons"
              className="btn-primary"
              style={{ padding: "10px 24px" }}
            >
              العودة للدروس
            </Link>
          </div>
        </div>
      ) : (
        /* Questions Stepper & Current Question */
        <div
          className="form-card"
          style={{ padding: "clamp(1rem, 4vw, 2rem)" }}
        >
          {/* Progress Bar & Indicators */}
          <div style={{ marginBottom: "1.75rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.8rem",
                color: "var(--text-muted)",
                marginBottom: "8px",
              }}
            >
              <span>
                السؤال {currentIdx + 1} من {totalQuestions}
              </span>
              <span>
                المتبقي: {totalQuestions - Object.keys(selectedAnswers).length}{" "}
                أسئلة
              </span>
            </div>
            <div
              style={{
                height: "6px",
                background: "#1e293b",
                borderRadius: "3px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${((currentIdx + 1) / totalQuestions) * 100}%`,
                  background:
                    "linear-gradient(90deg, var(--indigo) 0%, var(--cyan) 100%)",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>

          {/* Question Text */}
          <div style={{ marginBottom: "2rem" }}>
            <span
              style={{
                display: "inline-block",
                padding: "2px 8px",
                background: "rgba(6, 182, 212, 0.15)",
                color: "var(--cyan)",
                borderRadius: "4px",
                fontSize: "0.75rem",
                fontWeight: 700,
                marginBottom: "8px",
              }}
            >
              سؤال اختياري
            </span>
            <h3
              style={{
                fontSize: "1.15rem",
                fontWeight: 800,
                color: "#fff",
                lineHeight: 1.6,
              }}
            >
              {currentQ.question}
            </h3>
          </div>

          {/* Options List */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              marginBottom: "2.5rem",
            }}
          >
            {currentQ.options.map((opt, optIdx) => {
              const isSelected = selectedAnswers[currentIdx] === optIdx;
              return (
                <button
                  key={optIdx}
                  onClick={() => handleSelectOption(optIdx)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "1rem 1.25rem",
                    borderRadius: "var(--radius-md)",
                    background: isSelected
                      ? "rgba(6, 182, 212, 0.12)"
                      : "rgba(15, 23, 42, 0.6)",
                    border: `1.5px solid ${isSelected ? "var(--cyan)" : "var(--border-subtle)"}`,
                    color: isSelected ? "#fff" : "var(--text-muted)",
                    cursor: "pointer",
                    textAlign: "right",
                    transition: "all 0.2s ease",
                    boxShadow: isSelected
                      ? "0 0 15px rgba(6, 182, 212, 0.15)"
                      : "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <span
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "8px",
                        background: isSelected ? "var(--cyan)" : "#1e293b",
                        color: isSelected ? "#000" : "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        fontSize: "0.8rem",
                      }}
                    >
                      {optionLetters[optIdx] || optIdx + 1}
                    </span>
                    <span style={{ fontSize: "0.95rem", fontWeight: 600 }}>
                      {opt}
                    </span>
                  </div>
                  {isSelected && (
                    <CheckCircle size={18} style={{ color: "var(--cyan)" }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Navigation Controls */}
          <div
            className="quiz-nav-row"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: "1rem",
              borderTop: "1px solid var(--border-subtle)",
              flexWrap: "wrap",
              gap: "0.75rem",
            }}
          >
            <button
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx((p) => Math.max(0, p - 1))}
              className="btn-secondary"
              style={{ opacity: currentIdx === 0 ? 0.3 : 1 }}
            >
              <ArrowRight size={16} />
              <span>السابق</span>
            </button>

            {currentIdx < totalQuestions - 1 ? (
              <button
                onClick={() => {
                  if (!isTeacher && selectedAnswers[currentIdx] === undefined) {
                    showToast(
                      "أجب عن هذا السؤال قبل الانتقال إلى السؤال التالي",
                      "error",
                    );
                    return;
                  }
                  setCurrentIdx((p) => Math.min(totalQuestions - 1, p + 1));
                }}
                className="btn-primary"
              >
                <span>التالي</span>
                <ArrowLeft size={16} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="btn-primary"
                style={{
                  background:
                    "linear-gradient(135deg, #10b981 0%, #06b6d4 100%)",
                }}
              >
                <CheckCircle size={16} />
                <span>تسليم الامتحان وإنهاء</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
