import { useState, useEffect, useRef } from "react";
import {
  X,
  CheckCircle,
  AlertCircle,
  Timer,
  ArrowRight,
  ArrowLeft,
  Trophy,
  RefreshCw,
} from "lucide-react";
import confetti from "canvas-confetti";

/**
 * ExamModal - everything comes from the backend.
 *
 * Props:
 *  - isOpen, onClose
 *  - examId   : exam id (GET /student/exams/{exam}, POST .../start, POST .../submit)
 *  - lesson   : { id, title } (used for GET /student/lessons/{lesson}/quiz/answers)
 *  - student  : { name }
 *  - api      : {
 *      getExam(examId)                    -> GET  /student/exams/{exam}
 *      startExam(examId)                  -> POST /student/exams/{exam}/start
 *      submitExam(examId, payload)        -> POST /student/exams/{exam}/submit
 *      getQuizAnswers(lessonId, attemptId)-> GET  /student/lessons/{lesson}/quiz/answers
 *    }
 *    Each function should return { success, data, message } like the rest of the app.
 */
export default function ExamModal({
  isOpen,
  onClose,
  examId,
  lesson,
  student,
  api,
}) {
  if (!isOpen || !examId || !api) return null;
  return (
    <QuizModalContent
      key={String(examId)}
      onClose={onClose}
      examId={examId}
      lesson={lesson}
      student={student}
      api={api}
    />
  );
}

/* ---------- helpers to read the API responses defensively ---------- */

const firstDefined = (...values) =>
  values.find((v) => v !== undefined && v !== null);
const asList = (v) => (Array.isArray(v) ? v : []);
const sameId = (a, b) => a != null && b != null && String(a) === String(b);

// The service may return {success, data: {...}} or {data: {data: {...}}}
const unwrap = (res) => {
  const d = res?.data ?? res;
  return d?.data && typeof d.data === "object" && !Array.isArray(d.data)
    ? d.data
    : d;
};

const normalizeOptions = (options) =>
  asList(options).map((o) => ({
    id: o.id,
    text: firstDefined(o.option_text, o.text, o.title, ""),
    isCorrect: firstDefined(o.is_correct, o.isCorrect),
  }));

const normalizeQuestions = (payload) => {
  const exam = payload?.exam || payload;
  return asList(exam?.questions).map((q) => ({
    id: q.id,
    text: firstDefined(q.question_text, q.question, q.text, ""),
    points: q.points,
    options: normalizeOptions(q.options),
  }));
};

const normalizeAnswers = (payload, questions) => {
  const attempt = payload?.attempt || payload;
  const list = asList(
    firstDefined(
      attempt?.answers,
      payload?.answers,
      attempt?.questions,
      payload?.questions,
    ),
  );

  return list.map((item, idx) => {
    const questionId = firstDefined(
      item.question_id,
      item.question?.id,
      item.id,
    );
    const knownQuestion = questions.find((q) => sameId(q.id, questionId));
    const options =
      item.options || item.question?.options
        ? normalizeOptions(item.options || item.question?.options)
        : knownQuestion?.options || [];

    const selectedId = firstDefined(
      item.selected_option_id,
      item.option_id,
      item.selected_option?.id,
      item.selectedOption?.id,
    );
    const correctId = firstDefined(
      item.correct_option_id,
      item.correct_option?.id,
      item.correctOption?.id,
      options.find((o) => o.isCorrect)?.id,
    );

    const textOf = (id, direct) =>
      firstDefined(direct, options.find((o) => sameId(o.id, id))?.text);

    const selectedText = textOf(
      selectedId,
      firstDefined(
        item.selected_option?.option_text,
        item.selected_option_text,
        item.selected_option?.text,
      ),
    );
    const correctText = textOf(
      correctId,
      firstDefined(
        item.correct_option?.option_text,
        item.correct_option_text,
        item.correct_option?.text,
      ),
    );

    const isCorrect = firstDefined(
      item.is_correct,
      item.isCorrect,
      selectedId != null && correctId != null
        ? sameId(selectedId, correctId)
        : undefined,
    );

    return {
      key: questionId ?? idx,
      text: firstDefined(
        item.question_text,
        item.question?.question_text,
        typeof item.question === "string" ? item.question : undefined,
        knownQuestion?.text,
        "",
      ),
      selectedText,
      correctText,
      isCorrect: Boolean(isCorrect),
    };
  });
};

