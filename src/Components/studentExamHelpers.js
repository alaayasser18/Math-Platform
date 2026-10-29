import { GRADE_ID_MAP } from "../services/api";

/**
 * Safely extracts a full Arabic grade name (e.g. "الصف الأول الثانوي")
 */
export function getSafeGradeName(grade, gradeId) {
  if (typeof grade === "string") {
    const trimmed = grade.trim();
    if (
      trimmed.includes("الثانوي") ||
      trimmed.includes("الإعدادي") ||
      trimmed.includes("الصف")
    ) {
      return trimmed;
    }
    const num = Number(trimmed);
    if (!isNaN(num) && GRADE_ID_MAP[num]) {
      return GRADE_ID_MAP[num];
    }
    if (GRADE_ID_MAP[trimmed.toLowerCase()]) {
      const mappedId = GRADE_ID_MAP[trimmed.toLowerCase()];
      if (GRADE_ID_MAP[mappedId]) return GRADE_ID_MAP[mappedId];
    }
  }

  if (grade && typeof grade === "object") {
    if (typeof grade.name === "string" && grade.name.trim()) {
      return getSafeGradeName(grade.name, grade.id || gradeId);
    }
    if (typeof grade.title === "string" && grade.title.trim()) {
      return getSafeGradeName(grade.title, grade.id || gradeId);
    }
  }

  const numericId = Number(
    gradeId || (typeof grade === "object" ? grade?.id : grade),
  );
  if (numericId && GRADE_ID_MAP[numericId]) {
    return GRADE_ID_MAP[numericId];
  }

  return "";
}

/**
 * Safely extracts student full name string
 */
export function getSafeStudentName(std) {
  if (!std) return "الطالب";
  if (typeof std.name === "string" && std.name.trim()) return std.name.trim();
  const first = typeof std.first_name === "string" ? std.first_name : "";
  const last = typeof std.last_name === "string" ? std.last_name : "";
  const combined = `${first} ${last}`.trim();
  if (combined) return combined;
  return "الطالب";
}

/**
 * Normalizes any response structure from the backend or localStorage into a standard attempt object.
 */
