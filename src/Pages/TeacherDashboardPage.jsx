import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useStudent } from "../context/useStudent";
import GradeFilter from "../Components/GradeFilter";
import useUrlState from "../hooks/useUrlState";
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
  Users,
  Clock,
  Key,
  CheckCircle2,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  Phone,
  PowerOff,
  RotateCcw,
} from "lucide-react";
import StudentExamHistoryModal from "../Components/StudentExamHistoryModal";
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
    if (
      device &&
      typeof device === "object" &&
      device.is_active !== false &&
      device.status !== "inactive" &&
      device.status !== "revoked" &&
      Boolean(device.device_identifier || device.identifier || device.id)
    )
      return true;
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
  return [
    "inactive",
    "cancelled",
    "canceled",
    "deactivated",
    "disabled",
  ].includes(String(status || "").toLowerCase());
}

function findApprovedSubscriptionForStudent(student, approvedSubscriptions) {
  const studentId =
    student?.student_id ||
    student?.student?.id ||
    student?.user?.id ||
    student?.id;
  const subscriptionId =
    student?.subscription_id ||
    student?.subscription?.id ||
    student?.active_subscription?.id ||
    student?.subscriptions?.[0]?.id;

  return approvedSubscriptions.find((item) => {
    const itemStudentId =
      item.student?.id || item.user?.id || item.student_id || item.user_id;
    const itemSubscriptionId =
      item.subscription_id ||
      item.subscription?.id ||
      item.active_subscription?.id ||
      item.subscriptions?.[0]?.id ||
      item.id;

    return (
      (studentId != null &&
        itemStudentId != null &&
        String(itemStudentId) === String(studentId)) ||
      (subscriptionId != null &&
        itemSubscriptionId != null &&
        String(itemSubscriptionId) === String(subscriptionId)) ||
      (item.phone &&
        student?.phone &&
        String(item.phone).replace(/\D/g, "") ===
          String(student.phone).replace(/\D/g, ""))
    );
  });
}

function getStudentSubscriptionId(student, approvedRecord) {
  return (
    student?.subscription_id ||
    student?.subscription?.id ||
    student?.active_subscription?.id ||
    student?.subscriptions?.[0]?.id ||
    approvedRecord?.subscription_id ||
    approvedRecord?.subscription?.id ||
    approvedRecord?.active_subscription?.id ||
    approvedRecord?.subscriptions?.[0]?.id ||
    approvedRecord?.id ||
    null
  );
}

function isStudentRecordActive(student, approvedRecord) {
  const studentProfile = student?.student || student?.user || student;
  const subscription = getSubscriptionRecord(approvedRecord || student);
  const status = getSubscriptionStatus(approvedRecord, student);

  return (
    student?.is_active !== false &&
    student?.isActive !== false &&
    studentProfile?.is_active !== false &&
    studentProfile?.isActive !== false &&
    subscription?.is_active !== false &&
    (!status || !isDeactivatedStatus(status))
  );
}

function collectStatuses(...records) {
  return records.flatMap((record) => {
    if (!record || typeof record !== "object") return [];
    const subscription = getSubscriptionRecord(record);
    const codeObj =
      record.subscription_code && typeof record.subscription_code === "object"
        ? record.subscription_code
        : null;
    return [
      subscription?.status,
      subscription?.approval_status,
      record.subscription_status,
      record.status,
      record.approval_status,
      record.code_status,
      record.subscription_code_status,
      codeObj?.status,
      subscription?.code?.status,
    ]
      .filter((status) => status != null && status !== "")
      .map((status) => String(status).toLowerCase());
  });
}

function buildPendingIdSets(pendingRequests) {
  const studentIds = new Set();
  const subscriptionIds = new Set();
  for (const req of pendingRequests || []) {
    [req?.student_id, req?.user_id, req?.student?.id, req?.user?.id].forEach(
      (id) => id != null && studentIds.add(String(id)),
    );
    [
      req?.subscription_id,
      req?.subscription?.id,
      req?.active_subscription?.id,
      req?.id,
    ].forEach((id) => id != null && subscriptionIds.add(String(id)));
  }
  return { studentIds, subscriptionIds };
}

// A student whose activation request is still pending or was rejected is not
// a real member yet, so he must not appear in the students roster.
// GET /admin/students returns every student record, so we filter here.
function isStudentHiddenFromRoster(
  student,
  approvedRecord,
  pendingIds,
  approvedReady,
) {
  const statuses = collectStatuses(student, approvedRecord);
  if (statuses.some((status) => ["pending", "rejected"].includes(status))) {
    return true;
  }

  const studentId = student?.student_id ?? student?.id;
  if (studentId != null && pendingIds.studentIds.has(String(studentId)))
    return true;

  const subscriptionId =
    student?.subscription_id ??
    student?.subscription?.id ??
    student?.active_subscription?.id ??
    student?.subscriptions?.[0]?.id;
  if (
    subscriptionId != null &&
    pendingIds.subscriptionIds.has(String(subscriptionId))
  ) {
    return true;
  }

  // Cancelled subscription that was never approved = rejected request.
  if (
    approvedReady &&
    !approvedRecord &&
    statuses.some((status) => isDeactivatedStatus(status))
  ) {
    return true;
  }

  return false;
}

function formatSubscriptionExpiry(value) {
  if (!value) return "—";
  const rawValue = String(value).trim();
  const dateMatch = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateMatch) return `${dateMatch[3]}/${dateMatch[2]}/${dateMatch[1]}`;

  const parsedDate = new Date(rawValue);
  if (Number.isNaN(parsedDate.getTime())) return rawValue;
  return new Intl.DateTimeFormat("ar-EG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsedDate);
}

// "lessons" / "quizzes" / "memos" are kept here only so old links like
// /dashboard?tab=memos still resolve and get redirected to their own pages.
const dashboardTabs = new Set([
  "requests",
  "approved",
  "students",
  "codes",
  "lessons",
  "quizzes",
  "memos",
]);
const gradeNames = new Set([BRANCHES[0], ...GRADES.map((grade) => grade.name)]);
const codeGradeIds = new Set(
  GRADES.map((grade) => String(grade.numericId || GRADE_ID_MAP[grade.id] || 1)),
);
const DASHBOARD_URL_SCHEMA = {
  tab: {
    defaultValue: "requests",
    normalize: (value) => (dashboardTabs.has(value) ? value : null),
  },
  search: { defaultValue: "", normalize: (value) => value.slice(0, 120) },
  grade: {
    defaultValue: BRANCHES[0],
    normalize: (value) => (gradeNames.has(value) ? value : null),
  },
  approvedGrade: {
    defaultValue: BRANCHES[0],
    normalize: (value) => (gradeNames.has(value) ? value : null),
  },
  approvedStatus: {
    defaultValue: "all",
    normalize: (value) =>
      ["all", "active", "deactivated"].includes(value) ? value : null,
  },
  studentsStatus: {
    defaultValue: "all",
    normalize: (value) =>
      ["all", "active", "deactivated"].includes(value) ? value : null,
  },
  codesStatus: {
    defaultValue: "all",
    normalize: (value) =>
      ["all", "active", "deactivated"].includes(value) ? value : null,
  },
  requestsSearch: {
    defaultValue: "",
    normalize: (value) => value.slice(0, 120),
  },
  requestsGrade: {
    defaultValue: BRANCHES[0],
    normalize: (value) => (gradeNames.has(value) ? value : null),
  },
  codesGrade: {
    defaultValue: "1",
    normalize: (value) => (codeGradeIds.has(value) ? value : null),
  },
  codesSearch: { defaultValue: "", normalize: (value) => value.slice(0, 120) },
  page: {
    defaultValue: "1",
    normalize: (value) =>
      /^\d+$/.test(value) && Number(value) > 0 && Number(value) <= 500
        ? String(Number(value))
        : null,
  },
};