const normalizeSummary = (payload, answers, totalQuestions) => {
  const attempt = payload?.attempt || payload;
  const correctCount = answers.filter((a) => a.isCorrect).length;
  const total =
    Number(
      firstDefined(attempt?.total_questions, totalQuestions, answers.length),
    ) || 0;
  const score = firstDefined(
    attempt?.correct_answers,
    attempt?.score,
    answers.length ? correctCount : undefined,
  );
  const percentage = firstDefined(
    attempt?.percentage,
    attempt?.score_percentage,
    total && score != null
      ? Math.round((Number(score) / total) * 100)
      : undefined,
  );
  const passed = firstDefined(attempt?.passed, attempt?.is_passed);
  return {
    score: score != null ? Number(score) : null,
    total,
    percentage: percentage != null ? Math.round(Number(percentage)) : null,
    passed: passed != null ? Boolean(passed) : null,
  };
};

const errorMessage = (res, fallback) =>
  res?.message || res?.error || res?.data?.message || fallback;

/* ---------- component ---------- */

function QuizModalContent({ onClose, examId, lesson, student, api }) {
  const [phase, setPhase] = useState("loading"); // loading | error | exam | submitting | result
  const [error, setError] = useState("");
  const [questions, setQuestions] = useState([]);
  const [attemptId, setAttemptId] = useState(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // { [questionId]: optionId }
  const [timeLeft, setTimeLeft] = useState(0);
  const [examInfo, setExamInfo] = useState({
    title: "",
    durationMinutes: null,
  });
  const [results, setResults] = useState({
    answers: [],
    summary: null,
    detailsFailed: false,
  });

  const startedRef = useRef(false);
  const submitRef = useRef(null);

  const totalQuestions = questions.length;
  const currentQ = questions[currentQuestionIdx];
  const answeredCount = Object.keys(selectedAnswers).length;
  const allAnswered = totalQuestions > 0 && answeredCount === totalQuestions;

  /* 1) Load exam + start an attempt (once) */
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      try {
        const startRes = await api.startExam(examId);
        if (startRes?.success === false) {
          setError(errorMessage(startRes, "تعذر بدء الاختبار."));
          setPhase("error");
          return;
        }
        const startData = unwrap(startRes);
        const newAttemptId = firstDefined(
          startData?.attempt_id,
          startData?.attempt?.id,
          startData?.id,
        );

        let examData = startData;
        let list = normalizeQuestions(examData);
        if (list.length === 0) {
          const examRes = await api.getExam(examId);
          if (examRes?.success === false) {
            setError(errorMessage(examRes, "تعذر تحميل أسئلة الاختبار."));
            setPhase("error");
            return;
          }
          examData = unwrap(examRes);
          list = normalizeQuestions(examData);
        }

        if (!newAttemptId || list.length === 0) {
          setError("بيانات الاختبار غير مكتملة من الخادم.");
          setPhase("error");
          return;
        }

        const exam = examData?.exam || examData;
        const duration =
          Number(
            firstDefined(exam?.duration_minutes, startData?.duration_minutes),
          ) || null;

        setAttemptId(newAttemptId);
        setQuestions(list);
        setExamInfo({
          title: firstDefined(exam?.title, lesson?.title, ""),
          durationMinutes: duration,
        });
        setTimeLeft(duration ? duration * 60 : 0);
        setPhase("exam");
      } catch {
        setError("حدث خطأ أثناء الاتصال بالخادم.");
        setPhase("error");
      }
    })();
  }, [api, examId, lesson?.title]);

  /* 2) Submit to the backend, then fetch the student's answers */
  const handleSubmit = async () => {
    if (phase !== "exam") return;
    setPhase("submitting");
    setError("");

    const payload = {
      attempt_id: attemptId,
      answers: questions
        .filter((q) => selectedAnswers[q.id] !== undefined)
        .map((q) => ({ question_id: q.id, option_id: selectedAnswers[q.id] })),
    };

    try {
      const submitRes = await api.submitExam(examId, payload);
      if (submitRes?.success === false) {
        setError(errorMessage(submitRes, "تعذر تسليم الاختبار."));
        setPhase("exam");
        return;
      }
      const submitData = unwrap(submitRes);

      let detailsPayload = null;
      let detailsFailed = false;
      if (lesson?.id && api.getQuizAnswers) {
        try {
          const answersRes = await api.getQuizAnswers(lesson.id, attemptId);
          if (answersRes?.success === false) detailsFailed = true;
          else detailsPayload = unwrap(answersRes);
        } catch {
          detailsFailed = true;
        }
      }

      let answers = detailsPayload
        ? normalizeAnswers(detailsPayload, questions)
        : [];
      if (answers.length === 0)
        answers = normalizeAnswers(submitData, questions);

      const summary = normalizeSummary(
        {
          ...(submitData || {}),
          ...(detailsPayload?.attempt
            ? {
                attempt: {
                  ...(submitData?.attempt || {}),
                  ...detailsPayload.attempt,
                },
              }
            : {}),
        },
        answers,
        totalQuestions,
      );

      setResults({
        answers,
        summary,
        detailsFailed: detailsFailed && answers.length === 0,
      });
      setPhase("result");

      const passedNow =
        summary.passed ??
        (summary.percentage != null && summary.percentage >= 50);
      if (passedNow) {
        try {
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        } catch (err) {
          console.error(err);
        }
      }
    } catch {
      setError("حدث خطأ أثناء تسليم الاختبار. حاول مرة أخرى.");
      setPhase("exam");
    }
  };

  /* 3) Countdown (duration comes from the backend) */
  useEffect(() => {
    if (phase !== "exam" || !examInfo.durationMinutes) return undefined;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          submitRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, examInfo.durationMinutes]);

  const handleSelectOption = (optionId) => {
    if (phase !== "exam" || !currentQ) return;
    setSelectedAnswers((prev) => ({ ...prev, [currentQ.id]: optionId }));
  };

  const formatTime = (sec) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? "0" : ""}${s}`;
  };

  const summary = results.summary;
  const percentage = summary?.percentage ?? 0;
  const didPass = summary?.passed ?? percentage >= 50;
  const studentName = student?.name || "";

  return (
    <div
      className="modal-overlay"
      onClick={phase === "submitting" ? undefined : onClose}
    >
      <div
        className="modal-content w-full max-w-2xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 md:p-8 bg-slate-900 border border-indigo-500/30 rounded-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
          <div>
            {examInfo.title && (
              <span className="text-xs font-semibold text-cyan-400 bg-cyan-950/60 px-2.5 py-0.5 rounded-full border border-cyan-500/20">
                {examInfo.title}
              </span>
            )}
            <h3 className="text-base sm:text-lg font-bold text-white mt-1 font-['Alexandria']">
              اختبار: {lesson?.title}
            </h3>
          </div>

          <div className="flex items-center gap-3">
            {phase === "exam" && examInfo.durationMinutes && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-white/10 text-xs font-bold text-amber-300">
                <Timer className="w-4 h-4 text-amber-400" />
                <span>{formatTime(timeLeft)}</span>
              </div>
            )}
            <button
              onClick={onClose}
              disabled={phase === "submitting"}
              className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors disabled:opacity-40"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Loading / submitting */}
        {(phase === "loading" || phase === "submitting") && (
          <div className="py-16 text-center text-cyan-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" />
            <p className="text-sm font-bold">
              {phase === "loading"
                ? "جاري تحميل الاختبار..."
                : "جاري تسليم الإجابات وتصحيحها..."}
            </p>
          </div>
        )}

        {/* Error before the exam could start */}
        {phase === "error" && (
          <div className="py-12 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
            <p className="text-sm text-slate-200">{error}</p>
            <button
              onClick={onClose}
              className="btn-primary text-sm py-2.5 px-6 rounded-xl font-bold cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        )}

        {/* Results */}
        {phase === "result" && (
          <div className="text-center py-6 space-y-6">
            <div className="relative inline-block">
              <div
                className={`w-24 h-24 rounded-3xl flex items-center justify-center mx-auto shadow-2xl ${
                  percentage >= 80
                    ? "bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-emerald-500/30"
                    : didPass
                      ? "bg-gradient-to-tr from-indigo-500 to-cyan-600 text-white shadow-indigo-500/30"
                      : "bg-gradient-to-tr from-rose-500 to-orange-600 text-white shadow-rose-500/30"
                }`}
              >
                {didPass ? (
                  <Trophy className="w-12 h-12" />
                ) : (
                  <AlertCircle className="w-12 h-12" />
                )}
              </div>
            </div>

            <div>
              <h4 className="text-2xl font-extrabold text-white">
                {percentage >= 80
                  ? `ممتاز وتفوق رائع يا ${studentName}! 🌟`
                  : didPass
                    ? `أحسنت يا ${studentName}، بداية جيدة! 👍`
                    : `تحتاج لمراجعة الشرح مرة أخرى يا ${studentName} 💪`}
              </h4>
              {summary && summary.score != null && (
                <p className="text-sm text-slate-300 mt-1">
                  حصلت على{" "}
                  <strong className="text-cyan-400 text-lg">
                    {summary.score}
                  </strong>{" "}
                  من إجمالي{" "}
                  <strong className="text-white text-lg">
                    {summary.total}
                  </strong>{" "}
                  أسئلة ({percentage}%)
                </p>
              )}
            </div>

            {/* Answers review (from the backend) */}
            {results.answers.length > 0 ? (
              <div className="text-right space-y-3 max-h-72 overflow-y-auto p-3 rounded-2xl bg-slate-950/60 border border-white/5">
                <h5 className="text-xs font-bold text-slate-300 mb-2">
                  مراجعة إجاباتك:
                </h5>
                {results.answers.map((a, idx) => (
                  <div
                    key={a.key}
                    className="p-3 rounded-xl bg-slate-900 border border-white/5 space-y-1.5 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-white">
                        {idx + 1}. {a.text}
                      </p>
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold text-[10px] shrink-0 ${
                          a.isCorrect
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-rose-500/20 text-rose-300"
                        }`}
                      >
                        {a.isCorrect ? "صحيحة" : "خاطئة"}
                      </span>
                    </div>
                    <p className="text-slate-400">
                      إجابتك:{" "}
                      <strong
                        className={
                          a.isCorrect ? "text-emerald-400" : "text-rose-400"
                        }
                      >
                        {a.selectedText || "لم تجب"}
                      </strong>
                    </p>
                    {!a.isCorrect && a.correctText && (
                      <p className="text-slate-400">
                        الإجابة الصحيحة:{" "}
                        <strong className="text-emerald-400">
                          {a.correctText}
                        </strong>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              results.detailsFailed && (
                <p className="text-xs text-amber-300">
                  تعذر تحميل تفاصيل الإجابات من الخادم.
                </p>
              )
            )}

            <div className="flex items-center justify-center pt-2">
              <button
                onClick={onClose}
                className="btn-primary text-xs sm:text-sm py-2.5 px-6 rounded-xl font-bold cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        )}

        {/* Active exam */}
        {phase === "exam" && currentQ && (
          <div className="space-y-6">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 text-right">
                {error}
              </div>
            )}

            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>
                  السؤال{" "}
                  <strong className="text-white">
                    {currentQuestionIdx + 1}
                  </strong>{" "}
                  من <strong className="text-white">{totalQuestions}</strong>
                </span>
                <span>المتبقي: {totalQuestions - answeredCount} أسئلة</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-300"
                  style={{
                    width: `${((currentQuestionIdx + 1) / totalQuestions) * 100}%`,
                  }}
                ></div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950/80 border border-white/10 text-right">
              <span className="text-[11px] font-bold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-500/20 mb-2 inline-block">
                مسألة رياضيات #{currentQuestionIdx + 1}
              </span>
              <h4 className="text-base sm:text-lg font-bold text-white leading-relaxed mt-1 font-['Alexandria']">
                {currentQ.text}
              </h4>
            </div>

            <div className="space-y-2.5">
              {currentQ.options.map((opt, optIdx) => {
                const isSelected = sameId(selectedAnswers[currentQ.id], opt.id);
                const optionLetters = ["أ", "ب", "جـ", "د"];
                return (
                  <button
                    key={opt.id ?? optIdx}
                    onClick={() => handleSelectOption(opt.id)}
                    className={`w-full p-4 rounded-xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? "bg-gradient-to-l from-indigo-950 to-slate-900 border-cyan-400 text-white shadow-lg shadow-cyan-500/10"
                        : "bg-slate-800/40 border-white/10 text-slate-300 hover:bg-slate-800/80 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                          isSelected
                            ? "bg-cyan-500 text-slate-950"
                            : "bg-slate-700 text-slate-300"
                        }`}
                      >
                        {optionLetters[optIdx] || optIdx + 1}
                      </span>
                      <span className="text-sm font-semibold">{opt.text}</span>
                    </div>
                    {isSelected && (
                      <CheckCircle className="w-5 h-5 text-cyan-400" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <button
                disabled={currentQuestionIdx === 0}
                onClick={() => setCurrentQuestionIdx((p) => Math.max(0, p - 1))}
                className="btn-secondary text-xs py-2 px-4 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
              >
                <ArrowRight className="w-4 h-4" />
                السابق
              </button>

              {currentQuestionIdx < totalQuestions - 1 ? (
                <button
                  onClick={() =>
                    setCurrentQuestionIdx((p) =>
                      Math.min(totalQuestions - 1, p + 1),
                    )
                  }
                  className="btn-primary text-xs py-2 px-5 rounded-xl font-bold cursor-pointer flex items-center gap-1"
                >
                  <span>التالي</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!allAnswered}
                  title={allAnswered ? "" : "أجب عن كل الأسئلة أولًا"}
                  className="btn-primary text-xs py-2 px-6 rounded-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-500/30 cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="w-4 h-4" />
                  تسليم الامتحان وإنهاء
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
