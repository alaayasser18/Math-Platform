import React, { useState, useMemo, useEffect, useCallback, useRef, Component } from 'react';
import {
  X,
  FileQuestion,
  CheckCircle2,
  XCircle,
  Award,
  Clock,
  Calendar,
  ChevronDown,
  Search,
  BookOpen,
  Filter,
  Printer,
  Sparkles,
  TrendingUp,
  Layers,
  HelpCircle,
  BarChart3,
  BarChart2,
  Lightbulb,
  Check,
  RotateCcw,
  PowerOff,
  Phone,
  ShieldCheck,
  User,
  Copy,
  Edit3,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Target,
  Info,
} from 'lucide-react';
import { api, GRADE_ID_MAP } from '../services/api';

function getStudentCodeValue(value) {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value).trim();
  }
  if (!value || typeof value !== 'object') return '';

  return getStudentCodeValue(
    value.student_code ??
      value.studentCode ??
      value.subscription_code ??
      value.code,
  );
}

/**
 * Error boundary component to prevent any child render error from breaking the whole application
 */
class ModalErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Modal render error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            backgroundColor: 'rgba(3, 7, 18, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={this.props.onClose}
        >
          <div
            className="form-card"
            style={{
              maxWidth: '500px',
              width: '100%',
              padding: '2rem',
              textAlign: 'center',
              backgroundColor: '#0f172a',
              borderRadius: '20px',
              border: '1px solid rgba(244, 63, 94, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <AlertTriangle size={48} style={{ color: 'var(--rose)', margin: '0 auto 14px' }} />
            <h3 style={{ color: '#fff', fontSize: '1.15rem', fontWeight: 800, marginBottom: '8px' }}>
              حدث خطأ أثناء عرض تفاصيل الطالب
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              {this.state.error?.message || 'تعذر تحميل نافذة تفاصيل الطالب بالشكل الصحيح.'}
            </p>
            <button
              type="button"
              onClick={this.props.onClose}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <span>إغلاق النافذة</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Safely extracts a full Arabic grade name (e.g. "الصف الأول الثانوي")
 */
export function getSafeGradeName(grade, gradeId) {
  if (typeof grade === 'string') {
    const trimmed = grade.trim();
    if (trimmed.includes('الثانوي') || trimmed.includes('الإعدادي') || trimmed.includes('الصف')) {
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

  if (grade && typeof grade === 'object') {
    if (typeof grade.name === 'string' && grade.name.trim()) {
      return getSafeGradeName(grade.name, grade.id || gradeId);
    }
    if (typeof grade.title === 'string' && grade.title.trim()) {
      return getSafeGradeName(grade.title, grade.id || gradeId);
    }
  }

  const numericId = Number(gradeId || (typeof grade === 'object' ? grade?.id : grade));
  if (numericId && GRADE_ID_MAP[numericId]) {
    return GRADE_ID_MAP[numericId];
  }

  return '';
}

/**
 * Safely extracts student full name string
 */
export function getSafeStudentName(std) {
  if (!std) return 'الطالب';
  if (typeof std.name === 'string' && std.name.trim()) return std.name.trim();
  const first = typeof std.first_name === 'string' ? std.first_name : '';
  const last = typeof std.last_name === 'string' ? std.last_name : '';
  const combined = `${first} ${last}`.trim();
  if (combined) return combined;
  return 'الطالب';
}

/**
 * Normalizes any response structure from the backend or localStorage into a standard attempt object.
 */
export function normalizeStudentQuizAttempt(responseOrData, lesson = null) {
  if (!responseOrData) return null;
  const payload = responseOrData?.data?.data ?? responseOrData?.data ?? responseOrData;
  if (!payload) return null;

  const attempt = Array.isArray(payload)
    ? {}
    : payload?.attempt || payload?.quiz_attempt || payload?.exam_attempt || payload || {};

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

  if (!rawAnswers.length && !attempt.id && attempt.score == null && attempt.percentage == null) {
    return null;
  }

  const questions = rawAnswers.map((answer, index) => {
    const questionObj =
      answer.question && typeof answer.question === 'object'
        ? answer.question
        : answer.quiz_question && typeof answer.quiz_question === 'object'
        ? answer.quiz_question
        : typeof answer === 'object' && (answer.text || answer.question)
        ? answer
        : {};

    const rawOptions =
      questionObj.options ||
      answer.options ||
      questionObj.choices ||
      answer.choices ||
      [];

    const options = rawOptions.map((opt) => {
      if (typeof opt === 'string') return opt;
      return opt?.text || opt?.option_text || opt?.content || opt?.title || opt?.name || '';
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
              typeof o === 'object' &&
              (o.is_correct === true || o.is_correct === 1 || o.is_correct === '1'),
          )?.id
        : undefined);

    let studentIndex = -1;
    let correctIndex = -1;

    if (Array.isArray(rawOptions) && rawOptions.length > 0) {
      if (selectedOptionId != null) {
        studentIndex = rawOptions.findIndex(
          (opt) =>
            typeof opt === 'object' &&
            String(opt.id) === String(selectedOptionId),
        );
      }
      if (correctOptionId != null) {
        correctIndex = rawOptions.findIndex(
          (opt) =>
            typeof opt === 'object' &&
            String(opt.id) === String(correctOptionId),
        );
      }
      if (correctIndex < 0) {
        correctIndex = rawOptions.findIndex(
          (opt) =>
            typeof opt === 'object' &&
            (opt.is_correct === true || opt.is_correct === 1 || opt.is_correct === '1'),
        );
      }
    }

    if (studentIndex < 0 && typeof selectedOptionId === 'number') {
      if (selectedOptionId >= 0 && selectedOptionId < options.length) {
        studentIndex = selectedOptionId;
      } else if (selectedOptionId >= 1 && selectedOptionId <= options.length) {
        studentIndex = selectedOptionId - 1;
      }
    }
    if (correctIndex < 0 && typeof correctOptionId === 'number') {
      if (correctOptionId >= 0 && correctOptionId < options.length) {
        correctIndex = correctOptionId;
      } else if (correctOptionId >= 1 && correctOptionId <= options.length) {
        correctIndex = correctOptionId - 1;
      }
    }

    let isCorrect = false;
    if (typeof answer.is_correct === 'boolean') {
      isCorrect = answer.is_correct;
    } else if (answer.is_correct === 1 || answer.is_correct === '1') {
      isCorrect = true;
    } else if (answer.is_correct === 0 || answer.is_correct === '0') {
      isCorrect = false;
    } else if (typeof answer.isCorrect === 'boolean') {
      isCorrect = answer.isCorrect;
    } else if (answer.isCorrect === 1 || answer.isCorrect === '1') {
      isCorrect = true;
    } else if (answer.isCorrect === 0 || answer.isCorrect === '0') {
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
      (typeof answer.question === 'string' ? answer.question : '') ||
      `السؤال رقم ${index + 1}`;

    const explanation =
      answer.explanation ||
      questionObj.explanation ||
      answer.model_solution ||
      questionObj.model_solution ||
      '';

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
      explanation: String(explanation || ''),
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
    '';

  let formattedDate = 'مؤخراً';
  if (rawDate) {
    try {
      formattedDate = new Date(rawDate).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      formattedDate = String(rawDate);
    }
  }

  const durationTaken =
    attempt.duration ||
    attempt.duration_taken ||
    (attempt.duration_minutes ? `${attempt.duration_minutes} دقيقة` : '') ||
    '15 دقيقة';

  const title =
    attempt.title ||
    lesson?.quiz?.title ||
    (lesson?.title ? `اختبار: ${lesson.title}` : 'اختبار تقييمي');

  const lessonTitle =
    lesson?.title ||
    attempt.lesson_title ||
    attempt.lesson?.title ||
    title;

  const branch =
    lesson?.branch ||
    lesson?.section_name ||
    attempt.branch ||
    attempt.lesson?.section_name ||
    'الرياضيات';

  return {
    id:
      attempt.id ||
      (lesson?.id ? `quiz-lesson-${lesson.id}` : `quiz-${Date.now()}-${Math.random()}`),
    backendAttemptId: attempt.id || attempt.attempt_id || attempt.attemptId || null,
    backendExamId:
      attempt.exam_id || attempt.exam?.id || attempt.examId || null,
    examId:
      attempt.exam_id || attempt.exam?.id || attempt.examId || lesson?.id || attempt.id,
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

function mergeExamQuestionsWithStudentAnswers(examDetails, studentExam) {
  const payload =
    examDetails?.data?.data ?? examDetails?.data ?? examDetails;
  const exam = payload?.exam || payload;
  const questionPayload =
    exam?.questions ||
    exam?.exam_questions ||
    exam?.quiz?.questions ||
    [];
  const sourceQuestions = Array.isArray(questionPayload)
    ? questionPayload
    : Array.isArray(questionPayload?.data)
      ? questionPayload.data
      : [];

  if (!Array.isArray(sourceQuestions) || sourceQuestions.length === 0) {
    throw new Error('لم يُرجع الخادم أسئلة لهذا الامتحان');
  }

  const hasQuestionIdMatches = sourceQuestions.some((sourceQuestion) =>
    studentExam.questions.some(
      (question) =>
        question.questionId != null &&
        String(question.questionId) === String(sourceQuestion.id),
    ),
  );

  return sourceQuestions.map((sourceQuestion, index) => {
    const matchedAnswer = studentExam.questions.find(
      (question) =>
        question.questionId != null &&
        String(question.questionId) === String(sourceQuestion.id),
    );
    const answeredQuestion =
      matchedAnswer ||
      (!hasQuestionIdMatches ? studentExam.questions[index] : undefined);
    const rawOptions = sourceQuestion.options || sourceQuestion.choices || [];
    const options = rawOptions.map((option) =>
      typeof option === 'string'
        ? option
        : option?.text ||
          option?.option_text ||
          option?.content ||
          option?.title ||
          option?.name ||
          '',
    );
    const correctOptionId =
      sourceQuestion.correct_option_id ??
      sourceQuestion.correctOptionId ??
      sourceQuestion.correct_option?.id ??
      sourceQuestion.correct_option;
    let correctIndex = rawOptions.findIndex(
      (option) =>
        typeof option === 'object' &&
        (option.is_correct === true ||
          option.is_correct === 1 ||
          option.is_correct === '1' ||
          (correctOptionId != null &&
            String(option.id) === String(correctOptionId))),
    );
    if (
      correctIndex < 0 &&
      typeof correctOptionId === 'string' &&
      !Number.isNaN(Number(correctOptionId))
    ) {
      correctIndex = rawOptions.findIndex(
        (option) => String(option?.id) === String(correctOptionId),
      );
    }

    if (correctIndex < 0) {
      const providedCorrectIndex =
        sourceQuestion.correct_index ??
        sourceQuestion.correctIndex ??
        sourceQuestion.correct;
      if (
        Number.isInteger(Number(providedCorrectIndex)) &&
        Number(providedCorrectIndex) >= 0 &&
        Number(providedCorrectIndex) < options.length
      ) {
        correctIndex = Number(providedCorrectIndex);
      }
    }
    if (correctIndex < 0 && answeredQuestion) {
      correctIndex = answeredQuestion.correctIndex;
    }

    let studentIndex = answeredQuestion?.studentIndex ?? -1;
    const selectedOptionId = answeredQuestion?.selectedOptionId;
    if (selectedOptionId != null) {
      const selectedIndex = rawOptions.findIndex(
        (option) =>
          typeof option === 'object' &&
          String(option.id) === String(selectedOptionId),
      );
      if (selectedIndex >= 0) studentIndex = selectedIndex;
    }
    const hasAnswer = Boolean(answeredQuestion && studentIndex >= 0);
    const isCorrect =
      answeredQuestion?.isCorrect ??
      (hasAnswer && correctIndex >= 0 && studentIndex === correctIndex);

    return {
      ...answeredQuestion,
      id: sourceQuestion.id || answeredQuestion?.id || `q-${index + 1}`,
      questionId: sourceQuestion.id,
      isAnswered: Boolean(answeredQuestion),
      question:
        sourceQuestion.question ||
        sourceQuestion.text ||
        sourceQuestion.title ||
        answeredQuestion?.question ||
        `السؤال ${index + 1}`,
      options: options.length > 0 ? options : answeredQuestion?.options || [],
      studentIndex,
      correctIndex,
      isCorrect,
      explanation:
        sourceQuestion.explanation ||
        sourceQuestion.model_solution ||
        answeredQuestion?.explanation ||
        '',
    };
  });
}

function StudentExamHistoryModalContent({
  isOpen,
  onClose,
  student,
  lessonsList = [],
  availableExams = [],
  onResetDevice = null,
  onDeactivate = null,
  onEdit = null,
  isProcessingAction = false,
}) {
  const [activeTab, setActiveTab] = useState('exams'); // 'exams' | 'profile' | 'analytics'
  const [examViewMode, setExamViewMode] = useState('all'); // 'all' | 'solved' | 'curriculum'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [expandedExamIds, setExpandedExamIds] = useState(new Set([0]));
  const [questionFilters, setQuestionFilters] = useState({});
  const [studentExams, setStudentExams] = useState([]);
  const [studentDetails, setStudentDetails] = useState(null);
  const [answersLoadState, setAnswersLoadState] = useState('idle');
  const [answersLoadError, setAnswersLoadError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [questionReview, setQuestionReview] = useState(null);
  const questionReviewRequestId = useRef(0);

  const studentId = student?.id;

  const activeStudent = useMemo(() => {
    return {
      ...(student || {}),
      ...(studentDetails || {}),
    };
  }, [student, studentDetails]);

  // Guaranteed Full Arabic Grade Name
  const safeGradeName = useMemo(() => {
    return getSafeGradeName(
      activeStudent?.grade || student?.grade || activeStudent?.grade_name,
      activeStudent?.grade_id || activeStudent?.gradeId || student?.grade_id || student?.gradeId,
    );
  }, [activeStudent, student]);

  const studentName = useMemo(() => {
    return getSafeStudentName(activeStudent);
  }, [activeStudent]);

  // Prefer the code on the student record, then fall back to subscription data.
  const studentCode = useMemo(() => {
    const codes = [
      activeStudent.student_code,
      activeStudent.studentCode,
      activeStudent.code,
      activeStudent.subscription_code,
      activeStudent.subscription,
      activeStudent.active_subscription,
      activeStudent.studentSubscription,
      activeStudent.subscriptions?.[0],
      student?.student_code,
      student?.studentCode,
      student?.code,
      student?.subscription_code,
      student?.subscription,
      student?.active_subscription,
      student?.studentSubscription,
      student?.subscriptions?.[0],
    ];
    return codes.map(getStudentCodeValue).find(Boolean) || '';
  }, [activeStudent, student]);

  const activeLessons = useMemo(() => {
    return Array.isArray(lessonsList) ? lessonsList : [];
  }, [lessonsList]);

  const curriculumExams = useMemo(() => {
    return (availableExams || [])
      .filter((exam) => {
        const gradeName = getSafeGradeName(
          exam.grade || exam.grade_name || exam.lesson?.grade,
          exam.grade_id || exam.lesson?.grade_id,
        );
        return !safeGradeName || !gradeName || gradeName === safeGradeName;
      })
      .map((exam) => ({
        id: `backend-exam-${exam.id}`,
        examId: exam.id,
        backendExamId: exam.id,
        lessonId: exam.lesson_id || exam.lesson?.id,
        title: exam.title || exam.name || '',
        lessonTitle: exam.lesson?.title || exam.lesson_title || '',
        branch: exam.lesson?.branch || exam.branch || '',
        date: '',
        formattedDate: '',
        durationTaken: '',
        score: null,
        totalQuestions: exam.questions_count || exam.total_questions || 0,
        percentage: null,
        questions: [],
        isSolved: false,
      }));
  }, [availableExams, safeGradeName]);

  // Combined list of display exams (solved attempts + curriculum exams)
  const displayExamsList = useMemo(() => {
    if (studentExams.length > 0 && examViewMode === 'solved') {
      return studentExams;
    }
    if (examViewMode === 'curriculum') {
      return curriculumExams;
    }
    // Default mode 'all': Show solved first, then remaining curriculum exams
    const solvedLessonIds = new Set(studentExams.map((se) => String(se.lessonId || se.examId)));
    const remainingCurriculum = curriculumExams.filter((ce) => !solvedLessonIds.has(String(ce.lessonId || ce.examId)));
    return [...studentExams, ...remainingCurriculum];
  }, [studentExams, curriculumExams, examViewMode]);

  // Fetch full student details and quiz answers from multiple backend endpoints
  const loadAllStudentData = useCallback(async () => {
    if (!studentId) return;

    setAnswersLoadState('loading');
    setAnswersLoadError('');

    try {
      // 1. Fetch complete student details from GET /api/v1/admin/students/{id}
      const studentDetailsPromise = api
        .getStudentDetails(studentId)
        .catch((error) => ({
          success: false,
          error: error?.message || 'تعذر جلب بيانات الطالب',
          data: null,
        }));

      // 2. Ensure candidate lessons list
      let candidateLessons = activeLessons;
      if (!candidateLessons || candidateLessons.length === 0) {
        try {
          const remoteLessons = await api.getAdminLessons();
          if (Array.isArray(remoteLessons)) {
            candidateLessons = remoteLessons;
          }
        } catch (error) {
          throw new Error(
            error?.message || 'تعذر تحميل دروس الطالب من الخادم',
            { cause: error },
          );
        }
      }

      const targetGradeName = safeGradeName.toLowerCase();

      let targetLessons = (candidateLessons || []).filter((lesson) => {
        const lGradeName = getSafeGradeName(lesson.grade || lesson.grade_name, lesson.grade_id || lesson.gradeId).toLowerCase();
        return lGradeName === targetGradeName || targetGradeName.includes(lGradeName) || lGradeName.includes(targetGradeName);
      });

      // 3. Query GET /api/v1/admin/students/{student}/lessons/{lesson}/quiz/answers for each lesson
      const quizPromises = targetLessons.map(async (lesson) => {
        try {
          const res = await api.getAdminStudentLessonQuizAnswers(studentId, lesson.id);
          return { lesson, response: res };
        } catch (err) {
          return {
            lesson,
            response: { success: false, error: err?.message, status: 500 },
          };
        }
      });

      const [detailsRes, ...quizResults] = await Promise.all([
        studentDetailsPromise,
        ...quizPromises,
      ]);

      if (detailsRes?.success && detailsRes.data) {
        const payload = detailsRes.data?.student || detailsRes.data;
        if (payload && typeof payload === 'object') {
          setStudentDetails(payload);
        }
      }

      const attempts = [];
      const non404Errors = [];
      if (detailsRes?.error) non404Errors.push(detailsRes.error);

      quizResults.forEach(({ lesson, response }) => {
        if (response?.success && response.data) {
          const attempt = normalizeStudentQuizAttempt(response, lesson);
          if (attempt && attempt.questions && attempt.questions.length > 0) {
            attempts.push(attempt);
          }
        } else if (
          response?.status &&
          response.status !== 404 &&
          response.status !== 400
        ) {
          if (response.error) non404Errors.push(response.error);
        }
      });

      // Also check details payload for embedded quiz attempts
      const detailsPayload = detailsRes?.data?.student || detailsRes?.data;
      if (detailsPayload && typeof detailsPayload === 'object') {
        const embedded =
          detailsPayload.quiz_attempts ||
          detailsPayload.attempts ||
          detailsPayload.exams ||
          detailsPayload.exam_attempts ||
          [];
        if (Array.isArray(embedded)) {
          embedded.forEach((emb) => {
            const normalized = normalizeStudentQuizAttempt(emb);
            if (
              normalized &&
              !attempts.some((a) => String(a.id) === String(normalized.id))
            ) {
              attempts.push(normalized);
            }
          });
        }
      }

      attempts.sort((a, b) => {
        const dateA = new Date(a.date || 0).getTime();
        const dateB = new Date(b.date || 0).getTime();
        return dateB - dateA;
      });

      setStudentExams(attempts);
      setAnswersLoadState('ready');
      if (non404Errors.length > 0 && attempts.length === 0) {
        setAnswersLoadError(non404Errors[0]);
      }
    } catch (error) {
      console.error('Failed to load student exam answers:', error);
      setAnswersLoadError(error?.message || 'تعذر جلب إجابات الطالب من السيرفر');
      setAnswersLoadState('error');
    }
  }, [studentId, activeLessons, safeGradeName]);

  useEffect(() => {
    if (!isOpen || !studentId) {
      setStudentExams([]);
      setStudentDetails(null);
      setAnswersLoadState('idle');
      setAnswersLoadError('');
      setActiveTab('exams');
      return;
    }
    loadAllStudentData();
  }, [isOpen, studentId, loadAllStudentData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAllStudentData();
    setIsRefreshing(false);
  };

  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard?.writeText(String(code));
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const branches = useMemo(() => {
    const set = new Set();
    displayExamsList.forEach((e) => {
      if (e.branch) set.add(e.branch);
    });
    return ['all', ...Array.from(set)];
  }, [displayExamsList]);

  const overallStats = useMemo(() => {
    if (studentExams.length === 0) {
      return {
        totalExams: 0,
        avgScore: 0,
        totalQuestions: 0,
        totalCorrect: 0,
        totalWrong: 0,
        accuracy: 0,
      };
    }
    const totalExams = studentExams.length;
    let sumPct = 0;
    let totalQuestions = 0;
    let totalCorrect = 0;

    studentExams.forEach((ex) => {
      sumPct += ex.percentage || 0;
      ex.questions?.forEach((q) => {
        totalQuestions++;
        if (q.isCorrect) totalCorrect++;
      });
    });

    const avgScore = Math.round(sumPct / totalExams);
    const totalWrong = totalQuestions - totalCorrect;
    const accuracy =
      totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

    return {
      totalExams,
      avgScore,
      totalQuestions,
      totalCorrect,
      totalWrong,
      accuracy,
    };
  }, [studentExams]);

  const branchAnalytics = useMemo(() => {
    const map = {};
    studentExams.forEach((exam) => {
      const branchName = exam.branch || 'عام';
      if (!map[branchName]) {
        map[branchName] = {
          name: branchName,
          examsCount: 0,
          totalQuestions: 0,
          correctQuestions: 0,
        };
      }
      map[branchName].examsCount += 1;
      exam.questions?.forEach((q) => {
        map[branchName].totalQuestions += 1;
        if (q.isCorrect) map[branchName].correctQuestions += 1;
      });
    });

    return Object.values(map).map((item) => {
      const accuracy =
        item.totalQuestions > 0
          ? Math.round((item.correctQuestions / item.totalQuestions) * 100)
          : 0;
      return {
        ...item,
        accuracy,
      };
    });
  }, [studentExams]);

  const filteredExams = useMemo(() => {
    return displayExamsList.filter((exam) => {
      const matchBranch =
        selectedBranch === 'all' || exam.branch === selectedBranch;
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        exam.title.toLowerCase().includes(q) ||
        exam.lessonTitle?.toLowerCase().includes(q) ||
        exam.branch?.toLowerCase().includes(q) ||
        exam.questions?.some((qu) => qu.question?.toLowerCase().includes(q));
      return matchBranch && matchSearch;
    });
  }, [displayExamsList, selectedBranch, searchQuery]);

  const toggleExpand = (idx) => {
    setExpandedExamIds((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const setExamFilter = (examId, filterType) => {
    setQuestionFilters((prev) => ({
      ...prev,
      [examId]: filterType,
    }));
  };

  const handleShowQuestionReview = async (exam, filter) => {
    const requestId = ++questionReviewRequestId.current;
    setQuestionReview({
      exam,
      filter,
      status: 'loading',
      questions: [],
      error: '',
    });

    const linkedExam = availableExams.find(
      (candidate) =>
        exam.backendExamId &&
        String(candidate.id) === String(exam.backendExamId),
    ) || availableExams.find(
      (candidate) =>
        String(candidate.lesson_id || candidate.lesson?.id) ===
        String(exam.lessonId),
    );
    const backendExamId = exam.backendExamId || linkedExam?.id;
    if (!backendExamId || !Number.isFinite(Number(backendExamId))) {
      setQuestionReview((current) => ({
        ...current,
        status: 'error',
        error: 'تعذر تحديد رقم الامتحان لعرض أسئلته.',
      }));
      return;
    }
    if (!studentId || !exam.lessonId) {
      setQuestionReview((current) => ({
        ...current,
        status: 'error',
        error: 'تعذر تحديد الطالب أو الدرس المرتبط بمحاولة الامتحان.',
      }));
      return;
    }

    let timeoutId;
    try {
      const [details, answersResponse] = await Promise.race([
        Promise.all([
          api.getAdminExamDetails(backendExamId),
          api.getAdminStudentLessonQuizAnswers(
            studentId,
            exam.lessonId,
            Number.isFinite(Number(exam.backendAttemptId))
              ? exam.backendAttemptId
              : undefined,
          ),
        ]),
        new Promise((_, reject) => {
          timeoutId = window.setTimeout(
            () => reject(new Error('استغرق تحميل أسئلة الامتحان أكثر من 10 ثوانٍ. أعد المحاولة.')),
            10000,
          );
        }),
      ]);
      if (requestId !== questionReviewRequestId.current) return;
      if (!answersResponse?.success) {
        throw new Error(
          answersResponse?.error || 'تعذر تحميل إجابات الطالب من الباك.',
        );
      }
      const latestAttempt = normalizeStudentQuizAttempt(
        answersResponse,
        activeLessons.find(
          (lesson) => String(lesson.id) === String(exam.lessonId),
        ) || null,
      );
      if (!latestAttempt?.questions?.length) {
        throw new Error('لم يُرجع الباك إجابات هذا الامتحان للطالب.');
      }
      const questions = mergeExamQuestionsWithStudentAnswers(
        details,
        latestAttempt,
      );
      setQuestionReview((current) => ({
        ...current,
        status: 'ready',
        questions,
        error: '',
      }));
    } catch (error) {
      if (requestId !== questionReviewRequestId.current) return;
      setQuestionReview((current) => ({
        ...current,
        status: 'error',
        error: error?.message || 'تعذر تحميل أسئلة الامتحان.',
      }));
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  if (!isOpen || !student) return null;

  const optionLetters = ['أ', 'ب', 'جـ', 'د', 'هـ', 'و'];

  const subscriptionStatus =
    (typeof activeStudent.status === 'string' && activeStudent.status) ||
    (typeof activeStudent.subscription?.status === 'string' && activeStudent.subscription.status) ||
    (studentCode ? 'active' : 'inactive');

  const trustedDeviceIdentifier =
    activeStudent.trusted_device?.device_identifier ||
    (typeof activeStudent.trusted_device === 'string'
      ? activeStudent.trusted_device
      : activeStudent.device_identifier || null);

  const hasDevice = Boolean(
    trustedDeviceIdentifier ||
      activeStudent.trusted_device ||
      activeStudent.device_id,
  );

  if (questionReview) {
      const isCorrectReview = questionReview.filter === 'correct';
      const reviewQuestions = questionReview.questions.filter(
        (question) =>
          question.isAnswered &&
          (isCorrectReview ? question.isCorrect : !question.isCorrect),
      );
      const correctCount = questionReview.questions.filter(
        (question) => question.isAnswered && question.isCorrect,
      ).length;
      const wrongCount = questionReview.questions.filter(
        (question) => question.isAnswered && !question.isCorrect,
      ).length;
      const reviewColor = isCorrectReview ? '#34d399' : '#fb7185';

      return (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1200,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'stretch',
            padding: 'clamp(0px, 2vh, 20px)',
            background: 'rgba(2, 6, 18, 0.94)',
            backdropFilter: 'blur(16px)',
            direction: 'rtl',
          }}
        >
          <section
            aria-labelledby="question-review-title"
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: 'min(100%, 1080px)',
              maxHeight: '100%',
              overflow: 'hidden',
              border: '1px solid rgba(148, 163, 184, 0.18)',
              borderRadius: '24px',
              background:
                'radial-gradient(ellipse at top right, rgba(99, 102, 241, 0.16), transparent 42%), #080e1b',
              boxShadow: '0 28px 90px rgba(0, 0, 0, 0.55)',
            }}
          >
            <header
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                padding: '20px clamp(16px, 4vw, 32px)',
                borderBottom: '1px solid rgba(148, 163, 184, 0.14)',
                background: 'rgba(15, 23, 42, 0.64)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                    borderRadius: '15px',
                    color: reviewColor,
                    background: isCorrectReview
                      ? 'rgba(16, 185, 129, 0.13)'
                      : 'rgba(244, 63, 94, 0.13)',
                    border: `1px solid ${reviewColor}44`,
                  }}
                >
                  {isCorrectReview ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                </div>
                <div>
                  <h2
                    id="question-review-title"
                    style={{
                      margin: 0,
                      color: '#f8fafc',
                      fontSize: 'clamp(1.05rem, 2.5vw, 1.4rem)',
                      fontWeight: 900,
                    }}
                  >
                    مراجعة الأسئلة {isCorrectReview ? 'الصحيحة' : 'الخاطئة'}
                  </h2>
                  <p
                    style={{
                      margin: '5px 0 0',
                      color: '#94a3b8',
                      fontSize: '0.84rem',
                    }}
                  >
                    {questionReview.exam.title} · {questionReview.exam.lessonTitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  questionReviewRequestId.current += 1;
                  setQuestionReview(null);
                }}
                aria-label="إغلاق مراجعة الأسئلة"
                style={{
                  width: '42px',
                  height: '42px',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '13px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  color: '#cbd5e1',
                  cursor: 'pointer',
                }}
              >
                <X size={19} />
              </button>
            </header>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap',
                padding: '16px clamp(16px, 4vw, 32px)',
                borderBottom: '1px solid rgba(148, 163, 184, 0.12)',
              }}
            >
              <div style={{ display: 'flex', gap: '8px' }}>
                {[
                  { type: 'wrong', label: 'الإجابات الخاطئة', count: wrongCount, color: '#fb7185' },
                  { type: 'correct', label: 'الإجابات الصحيحة', count: correctCount, color: '#34d399' },
                ].map((tab) => {
                  const isActive = questionReview.filter === tab.type;
                  return (
                    <button
                      key={tab.type}
                      type="button"
                      onClick={() =>
                        setQuestionReview((current) => ({
                          ...current,
                          filter: tab.type,
                        }))
                      }
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '9px 13px',
                        border: `1px solid ${isActive ? `${tab.color}70` : 'rgba(148, 163, 184, 0.15)'}`,
                        borderRadius: '11px',
                        background: isActive ? `${tab.color}18` : 'rgba(255, 255, 255, 0.025)',
                        color: isActive ? tab.color : '#94a3b8',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      {tab.label}
                      <span
                        style={{
                          minWidth: '22px',
                          padding: '2px 6px',
                          borderRadius: '7px',
                          background: isActive ? `${tab.color}20` : 'rgba(148, 163, 184, 0.1)',
                          textAlign: 'center',
                        }}
                      >
                        {questionReview.status === 'ready' ? tab.count : '—'}
                      </span>
                    </button>
                  );
                })}
              </div>
              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                {questionReview.status === 'ready'
                  ? `${reviewQuestions.length} سؤال`
                  : 'يتم جلب النتيجة من الخادم'}
              </span>
            </div>

            <main
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: 'clamp(16px, 3vw, 28px)',
              }}
            >
              {questionReview.status === 'loading' ? (
                <div
                  role="status"
                  style={{
                    minHeight: '260px',
                    display: 'grid',
                    placeContent: 'center',
                    justifyItems: 'center',
                    gap: '14px',
                    color: '#cbd5e1',
                  }}
                >
                  <RefreshCw
                    size={30}
                    style={{ color: 'var(--cyan)', animation: 'spin 1s linear infinite' }}
                  />
                  <strong>جارٍ تحميل الأسئلة وإجابات الطالب من الخادم...</strong>
                </div>
              ) : questionReview.status === 'error' ? (
                <div
                  role="alert"
                  style={{
                    maxWidth: '580px',
                    margin: '48px auto',
                    padding: '28px',
                    textAlign: 'center',
                    border: '1px solid rgba(251, 113, 133, 0.25)',
                    borderRadius: '18px',
                    background: 'rgba(244, 63, 94, 0.06)',
                  }}
                >
                  <AlertTriangle size={30} color="#fb7185" />
                  <h3 style={{ color: '#fff', margin: '12px 0 6px' }}>
                    تعذر تحميل أسئلة الامتحان
                  </h3>
                  <p style={{ color: '#cbd5e1', lineHeight: 1.7 }}>
                    {questionReview.error}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      handleShowQuestionReview(
                        questionReview.exam,
                        questionReview.filter,
                      )
                    }
                    className="btn-primary"
                    style={{ marginTop: '8px' }}
                  >
                    <RefreshCw size={15} />
                    إعادة المحاولة
                  </button>
                </div>
              ) : reviewQuestions.length === 0 ? (
                <div
                  style={{
                    maxWidth: '580px',
                    margin: '48px auto',
                    padding: '32px 24px',
                    textAlign: 'center',
                    border: '1px dashed rgba(148, 163, 184, 0.24)',
                    borderRadius: '18px',
                    background: 'rgba(15, 23, 42, 0.5)',
                  }}
                >
                  {isCorrectReview ? (
                    <CheckCircle2 size={34} color="#34d399" />
                  ) : (
                    <XCircle size={34} color="#fb7185" />
                  )}
                  <h3 style={{ color: '#f8fafc', margin: '12px 0 5px' }}>
                    لا توجد إجابات {isCorrectReview ? 'صحيحة' : 'خاطئة'} في هذا الامتحان
                  </h3>
                  <p style={{ color: '#94a3b8', margin: 0 }}>
                    لم يُرجع الخادم أسئلة مطابقة لهذا التصنيف.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '16px' }}>
                  {reviewQuestions.map((question, index) => (
                    <article
                      key={`${question.id}-${index}`}
                      style={{
                        overflow: 'hidden',
                        border: `1px solid ${isCorrectReview ? 'rgba(52, 211, 153, 0.25)' : 'rgba(251, 113, 133, 0.25)'}`,
                        borderRadius: '18px',
                        background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.92), rgba(8, 14, 27, 0.96))',
                        boxShadow: `0 12px 30px ${isCorrectReview ? 'rgba(16, 185, 129, 0.045)' : 'rgba(244, 63, 94, 0.045)'}`,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '13px',
                          padding: '18px 20px',
                          borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                        }}
                      >
                        <span
                          style={{
                            width: '34px',
                            height: '34px',
                            display: 'grid',
                            placeItems: 'center',
                            flexShrink: 0,
                            borderRadius: '11px',
                            background: `${reviewColor}1c`,
                            color: reviewColor,
                            fontWeight: 900,
                          }}
                        >
                          {index + 1}
                        </span>
                        <div style={{ flex: 1 }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              marginBottom: '8px',
                              color: reviewColor,
                              fontSize: '0.75rem',
                              fontWeight: 900,
                            }}
                          >
                            {isCorrectReview ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                            {isCorrectReview ? 'إجابة صحيحة' : 'إجابة خاطئة'}
                          </span>
                          <h3
                            style={{
                              margin: 0,
                              color: '#f8fafc',
                              fontSize: '1rem',
                              lineHeight: 1.8,
                              fontWeight: 800,
                            }}
                          >
                            {question.question}
                          </h3>
                        </div>
                      </div>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 290px), 1fr))',
                          gap: '10px',
                          padding: '18px 20px',
                        }}
                      >
                        {question.options.map((option, optionIndex) => {
                          const isSelected = question.studentIndex === optionIndex;
                          const isAnswer = question.correctIndex === optionIndex;
                          const color = isAnswer ? '#34d399' : isSelected ? '#fb7185' : '#cbd5e1';
                          const border = isAnswer
                            ? 'rgba(52, 211, 153, 0.38)'
                            : isSelected
                              ? 'rgba(251, 113, 133, 0.38)'
                              : 'rgba(148, 163, 184, 0.13)';
                          return (
                            <div
                              key={`${question.id}-option-${optionIndex}`}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '12px',
                                minHeight: '52px',
                                padding: '10px 13px',
                                border: `1px solid ${border}`,
                                borderRadius: '12px',
                                background: isAnswer
                                  ? 'rgba(16, 185, 129, 0.09)'
                                  : isSelected
                                    ? 'rgba(244, 63, 94, 0.09)'
                                    : 'rgba(255, 255, 255, 0.025)',
                                color,
                              }}
                            >
                              <span style={{ lineHeight: 1.6 }}>{option}</span>
                              {isAnswer || isSelected ? (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    flexShrink: 0,
                                    fontSize: '0.7rem',
                                    fontWeight: 900,
                                  }}
                                >
                                  {isAnswer ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                  {isAnswer ? 'الإجابة الصحيحة' : 'إجابة الطالب'}
                                </span>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                      {question.explanation && (
                        <div
                          style={{
                            margin: '0 20px 18px',
                            padding: '12px 14px',
                            borderRadius: '11px',
                            background: 'rgba(99, 102, 241, 0.07)',
                            border: '1px solid rgba(99, 102, 241, 0.16)',
                            color: '#cbd5e1',
                            fontSize: '0.82rem',
                            lineHeight: 1.7,
                          }}
                        >
                          <strong style={{ color: '#a5b4fc' }}>توضيح: </strong>
                          {question.explanation}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </main>
          </section>
        </div>
      );
  }

  const studentPhone =
    (typeof activeStudent.phone === 'string' && activeStudent.phone) ||
    (typeof activeStudent.phone === 'number' && String(activeStudent.phone)) ||
    '';

  const parentPhone =
    (typeof activeStudent.parent_phone === 'string' && activeStudent.parent_phone) ||
    (typeof activeStudent.parentPhone === 'string' && activeStudent.parentPhone) ||
    (typeof activeStudent.parent_phone === 'number' && String(activeStudent.parent_phone)) ||
    '';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        backgroundColor: 'rgba(3, 7, 18, 0.88)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        className="form-card print-container"
        style={{
          width: '100%',
          maxWidth: '960px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#090f1d',
          border: '1px solid rgba(99, 102, 241, 0.35)',
          boxShadow:
            '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 35px rgba(6, 182, 212, 0.15)',
          borderRadius: '24px',
          overflow: 'hidden',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ========================================================= */}
        {/* TOP BAR / HEADER                                          */}
        {/* ========================================================= */}
        <div
          className="exam-history-modal-header"
          style={{
            padding: '1.25rem 1.75rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background:
              'linear-gradient(180deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.2) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          {/* Student Identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '16px',
                background:
                  'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.45rem',
                fontWeight: 900,
                boxShadow: '0 8px 20px -4px rgba(79, 70, 229, 0.4)',
                flexShrink: 0,
              }}
            >
              {studentName.charAt(0)}
            </div>
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap',
                }}
              >
                <h2
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 900,
                    color: '#fff',
                    margin: 0,
                  }}
                >
                  {studentName}
                </h2>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    color: 'var(--cyan)',
                    background: 'rgba(6, 182, 212, 0.12)',
                    border: '1px solid rgba(6, 182, 212, 0.3)',
                    padding: '3px 10px',
                    borderRadius: '8px',
                  }}
                >
                  {safeGradeName}
                </span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background:
                      subscriptionStatus === 'active'
                        ? 'rgba(16, 185, 129, 0.15)'
                        : 'rgba(244, 63, 94, 0.15)',
                    color:
                      subscriptionStatus === 'active'
                        ? 'var(--emerald)'
                        : 'var(--rose)',
                    border: `1px solid ${
                      subscriptionStatus === 'active'
                        ? 'rgba(16, 185, 129, 0.3)'
                        : 'rgba(244, 63, 94, 0.3)'
                    }`,
                  }}
                >
                  {subscriptionStatus === 'active'
                    ? 'اشتراك نشط ✓'
                    : 'قيد الاعتماد'}
                </span>
              </div>

              <div
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  marginTop: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                {studentPhone && (
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Phone size={12} style={{ color: 'var(--cyan)' }} />
                    <span dir="ltr">{studentPhone}</span>
                  </span>
                )}
                {parentPhone && (
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>ولي الأمر:</span>
                    <span dir="ltr">{parentPhone}</span>
                  </span>
                )}
                {studentCode ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'rgba(99, 102, 241, 0.18)',
                      color: 'var(--purple)',
                      border: '1px solid rgba(99, 102, 241, 0.35)',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontFamily: 'monospace',
                      fontWeight: 800,
                    }}
                  >
                    كود: [{studentCode}]
                  </span>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: 'var(--amber)',
                      background: 'rgba(245, 158, 11, 0.12)',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                    }}
                  >
                    كود الطالب غير متاح
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons on header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="تحديث البيانات من السيرفر"
              className="btn-secondary"
              style={{
                padding: '7px 12px',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--cyan)',
              }}
            >
              <RefreshCw
                size={14}
                style={{
                  animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
                }}
              />
              <span className="hide-on-mobile">تحديث</span>
            </button>

            <button
              onClick={() => window.print()}
              title="طباعة تقرير تفصيلي"
              className="btn-secondary"
              style={{
                padding: '7px 12px',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--text-muted)',
              }}
            >
              <Printer size={14} />
              <span className="hide-on-mobile">طباعة التقرير</span>
            </button>

            <button
              onClick={onClose}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  'rgba(244, 63, 94, 0.15)';
                e.currentTarget.style.color = 'var(--rose)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor =
                  'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.color = 'var(--text-muted)';
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* KPI SUMMARY RIBBON                                        */}
        {/* ========================================================= */}
        <div
          className="exam-history-kpi-ribbon"
          style={{
            padding: '1rem 1.75rem',
            background: 'rgba(5, 9, 20, 0.75)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '10px',
          }}
        >
          {/* Total Solved Exams */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(139, 92, 246, 0.25)',
              borderRadius: '14px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(139, 92, 246, 0.15)',
                color: 'var(--purple)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <FileQuestion size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                امتحانات أداها الطالب
              </div>
              <div
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 900,
                  color: '#fff',
                  lineHeight: '1.2',
                }}
              >
                {overallStats.totalExams}
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 400,
                    color: 'var(--text-muted)',
                    marginRight: '4px',
                  }}
                >
                  اختبار
                </span>
              </div>
            </div>
          </div>

          {/* Average Score */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '14px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--emerald)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Award size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                متوسط الدرجات
              </div>
              <div
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 900,
                  color: 'var(--emerald)',
                  lineHeight: '1.2',
                }}
              >
                {overallStats.avgScore}%
              </div>
            </div>
          </div>

          {/* Correct Questions */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(6, 182, 212, 0.25)',
              borderRadius: '14px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(6, 182, 212, 0.15)',
                color: 'var(--cyan)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <CheckCircle2 size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                إجابات صحيحة
              </div>
              <div
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 900,
                  color: 'var(--cyan)',
                  lineHeight: '1.2',
                }}
              >
                {overallStats.totalCorrect}{' '}
                <span
                  style={{
                    fontSize: '0.72rem',
                    color: 'var(--text-muted)',
                    fontWeight: 400,
                  }}
                >
                  ({overallStats.accuracy}%)
                </span>
              </div>
            </div>
          </div>

          {/* Wrong Questions */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(244, 63, 94, 0.25)',
              borderRadius: '14px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(244, 63, 94, 0.15)',
                color: 'var(--rose)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <XCircle size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                إجابات خاطئة
              </div>
              <div
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 900,
                  color: 'var(--rose)',
                  lineHeight: '1.2',
                }}
              >
                {overallStats.totalWrong}{' '}
                <span
                  style={{
                    fontSize: '0.72rem',
                    color: 'var(--text-muted)',
                    fontWeight: 400,
                  }}
                >
                  سؤال
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* TABS NAVIGATION                                           */}
        {/* ========================================================= */}
        <div
          className="exam-history-tabs"
          style={{
            padding: '0 1.75rem',
            background: 'rgba(15, 23, 42, 0.5)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('exams')}
            style={{
              padding: '12px 16px',
              background: 'none',
              border: 'none',
              borderBottom: `2px solid ${
                activeTab === 'exams' ? 'var(--cyan)' : 'transparent'
              }`,
              color: activeTab === 'exams' ? '#fff' : 'var(--text-muted)',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
            }}
          >
            <FileQuestion size={16} style={{ color: 'var(--cyan)' }} />
            <span>سجل الامتحانات والأسئلة</span>
            <span
              style={{
                fontSize: '0.72rem',
                background: 'rgba(6, 182, 212, 0.18)',
                color: 'var(--cyan)',
                padding: '1px 7px',
                borderRadius: '10px',
              }}
            >
              {displayExamsList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            style={{
              padding: '12px 16px',
              background: 'none',
              border: 'none',
              borderBottom: `2px solid ${
                activeTab === 'profile' ? 'var(--purple)' : 'transparent'
              }`,
              color: activeTab === 'profile' ? '#fff' : 'var(--text-muted)',
              fontWeight: 800,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
            }}
          >
            <User size={16} style={{ color: 'var(--purple)' }} />
            <span>بيانات الطالب والاشتراك والجهاز</span>
          </button>

          {branchAnalytics.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              style={{
                padding: '12px 16px',
                background: 'none',
                border: 'none',
                borderBottom: `2px solid ${
                  activeTab === 'analytics' ? 'var(--emerald)' : 'transparent'
                }`,
                color: activeTab === 'analytics' ? '#fff' : 'var(--text-muted)',
                fontWeight: 800,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
              }}
            >
              <BarChart2 size={16} style={{ color: 'var(--emerald)' }} />
              <span>تحليل الأداء حسب الفروع</span>
            </button>
          )}
        </div>

        {/* ========================================================= */}
        {/* TAB 1: SOLVED EXAMS & QUESTIONS BREAKDOWN                 */}
        {/* ========================================================= */}
        {activeTab === 'exams' && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* View Mode Switcher (Solved vs All Grade Exams) */}
            <div
              style={{
                padding: '0.75rem 1.75rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                flexWrap: 'wrap',
                background: 'rgba(5, 9, 20, 0.5)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                  تصفية العرض:
                </span>
                <button
                  type="button"
                  onClick={() => setExamViewMode('all')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    background: examViewMode === 'all' ? 'rgba(6, 182, 212, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                    color: examViewMode === 'all' ? '#fff' : 'var(--text-muted)',
                    border: examViewMode === 'all' ? '1px solid var(--cyan)' : '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  جميع الامتحانات والأسئلة ({displayExamsList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setExamViewMode('solved')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    background: examViewMode === 'solved' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                    color: examViewMode === 'solved' ? 'var(--emerald)' : 'var(--text-muted)',
                    border: examViewMode === 'solved' ? '1px solid var(--emerald)' : '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  المحلولة فقط ({studentExams.length}) ✅
                </button>
                <button
                  type="button"
                  onClick={() => setExamViewMode('curriculum')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    background: examViewMode === 'curriculum' ? 'rgba(139, 92, 246, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                    color: examViewMode === 'curriculum' ? 'var(--purple)' : 'var(--text-muted)',
                    border: examViewMode === 'curriculum' ? '1px solid var(--purple)' : '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  بنك أسئلة الصف الدراسي ({curriculumExams.length}) 📚
                </button>
              </div>

            </div>

            {/* Search and Branch Controls */}
            <div
              style={{
                padding: '0.7rem 1.75rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(5, 9, 20, 0.3)',
              }}
            >
              <div style={{ position: 'relative', width: '100%', maxWidth: '280px' }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن امتحان أو سؤال..."
                  className="input-field"
                  style={{
                    width: '100%',
                    padding: '6px 30px 6px 10px',
                    fontSize: '0.8rem',
                    height: '34px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(15, 23, 42, 0.8)',
                  }}
                />
                <Search
                  size={14}
                  style={{
                    position: 'absolute',
                    right: '9px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
              </div>

              {branches.length > 2 && (
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="input-field"
                  style={{
                    padding: '5px 10px',
                    fontSize: '0.78rem',
                    height: '34px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(15, 23, 42, 0.8)',
                    maxWidth: '180px',
                  }}
                >
                  <option value="all">كل الفروع ({displayExamsList.length})</option>
                  {branches
                    .filter((b) => b !== 'all')
                    .map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                </select>
              )}
            </div>

            {/* Scrollable Exams List Body */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '1.25rem 1.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              {/* Notice when student has not solved any exam yet */}
              {studentExams.length === 0 && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(6, 182, 212, 0.3)',
                    background: 'rgba(6, 182, 212, 0.08)',
                    color: '#e0f2fe',
                    fontSize: '0.84rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    lineHeight: '1.5',
                  }}
                >
                  <Info size={18} style={{ color: 'var(--cyan)', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong>الطالب لم يقم بحل أي امتحانات بعد:</strong>
                    <div style={{ marginTop: '2px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      فيما يلي جميع أسئلة الامتحانات والمقررات المتاحة لصف {safeGradeName} للاطلاع على الأسئلة وخياراتها ونموذج الإجابة الإرشادي.
                    </div>
                  </div>
                </div>
              )}

              {answersLoadState === 'error' && answersLoadError && (
                <div
                  role="alert"
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(244, 63, 94, 0.35)',
                    background: 'rgba(244, 63, 94, 0.08)',
                    color: '#fda4af',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <AlertTriangle size={16} />
                  <span>{answersLoadError}</span>
                </div>
              )}

              {filteredExams.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '3rem 1rem',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '18px',
                    border: '1px dashed rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <FileQuestion
                    size={42}
                    style={{
                      color: 'var(--text-muted)',
                      margin: '0 auto 10px',
                    }}
                  />
                  <h3
                    style={{
                      fontSize: '1rem',
                      fontWeight: 800,
                      color: '#fff',
                      marginBottom: '4px',
                    }}
                  >
                    لا توجد اختبارات تطابق البحث
                  </h3>
                  <p
                    style={{
                      fontSize: '0.82rem',
                      color: 'var(--text-muted)',
                      margin: 0,
                    }}
                  >
                    جرب تغيير محددات البحث أو اختيار فرع دراسي آخر.
                  </p>
                </div>
              ) : (
                filteredExams.map((exam, examIdx) => {
                  const isExpanded = expandedExamIds.has(examIdx);
                  const currentFilter = questionFilters[exam.id] || 'all';

                  const filteredQuestions =
                    exam.questions?.filter((q) => {
                      if (currentFilter === 'correct') {
                        return q.isAnswered !== false && q.isCorrect;
                      }
                      if (currentFilter === 'wrong') {
                        return q.isAnswered !== false && !q.isCorrect;
                      }
                      return true;
                    }) || [];

                  const correctCount =
                    exam.questions?.filter(
                      (q) => q.isAnswered !== false && q.isCorrect,
                    ).length || 0;
                  const wrongCount =
                    exam.questions?.filter(
                      (q) => q.isAnswered !== false && !q.isCorrect,
                    ).length || 0;

                  const isSolved = exam.isSolved === true;

                  const scoreGradient = isSolved
                    ? exam.percentage >= 85
                      ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
                      : exam.percentage >= 65
                      ? 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)'
                      : 'linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)'
                    : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)';

                  const scoreBorderColor = isSolved
                    ? exam.percentage >= 85
                      ? 'rgba(16, 185, 129, 0.35)'
                      : exam.percentage >= 65
                      ? 'rgba(6, 182, 212, 0.35)'
                      : 'rgba(244, 63, 94, 0.35)'
                    : 'rgba(99, 102, 241, 0.3)';

                  return (
                    <div
                      key={exam.id || examIdx}
                      style={{
                        backgroundColor: 'rgba(13, 19, 34, 0.85)',
                        border: `1px solid ${
                          isExpanded
                            ? 'rgba(99, 102, 241, 0.5)'
                            : scoreBorderColor
                        }`,
                        borderRadius: '18px',
                        overflow: 'hidden',
                        transition: 'all 0.25s ease',
                        boxShadow: isExpanded
                          ? '0 12px 30px -8px rgba(0, 0, 0, 0.5), 0 0 20px rgba(99, 102, 241, 0.1)'
                          : 'none',
                      }}
                    >
                      {/* Exam Header Accordion Bar */}
                      <div
                        onClick={() => toggleExpand(examIdx)}
                        style={{
                          padding: '1.1rem 1.35rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '1rem',
                          flexWrap: 'wrap',
                          background: isExpanded
                            ? 'rgba(30, 41, 59, 0.45)'
                            : 'rgba(255, 255, 255, 0.015)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '14px',
                            flex: 1,
                          }}
                        >
                          <div
                            style={{
                              width: '46px',
                              height: '46px',
                              borderRadius: '14px',
                              background: scoreGradient,
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 900,
                              fontSize: '0.92rem',
                              flexShrink: 0,
                              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                            }}
                          >
                            {isSolved ? `${exam.percentage}%` : 'مقرر'}
                          </div>

                          <div>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                flexWrap: 'wrap',
                              }}
                            >
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 800,
                                  color: 'var(--cyan)',
                                  background: 'rgba(6, 182, 212, 0.12)',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                }}
                              >
                                {exam.branch}
                              </span>
                              <h4
                                style={{
                                  fontSize: '0.98rem',
                                  fontWeight: 900,
                                  color: '#fff',
                                  margin: 0,
                                }}
                              >
                                {exam.title}
                              </h4>
                              {!isSolved && (
                                <span
                                  style={{
                                    fontSize: '0.68rem',
                                    fontWeight: 700,
                                    color: 'var(--amber)',
                                    background: 'rgba(245, 158, 11, 0.12)',
                                    padding: '2px 6px',
                                    borderRadius: '5px',
                                  }}
                                >
                                  لم يحل بعد
                                </span>
                              )}
                            </div>

                            <div
                              style={{
                                fontSize: '0.76rem',
                                color: 'var(--text-muted)',
                                marginTop: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '14px',
                                flexWrap: 'wrap',
                              }}
                            >
                              {exam.formattedDate && (
                                <span
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  <Calendar
                                    size={13}
                                    style={{ color: 'var(--text-muted)' }}
                                  />
                                  <span>{exam.formattedDate}</span>
                                </span>
                              )}
                              <span
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <Clock
                                  size={13}
                                  style={{ color: 'var(--text-muted)' }}
                                />
                                <span>الزمن: {exam.durationTaken}</span>
                              </span>
                              <span>
                                عدد الأسئلة: {exam.totalQuestions} سؤال
                              </span>
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                          }}
                        >
                          {isSolved ? (
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleShowQuestionReview(exam, 'correct');
                                }}
                                title="عرض الأسئلة الصحيحة"
                                style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 800,
                                  color: 'var(--emerald)',
                                  background: 'rgba(16, 185, 129, 0.12)',
                                  padding: '4px 10px',
                                  borderRadius: '8px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  border: '1px solid rgba(16, 185, 129, 0.2)',
                                  cursor: 'pointer',
                                }}
                              >
                                <Check size={13} /> {correctCount} صح
                              </button>
                              {wrongCount > 0 ? (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleShowQuestionReview(exam, 'wrong');
                                  }}
                                  title="عرض الأسئلة الخاطئة"
                                  style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 800,
                                    color: 'var(--rose)',
                                    background: 'rgba(244, 63, 94, 0.12)',
                                    padding: '4px 10px',
                                    borderRadius: '8px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    border: '1px solid rgba(244, 63, 94, 0.2)',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <X size={13} />
                                  {wrongCount} خطأ
                                </button>
                              ) : null}
                            </div>
                          ) : (
                            <span
                              style={{
                                fontSize: '0.72rem',
                                color: 'var(--cyan)',
                                background: 'rgba(6, 182, 212, 0.1)',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontWeight: 700,
                              }}
                            >
                              استعراض الأسئلة ↗
                            </span>
                          )}

                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--text-muted)',
                              transition: 'transform 0.2s ease',
                              transform: isExpanded
                                ? 'rotate(180deg)'
                                : 'rotate(0deg)',
                            }}
                          >
                            <ChevronDown size={16} />
                          </div>
                        </div>
                      </div>

                      {/* Expanded Questions Breakdown */}
                      {isExpanded && (
                        <div
                          style={{
                            padding: '1.4rem',
                            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                            backgroundColor: 'rgba(5, 9, 20, 0.95)',
                          }}
                        >
                          {/* Filter bar for questions (if solved) */}
                          {isSolved && (
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '1.25rem',
                                flexWrap: 'wrap',
                                gap: '10px',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: '0.8rem',
                                    color: 'var(--text-muted)',
                                    fontWeight: 700,
                                  }}
                                >
                                  عرض الأسئلة:
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setExamFilter(exam.id, 'all')}
                                  style={{
                                    padding: '4px 10px',
                                    borderRadius: '8px',
                                    fontSize: '0.75rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    background:
                                      currentFilter === 'all'
                                        ? 'rgba(99, 102, 241, 0.25)'
                                        : 'rgba(255, 255, 255, 0.04)',
                                    color:
                                      currentFilter === 'all'
                                        ? '#fff'
                                        : 'var(--text-muted)',
                                    border:
                                      currentFilter === 'all'
                                        ? '1px solid var(--primary)'
                                        : '1px solid rgba(255, 255, 255, 0.08)',
                                  }}
                                >
                                  جميع الأسئلة ({exam.questions?.length || 0})
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExamFilter(exam.id, 'correct')
                                  }
                                  style={{
                                    padding: '4px 10px',
                                    borderRadius: '8px',
                                    fontSize: '0.75rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    background:
                                      currentFilter === 'correct'
                                        ? 'rgba(16, 185, 129, 0.2)'
                                        : 'rgba(255, 255, 255, 0.04)',
                                    color:
                                      currentFilter === 'correct'
                                        ? 'var(--emerald)'
                                        : 'var(--text-muted)',
                                    border:
                                      currentFilter === 'correct'
                                        ? '1px solid var(--emerald)'
                                        : '1px solid rgba(255, 255, 255, 0.08)',
                                  }}
                                >
                                  الصحيحة فقط ({correctCount}) ✅
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setExamFilter(exam.id, 'wrong')}
                                  style={{
                                    padding: '4px 10px',
                                    borderRadius: '8px',
                                    fontSize: '0.75rem',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    background:
                                      currentFilter === 'wrong'
                                        ? 'rgba(244, 63, 94, 0.2)'
                                        : 'rgba(255, 255, 255, 0.04)',
                                    color:
                                      currentFilter === 'wrong'
                                        ? 'var(--rose)'
                                        : 'var(--text-muted)',
                                    border:
                                      currentFilter === 'wrong'
                                        ? '1px solid var(--rose)'
                                        : '1px solid rgba(255, 255, 255, 0.08)',
                                  }}
                                >
                                  الخاطئة فقط ({wrongCount}) ❌
                                </button>
                              </div>

                              <div
                                style={{
                                  fontSize: '0.8rem',
                                  color: 'var(--text-muted)',
                                }}
                              >
                                النتيجة المحققة:{' '}
                                <strong style={{ color: '#fff' }}>
                                  {correctCount} من أصل {exam.totalQuestions}
                                </strong>
                              </div>
                            </div>
                          )}

                          {/* Question Cards */}
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '14px',
                            }}
                          >
                            {filteredQuestions.length === 0 ? (
                              <div
                                style={{
                                  textAlign: 'center',
                                  padding: '2rem',
                                  color: 'var(--text-muted)',
                                  fontSize: '0.85rem',
                                  border: '1px dashed rgba(148, 163, 184, 0.22)',
                                  borderRadius: '14px',
                                  background: 'rgba(15, 23, 42, 0.45)',
                                }}
                              >
                                لا توجد أسئلة تطابق التصنيف المختار.
                              </div>
                            ) : (
                              filteredQuestions.map((q, qIndex) => {
                                const isCorrect = q.isCorrect;
                                const hasAnswer =
                                  q.isAnswered !== false || !isSolved;
                                const questionStatusColor = !hasAnswer
                                  ? 'var(--text-muted)'
                                  : isCorrect
                                    ? 'var(--emerald)'
                                    : 'var(--rose)';

                                return (
                                  <div
                                    key={q.id || qIndex}
                                    style={{
                                      backgroundColor: 'rgba(15, 23, 42, 0.75)',
                                      border: isSolved
                                        ? !hasAnswer
                                          ? '1px solid rgba(148, 163, 184, 0.2)'
                                          : isCorrect
                                            ? '1px solid rgba(16, 185, 129, 0.35)'
                                            : '1px solid rgba(244, 63, 94, 0.35)'
                                        : '1px solid rgba(255, 255, 255, 0.08)',
                                      borderRadius: '14px',
                                      padding: '1.25rem',
                                      position: 'relative',
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        marginBottom: '10px',
                                        gap: '8px',
                                        flexWrap: 'wrap',
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '8px',
                                        }}
                                      >
                                        <span
                                          style={{
                                            width: '26px',
                                            height: '26px',
                                            borderRadius: '8px',
                                            background: isSolved
                                              ? questionStatusColor
                                              : 'rgba(99, 102, 241, 0.8)',
                                            color: '#fff',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '0.8rem',
                                            fontWeight: 900,
                                          }}
                                        >
                                          {qIndex + 1}
                                        </span>

                                        {isSolved && hasAnswer ? (
                                          <span
                                            style={{
                                              fontSize: '0.82rem',
                                              fontWeight: 800,
                                              color: questionStatusColor,
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '4px',
                                            }}
                                          >
                                            {isCorrect ? (
                                              <>
                                                <CheckCircle2 size={15} /> إجابة
                                                الطالب صحيحة (+1 درجة)
                                              </>
                                            ) : (
                                              <>
                                                <XCircle size={15} /> إجابة الطالب
                                                خاطئة (0 درجة)
                                              </>
                                            )}
                                          </span>
                                        ) : isSolved ? (
                                          <span
                                            style={{
                                              fontSize: '0.82rem',
                                              fontWeight: 800,
                                              color: questionStatusColor,
                                            }}
                                          >
                                            لم تتم الإجابة عن هذا السؤال
                                          </span>
                                        ) : (
                                          <span
                                            style={{
                                              fontSize: '0.78rem',
                                              fontWeight: 700,
                                              color: 'var(--cyan)',
                                            }}
                                          >
                                            سؤال من بنك أسئلة المنهج
                                          </span>
                                        )}
                                      </div>

                                      <span
                                        style={{
                                          fontSize: '0.72rem',
                                          color: 'var(--text-muted)',
                                          background:
                                            'rgba(255, 255, 255, 0.05)',
                                          padding: '2px 8px',
                                          borderRadius: '6px',
                                        }}
                                      >
                                        اختيار من متعدد
                                      </span>
                                    </div>

                                    <div
                                      style={{
                                        fontSize: '0.95rem',
                                        fontWeight: 800,
                                        color: '#fff',
                                        lineHeight: '1.6',
                                        marginBottom: '1rem',
                                      }}
                                    >
                                      {q.question}
                                    </div>

                                    <div
                                      style={{
                                        display: 'grid',
                                        gridTemplateColumns:
                                          'repeat(auto-fit, minmax(220px, 1fr))',
                                        gap: '10px',
                                        marginBottom: q.explanation
                                          ? '0.85rem'
                                          : '0',
                                      }}
                                    >
                                      {q.options?.map((opt, optIdx) => {
                                        const isStudentChoice =
                                          q.studentIndex === optIdx;
                                        const isCorrectChoice =
                                          q.correctIndex === optIdx;

                                        let bg = 'rgba(255, 255, 255, 0.02)';
                                        let border =
                                          '1px solid rgba(255, 255, 255, 0.08)';
                                        let textColor = 'var(--text-muted)';
                                        let badge = null;

                                        if (isSolved) {
                                          if (isStudentChoice && isCorrectChoice) {
                                            bg = 'rgba(16, 185, 129, 0.16)';
                                            border = '1px solid var(--emerald)';
                                            textColor = '#fff';
                                            badge = (
                                              <span
                                                style={{
                                                  fontSize: '0.7rem',
                                                  fontWeight: 900,
                                                  color: 'var(--emerald)',
                                                  display: 'inline-flex',
                                                  alignItems: 'center',
                                                  gap: '3px',
                                                }}
                                              >
                                                <Check size={12} /> إجابة الطالب
                                                (صحيحة)
                                              </span>
                                            );
                                          } else if (
                                            isStudentChoice &&
                                            !isCorrectChoice
                                          ) {
                                            bg = 'rgba(244, 63, 94, 0.16)';
                                            border = '1px solid var(--rose)';
                                            textColor = '#fff';
                                            badge = (
                                              <span
                                                style={{
                                                  fontSize: '0.7rem',
                                                  fontWeight: 900,
                                                  color: 'var(--rose)',
                                                  display: 'inline-flex',
                                                  alignItems: 'center',
                                                  gap: '3px',
                                                }}
                                              >
                                                <X size={12} /> إجابة الطالب
                                                (خاطئة)
                                              </span>
                                            );
                                          } else if (
                                            !isStudentChoice &&
                                            isCorrectChoice
                                          ) {
                                            bg = 'rgba(16, 185, 129, 0.08)';
                                            border =
                                              '1px dashed var(--emerald)';
                                            textColor = 'var(--emerald)';
                                            badge = (
                                              <span
                                                style={{
                                                  fontSize: '0.7rem',
                                                  fontWeight: 900,
                                                  color: 'var(--emerald)',
                                                  display: 'inline-flex',
                                                  alignItems: 'center',
                                                  gap: '3px',
                                                }}
                                              >
                                                <CheckCircle2 size={12} /> الإجابة
                                                النموذجية الصحيحة
                                              </span>
                                            );
                                          }
                                        } else {
                                          // Unsolved curriculum preview
                                          if (isCorrectChoice) {
                                            bg = 'rgba(16, 185, 129, 0.1)';
                                            border = '1px solid rgba(16, 185, 129, 0.4)';
                                            textColor = '#fff';
                                            badge = (
                                              <span
                                                style={{
                                                  fontSize: '0.7rem',
                                                  fontWeight: 900,
                                                  color: 'var(--emerald)',
                                                  display: 'inline-flex',
                                                  alignItems: 'center',
                                                  gap: '3px',
                                                }}
                                              >
                                                <Check size={12} /> الإجابة النموذجية الصحيحة
                                              </span>
                                            );
                                          }
                                        }

                                        return (
                                          <div
                                            key={optIdx}
                                            style={{
                                              background: bg,
                                              border: border,
                                              borderRadius: '10px',
                                              padding: '10px 12px',
                                              display: 'flex',
                                              flexDirection: 'column',
                                              gap: '4px',
                                              transition: 'all 0.2s ease',
                                            }}
                                          >
                                            <div
                                              style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                              }}
                                            >
                                              <span
                                                style={{
                                                  width: '22px',
                                                  height: '22px',
                                                  borderRadius: '6px',
                                                  background:
                                                    'rgba(255, 255, 255, 0.08)',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  fontSize: '0.75rem',
                                                  fontWeight: 800,
                                                  color: textColor,
                                                  flexShrink: 0,
                                                }}
                                              >
                                                {optionLetters[optIdx] ||
                                                  optIdx + 1}
                                              </span>
                                              <span
                                                style={{
                                                  fontSize: '0.88rem',
                                                  fontWeight: 700,
                                                  color: textColor,
                                                }}
                                              >
                                                {opt}
                                              </span>
                                            </div>
                                            {badge && (
                                              <div
                                                style={{
                                                  alignSelf: 'flex-start',
                                                  marginTop: '2px',
                                                }}
                                              >
                                                {badge}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>

                                    {q.explanation && (
                                      <div
                                        style={{
                                          background:
                                            'rgba(245, 158, 11, 0.08)',
                                          border:
                                            '1px solid rgba(245, 158, 11, 0.25)',
                                          borderRadius: '10px',
                                          padding: '8px 12px',
                                          fontSize: '0.8rem',
                                          color: 'var(--amber)',
                                          display: 'flex',
                                          alignItems: 'flex-start',
                                          gap: '8px',
                                          marginTop: '8px',
                                        }}
                                      >
                                        <Lightbulb
                                          size={16}
                                          style={{
                                            flexShrink: 0,
                                            marginTop: '2px',
                                          }}
                                        />
                                        <div>
                                          <strong>توضيح وفكرة الحل: </strong>
                                          <span>{q.explanation}</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: STUDENT PROFILE, SUBSCRIPTION & DEVICE INFO        */}
        {/* ========================================================= */}
        {activeTab === 'profile' && (
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div
              style={{
                background: '#050914',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '16px',
                padding: '1.25rem 1.5rem',
              }}
            >
              <h3
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  color: 'var(--cyan)',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <User size={18} /> البيانات الشخصية والاشتراك
              </h3>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '14px',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    الاسم بالكامل
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#fff', marginTop: '3px' }}>
                    {studentName}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    الصف الدراسي
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--cyan)', marginTop: '3px' }}>
                    {safeGradeName}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    رقم هاتف الطالب
                  </div>
                  <div
                    dir="ltr"
                    style={{
                      fontSize: '0.92rem',
                      fontWeight: 800,
                      color: '#fff',
                      marginTop: '3px',
                      textAlign: 'right',
                    }}
                  >
                    {studentPhone || 'غير مسجل'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    رقم هاتف ولي الأمر
                  </div>
                  <div
                    dir="ltr"
                    style={{
                      fontSize: '0.92rem',
                      fontWeight: 800,
                      color: '#fff',
                      marginTop: '3px',
                      textAlign: 'right',
                    }}
                  >
                    {parentPhone || 'غير مسجل'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    كود الطالب
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginTop: '3px',
                    }}
                  >
                    {studentCode ? (
                      <>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '0.95rem',
                            fontWeight: 900,
                            color: 'var(--purple)',
                            background: 'rgba(99, 102, 241, 0.18)',
                            border: '1px solid rgba(99, 102, 241, 0.35)',
                            padding: '3px 10px',
                            borderRadius: '8px',
                          }}
                        >
                          {studentCode}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(studentCode)}
                          title="نسخ الكود"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: copiedCode ? 'var(--emerald)' : 'var(--text-muted)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          {copiedCode ? <Check size={15} /> : <Copy size={15} />}
                        </button>
                      </>
                    ) : (
                      <span
                        style={{
                          fontSize: '0.8rem',
                          color: 'var(--amber)',
                          background: 'rgba(245, 158, 11, 0.12)',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontWeight: 700,
                        }}
                      >
                        كود الطالب غير متاح
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    صلاحية الاشتراك
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#fff', marginTop: '3px' }}>
                    {activeStudent.start_date ||
                    activeStudent.subscription?.start_date
                      ? `${
                          activeStudent.start_date ||
                          activeStudent.subscription?.start_date
                        } إلى ${
                          activeStudent.end_date ||
                          activeStudent.subscription?.end_date ||
                          activeStudent.subscription?.expires_at ||
                          '—'
                        }`
                      : 'ساري ومفعل'}
                  </div>
                </div>
              </div>
            </div>

            {/* Trusted Device Card with clear friendly explanation */}
            <div
              style={{
                background: '#050914',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '16px',
                padding: '1.25rem 1.5rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1rem',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <h3
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    color: 'var(--amber)',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <ShieldCheck size={18} /> حماية وربط الجهاز الموثوق
                </h3>

                {hasDevice && onResetDevice && (
                  <button
                    type="button"
                    onClick={() => onResetDevice(activeStudent)}
                    disabled={isProcessingAction}
                    className="btn-secondary"
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.8rem',
                      color: 'var(--amber)',
                      borderColor: 'rgba(245, 158, 11, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <RotateCcw size={14} />
                    <span>إعادة ضبط الجهاز الموثوق</span>
                  </button>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: hasDevice
                      ? 'rgba(16, 185, 129, 0.15)'
                      : 'rgba(255, 255, 255, 0.05)',
                    color: hasDevice ? 'var(--emerald)' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <ShieldCheck size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff' }}>
                    {hasDevice
                      ? 'الجهاز مسجل ومقترن بنجاح 🔒'
                      : 'لم يتم تسجيل أو ربط جهاز على هذا الحساب بعد'}
                  </div>
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      marginTop: '2px',
                    }}
                  >
                    {trustedDeviceIdentifier
                      ? `بصمة الجهاز المسجل: ${trustedDeviceIdentifier}`
                      : 'يتم تسجيل الجهاز تلقائياً عند أول دخول للطالب لحماية المحتوى.'}
                  </div>
                </div>
              </div>

              {/* Informative Explanation Box */}
              <div
                style={{
                  background: 'rgba(6, 182, 212, 0.08)',
                  border: '1px solid rgba(6, 182, 212, 0.25)',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  marginTop: '12px',
                  fontSize: '0.82rem',
                  color: 'var(--text-muted)',
                  lineHeight: '1.6',
                }}
              >
                <div
                  style={{
                    color: 'var(--cyan)',
                    fontWeight: 800,
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Info size={16} />
                  <span>ما هي ميزة قفل وحماية الجهاز الموثوق؟</span>
                </div>
                <div>
                  هذه الميزة مصممة خصيصاً لحماية شروحاتك وفيديوهاتك من التسريب أو مشاركة الحساب بين أكثر من طالب.
                  عند أول دخول للطالب بالكود الخاص به، يتعرف النظام على جهازه الشخصي ويربط الحساب به تلقائياً.
                  لو حاول الطالب إعطاء الكود لزميله لفتحه من جهاز آخر، سيرفض النظام الدخول.
                  وإذا قام الطالب بتغيير هاتفه، يمكنك كمعلم الضغط على زر <strong>"إعادة ضبط الجهاز الموثوق"</strong> في أي وقت لفك الارتباط فوراً والسماح له بالدخول من جهازه الجديد.
                </div>
              </div>
            </div>

            {/* Quick Management Actions */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginTop: 'auto',
                paddingTop: '8px',
              }}
            >
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(activeStudent)}
                  className="btn-secondary"
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    color: 'var(--amber)',
                    borderColor: 'rgba(245, 158, 11, 0.3)',
                    fontSize: '0.85rem',
                    padding: '9px 14px',
                  }}
                >
                  <Edit3 size={15} />
                  <span>تعديل بيانات الطالب</span>
                </button>
              )}

              {onDeactivate && (
                <button
                  type="button"
                  onClick={() => onDeactivate(activeStudent)}
                  disabled={isProcessingAction}
                  className="btn-secondary"
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    color: 'var(--rose)',
                    borderColor: 'rgba(244, 63, 94, 0.3)',
                    fontSize: '0.85rem',
                    padding: '9px 14px',
                  }}
                >
                  <PowerOff size={15} />
                  <span>
                    {subscriptionStatus === 'active'
                      ? 'تعطيل اشتراك الطالب'
                      : 'حذف سجل الطالب'}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: PERFORMANCE ANALYTICS BY MATH BRANCH               */}
        {/* ========================================================= */}
        {activeTab === 'analytics' && (
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ marginBottom: '8px' }}>
              <h3
                style={{
                  fontSize: '1rem',
                  fontWeight: 900,
                  color: '#fff',
                  margin: 0,
                }}
              >
                تحليل مستوى الطالب ونقاط القوة والضعف
              </h3>
              <p
                style={{
                  fontSize: '0.82rem',
                  color: 'var(--text-muted)',
                  marginTop: '4px',
                }}
              >
                توزيع دقة إجابات الطالب عبر فروع المنهج الدراسي لتحديد الموضوعات
                التي تحتاج إلى مراجعة إضافية.
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))',
                gap: '14px',
              }}
            >
              {branchAnalytics.map((item, idx) => {
                const color =
                  item.accuracy >= 80
                    ? 'var(--emerald)'
                    : item.accuracy >= 60
                    ? 'var(--cyan)'
                    : 'var(--rose)';

                const evaluationTag =
                  item.accuracy >= 85
                    ? 'مستوى ممتاز 🌟'
                    : item.accuracy >= 70
                    ? 'مستوى جيد جداً 👍'
                    : item.accuracy >= 50
                    ? 'مستوى متوسط ⚡'
                    : 'يحتاج لمراجعة وتدريب ⚠️';

                return (
                  <div
                    key={idx}
                    style={{
                      background: '#050914',
                      border: `1px solid ${color}30`,
                      borderRadius: '16px',
                      padding: '1.25rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '10px',
                      }}
                    >
                      <h4
                        style={{
                          fontSize: '1rem',
                          fontWeight: 900,
                          color: '#fff',
                          margin: 0,
                        }}
                      >
                        {item.name}
                      </h4>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          color: color,
                          background: `${color}15`,
                          padding: '2px 8px',
                          borderRadius: '6px',
                        }}
                      >
                        {evaluationTag}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                        marginBottom: '8px',
                      }}
                    >
                      <span>
                        أجاب {item.correctQuestions} من أصل {item.totalQuestions}{' '}
                        سؤال
                      </span>
                      <strong style={{ color: color, fontSize: '0.95rem' }}>
                        {item.accuracy}%
                      </strong>
                    </div>

                    <div
                      style={{
                        width: '100%',
                        height: '8px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        borderRadius: '999px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${item.accuracy}%`,
                          height: '100%',
                          background: color,
                          borderRadius: '999px',
                          transition: 'width 0.6s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StudentExamHistoryModal(props) {
  return (
    <ModalErrorBoundary onClose={props.onClose}>
      <StudentExamHistoryModalContent {...props} />
    </ModalErrorBoundary>
  );
}