export default function TeacherDashboardPage() {
  const [urlState, setUrlState] = useUrlState(DASHBOARD_URL_SCHEMA);
  const {
    // lessonsList / adminExamsList are only passed to StudentExamHistoryModal
    lessonsList,
    adminExamsList,
    pendingRequests,
    approvedSubscriptions,
    isLoadingRequests,
    isLoadingApproved,
    fetchPendingRequests,
    fetchApprovedStudents,
    approveActivationRequest,
    cancelActivationRequest,
    deactivateStudentSubscription,
    deactivateAndDeleteStudentRecord,
    deleteDeactivatedStudentRecord,
    resetTrustedDevice,
    createStudentByAdmin,
    updateStudentByAdmin,
    showToast,
    subscriptionCodesList,
    isLoadingCodes,
    fetchSubscriptionCodes,
    paginatedStudents,
    studentsPagination,
    isLoadingStudents,
    fetchAdminStudents,
    getStudentDetails,
  } = useStudent();

  const navigate = useNavigate();
  // Active Main Tab: 'requests' | 'approved' | 'students' | 'codes'
  const requestedTab = urlState.tab;

  // Lessons, exams and memos live on their own pages now.
  useEffect(() => {
    if (requestedTab === "lessons") {
      navigate("/lessons", { replace: true });
    } else if (requestedTab === "quizzes") {
      navigate("/exams", { replace: true });
    } else if (requestedTab === "memos") {
      navigate("/memos", { replace: true });
    }
  }, [requestedTab, navigate]);

  const activeTab = ["approved", "students", "codes"].includes(requestedTab)
    ? requestedTab
    : "requests";
  const setActiveTab = (tab) => setUrlState({ tab });
  const searchQuery = urlState.search;
  const gradeFilter = urlState.grade;
  const approvedGradeFilter = urlState.approvedGrade;
  const approvedStatus = urlState.approvedStatus;
  const studentsStatus = urlState.studentsStatus;
  const codesStatus = urlState.codesStatus;
  const requestsSearch = urlState.requestsSearch;
  const requestsGrade = urlState.requestsGrade;
  const selectedCodesGrade = Number(urlState.codesGrade);
  const codesSearchQuery = urlState.codesSearch;
  const currentStudentsPage = Number(urlState.page);

  const setSearchQuery = (value, options = {}) =>
    setUrlState({ search: value, page: "1" }, options);
  const setGradeFilter = (value) => setUrlState({ grade: value, page: "1" });
  const setApprovedGradeFilter = (value) =>
    setUrlState({ approvedGrade: value });
  const setApprovedStatus = (value) => setUrlState({ approvedStatus: value });
  const setStudentsStatus = (value) =>
    setUrlState({ studentsStatus: value, page: "1" });
  const setCodesStatus = (value) => setUrlState({ codesStatus: value });
  const setRequestsSearch = (value, options = {}) =>
    setUrlState({ requestsSearch: value }, options);
  const setRequestsGrade = (value) => setUrlState({ requestsGrade: value });
  const setSelectedCodesGrade = (value) =>
    setUrlState({ codesGrade: String(value) });
  const setCodesSearchQuery = (value, options = {}) =>
    setUrlState({ codesSearch: value }, options);

  useEffect(() => {
    if (activeTab === "codes") fetchSubscriptionCodes(selectedCodesGrade);
  }, [activeTab, fetchSubscriptionCodes, selectedCodesGrade]);

  useEffect(() => {
    if (
      activeTab === "students" &&
      currentStudentsPage !== studentsPagination.current_page
    ) {
      fetchAdminStudents(currentStudentsPage);
    }
  }, [
    activeTab,
    currentStudentsPage,
    fetchAdminStudents,
    studentsPagination.current_page,
  ]);
  const [copiedCode, setCopiedCode] = useState(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [deactivationTarget, setDeactivationTarget] = useState(null);

  // --- Student Modals (API Schema Aligned) ---
  const [viewingStudent, setViewingStudent] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [examHistoryStudent, setExamHistoryStudent] = useState(null);
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
            code: detail.code || detail.subscription_code || prev?.code,
            subscription_code:
              detail.subscription_code ||
              detail.code ||
              prev?.subscription_code,
            grade: getArabicGradeName(
              detail.grade || prev?.grade,
              detail.grade_id || prev?.grade_id,
            ),
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

  // After approving / rejecting, re-sync every list that depends on it.
  // بعد قبول/رفض طلب تفعيل
  const refreshAfterActivationDecision = () =>
    Promise.allSettled([
      fetchPendingRequests?.(),
      fetchApprovedStudents?.(),
      fetchAdminStudents?.(currentStudentsPage),
      fetchSubscriptionCodes?.(selectedCodesGrade),
    ]);

  // بعد التعطيل أو الحذف النهائي
  const refreshAfterDeletion = () =>
    Promise.allSettled([
      fetchApprovedStudents?.(),
      fetchAdminStudents?.(currentStudentsPage),
      fetchPendingRequests?.(),
      fetchSubscriptionCodes?.(selectedCodesGrade),
    ]);

  const handleApproveRequest = async (id) => {
    setIsProcessingAction(true);
    try {
      await approveActivationRequest(id);
      await refreshAfterActivationDecision();
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleRejectRequest = async (id) => {
    setIsProcessingAction(true);
    try {
      await cancelActivationRequest(id);
      await refreshAfterActivationDecision();
    } finally {
      setIsProcessingAction(false);
    }
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

  const handleDeactivateAndDeleteStudentRow = async (
    std,
    subscriptionIdOverride,
  ) => {
    const approvedRecord = findApprovedSubscriptionForStudent(
      std,
      approvedSubscriptions,
    );
    const studentId =
      std.student_id || std.student?.id || std.user?.id || std.id;
    const subscriptionId =
      subscriptionIdOverride || getStudentSubscriptionId(std, approvedRecord);

    if (!subscriptionId) {
      showToast("تعذر العثور على معرّف اشتراك الطالب", "error");
      return { success: false };
    }

    setIsProcessingAction(true);
    try {
      return await deactivateAndDeleteStudentRecord({
        studentId,
        subscriptionId,
      });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleDeleteDeactivatedStudentRow = async (
    std,
    subscriptionIdOverride,
  ) => {
    const approvedRecord = findApprovedSubscriptionForStudent(
      std,
      approvedSubscriptions,
    );
    const studentId =
      std.student_id || std.student?.id || std.user?.id || std.id;
    const subscriptionId =
      subscriptionIdOverride || getStudentSubscriptionId(std, approvedRecord);

    if (!studentId && !subscriptionId) {
      showToast("تعذر العثور على معرّف الطالب أو الاشتراك", "error");
      return { success: false };
    }

    setIsProcessingAction(true);
    try {
      return await deleteDeactivatedStudentRecord({
        studentId,
        subscriptionId,
      });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const openStudentDeactivationConfirmation = (student) => {
    const approvedRecord = findApprovedSubscriptionForStudent(
      student,
      approvedSubscriptions,
    );
    const isActive = isStudentRecordActive(student, approvedRecord);
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
      type: isActive ? "student" : "delete-student",
      student,
      subscriptionId: getStudentSubscriptionId(student, approvedRecord),
      studentName,
      subscriptionCode,
    });
  };

  const confirmDeactivation = async () => {
    if (!deactivationTarget || isProcessingAction) return;
    let result;
    try {
      if (deactivationTarget.type === "student") {
        result = await handleDeactivateAndDeleteStudentRow(
          deactivationTarget.student,
          deactivationTarget.subscriptionId,
        );
        if (result?.deactivated && !result.success) {
          // السيرفر عطّل الاشتراك بس رفض حذفه
          setDeactivationTarget((current) =>
            current ? { ...current, type: "delete-student" } : current,
          );
        }
      } else if (deactivationTarget.type === "delete-student") {
        result = await handleDeleteDeactivatedStudentRow(
          deactivationTarget.student,
          deactivationTarget.subscriptionId,
        );
      } else {
        result = await handleDeactivate(deactivationTarget.subscriptionId);
      }
    } finally {
      if (result?.success) {
        setDeactivationTarget(null);
        await refreshAfterDeletion();
      } else if (result?.deactivated) {
        // اشتراك اتعطل حتى لو الحذف فشل، فلازم القوائم تتحدث
        await refreshAfterDeletion();
      }
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
      subscription?.subscription_id ||
      subscription?.subscription?.id ||
      subscription?.active_subscription?.id ||
      subscription?.subscriptions?.[0]?.id ||
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

  // Helper to check if an approved subscription item is active
  const getApprovedItemActiveState = (item) => {
    const studentObj = item.student || item.user || item;
    const subObj =
      item.subscription ||
      item.active_subscription ||
      item.subscriptions?.[0] ||
      item;
    const statusVal =
      getSubscriptionStatus(subObj, item, studentObj) || "active";
    const isDeactivated =
      isDeactivatedStatus(statusVal) ||
      subObj.is_active === false ||
      item.is_active === false;
    return !isDeactivated;
  };

  // Helper to check if a code item is inactive
  const getCodeItemInactiveState = useCallback(
    (item) => {
      const subscriptionCode = getSubscriptionCode(
        item.subscription_code,
        item.subscription,
        item,
      );
      const linkedApprovedRecord = approvedSubscriptions.find((record) => {
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
          item.student?.id || item.user?.id || item.student_id || item.user_id;
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
      });
      const linkedSubscription = getSubscriptionRecord(linkedApprovedRecord);
      const codeSubscription = getSubscriptionRecord(item);
      const inactiveStatuses = [
        "inactive",
        "cancelled",
        "canceled",
        "deactivated",
        "disabled",
        "expired",
      ];
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
        statusCandidates.find((status) => inactiveStatuses.includes(status)) ||
        statusCandidates[0] ||
        "";
      return inactiveStatuses.includes(linkedStatus);
    },
    [approvedSubscriptions],
  );

  // Stats for Approved Subscriptions
  const approvedStats = useMemo(() => {
    let active = 0;
    let deactivated = 0;
    for (const item of approvedSubscriptions) {
      if (getApprovedItemActiveState(item)) active++;
      else deactivated++;
    }
    return { total: approvedSubscriptions.length, active, deactivated };
  }, [approvedSubscriptions]);

  // Roster without pending / rejected activation requests
  const visibleRoster = useMemo(() => {
    const roster = Array.isArray(paginatedStudents) ? paginatedStudents : [];
    const pendingIds = buildPendingIdSets(pendingRequests);
    const approvedReady =
      !isLoadingApproved && approvedSubscriptions.length > 0;
    return roster.filter(
      (std) =>
        !isStudentHiddenFromRoster(
          std,
          findApprovedSubscriptionForStudent(std, approvedSubscriptions),
          pendingIds,
          approvedReady,
        ),
    );
  }, [
    paginatedStudents,
    pendingRequests,
    approvedSubscriptions,
    isLoadingApproved,
  ]);
  const hiddenRosterCount =
    (Array.isArray(paginatedStudents) ? paginatedStudents.length : 0) -
    visibleRoster.length;

  // Stats for Students Roster (loaded page)
  const studentsStats = useMemo(() => {
    const roster = visibleRoster;
    let active = 0;
    let deactivated = 0;
    for (const std of roster) {
      const studentSubscription = findApprovedSubscriptionForStudent(
        std,
        approvedSubscriptions,
      );
      if (isStudentRecordActive(std, studentSubscription)) active++;
      else deactivated++;
    }
    return { total: roster.length, active, deactivated };
  }, [visibleRoster, approvedSubscriptions]);

  // Stats for Codes
  const codesStats = useMemo(() => {
    let active = 0;
    let deactivated = 0;
    for (const item of subscriptionCodesList || []) {
      if (getCodeItemInactiveState(item)) deactivated++;
      else active++;
    }
    return { total: (subscriptionCodesList || []).length, active, deactivated };
  }, [subscriptionCodesList, getCodeItemInactiveState]);

  const filteredStudents = useMemo(() => {
    // The roster comes from the paginated admin students endpoint,
    // minus pending / rejected activation requests.
    const roster = visibleRoster;
    return roster.filter((std) => {
      const studentObj = std.student || std.user || std;
      const studentSubscription = findApprovedSubscriptionForStudent(
        std,
        approvedSubscriptions,
      );
      const stdName =
        `${std.first_name || studentObj.first_name || ""} ${std.last_name || studentObj.last_name || ""}`.trim() ||
        std.name ||
        studentObj.name ||
        "";
      const stdGrade = getArabicGradeName(
        std.grade || studentObj.grade,
        std.grade_id || studentObj.grade_id,
      );
      const matchesGrade =
        gradeFilter === BRANCHES[0] || stdGrade === gradeFilter;
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
          .includes(searchQuery.toLowerCase()) ||
        getSubscriptionCode(
          studentSubscription?.subscription_code,
          studentSubscription?.code,
          studentSubscription?.subscription,
        )
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      const isActive = isStudentRecordActive(std, studentSubscription);
      const matchesStatus =
        studentsStatus === "all" ||
        (studentsStatus === "active" && isActive) ||
        (studentsStatus === "deactivated" && !isActive);

      return matchesGrade && matchesSearch && matchesStatus;
    });
  }, [
    approvedSubscriptions,
    gradeFilter,
    visibleRoster,
    searchQuery,
    studentsStatus,
  ]);
  const studentsTotalCount = studentsPagination.total
    ? Math.max(
        studentsPagination.total - hiddenRosterCount,
        visibleRoster.length,
      )
    : filteredStudents.length;

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
      const studentGrade = getArabicGradeName(
        sub.grade || studentObj.grade,
        sub.grade_id || studentObj.grade_id,
      );
      const matchesGrade =
        approvedGradeFilter === BRANCHES[0] ||
        studentGrade === approvedGradeFilter;

      const matchesSearch =
        !searchQuery ||
        studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        subCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        phone.includes(searchQuery);

      const isActive = getApprovedItemActiveState(sub);
      const matchesStatus =
        approvedStatus === "all" ||
        (approvedStatus === "active" && isActive) ||
        (approvedStatus === "deactivated" && !isActive);

      return matchesGrade && matchesSearch && matchesStatus;
    });
  }, [approvedSubscriptions, approvedGradeFilter, searchQuery, approvedStatus]);

  // Filtered Pending Requests
  const filteredPendingRequests = useMemo(() => {
    return (pendingRequests || []).filter((req) => {
      const studentObj = req.student || req.user || req;
      const firstName = req.first_name || studentObj.first_name || "";
      const lastName = req.last_name || studentObj.last_name || "";
      const fullName =
        `${firstName} ${lastName}`.trim() || req.name || studentObj.name || "";
      const phone = req.phone || studentObj.phone || "";
      const parentPhone =
        req.parent_phone ||
        req.parentPhone ||
        studentObj.parent_phone ||
        studentObj.parentPhone ||
        "";
      const gradeId =
        req.grade_id ||
        studentObj.grade_id ||
        req.grade?.id ||
        studentObj.grade?.id ||
        1;
      const gradeTitle = getArabicGradeName(
        req.grade ||
          studentObj.grade ||
          req.grade_name ||
          studentObj.grade_name,
        gradeId,
      );

      const q = (requestsSearch || "").trim().toLowerCase();
      const matchesSearch =
        !q ||
        fullName.toLowerCase().includes(q) ||
        phone.includes(q) ||
        parentPhone.includes(q);
      const matchesGrade =
        requestsGrade === BRANCHES[0] || gradeTitle === requestsGrade;

      return matchesSearch && matchesGrade;
    });
  }, [pendingRequests, requestsSearch, requestsGrade]);

  // Filtered Subscription Codes
  const filteredCodes = useMemo(() => {
    return (subscriptionCodesList || []).filter((item) => {
      const isInactive = getCodeItemInactiveState(item);
      const matchesStatus =
        codesStatus === "all" ||
        (codesStatus === "active" && !isInactive) ||
        (codesStatus === "deactivated" && isInactive);

      if (!matchesStatus) return false;

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
  }, [
    subscriptionCodesList,
    codesSearchQuery,
    codesStatus,
    getCodeItemInactiveState,
  ]);

  return (
    <div
      className="container"
      style={{ paddingTop: "1.5rem", paddingBottom: "3rem" }}
    >
      <style>{`.modern-table .badge-tag { white-space: nowrap; }`}</style>

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
              if (event.target === event.currentTarget && !isProcessingAction) {
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
                    style={{
                      margin: "2px 0 8px",
                      color: "#fff",
                      fontSize: "1.15rem",
                    }}
                  >
                    {deactivationTarget.type === "delete-student"
                      ? "\u062a\u0623\u0643\u064a\u062f \u0627\u0644\u062d\u0630\u0641 \u0627\u0644\u0646\u0647\u0627\u0626\u064a"
                      : "\u062a\u0623\u0643\u064a\u062f \u0627\u0644\u062a\u0639\u0637\u064a\u0644 \u0648\u0627\u0644\u062d\u0630\u0641 \u0627\u0644\u0646\u0647\u0627\u0626\u064a"}
                  </h2>
                  <p
                    style={{
                      margin: 0,
                      color: "var(--text-muted)",
                      lineHeight: 1.8,
                      fontSize: "0.9rem",
                    }}
                  >
                    {deactivationTarget.type === "delete-student" ? (
                      <>
                        {
                          "\u0633\u064a\u062a\u0645 \u062d\u0630\u0641 \u0627\u0644\u0637\u0627\u0644\u0628 "
                        }
                        <strong style={{ color: "#fff" }}>
                          {deactivationTarget.studentName}
                        </strong>
                        {
                          " \u0648\u0627\u0634\u062a\u0631\u0627\u0643\u0647 \u0646\u0647\u0627\u0626\u064a\u064b\u0627. \u0644\u0646 \u064a\u0645\u0643\u0646 \u0627\u0644\u062a\u0631\u0627\u062c\u0639 \u0639\u0646 \u0647\u0630\u0627 \u0627\u0644\u0625\u062c\u0631\u0627\u0621."
                        }
                      </>
                    ) : (
                      <>
                        {
                          "\u0633\u064a\u062a\u0645 \u0623\u0648\u0644\u064b\u0627 \u062a\u0639\u0637\u064a\u0644 \u0627\u0634\u062a\u0631\u0627\u0643 "
                        }
                        <strong style={{ color: "#fff" }}>
                          {deactivationTarget.studentName}
                        </strong>
                        {
                          " \u062b\u0645 \u062d\u0630\u0641 \u0627\u0644\u0637\u0627\u0644\u0628 \u0648\u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643 \u0646\u0647\u0627\u0626\u064a\u064b\u0627. \u0644\u0646 \u064a\u0645\u0643\u0646 \u0627\u0644\u062a\u0631\u0627\u062c\u0639 \u0639\u0646 \u0647\u0630\u0627 \u0627\u0644\u0625\u062c\u0631\u0627\u0621."
                        }
                      </>
                    )}
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
                  كود الاشتراك:{" "}
                  <strong style={{ color: "#fff" }}>
                    {deactivationTarget.subscriptionCode}
                  </strong>
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
                  {isProcessingAction
                    ? deactivationTarget.type === "delete-student"
                      ? "\u062c\u0627\u0631\u064d \u0627\u0644\u062d\u0630\u0641 \u0627\u0644\u0646\u0647\u0627\u0626\u064a..."
                      : "\u062c\u0627\u0631\u064d \u0627\u0644\u062a\u0639\u0637\u064a\u0644 \u062b\u0645 \u0627\u0644\u062d\u0630\u0641..."
                    : deactivationTarget.type === "delete-student"
                      ? "\u062d\u0630\u0641 \u0646\u0647\u0627\u0626\u064a"
                      : "\u062a\u0639\u0637\u064a\u0644 \u062b\u0645 \u062d\u0630\u0641 \u0646\u0647\u0627\u0626\u064a"}
                </button>
              </div>
            </section>
          </div>
        </>
      )}
      {/* Professional Executive Header */}
      <div
        className="feature-card teacher-dashboard-hero"
        style={{
          padding: "1.5rem 2rem",
          marginBottom: "1.5rem",
          background:
            "linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.75) 100%)",
          border: "1px solid rgba(6, 182, 212, 0.25)",
          borderRadius: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1.25rem",
          boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.75rem",
              color: "var(--cyan)",
              fontWeight: 800,
              background: "rgba(6, 182, 212, 0.12)",
              padding: "4px 12px",
              borderRadius: "999px",
              border: "1px solid rgba(6, 182, 212, 0.25)",
              marginBottom: "8px",
            }}
          >
            <ShieldCheck size={14} />
            <span>منصة العميد في الرياضيات • لوحة تحكم المعلم</span>
          </div>
          <h1
            style={{
              fontSize: "1.55rem",
              fontWeight: 900,
              color: "#fff",
              margin: "0 0 6px",
            }}
          >
            لوحة الإدارة والتحكم الأكاديمي 👨‍🏫
          </h1>
          <p
            style={{
              fontSize: "0.86rem",
              color: "var(--text-muted)",
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            متابعة فورية لطلبات تفعيل الطلاب، الاشتراكات السارية، والأكواد
            المصدرة
          </p>
        </div>

        {/* Action Controls */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => {
              fetchPendingRequests();
              fetchApprovedStudents();
              showToast("تم تحديث ومزامنة البيانات من السيرفر بنجاح 🔄");
            }}
            className="btn-secondary"
            style={{ fontSize: "0.84rem", padding: "10px 16px", gap: "8px" }}
            title="مزامنة فورية مع السيرفر"
          >
            <RefreshCw size={15} />
            <span>تحديث البيانات</span>
          </button>

          <button
            onClick={() => setIsAddStudentOpen(true)}
            className="btn-primary"
            style={{
              fontSize: "0.85rem",
              padding: "10px 18px",
              gap: "8px",
              boxShadow: "0 4px 16px rgba(6, 182, 212, 0.35)",
            }}
          >
            <UserPlus size={16} />
            <span>إنشاء كود طالب جديد</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Overview Cards (4 Interactive Metrics) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        {/* KPI 1: Pending */}
        <div
          onClick={() => setActiveTab("requests")}
          className="feature-card"
          style={{
            padding: "1.25rem",
            cursor: "pointer",
            borderRadius: "16px",
            border:
              activeTab === "requests"
                ? "1.5px solid var(--amber)"
                : "1px solid rgba(245, 158, 11, 0.2)",
            background:
              activeTab === "requests"
                ? "rgba(245, 158, 11, 0.08)"
                : "rgba(15, 23, 42, 0.6)",
            transition: "all 0.2s ease",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <span
              style={{
                fontSize: "0.82rem",
                fontWeight: 700,
                color: "var(--text-muted)",
              }}
            >
              طلبات التفعيل المعلقة
            </span>
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: "rgba(245, 158, 11, 0.15)",
                color: "var(--amber)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Clock size={17} />
            </span>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 900, color: "#fff" }}>
            {pendingRequests.length}
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color:
                pendingRequests.length > 0 ? "var(--amber)" : "var(--text-dim)",
              marginTop: "4px",
              fontWeight: 600,
            }}
          >
            {pendingRequests.length > 0
              ? "● بحاجة للمراجعة والاعتماد"
              : "لا توجد طلبات جديدة"}
          </div>
        </div>

        {/* KPI 2: Approved */}
        <div
          onClick={() => setActiveTab("approved")}
          className="feature-card"
          style={{
            padding: "1.25rem",
            cursor: "pointer",
            borderRadius: "16px",
            border:
              activeTab === "approved"
                ? "1.5px solid var(--emerald)"
                : "1px solid rgba(16, 185, 129, 0.2)",
            background:
              activeTab === "approved"
                ? "rgba(16, 185, 129, 0.08)"
                : "rgba(15, 23, 42, 0.6)",
            transition: "all 0.2s ease",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <span
              style={{
                fontSize: "0.82rem",
                fontWeight: 700,
                color: "var(--text-muted)",
              }}
            >
              الاشتراكات المعتمدة
            </span>
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: "rgba(16, 185, 129, 0.15)",
                color: "var(--emerald)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Key size={17} />
            </span>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 900, color: "#fff" }}>
            {approvedSubscriptions.length}
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--emerald)",
              marginTop: "4px",
              fontWeight: 600,
            }}
          >
            ● اشتراكات سارية ومفعلة للأجهزة
          </div>
        </div>

        {/* KPI 3: Total Students */}
        <div
          onClick={() => setActiveTab("students")}
          className="feature-card"
          style={{
            padding: "1.25rem",
            cursor: "pointer",
            borderRadius: "16px",
            border:
              activeTab === "students"
                ? "1.5px solid var(--cyan)"
                : "1px solid rgba(6, 182, 212, 0.2)",
            background:
              activeTab === "students"
                ? "rgba(6, 182, 212, 0.08)"
                : "rgba(15, 23, 42, 0.6)",
            transition: "all 0.2s ease",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <span
              style={{
                fontSize: "0.82rem",
                fontWeight: 700,
                color: "var(--text-muted)",
              }}
            >
              سجل الطلاب الشامل
            </span>
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: "rgba(6, 182, 212, 0.15)",
                color: "var(--cyan)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Users size={17} />
            </span>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 900, color: "#fff" }}>
            {studentsTotalCount}
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--cyan)",
              marginTop: "4px",
              fontWeight: 600,
            }}
          >
            ● إجمالي طلاب الصفوف المسجلين
          </div>
        </div>

        {/* KPI 4: Codes */}
        <div
          onClick={() => setActiveTab("codes")}
          className="feature-card"
          style={{
            padding: "1.25rem",
            cursor: "pointer",
            borderRadius: "16px",
            border:
              activeTab === "codes"
                ? "1.5px solid var(--purple)"
                : "1px solid rgba(168, 85, 247, 0.2)",
            background:
              activeTab === "codes"
                ? "rgba(168, 85, 247, 0.08)"
                : "rgba(15, 23, 42, 0.6)",
            transition: "all 0.2s ease",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <span
              style={{
                fontSize: "0.82rem",
                fontWeight: 700,
                color: "var(--text-muted)",
              }}
            >
              أكواد الاشتراكات
            </span>
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: "rgba(168, 85, 247, 0.15)",
                color: "var(--purple)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <ShieldCheck size={17} />
            </span>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 900, color: "#fff" }}>
            {subscriptionCodesList.length > 0
              ? subscriptionCodesList.length
              : "توليد"}
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--purple)",
              marginTop: "4px",
              fontWeight: 600,
            }}
          >
            ● إدارة وتوليد الأكواد حسب الصف
          </div>
        </div>
      </div>

      {/* Main Administrative Tabs Bar (Exactly 4 focused tabs) */}
      <div
        className="teacher-admin-tabs"
        style={{
          display: "flex",
          gap: "0.6rem",
          flexWrap: "wrap",
          marginBottom: "1.5rem",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          paddingBottom: "1rem",
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
            padding: "10px 18px",
            fontSize: "0.88rem",
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
                padding: "2px 8px",
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
            padding: "10px 18px",
            fontSize: "0.88rem",
          }}
        >
          <Key size={16} style={{ color: "var(--emerald)" }} />
          <span>
            الاشتراكات المعتمدة والأكواد ({approvedSubscriptions.length})
          </span>
        </button>

        {/* TAB 3: ALL STUDENTS ROSTER */}
        <button
          onClick={() => setActiveTab("students")}
          className={`tab-btn ${activeTab === "students" ? "active" : ""}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 18px",
            fontSize: "0.88rem",
          }}
        >
          <Users size={16} style={{ color: "var(--cyan)" }} />
          <span>سجل الطلاب الشامل ({studentsTotalCount})</span>
        </button>

        {/* TAB 4: SUBSCRIPTION CODES (GET /api/v1/admin/subscription-codes) */}
        <button
          onClick={() => setActiveTab("codes")}
          className={`tab-btn ${activeTab === "codes" ? "active" : ""}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 18px",
            fontSize: "0.88rem",
          }}
        >
          <ShieldCheck size={16} style={{ color: "var(--purple)" }} />
          <span>أكواد الاشتراكات حسب الصف</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: PENDING ACTIVATION REQUESTS (GET /api/v1/admin/activation-requests) */}
      {/* ==================================================================== */}
      {activeTab === "requests" && (
        <div>
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
              <h3
                style={{
                  fontSize: "1.15rem",
                  fontWeight: 900,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Clock size={19} style={{ color: "var(--amber)" }} />
                <span>طلبات الطلاب الجديدة بانتظار الموافقة والتفعيل</span>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    padding: "2px 10px",
                    borderRadius: "999px",
                    background: "rgba(245, 158, 11, 0.15)",
                    color: "var(--amber)",
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                  }}
                >
                  {pendingRequests.length} طلب
                </span>
              </h3>
              <p
                style={{
                  fontSize: "0.82rem",
                  color: "var(--text-muted)",
                  marginTop: "4px",
                }}
              >
                بمجرد النقر على "قبول"، سيتم اعتماد الطالب وتوليد كود اشتراك
                رسمي له للولوج للمنصة مباشرة
              </p>
            </div>
          </div>

          {/* Modern Filter Bar for Requests */}
          <div className="modern-filter-bar">
            <div className="modern-filter-row">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  flexWrap: "wrap",
                  flex: "1 1 auto",
                }}
              >
                <div className="modern-search-box">
                  <span className="modern-search-icon">
                    <Search size={15} />
                  </span>
                  <input
                    type="text"
                    placeholder="بحث في الطلبات بالاسم أو الهاتف..."
                    value={requestsSearch}
                    onChange={(e) =>
                      setRequestsSearch(e.target.value, { replace: true })
                    }
                    className="modern-search-input"
                  />
                  {requestsSearch && (
                    <button
                      type="button"
                      onClick={() => setRequestsSearch("")}
                      className="modern-search-clear"
                      title="مسح البحث"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                <GradeFilter
                  value={requestsGrade}
                  onChange={setRequestsGrade}
                  includeAll
                  showLabel={false}
                />
              </div>

              {(requestsSearch || requestsGrade !== BRANCHES[0]) && (
                <button
                  type="button"
                  onClick={() => {
                    setRequestsSearch("");
                    setRequestsGrade(BRANCHES[0]);
                  }}
                  className="btn-secondary"
                  style={{
                    fontSize: "0.78rem",
                    padding: "6px 12px",
                    gap: "6px",
                  }}
                >
                  <RotateCcw size={13} />
                  <span>إعادة تعيين الفلاتر</span>
                </button>
              )}
            </div>
          </div>

          {isLoadingRequests ? (
            <div
              style={{
                padding: "3.5rem",
                textAlign: "center",
                color: "var(--text-muted)",
              }}
            >
              <RefreshCw
                size={24}
                className="animate-spin"
                style={{ margin: "0 auto 10px", color: "var(--amber)" }}
              />
              <p>جاري تحميل طلبات التفعيل من السيرفر...</p>
            </div>
          ) : pendingRequests.length === 0 ? (
            <div
              className="form-card"
              style={{
                maxWidth: "100%",
                textAlign: "center",
                padding: "3.5rem 1rem",
                background:
                  "linear-gradient(145deg, rgba(15, 23, 42, 0.9), rgba(10, 15, 28, 0.95))",
                border: "1px solid rgba(16, 185, 129, 0.2)",
                borderRadius: "18px",
              }}
            >
              <div
                style={{
                  width: "58px",
                  height: "58px",
                  borderRadius: "50%",
                  background: "rgba(16, 185, 129, 0.15)",
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
                  fontWeight: 900,
                  color: "#fff",
                  marginBottom: "6px",
                }}
              >
                لا توجد طلبات تفعيل معلقة حالياً
              </h4>
              <p
                style={{
                  fontSize: "0.84rem",
                  color: "var(--text-muted)",
                  margin: 0,
                }}
              >
                جميع طلبات اشتراك الطلاب تم البت فيها والموافقة عليها بنجاح 🎉
              </p>
            </div>
          ) : filteredPendingRequests.length === 0 ? (
            <div
              className="form-card"
              style={{
                maxWidth: "100%",
                textAlign: "center",
                padding: "3rem 1rem",
                background: "rgba(15, 23, 42, 0.8)",
                borderRadius: "18px",
              }}
            >
              <p style={{ color: "var(--text-muted)", marginBottom: "1rem" }}>
                لا توجد طلبات مطابقة للبحث أو التصفية المختارة
              </p>
              <button
                type="button"
                onClick={() => {
                  setRequestsSearch("");
                  setRequestsGrade(BRANCHES[0]);
                }}
                className="btn-secondary"
                style={{
                  fontSize: "0.8rem",
                  padding: "6px 14px",
                  margin: "0 auto",
                }}
              >
                إظهار جميع الطلبات المعلقة
              </button>
            </div>
          ) : (
            <div className="modern-table-container">
              {/* Desktop Table View (> 768px) */}
              <div className="modern-table-desktop-view">
                <div className="modern-table-scroll">
                  <table className="modern-table">
                    <thead>
                      <tr>
                        <th style={{ width: "26%" }}>اسم الطالب</th>
                        <th style={{ width: "16%" }}>الصف الدراسي</th>
                        <th style={{ width: "16%" }}>هاتف الطالب</th>
                        <th style={{ width: "16%" }}>هاتف ولي الأمر</th>
                        <th style={{ width: "12%" }}>تاريخ التقديم</th>
                        <th style={{ width: "14%", textAlign: "center" }}>
                          قرار المعلم
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPendingRequests.map((req) => {
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

                        const gradeTitle = getArabicGradeName(
                          req.grade ||
                            studentObj.grade ||
                            req.grade_name ||
                            studentObj.grade_name,
                          gradeId,
                        );

                        const studentPhone =
                          req.phone || studentObj.phone || "—";
                        const parentPhone =
                          req.parent_phone ||
                          req.parentPhone ||
                          studentObj.parent_phone ||
                          studentObj.parentPhone ||
                          "—";

                        return (
                          <tr key={req.id}>
                            <td>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                }}
                              >
                                <div
                                  style={{
                                    width: "36px",
                                    height: "36px",
                                    borderRadius: "11px",
                                    background:
                                      "linear-gradient(135deg, #f59e0b, #d97706)",
                                    color: "#fff",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontWeight: 900,
                                    fontSize: "0.85rem",
                                    flexShrink: 0,
                                    boxShadow:
                                      "0 3px 10px rgba(245, 158, 11, 0.25)",
                                  }}
                                >
                                  {studentFullName.charAt(0)}
                                </div>
                                <div>
                                  <div
                                    style={{
                                      fontWeight: 800,
                                      color: "#fff",
                                      fontSize: "0.88rem",
                                    }}
                                  >
                                    {studentFullName}
                                  </div>
                                  <span
                                    style={{
                                      fontSize: "0.7rem",
                                      color: "#f59e0b",
                                      fontWeight: 700,
                                    }}
                                  >
                                    طلب قيد المراجعة
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="badge-tag">{gradeTitle}</span>
                            </td>
                            <td
                              style={{
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
                                color: "var(--text-muted)",
                                fontSize: "0.8rem",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {req.created_at
                                ? new Date(req.created_at).toLocaleDateString(
                                    "ar-EG",
                                  )
                                : "اليوم"}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <div
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  justifyContent: "center",
                                }}
                              >
                                <button
                                  onClick={() =>
                                    handleApproveRequest(
                                      req.subscription_id ||
                                        req.subscription?.id ||
                                        req.id,
                                    )
                                  }
                                  disabled={isProcessingAction}
                                  className="btn-primary"
                                  style={{
                                    padding: "6px 14px",
                                    fontSize: "0.78rem",
                                    background:
                                      "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                    boxShadow:
                                      "0 2px 12px rgba(16, 185, 129, 0.35)",
                                    gap: "5px",
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
                                        req.subscription?.id ||
                                        req.id,
                                    )
                                  }
                                  disabled={isProcessingAction}
                                  className="btn-secondary"
                                  style={{
                                    padding: "6px 12px",
                                    fontSize: "0.78rem",
                                    color: "#fda4af",
                                    borderColor: "rgba(244, 63, 94, 0.35)",
                                    gap: "5px",
                                  }}
                                  title="إلغاء / رفض طلب التفعيل"
                                >
                                  <XCircle size={14} />
                                  <span>رفض</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Cards View (<= 768px) */}
              <div className="modern-cards-mobile-view">
                {filteredPendingRequests.map((req) => {
                  const studentObj = req.student || req.user || req;
                  const firstName =
                    req.first_name || studentObj.first_name || "";
                  const lastName = req.last_name || studentObj.last_name || "";
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

                  const gradeTitle = getArabicGradeName(
                    req.grade ||
                      studentObj.grade ||
                      req.grade_name ||
                      studentObj.grade_name,
                    gradeId,
                  );

                  const studentPhone = req.phone || studentObj.phone || "—";
                  const parentPhone =
                    req.parent_phone ||
                    req.parentPhone ||
                    studentObj.parent_phone ||
                    studentObj.parentPhone ||
                    "—";

                  return (
                    <div key={req.id} className="student-mobile-card">
                      <div className="student-mobile-card-header">
                        <div className="student-card-info">
                          <div className="student-card-avatar is-pending">
                            {studentFullName.charAt(0)}
                          </div>
                          <div>
                            <div className="student-card-name">
                              {studentFullName}
                            </div>
                            <div className="student-card-meta">
                              <span className="badge-tag">{gradeTitle}</span>
                              <span className="student-card-id">
                                طلب اشتراك جديد
                              </span>
                            </div>
                          </div>
                        </div>

                        <span className="status-badge-pill pending-pill">
                          <span className="status-dot" />
                          <span>قيد المراجعة</span>
                        </span>
                      </div>

                      <div className="student-mobile-card-body">
                        <div className="card-info-grid">
                          <div className="card-info-col">
                            <span className="card-label">هاتف الطالب:</span>
                            <span className="card-value font-mono ltr">
                              {studentPhone}
                            </span>
                          </div>
                          <div className="card-info-col">
                            <span className="card-label">هاتف ولي الأمر:</span>
                            <span className="card-value font-mono ltr">
                              {parentPhone}
                            </span>
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          تاريخ الطلب:{" "}
                          {req.created_at
                            ? new Date(req.created_at).toLocaleDateString(
                                "ar-EG",
                              )
                            : "اليوم"}
                        </div>
                      </div>

                      <div className="student-mobile-card-footer">
                        <button
                          onClick={() =>
                            handleApproveRequest(
                              req.subscription_id ||
                                req.subscription?.id ||
                                req.id,
                            )
                          }
                          disabled={isProcessingAction}
                          className="btn-card-action btn-success-action"
                        >
                          <Check size={15} />
                          <span>قبول وتفعيل</span>
                        </button>
                        <button
                          onClick={() =>
                            handleRejectRequest(
                              req.subscription_id ||
                                req.subscription?.id ||
                                req.id,
                            )
                          }
                          disabled={isProcessingAction}
                          className="btn-card-action btn-danger-action"
                        >
                          <XCircle size={15} />
                          <span>رفض الطلب</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="modern-table-footer">
                <span>
                  عرض <strong>{filteredPendingRequests.length}</strong> من
                  إجمالي <strong>{pendingRequests.length}</strong> طلب معلق
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: APPROVED STUDENTS & CODES (GET /api/v1/admin/approved-students) */}
      {/* ==================================================================== */}
      {activeTab === "approved" && (
        <div>
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
              <h3
                style={{
                  fontSize: "1.15rem",
                  fontWeight: 900,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Key size={19} style={{ color: "var(--emerald)" }} />
                <span>قائمة الطلاب المعتمدين وأكواد الاشتراك الفعالة</span>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    padding: "2px 10px",
                    borderRadius: "999px",
                    background: "rgba(16, 185, 129, 0.15)",
                    color: "var(--emerald)",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                  }}
                >
                  {approvedStats.total} اشتراك
                </span>
              </h3>
              <p
                style={{
                  fontSize: "0.82rem",
                  color: "var(--text-muted)",
                  marginTop: "4px",
                }}
              >
                استعراض ومتابعة اشتراكات الطلاب، نسخ أكواد الدخول، وتصفية أو
                تعطيل الحسابات عند الحاجة
              </p>
            </div>
          </div>

          {/* Professional Filter Bar */}
          <div className="modern-filter-bar">
            {/* Row 1: Search & Grade */}
            <div className="modern-filter-row">
              <div className="modern-search-box">
                <span className="modern-search-icon">
                  <Search size={15} />
                </span>
                <input
                  type="text"
                  placeholder="بحث بالاسم أو الكود أو الهاتف..."
                  value={searchQuery}
                  onChange={(e) =>
                    setSearchQuery(e.target.value, { replace: true })
                  }
                  className="modern-search-input"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="modern-search-clear"
                    title="مسح البحث"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Status Segmented Filter */}
              <div className="status-filter-wrapper">
                <div
                  className="status-filter-group"
                  role="group"
                  aria-label="تصفية حسب الحالة"
                >
                  <button
                    type="button"
                    onClick={() => setApprovedStatus("all")}
                    className={`status-filter-btn ${approvedStatus === "all" ? "is-active" : ""}`}
                  >
                    <span>الكل</span>
                    <span className="status-filter-count">
                      {approvedStats.total}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setApprovedStatus("active")}
                    className={`status-filter-btn ${approvedStatus === "active" ? "is-active" : ""}`}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "var(--emerald)",
                      }}
                    />
                    <span>النشطين</span>
                    <span className="status-filter-count">
                      {approvedStats.active}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setApprovedStatus("deactivated")}
                    className={`status-filter-btn is-deactivated ${approvedStatus === "deactivated" ? "is-active" : ""}`}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "var(--rose)",
                      }}
                    />
                    <span>المعطلين</span>
                    <span className="status-filter-count">
                      {approvedStats.deactivated}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Row 2: Grade Pills & Reset Action */}
            <div
              className="modern-filter-row"
              style={{
                paddingTop: "0.25rem",
                borderTop: "1px solid rgba(148, 163, 184, 0.08)",
              }}
            >
              <GradeFilter
                value={approvedGradeFilter}
                onChange={setApprovedGradeFilter}
                includeAll
                showLabel={true}
              />

              {(searchQuery ||
                approvedGradeFilter !== BRANCHES[0] ||
                approvedStatus !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setApprovedGradeFilter(BRANCHES[0]);
                    setApprovedStatus("all");
                  }}
                  className="btn-secondary"
                  style={{
                    fontSize: "0.78rem",
                    padding: "6px 14px",
                    gap: "6px",
                  }}
                >
                  <RotateCcw size={13} />
                  <span>إعادة تعيين الفلاتر</span>
                </button>
              )}
            </div>
          </div>

          {isLoadingApproved ? (
            <div
              style={{
                padding: "3.5rem",
                textAlign: "center",
                color: "var(--text-muted)",
              }}
            >
              <RefreshCw
                size={24}
                className="animate-spin"
                style={{ margin: "0 auto 10px", color: "var(--emerald)" }}
              />
              <p>جاري تحميل الاشتراكات المعتمدة...</p>
            </div>
          ) : filteredApproved.length === 0 ? (
            <div
              className="form-card"
              style={{
                maxWidth: "100%",
                textAlign: "center",
                padding: "3.5rem 1rem",
                background:
                  "linear-gradient(145deg, rgba(15, 23, 42, 0.9), rgba(10, 15, 28, 0.95))",
                border: "1px solid rgba(148, 163, 184, 0.14)",
                borderRadius: "18px",
              }}
            >
              {approvedStatus === "deactivated" ? (
                <>
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
                    <CheckCircle2 size={30} />
                  </div>
                  <h4
                    style={{
                      color: "#fff",
                      fontSize: "1.05rem",
                      fontWeight: 900,
                      marginBottom: "6px",
                    }}
                  >
                    لا توجد اشتراكات معطلة حالياً ✨
                  </h4>
                  <p
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "0.84rem",
                      margin: "0 0 1rem",
                    }}
                  >
                    جميع الاشتراكات المعتمدة في هذا القسم نشطة وسارية الصلاحية
                  </p>
                  <button
                    type="button"
                    onClick={() => setApprovedStatus("all")}
                    className="btn-secondary"
                    style={{
                      fontSize: "0.8rem",
                      padding: "7px 16px",
                      margin: "0 auto",
                    }}
                  >
                    عرض جميع الاشتراكات
                  </button>
                </>
              ) : (
                <>
                  <p
                    style={{ color: "var(--text-muted)", marginBottom: "1rem" }}
                  >
                    لا توجد اشتراكات مطابقة لمعايير البحث والتصفية المحددة
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setApprovedGradeFilter(BRANCHES[0]);
                      setApprovedStatus("all");
                    }}
                    className="btn-secondary"
                    style={{
                      fontSize: "0.8rem",
                      padding: "7px 16px",
                      margin: "0 auto",
                    }}
                  >
                    إعادة ضبط الفلاتر
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="modern-table-container">
              {/* Desktop Table View (> 768px) */}
              <div className="modern-table-desktop-view">
                <div className="modern-table-scroll">
                  <table className="modern-table">
                    <thead>
                      <tr>
                        <th style={{ width: "22%" }}>اسم الطالب</th>
                        <th style={{ width: "13%", textAlign: "center" }}>
                          الصف الدراسي
                        </th>
                        <th style={{ width: "18%", textAlign: "center" }}>
                          كود الاشتراك
                        </th>
                        <th style={{ width: "13%", textAlign: "center" }}>
                          حالة الاشتراك
                        </th>
                        <th style={{ width: "12%", textAlign: "center" }}>
                          تاريخ البداية
                        </th>
                        <th style={{ width: "12%" }}>الهاتف</th>
                        <th style={{ width: "14%", textAlign: "center" }}>
                          الإجراءات
                        </th>
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
                          ) || "—";

                        const statusVal =
                          getSubscriptionStatus(subObj, item, studentObj) ||
                          "active";
                        const isDeactivated =
                          isDeactivatedStatus(statusVal) ||
                          subObj.is_active === false ||
                          item.is_active === false;
                        const isActive = !isDeactivated;

                        const subscriptionStartDateRaw =
                          subObj.start_date ||
                          item.start_date ||
                          studentObj.start_date ||
                          subObj.subscription?.start_date ||
                          item.subscription?.start_date ||
                          "";
                        const subscriptionStartDate = formatSubscriptionExpiry(
                          subscriptionStartDateRaw,
                        );
                        const phone = studentObj.phone || item.phone || "—";
                        const isCopied = copiedCode === subscriptionCode;

                        return (
                          <tr
                            key={item.id}
                            className={!isActive ? "row-deactivated" : ""}
                          >
                            <td>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                }}
                              >
                                <div
                                  style={{
                                    width: "36px",
                                    height: "36px",
                                    borderRadius: "11px",
                                    background: isActive
                                      ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                                      : "linear-gradient(135deg, #e11d48 0%, #9f1239 100%)",
                                    color: "#fff",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontWeight: 900,
                                    fontSize: "0.85rem",
                                    flexShrink: 0,
                                    boxShadow: isActive
                                      ? "0 3px 10px rgba(16, 185, 129, 0.25)"
                                      : "0 3px 10px rgba(225, 29, 72, 0.25)",
                                  }}
                                >
                                  {studentName.charAt(0)}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <div
                                    title={studentName}
                                    style={{
                                      fontWeight: 800,
                                      color: "#fff",
                                      fontSize: "0.88rem",
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {studentName}
                                  </div>
                                  <span
                                    style={{
                                      fontSize: "0.7rem",
                                      color: "var(--text-dim)",
                                    }}
                                  >
                                    ID:{" "}
                                    {item.student_id ||
                                      studentObj.id ||
                                      item.id}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <span className="badge-tag">{gradeName}</span>
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <div
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  background: "rgba(6, 182, 212, 0.08)",
                                  border: "1px solid rgba(6, 182, 212, 0.22)",
                                  padding: "4px 10px",
                                  borderRadius: "8px",
                                }}
                              >
                                <span
                                  style={{
                                    fontFamily: "monospace",
                                    fontWeight: 900,
                                    color: "var(--cyan)",
                                    fontSize: "0.88rem",
                                    letterSpacing: "0.8px",
                                    direction: "ltr",
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
                                      color: isCopied
                                        ? "var(--emerald)"
                                        : "var(--text-muted)",
                                      cursor: "pointer",
                                      padding: "2px",
                                      display: "flex",
                                    }}
                                    title="نسخ الكود"
                                  >
                                    {isCopied ? (
                                      <Check size={14} />
                                    ) : (
                                      <Copy size={14} />
                                    )}
                                  </button>
                                )}
                              </div>
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "5px",
                                  fontSize: "0.74rem",
                                  fontWeight: 800,
                                  padding: "4px 10px",
                                  borderRadius: "999px",
                                  background: isActive
                                    ? "rgba(16, 185, 129, 0.14)"
                                    : "rgba(244, 63, 94, 0.14)",
                                  color: isActive
                                    ? "var(--emerald)"
                                    : "#fda4af",
                                  border: `1px solid ${isActive ? "rgba(16, 185, 129, 0.3)" : "rgba(244, 63, 94, 0.3)"}`,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                <span
                                  style={{
                                    width: "6px",
                                    height: "6px",
                                    borderRadius: "50%",
                                    background: isActive
                                      ? "var(--emerald)"
                                      : "var(--rose)",
                                  }}
                                />
                                <span>
                                  {isActive ? "نشط ومفعل" : "معطل / محظور"}
                                </span>
                              </span>
                            </td>
                            <td
                              style={{
                                color: "var(--text-muted)",
                                fontSize: "0.82rem",
                                textAlign: "center",
                                whiteSpace: "nowrap",
                              }}
                              title={String(subscriptionStartDateRaw)}
                            >
                              {subscriptionStartDate}
                            </td>
                            <td
                              style={{
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
                            <td style={{ textAlign: "center" }}>
                              <div
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  justifyContent: "center",
                                  flexWrap: "nowrap",
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
                                            (subObj !== item
                                              ? subObj.id
                                              : null) ||
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
                                        borderColor: "rgba(244, 63, 94, 0.3)",
                                        gap: "4px",
                                      }}
                                      title="تعطيل الاشتراك ومنعه من الدخول"
                                    >
                                      <PowerOff size={13} />
                                      <span>تعطيل</span>
                                    </button>
                                    {hasActiveTrustedDevice(
                                      item,
                                      studentObj,
                                      subObj,
                                    ) && (
                                      <button
                                        onClick={() =>
                                          handleResetDevice(
                                            item.subscription_id ||
                                              subObj.subscription_id ||
                                              (subObj !== item
                                                ? subObj.id
                                                : null) ||
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
                                          borderColor:
                                            "rgba(245, 158, 11, 0.3)",
                                          gap: "4px",
                                        }}
                                        title="إعادة ضبط الجهاز الموثوق ليتمكن الطالب من التسجيل بجهاز جديد"
                                      >
                                        <RotateCcw size={13} />
                                        <span>ضبط الجهاز</span>
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openStudentDeactivationConfirmation(
                                        studentObj || item,
                                      )
                                    }
                                    disabled={isProcessingAction}
                                    className="btn-secondary"
                                    style={{
                                      padding: "5px 10px",
                                      fontSize: "0.74rem",
                                      color: "#fda4af",
                                      borderColor: "rgba(244, 63, 94, 0.35)",
                                      gap: "4px",
                                    }}
                                    title="حذف هذا الاشتراك المعطل نهائياً"
                                  >
                                    <Trash2 size={13} />
                                    <span>حذف نهائي</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Cards View (<= 768px) */}
              <div className="modern-cards-mobile-view">
                {filteredApproved.map((item) => {
                  const studentObj = item.student || item.user || item;
                  const subObj =
                    item.subscription ||
                    item.active_subscription ||
                    item.subscriptions?.[0] ||
                    item;

                  const firstName =
                    item.first_name || studentObj.first_name || "";
                  const lastName = item.last_name || studentObj.last_name || "";
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
                    ) || "—";

                  const statusVal =
                    getSubscriptionStatus(subObj, item, studentObj) || "active";
                  const isDeactivated =
                    isDeactivatedStatus(statusVal) ||
                    subObj.is_active === false ||
                    item.is_active === false;
                  const isActive = !isDeactivated;

                  const subscriptionStartDateRaw =
                    subObj.start_date ||
                    item.start_date ||
                    studentObj.start_date ||
                    subObj.subscription?.start_date ||
                    item.subscription?.start_date ||
                    "";
                  const subscriptionStartDate = formatSubscriptionExpiry(
                    subscriptionStartDateRaw,
                  );
                  const phone = studentObj.phone || item.phone || "—";
                  const isCopied = copiedCode === subscriptionCode;

                  return (
                    <div
                      key={item.id}
                      className={`student-mobile-card ${!isActive ? "is-deactivated" : ""}`}
                    >
                      {/* Header */}
                      <div className="student-mobile-card-header">
                        <div className="student-card-info">
                          <div
                            className={`student-card-avatar ${isActive ? "is-active" : "is-deactivated"}`}
                          >
                            {studentName.charAt(0)}
                          </div>
                          <div>
                            <div className="student-card-name">
                              {studentName}
                            </div>
                            <div className="student-card-meta">
                              <span className="badge-tag">{gradeName}</span>
                              <span className="student-card-id">
                                ID:{" "}
                                {item.student_id || studentObj.id || item.id}
                              </span>
                            </div>
                          </div>
                        </div>

                        <span
                          className={`status-badge-pill ${isActive ? "active-pill" : "deactivated-pill"}`}
                        >
                          <span className="status-dot" />
                          <span>{isActive ? "نشط ومفعل" : "معطل"}</span>
                        </span>
                      </div>

                      {/* Body */}
                      <div className="student-mobile-card-body">
                        <div className="card-code-row">
                          <span className="card-label">كود الاشتراك:</span>
                          <div className="card-code-pill">
                            <span className="card-code-text">
                              {subscriptionCode}
                            </span>
                            {subscriptionCode !== "—" && (
                              <button
                                type="button"
                                onClick={() => handleCopyCode(subscriptionCode)}
                                className="card-code-copy-btn"
                                title="نسخ كود الاشتراك"
                              >
                                {isCopied ? (
                                  <Check
                                    size={14}
                                    style={{ color: "var(--emerald)" }}
                                  />
                                ) : (
                                  <Copy size={14} />
                                )}
                                <span>{isCopied ? "تم النسخ" : "نسخ"}</span>
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="card-info-grid">
                          <div className="card-info-col">
                            <span className="card-label">رقم الهاتف:</span>
                            <span className="card-value font-mono ltr">
                              {phone}
                            </span>
                          </div>
                          <div className="card-info-col">
                            <span className="card-label">تاريخ التفعيل:</span>
                            <span className="card-value">
                              {subscriptionStartDate}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="student-mobile-card-footer">
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
                              className="btn-card-action btn-danger-action"
                            >
                              <PowerOff size={14} />
                              <span>تعطيل الاشتراك</span>
                            </button>

                            {hasActiveTrustedDevice(
                              item,
                              studentObj,
                              subObj,
                            ) && (
                              <button
                                onClick={() =>
                                  handleResetDevice(
                                    item.subscription_id ||
                                      subObj.subscription_id ||
                                      (subObj !== item ? subObj.id : null) ||
                                      item.active_subscription?.id ||
                                      item.subscriptions?.[0]?.id ||
                                      item.id,
                                  )
                                }
                                disabled={isProcessingAction}
                                className="btn-card-action btn-warning-action"
                              >
                                <RotateCcw size={14} />
                                <span>ضبط الجهاز</span>
                              </button>
                            )}
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              openStudentDeactivationConfirmation(
                                studentObj || item,
                              )
                            }
                            disabled={isProcessingAction}
                            className="btn-card-action btn-danger-action"
                          >
                            <Trash2 size={14} />
                            <span>حذف نهائي</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="modern-table-footer">
                <span>
                  عرض <strong>{filteredApproved.length}</strong> من إجمالي{" "}
                  <strong>{approvedStats.total}</strong> اشتراك معتمد
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    gap: "12px",
                    alignItems: "center",
                  }}
                >
                  <span style={{ color: "var(--emerald)" }}>
                    ● نشط: {approvedStats.active}
                  </span>
                  <span style={{ color: "var(--rose)" }}>
                    ● معطل: {approvedStats.deactivated}
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: ALL STUDENTS ROSTER (GET /api/v1/admin/students)               */}
      {/* ==================================================================== */}
      {activeTab === "students" && (
        <div>
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
              <h3
                style={{
                  fontSize: "1.15rem",
                  fontWeight: 900,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Users size={19} style={{ color: "var(--cyan)" }} />
                <span>سجل الطلاب الشامل وإدارة الحسابات</span>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    padding: "2px 10px",
                    borderRadius: "999px",
                    background: "rgba(6, 182, 212, 0.15)",
                    color: "var(--cyan)",
                    border: "1px solid rgba(6, 182, 212, 0.3)",
                  }}
                >
                  {studentsTotalCount} طالب مسجل
                </span>
              </h3>
              <p
                style={{
                  fontSize: "0.82rem",
                  color: "var(--text-muted)",
                  marginTop: "4px",
                }}
              >
                إدارة ملفات الطلاب الأكاديمية، متابعة حالة التفعيل، نسخ أكواد
                الدخول، وتصفية الطلاب المعطلين
              </p>
            </div>
          </div>

          {/* Professional Filter Bar */}
          <div className="modern-filter-bar">
            {/* Row 1: Search & Status Filters */}
            <div className="modern-filter-row">
              <div className="modern-search-box">
                <span className="modern-search-icon">
                  <Search size={15} />
                </span>
                <input
                  type="text"
                  placeholder="بحث بالاسم أو الهاتف أو الكود..."
                  value={searchQuery}
                  onChange={(e) =>
                    setSearchQuery(e.target.value, { replace: true })
                  }
                  className="modern-search-input"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="modern-search-clear"
                    title="مسح البحث"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Status Segmented Filter */}
              <div className="status-filter-wrapper">
                <div
                  className="status-filter-group"
                  role="group"
                  aria-label="تصفية حالة الطلاب"
                >
                  <button
                    type="button"
                    onClick={() => setStudentsStatus("all")}
                    className={`status-filter-btn ${studentsStatus === "all" ? "is-active" : ""}`}
                  >
                    <span>الكل</span>
                    <span className="status-filter-count">
                      {studentsStats.total}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStudentsStatus("active")}
                    className={`status-filter-btn ${studentsStatus === "active" ? "is-active" : ""}`}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "var(--emerald)",
                      }}
                    />
                    <span>النشطين</span>
                    <span className="status-filter-count">
                      {studentsStats.active}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStudentsStatus("deactivated")}
                    className={`status-filter-btn is-deactivated ${studentsStatus === "deactivated" ? "is-active" : ""}`}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "var(--rose)",
                      }}
                    />
                    <span>المعطلين</span>
                    <span className="status-filter-count">
                      {studentsStats.deactivated}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Row 2: Grade Pills & Reset Action */}
            <div
              className="modern-filter-row"
              style={{
                paddingTop: "0.25rem",
                borderTop: "1px solid rgba(148, 163, 184, 0.08)",
              }}
            >
              <GradeFilter
                value={gradeFilter}
                onChange={setGradeFilter}
                includeAll
                showLabel={true}
              />

              {(searchQuery ||
                gradeFilter !== BRANCHES[0] ||
                studentsStatus !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setGradeFilter(BRANCHES[0]);
                    setStudentsStatus("all");
                  }}
                  className="btn-secondary"
                  style={{
                    fontSize: "0.78rem",
                    padding: "6px 14px",
                    gap: "6px",
                  }}
                >
                  <RotateCcw size={13} />
                  <span>إعادة تعيين الفلاتر</span>
                </button>
              )}
            </div>
          </div>

          {/* Table Container */}
          <div className="modern-table-container">
            {/* Desktop Table View */}
            <div className="modern-table-desktop-view">
              <div className="modern-table-scroll">
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th style={{ width: "36px", textAlign: "center", padding: "11px 4px" }}>#</th>
                      <th style={{ width: "22%" }}>اسم الطالب</th>
                      <th style={{ width: "13%", textAlign: "center" }}>
                        الصف الدراسي
                      </th>
                      <th style={{ width: "11%" }}>هاتف الطالب</th>
                      <th style={{ width: "11%" }}>هاتف ولي الأمر</th>
                      <th style={{ width: "13%", textAlign: "center" }}>
                        كود الدخول
                      </th>
                      <th style={{ width: "8%", textAlign: "center" }}>
                        الحالة
                      </th>
                      <th style={{ width: "18%", textAlign: "center" }}>
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
                            padding: "4rem 1rem",
                            textAlign: "center",
                            color: "var(--text-muted)",
                          }}
                        >
                          <RefreshCw
                            size={24}
                            className="animate-spin"
                            style={{
                              margin: "0 auto 10px",
                              color: "var(--cyan)",
                            }}
                          />
                          <p>جاري تحميل سجل الطلاب من الخادم...</p>
                        </td>
                      </tr>
                    ) : filteredStudents.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          style={{ padding: "4rem 1rem", textAlign: "center" }}
                        >
                          {studentsStatus === "deactivated" ? (
                            <div style={{ maxWidth: 440, margin: "0 auto" }}>
                              <div
                                style={{
                                  width: "54px",
                                  height: "54px",
                                  borderRadius: "50%",
                                  background: "rgba(16, 185, 129, 0.12)",
                                  color: "var(--emerald)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  margin: "0 auto 12px",
                                }}
                              >
                                <CheckCircle2 size={28} />
                              </div>
                              <h4
                                style={{
                                  color: "#fff",
                                  fontSize: "1.05rem",
                                  fontWeight: 800,
                                  marginBottom: "6px",
                                }}
                              >
                                لا يوجد طلاب معطلين حالياً 🎉
                              </h4>
                              <p
                                style={{
                                  color: "var(--text-muted)",
                                  fontSize: "0.84rem",
                                  marginBottom: "1rem",
                                }}
                              >
                                جميع حسابات الطلاب في هذه الصفحة نشطة ومفعلة
                                للدخول إلى المنصة
                              </p>
                              <button
                                type="button"
                                onClick={() => setStudentsStatus("all")}
                                className="btn-secondary"
                                style={{
                                  fontSize: "0.8rem",
                                  padding: "6px 16px",
                                  margin: "0 auto",
                                }}
                              >
                                عرض جميع الطلاب
                              </button>
                            </div>
                          ) : (
                            <div>
                              <p
                                style={{
                                  color: "var(--text-muted)",
                                  marginBottom: "1rem",
                                  fontSize: "0.9rem",
                                }}
                              >
                                لا يوجد طلاب يطابقون خيارات البحث أو التصفية
                                المحددة
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setSearchQuery("");
                                  setGradeFilter(BRANCHES[0]);
                                  setStudentsStatus("all");
                                }}
                                className="btn-secondary"
                                style={{
                                  fontSize: "0.8rem",
                                  padding: "6px 14px",
                                  margin: "0 auto",
                                }}
                              >
                                إعادة ضبط الفلاتر
                              </button>
                            </div>
                          )}
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
                                  item.id ||
                                  "",
                              ) ===
                                String(
                                  std.subscription_id ||
                                    std.subscription?.id ||
                                    std.active_subscription?.id ||
                                    "__no_subscription_id__",
                                )
                            );
                          },
                        );
                        const studentCode = getSubscriptionCode(
                          std.subscription_code,
                          std.code,
                          std.subscriptions?.[0],
                          std.active_subscription,
                          studentSubscription?.subscription_code,
                          studentSubscription?.code,
                          studentSubscription?.subscription,
                          studentSubscription?.active_subscription,
                          studentSubscription?.subscriptions?.[0],
                        );
                        const isStudentActive = isStudentRecordActive(
                          std,
                          studentSubscription,
                        );
                        const isCopied = copiedCode === studentCode;

                        return (
                          <tr
                            key={std.id}
                            className={
                              !isStudentActive ? "row-deactivated" : ""
                            }
                          >
                            {/* Index */}
                            <td
                              style={{
                                textAlign: "center",
                                color: "var(--text-dim)",
                                fontWeight: 700,
                                fontSize: "0.76rem",
                                padding: "10px 4px",
                              }}
                            >
                              {index + 1}
                            </td>

                            {/* Student Name & Avatar */}
                            <td>
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
                                    background: isStudentActive
                                      ? "linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)"
                                      : "linear-gradient(135deg, #e11d48 0%, #9f1239 100%)",
                                    color: "#fff",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontWeight: 900,
                                    fontSize: "0.82rem",
                                    flexShrink: 0,
                                    boxShadow: isStudentActive
                                      ? "0 3px 10px rgba(6, 182, 212, 0.25)"
                                      : "0 3px 10px rgba(225, 29, 72, 0.25)",
                                  }}
                                >
                                  {(std.first_name || std.name || "ط")
                                    .trim()
                                    .charAt(0)}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <div
                                    title={
                                      `${std.first_name || ""} ${std.last_name || ""}`.trim() ||
                                      std.name
                                    }
                                    style={{
                                      fontWeight: 800,
                                      color: "#ffffff",
                                      fontSize: "0.88rem",
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {`${std.first_name || ""} ${std.last_name || ""}`.trim() ||
                                      std.name ||
                                      "طالب"}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: "0.72rem",
                                      color: "var(--text-dim)",
                                      marginTop: "1px",
                                    }}
                                  >
                                    {std.governorate
                                      ? `${std.governorate} • `
                                      : ""}
                                    ID: {std.id}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Grade */}
                            <td style={{ textAlign: "center" }}>
                              <span className="badge-tag">
                                {getArabicGradeName(std.grade, std.grade_id)}
                              </span>
                            </td>

                            {/* Phone */}
                            <td>
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
                            <td>
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
                            <td style={{ textAlign: "center" }}>
                              <div
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  background: "rgba(6, 182, 212, 0.08)",
                                  border: "1px solid rgba(6, 182, 212, 0.22)",
                                  padding: "4px 9px",
                                  borderRadius: "8px",
                                }}
                              >
                                <span
                                  style={{
                                    fontFamily: "monospace",
                                    color: "var(--cyan)",
                                    fontWeight: 800,
                                    fontSize: "0.82rem",
                                    letterSpacing: "0.6px",
                                    direction: "ltr",
                                  }}
                                >
                                  {studentCode || "قيد الاعتماد"}
                                </span>
                                {studentCode && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCopyCode(studentCode);
                                    }}
                                    style={{
                                      background: "none",
                                      border: "none",
                                      color: isCopied
                                        ? "var(--emerald)"
                                        : "var(--text-dim)",
                                      cursor: "pointer",
                                      padding: "2px",
                                      display: "flex",
                                    }}
                                    title="نسخ كود الطالب"
                                  >
                                    {isCopied ? (
                                      <Check size={13} />
                                    ) : (
                                      <Copy size={13} />
                                    )}
                                  </button>
                                )}
                              </div>
                            </td>

                            {/* Status Badge */}
                            <td style={{ textAlign: "center" }}>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "5px",
                                  fontSize: "0.74rem",
                                  fontWeight: 800,
                                  padding: "3px 9px",
                                  borderRadius: "999px",
                                  background: isStudentActive
                                    ? "rgba(16, 185, 129, 0.14)"
                                    : "rgba(244, 63, 94, 0.14)",
                                  color: isStudentActive
                                    ? "var(--emerald)"
                                    : "var(--rose)",
                                  border: `1px solid ${isStudentActive ? "rgba(16, 185, 129, 0.3)" : "rgba(244, 63, 94, 0.3)"}`,
                                  whiteSpace: "nowrap",
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
                                />
                                <span>{isStudentActive ? "مفعل" : "معطل"}</span>
                              </span>
                            </td>

                            {/* Action Buttons */}
                            <td style={{ textAlign: "center" }}>
                              {!isStudentActive ? (
                                <span
                                  className="badge-tag"
                                  style={{
                                    color: "var(--rose)",
                                    background: "rgba(244, 63, 94, 0.12)",
                                    borderColor: "rgba(244, 63, 94, 0.3)",
                                  }}
                                >
                                  غير نشط
                                </span>
                              ) : (
                                <div
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    justifyContent: "center",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenStudentDetails({
                                        ...std,
                                        code:
                                          studentCode ||
                                          std.code ||
                                          std.subscription_code,
                                        subscription_code:
                                          studentCode ||
                                          std.subscription_code ||
                                          std.code,
                                        studentSubscription,
                                        grade: getArabicGradeName(
                                          std.grade,
                                          std.grade_id,
                                        ),
                                        grade_name: getArabicGradeName(
                                          std.grade,
                                          std.grade_id,
                                        ),
                                      });
                                    }}
                                    className="btn-secondary"
                                    style={{
                                      padding: "4px 7px",
                                      fontSize: "0.74rem",
                                      gap: "3px",
                                    }}
                                    title="عرض التفاصيل الكاملة"
                                  >
                                    <Eye
                                      size={12}
                                      style={{ color: "var(--cyan)" }}
                                    />
                                    <span>تفاصيل</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingStudent(std);
                                    }}
                                    className="btn-secondary"
                                    style={{
                                      padding: "4px 7px",
                                      fontSize: "0.74rem",
                                      color: "var(--amber)",
                                      gap: "3px",
                                    }}
                                    title="تعديل بيانات الطالب"
                                  >
                                    <Edit3 size={12} />
                                    <span>تعديل</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openStudentDeactivationConfirmation(std);
                                    }}
                                    className="btn-secondary"
                                    style={{
                                      padding: "4px 6px",
                                      fontSize: "0.74rem",
                                      color: "var(--rose)",
                                      borderColor: "rgba(244, 63, 94, 0.3)",
                                    }}
                                    title="تعطيل حساب الطالب"
                                  >
                                    <PowerOff size={12} />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards View */}
            <div className="modern-cards-mobile-view">
              {isLoadingStudents ? (
                <div
                  style={{
                    padding: "3rem 1rem",
                    textAlign: "center",
                    color: "var(--text-muted)",
                  }}
                >
                  <RefreshCw
                    size={24}
                    className="animate-spin"
                    style={{ margin: "0 auto 10px", color: "var(--cyan)" }}
                  />
                  <p>جاري تحميل سجل الطلاب...</p>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div style={{ padding: "2.5rem 1rem", textAlign: "center" }}>
                  {studentsStatus === "deactivated" ? (
                    <div style={{ maxWidth: 360, margin: "0 auto" }}>
                      <div
                        style={{
                          width: "50px",
                          height: "50px",
                          borderRadius: "50%",
                          background: "rgba(16, 185, 129, 0.12)",
                          color: "var(--emerald)",
                          display: "grid",
                          placeItems: "center",
                          margin: "0 auto 12px",
                        }}
                      >
                        <CheckCircle2 size={26} />
                      </div>
                      <h4
                        style={{
                          color: "#fff",
                          fontSize: "1rem",
                          fontWeight: 800,
                          marginBottom: "6px",
                        }}
                      >
                        لا يوجد طلاب معطلين حالياً 🎉
                      </h4>
                      <p
                        style={{
                          color: "var(--text-muted)",
                          fontSize: "0.82rem",
                          marginBottom: "1rem",
                        }}
                      >
                        جميع حسابات الطلاب نشطة ومفعلة للدخول
                      </p>
                      <button
                        type="button"
                        onClick={() => setStudentsStatus("all")}
                        className="btn-secondary"
                        style={{
                          fontSize: "0.8rem",
                          padding: "6px 16px",
                          margin: "0 auto",
                        }}
                      >
                        عرض جميع الطلاب
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p
                        style={{
                          color: "var(--text-muted)",
                          marginBottom: "1rem",
                          fontSize: "0.88rem",
                        }}
                      >
                        لا يوجد طلاب يطابقون خيارات البحث أو التصفية المحددة
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery("");
                          setGradeFilter(BRANCHES[0]);
                          setStudentsStatus("all");
                        }}
                        className="btn-secondary"
                        style={{
                          fontSize: "0.8rem",
                          padding: "6px 14px",
                          margin: "0 auto",
                        }}
                      >
                        إعادة ضبط الفلاتر
                      </button>
                    </div>
                  )}
                </div>
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
                            item.id ||
                            "",
                        ) ===
                          String(
                            std.subscription_id ||
                              std.subscription?.id ||
                              std.active_subscription?.id ||
                              "__no_subscription_id__",
                          )
                      );
                    },
                  );
                  const studentCode = getSubscriptionCode(
                    std.subscription_code,
                    std.code,
                    studentSubscription?.subscription_code,
                    std.active_subscription?.code,
                    std.subscriptions?.[0]?.code,
                    studentSubscription?.code,
                    std.active_subscription?.subscription_code,
                    std.subscriptions?.[0]?.subscription_code,
                    studentSubscription?.subscription?.code,
                    studentSubscription?.subscription?.subscription_code,
                  );
                  const isStudentActive = isStudentRecordActive(
                    std,
                    studentSubscription,
                  );
                  const isCopied = copiedCode === studentCode;
                  const studentName =
                    std.name ||
                    `${std.first_name || ""} ${std.last_name || ""}`.trim() ||
                    "طالب بدون اسم";
                  const gradeName = getArabicGradeName(std.grade, std.grade_id);
                  const phone = std.phone || "—";
                  const parentPhone =
                    std.parentPhone || std.parent_phone || "—";

                  return (
                    <div
                      key={std.id || index}
                      className={`student-mobile-card ${!isStudentActive ? "is-deactivated" : ""}`}
                    >
                      {/* Header */}
                      <div className="student-mobile-card-header">
                        <div className="student-card-info">
                          <div
                            className={`student-card-avatar ${isStudentActive ? "is-student" : "is-deactivated"}`}
                          >
                            {studentName.charAt(0)}
                          </div>
                          <div>
                            <div className="student-card-name">
                              {studentName}
                            </div>
                            <div className="student-card-meta">
                              <span className="badge-tag">{gradeName}</span>
                              <span className="student-card-id">
                                ID: {std.student_id || std.id}
                              </span>
                            </div>
                          </div>
                        </div>

                        <span
                          className={`status-badge-pill ${isStudentActive ? "active-pill" : "deactivated-pill"}`}
                        >
                          <span className="status-dot" />
                          <span>{isStudentActive ? "مفعل" : "معطل"}</span>
                        </span>
                      </div>

                      {/* Body */}
                      <div className="student-mobile-card-body">
                        <div className="card-code-row">
                          <span className="card-label">كود الدخول:</span>
                          <div className="card-code-pill">
                            <span className="card-code-text">
                              {studentCode || "قيد الاعتماد"}
                            </span>
                            {studentCode && (
                              <button
                                type="button"
                                onClick={() => handleCopyCode(studentCode)}
                                className="card-code-copy-btn"
                                title="نسخ كود الطالب"
                              >
                                {isCopied ? (
                                  <Check
                                    size={14}
                                    style={{ color: "var(--emerald)" }}
                                  />
                                ) : (
                                  <Copy size={14} />
                                )}
                                <span>{isCopied ? "تم النسخ" : "نسخ"}</span>
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="card-info-grid">
                          <div className="card-info-col">
                            <span className="card-label">هاتف الطالب:</span>
                            {phone !== "—" ? (
                              <a
                                href={`tel:${phone}`}
                                className="card-value font-mono ltr"
                                style={{
                                  color: "var(--cyan)",
                                  textDecoration: "none",
                                }}
                              >
                                {phone}
                              </a>
                            ) : (
                              <span className="card-value font-mono ltr">
                                —
                              </span>
                            )}
                          </div>
                          <div className="card-info-col">
                            <span className="card-label">هاتف ولي الأمر:</span>
                            {parentPhone !== "—" ? (
                              <a
                                href={`tel:${parentPhone}`}
                                className="card-value font-mono ltr"
                                style={{
                                  color: "var(--text-muted)",
                                  textDecoration: "none",
                                }}
                              >
                                {parentPhone}
                              </a>
                            ) : (
                              <span className="card-value font-mono ltr">
                                —
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="student-mobile-card-footer">
                        {!isStudentActive ? (
                          <span
                            className="status-badge-pill deactivated-pill"
                            style={{ margin: "0 auto" }}
                          >
                            <span className="status-dot" />
                            <span>غير نشط</span>
                          </span>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                handleOpenStudentDetails({
                                  ...std,
                                  code:
                                    studentCode ||
                                    std.code ||
                                    std.subscription_code,
                                  subscription_code:
                                    studentCode ||
                                    std.subscription_code ||
                                    std.code,
                                  studentSubscription,
                                  grade: getArabicGradeName(
                                    std.grade,
                                    std.grade_id,
                                  ),
                                  grade_name: getArabicGradeName(
                                    std.grade,
                                    std.grade_id,
                                  ),
                                });
                              }}
                              className="btn-card-action btn-info-action"
                            >
                              <Eye size={14} />
                              <span>التفاصيل</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setEditingStudent(std)}
                              className="btn-card-action btn-warning-action"
                            >
                              <Edit3 size={14} />
                              <span>تعديل</span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                openStudentDeactivationConfirmation(std)
                              }
                              className="btn-card-action btn-danger-action"
                            >
                              <PowerOff size={14} />
                              <span>تعطيل</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="modern-table-footer">
              <span>
                عرض <strong>{filteredStudents.length}</strong> طالب في هذه
                الصفحة • إجمالي المسجلين: <strong>{studentsTotalCount}</strong>
              </span>
              <span
                style={{
                  display: "inline-flex",
                  gap: "12px",
                  alignItems: "center",
                }}
              >
                <span style={{ color: "var(--emerald)" }}>
                  ● نشط: {studentsStats.active}
                </span>
                <span style={{ color: "var(--rose)" }}>
                  ● معطل: {studentsStats.deactivated}
                </span>
              </span>
            </div>
          </div>

          {/* Pagination */}
          {studentsPagination.last_page > 1 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "1rem",
                marginTop: "1.25rem",
              }}
            >
              <button
                type="button"
                className="btn-secondary"
                disabled={
                  isLoadingStudents || studentsPagination.current_page <= 1
                }
                onClick={() =>
                  setUrlState({ page: String(currentStudentsPage - 1) })
                }
                style={{ fontSize: "0.82rem", padding: "8px 16px" }}
              >
                السابق
              </button>
              <span
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                }}
              >
                صفحة{" "}
                <strong style={{ color: "var(--cyan)" }}>
                  {studentsPagination.current_page}
                </strong>{" "}
                من <strong>{studentsPagination.last_page}</strong>
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
                  setUrlState({ page: String(currentStudentsPage + 1) })
                }
                style={{ fontSize: "0.82rem", padding: "8px 16px" }}
              >
                التالي
              </button>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 4: SUBSCRIPTION CODES BY GRADE (GET /api/v1/admin/subscription-codes) */}
      {/* ==================================================================== */}
      {activeTab === "codes" && (
        <div>
          {/* Header Title & Actions */}
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
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 800,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span>أكواد اشتراكات الطلاب المعتمدة حسب الصف</span>
                <span
                  style={{
                    fontSize: "0.75rem",
                    padding: "2px 8px",
                    borderRadius: "20px",
                    background: "rgba(168, 85, 247, 0.15)",
                    color: "var(--purple)",
                    border: "1px solid rgba(168, 85, 247, 0.3)",
                  }}
                >
                  {getGradeNameById(selectedCodesGrade)}
                </span>
              </h3>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "var(--text-muted)",
                  marginTop: "4px",
                }}
              >
                استعراض وتصدير جميع أكواد الطلاب لكل مرحلة دراسية، مع تصفية
                فورية للأكواد النشطة والمعطلة
              </p>
            </div>

            {/* Quick Actions */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                flexWrap: "wrap",
              }}
            >
              {/* Refresh */}
              <button
                onClick={() => fetchSubscriptionCodes(selectedCodesGrade)}
                className="btn-secondary"
                style={{ fontSize: "0.85rem", padding: "7px 14px" }}
                disabled={isLoadingCodes}
                title="تحديث الأكواد من الخادم"
              >
                <RefreshCw
                  size={14}
                  className={isLoadingCodes ? "animate-spin" : ""}
                />
                <span>تحديث</span>
              </button>

              {/* Copy All Codes */}
              {filteredCodes.length > 0 && (
                <button
                  onClick={() => {
                    const allCodesText = filteredCodes
                      .map(
                        (c) =>
                          `${c.student_name || "طالب"}: ${getSubscriptionCode(c.subscription_code, c.subscription, c)}`,
                      )
                      .join("\n");
                    navigator.clipboard?.writeText(allCodesText);
                    showToast(
                      `تم نسخ ${filteredCodes.length} كود اشتراك بنجاح! 📋`,
                    );
                  }}
                  className="btn-primary"
                  style={{ fontSize: "0.85rem", padding: "7px 16px" }}
                  title="نسخ جميع الأكواد المعروضة حالياً"
                >
                  <Copy size={14} />
                  <span>نسخ الأكواد المعروضة ({filteredCodes.length})</span>
                </button>
              )}
            </div>
          </div>

          {/* Professional Modern Filter Bar */}
          <div className="modern-filter-bar">
            {/* Row 1: Search & Status Filters */}
            <div className="modern-filter-row">
              <div className="modern-search-box">
                <span className="modern-search-icon">
                  <Search size={15} />
                </span>
                <input
                  type="text"
                  placeholder="بحث باسم الطالب أو كود الاشتراك..."
                  value={codesSearchQuery}
                  onChange={(e) =>
                    setCodesSearchQuery(e.target.value, { replace: true })
                  }
                  className="modern-search-input"
                />
                {codesSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setCodesSearchQuery("")}
                    className="modern-search-clear"
                    title="مسح البحث"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Status Segmented Filter */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  flexWrap: "wrap",
                }}
              >
                <div
                  className="status-filter-group"
                  role="group"
                  aria-label="تصفية حالة الأكواد"
                >
                  <button
                    type="button"
                    onClick={() => setCodesStatus("all")}
                    className={`status-filter-btn ${codesStatus === "all" ? "is-active" : ""}`}
                  >
                    <span>الكل</span>
                    <span className="status-filter-count">
                      {codesStats.total}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCodesStatus("active")}
                    className={`status-filter-btn ${codesStatus === "active" ? "is-active" : ""}`}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "var(--emerald)",
                      }}
                    />
                    <span>النشطة</span>
                    <span className="status-filter-count">
                      {codesStats.active}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCodesStatus("deactivated")}
                    className={`status-filter-btn is-deactivated ${codesStatus === "deactivated" ? "is-active" : ""}`}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "var(--rose)",
                      }}
                    />
                    <span>المعطلة</span>
                    <span className="status-filter-count">
                      {codesStats.deactivated}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Row 2: Grade Selection & Reset Actions */}
            <div
              className="modern-filter-row"
              style={{
                paddingTop: "0.25rem",
                borderTop: "1px solid rgba(148, 163, 184, 0.08)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text-muted)",
                    fontWeight: 700,
                  }}
                >
                  المرحلة الدراسية:
                </span>
                <GradeFilter
                  value={selectedCodesGrade}
                  showLabel={false}
                  options={GRADES.map((grade) => ({
                    value: grade.numericId || GRADE_ID_MAP[grade.id] || 1,
                    label: grade.shortName || grade.name,
                  }))}
                  disabled={isLoadingCodes}
                  onChange={(gradeId) => {
                    if (Number(gradeId) === selectedCodesGrade) return;
                    setSelectedCodesGrade(Number(gradeId));
                  }}
                />
              </div>

              {(codesSearchQuery || codesStatus !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setCodesSearchQuery("");
                    setCodesStatus("all");
                  }}
                  className="modern-filter-reset"
                  title="إلغاء جميع الفلاتر"
                >
                  <X size={13} />
                  <span>إعادة ضبط التصفية</span>
                </button>
              )}
            </div>
          </div>

          {/* Table / Content */}
          {isLoadingCodes ? (
            <div
              style={{
                textAlign: "center",
                padding: "3.5rem 1rem",
                color: "var(--cyan)",
              }}
            >
              <RefreshCw
                size={28}
                className="animate-spin"
                style={{ margin: "0 auto 10px" }}
              />
              <p style={{ fontWeight: 700 }}>
                جاري تحميل وتحديث أكواد الاشتراك...
              </p>
            </div>
          ) : filteredCodes.length === 0 ? (
            <div
              className="feature-card"
              style={{
                padding: "3rem 1.5rem",
                textAlign: "center",
                background: "rgba(15, 23, 42, 0.6)",
                border: "1px dashed rgba(148, 163, 184, 0.2)",
                borderRadius: "16px",
              }}
            >
              {codesStatus === "deactivated" ? (
                <>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: "50%",
                      background: "rgba(16, 185, 129, 0.1)",
                      display: "grid",
                      placeItems: "center",
                      margin: "0 auto 1rem",
                      color: "var(--emerald)",
                    }}
                  >
                    <CheckCircle2 size={28} />
                  </div>
                  <h4
                    style={{ color: "#fff", fontSize: "1rem", fontWeight: 800 }}
                  >
                    لا توجد أكواد معطلة لهذا الصف حالياً ✨
                  </h4>
                  <p
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "0.82rem",
                      marginTop: "6px",
                    }}
                  >
                    جميع أكواد الطلاب في {getGradeNameById(selectedCodesGrade)}{" "}
                    نشطة وتعمل بشكل طبيعي.
                  </p>
                  <button
                    type="button"
                    onClick={() => setCodesStatus("all")}
                    className="btn-secondary"
                    style={{
                      marginTop: "1rem",
                      fontSize: "0.82rem",
                      padding: "6px 14px",
                    }}
                  >
                    عرض جميع الأكواد
                  </button>
                </>
              ) : codesSearchQuery ? (
                <>
                  <Search
                    size={36}
                    style={{
                      color: "var(--text-muted)",
                      margin: "0 auto 1rem",
                    }}
                  />
                  <h4
                    style={{ color: "#fff", fontSize: "1rem", fontWeight: 800 }}
                  >
                    لا توجد أكواد مطابقة لبحثك: "{codesSearchQuery}"
                  </h4>
                  <p
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "0.82rem",
                      marginTop: "6px",
                    }}
                  >
                    جرّب البحث باسم طالب آخر أو إلغاء كلمة البحث الحالية.
                  </p>
                  <button
                    type="button"
                    onClick={() => setCodesSearchQuery("")}
                    className="btn-secondary"
                    style={{
                      marginTop: "1rem",
                      fontSize: "0.82rem",
                      padding: "6px 14px",
                    }}
                  >
                    مسح البحث
                  </button>
                </>
              ) : (
                <>
                  <Key
                    size={40}
                    style={{
                      color: "var(--text-muted)",
                      margin: "0 auto 1rem",
                    }}
                  />
                  <h4
                    style={{ color: "#fff", fontSize: "1rem", fontWeight: 800 }}
                  >
                    لا توجد أكواد اشتراك معتمدة لهذا الصف حالياً
                  </h4>
                  <p
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "0.82rem",
                      marginTop: "6px",
                    }}
                  >
                    يمكنك قبول طلبات الطلاب أو إضافة طالب وتفعيل اشتراكه من
                    تبويب "طلبات التفعيل" أو "سجل الطلاب"
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="modern-table-container">
              {/* Desktop Table View */}
              <div className="modern-table-desktop-view">
                <div className="modern-table-scroll">
                  <table className="modern-table">
                    <thead>
                      <tr>
                        <th style={{ width: "6%", textAlign: "center" }}>#</th>
                        <th style={{ width: "26%" }}>اسم الطالب</th>
                        <th style={{ width: "22%", textAlign: "center" }}>
                          كود الدخول (كود الاشتراك)
                        </th>
                        <th style={{ width: "18%", textAlign: "center" }}>
                          المرحلة الدراسية
                        </th>
                        <th style={{ width: "14%", textAlign: "center" }}>
                          حالة الكود
                        </th>
                        <th style={{ width: "14%", textAlign: "center" }}>
                          إجراءات
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCodes.map((item, idx) => {
                        const subscriptionCode = getSubscriptionCode(
                          item.subscription_code,
                          item.subscription,
                          item,
                        );
                        const isSubscriptionInactive =
                          getCodeItemInactiveState(item);
                        const isCopied = copiedCode === subscriptionCode;

                        return (
                          <tr
                            key={subscriptionCode || item.id || idx}
                            className={
                              isSubscriptionInactive ? "row-deactivated" : ""
                            }
                          >
                            {/* Row Index */}
                            <td style={{ textAlign: "center" }}>
                              <span
                                style={{
                                  display: "inline-grid",
                                  placeItems: "center",
                                  width: "24px",
                                  height: "24px",
                                  borderRadius: "6px",
                                  color: "#94a3b8",
                                  background: "rgba(148, 163, 184, 0.08)",
                                  fontSize: "0.75rem",
                                  fontWeight: 800,
                                }}
                              >
                                {idx + 1}
                              </span>
                            </td>

                            {/* Student Info */}
                            <td>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                }}
                              >
                                <span
                                  style={{
                                    width: "34px",
                                    height: "34px",
                                    display: "grid",
                                    placeItems: "center",
                                    flexShrink: 0,
                                    borderRadius: "10px",
                                    color: isSubscriptionInactive
                                      ? "var(--rose)"
                                      : "var(--purple)",
                                    background: isSubscriptionInactive
                                      ? "rgba(244, 63, 94, 0.12)"
                                      : "rgba(168, 85, 247, 0.12)",
                                    border: `1px solid ${isSubscriptionInactive ? "rgba(244, 63, 94, 0.25)" : "rgba(168, 85, 247, 0.25)"}`,
                                    fontWeight: 800,
                                    fontSize: "0.85rem",
                                  }}
                                >
                                  {(item.student_name || "ط").trim().charAt(0)}
                                </span>
                                <div>
                                  <span
                                    style={{
                                      fontWeight: 800,
                                      color: "#f8fafc",
                                      display: "block",
                                    }}
                                  >
                                    {item.student_name || "طالب المنصة"}
                                  </span>
                                  {item.phone && (
                                    <span
                                      style={{
                                        fontSize: "0.72rem",
                                        color: "var(--text-muted)",
                                        direction: "ltr",
                                      }}
                                    >
                                      {item.phone}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Subscription Code */}
                            <td style={{ textAlign: "center" }}>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  fontFamily: "monospace",
                                  fontSize: "0.85rem",
                                  fontWeight: 800,
                                  color: isSubscriptionInactive
                                    ? "#fda4af"
                                    : "#67e8f9",
                                  background: isSubscriptionInactive
                                    ? "rgba(244, 63, 94, 0.1)"
                                    : "rgba(6, 182, 212, 0.1)",
                                  padding: "6px 10px",
                                  borderRadius: "8px",
                                  border: `1px solid ${isSubscriptionInactive ? "rgba(244, 63, 94, 0.25)" : "rgba(6, 182, 212, 0.25)"}`,
                                  letterSpacing: "0.6px",
                                  direction: "ltr",
                                }}
                              >
                                <Key size={13} />
                                {subscriptionCode || "—"}
                              </span>
                            </td>

                            {/* Grade */}
                            <td style={{ textAlign: "center" }}>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  padding: "4px 8px",
                                  borderRadius: "6px",
                                  border: "1px solid rgba(168, 85, 247, 0.2)",
                                  background: "rgba(168, 85, 247, 0.08)",
                                  color: "#d8b4fe",
                                  fontSize: "0.74rem",
                                  fontWeight: 700,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {getGradeNameById(selectedCodesGrade)}
                              </span>
                            </td>

                            {/* Code Status */}
                            <td style={{ textAlign: "center" }}>
                              <span
                                className="badge-tag"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  background: isSubscriptionInactive
                                    ? "rgba(244, 63, 94, 0.12)"
                                    : "rgba(16, 185, 129, 0.12)",
                                  color: isSubscriptionInactive
                                    ? "var(--rose)"
                                    : "var(--emerald)",
                                  borderColor: isSubscriptionInactive
                                    ? "rgba(244, 63, 94, 0.28)"
                                    : "rgba(16, 185, 129, 0.28)",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                <span
                                  style={{
                                    width: "6px",
                                    height: "6px",
                                    borderRadius: "50%",
                                    background: isSubscriptionInactive
                                      ? "var(--rose)"
                                      : "var(--emerald)",
                                    boxShadow: isSubscriptionInactive
                                      ? "0 0 6px rgba(244, 63, 94, 0.6)"
                                      : "0 0 6px rgba(16, 185, 129, 0.6)",
                                  }}
                                />
                                {isSubscriptionInactive ? "معطل" : "نشط"}
                              </span>
                            </td>

                            {/* Actions */}
                            <td style={{ textAlign: "center" }}>
                              <button
                                type="button"
                                onClick={() => handleCopyCode(subscriptionCode)}
                                className="btn-secondary"
                                style={{
                                  fontSize: "0.75rem",
                                  padding: "6px 12px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  borderRadius: "8px",
                                  borderColor: isCopied
                                    ? "rgba(16, 185, 129, 0.4)"
                                    : "rgba(148, 163, 184, 0.2)",
                                  color: isCopied
                                    ? "var(--emerald)"
                                    : "#cbd5e1",
                                }}
                                title="نسخ كود الاشتراك للحافظة"
                              >
                                {isCopied ? (
                                  <Check
                                    size={13}
                                    style={{ color: "var(--emerald)" }}
                                  />
                                ) : (
                                  <Copy size={13} />
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
              </div>

              {/* Mobile Cards View */}
              <div className="modern-cards-mobile-view">
                {filteredCodes.map((item, idx) => {
                  const subscriptionCode = getSubscriptionCode(
                    item.subscription_code,
                    item.subscription,
                    item,
                  );
                  const isSubscriptionInactive = getCodeItemInactiveState(item);
                  const isCopied = copiedCode === subscriptionCode;
                  const studentName = item.student_name || "طالب المنصة";
                  const phone = item.phone || "—";
                  const gradeName = getGradeNameById(selectedCodesGrade);

                  return (
                    <div
                      key={subscriptionCode || item.id || idx}
                      className={`student-mobile-card ${isSubscriptionInactive ? "is-deactivated" : ""}`}
                    >
                      {/* Header */}
                      <div className="student-mobile-card-header">
                        <div className="student-card-info">
                          <div
                            className={`student-card-avatar ${!isSubscriptionInactive ? "is-student" : "is-deactivated"}`}
                            style={{
                              background: !isSubscriptionInactive
                                ? "linear-gradient(135deg, #a855f7, #6366f1)"
                                : undefined,
                            }}
                          >
                            {studentName.trim().charAt(0)}
                          </div>
                          <div>
                            <div className="student-card-name">
                              {studentName}
                            </div>
                            <div className="student-card-meta">
                              <span className="badge-tag">{gradeName}</span>
                              <span className="student-card-id">
                                #{idx + 1}
                              </span>
                            </div>
                          </div>
                        </div>

                        <span
                          className={`status-badge-pill ${!isSubscriptionInactive ? "active-pill" : "deactivated-pill"}`}
                        >
                          <span className="status-dot" />
                          <span>
                            {!isSubscriptionInactive ? "كود نشط" : "معطل"}
                          </span>
                        </span>
                      </div>

                      {/* Body */}
                      <div className="student-mobile-card-body">
                        <div className="card-code-row">
                          <span className="card-label">كود الاشتراك:</span>
                          <div className="card-code-pill">
                            <span className="card-code-text">
                              {subscriptionCode || "—"}
                            </span>
                            {subscriptionCode && (
                              <button
                                type="button"
                                onClick={() => handleCopyCode(subscriptionCode)}
                                className="card-code-copy-btn"
                                title="نسخ كود الاشتراك"
                              >
                                {isCopied ? (
                                  <Check
                                    size={14}
                                    style={{ color: "var(--emerald)" }}
                                  />
                                ) : (
                                  <Copy size={14} />
                                )}
                                <span>{isCopied ? "تم النسخ" : "نسخ"}</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {phone !== "—" && (
                          <div
                            className="card-info-grid"
                            style={{ gridTemplateColumns: "1fr" }}
                          >
                            <div className="card-info-col">
                              <span className="card-label">رقم الهاتف:</span>
                              <a
                                href={`tel:${phone}`}
                                className="card-value font-mono ltr"
                                style={{
                                  color: "var(--cyan)",
                                  textDecoration: "none",
                                }}
                              >
                                {phone}
                              </a>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Footer Actions */}
                      <div className="student-mobile-card-footer">
                        <button
                          type="button"
                          onClick={() => handleCopyCode(subscriptionCode)}
                          className="btn-card-action btn-info-action"
                        >
                          {isCopied ? <Check size={14} /> : <Copy size={14} />}
                          <span>
                            {isCopied
                              ? "تم نسخ كود الدخول"
                              : "نسخ كود الاشتراك"}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Table Footer Summary */}
              <div className="modern-table-footer">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    flexWrap: "wrap",
                  }}
                >
                  <span>
                    عرض{" "}
                    <strong style={{ color: "#fff" }}>
                      {filteredCodes.length}
                    </strong>{" "}
                    من أصل{" "}
                    <strong style={{ color: "#fff" }}>
                      {subscriptionCodesList.length}
                    </strong>{" "}
                    كود
                  </span>
                  <span style={{ color: "rgba(148, 163, 184, 0.4)" }}>•</span>
                  <span style={{ color: "var(--emerald)" }}>
                    النشطة: {codesStats.active}
                  </span>
                  <span style={{ color: "rgba(148, 163, 184, 0.4)" }}>•</span>
                  <span style={{ color: "var(--rose)" }}>
                    المعطلة: {codesStats.deactivated}
                  </span>
                </div>

                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <span
                    style={{
                      fontSize: "0.73rem",
                      padding: "3px 8px",
                      borderRadius: "6px",
                      background: "rgba(168, 85, 247, 0.12)",
                      color: "#d8b4fe",
                      border: "1px solid rgba(168, 85, 247, 0.2)",
                    }}
                  >
                    {getGradeNameById(selectedCodesGrade)}
                  </span>
                </div>
              </div>
            </div>
          )}
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
      {/* MODAL: VIEW STUDENT DETAILS & EXAM HISTORY BREAKDOWN                 */}
      {/* ==================================================================== */}
      <StudentExamHistoryModal
        isOpen={Boolean(viewingStudent || examHistoryStudent)}
        onClose={() => {
          setViewingStudent(null);
          setExamHistoryStudent(null);
        }}
        student={viewingStudent || examHistoryStudent}
        lessonsList={lessonsList}
        availableExams={adminExamsList}
        onResetDevice={handleResetDeviceForStudent}
        onDeactivate={openStudentDeactivationConfirmation}
        onEdit={(std) => {
          setViewingStudent(null);
          setExamHistoryStudent(null);
          setEditingStudent(std);
        }}
        isProcessingAction={isProcessingAction}
      />

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
    </div>
  );
}
