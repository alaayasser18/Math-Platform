import { useState, useMemo } from "react";
import { useStudent } from "../context/useStudent";
import { GRADES, BRANCHES } from "../data/platformData";
import {
  UserPlus,
  Edit3,
  Trash2,
  Search,
  Eye,
  X,
  XCircle,
  ShieldCheck,
  Video,
  FileQuestion,
  BookOpen,
  Users,
  Plus,
  Clock,
  Key,
  CheckCircle2,
  RefreshCw,
  Copy,
  Check,
  Calendar,
  AlertTriangle,
  Phone,
  PowerOff,
  BarChart2,
  RotateCcw,
  Smartphone,
  UploadCloud,
  FileText,
} from "lucide-react";
import { GRADE_ID_MAP, getGradeNameById } from "../services/api";

function getSubscriptionCode(...values) {
  for (const value of values) {
    if (typeof value === "string" && value) return value;
    if (typeof value === "number") return String(value);
    if (value && typeof value === "object") {
      const nestedCode = value.subscription_code || value.code;
      if (typeof nestedCode === "string" && nestedCode) return nestedCode;
      if (typeof nestedCode === "number") return String(nestedCode);
    }
  }
  return "";
}

function getArabicGradeName(grade, gradeId) {
  const gradeName =
    typeof grade === "string"
      ? grade
      : typeof grade?.name === "string"
        ? grade.name
        : "";
  if (!gradeName || !/^[a-z\s\d-]+$/i.test(gradeName.trim())) {
    return gradeName || getGradeNameById(gradeId || grade?.id || 1);
  }

  const normalized = gradeName.toLowerCase().replace(/[_-]+/g, " ").trim();
  const gradeIds = {
    "first secondary": 1,
    "1st secondary": 1,
    "secondary first": 1,
    "second secondary": 2,
    "2nd secondary": 2,
    "secondary second": 2,
    "third secondary": 3,
    "3rd secondary": 3,
    "secondary third": 3,
    "first preparatory": 6,
    "1st preparatory": 6,
    "first prep": 6,
    "second preparatory": 5,
    "2nd preparatory": 5,
    "second prep": 5,
    "third preparatory": 4,
    "3rd preparatory": 4,
    "third prep": 4,
  };

  return getGradeNameById(gradeIds[normalized] || gradeId || 1);
}

function hasActiveTrustedDevice(...records) {
  let hasDeviceState = false;
  for (const record of records) {
    if (!record || typeof record !== "object") continue;
    const hasDeviceField = [
      "trusted_device",
      "active_trusted_device",
      "trustedDevice",
      "trusted_device_id",
      "device_identifier",
    ].some((key) => Object.prototype.hasOwnProperty.call(record, key));
    if (!hasDeviceField) continue;
    hasDeviceState = true;
    const device =
      record.trusted_device ||
      record.active_trusted_device ||
      record.trustedDevice ||
      record.subscription?.trusted_device ||
      record.active_subscription?.trusted_device;
    if (typeof device === "string" && device.trim()) return true;
    if (typeof device === "number" && device) return true;
    if (device && typeof device === "object" &&
      device.is_active !== false &&
      device.status !== "inactive" &&
      device.status !== "revoked" &&
      Boolean(device.device_identifier || device.identifier || device.id)
    ) return true;
    if (record.trusted_device_id || record.device_identifier) return true;
  }
  // List endpoints often omit device details. In that case let the API
  // decide and show its specific 422 response if there is no active device.
  return !hasDeviceState;
}

function getSubscriptionRecord(record) {
  if (!record || typeof record !== "object") return null;
  return (
    record.subscription ||
    record.active_subscription ||
    record.subscriptions?.[0] ||
    (typeof record.subscription_code === "object"
      ? record.subscription_code
      : record)
  );
}

function getSubscriptionStatus(...records) {
  const statuses = records.flatMap((record) => {
    if (!record || typeof record !== "object") return [];
    const subscription = getSubscriptionRecord(record);
    return [
      subscription?.status,
      record.subscription_status,
      record.subscriptionStatus,
      record.status,
      subscription?.approval_status,
      record.approval_status,
    ]
      .filter((status) => status != null && status !== "")
      .map((status) => String(status).toLowerCase());
  });

  const inactiveStatus = statuses.find((status) =>
    ["inactive", "cancelled", "canceled", "deactivated", "disabled"].includes(
      status,
    ),
  );
  if (inactiveStatus) return inactiveStatus;

  return statuses[0] || "";
}

function isDeactivatedStatus(status) {
  return ["inactive", "cancelled", "canceled", "deactivated", "disabled"].includes(
    String(status || "").toLowerCase(),
  );
}