export function normalizeStudentQuizAttempt(responseOrData, lesson = null) {
  if (!responseOrData) return null;
  const payload =
    responseOrData?.data?.data ?? responseOrData?.data ?? responseOrData;
  if (!payload) return null;

  const attempt = Array.isArray(payload)
    ? {}
    : payload?.attempt ||
      payload?.quiz_attempt ||
      payload?.exam_attempt ||
      payload ||
      {};

  const rawAnswers = Array.isArray(payload)
    ? payload
    : attempt.answers ||
      attempt.quiz_answers ||
      attempt.student_answers ||
      attempt.questions ||
      payload?.answers ||
      payload?.quiz_answers ||
      payload?.student_answers ||
      payload?.questions ||
      [];

  if (
    !rawAnswers.length &&
    !attempt.id &&
    attempt.score == null &&
    attempt.percentage == null
  ) {
    return null;
  }

  const questions = rawAnswers.map((answer, index) => {
    const questionObj =
      answer.question && typeof answer.question === "object"
        ? answer.question
        : answer.quiz_question && typeof answer.quiz_question === "object"
          ? answer.quiz_question
          : typeof answer === "object" && (answer.text || answer.question)
            ? answer
            : {};

    const rawOptions =
      questionObj.options ||
      answer.options ||
      questionObj.choices ||
      answer.choices ||
      [];

    const options = rawOptions.map((opt) => {
      if (typeof opt === "string") return opt;
      return (
        opt?.text ||
        opt?.option_text ||
        opt?.content ||
        opt?.title ||
        opt?.name ||
        ""
      );
    });

    const selectedOptionId =
      answer.selected_option_id ??
      answer.selectedOptionId ??
      answer.option_id ??
      answer.selected_option?.id ??
      answer.selected_option?.option_id ??
      answer.student_option_id ??
      answer.student_answer;

    const correctOptionId =
      answer.correct_option_id ??
      answer.correctOptionId ??
      questionObj.correct_option_id ??
      questionObj.correctOptionId ??
      answer.correct_option?.id ??
      answer.correct_option?.option_id ??
      (Array.isArray(rawOptions)
        ? rawOptions.find(
            (o) =>
              typeof o === "object" &&
              (o.is_correct === true ||
                o.is_correct === 1 ||
                o.is_correct === "1"),
          )?.id
        : undefined);

    let studentIndex = -1;
    let correctIndex = -1;

    if (Array.isArray(rawOptions) && rawOptions.length > 0) {
      if (selectedOptionId != null) {
        studentIndex = rawOptions.findIndex(
          (opt) =>
            typeof opt === "object" &&
            String(opt.id) === String(selectedOptionId),
        );
      }
      if (correctOptionId != null) {
        correctIndex = rawOptions.findIndex(
          (opt) =>
            typeof opt === "object" &&
            String(opt.id) === String(correctOptionId),
        );
      }
      if (correctIndex < 0) {
        correctIndex = rawOptions.findIndex(
          (opt) =>
            typeof opt === "object" &&
            (opt.is_correct === true ||
              opt.is_correct === 1 ||
              opt.is_correct === "1"),
        );
      }
    }

    if (studentIndex < 0 && typeof selectedOptionId === "number") {
      if (selectedOptionId >= 0 && selectedOptionId < options.length) {
        studentIndex = selectedOptionId;
      } else if (selectedOptionId >= 1 && selectedOptionId <= options.length) {
        studentIndex = selectedOptionId - 1;
      }
    }
    if (correctIndex < 0 && typeof correctOptionId === "number") {
      if (correctOptionId >= 0 && correctOptionId < options.length) {
        correctIndex = correctOptionId;
      } else if (correctOptionId >= 1 && correctOptionId <= options.length) {
        correctIndex = correctOptionId - 1;
      }
    }

    let isCorrect = false;
    if (typeof answer.is_correct === "boolean") {
      isCorrect = answer.is_correct;
    } else if (answer.is_correct === 1 || answer.is_correct === "1") {
      isCorrect = true;
    } else if (answer.is_correct === 0 || answer.is_correct === "0") {
      isCorrect = false;
    } else if (typeof answer.isCorrect === "boolean") {
      isCorrect = answer.isCorrect;
    } else if (answer.isCorrect === 1 || answer.isCorrect === "1") {
      isCorrect = true;
    } else if (answer.isCorrect === 0 || answer.isCorrect === "0") {
      isCorrect = false;
    } else if (studentIndex >= 0 && correctIndex >= 0) {
      isCorrect = studentIndex === correctIndex;
    } else if (selectedOptionId != null && correctOptionId != null) {
      isCorrect = String(selectedOptionId) === String(correctOptionId);
    }

    const questionText =
      questionObj.question ||
      questionObj.text ||
      questionObj.title ||
      answer.question_text ||
      answer.questionText ||
      (typeof answer.question === "string" ? answer.question : "") ||
      `السؤال رقم ${index + 1}`;

    const explanation =
      answer.explanation ||
      questionObj.explanation ||
      answer.model_solution ||
      questionObj.model_solution ||
      "";

    return {
      id: answer.id || questionObj.id || `q-${index + 1}`,
      questionId: questionObj.id || answer.question_id || answer.questionId,
      isAnswered: true,
      question: String(questionText),
      options,
      correctIndex,
      studentIndex,
      selectedOptionId,
      correctOptionId,
      isCorrect,
      explanation: String(explanation || ""),
      points: Number(answer.points || questionObj.points || 1),
    };
  });

  const totalQuestions =
    questions.length ||
    Number(attempt.total_questions || attempt.totalQuestions || 0);
  const correctCount = questions.filter((q) => q.isCorrect).length;
  const score = attempt.score != null ? Number(attempt.score) : correctCount;
  const percentage =
    attempt.percentage != null
      ? Math.round(Number(attempt.percentage))
      : totalQuestions > 0
        ? Math.round((correctCount / totalQuestions) * 100)
        : 0;

  const rawDate =
    attempt.submitted_at ||
    attempt.created_at ||
    attempt.date ||
    attempt.updated_at ||
    "";

  let formattedDate = "مؤخراً";
  if (rawDate) {
    try {
      formattedDate = new Date(rawDate).toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      formattedDate = String(rawDate);
    }
  }

  const durationTaken =
    attempt.duration ||
    attempt.duration_taken ||
    (attempt.duration_minutes ? `${attempt.duration_minutes} دقيقة` : "") ||
    "15 دقيقة";

  const title =
    attempt.title ||
    lesson?.quiz?.title ||
    (lesson?.title ? `اختبار: ${lesson.title}` : "اختبار تقييمي");

  const lessonTitle =
    lesson?.title || attempt.lesson_title || attempt.lesson?.title || title;

  const branch =
    lesson?.branch ||
    lesson?.section_name ||
    attempt.branch ||
    attempt.lesson?.section_name ||
    "الرياضيات";

  return {
    id:
      attempt.id ||
      (lesson?.id
        ? `quiz-lesson-${lesson.id}`
        : `quiz-${Date.now()}-${Math.random()}`),
    backendAttemptId:
      attempt.id || attempt.attempt_id || attempt.attemptId || null,
    backendExamId:
      attempt.exam_id || attempt.exam?.id || attempt.examId || null,
    examId:
      attempt.exam_id ||
      attempt.exam?.id ||
      attempt.examId ||
      lesson?.id ||
      attempt.id,
    lessonId: lesson?.id || attempt.lesson_id,
    title: String(title),
    lessonTitle: String(lessonTitle),
    branch: String(branch),
    date: rawDate,
    formattedDate,
    durationTaken: String(durationTaken),
    score,
    totalQuestions,
    percentage,
    questions,
    isSolved: true,
  };
}