export default function TeacherDashboardPage() {
  const {
    studentsList,
    lessonsList,
    memosList,
    pendingRequests,
    approvedSubscriptions,
    isLoadingRequests,
    isLoadingApproved,
    fetchPendingRequests,
    fetchApprovedStudents,
    approveActivationRequest,
    cancelActivationRequest,
    deactivateStudentSubscription,
    resetTrustedDevice,
    createStudentByAdmin,
    updateStudentByAdmin,
    addLesson,
    deleteLesson,
    isLoadingLessons,
    fetchLessons,
    addQuestionToLessonQuiz,
    addMemo,
    deleteMemo,
    deleteStudentByTeacher,
    showToast,
    // OpenAPI 3.0.0 Connected Endpoints
    adminExamsList,
    isLoadingExams,
    fetchAdminExams,
    createAdminExam,
    updateAdminExam,
    deleteAdminExam,
    createAdminQuestion,
    updateAdminQuestion,
    deleteAdminQuestion,
    createAdminOption,
    updateAdminOption,
    deleteAdminOption,
    subscriptionCodesList,
    isLoadingCodes,
    fetchSubscriptionCodes,
    paginatedStudents,
    studentsPagination,
    isLoadingStudents,
    fetchAdminStudents,
    getStudentDetails,
  } = useStudent();

  // Active Main Tab: 'requests' | 'approved' | 'students' | 'lessons' | 'quizzes' | 'codes' | 'memos'
  const [activeTab, setActiveTab] = useState("requests");
  const [searchQuery, setSearchQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState("الكل");
  const [copiedCode, setCopiedCode] = useState(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [deactivationTarget, setDeactivationTarget] = useState(null);
  const [deleteConfirmationStudent, setDeleteConfirmationStudent] =
    useState(null);

  // --- Subscription Codes State (GET /api/v1/admin/subscription-codes) ---
  const [selectedCodesGrade, setSelectedCodesGrade] = useState(1);
  const [codesSearchQuery, setCodesSearchQuery] = useState("");

  // --- Admin Exams State (OpenAPI 3.0.0 Admin Exams) ---
  const [isAddExamOpen, setIsAddExamOpen] = useState(false);
  const [newExamData, setNewExamData] = useState({
    lesson_id: "",
    title: "",
    description: "",
    duration_minutes: 20,
    passing_percentage: 60,
  });
  const [editingExam, setEditingExam] = useState(null);
  const [expandedExamId, setExpandedExamId] = useState(null);

  // Question & Option Modal State
  const [questionModal, setQuestionModal] = useState({
    isOpen: false,
    isEdit: false,
    examId: null,
    questionId: null,
    question_text: "",
    points: 1,
    opt1: "",
    opt2: "",
    opt3: "",
    opt4: "",
    correctOption: 1,
  });

  const [optionModal, setOptionModal] = useState({
    isOpen: false,
    isEdit: false,
    questionId: null,
    optionId: null,
    option_text: "",
    is_correct: false,
  });

  // --- Modals State ---
  // 1. Add Lesson Modal
  const [isAddLessonOpen, setIsAddLessonOpen] = useState(false);
  const [newLessonData, setNewLessonData] = useState({
    title: "",
    branch: BRANCHES[1] || "التفاضل والتكامل",
    grade: GRADES[0].name,
    gradeId: GRADES[0].id,
    duration: "45 دقيقة",
    videoUrl: "",
    pdfFile: "مذكرة_الشرح.pdf",
    description: "",
  });

  // 2. Add Quiz Question Modal
  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false);
  const [selectedLessonForQuiz, setSelectedLessonForQuiz] = useState(
    lessonsList[0]?.id || 1,
  );
  const [newQuestionData, setNewQuestionData] = useState({
    question: "",
    opt1: "",
    opt2: "",
    opt3: "",
    opt4: "",
    correctIndex: 0,
    explanation: "",
  });

  // 3. Add Memo Modal
  const [isAddMemoOpen, setIsAddMemoOpen] = useState(false);
  const [newMemoData, setNewMemoData] = useState({
    title: "",
    grade: GRADES[0].name,
    pages: 120,
    fileSize: "15.0 MB",
    fileName: "",
    fileUrl: null,
  });

  // 4. Student Modals (API Schema Aligned)
  const [viewingStudent, setViewingStudent] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const getStudentDates = () => {
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 365);
    return {
      start_date: startDate.toISOString().split("T")[0],
      end_date: endDate.toISOString().split("T")[0],
      code_expires_at: endDate.toISOString().split("T")[0],
    };
  };

  const [newStudentData, setNewStudentData] = useState(() => ({
    first_name: "",
    last_name: "",
    phone: "",
    parent_phone: "",
    grade_id: 1,
    ...getStudentDates(),
  }));

  const handleOpenStudentDetails = async (std) => {
    setViewingStudent({ ...std, isLoadingDetails: true });
    try {
      if (typeof getStudentDetails === "function") {
        const res = await getStudentDetails(std.id);
        if (res?.success && res.data) {
          const detail = res.data?.student || res.data;
          setViewingStudent((prev) => ({
            ...prev,
            ...detail,
            subscription:
              res.data?.subscription ||
              detail.subscription ||
              prev?.subscription,
            trusted_device:
              res.data?.trusted_device ||
              detail.trusted_device ||
              prev?.trusted_device,
            isLoadingDetails: false,
          }));
        } else {
          setViewingStudent((prev) => ({ ...prev, isLoadingDetails: false }));
        }
      } else {
        setViewingStudent((prev) => ({ ...prev, isLoadingDetails: false }));
      }
    } catch {
      setViewingStudent((prev) => ({ ...prev, isLoadingDetails: false }));
    }
  };

  // --- Handlers ---
  const handleCopyCode = (code) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    showToast(`تم نسخ كود الاشتراك [ ${code} ] إلى الحافظة 📋`);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleApproveRequest = async (id) => {
    setIsProcessingAction(true);
    await approveActivationRequest(id);
    setIsProcessingAction(false);
  };

  const handleRejectRequest = async (id) => {
    setIsProcessingAction(true);
    await cancelActivationRequest(id);
    setIsProcessingAction(false);
  };

  const handleDeactivate = async (subscriptionId) => {
    setIsProcessingAction(true);
    const result = await deactivateStudentSubscription(subscriptionId);
    setIsProcessingAction(false);
    return result;
  };

  const handleResetDevice = async (subscriptionId) => {
    setIsProcessingAction(true);
    const result = await resetTrustedDevice(subscriptionId);
    setIsProcessingAction(false);
    return result;
  };

  const handleDeactivateStudentRow = async (std) => {
    const subscription = approvedSubscriptions.find(
      (item) => String(item.student?.id || item.student_id) === String(std.id),
    );
    const subscriptionId =
      std.subscription_id ||
      std.subscription?.id ||
      std.active_subscription?.id ||
      std.subscription_code?.id ||
      subscription?.subscription_id ||
      subscription?.subscription_code?.id ||
      subscription?.id;

    if (!subscriptionId) {
      showToast("تعذر العثور على معرّف اشتراك الطالب", "error");
      return;
    }

    setIsProcessingAction(true);
    const result = await deactivateStudentSubscription(subscriptionId);
    setIsProcessingAction(false);
    return result;
  };

  const openStudentDeactivationConfirmation = (student) => {
    const studentName =
      `${student?.first_name || ""} ${student?.last_name || ""}`.trim() ||
      student?.name ||
      "الطالب";
    const subscriptionCode = getSubscriptionCode(
      student?.subscription_code,
      student?.subscription,
      student?.active_subscription,
      student?.code,
    );
    setDeactivationTarget({
      type: "student",
      student,
      studentName,
      subscriptionCode,
    });
  };

  const confirmDeactivation = async () => {
    if (!deactivationTarget || isProcessingAction) return;
    try {
      if (deactivationTarget.type === "student") {
        await handleDeactivateStudentRow(deactivationTarget.student);
      } else {
        await handleDeactivate(deactivationTarget.subscriptionId);
      }
    } finally {
      setDeactivationTarget(null);
    }
  };

  const handleResetDeviceForStudent = async (std) => {
    const subscription = approvedSubscriptions.find(
      (item) => String(item.student?.id || item.student_id) === String(std.id),
    );
    const subscriptionId =
      std.subscription_id ||
      std.subscription?.id ||
      std.active_subscription?.id ||
      std.subscription_code?.id ||
      subscription?.subscription_id ||
      subscription?.subscription_code?.id ||
      subscription?.id;

    if (!subscriptionId) {
      showToast("تعذر العثور على معرّف اشتراك الطالب", "error");
      return;
    }

    setIsProcessingAction(true);
    try {
      await resetTrustedDevice(subscriptionId);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleDeleteStudentRecord = (std) => {
    setDeleteConfirmationStudent(std);
  };

  const confirmDeleteStudentRecord = () => {
    if (!deleteConfirmationStudent) return;
    deleteStudentByTeacher(deleteConfirmationStudent.id);
    setDeleteConfirmationStudent(null);
  };

  const handleSaveLesson = async (e) => {
    e.preventDefault();
    if (!newLessonData.title.trim()) return;
    const grade = GRADES.find((item) => item.name === newLessonData.grade);
    setIsProcessingAction(true);
    const result = await addLesson({
      ...newLessonData,
      grade_id: grade?.numericId || 1,
    });
    setIsProcessingAction(false);

    if (result?.success) {
      setIsAddLessonOpen(false);
      setNewLessonData({
        title: "",
        branch: BRANCHES[1] || "التفاضل والتكامل",
        grade: GRADES[0].name,
        gradeId: GRADES[0].id,
        duration: "45 دقيقة",
        videoUrl: "",
        pdfFile: "مذكرة_الشرح.pdf",
        description: "",
      });
    }
  };

  const handleSaveQuestion = (e) => {
    e.preventDefault();
    if (
      !newQuestionData.question.trim() ||
      !newQuestionData.opt1.trim() ||
      !newQuestionData.opt2.trim()
    )
      return;
    const qObj = {
      question: newQuestionData.question,
      options: [
        newQuestionData.opt1,
        newQuestionData.opt2,
        newQuestionData.opt3 || "جـ",
        newQuestionData.opt4 || "د",
      ],
      correctIndex: parseInt(newQuestionData.correctIndex),
      explanation: newQuestionData.explanation,
    };
    addQuestionToLessonQuiz(parseInt(selectedLessonForQuiz), qObj);
    setIsAddQuestionOpen(false);
    setNewQuestionData({
      question: "",
      opt1: "",
      opt2: "",
      opt3: "",
      opt4: "",
      correctIndex: 0,
      explanation: "",
    });
  };

  const handleSaveExam = async (e) => {
    e.preventDefault();
    setIsProcessingAction(true);
    const result = editingExam
      ? await updateAdminExam(editingExam.id, newExamData)
      : await createAdminExam(newExamData);
    setIsProcessingAction(false);

    if (result?.success) {
      setIsAddExamOpen(false);
      setEditingExam(null);
      setNewExamData({
        lesson_id: lessonsList[0]?.id || 1,
        title: "",
        description: "",
        duration_minutes: 20,
        passing_percentage: 60,
      });
    }
  };

  const handleSaveExamQuestion = async (e) => {
    e.preventDefault();
    if (!questionModal.question_text.trim()) return;

    setIsProcessingAction(true);
    try {
      if (questionModal.isEdit) {
        await updateAdminQuestion(questionModal.questionId, {
          question_text: questionModal.question_text,
          points: Number(questionModal.points) || 1,
        });
      } else {
        const qRes = await createAdminQuestion(questionModal.examId, {
          question_text: questionModal.question_text,
          points: Number(questionModal.points) || 1,
        });

        const createdQ =
          qRes?.data?.question || qRes?.data || qRes?.question || qRes;
        const newQuestionId = createdQ?.id || createdQ?.data?.id;

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
              await createAdminOption(newQuestionId, {
                option_text: opt.text.trim(),
                is_correct: Boolean(opt.is_correct),
              });
            }
          }
        }
      }

      setQuestionModal({
        isOpen: false,
        isEdit: false,
        examId: null,
        questionId: null,
        question_text: "",
        points: 1,
        opt1: "",
        opt2: "",
        opt3: "",
        opt4: "",
        correctOption: 1,
      });

      await fetchAdminExams();
    } catch (err) {
      console.error("Error saving question:", err);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleSaveExamOption = async (e) => {
    e.preventDefault();
    setIsProcessingAction(true);
    const payload = {
      option_text: optionModal.option_text,
      is_correct: optionModal.is_correct,
    };
    const result = optionModal.isEdit
      ? await updateAdminOption(optionModal.optionId, payload)
      : await createAdminOption(optionModal.questionId, payload);
    setIsProcessingAction(false);

    if (result?.success) {
      setOptionModal((prev) => ({ ...prev, isOpen: false }));
    }
  };

  const handleSaveMemo = (e) => {
    e.preventDefault();
    if (!newMemoData.title.trim()) return;
    addMemo({
      ...newMemoData,
      fileSize: newMemoData.fileSize || "15.0 MB",
      pdfFile: newMemoData.fileName || "مذكرة_الشرح.pdf",
    });
    setIsAddMemoOpen(false);
    setNewMemoData({
      title: "",
      grade: GRADES[0].name,
      pages: 120,
      fileSize: "15.0 MB",
      fileName: "",
      fileUrl: null,
    });
  };

  const handleSaveNewStudent = async (e) => {
    e.preventDefault();
    if (!newStudentData.first_name.trim() || !newStudentData.last_name.trim())
      return;
    setIsProcessingAction(true);
    const result = await createStudentByAdmin(newStudentData);
    setIsProcessingAction(false);
    if (result?.success) {
      setIsAddStudentOpen(false);
      setNewStudentData({
        first_name: "",
        last_name: "",
        phone: "",
        parent_phone: "",
        grade_id: 1,
        ...getStudentDates(),
      });
    }
  };

  const handleSaveStudentEdit = async (e) => {
    e.preventDefault();
    if (!editingStudent) return;
    setIsProcessingAction(true);
    const nameParts = (
      editingStudent.name ||
      `${editingStudent.first_name || ""} ${editingStudent.last_name || ""}`
    )
      .trim()
      .split(" ");
    await updateStudentByAdmin(editingStudent.id, {
      first_name: editingStudent.first_name || nameParts[0] || "طالب",
      last_name:
        editingStudent.last_name || nameParts.slice(1).join(" ") || "جديد",
      phone: editingStudent.phone || "",
      parent_phone:
        editingStudent.parent_phone || editingStudent.parentPhone || "",
      grade_id: Number(editingStudent.grade_id || editingStudent.gradeId || 1),
    });
    setIsProcessingAction(false);
    setEditingStudent(null);
  };

  // Filtered lists for Students Roster (Directly from live API)
  const baseStudentsList = paginatedStudents || [];
  const filteredStudents = useMemo(() => {
    return baseStudentsList.filter((std) => {
      const studentObj = std.student || std.user || std;
      const stdName =
        `${std.first_name || studentObj.first_name || ""} ${std.last_name || studentObj.last_name || ""}`.trim() ||
        std.name ||
        studentObj.name ||
        "";
      const stdGrade = getArabicGradeName(
        std.grade || studentObj.grade,
        std.grade_id || studentObj.grade_id,
      );
      const matchesGrade = gradeFilter === "الكل" || stdGrade === gradeFilter;
      const matchesSearch =
        !searchQuery ||
        stdName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        std.phone?.includes(searchQuery) ||
        std.parent_phone?.includes(searchQuery) ||
        std.parentPhone?.includes(searchQuery) ||
        studentObj.phone?.includes(searchQuery) ||
        getSubscriptionCode(std.subscription_code)
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        getSubscriptionCode(std.code)
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      return matchesGrade && matchesSearch;
    });
  }, [baseStudentsList, gradeFilter, searchQuery]);

  // Filtered Approved Subscriptions
  const filteredApproved = useMemo(() => {
    return approvedSubscriptions.filter((sub) => {
      const studentObj = sub.student || sub.user || sub;
      const studentName =
        `${sub.first_name || studentObj.first_name || ""} ${sub.last_name || studentObj.last_name || ""}`.trim() ||
        sub.name ||
        studentObj.name ||
        "";
      const subCode = getSubscriptionCode(
        sub.subscription_code,
        studentObj.subscription_code,
        sub.code,
        studentObj.code,
        sub.subscription,
      );
      const phone = sub.phone || studentObj.phone || "";

      const matchesSearch =
        !searchQuery ||
        studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        subCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        phone.includes(searchQuery);
      return matchesSearch;
    });
  }, [approvedSubscriptions, searchQuery]);

  const completedLessons = viewingStudent?.completedLessons ?? 0;
  const totalLessons = lessonsList.length;
  const completedQuizzes = viewingStudent?.completedQuizzes ?? 0;
  const totalQuizzes = lessonsList.filter(
    (lesson) => lesson.quiz?.questions?.length > 0,
  ).length;
  const averageScore =
    typeof viewingStudent?.averageScore === "string" ||
    typeof viewingStudent?.averageScore === "number"
      ? viewingStudent.averageScore
      : "—";
  const viewingStudentName =
    (typeof viewingStudent?.name === "string" && viewingStudent.name) ||
    `${viewingStudent?.first_name || ""} ${viewingStudent?.last_name || ""}`.trim() ||
    "\u0627\u0644\u0637\u0627\u0644\u0628";

  return (
    <div
      className="container"
      style={{ paddingTop: "1.5rem", paddingBottom: "3rem" }}
    >
      {deactivationTarget && (
        <>
        <style>{`
          @keyframes deactivateBackdropIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes deactivateDialogIn {
            from { opacity: 0; transform: translateY(10px) scale(0.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          .deactivation-backdrop { animation: deactivateBackdropIn 180ms ease-out both; }
          .deactivation-dialog { animation: deactivateDialogIn 220ms cubic-bezier(0.2, 0.8, 0.2, 1) both; }
          .deactivation-dialog button { transition: transform 160ms ease, filter 160ms ease, border-color 160ms ease, box-shadow 160ms ease; }
          .deactivation-dialog button:not(:disabled):hover { transform: translateY(-2px); filter: brightness(1.12); box-shadow: 0 6px 18px rgba(0,0,0,0.2); }
          .deactivation-dialog button:not(:disabled):active { transform: translateY(0) scale(0.98); }
          @media (prefers-reduced-motion: reduce) {
            .deactivation-backdrop, .deactivation-dialog { animation: none; }
            .deactivation-dialog button { transition: none; }
          }
        `}</style>
        <div
          className="deactivation-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !isProcessingAction
            ) {
              setDeactivationTarget(null);
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 3000,
            display: "grid",
            placeItems: "center",
            padding: "1rem",
            background: "rgba(3, 7, 18, 0.78)",
            backdropFilter: "blur(6px)",
          }}
        >
          <section
            className="deactivation-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="deactivation-dialog-title"
            style={{
              width: "min(100%, 440px)",
              padding: "1.5rem",
              borderRadius: "18px",
              border: "1px solid rgba(244, 63, 94, 0.3)",
              background: "linear-gradient(145deg, #111827, #080d18)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
              direction: "rtl",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "14px",
                marginBottom: "1.25rem",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 44,
                  height: 44,
                  flexShrink: 0,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: "14px",
                  color: "#fb7185",
                  background: "rgba(244, 63, 94, 0.12)",
                }}
              >
                <AlertTriangle size={22} />
              </span>
              <div style={{ flex: 1 }}>
                <h2
                  id="deactivation-dialog-title"
                  style={{ margin: "2px 0 8px", color: "#fff", fontSize: "1.15rem" }}
                >
                  تأكيد تعطيل الاشتراك
                </h2>
                <p
                  style={{
                    margin: 0,
                    color: "var(--text-muted)",
                    lineHeight: 1.8,
                    fontSize: "0.9rem",
                  }}
                >
                  هل تريد تعطيل اشتراك {deactivationTarget.studentName}؟ سيؤدي
                  ذلك إلى منع استخدام الاشتراك.
                </p>
              </div>
              <button
                type="button"
                aria-label="إغلاق"
                disabled={isProcessingAction}
                onClick={() => setDeactivationTarget(null)}
                className="btn-secondary"
                style={{ padding: "6px", minWidth: 32 }}
              >
                <X size={16} />
              </button>
            </div>

            {deactivationTarget.subscriptionCode && (
              <div
                style={{
                  marginBottom: "1.25rem",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.03)",
                  color: "var(--text-muted)",
                  fontSize: "0.82rem",
                }}
              >
                كود الاشتراك: <strong style={{ color: "#fff" }}>{deactivationTarget.subscriptionCode}</strong>
              </div>
            )}

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                disabled={isProcessingAction}
                onClick={() => setDeactivationTarget(null)}
                className="btn-secondary"
                style={{ flex: 1, justifyContent: "center", padding: "10px" }}
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isProcessingAction}
                onClick={confirmDeactivation}
                className="btn-secondary"
                style={{
                  flex: 1,
                  justifyContent: "center",
                  padding: "10px",
                  color: "#fff",
                  background: "linear-gradient(135deg, #e11d48, #be123c)",
                  borderColor: "rgba(251, 113, 133, 0.45)",
                  opacity: isProcessingAction ? 0.7 : 1,
                }}
              >
                {isProcessingAction ? "جارٍ التعطيل..." : "تأكيد التعطيل"}
              </button>
            </div>
          </section>
        </div>
        </>
      )}
      {deleteConfirmationStudent && (
        <>
          <style>{`
            @keyframes deactivateBackdropIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes deactivateDialogIn { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
            .student-delete-dialog { animation: deactivateDialogIn 220ms cubic-bezier(0.2, 0.8, 0.2, 1) both; }
            .student-delete-dialog button { transition: transform 160ms ease, filter 160ms ease, box-shadow 160ms ease; }
            .student-delete-dialog button:not(:disabled):hover { transform: translateY(-2px); filter: brightness(1.12); box-shadow: 0 6px 18px rgba(0,0,0,0.2); }
            .student-delete-dialog button:not(:disabled):active { transform: translateY(0) scale(0.98); }
            @media (prefers-reduced-motion: reduce) { .student-delete-dialog, .student-delete-dialog button { animation: none; transition: none; } }
          `}</style>
          <div
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setDeleteConfirmationStudent(null);
              }
            }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 3001,
              display: "grid",
              placeItems: "center",
              padding: "1rem",
              background: "rgba(3, 7, 18, 0.78)",
              backdropFilter: "blur(6px)",
              animation: "deactivateBackdropIn 180ms ease-out both",
            }}
          >
            <section
              className="student-delete-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="student-delete-dialog-title"
              style={{
                width: "min(100%, 440px)",
                padding: "1.5rem",
                borderRadius: "18px",
                border: "1px solid rgba(244, 63, 94, 0.3)",
                background: "linear-gradient(145deg, #111827, #080d18)",
                boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
                direction: "rtl",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span
                  aria-hidden="true"
                  style={{
                    width: 44,
                    height: 44,
                    flexShrink: 0,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: 14,
                    color: "#fb7185",
                    background: "rgba(244, 63, 94, 0.12)",
                  }}
                >
                  <Trash2 size={21} />
                </span>
                <div>
                  <h2
                    id="student-delete-dialog-title"
                    style={{ margin: "0 0 6px", color: "#fff", fontSize: "1.1rem" }}
                  >
                    تأكيد إزالة الطالب
                  </h2>
                  <strong style={{ color: "#e2e8f0", fontSize: "0.9rem" }}>
                    {`${deleteConfirmationStudent.first_name || ""} ${deleteConfirmationStudent.last_name || ""}`.trim() || deleteConfirmationStudent.name || "الطالب"}
                  </strong>
                </div>
              </div>
              <p
                style={{
                  margin: "1rem 0 1.25rem",
                  color: "var(--text-muted)",
                  lineHeight: 1.8,
                  fontSize: "0.88rem",
                }}
              >
                سيتم إزالة الطالب من قائمة السجل المحلي فقط. لن يُحذف من قاعدة
                البيانات لأن endpoint الحذف غير متاح حاليًا.
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmationStudent(null)}
                  className="btn-secondary"
                  style={{ flex: 1, justifyContent: "center", padding: 10 }}
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteStudentRecord}
                  className="btn-secondary"
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    padding: 10,
                    color: "#fff",
                    background: "linear-gradient(135deg, #e11d48, #be123c)",
                    borderColor: "rgba(251, 113, 133, 0.45)",
                  }}
                >
                  إزالة من السجل
                </button>
              </div>
            </section>
          </div>
        </>
      )}

      {/* Top Header */}
      <div className="section-header" style={{ marginBottom: "1.5rem" }}>
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
            <ShieldCheck size={16} />
            <span>لوحة الإدارة والتحكم الشاملة بالمنصة • API v1</span>
          </div>
          <h1 className="section-title">لوحة تحكم مستر / محمد عبد الخالق 👨‍🏫</h1>
          <p className="section-desc">
            إدارة طلبات التفعيل، أكواد الاشتراكات، المحاضرات، بنك الأسئلة،
            ومذكرات العميد PDF
          </p>
        </div>

        {/* Action Controls */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => {
              fetchPendingRequests();
              fetchApprovedStudents();
              showToast("تم تحديث البيانات من السيرفر بنجاح 🔄");
            }}
            className="btn-secondary"
            style={{ fontSize: "0.8rem", padding: "8px 14px" }}
            title="مزامنة وتحديث البيانات من الباك إند"
          >
            <RefreshCw size={14} />
            <span>تحديث البيانات</span>
          </button>

          {activeTab === "lessons" && (
            <button
              onClick={() => setIsAddLessonOpen(true)}
              className="btn-primary"
              style={{ fontSize: "0.85rem" }}
            >
              <Plus size={16} />
              <span>{"\u0625\u0636\u0627\u0641\u0629 \u0645\u062d\u0627\u0636\u0631\u0629 \u062c\u062f\u064a\u062f\u0629"}</span>
            </button>
          )}
          {activeTab === "quizzes" && (
            <button
              onClick={() => {
                if (lessonsList.length === 0) {
                  showToast("يُرجى إضافة محاضرة أولًا لربط الامتحان بها.", "error");
                  return;
                }
                setEditingExam(null);
                setNewExamData({
                  lesson_id: lessonsList[0].id,
                  title: "",
                  description: "",
                  duration_minutes: 20,
                  passing_percentage: 60,
                });
                setIsAddExamOpen(true);
              }}
              className="btn-primary"
              style={{ fontSize: "0.85rem" }}
            >
              <Plus size={16} />
              <span>إنشاء امتحان وربطه بمحاضرة</span>
            </button>
          )}
          {activeTab === "memos" && (
            <button
              onClick={() => setIsAddMemoOpen(true)}
              className="btn-primary"
              style={{ fontSize: "0.85rem" }}
            >
              <Plus size={16} />
              <span>رفع مذكرة PDF</span>
            </button>
          )}
          {(activeTab === "students" || activeTab === "approved") && (
            <button
              onClick={() => setIsAddStudentOpen(true)}
              className="btn-primary"
              style={{ fontSize: "0.85rem" }}
            >
              <UserPlus size={16} />
              <span>إنشاء كود طالب يدوياً</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div
        style={{
          display: "flex",
          gap: "0.6rem",
          flexWrap: "wrap",
          overflowX: "visible",
          paddingBottom: 0,
          marginBottom: "1.5rem",
        }}
      >
        {/* TAB 1: PENDING ACTIVATION REQUESTS (Backend API) */}
        <button
          onClick={() => setActiveTab("requests")}
          className={`tab-btn ${activeTab === "requests" ? "active" : ""}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 16px",
            fontSize: "0.85rem",
            position: "relative",
          }}
        >
          <Clock size={16} style={{ color: "var(--amber)" }} />
          <span>طلبات التفعيل المعلقة</span>
          {pendingRequests.length > 0 && (
            <span
              style={{
                background: "#f59e0b",
                color: "#000",
                fontWeight: 900,
                borderRadius: "20px",
                padding: "1px 8px",
                fontSize: "0.72rem",
              }}
            >
              {pendingRequests.length}
            </span>
          )}
        </button>

        {/* TAB 2: APPROVED SUBSCRIPTIONS & CODES (Backend API) */}
        <button
          onClick={() => setActiveTab("approved")}
          className={`tab-btn ${activeTab === "approved" ? "active" : ""}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 16px",
            fontSize: "0.85rem",
          }}
        >
          <Key size={16} style={{ color: "var(--cyan)" }} />
          <span>
            الاشتراكات المعتمدة والأكواد ({approvedSubscriptions.length})
          </span>
        </button>

        {/* TAB 3: ALL STUDENTS ROSTER */}
        <button
          onClick={() => {
            setActiveTab("students");
            fetchAdminStudents(1);
          }}
          className={`tab-btn ${activeTab === "students" ? "active" : ""}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 16px",
            fontSize: "0.85rem",
          }}
        >
          <Users size={16} />
          <span>
            سجل الطلاب ({studentsPagination?.total || baseStudentsList.length})
          </span>
        </button>

        {/* TAB 4: LESSONS */}
        <button
          onClick={() => {
            setActiveTab("lessons");
            fetchLessons();
          }}
          className={`tab-btn ${activeTab === "lessons" ? "active" : ""}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 16px",
            fontSize: "0.85rem",
          }}
        >
          <Video size={16} />
          <span>المحاضرات ({lessonsList.length})</span>
        </button>

        {/* TAB 5: QUIZZES / EXAMS */}
        <button
          onClick={() => {
            setActiveTab("quizzes");
            fetchAdminExams();
          }}
          className={`tab-btn ${activeTab === "quizzes" ? "active" : ""}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 16px",
            fontSize: "0.85rem",
          }}
        >
          <FileQuestion size={16} />
          <span>الاختبارات والأسئلة ({adminExamsList.length || 0})</span>
        </button>

        {/* TAB 6: SUBSCRIPTION CODES (GET /api/v1/admin/subscription-codes) */}
        <button
          onClick={() => {
            setActiveTab("codes");
            fetchSubscriptionCodes(selectedCodesGrade);
          }}
          className={`tab-btn ${activeTab === "codes" ? "active" : ""}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 16px",
            fontSize: "0.85rem",
          }}
        >
          <Key size={16} style={{ color: "var(--amber)" }} />
          <span>أكواد الاشتراكات حسب الصف</span>
        </button>

        {/* TAB 7: MEMOS */}
        <button
          onClick={() => setActiveTab("memos")}
          className={`tab-btn ${activeTab === "memos" ? "active" : ""}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 16px",
            fontSize: "0.85rem",
          }}
        >
          <BookOpen size={16} />
          <span>مذكرات PDF ({memosList.length})</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: PENDING ACTIVATION REQUESTS (GET /api/v1/admin/activation-requests) */}
      {/* ==================================================================== */}
      {activeTab === "requests" && (
        <div>
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
              <h3
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 800,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >{"\u0637\u0644\u0628\u0627\u062a \u0627\u0644\u0637\u0644\u0627\u0628 \u0627\u0644\u062c\u062f\u064a\u062f\u0629 \u0628\u0627\u0646\u062a\u0638\u0627\u0631 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0648\u0627\u0644\u062a\u0641\u0639\u064a\u0644"}</h3>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "var(--text-muted)",
                  marginTop: "3px",
                }}
              >
                بمجرد النقر على "قبول وتفعيل الكود"، سيتم اعتماد الطالب وتوليد
                كود اشتراك رسمي له للولوج للمنصة
              </p>
            </div>
          </div>

          {isLoadingRequests ? (
            <div
              style={{
                padding: "3rem",
                textAlign: "center",
                color: "var(--text-muted)",
              }}
            >
              جاري تحميل طلبات التفعيل من السيرفر...
            </div>
          ) : pendingRequests.length === 0 ? (
            <div
              className="form-card"
              style={{
                maxWidth: "100%",
                textAlign: "center",
                padding: "3.5rem 1rem",
                background: "#090e1a",
              }}
            >
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "rgba(16, 185, 129, 0.12)",
                  color: "var(--emerald)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px",
                }}
              >
                <CheckCircle2 size={32} />
              </div>
              <h4
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 800,
                  color: "#fff",
                  marginBottom: "6px",
                }}
              >
                لا توجد طلبات تفعيل معلقة حالياً
              </h4>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                جميع طلبات اشتراك الطلاب تم البت فيها والموافقة عليها بنجاح.
              </p>
            </div>
          ) : (
            <div
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-lg)",
                overflowX: "auto",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "right",
                  fontSize: "0.85rem",
                }}
              >

                <thead>
                  <tr
                    style={{
                      background: "#090e1a",
                      borderBottom: "1px solid var(--border-subtle)",
                      color: "var(--text-muted)",
                    }}
                  >
                    <th style={{ padding: "14px 16px" }}>اسم الطالب</th>
                    <th style={{ padding: "14px 16px" }}>الصف الدراسي</th>
                    <th style={{ padding: "14px 16px" }}>هاتف الطالب</th>
                    <th style={{ padding: "14px 16px" }}>هاتف ولي الأمر</th>
                    <th style={{ padding: "14px 16px" }}>تاريخ التقديم</th>
                    <th style={{ padding: "14px 16px", textAlign: "center" }}>
                      قرار المعلم
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRequests.map((req) => {
                    const studentObj = req.student || req.user || req;
                    const firstName =
                      req.first_name || studentObj.first_name || "";
                    const lastName =
                      req.last_name || studentObj.last_name || "";
                    const studentFullName =
                      `${firstName} ${lastName}`.trim() ||
                      req.name ||
                      studentObj.name ||
                      "طالب جديد";

                    const gradeId =
                      req.grade_id ||
                      studentObj.grade_id ||
                      req.grade?.id ||
                      studentObj.grade?.id ||
                      1;

                    const gradeTitle =
                      req.grade?.name ||
                      studentObj.grade?.name ||
                      req.grade_name ||
                      studentObj.grade_name ||
                      getGradeNameById(gradeId);

                    const studentPhone =
                      req.phone || studentObj.phone || "—";
                    const parentPhone =
                      req.parent_phone ||
                      req.parentPhone ||
                      studentObj.parent_phone ||
                      studentObj.parentPhone ||
                      "—";

                    return (
                      <tr
                        key={req.id}
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.05)",
                        }}
                      >
                        <td style={{ padding: "14px 16px" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <div
                              style={{
                                width: "34px",
                                height: "34px",
                                borderRadius: "10px",
                                background:
                                  "linear-gradient(135deg, #f59e0b, #d97706)",
                                color: "#fff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 900,
                              }}
                            >
                              {studentFullName.charAt(0)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, color: "#fff" }}>
                                {studentFullName}
                              </div>
                              <span
                                style={{
                                  fontSize: "0.68rem",
                                  color: "#f59e0b",
                                }}
                              >
                                طلب قيد المراجعة
                              </span>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <span className="badge-tag">{gradeTitle}</span>
                        </td>
                        <td
                          style={{
                            padding: "14px 16px",
                            direction: "ltr",
                            textAlign: "right",
                            color: "var(--text-main)",
                            fontFamily: "monospace",
                            fontSize: "0.85rem",
                          }}
                        >
                          {studentPhone}
                        </td>
                        <td
                          style={{
                            padding: "14px 16px",
                            direction: "ltr",
                            textAlign: "right",
                            color: "var(--text-muted)",
                            fontFamily: "monospace",
                            fontSize: "0.85rem",
                          }}
                        >
                          {parentPhone}
                        </td>
                        <td
                          style={{
                            padding: "14px 16px",
                            color: "var(--text-muted)",
                            fontSize: "0.78rem",
                          }}
                        >
                          {req.created_at
                            ? new Date(req.created_at).toLocaleDateString(
                                "ar-EG",
                              )
                            : "اليوم"}
                        </td>
                        <td
                          style={{ padding: "14px 16px", textAlign: "center" }}
                        >
                          <div
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              flexWrap: "wrap",
                              justifyContent: "center",
                            }}
                          >
                            <button
                              onClick={() =>
                                handleApproveRequest(
                                  req.subscription_id ||
                                    req.id ||
                                    req.subscription?.id,
                                )
                              }
                              disabled={isProcessingAction}
                              className="btn-primary"
                              style={{
                                padding: "7px 12px",
                                fontSize: "0.78rem",
                                background:
                                  "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                boxShadow: "0 0 12px rgba(16, 185, 129, 0.3)",
                              }}
                              title="قبول طلب التفعيل وتوليد كود الاشتراك"
                            >
                              <Check size={14} />
                              <span>قبول</span>
                            </button>
                            <button
                              onClick={() =>
                                handleRejectRequest(
                                  req.subscription_id ||
                                    req.id ||
                                    req.subscription?.id,
                                )
                              }
                              disabled={isProcessingAction}
                              className="btn-secondary"
                              style={{
                                padding: "7px 12px",
                                fontSize: "0.78rem",
                                color: "#fda4af",
                                borderColor: "rgba(244,63,94,0.4)",
                              }}
                              title="إلغاء / رفض طلب التفعيل"
                            >
                              <XCircle size={14} />
                              <span>إلغاء / رفض</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: APPROVED STUDENTS & CODES (GET /api/v1/admin/approved-students) */}
      {/* ==================================================================== */}
      {activeTab === "approved" && (
        <div>
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
              <h3
                style={{ fontSize: "1.1rem", fontWeight: 800, color: "#fff" }}
              >
                قائمة الطلاب المعتمدين وأكواد الاشتراك الفعالة
              </h3>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "var(--text-muted)",
                  marginTop: "3px",
                }}
              >
                يمكنك نسخ كود الاشتراك للطالب أو تعطيل الاشتراك عند الحاجة لمنعه
                من تسجيل الدخول
              </p>
            </div>

            <div style={{ position: "relative", width: "280px" }}>
              <input
                type="text"
                placeholder="بحث بالاسم أو الكود أو الهاتف..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                style={{
                  paddingLeft: "1rem",
                  paddingRight: "2.5rem",
                  fontSize: "0.85rem",
                }}
              />
              <Search
                size={15}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-dim)",
                }}
              />
            </div>
          </div>

          {isLoadingApproved ? (
            <div
              style={{
                padding: "3rem",
                textAlign: "center",
                color: "var(--text-muted)",
              }}
            >
              جاري تحميل الاشتراكات المعتمدة...
            </div>
          ) : filteredApproved.length === 0 ? (
            <div
              className="form-card"
              style={{
                maxWidth: "100%",
                textAlign: "center",
                padding: "3.5rem 1rem",
              }}
            >
              <p style={{ color: "var(--text-muted)" }}>
                لا توجد اشتراكات مطابقة لبحثك
              </p>
            </div>
          ) : (
            <div
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-lg)",
                overflowX: "auto",
              }}
            >
              <table
                style={{
                  width: "100%",
                  minWidth: "1000px",
                  tableLayout: "fixed",
                  borderCollapse: "collapse",
                  textAlign: "right",
                  fontSize: "0.85rem",
                }}
              >
                <colgroup>
                  <col style={{ width: "13%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "17%" }} />
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "11%" }} />
                  <col style={{ width: "18%" }} />
                </colgroup>
                <thead>
                  <tr
                    style={{
                      background: "#090e1a",
                      borderBottom: "1px solid var(--border-subtle)",
                      color: "var(--text-muted)",
                    }}
                  >
                    <th style={{ padding: "14px 12px", whiteSpace: "nowrap" }}>{"\u0627\u0633\u0645 \u0627\u0644\u0637\u0627\u0644\u0628"}</th>
                    <th style={{ padding: "14px 12px", whiteSpace: "nowrap" }}>{"\u0627\u0644\u0635\u0641"}</th>
                    <th style={{ padding: "14px 12px", whiteSpace: "nowrap" }}>{"\u0643\u0648\u062f \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643"}</th>
                    <th style={{ padding: "14px 12px", whiteSpace: "nowrap" }}>{"\u062d\u0627\u0644\u0629 \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643"}</th>
                    <th style={{ padding: "14px 12px", whiteSpace: "nowrap" }}>{"\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u0627\u0646\u062a\u0647\u0627\u0621"}</th>
                    <th style={{ padding: "14px 12px", whiteSpace: "nowrap" }}>{"\u0627\u0644\u0647\u0627\u062a\u0641"}</th>
                    <th style={{ padding: "14px 10px", textAlign: "center", whiteSpace: "nowrap" }}>{"\u0627\u0644\u0625\u062c\u0631\u0627\u0621\u0627\u062a"}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApproved.map((item) => {
                    const studentObj = item.student || item.user || item;
                    const subObj =
                      item.subscription ||
                      item.active_subscription ||
                      item.subscriptions?.[0] ||
                      item;

                    const firstName =
                      item.first_name || studentObj.first_name || "";
                    const lastName =
                      item.last_name || studentObj.last_name || "";
                    const studentName =
                      `${firstName} ${lastName}`.trim() ||
                      item.name ||
                      studentObj.name ||
                      "طالب معتمد";

                    const gradeId =
                      item.grade_id ||
                      studentObj.grade_id ||
                      item.grade?.id ||
                      studentObj.grade?.id ||
                      1;
                    const gradeName = getArabicGradeName(
                      item.grade || studentObj.grade,
                      gradeId,
                    );

                    const subscriptionCode =
                      getSubscriptionCode(
                        subObj.subscription_code,
                        item.subscription_code,
                        studentObj.subscription_code,
                        subObj,
                        item.code,
                        studentObj.code,
                      ) ||
                      "—";

                    // Any student returned by approved-students is approved/active unless explicitly inactive
                    const statusVal =
                      getSubscriptionStatus(subObj, item, studentObj) ||
                      "active";
                    const isDeactivated =
                      isDeactivatedStatus(statusVal) ||
                      subObj.is_active === false ||
                      item.is_active === false;
                    const isActive = !isDeactivated;

                    const expiryDate =
                      subObj.code_expires_at ||
                      subObj.end_date ||
                      subObj.expires_at ||
                      item.code_expires_at ||
                      item.end_date ||
                      "مستمر حتى نهاية العام";

                    const phone =
                      studentObj.phone || item.phone || "—";

                    return (
                      <tr
                        key={item.id}
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.05)",
                          verticalAlign: "middle",
                        }}
                      >
                        <td style={{ padding: "16px 12px" }}>
                          <div
                            title={studentName}
                            style={{
                              fontWeight: 800,
                              color: "#fff",
                              lineHeight: 1.5,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {studentName}
                          </div>
                        </td>
                        <td style={{ padding: "16px 12px", textAlign: "center" }}>
                          <span className="badge-tag" style={{ whiteSpace: "nowrap" }}>{gradeName}</span>
                        </td>
                        <td style={{ padding: "16px 12px", textAlign: "center" }}>
                          <div
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "8px",
                              background: "#050914",
                              border: "1px solid rgba(6, 182, 212, 0.3)",
                              padding: "4px 10px",
                              borderRadius: "8px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <span
                              style={{
                                fontFamily: "monospace",
                                fontWeight: 900,
                                color: "var(--cyan)",
                                fontSize: "0.9rem",
                                letterSpacing: "1px",
                              }}
                            >
                              {subscriptionCode}
                            </span>
                            {subscriptionCode !== "—" && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleCopyCode(subscriptionCode)
                                }
                                style={{
                                  background: "none",
                                  border: "none",
                                  color:
                                    copiedCode === subscriptionCode
                                      ? "var(--emerald)"
                                      : "var(--text-muted)",
                                  cursor: "pointer",
                                  padding: "2px",
                                }}
                                title="نسخ الكود"
                              >
                                {copiedCode === subscriptionCode ? (
                                  <Check size={14} />
                                ) : (
                                  <Copy size={14} />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: "16px 12px", textAlign: "center" }}>
                          <span
                            style={{
                              fontSize: "0.72rem",
                              fontWeight: 800,
                              padding: "3px 8px",
                              borderRadius: "6px",
                              background: isActive
                                ? "rgba(16, 185, 129, 0.15)"
                                : "rgba(244, 63, 94, 0.15)",
                              color: isActive ? "var(--emerald)" : "#fda4af",
                              border: `1px solid ${isActive ? "rgba(16, 185, 129, 0.3)" : "rgba(244, 63, 94, 0.3)"}`,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {isActive ? "نشط ومعتمد" : "معطل / ملغي"}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "16px 12px",
                            color: "var(--text-muted)",
                            fontSize: "0.8rem",
                            textAlign: "center",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {expiryDate}
                        </td>
                        <td
                          style={{
                            padding: "16px 12px",
                            direction: "ltr",
                            textAlign: "right",
                            color: "var(--text-muted)",
                            fontFamily: "monospace",
                            fontSize: "0.85rem",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {phone}
                        </td>
                        <td
                          style={{ padding: "14px 10px", textAlign: "center" }}
                        >
                          <div
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "8px",
                              justifyContent: "center",
                              flexWrap: "nowrap",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {isActive ? (
                              <>
                                <button
                                  onClick={() =>
                                    setDeactivationTarget({
                                      type: "subscription",
                                      subscriptionId:
                                        item.subscription_id ||
                                        subObj.subscription_id ||
                                        (subObj !== item ? subObj.id : null) ||
                                        item.subscription_code?.id ||
                                        item.active_subscription?.id ||
                                        item.subscriptions?.[0]?.id ||
                                        item.id,
                                      studentName,
                                      subscriptionCode:
                                        subscriptionCode === "—"
                                          ? ""
                                          : subscriptionCode,
                                    })
                                  }
                                  disabled={isProcessingAction}
                                  className="btn-secondary"
                                  style={{
                                    padding: "5px 10px",
                                    fontSize: "0.75rem",
                                    color: "var(--rose)",
                                  }}
                                  title="تعطيل الاشتراك ومنعه من الدخول"
                                >
                                  <PowerOff size={13} />
                                  <span>تعطيل</span>
                                </button>
                                {hasActiveTrustedDevice(item, studentObj, subObj) && (
                                  <button
                                    onClick={() =>
                                      handleResetDevice(
                                        item.subscription_id ||
                                          subObj.subscription_id ||
                                          (subObj !== item ? subObj.id : null) ||
                                          item.subscription_code?.id ||
                                          item.active_subscription?.id ||
                                          item.subscriptions?.[0]?.id ||
                                          item.id,
                                      )
                                    }
                                  disabled={isProcessingAction}
                                  className="btn-secondary"
                                  style={{
                                    padding: "5px 10px",
                                    fontSize: "0.75rem",
                                    color: "var(--amber)",
                                    borderColor: "rgba(245, 158, 11, 0.3)",
                                  }}
                                  title="إعادة ضبط الجهاز الموثوق ليتمكن الطالب من التسجيل بجهاز جديد"
                                >
                                  <RotateCcw size={13} />
                                  <span>ضبط الجهاز</span>
                                  </button>
                                )}
                              </>
                            ) : (
                              <span className="badge-tag">غير نشط</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: ALL STUDENTS ROSTER (GET /api/v1/admin/students)               */}
      {/* ==================================================================== */}
      {activeTab === "students" && (
        <div>
          {/* Top Controls: Grade Filter & Search */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "1rem",
              marginBottom: "1.25rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  color: "var(--text-muted)",
                }}
              >
                الصف:
              </span>
              {["الكل", ...GRADES.map((g) => g.name)].map((g) => (
                <button
                  key={g}
                  onClick={() => setGradeFilter(g)}
                  className={`tab-btn ${gradeFilter === g ? "active" : ""}`}
                  style={{
                    fontSize: "0.75rem",
                    padding: "5px 14px",
                    borderRadius: "999px",
                  }}
                >
                  {g}
                </button>
              ))}
            </div>

            <div style={{ position: "relative", width: "280px" }}>
              <input
                type="text"
                placeholder="بحث بالاسم أو الهاتف أو الكود..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                style={{
                  paddingLeft: "1rem",
                  paddingRight: "2.5rem",
                  fontSize: "0.85rem",
                }}
              />
              <Search
                size={15}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-dim)",
                }}
              />
            </div>
          </div>

          {/* Table Container */}
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "16px",
              overflow: "hidden",
              boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
            }}
          >
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "right",
                  fontSize: "0.85rem",
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "#090e1a",
                      borderBottom: "1px solid rgba(255,255,255,0.08)",
                      color: "var(--text-muted)",
                    }}
                  >
                    <th
                      style={{
                        padding: "14px 16px",
                        width: "50px",
                        textAlign: "center",
                      }}
                    >
                      #
                    </th>
                    <th style={{ padding: "14px 16px" }}>اسم الطالب</th>
                    <th style={{ padding: "14px 16px" }}>الصف الدراسي</th>
                    <th style={{ padding: "14px 16px" }}>هاتف الطالب</th>
                    <th style={{ padding: "14px 16px" }}>هاتف ولي الأمر</th>
                    <th style={{ padding: "14px 16px" }}>كود الدخول</th>
                    <th style={{ padding: "14px 16px", textAlign: "center" }}>
                      الحالة
                    </th>
                    <th
                      style={{
                        padding: "14px 16px",
                        textAlign: "center",
                        minWidth: "220px",
                      }}
                    >
                      الإجراءات
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingStudents ? (
                    <tr>
                      <td
                        colSpan={8}
                        style={{
                          padding: "3.5rem 1rem",
                          textAlign: "center",
                          color: "var(--text-muted)",
                        }}
                      >
                        جاري تحميل الطلاب من الخادم...
                      </td>
                    </tr>
                  ) : filteredStudents.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        style={{
                          padding: "3.5rem 1rem",
                          textAlign: "center",
                          color: "var(--text-muted)",
                        }}
                      >
                        لا يوجد طلاب يطابقون خيارات البحث أو التصفية الحالية
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((std, index) => {
                      const studentSubscription = approvedSubscriptions.find(
                        (item) => {
                          const itemStudentId =
                            item.student?.id ||
                            item.user?.id ||
                            item.student_id ||
                            item.user_id;
                          return (
                            (itemStudentId != null &&
                              String(itemStudentId) ===
                                String(std.student_id || std.id)) ||
                            String(
                              item.subscription_id ||
                                item.subscription?.id ||
                                item.active_subscription?.id ||
                                item.subscriptions?.[0]?.id ||
                                          item.subscription_code?.id ||
                                "",
                            ) ===
                              String(
                                std.subscription_id ||
                                  std.subscription?.id ||
                                  std.active_subscription?.id ||
                                            std.subscription_code?.id ||
                                  "__no_subscription_id__",
                              )
                          );
                        },
                      );
                      const subscriptionStatus = getSubscriptionStatus(
                        studentSubscription,
                        std,
                      );
                      const isStudentActive = subscriptionStatus
                        ? !isDeactivatedStatus(subscriptionStatus)
                        : std.isActive !== false;
                      return (
                        <tr
                          key={std.id}
                          style={{
                            borderBottom: "1px solid rgba(255,255,255,0.04)",
                            transition: "background 0.15s ease",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background =
                              "rgba(255,255,255,0.02)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "transparent")
                          }
                        >
                          {/* Index */}
                          <td
                            style={{
                              padding: "14px 16px",
                              textAlign: "center",
                              color: "var(--text-dim)",
                              fontWeight: 600,
                              fontSize: "0.8rem",
                            }}
                          >
                            {index + 1}
                          </td>

                          {/* Student Name & Avatar */}
                          <td style={{ padding: "14px 16px" }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                              }}
                            >
                              <div
                                style={{
                                  width: "34px",
                                  height: "34px",
                                  borderRadius: "10px",
                                  background: isStudentActive
                                    ? "linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)"
                                    : "rgba(255,255,255,0.1)",
                                  color: "#fff",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontWeight: 800,
                                  fontSize: "0.82rem",
                                  flexShrink: 0,
                                }}
                              >
                                {(
                                  std.first_name ||
                                  std.name ||
                                  "ط"
                                )
                                  .trim()
                                  .charAt(0)}
                              </div>
                              <div>
                                <div
                                  style={{
                                    fontWeight: 800,
                                    color: "#ffffff",
                                    fontSize: "0.88rem",
                                  }}
                                >
                                  {`${std.first_name || ""} ${std.last_name || ""}`.trim() ||
                                    std.name ||
                                    "طالب"}
                                </div>
                                {std.governorate && (
                                  <div
                                    style={{
                                      fontSize: "0.72rem",
                                      color: "var(--text-dim)",
                                      marginTop: "1px",
                                    }}
                                  >
                                    {std.governorate}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Grade (Safely rendered as string) */}
                          <td style={{ padding: "14px 16px" }}>
                            <span
                              className="badge-tag"
                              style={{ whiteSpace: "nowrap" }}
                            >
                              {getArabicGradeName(std.grade, std.grade_id)}
                            </span>
                          </td>

                          {/* Phone */}
                          <td style={{ padding: "14px 16px" }}>
                            <div
                              style={{
                                direction: "ltr",
                                textAlign: "right",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                color: "var(--text-main)",
                                fontFamily: "monospace",
                                fontSize: "0.85rem",
                              }}
                            >
                              <Phone
                                size={12}
                                style={{ color: "var(--text-dim)" }}
                              />
                              <span>{std.phone || "—"}</span>
                            </div>
                          </td>

                          {/* Parent Phone */}
                          <td style={{ padding: "14px 16px" }}>
                            <div
                              style={{
                                direction: "ltr",
                                textAlign: "right",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                color: "var(--text-muted)",
                                fontFamily: "monospace",
                                fontSize: "0.85rem",
                              }}
                            >
                              <Phone
                                size={12}
                                style={{ color: "var(--text-dim)" }}
                              />
                              <span>
                                {std.parentPhone || std.parent_phone || "—"}
                              </span>
                            </div>
                          </td>

                          {/* Code with Copy Button */}
                          <td style={{ padding: "14px 16px" }}>
                            <div
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                              }}
                            >
                              <span
                                style={{
                                  fontFamily: "monospace",
                                  color: "var(--cyan)",
                                  fontWeight: 800,
                                  background: "rgba(6, 182, 212, 0.1)",
                                  padding: "3px 8px",
                                  borderRadius: "6px",
                                  border: "1px solid rgba(6, 182, 212, 0.25)",
                                  fontSize: "0.8rem",
                                  letterSpacing: "0.5px",
                                }}
                              >
                                {getSubscriptionCode(
                                  std.subscription_code,
                                  std.code,
                                  std.subscriptions?.[0],
                                  std.active_subscription,
                                ) ||
                                  "قيد الاعتماد"}
                              </span>
                              {getSubscriptionCode(
                                std.subscription_code,
                                std.code,
                                std.subscriptions?.[0],
                                std.active_subscription,
                              ) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopyCode(
                                      getSubscriptionCode(
                                        std.subscription_code,
                                        std.code,
                                        std.subscriptions?.[0],
                                        std.active_subscription,
                                      ),
                                    );
                                  }}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    color:
                                      copiedCode === std.code
                                        ? "var(--emerald)"
                                        : "var(--text-dim)",
                                    cursor: "pointer",
                                    padding: "3px",
                                    display: "flex",
                                  }}
                                  title="نسخ كود الطالب"
                                >
                                  {copiedCode === std.code ? (
                                    <Check size={13} />
                                  ) : (
                                    <Copy size={13} />
                                  )}
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Status Badge */}
                          <td
                            style={{
                              padding: "14px 16px",
                              textAlign: "center",
                            }}
                          >
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                padding: "3px 9px",
                                borderRadius: "999px",
                                background: isStudentActive
                                  ? "rgba(16, 185, 129, 0.15)"
                                  : "rgba(244, 63, 94, 0.15)",
                                color: isStudentActive
                                  ? "var(--emerald)"
                                  : "var(--rose)",
                                border: `1px solid ${isStudentActive ? "rgba(16, 185, 129, 0.3)" : "rgba(244, 63, 94, 0.3)"}`,
                              }}
                            >
                              <span
                                style={{
                                  width: "6px",
                                  height: "6px",
                                  borderRadius: "50%",
                                  background: isStudentActive
                                    ? "var(--emerald)"
                                    : "var(--rose)",
                                }}
                              ></span>
                              <span>{isStudentActive ? "مفعل" : "معطل"}</span>
                            </span>
                          </td>

                          {/* Action Buttons */}
                          <td
                            style={{
                              padding: "14px 16px",
                              textAlign: "center",
                            }}
                          >
                            <div
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                justifyContent: "center",
                              }}
                            >
                              {/* View Details */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenStudentDetails(std);
                                }}
                                className="btn-secondary"
                                style={{
                                  padding: "5px 10px",
                                  fontSize: "0.75rem",
                                }}
                                title="عرض التفاصيل الكاملة من السيرفر"
                              >
                                <Eye
                                  size={13}
                                  style={{ color: "var(--cyan)" }}
                                />
                                <span>تفاصيل</span>
                              </button>

                              {/* Edit */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingStudent(std);
                                }}
                                className="btn-secondary"
                                style={{
                                  padding: "5px 10px",
                                  fontSize: "0.75rem",
                                  color: "var(--amber)",
                                }}
                                title="تعديل"
                              >
                                <Edit3 size={13} />
                                <span>تعديل</span>
                              </button>

                              {/* Delete */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteStudentRecord(std);
                                }}
                                className="btn-secondary"
                                style={{
                                  padding: "5px 8px",
                                  fontSize: "0.75rem",
                                  color: "var(--rose)",
                                }}
                                title="حذف الطالب من السجل"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {studentsPagination.last_page > 1 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "1rem",
                marginTop: "1rem",
              }}
            >
              <button
                type="button"
                className="btn-secondary"
                disabled={
                  isLoadingStudents || studentsPagination.current_page <= 1
                }
                onClick={() =>
                  fetchAdminStudents(studentsPagination.current_page - 1)
                }
              >
                السابق
              </button>
              <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                صفحة {studentsPagination.current_page} من{" "}
                {studentsPagination.last_page}
              </span>
              <button
                type="button"
                className="btn-secondary"
                disabled={
                  isLoadingStudents ||
                  studentsPagination.current_page >=
                    studentsPagination.last_page
                }
                onClick={() =>
                  fetchAdminStudents(studentsPagination.current_page + 1)
                }
              >
                التالي
              </button>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 4: LESSONS & VIDEOS MANAGEMENT                                   */}
      {/* ==================================================================== */}
      {activeTab === "lessons" && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem",
              marginBottom: "1.25rem",
            }}
          >
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#fff" }}>{"\u0645\u0643\u062a\u0628\u0629 \u0627\u0644\u0645\u062d\u0627\u0636\u0631\u0627\u062a"}</h3>

          </div>

{isLoadingLessons && (
            <div
              role="status"
              style={{ color: "var(--text-muted)", marginBottom: "1rem" }}
            >
              جاري تحميل الدروس من الخادم...
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
              gap: "1rem",
              alignItems: "stretch",
            }}
          >
            {lessonsList.map((lesson) => (
              <div
                key={lesson.id}
                className="feature-card"
                style={{
                  width: "100%",
                  maxWidth: "560px",
                  padding: "1.25rem",
                  border: "1px solid rgba(148, 163, 184, 0.14)",
                  transition:
                    "transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.transform = "translateY(-3px)";
                  event.currentTarget.style.borderColor =
                    "rgba(6, 182, 212, 0.4)";
                  event.currentTarget.style.boxShadow =
                    "0 14px 32px rgba(0, 0, 0, 0.22)";
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.transform = "translateY(0)";
                  event.currentTarget.style.borderColor =
                    "rgba(148, 163, 184, 0.14)";
                  event.currentTarget.style.boxShadow = "none";
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "8px",
                      marginBottom: "12px",
                    }}
                  >
                    <span className="badge-tag">{lesson.grade}</span>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--cyan)",
                        fontWeight: 700,
                        maxWidth: "65%",
                        textAlign: "left",
                      }}
                    >
                      {lesson.branch}
                    </span>
                  </div>
                  <h4
                    style={{
                      fontSize: "1.05rem",
                      fontWeight: 800,
                      color: "#fff",
                      marginBottom: "8px",
                    }}
                  >
                    {lesson.title}
                  </h4>
                  <p
                    style={{
                      fontSize: "0.78rem",
                      color: "var(--text-muted)",
                      marginBottom: "16px",
                      lineHeight: 1.8,
                      minHeight: "2.8em",
                    }}
                  >
                    {lesson.description || "شرح متكامل وتمارين بنك الأسئلة"}
                  </p>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    paddingTop: "10px",
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      flex: 1,
                      flexWrap: "wrap",
                    }}
                  >
                    <a
                      href={`/watch/${lesson.id}`}
                      className="btn-secondary"
                      style={{
                        color: "var(--cyan)",
                        padding: "5px 10px",
                        fontSize: "0.75rem",
                        textDecoration: "none",
                      }}
                      title="معاينة مشغل الفيديو التفاعلي"
                    >
                      <Video size={13} />
                      <span>معاينة الفيديو</span>
                    </a>
                    <a
                      href={`/quiz/${lesson.id}`}
                      className="btn-secondary"
                      style={{
                        color: "var(--amber)",
                        padding: "5px 10px",
                        fontSize: "0.75rem",
                        textDecoration: "none",
                      }}
                      title="معاينة امتحان الدرس"
                    >
                      <FileQuestion size={13} />
                      <span>امتحان الدرس</span>
                    </a>
                  </div>

                  <button
                    onClick={() => deleteLesson(lesson.id)}
                    className="btn-secondary"
                    style={{
                      color: "var(--rose)",
                      padding: "5px 10px",
                      fontSize: "0.75rem",
                    }}
                  >
                    <Trash2 size={13} />
                    <span>حذف المحاضرة</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 5: ADMIN EXAMS & QUESTIONS (OpenAPI 3.0.0 Admin Exams)             */}
      {/* ==================================================================== */}
      {activeTab === "quizzes" && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem",
              marginBottom: "1.25rem",
            }}
          >
            <div>
              <h3
                style={{ fontSize: "1.1rem", fontWeight: 800, color: "#fff" }}
              >
                إدارة الاختبارات وبنك الأسئلة التفاعلي:
              </h3>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "var(--text-muted)",
                  marginTop: "4px",
                }}
              >
                إنشاء اختبارات مربوطة بالدروس، ضبط وقت ونسبة النجاح، وإدارة
                الأسئلة وخيارات الإجابة
              </p>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => fetchAdminExams()}
                className="btn-secondary"
                style={{ fontSize: "0.85rem" }}
                disabled={isLoadingExams}
              >
                <RefreshCw
                  size={15}
                  className={isLoadingExams ? "animate-spin" : ""}
                />
                <span>تحديث الاختبارات</span>
              </button>
              <button
                onClick={() => {
                  if (lessonsList.length === 0) {
                    showToast("يُرجى إضافة محاضرة أولًا لربط الامتحان بها.", "error");
                    return;
                  }
                  setEditingExam(null);
                  setNewExamData({
                    lesson_id: lessonsList[0].id,
                    title: "",
                    description: "",
                    duration_minutes: 20,
                    passing_percentage: 60,
                  });
                  setIsAddExamOpen(true);
                }}
                className="btn-primary"
                style={{ fontSize: "0.85rem" }}
              >
                <Plus size={16} />
                <span>إنشاء اختبار جديد</span>
              </button>
            </div>
          </div>

          {isLoadingExams ? (
            <div
              style={{
                textAlign: "center",
                padding: "3rem",
                color: "var(--cyan)",
              }}
            >
              <RefreshCw
                size={24}
                className="animate-spin"
                style={{ margin: "0 auto 8px" }}
              />
              <p>جاري تحميل الاختبارات...</p>
            </div>
          ) : adminExamsList.length === 0 ? (
            <div
              className="feature-card"
              style={{ padding: "3rem", textAlign: "center" }}
            >
              <FileQuestion
                size={48}
                style={{ color: "var(--text-muted)", margin: "0 auto 1rem" }}
              />
              <h4
                style={{ color: "#fff", fontSize: "1.1rem", fontWeight: 800 }}
              >
                لا توجد اختبارات مسجلة حالياً
              </h4>
              <p
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.85rem",
                  marginTop: "6px",
                }}
              >
                اضغط على "إنشاء اختبار جديد" لإضافة أول اختبار وتعيين أسئلته
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
              }}
            >
              {adminExamsList.map((exam) => {
                const isExpanded = expandedExamId === exam.id;
                const questions = exam.questions || [];
                const linkedLesson = lessonsList.find(
                  (lesson) => String(lesson.id) === String(exam.lesson_id),
                );

                return (
                  <div
                    key={exam.id}
                    className="feature-card"
                    style={{
                      padding: "1.25rem",
                      border: isExpanded ? "1px solid var(--cyan)" : undefined,
                      transition: "all 0.2s ease",
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
                        paddingBottom: isExpanded ? "12px" : "0",
                        borderBottom: isExpanded
                          ? "1px solid rgba(255,255,255,0.08)"
                          : "none",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            flexWrap: "wrap",
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
                            {exam.is_active !== false
                              ? "نشط ومتاح للطلاب"
                              : "معطل"}
                          </span>
                          <span
                            className="badge-tag"
                            style={{ color: "var(--cyan)" }}
                          >
                            {linkedLesson?.title || `الدرس #${exam.lesson_id}`}
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
                            نسبة النجاح: {exam.passing_percentage || 60}%
                          </span>
                        </div>

                        <h4
                          style={{
                            fontSize: "1.1rem",
                            fontWeight: 800,
                            color: "#fff",
                            marginTop: "8px",
                          }}
                        >
                          {exam.title}
                        </h4>
                        {exam.description && (
                          <p
                            style={{
                              fontSize: "0.85rem",
                              color: "var(--text-muted)",
                              marginTop: "4px",
                            }}
                          >
                            {exam.description}
                          </p>
                        )}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <button
                          onClick={() =>
                            setExpandedExamId(isExpanded ? null : exam.id)
                          }
                          className="btn-secondary"
                          style={{ fontSize: "0.8rem", padding: "6px 12px" }}
                        >
                          <FileQuestion size={14} />
                          <span>
                            {isExpanded
                              ? "إخفاء الأسئلة"
                              : `الأسئلة (${questions.length})`}
                          </span>
                        </button>
                        <button
                          onClick={() => {
                            setEditingExam(exam);
                            setNewExamData({
                              lesson_id: exam.lesson_id || 1,
                              title: exam.title || "",
                              description: exam.description || "",
                              duration_minutes: exam.duration_minutes || 20,
                              passing_percentage: exam.passing_percentage || 60,
                              is_active: exam.is_active !== false,
                            });
                            setIsAddExamOpen(true);
                          }}
                          className="btn-secondary"
                          style={{ fontSize: "0.8rem", padding: "6px 10px" }}
                          title="تعديل الاختبار"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={async () => {
                            if (
                              window.confirm(
                                `هل أنت متأكد من حذف اختبار "${exam.title}"؟`,
                              )
                            ) {
                              await deleteAdminExam(exam.id);
                            }
                          }}
                          className="btn-secondary"
                          style={{
                            fontSize: "0.8rem",
                            padding: "6px 10px",
                            color: "var(--rose)",
                          }}
                          title="حذف الاختبار"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Expanded Questions & Options Section */}
                    {isExpanded && (
                      <div style={{ marginTop: "1rem" }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "12px",
                          }}
                        >
                          <h5
                            style={{
                              fontSize: "0.95rem",
                              fontWeight: 700,
                              color: "var(--cyan)",
                            }}
                          >
                            أسئلة الاختبار ({questions.length} سؤال):
                          </h5>
                          <button
                            onClick={() =>
                              setQuestionModal({
                                isOpen: true,
                                isEdit: false,
                                examId: exam.id,
                                questionId: null,
                                question_text: "",
                                points: 1,
                              })
                            }
                            className="btn-primary"
                            style={{ fontSize: "0.75rem", padding: "5px 12px" }}
                          >
                            <Plus size={14} />
                            <span>إضافة سؤال جديد</span>
                          </button>
                        </div>

                        {questions.length === 0 ? (
                          <div
                            style={{
                              background: "#050914",
                              padding: "1.5rem",
                              borderRadius: "8px",
                              textAlign: "center",
                              color: "var(--text-muted)",
                              fontSize: "0.85rem",
                            }}
                          >
                            لا توجد أسئلة مضافة لهذا الاختبار حتى الآن. انقر
                            "إضافة سؤال جديد" لإضافة أسئلة وخياراتها.
                          </div>
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "12px",
                            }}
                          >
                            {questions.map((q, qIdx) => (
                              <div
                                key={q.id || qIdx}
                                style={{
                                  background: "#050914",
                                  border: "1px solid rgba(255,255,255,0.08)",
                                  borderRadius: "10px",
                                  padding: "12px 14px",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "flex-start",
                                    gap: "8px",
                                    marginBottom: "10px",
                                  }}
                                >
                                  <div>
                                    <span
                                      style={{
                                        display: "inline-block",
                                        background: "rgba(6, 182, 212, 0.15)",
                                        color: "var(--cyan)",
                                        fontWeight: 800,
                                        fontSize: "0.75rem",
                                        padding: "2px 8px",
                                        borderRadius: "4px",
                                        marginLeft: "8px",
                                      }}
                                    >
                                      سؤال {qIdx + 1} ({q.points || 1} نقطة)
                                    </span>
                                    <span
                                      style={{
                                        fontSize: "0.9rem",
                                        color: "#fff",
                                        fontWeight: 700,
                                      }}
                                    >
                                      {q.question_text || q.question}
                                    </span>
                                  </div>
                                  <div style={{ display: "flex", gap: "4px" }}>
                                    <button
                                      onClick={() =>
                                        setQuestionModal({
                                          isOpen: true,
                                          isEdit: true,
                                          examId: exam.id,
                                          questionId: q.id,
                                          question_text:
                                            q.question_text || q.question || "",
                                          points: q.points || 1,
                                        })
                                      }
                                      style={{
                                        background: "none",
                                        border: "none",
                                        color: "var(--cyan)",
                                        cursor: "pointer",
                                        padding: "4px",
                                      }}
                                      title="تعديل السؤال"
                                    >
                                      <Edit3 size={14} />
                                    </button>
                                    <button
                                      onClick={async () => {
                                        if (
                                          window.confirm(
                                            "هل تريد حذف هذا السؤال؟",
                                          )
                                        ) {
                                          await deleteAdminQuestion(q.id);
                                        }
                                      }}
                                      style={{
                                        background: "none",
                                        border: "none",
                                        color: "var(--rose)",
                                        cursor: "pointer",
                                        padding: "4px",
                                      }}
                                      title="حذف السؤال"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>

                                {/* Options List */}
                                <div style={{ marginRight: "1rem" }}>
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      marginBottom: "6px",
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: "0.75rem",
                                        color: "var(--text-muted)",
                                      }}
                                    >
                                      خيارات الإجابة:
                                    </span>
                                    <button
                                      onClick={() =>
                                        setOptionModal({
                                          isOpen: true,
                                          isEdit: false,
                                          questionId: q.id,
                                          optionId: null,
                                          option_text: "",
                                          is_correct: false,
                                        })
                                      }
                                      style={{
                                        background: "none",
                                        border: "none",
                                        color: "var(--amber)",
                                        cursor: "pointer",
                                        fontSize: "0.75rem",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                      }}
                                    >
                                      <Plus size={12} />
                                      <span>إضافة خيار</span>
                                    </button>
                                  </div>

                                  <div
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns:
                                        "repeat(auto-fill, minmax(220px, 1fr))",
                                      gap: "6px",
                                    }}
                                  >
                                    {(q.options || []).map((opt) => (
                                      <div
                                        key={opt.id}
                                        style={{
                                          background: opt.is_correct
                                            ? "rgba(16, 185, 129, 0.1)"
                                            : "rgba(255, 255, 255, 0.03)",
                                          border: `1px solid ${opt.is_correct ? "rgba(16, 185, 129, 0.3)" : "rgba(255, 255, 255, 0.05)"}`,
                                          borderRadius: "6px",
                                          padding: "6px 10px",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "space-between",
                                        }}
                                      >
                                        <div
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "6px",
                                            overflow: "hidden",
                                          }}
                                        >
                                          {opt.is_correct ? (
                                            <CheckCircle2
                                              size={13}
                                              style={{
                                                color: "var(--emerald)",
                                                flexShrink: 0,
                                              }}
                                            />
                                          ) : (
                                            <span
                                              style={{
                                                width: "6px",
                                                height: "6px",
                                                borderRadius: "50%",
                                                background: "var(--text-muted)",
                                                flexShrink: 0,
                                              }}
                                            />
                                          )}
                                          <span
                                            style={{
                                              fontSize: "0.8rem",
                                              color: opt.is_correct
                                                ? "var(--emerald)"
                                                : "#cbd5e1",
                                              overflow: "hidden",
                                              textOverflow: "ellipsis",
                                              whiteSpace: "nowrap",
                                            }}
                                          >
                                            {opt.option_text}
                                          </span>
                                        </div>
                                        <div
                                          style={{
                                            display: "flex",
                                            gap: "2px",
                                          }}
                                        >
                                          <button
                                            onClick={() =>
                                              setOptionModal({
                                                isOpen: true,
                                                isEdit: true,
                                                questionId: q.id,
                                                optionId: opt.id,
                                                option_text: opt.option_text,
                                                is_correct: Boolean(
                                                  opt.is_correct,
                                                ),
                                              })
                                            }
                                            style={{
                                              background: "none",
                                              border: "none",
                                              color: "var(--cyan)",
                                              cursor: "pointer",
                                              padding: "2px",
                                            }}
                                            title="تعديل الخيار"
                                          >
                                            <Edit3 size={12} />
                                          </button>
                                          <button
                                            onClick={async () => {
                                              if (
                                                window.confirm(
                                                  "هل تريد حذف هذا الخيار؟",
                                                )
                                              ) {
                                                await deleteAdminOption(opt.id);
                                              }
                                            }}
                                            style={{
                                              background: "none",
                                              border: "none",
                                              color: "var(--rose)",
                                              cursor: "pointer",
                                              padding: "2px",
                                            }}
                                            title="حذف الخيار"
                                          >
                                            <Trash2 size={12} />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 6: SUBSCRIPTION CODES BY GRADE (GET /api/v1/admin/subscription-codes) */}
      {/* ==================================================================== */}
      {activeTab === "codes" && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem",
              marginBottom: "1.25rem",
            }}
          >
            <div>
              <h3
                style={{ fontSize: "1.1rem", fontWeight: 800, color: "#fff" }}
              >
                أكواد اشتراكات الطلاب المعتمدة حسب الصف:
              </h3>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "var(--text-muted)",
                  marginTop: "4px",
                }}
              >
                استعراض وتصدير جميع أكواد الطلاب النشطة لكل مرحلة دراسية
                وتوزيعها للطلاب
              </p>
            </div>

            {/* Controls */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                flexWrap: "wrap",
              }}
            >
              {/* Grade Selector */}
              <div
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <span
                  style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}
                >
                  الصف:
                </span>
                <select
                  value={selectedCodesGrade}
                  onChange={(e) => {
                    const gId = Number(e.target.value);
                    setSelectedCodesGrade(gId);
                    fetchSubscriptionCodes(gId);
                  }}
                  className="form-input"
                  style={{
                    background: "#0b1120",
                    color: "#fff",
                    fontSize: "0.85rem",
                    padding: "6px 12px",
                  }}
                >
                  {GRADES.map((g) => (
                    <option
                      key={g.numericId || g.id}
                      value={g.numericId || GRADE_ID_MAP[g.id] || 1}
                    >
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Refresh */}
              <button
                onClick={() => fetchSubscriptionCodes(selectedCodesGrade)}
                className="btn-secondary"
                style={{ fontSize: "0.85rem", padding: "6px 12px" }}
                disabled={isLoadingCodes}
              >
                <RefreshCw
                  size={14}
                  className={isLoadingCodes ? "animate-spin" : ""}
                />
                <span>تحديث</span>
              </button>

              {/* Copy All Codes */}
              {subscriptionCodesList.length > 0 && (
                <button
                  onClick={() => {
                    const allCodesText = subscriptionCodesList
                      .map(
                        (c) =>
                          `${c.student_name || "طالب"}: ${c.subscription_code}`,
                      )
                      .join("\n");
                    navigator.clipboard?.writeText(allCodesText);
                    showToast(
                      `تم نسخ ${subscriptionCodesList.length} كود اشتراك بنجاح! 📋`,
                    );
                  }}
                  className="btn-primary"
                  style={{ fontSize: "0.85rem", padding: "6px 14px" }}
                >
                  <Copy size={14} />
                  <span>نسخ جميع الأكواد ({subscriptionCodesList.length})</span>
                </button>
              )}
            </div>
          </div>

          {/* Search within Codes */}
          <div
            style={{
              marginBottom: "1rem",
              maxWidth: "340px",
              position: "relative",
            }}
          >
            <input
              type="text"
              placeholder="ابحث باسم الطالب أو كود الاشتراك..."
              value={codesSearchQuery}
              onChange={(e) => setCodesSearchQuery(e.target.value)}
              className="form-input"
              style={{
                fontSize: "0.85rem",
                paddingLeft: "1rem",
                paddingRight: "2.5rem",
              }}
            />
            <Search
              size={15}
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            />
          </div>

          {/* Table */}
          {isLoadingCodes ? (
            <div
              style={{
                textAlign: "center",
                padding: "3rem",
                color: "var(--cyan)",
              }}
            >
              <RefreshCw
                size={24}
                className="animate-spin"
                style={{ margin: "0 auto 8px" }}
              />
              <p>جاري تحميل أكواد الاشتراك...</p>
            </div>
          ) : (
            (() => {
              const filtered = (subscriptionCodesList || []).filter((item) => {
                if (!codesSearchQuery.trim()) return true;
                const q = codesSearchQuery.toLowerCase();
                const name = (item.student_name || "").toLowerCase();
                const code = getSubscriptionCode(
                  item.subscription_code,
                  item.subscription,
                  item,
                ).toLowerCase();
                return name.includes(q) || code.includes(q);
              });

              if (filtered.length === 0) {
                return (
                  <div
                    className="feature-card"
                    style={{ padding: "3rem", textAlign: "center" }}
                  >
                    <Key
                      size={40}
                      style={{
                        color: "var(--text-muted)",
                        margin: "0 auto 1rem",
                      }}
                    />
                    <h4
                      style={{
                        color: "#fff",
                        fontSize: "1rem",
                        fontWeight: 800,
                      }}
                    >
                      لا توجد أكواد اشتراك معتمدة لهذا الصف حالياً
                    </h4>
                    <p
                      style={{
                        color: "var(--text-muted)",
                        fontSize: "0.8rem",
                        marginTop: "6px",
                      }}
                    >
                      يمكنك قبول طلبات الطلاب أو إضافة طالب وتفعيل اشتراكه من
                      تبويب "طلبات التفعيل" أو "سجل الطلاب"
                    </p>
                  </div>
                );
              }

              return (
                <div style={{ overflowX: "auto" }}>
                  <table
                    className="data-table"
                    style={{ width: "100%", textAlign: "right" }}
                  >
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>اسم الطالب</th>
                        <th>كود الاشتراك (كود الدخول)</th>
                        <th>المرحلة الدراسية</th>
                        <th>حالة الكود</th>
                        <th>إجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((item, idx) => {
                        const subscriptionCode = getSubscriptionCode(
                          item.subscription_code,
                          item.subscription,
                          item,
                        );
                        const linkedApprovedRecord = approvedSubscriptions.find(
                          (record) => {
                            const recordCode = getSubscriptionCode(
                              record.subscription_code,
                              record.subscription,
                              record.active_subscription,
                              record.subscriptions?.[0],
                              record,
                            );
                            const recordStudentId =
                              record.student?.id ||
                              record.user?.id ||
                              record.student_id ||
                              record.user_id;
                            const codeStudentId =
                              item.student?.id ||
                              item.user?.id ||
                              item.student_id ||
                              item.user_id;
                            const recordStudent = record.student || record.user || record;
                            const recordStudentName =
                              `${record.first_name || recordStudent.first_name || ""} ${record.last_name || recordStudent.last_name || ""}`.trim() ||
                              record.student_name ||
                              record.name ||
                              recordStudent.name ||
                              "";
                            const codeStudentName =
                              item.student_name ||
                              item.student?.name ||
                              item.user?.name ||
                              item.name ||
                              "";
                            const namesMatch =
                              recordStudentName.trim().replace(/\s+/g, " ").toLowerCase() ===
                              codeStudentName.trim().replace(/\s+/g, " ").toLowerCase();
                            return (
                              (recordCode && recordCode === subscriptionCode) ||
                              (recordStudentId != null &&
                                codeStudentId != null &&
                                String(recordStudentId) === String(codeStudentId)) ||
                              (recordStudentName && codeStudentName && namesMatch)
                            );
                          },
                        );
                        const linkedSubscription = getSubscriptionRecord(
                          linkedApprovedRecord,
                        );
                        const codeSubscription = getSubscriptionRecord(item);
                        const inactiveStatuses = [
                          "inactive",
                          "cancelled",
                          "canceled",
                          "deactivated",
                          "disabled",
                          "expired",
                        ];
                        const activeStatuses = ["active", "approved", "enabled"];
                        const statusCandidates = [
                          getSubscriptionStatus(
                            linkedApprovedRecord,
                            linkedSubscription,
                            linkedApprovedRecord?.student,
                          ),
                          linkedSubscription?.status,
                          linkedApprovedRecord?.subscription_status,
                          linkedApprovedRecord?.subscriptionStatus,
                          linkedApprovedRecord?.status,
                          codeSubscription?.status,
                          item.subscription_status,
                          item.subscriptionStatus,
                          item.status,
                          linkedSubscription?.is_active === false ||
                          linkedApprovedRecord?.is_active === false ||
                          codeSubscription?.is_active === false ||
                          item.is_active === false
                            ? "inactive"
                            : linkedSubscription?.is_active === true ||
                                linkedApprovedRecord?.is_active === true ||
                                codeSubscription?.is_active === true ||
                                item.is_active === true
                              ? "active"
                              : "",
                        ]
                          .filter(Boolean)
                          .map((status) => String(status).toLowerCase());
                        const linkedStatus =
                          statusCandidates.find((status) =>
                            inactiveStatuses.includes(status),
                          ) ||
                          statusCandidates[0] ||
                          "";
                        const isSubscriptionInactive =
                          inactiveStatuses.includes(linkedStatus);
                        const hasSubscriptionStatus =
                          inactiveStatuses.includes(linkedStatus) ||
                          activeStatuses.includes(linkedStatus);
                        const isCopied = copiedCode === subscriptionCode;
                        return (
                          <tr key={subscriptionCode || idx}>
                            <td
                              style={{
                                color: "var(--text-muted)",
                                fontSize: "0.8rem",
                              }}
                            >
                              {idx + 1}
                            </td>
                            <td style={{ fontWeight: 800, color: "#fff" }}>
                              {item.student_name || "طالب المنصة"}
                            </td>
                            <td>
                              <span
                                style={{
                                  fontFamily: "monospace",
                                  fontSize: "0.95rem",
                                  fontWeight: 800,
                                  color: "var(--cyan)",
                                  background: "rgba(6, 182, 212, 0.12)",
                                  padding: "4px 10px",
                                  borderRadius: "6px",
                                  border: "1px solid rgba(6, 182, 212, 0.25)",
                                  letterSpacing: "1px",
                                }}
                              >
                                {subscriptionCode || "—"}
                              </span>
                            </td>
                            <td>
                              <span className="badge-tag">
                                {getGradeNameById(selectedCodesGrade)}
                              </span>
                            </td>
                            <td>
                                                            <span
                                className="badge-tag"
                                style={{
                                  background: !hasSubscriptionStatus
                                    ? "rgba(148, 163, 184, 0.12)"
                                    : isSubscriptionInactive
                                      ? "rgba(244, 63, 94, 0.15)"
                                      : "rgba(16, 185, 129, 0.15)",
                                  color: !hasSubscriptionStatus
                                    ? "var(--text-muted)"
                                    : isSubscriptionInactive
                                      ? "var(--rose)"
                                      : "var(--emerald)",
                                  borderColor: !hasSubscriptionStatus
                                    ? "rgba(148, 163, 184, 0.3)"
                                    : isSubscriptionInactive
                                      ? "rgba(244, 63, 94, 0.3)"
                                      : "rgba(16, 185, 129, 0.3)",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {!hasSubscriptionStatus
                                  ? "\u062d\u0627\u0644\u0629 \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643 \u063a\u064a\u0631 \u0645\u062a\u0627\u062d\u0629"
                                  : isSubscriptionInactive
                                    ? "\u0645\u0639\u0637\u0644"
                                    : "\u0646\u0634\u0637"}
                              </span>
                            </td>
                            <td>
                              <button
                                onClick={() =>
                                  handleCopyCode(subscriptionCode)
                                }
                                className="btn-secondary"
                                style={{
                                  fontSize: "0.75rem",
                                  padding: "5px 12px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px",
                                }}
                              >
                                {isCopied ? (
                                  <Check
                                    size={14}
                                    style={{ color: "var(--emerald)" }}
                                  />
                                ) : (
                                  <Copy size={14} />
                                )}
                                <span>
                                  {isCopied ? "تم النسخ" : "نسخ الكود"}
                                </span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 6: MEMOS MANAGEMENT                                             */}
      {/* ==================================================================== */}
      {activeTab === "memos" && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem",
              marginBottom: "1.25rem",
            }}
          >
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#fff" }}>
              مذكرات وملخصات العميد PDF:
            </h3>
            <button
              onClick={() => setIsAddMemoOpen(true)}
              className="btn-primary"
              style={{ fontSize: "0.85rem" }}
            >
              <Plus size={16} />
              <span>رفع مذكرة جديدة</span>
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {memosList.map((memo) => (
              <div
                key={memo.id}
                className="feature-card"
                style={{ padding: "1.25rem" }}
              >
                <div>
                  <span
                    className="badge-tag"
                    style={{ marginBottom: "6px", display: "inline-block" }}
                  >
                    {memo.grade}
                  </span>
                  <h4
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: 800,
                      color: "#fff",
                      marginBottom: "6px",
                    }}
                  >
                    {memo.title}
                  </h4>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      display: "flex",
                      gap: "8px",
                      marginBottom: "1rem",
                    }}
                  >
                    <span>{memo.pages} صفحة</span>
                    <span>• {memo.fileSize}</span>
                    <span>• {memo.year}</span>
                  </div>
                </div>

                <button
                  onClick={() => deleteMemo(memo.id)}
                  className="btn-secondary"
                  style={{
                    color: "var(--rose)",
                    width: "100%",
                    fontSize: "0.8rem",
                    padding: "6px",
                  }}
                >
                  <Trash2 size={14} />
                  <span>حذف المذكرة</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: ADD STUDENT MANUALLY BY ADMIN (POST /api/v1/admin/students)   */}
      {/* ==================================================================== */}
      {isAddStudentOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(8px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div
            className="form-card"
            style={{ width: "100%", maxWidth: "580px", position: "relative" }}
          >
            <button
              onClick={() => setIsAddStudentOpen(false)}
              style={{
                position: "absolute",
                top: "16px",
                left: "16px",
                color: "var(--text-muted)",
              }}
            >
              <X size={20} />
            </button>
            <h2
              style={{
                fontSize: "1.3rem",
                fontWeight: 900,
                color: "#ffffff",
                textAlign: "center",
                marginBottom: "0.5rem",
              }}
            >
              👥 إنشاء حساب طالب وتفعيل كود اشتراك فوراً
            </h2>
            <p
              style={{
                fontSize: "0.78rem",
                color: "var(--text-muted)",
                textAlign: "center",
                marginBottom: "1.25rem",
              }}
            >
              لا يتطلب موافقة؛ يقوم السيرفر بتوليد كود اشتراك معتمد فوراً وتحديد
              تواريخ الصلاحية
            </p>

            <form onSubmit={handleSaveNewStudent}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.75rem",
                  marginBottom: "1rem",
                }}
              >
                <div>
                  <label className="form-label" style={{ fontSize: "0.8rem" }}>
                    الاسم الأول *
                  </label>
                  <input
                    type="text"
                    required
                    value={newStudentData.first_name}
                    onChange={(e) =>
                      setNewStudentData({
                        ...newStudentData,
                        first_name: e.target.value,
                      })
                    }
                    placeholder="مثال: أحمد"
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: "0.8rem" }}>
                    اسم العائلة (اللقب) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newStudentData.last_name}
                    onChange={(e) =>
                      setNewStudentData({
                        ...newStudentData,
                        last_name: e.target.value,
                      })
                    }
                    placeholder="مثال: محمود علي"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label className="form-label" style={{ fontSize: "0.8rem" }}>
                  الصف الدراسي (grade_id) *
                </label>
                <select
                  value={newStudentData.grade_id}
                  onChange={(e) =>
                    setNewStudentData({
                      ...newStudentData,
                      grade_id: Number(e.target.value),
                    })
                  }
                  className="form-input"
                  style={{ background: "#0b1120", color: "#fff" }}
                >
                  {GRADES.map((g) => (
                    <option key={g.id} value={g.numericId}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.75rem",
                  marginBottom: "1rem",
                }}
              >
                <div>
                  <label className="form-label" style={{ fontSize: "0.8rem" }}>
                    هاتف الطالب *
                  </label>
                  <input
                    type="tel"
                    required
                    dir="ltr"
                    value={newStudentData.phone}
                    onChange={(e) =>
                      setNewStudentData({
                        ...newStudentData,
                        phone: e.target.value,
                      })
                    }
                    placeholder="010XXXXXXXX"
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: "0.8rem" }}>
                    هاتف ولي الأمر *
                  </label>
                  <input
                    type="tel"
                    required
                    dir="ltr"
                    value={newStudentData.parent_phone}
                    onChange={(e) =>
                      setNewStudentData({
                        ...newStudentData,
                        parent_phone: e.target.value,
                      })
                    }
                    placeholder="011XXXXXXXX"
                    className="form-input"
                  />
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.75rem",
                  marginBottom: "1.25rem",
                }}
              >
                <div>
                  <label className="form-label" style={{ fontSize: "0.75rem" }}>
                    تاريخ بداية الاشتراك
                  </label>
                  <input
                    type="date"
                    value={newStudentData.start_date}
                    onChange={(e) =>
                      setNewStudentData({
                        ...newStudentData,
                        start_date: e.target.value,
                      })
                    }
                    className="form-input"
                    style={{ background: "#0b1120", color: "#fff" }}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: "0.75rem" }}>
                    تاريخ انتهاء الكود والاشتراك
                  </label>
                  <input
                    type="date"
                    value={newStudentData.end_date}
                    onChange={(e) =>
                      setNewStudentData({
                        ...newStudentData,
                        end_date: e.target.value,
                        code_expires_at: e.target.value,
                      })
                    }
                    className="form-input"
                    style={{ background: "#0b1120", color: "#fff" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  type="submit"
                  disabled={isProcessingAction}
                  className="btn-primary"
                  style={{ flex: 1 }}
                >
                  <span>إنشاء وتفعيل الحساب وتوليد الكود</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddStudentOpen(false)}
                  className="btn-secondary"
                >
                  <span>إلغاء</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: VIEW STUDENT DETAILS (GET /api/v1/admin/students/{id})         */}
      {/* ==================================================================== */}
      {viewingStudent && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(10px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div
            className="form-card"
            style={{
              width: "100%",
              maxWidth: "600px",
              position: "relative",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <button
              onClick={() => setViewingStudent(null)}
              style={{
                position: "absolute",
                top: "16px",
                left: "16px",
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
              }}
            >
              <X size={20} />
            </button>

            {/* Student Header */}
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "18px",
                  background: "linear-gradient(135deg, #4f46e5, #06b6d4)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.6rem",
                  fontWeight: 900,
                  margin: "0 auto 12px",
                }}
              >
                {viewingStudentName.charAt(0)}
              </div>
              <h2
                style={{
                  fontSize: "1.3rem",
                  fontWeight: 900,
                  color: "#fff",
                  marginBottom: "4px",
                }}
              >
                {viewingStudentName}
              </h2>
              <span className="badge-tag" style={{ marginTop: "4px" }}>
                {getArabicGradeName(
                  viewingStudent.grade,
                  viewingStudent.grade_id,
                )}
              </span>
            </div>

            {/* Basic Info */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                background: "#050914",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "12px",
                padding: "14px",
                marginBottom: "1rem",
                fontSize: "0.85rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  paddingBottom: "6px",
                }}
              >
                <span style={{ color: "var(--text-muted)" }}>
                  كود الاشتراك:
                </span>
                <strong
                  style={{
                    color: "var(--cyan)",
                    fontFamily: "monospace",
                    letterSpacing: "1px",
                  }}
                >
                  {getSubscriptionCode(
                    viewingStudent.code,
                    viewingStudent.subscription_code,
                    viewingStudent.subscription,
                  ) ||
                    "قيد الاعتماد"}
                </strong>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  paddingBottom: "6px",
                }}
              >
                <span style={{ color: "var(--text-muted)" }}>هاتف الطالب:</span>
                <strong style={{ color: "#fff", direction: "ltr" }}>
                  {viewingStudent.phone || "غير مسجل"}
                </strong>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  paddingBottom: "6px",
                }}
              >
                <span style={{ color: "var(--text-muted)" }}>
                  هاتف ولي الأمر:
                </span>
                <strong style={{ color: "#fff", direction: "ltr" }}>
                  {viewingStudent.parentPhone ||
                    viewingStudent.parent_phone ||
                    "غير مسجل"}
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "6px" }}>
                <span style={{ color: "var(--text-muted)" }}>حالة الحساب:</span>
                <span
                  style={{
                    color:
                      viewingStudent.status === "pending"
                        ? "#f59e0b"
                        : "var(--emerald)",
                    fontWeight: 800,
                  }}
                >
                  {viewingStudent.status === "pending"
                    ? "قيد المراجعة"
                    : "مفعّل ومعتمد"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "6px" }}>
                <span style={{ color: "var(--text-muted)" }}>تاريخ بدء الاشتراك:</span>
                <strong style={{ color: "#fff" }}>
                  {viewingStudent.start_date ||
                    viewingStudent.subscription?.start_date ||
                    viewingStudent.created_at?.split("T")[0] ||
                    "—"}
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "6px" }}>
                <span style={{ color: "var(--text-muted)" }}>صلاحية وانتهاء الكود:</span>
                <strong style={{ color: "#fff" }}>
                  {viewingStudent.end_date ||
                    viewingStudent.subscription?.end_date ||
                    viewingStudent.subscription?.expires_at ||
                    viewingStudent.code_expires_at ||
                    "—"}
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>معرف الجهاز الموثوق:</span>
                <strong
                  style={{
                    color: "var(--emerald)",
                    fontFamily: "monospace",
                    fontSize: "0.75rem",
                    wordBreak: "break-all",
                    direction: "ltr",
                  }}
                >
                  {viewingStudent.trusted_device?.device_identifier ||
                    (typeof viewingStudent.trusted_device === "string"
                      ? viewingStudent.trusted_device
                      : viewingStudent.device_identifier || "مسجل ومحمي 🔒")}
                </strong>
              </div>
            </div>

            {/* Activity Stats */}
            <h3
              style={{
                fontSize: "0.9rem",
                fontWeight: 800,
                color: "var(--cyan)",
                marginBottom: "10px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <BarChart2 size={16} /> إحصائيات النشاط والتقدم
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "10px",
                marginBottom: "1.25rem",
              }}
            >
              {[
                {
                  icon: <Video size={20} />,
                  label: "فيديوهات شاهدها",
                  value: completedLessons,
                  total: totalLessons,
                  color: "#06b6d4",
                },
                {
                  icon: <FileQuestion size={20} />,
                  label: "امتحانات أداها",
                  value: completedQuizzes,
                  total: totalQuizzes,
                  color: "#a78bfa",
                },
                {
                  icon: <BarChart2 size={20} />,
                  label: "متوسط الدرجات",
                  value: averageScore,
                  total: null,
                  color: "#10b981",
                },
              ].map((stat, i) => (
                <div
                  key={i}
                  style={{
                    background: "#050914",
                    border: `1px solid ${stat.color}30`,
                    borderRadius: "12px",
                    padding: "14px 10px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      color: stat.color,
                      marginBottom: "8px",
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    {stat.icon}
                  </div>
                  <div
                    style={{
                      fontSize: "1.3rem",
                      fontWeight: 900,
                      color: "#fff",
                    }}
                  >
                    {stat.value}
                    {stat.total !== null ? (
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                          fontWeight: 400,
                        }}
                      >
                        /{stat.total}
                      </span>
                    ) : (
                      ""
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: "0.7rem",
                      color: "var(--text-muted)",
                      marginTop: "3px",
                    }}
                  >
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Action Management Buttons */}
            <div
              style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
                marginBottom: "1rem",
                padding: "10px",
                background: "rgba(255,255,255,0.02)",
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {viewingStudent.status === "inactive" ||
              viewingStudent.status === "cancelled" ? (
                <span className="badge-tag">إعادة التفعيل غير متاحة</span>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    openStudentDeactivationConfirmation(viewingStudent)
                  }
                  disabled={isProcessingAction}
                  className="btn-secondary"
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    color: "var(--rose)",
                    borderColor: "rgba(244, 63, 94, 0.3)",
                    fontSize: "0.8rem",
                  }}
                >
                  <PowerOff size={15} />
                  <span>تعطيل الحساب</span>
                </button>
              )}

              {hasActiveTrustedDevice(viewingStudent) && (
                <button
                  type="button"
                  onClick={async () => {
                    await handleResetDeviceForStudent(viewingStudent);
                  }}
                disabled={isProcessingAction}
                className="btn-secondary"
                style={{
                  flex: 1,
                  justifyContent: "center",
                  color: "var(--amber)",
                  borderColor: "rgba(245, 158, 11, 0.3)",
                  fontSize: "0.8rem",
                }}
              >
                <RotateCcw size={15} />
                <span>إعادة ضبط الجهاز</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setViewingStudent(null)}
              className="btn-secondary"
              style={{ width: "100%", justifyContent: "center" }}
            >
              <span>إغلاق</span>
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: EDIT STUDENT (PUT /api/v1/admin/students/{id})                  */}
      {/* ==================================================================== */}
      {editingStudent && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(8px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div
            className="form-card"
            style={{ width: "100%", maxWidth: "580px", position: "relative" }}
          >
            <button
              onClick={() => setEditingStudent(null)}
              style={{
                position: "absolute",
                top: "16px",
                left: "16px",
                color: "var(--text-muted)",
              }}
            >
              <X size={20} />
            </button>
            <h2
              style={{
                fontSize: "1.3rem",
                fontWeight: 900,
                color: "#ffffff",
                textAlign: "center",
                marginBottom: "1.25rem",
              }}
            >
              ✏️ تعديل بيانات الطالب
            </h2>
            <form onSubmit={handleSaveStudentEdit}>
              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label className="form-label">اسم الطالب بالكامل</label>
                <input
                  type="text"
                  required
                  value={editingStudent.name || ""}
                  onChange={(e) =>
                    setEditingStudent({
                      ...editingStudent,
                      name: e.target.value,
                    })
                  }
                  className="form-input"
                />
              </div>
              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label className="form-label">الصف الدراسي</label>
                <select
                  value={editingStudent.grade_id || editingStudent.gradeId || 1}
                  onChange={(e) =>
                    setEditingStudent({
                      ...editingStudent,
                      grade_id: Number(e.target.value),
                      grade: getGradeNameById(Number(e.target.value)),
                    })
                  }
                  className="form-input"
                  style={{ background: "#0b1120", color: "#fff" }}
                >
                  {GRADES.map((g) => (
                    <option key={g.id} value={g.numericId}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.75rem",
                  marginBottom: "1rem",
                }}
              >
                <div>
                  <label className="form-label">هاتف الطالب</label>
                  <input
                    type="tel"
                    dir="ltr"
                    value={editingStudent.phone || ""}
                    onChange={(e) =>
                      setEditingStudent({
                        ...editingStudent,
                        phone: e.target.value,
                      })
                    }
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">هاتف ولي الأمر</label>
                  <input
                    type="tel"
                    dir="ltr"
                    value={
                      editingStudent.parentPhone ||
                      editingStudent.parent_phone ||
                      ""
                    }
                    onChange={(e) =>
                      setEditingStudent({
                        ...editingStudent,
                        parentPhone: e.target.value,
                        parent_phone: e.target.value,
                      })
                    }
                    className="form-input"
                  />
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  marginTop: "1.25rem",
                }}
              >
                <button
                  type="submit"
                  disabled={isProcessingAction}
                  className="btn-primary"
                  style={{ flex: 1 }}
                >
                  <span>حفظ التعديلات في السيرفر</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="btn-secondary"
                >
                  <span>إلغاء</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD LESSON */}
      {isAddLessonOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(8px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div
            className="form-card"
            style={{ width: "100%", maxWidth: "600px", position: "relative" }}
          >
            <button
              onClick={() => setIsAddLessonOpen(false)}
              style={{
                position: "absolute",
                top: "16px",
                left: "16px",
                color: "var(--text-muted)",
              }}
            >
              <X size={20} />
            </button>
            <h2
              style={{
                fontSize: "1.3rem",
                fontWeight: 900,
                color: "#fff",
                marginBottom: "1.25rem",
                textAlign: "center",
              }}
            >
              🎬 نشر ورفع محاضرة فيديو جديدة
            </h2>
            <form onSubmit={handleSaveLesson}>
              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label className="form-label">عنوان الدرس / المحاضرة</label>
                <input
                  type="text"
                  required
                  value={newLessonData.title}
                  onChange={(e) =>
                    setNewLessonData({
                      ...newLessonData,
                      title: e.target.value,
                    })
                  }
                  placeholder="مثال: نظرية ذات الحدين وتطبيقاتها..."
                  className="form-input"
                />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.75rem",
                  marginBottom: "1rem",
                }}
              >
                <div>
                  <label className="form-label">الصف الدراسي</label>
                  <select
                    value={newLessonData.grade}
                    onChange={(e) =>
                      setNewLessonData({
                        ...newLessonData,
                        grade: e.target.value,
                      })
                    }
                    className="form-input"
                    style={{ background: "#0b1120", color: "#fff" }}
                  >
                    {GRADES.map((g) => (
                      <option key={g.id} value={g.name}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">الفرع</label>
                  <select
                    value={newLessonData.branch}
                    onChange={(e) =>
                      setNewLessonData({
                        ...newLessonData,
                        branch: e.target.value,
                      })
                    }
                    className="form-input"
                    style={{ background: "#0b1120", color: "#fff" }}
                  >
                    {BRANCHES.filter((b) => b !== "الكل").map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label className="form-label">
                  رابط الفيديو (YouTube / MP4) *
                </label>
                <input
                  type="url"
                  required
                  value={newLessonData.videoUrl}
                  onChange={(e) =>
                    setNewLessonData({
                      ...newLessonData,
                      videoUrl: e.target.value,
                    })
                  }
                  className="form-input"
                  dir="ltr"
                />
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  marginTop: "1.25rem",
                }}
              >
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isProcessingAction}
                  style={{ flex: 1 }}
                >
                  <span>نشر المحاضرة</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddLessonOpen(false)}
                  className="btn-secondary"
                >
                  <span>إلغاء</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD QUESTION */}
      {isAddQuestionOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(8px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div
            className="form-card"
            style={{ width: "100%", maxWidth: "600px", position: "relative" }}
          >
            <button
              onClick={() => setIsAddQuestionOpen(false)}
              style={{
                position: "absolute",
                top: "16px",
                left: "16px",
                color: "var(--text-muted)",
              }}
            >
              <X size={20} />
            </button>
            <h2
              style={{
                fontSize: "1.3rem",
                fontWeight: 900,
                color: "#fff",
                marginBottom: "1.25rem",
                textAlign: "center",
              }}
            >
              📝 إضافة سؤال إلى بنك الامتحانات
            </h2>
            <form onSubmit={handleSaveQuestion}>
              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label className="form-label">المحاضرة المرتبطة بالسؤال</label>
                <select
                  value={selectedLessonForQuiz}
                  onChange={(e) => setSelectedLessonForQuiz(e.target.value)}
                  className="form-input"
                  style={{ background: "#0b1120", color: "#fff" }}
                >
                  {lessonsList.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title} ({l.grade})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label className="form-label">نص مسألة الامتحان</label>
                <input
                  type="text"
                  required
                  value={newQuestionData.question}
                  onChange={(e) =>
                    setNewQuestionData({
                      ...newQuestionData,
                      question: e.target.value,
                    })
                  }
                  placeholder="اكتب نص المسألة..."
                  className="form-input"
                />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.75rem",
                  marginBottom: "1rem",
                }}
              >
                <div>
                  <label className="form-label">الخيار (أ)</label>
                  <input
                    type="text"
                    required
                    value={newQuestionData.opt1}
                    onChange={(e) =>
                      setNewQuestionData({
                        ...newQuestionData,
                        opt1: e.target.value,
                      })
                    }
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">الخيار (ب)</label>
                  <input
                    type="text"
                    required
                    value={newQuestionData.opt2}
                    onChange={(e) =>
                      setNewQuestionData({
                        ...newQuestionData,
                        opt2: e.target.value,
                      })
                    }
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">الخيار (جـ)</label>
                  <input
                    type="text"
                    value={newQuestionData.opt3}
                    onChange={(e) =>
                      setNewQuestionData({
                        ...newQuestionData,
                        opt3: e.target.value,
                      })
                    }
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">الخيار (د)</label>
                  <input
                    type="text"
                    value={newQuestionData.opt4}
                    onChange={(e) =>
                      setNewQuestionData({
                        ...newQuestionData,
                        opt4: e.target.value,
                      })
                    }
                    className="form-input"
                  />
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  marginTop: "1.25rem",
                }}
              >
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1 }}
                >
                  <span>حفظ السؤال</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddQuestionOpen(false)}
                  className="btn-secondary"
                >
                  <span>إلغاء</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAddExamOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            background: "rgba(0,0,0,0.8)",
          }}
        >
          <div
            className="form-card"
            role="dialog"
            aria-modal="true"
            style={{ width: "100%", maxWidth: "560px" }}
          >
            <h2 style={{ color: "#fff", marginBottom: "1rem" }}>
              {editingExam ? "تعديل الاختبار" : "إنشاء اختبار جديد"}
            </h2>
            <form onSubmit={handleSaveExam}>
              <div className="form-group">
                <label className="form-label" htmlFor="exam-lesson">
                  الدرس
                </label>
                <select
                  id="exam-lesson"
                  required
                  className="form-input"
                  value={newExamData.lesson_id}
                  onChange={(e) =>
                    setNewExamData({
                      ...newExamData,
                      lesson_id: Number(e.target.value),
                    })
                  }
                >
                  {lessonsList.map((lesson) => (
                    <option key={lesson.id} value={lesson.id}>
                      {lesson.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="exam-title">
                  عنوان الاختبار
                </label>
                <input
                  id="exam-title"
                  required
                  className="form-input"
                  value={newExamData.title}
                  onChange={(e) =>
                    setNewExamData({ ...newExamData, title: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="exam-description">
                  الوصف
                </label>
                <textarea
                  id="exam-description"
                  className="form-input"
                  value={newExamData.description}
                  onChange={(e) =>
                    setNewExamData({
                      ...newExamData,
                      description: e.target.value,
                    })
                  }
                />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.75rem",
                }}
              >
                <div className="form-group">
                  <label className="form-label" htmlFor="exam-duration">
                    المدة بالدقائق
                  </label>
                  <input
                    id="exam-duration"
                    type="number"
                    min="1"
                    required
                    className="form-input"
                    value={newExamData.duration_minutes}
                    onChange={(e) =>
                      setNewExamData({
                        ...newExamData,
                        duration_minutes: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="exam-passing">
                    نسبة النجاح
                  </label>
                  <input
                    id="exam-passing"
                    type="number"
                    min="1"
                    max="100"
                    required
                    className="form-input"
                    value={newExamData.passing_percentage}
                    onChange={(e) =>
                      setNewExamData({
                        ...newExamData,
                        passing_percentage: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              {editingExam && (
                <label
                  className="form-label"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginTop: "0.75rem",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={newExamData.is_active !== false}
                    onChange={(e) =>
                      setNewExamData({
                        ...newExamData,
                        is_active: e.target.checked,
                      })
                    }
                  />
                  الاختبار متاح للطلاب
                </label>
              )}
              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  marginTop: "1.25rem",
                }}
              >
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isProcessingAction}
                  style={{ flex: 1 }}
                >
                  حفظ
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setIsAddExamOpen(false);
                    setEditingExam(null);
                  }}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {questionModal.isOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            background: "rgba(0,0,0,0.8)",
          }}
        >
          <div
            className="form-card"
            role="dialog"
            aria-modal="true"
            style={{ width: "100%", maxWidth: "520px" }}
          >
            <h2 style={{ color: "#fff", marginBottom: "1rem" }}>
              {questionModal.isEdit ? "تعديل السؤال" : "إضافة سؤال"}
            </h2>
            <form onSubmit={handleSaveExamQuestion}>
              <div className="form-group">
                <label className="form-label" htmlFor="exam-question">
                  نص السؤال
                </label>
                <textarea
                  id="exam-question"
                  required
                  className="form-input"
                  value={questionModal.question_text}
                  onChange={(e) =>
                    setQuestionModal({
                      ...questionModal,
                      question_text: e.target.value,
                    })
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="exam-question-points">
                  النقاط / الدرجة
                </label>
                <input
                  id="exam-question-points"
                  type="number"
                  min="1"
                  required
                  className="form-input"
                  value={questionModal.points}
                  onChange={(e) =>
                    setQuestionModal({
                      ...questionModal,
                      points: Number(e.target.value),
                    })
                  }
                />
              </div>

              {/* Multiple Choice Options */}
              {!questionModal.isEdit && (
                <div
                  style={{
                    marginTop: "1rem",
                    borderTop: "1px solid rgba(255,255,255,0.08)",
                    paddingTop: "1rem",
                  }}
                >
                  <label
                    className="form-label"
                    style={{
                      marginBottom: "10px",
                      color: "var(--cyan)",
                      fontWeight: 800,
                      display: "block",
                    }}
                  >
                    خيارات الإجابة (اختر الإجابة الصحيحة بالضغط على الدائرة 🔘):
                  </label>

                  {[
                    { key: "opt1", num: 1, label: "أ" },
                    { key: "opt2", num: 2, label: "ب" },
                    { key: "opt3", num: 3, label: "جـ" },
                    { key: "opt4", num: 4, label: "د" },
                  ].map((item) => (
                    <div
                      key={item.key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        marginBottom: "10px",
                        background:
                          questionModal.correctOption === item.num
                            ? "rgba(16, 185, 129, 0.12)"
                            : "#050914",
                        border: `1px solid ${
                          questionModal.correctOption === item.num
                            ? "var(--emerald)"
                            : "rgba(255,255,255,0.08)"
                        }`,
                        padding: "8px 12px",
                        borderRadius: "10px",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <input
                        type="radio"
                        name="correct-option"
                        id={`opt-radio-${item.num}`}
                        checked={questionModal.correctOption === item.num}
                        onChange={() =>
                          setQuestionModal({
                            ...questionModal,
                            correctOption: item.num,
                          })
                        }
                        style={{
                          accentColor: "var(--emerald)",
                          cursor: "pointer",
                          width: "18px",
                          height: "18px",
                        }}
                        title="تحديد هذا الخيار كإجابة صحيحة"
                      />
                      <label
                        htmlFor={`opt-radio-${item.num}`}
                        style={{
                          color:
                            questionModal.correctOption === item.num
                              ? "var(--emerald)"
                              : "var(--text-muted)",
                          fontSize: "0.88rem",
                          fontWeight: 800,
                          cursor: "pointer",
                          width: "28px",
                        }}
                      >
                        ({item.label})
                      </label>
                      <input
                        type="text"
                        placeholder={`اكتب نص الخيار (${item.label})...`}
                        required={item.num <= 2}
                        value={questionModal[item.key]}
                        onChange={(e) =>
                          setQuestionModal({
                            ...questionModal,
                            [item.key]: e.target.value,
                          })
                        }
                        className="form-input"
                        style={{
                          padding: "8px 12px",
                          fontSize: "0.85rem",
                          flex: 1,
                        }}
                      />
                      {questionModal.correctOption === item.num && (
                        <span
                          style={{
                            fontSize: "0.72rem",
                            color: "var(--emerald)",
                            fontWeight: 800,
                            whiteSpace: "nowrap",
                            background: "rgba(16, 185, 129, 0.2)",
                            padding: "2px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          الإجابة الصحيحة ✓
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  marginTop: "1.25rem",
                }}
              >
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isProcessingAction}
                  style={{ flex: 1 }}
                >
                  {questionModal.isEdit
                    ? "حفظ تعديل السؤال"
                    : "حفظ السؤال وخياراته بالكامل"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() =>
                    setQuestionModal({ ...questionModal, isOpen: false })
                  }
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {optionModal.isOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            background: "rgba(0,0,0,0.8)",
          }}
        >
          <div
            className="form-card"
            role="dialog"
            aria-modal="true"
            style={{ width: "100%", maxWidth: "480px" }}
          >
            <h2 style={{ color: "#fff", marginBottom: "1rem" }}>
              {optionModal.isEdit ? "تعديل الخيار" : "إضافة خيار إجابة"}
            </h2>
            <form onSubmit={handleSaveExamOption}>
              <div className="form-group">
                <label className="form-label" htmlFor="exam-option">
                  نص الخيار
                </label>
                <input
                  id="exam-option"
                  required
                  className="form-input"
                  value={optionModal.option_text}
                  onChange={(e) =>
                    setOptionModal({
                      ...optionModal,
                      option_text: e.target.value,
                    })
                  }
                />
              </div>
              <label
                className="form-label"
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <input
                  type="checkbox"
                  checked={optionModal.is_correct}
                  onChange={(e) =>
                    setOptionModal({
                      ...optionModal,
                      is_correct: e.target.checked,
                    })
                  }
                />
                إجابة صحيحة
              </label>
              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  marginTop: "1.25rem",
                }}
              >
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isProcessingAction}
                  style={{ flex: 1 }}
                >
                  حفظ الخيار
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() =>
                    setOptionModal({ ...optionModal, isOpen: false })
                  }
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD MEMO */}
      {isAddMemoOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(8px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div
            className="form-card"
            style={{ width: "100%", maxWidth: "580px", position: "relative" }}
          >
            <button
              onClick={() => setIsAddMemoOpen(false)}
              style={{
                position: "absolute",
                top: "16px",
                left: "16px",
                color: "var(--text-muted)",
              }}
            >
              <X size={20} />
            </button>
            <h2
              style={{
                fontSize: "1.3rem",
                fontWeight: 900,
                color: "#fff",
                marginBottom: "1.25rem",
                textAlign: "center",
              }}
            >
              📚 رفع وإضافة مذكرة PDF جديدة
            </h2>
            <form onSubmit={handleSaveMemo}>
              {/* File Upload Box */}
              <div className="form-group" style={{ marginBottom: "1.25rem" }}>
                <label
                  className="form-label"
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    marginBottom: "6px",
                  }}
                >
                  ملف المذكرة (PDF) *
                </label>

                <input
                  type="file"
                  id="memo-pdf-upload"
                  accept=".pdf,application/pdf"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const sizeInMB =
                        (file.size / (1024 * 1024)).toFixed(1) + " MB";
                      setNewMemoData((prev) => ({
                        ...prev,
                        fileName: file.name,
                        fileSize: sizeInMB,
                        fileUrl: URL.createObjectURL(file),
                        title: prev.title.trim()
                          ? prev.title
                          : file.name
                              .replace(/\.[^/.]+$/, "")
                              .replace(/_/g, " "),
                      }));
                    }
                  }}
                />

                {newMemoData.fileName ? (
                  <div
                    style={{
                      border: "1px solid rgba(6, 182, 212, 0.4)",
                      background: "rgba(6, 182, 212, 0.08)",
                      borderRadius: "12px",
                      padding: "12px 16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "10px",
                          background: "rgba(239, 68, 68, 0.15)",
                          border: "1px solid rgba(239, 68, 68, 0.3)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--rose)",
                          flexShrink: 0,
                        }}
                      >
                        <FileText size={22} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            color: "#fff",
                            fontWeight: 700,
                            fontSize: "0.85rem",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {newMemoData.fileName}
                        </div>
                        <div
                          style={{
                            fontSize: "0.72rem",
                            color: "var(--cyan)",
                            marginTop: "2px",
                          }}
                        >
                          حجم الملف: {newMemoData.fileSize} • جاهز للرفع
                        </div>
                      </div>
                    </div>

                    <label
                      htmlFor="memo-pdf-upload"
                      className="btn-secondary"
                      style={{
                        padding: "6px 12px",
                        fontSize: "0.75rem",
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      <span>تغيير الملف</span>
                    </label>
                  </div>
                ) : (
                  <label
                    htmlFor="memo-pdf-upload"
                    style={{
                      border: "2px dashed rgba(255, 255, 255, 0.18)",
                      borderRadius: "12px",
                      padding: "24px 16px",
                      textAlign: "center",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      background: "rgba(15, 23, 42, 0.5)",
                      transition: "all 0.2s ease",
                      gap: "8px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--cyan)";
                      e.currentTarget.style.background =
                        "rgba(6, 182, 212, 0.06)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor =
                        "rgba(255, 255, 255, 0.18)";
                      e.currentTarget.style.background =
                        "rgba(15, 23, 42, 0.5)";
                    }}
                  >
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "12px",
                        background: "rgba(6, 182, 212, 0.12)",
                        color: "var(--cyan)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <UploadCloud size={24} />
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "0.88rem",
                          fontWeight: 800,
                          color: "#ffffff",
                        }}
                      >
                        انقر لاختيار وتحديد ملف المذكرة (PDF)
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                          marginTop: "4px",
                        }}
                      >
                        يدعم ملفات PDF والشروحات والخرائط الذهنية حتى 100
                        ميجابايت
                      </div>
                    </div>
                  </label>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <label className="form-label">عنوان المذكرة *</label>
                <input
                  type="text"
                  required
                  value={newMemoData.title}
                  onChange={(e) =>
                    setNewMemoData({ ...newMemoData, title: e.target.value })
                  }
                  placeholder="مذكرة التفاضل والتكامل..."
                  className="form-input"
                />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.75rem",
                  marginBottom: "1rem",
                }}
              >
                <div>
                  <label className="form-label">الصف الدراسي</label>
                  <select
                    value={newMemoData.grade}
                    onChange={(e) =>
                      setNewMemoData({ ...newMemoData, grade: e.target.value })
                    }
                    className="form-input"
                    style={{ background: "#0b1120", color: "#fff" }}
                  >
                    {GRADES.map((g) => (
                      <option key={g.id} value={g.name}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">عدد الصفحات</label>
                  <input
                    type="number"
                    value={newMemoData.pages}
                    onChange={(e) =>
                      setNewMemoData({ ...newMemoData, pages: e.target.value })
                    }
                    className="form-input"
                  />
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  marginTop: "1.25rem",
                }}
              >
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1 }}
                >
                  <span>رفع المذكرة</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddMemoOpen(false)}
                  className="btn-secondary"
                >
                  <span>إلغاء</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
