import { useCallback, useEffect, useState } from "react";

import { GRADES, TEACHER_INFO } from "../data/platformData";

import {
  api,
  tokenStorage,
  getGradeNameById,
  getGradeIdByName,
  getOrCreateDeviceId,
} from "../services/api";

import { StudentContext } from "./StudentContextValue";

export const StudentProvider = ({ children }) => {
  // ============================================================
  // AUTH STATE
  // ============================================================

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const [userRole, setUserRole] = useState(() => {
    return localStorage.getItem("el_eamid_role") || "student";
  });

  const [student, setStudent] = useState(null);

  const [studentsList, setStudentsList] = useState([]);

  // ============================================================
  // REQUESTS / SUBSCRIPTIONS
  // ============================================================

  const [pendingRequests, setPendingRequests] = useState([]);
  const [approvedSubscriptions, setApprovedSubscriptions] = useState([]);

  const [pendingLoading, setPendingLoading] = useState(false);
  const [approvedLoading, setApprovedLoading] = useState(false);

  // ============================================================
  // ADMIN EXAMS & QUESTIONS
  // ============================================================

  const [adminExamsList, setAdminExamsList] = useState([]);
  const [isLoadingExams, setIsLoadingExams] = useState(false);

  // ============================================================
  // SUBSCRIPTION CODES (BY GRADE)
  // ============================================================

  const [subscriptionCodesList, setSubscriptionCodesList] = useState([]);
  const [isLoadingCodes, setIsLoadingCodes] = useState(false);

  // ============================================================
  // ADMIN PAGINATED STUDENTS
  // ============================================================

  const [paginatedStudents, setPaginatedStudents] = useState([]);
  const [studentsPagination, setStudentsPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
  });
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isLoadingLessons, setIsLoadingLessons] = useState(false);
  const [studentExamsList, setStudentExamsList] = useState([]);
  const [isLoadingStudentExams, setIsLoadingStudentExams] = useState(false);

  // ============================================================
  // LESSONS
  // ============================================================

  const [lessonsList, setLessonsList] = useState([]);

  // ============================================================
  // MEMOS
  // ============================================================

  const [memosList, setMemosList] = useState([]);
  const [isLoadingMemos, setIsLoadingMemos] = useState(false);

  // ============================================================
  // UI STATE
  // ============================================================

  const [toast, setToast] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      const savedRole = localStorage.getItem("el_eamid_role");
      const hasSavedSession =
        localStorage.getItem("el_eamid_auth") === "true";
      const savedToken =
        savedRole === "teacher"
          ? tokenStorage.getAdminToken()
          : savedRole === "student"
            ? tokenStorage.getStudentToken()
            : null;

      // Clean up any legacy offline mock keys from localStorage
      localStorage.removeItem("mathplatform_offline_requests");
      localStorage.removeItem("mathplatform_offline_approved");
      localStorage.removeItem("mathplatform_offline_exams");
      localStorage.removeItem("el_eamid_students_list");
      localStorage.removeItem("el_eamid_student");

      if (!hasSavedSession || !savedToken) {
        tokenStorage.clearTokens();
        localStorage.removeItem("el_eamid_auth");
        localStorage.removeItem("el_eamid_role");
        localStorage.removeItem("el_eamid_student");
        if (isMounted) setIsAuthReady(true);
        return;
      }

      try {
        const result = await api.validateSession(savedRole);

        if (!isMounted) return;

        if (result?.success) {
          setUserRole(savedRole);
          setIsAuthenticated(true);
        } else {
          if (result?.status === 401 || result?.status === 403) {
            tokenStorage.clearTokens();
            localStorage.removeItem("el_eamid_auth");
            localStorage.removeItem("el_eamid_role");
            localStorage.removeItem("el_eamid_student");
          }
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("Failed to validate saved authentication:", error);
        if (isMounted) setIsAuthenticated(false);
      } finally {
        if (isMounted) setIsAuthReady(true);
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  // ============================================================
  // TOAST
  // ============================================================

  const showToast = useCallback((message, type = "success") => {
    setToast({
      message,
      type,
      id: Date.now(),
    });

    setTimeout(() => {
      setToast(null);
    }, 3000);
  }, []);

  // ============================================================
  // AUTH MODAL
  // ============================================================

  const openAuthModal = useCallback(() => {
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  // ============================================================
  // FETCH PENDING REQUESTS
  // ============================================================

  const fetchPendingRequests = useCallback(async () => {
    setPendingLoading(true);

    try {
      const result = await api.getActivationRequests();

      if (result?.success) {
        setPendingRequests(result.data || []);
      } else {
        setPendingRequests([]);
      }
    } catch (error) {
      console.error("Failed to fetch pending requests:", error);
      setPendingRequests([]);
    } finally {
      setPendingLoading(false);
    }
  }, []);

  // ============================================================
  // FETCH APPROVED STUDENTS
  // ============================================================

  const fetchApprovedStudents = useCallback(async () => {
    setApprovedLoading(true);

    try {
      const result = await api.getApprovedStudents();

      if (result?.success) {
        setApprovedSubscriptions(result.data || []);
      } else if (result?.error) {
        showToast(result.error, "error");
      }
      return result;
    } catch (error) {
      console.error("Failed to fetch approved students:", error);
      showToast(error?.message || "Failed to fetch approved students", "error");
      return { success: false, error: error?.message || "Request failed" };
    } finally {
      setApprovedLoading(false);
    }
  }, [showToast]);

  // ============================================================
  // FETCH STUDENT PROFILE (GET /api/v1/student/profile)
  // ============================================================

  const fetchStudentProfile = useCallback(async () => {
    const token = tokenStorage.getStudentToken();

    if (!token) {
      return { success: false, error: "جلسة الطالب غير متاحة" };
    }

    try {
      const result = await api.getStudentProfile();

      if (result?.success && result.data) {
        const profile = result.data;
        const profileStudent = profile.student || profile.user || profile;
        const subscription =
          profile.subscription ||
          profile.active_subscription ||
          (typeof profileStudent.subscription_code === "object"
            ? profileStudent.subscription_code
            : null);
        const trustedDevice =
          profile.trusted_device || profile.device || profile.trustedDevice || null;
        const profileName =
          profileStudent.name ||
          `${profileStudent.first_name || ""} ${profileStudent.last_name || ""}`.trim();

        let updatedStudent;
        setStudent((prev) => {
          const rawSubscriptionCode =
            profileStudent.subscription_code || prev?.subscription_code;
          const subscriptionCode =
            typeof rawSubscriptionCode === "string"
              ? rawSubscriptionCode
              : rawSubscriptionCode?.code ||
                rawSubscriptionCode?.subscription_code ||
                subscription?.code ||
                subscription?.subscription_code ||
                "";
          updatedStudent = {
            ...prev,
            ...profileStudent,
            ...(profileName ? { name: profileName } : {}),
            subscription,
            code: subscriptionCode || prev?.code || "",
            subscription_code: subscriptionCode,
            trusted_device: trustedDevice || prev?.trusted_device,
            grade:
              typeof profile.grade === "string"
                ? profile.grade
                : profile.grade?.name ||
                  ((profileStudent.grade_id || prev?.grade_id)
                    ? getGradeNameById(
                        profileStudent.grade_id || prev?.grade_id,
                      )
                    : prev?.grade),
            grade_id: profileStudent.grade_id || prev?.grade_id,
          };
          return updatedStudent;
        });
        return { success: true, data: updatedStudent || profile };
      }
      const error = result?.error || result?.message || "تعذر تحميل بيانات الطالب";
      showToast(error, "error");
      return { success: false, error };
    } catch (error) {
      console.error("Failed to fetch student profile:", error);
      showToast(error?.message || "تعذر تحميل بيانات الطالب", "error");
      return { success: false, error: error?.message || "تعذر تحميل بيانات الطالب" };
    }
  }, [showToast]);

  // ============================================================
  // GET STUDENT DETAILS (GET /api/v1/admin/students/{id})
  // ============================================================

  const getStudentDetails = useCallback(async (studentId) => {
    try {
      const result = await api.getStudentDetails(studentId);
      return result;
    } catch (error) {
      console.error("Failed to fetch student details:", error);
      return {
        success: false,
        error: error?.message || "فشل جلب تفاصيل الطالب",
      };
    }
  }, []);

  // ============================================================
  // STUDENT LOGIN WITH CODE
  // ============================================================

  const studentLoginWithCode = useCallback(
    async (subscriptionCode) => {
      const code = String(subscriptionCode || "")
        .trim()
        .toUpperCase();

      if (!code) {
        showToast("من فضلك أدخل كود الاشتراك", "error");

        return {
          success: false,
          message: "Subscription code is required",
        };
      }

      try {
        const deviceId = getOrCreateDeviceId();

        const result = await api.studentLogin({
          subscription_code: code,
          device_identifier: deviceId,
        });

        if (!result?.success) {
          showToast(result?.message || "كود الاشتراك غير صحيح", "error");

          return result;
        }

        const data = result.data || {};
        const studentData = data.student || data.user;
        if (!studentData) {
          tokenStorage.clearStudentToken();
          showToast("لم يرجع الخادم بيانات الطالب", "error");
          return {
            success: false,
            message: "لم يرجع الخادم بيانات الطالب",
          };
        }

        const gradeId =
          studentData.grade_id || studentData.gradeId || studentData.grade?.id;
        const studentName =
          studentData.name ||
          `${studentData.first_name || ""} ${studentData.last_name || ""}`.trim();
        const rawSubscription =
          studentData.subscription ||
          studentData.active_subscription ||
          (typeof studentData.subscription_code === "object"
            ? studentData.subscription_code
            : null);
        const rawSubscriptionCode =
          studentData.subscription_code || data.subscription_code || code;
        const resolvedSubscriptionCode =
          typeof rawSubscriptionCode === "string"
            ? rawSubscriptionCode
            : rawSubscriptionCode?.code ||
              rawSubscriptionCode?.subscription_code ||
              rawSubscription?.code ||
              rawSubscription?.subscription_code ||
              code;
        const loggedStudent = {
          ...studentData,
          subscription: rawSubscription,
          name: studentName,
          grade:
            typeof studentData.grade === "string"
              ? studentData.grade
              : studentData.grade?.name ||
                (gradeId ? getGradeNameById(gradeId) : ""),
          gradeId: gradeId || null,
          code: resolvedSubscriptionCode,
          subscription_code: resolvedSubscriptionCode,
        };

        tokenStorage.clearAdminToken();
        tokenStorage.setStudentToken(data.token || result.token);
        setStudent(loggedStudent);
        setUserRole("student");
        setIsAuthenticated(true);

        localStorage.setItem("el_eamid_auth", "true");
        localStorage.setItem("el_eamid_role", "student");

        showToast("تم تسجيل الدخول بنجاح");

        return {
          success: true,
          role: "student",
          data,
        };
      } catch (error) {
        console.error("Student login error:", error);

        showToast("حدث خطأ أثناء تسجيل الدخول", "error");

        return {
          success: false,
          message: error?.message || "Login failed",
        };
      }
    },
    [showToast],
  );

  // ============================================================
  // ACTIVATION REQUEST
  // ============================================================

  const submitActivationRequest = useCallback(
    async (studentData) => {
      try {
        const result = await api.activateStudent(studentData);

        if (!result?.success) {
          showToast(result?.message || "فشل إرسال طلب التفعيل", "error");

          return result;
        }

        const newRequest = {
          id: Date.now(),
          ...studentData,
          status: "pending",
        };

        setPendingRequests((prev) => [...prev, newRequest]);

        showToast("تم إرسال طلب التفعيل بنجاح");

        return result;
      } catch (error) {
        console.error("Activation request error:", error);

        showToast("حدث خطأ أثناء إرسال الطلب", "error");

        return {
          success: false,
          message: error?.message || "Activation failed",
        };
      }
    },
    [showToast],
  );

  // ============================================================
  // ADMIN LOGIN
  // ============================================================

  const adminLoginWithCredentials = useCallback(
    async (credentials) => {
      try {
        const result = await api.adminLogin(credentials);

        if (!result?.success) {
          showToast(
            result?.message || result?.error || "بيانات تسجيل الدخول غير صحيحة",
            "error",
          );

          return result;
        }

        const token =
          result?.token ||
          result?.data?.token ||
          result?.access_token ||
          result?.data?.access_token;

        if (!token) {
          console.error(
            "Admin login succeeded but no token was returned:",
            result,
          );

          showToast("تم تسجيل الدخول لكن لم يتم استلام رمز الدخول", "error");

          return {
            success: false,
            message: "No admin token returned from API",
          };
        }

        tokenStorage.clearStudentToken();
        tokenStorage.setAdminToken(token);

        setUserRole("teacher");
        setIsAuthenticated(true);

        localStorage.setItem("el_eamid_auth", "true");
        localStorage.setItem("el_eamid_role", "teacher");

        showToast("تم تسجيل الدخول بنجاح");

        return {
          success: true,
          role: "teacher",
          token,
          data: result?.data || {},
        };
      } catch (error) {
        console.error("Admin login error:", error);

        showToast("حدث خطأ أثناء تسجيل الدخول", "error");

        return {
          success: false,
          message: error?.message || "Login failed",
        };
      }
    },
    [showToast],
  );

  // ============================================================
  // APPROVE REQUEST
  // ============================================================

  const approveRequest = useCallback(
    async (requestId) => {
      try {
        const result = await api.approveActivationRequest(requestId);

        if (!result?.success) {
          showToast(result?.message || "فشل قبول الطلب", "error");

          return result;
        }

        showToast("تم قبول الطلب بنجاح");

        await fetchPendingRequests();
        await fetchApprovedStudents();

        return result;
      } catch (error) {
        console.error("Approve request error:", error);

        showToast("حدث خطأ أثناء قبول الطلب", "error");

        return {
          success: false,
          message: error?.message || "Approval failed",
        };
      }
    },
    [fetchPendingRequests, fetchApprovedStudents, showToast],
  );

  // ============================================================
  // CANCEL REQUEST
  // ============================================================

  const cancelRequest = useCallback(
    async (requestId) => {
      try {
        const result = await api.cancelActivationRequest(requestId);

        if (!result?.success) {
          showToast(result?.message || "فشل إلغاء الطلب", "error");

          return result;
        }

        showToast("تم إلغاء الطلب");

        await fetchPendingRequests();

        return result;
      } catch (error) {
        console.error("Cancel request error:", error);

        showToast("حدث خطأ أثناء إلغاء الطلب", "error");

        return {
          success: false,
          message: error?.message || "Cancel failed",
        };
      }
    },
    [fetchPendingRequests, showToast],
  );

  // ============================================================
  // PAGINATED STUDENTS (GET /api/v1/admin/students?page=)
  // ============================================================

  const fetchAdminStudents = useCallback(async (page = 1) => {
    setIsLoadingStudents(true);
    try {
      const res = await api.getAllStudents(page);
      if (!res?.success) {
        if (res?.error) showToast(res.error, "error");
        return res;
      }

      const list = Array.isArray(res.data) ? res.data : [];
      setPaginatedStudents(list);
      setStudentsPagination({
        current_page: res.current_page ?? page,
        last_page: res.last_page ?? 1,
        total: res.total ?? list.length,
      });
      return res;
    } catch (error) {
      console.error("Failed to fetch paginated students:", error);
      showToast(error?.message || "Failed to fetch admin students", "error");
      return { success: false, error: error?.message || "Request failed" };
    } finally {
      setIsLoadingStudents(false);
    }
  }, [showToast]);

  // ============================================================
  // DEACTIVATE STUDENT
  // ============================================================

  const deactivateStudent = useCallback(
    async (studentId) => {
      try {
        const approvedRecord = approvedSubscriptions.find((item) => {
          const subscription =
            item.subscription ||
            item.active_subscription ||
            item.subscriptions?.[0] ||
            (typeof item.subscription_code === "object"
              ? item.subscription_code
              : null);
          const currentSubscriptionId =
            item.subscription_id || subscription?.id || item.id;
          return String(currentSubscriptionId) === String(studentId);
        });
        const targetStudentId =
          approvedRecord?.student?.id ||
          approvedRecord?.user?.id ||
          approvedRecord?.student_id ||
          approvedRecord?.user_id;
        const result = await api.deactivateStudent(studentId);

        if (!result?.success) {
          showToast(result?.message || "فشل إلغاء تفعيل الطالب", "error");

          return result;
        }

        showToast("تم إلغاء تفعيل الطالب");

        await fetchApprovedStudents();
        await fetchAdminStudents();
        if (targetStudentId != null) {
          setPaginatedStudents((current) =>
            current.map((student) =>
              String(student.student_id || student.id) ===
              String(targetStudentId)
                ? { ...student, subscription_status: "inactive" }
                : student,
            ),
          );
        }

        return result;
      } catch (error) {
        console.error("Deactivate student error:", error);

        showToast("حدث خطأ", "error");

        return {
          success: false,
          message: error?.message || "Deactivation failed",
        };
      }
    },
    [approvedSubscriptions, fetchApprovedStudents, fetchAdminStudents, showToast],
  );

  const deleteDeactivatedStudentRecord = useCallback(
    async ({ studentId, subscriptionId }) => {
      try {
        const result = subscriptionId
          ? await api.deleteDeactivatedSubscription(subscriptionId)
          : await api.deleteDeactivatedStudent(studentId);

        if (!result?.success) {
          showToast(
            result?.message || result?.error || "Failed to permanently delete the student",
            "error",
          );
          return result;
        }

        setPaginatedStudents((current) =>
          current.filter(
            (student) =>
              String(student.student_id || student.id) !== String(studentId),
          ),
        );
        setStudentsPagination((current) => ({
          ...current,
          total: Math.max(0, current.total - 1),
        }));

        showToast("تم حذف الطالب والاشتراك نهائيًا");
        await fetchApprovedStudents();
        await fetchAdminStudents();
        return result;
      } catch (error) {
        console.error("Delete deactivated student error:", error);
        showToast(error?.message || "Failed to permanently delete the student", "error");
        return { success: false, message: error?.message || "Delete failed" };
      }
    },
    [fetchAdminStudents, fetchApprovedStudents, showToast],
  );

  const deactivateAndDeleteStudentRecord = useCallback(
    async ({ studentId, subscriptionId }) => {
      if (!subscriptionId) {
        return {
          success: false,
          message: "A subscription ID is required to deactivate an active student",
        };
      }

      let deactivated = false;
      try {
        const deactivation = await api.deactivateStudent(subscriptionId);
        if (!deactivation?.success) {
          showToast(
            deactivation?.message ||
              deactivation?.error ||
              "\u0641\u0634\u0644 \u062a\u0639\u0637\u064a\u0644 \u0627\u0634\u062a\u0631\u0627\u0643 \u0627\u0644\u0637\u0627\u0644\u0628",
            "error",
          );
          return deactivation;
        }
        deactivated = true;

        const deletion = await api.deleteDeactivatedSubscription(subscriptionId);
        if (!deletion?.success) {
          showToast(
            deletion?.message ||
              deletion?.error ||
              "\u062a\u0645 \u0627\u0644\u062a\u0639\u0637\u064a\u0644\u060c \u0644\u0643\u0646 \u062a\u0639\u0630\u0631 \u0627\u0644\u062d\u0630\u0641 \u0627\u0644\u0646\u0647\u0627\u0626\u064a",
            "error",
          );
          await Promise.all([fetchApprovedStudents(), fetchAdminStudents()]);
          return { ...deletion, success: false, deactivated: true };
        }

        setPaginatedStudents((current) =>
          current.filter(
            (student) =>
              String(student.student_id || student.id) !== String(studentId),
          ),
        );
        setStudentsPagination((current) => ({
          ...current,
          total: Math.max(0, current.total - 1),
        }));
        showToast("\u062a\u0645 \u062a\u0639\u0637\u064a\u0644 \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643 \u0648\u062d\u0630\u0641 \u0627\u0644\u0637\u0627\u0644\u0628 \u0646\u0647\u0627\u0626\u064a\u064b\u0627");
        await Promise.all([fetchApprovedStudents(), fetchAdminStudents()]);
        return deletion;
      } catch (error) {
        console.error("Deactivate and delete student error:", error);
        showToast(
          error?.message || "\u062d\u062f\u062b \u062e\u0637\u0623 \u0623\u062b\u0646\u0627\u0621 \u062a\u0646\u0641\u064a\u0630 \u0627\u0644\u0639\u0645\u0644\u064a\u0629",
          "error",
        );
        if (deactivated) {
          await Promise.all([fetchApprovedStudents(), fetchAdminStudents()]);
        }
        return {
          success: false,
          deactivated,
          message: error?.message || "Operation failed",
        };
      }
    },
    [fetchAdminStudents, fetchApprovedStudents, showToast],
  );

  // ============================================================
  // RESET DEVICE
  // ============================================================

  const resetStudentDevice = useCallback(
    async (studentId) => {
      try {
        const result = await api.resetStudentDevice(studentId);

        if (!result?.success) {
          if (
            result?.error?.includes(
              "This subscription does not have an active trusted device",
            )
          ) {
            showToast(
              "لا يوجد جهاز موثوق نشط لهذا الاشتراك لإعادة ضبطه.",
              "error",
            );
            return result;
          }
          showToast(
            result?.message || result?.error || "فشل إعادة ضبط الجهاز",
            "error",
          );

          return result;
        }

        showToast("تم إعادة ضبط الجهاز بنجاح");

        await fetchApprovedStudents();
        await fetchAdminStudents();

        return result;
      } catch (error) {
        console.error("Reset device error:", error);

        showToast("حدث خطأ", "error");

        return {
          success: false,
          message: error?.message || "Reset failed",
        };
      }
    },
    [fetchApprovedStudents, fetchAdminStudents, showToast],
  );

  // ============================================================
  // FETCH SUBSCRIPTION CODES (GET /api/v1/admin/subscription-codes)
  // ============================================================

  const fetchSubscriptionCodes = useCallback(
    async (grade = 1) => {
      setIsLoadingCodes(true);
      try {
        const gradeId =
          typeof grade === "number"
            ? grade
            : isNaN(Number(grade))
              ? getGradeIdByName(grade)
              : Number(grade);

        const result = await api.getSubscriptionCodes(gradeId || 1);

        if (result?.success) {
          const list = Array.isArray(result.data)
            ? result.data
            : result.data?.students || result.data?.data || [];
          setSubscriptionCodesList(list);
          return { success: true, data: list };
        } else {
          setSubscriptionCodesList([]);
          showToast(result?.message || "فشل تحميل أكواد الاشتراك", "error");
          return result;
        }
      } catch (error) {
        console.error("Subscription codes error:", error);
        setSubscriptionCodesList([]);
        return {
          success: false,
          message: error?.message || "Failed",
        };
      } finally {
        setIsLoadingCodes(false);
      }
    },
    [showToast],
  );

  // ============================================================
  // ADMIN EXAMS CRUD (GET, POST, PUT, DELETE /api/v1/admin/exams)
  // ============================================================

  const fetchAdminExams = useCallback(async () => {
    setIsLoadingExams(true);
    try {
      const exams = await api.getAdminExams();
      if (Array.isArray(exams)) {
        setAdminExamsList(exams);
        return exams;
      }
      return [];
    } catch (error) {
      console.error("Failed to fetch admin exams:", error);
      return [];
    } finally {
      setIsLoadingExams(false);
    }
  }, []);

  const fetchAdminExamDetails = useCallback(async (examId) => {
    try {
      const response = await api.getAdminExamDetails(examId);
      const exam = response?.exam || response?.data?.exam || response?.data || response;
      if (!exam || String(exam.id) !== String(examId)) return null;

      setAdminExamsList((current) =>
        current.map((item) =>
          String(item.id) === String(examId) ? { ...item, ...exam } : item,
        ),
      );
      return exam;
    } catch (error) {
      console.error("Failed to fetch admin exam details:", error);
      return null;
    }
  }, []);

  const createAdminExam = useCallback(
    async (payload) => {
      try {
        const res = await api.createAdminExam(payload);
        showToast("تم إنشاء الاختبار بنجاح");
        await fetchAdminExams();
        return { success: true, data: res?.data || res?.exam || res };
      } catch (error) {
        console.error("Create exam error:", error);
        const serverMessage = [
          error?.data?.message,
          ...Object.values(error?.data?.errors || {}).flat(),
        ].filter(Boolean).join(" ");
        const duplicateExam = error?.status === 409 ||
          /already\s+exists|duplicate|unique|exam.+exists|quiz.+exists/i.test(serverMessage);
        const message = duplicateExam
          ? "\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0645\u062a\u062d\u0627\u0646 \u0644\u0647\u0630\u0627 \u0627\u0644\u062f\u0631\u0633 \u0628\u0627\u0644\u0641\u0639\u0644. \u064a\u0645\u0643\u0646\u0643 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0623\u0633\u0626\u0644\u0629 \u0625\u0644\u0649 \u0627\u0644\u0627\u0645\u062a\u062d\u0627\u0646 \u0627\u0644\u0645\u0648\u062c\u0648\u062f."
          : error.message || "\u0641\u0634\u0644 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0627\u0645\u062a\u062d\u0627\u0646";
        showToast(message, "error");
        return { success: false, message };
      }
    },
    [fetchAdminExams, showToast],
  );

  const updateAdminExam = useCallback(
    async (examId, payload) => {
      try {
        const res = await api.updateAdminExam(examId, payload);
        showToast("تم تعديل الاختبار بنجاح");
        await fetchAdminExams();
        return { success: true, data: res };
      } catch (error) {
        console.error("Update exam error:", error);
        showToast(error.message || "فشل تعديل الاختبار", "error");
        return { success: false, message: error.message };
      }
    },
    [fetchAdminExams, showToast],
  );

  const deleteAdminExam = useCallback(
    async (examId) => {
      try {
        await api.deleteAdminExam(examId);
        showToast("تم حذف الاختبار بنجاح");
        await fetchAdminExams();
        return { success: true };
      } catch (error) {
        console.error("Delete exam error:", error);
        showToast(error.message || "فشل حذف الاختبار", "error");
        return { success: false, message: error.message };
      }
    },
    [fetchAdminExams, showToast],
  );

  // ============================================================
  // QUESTIONS & OPTIONS CRUD
  // ============================================================

  const createAdminQuestion = useCallback(
    async (examId, payload) => {
      try {
        const res = await api.createAdminQuestion(examId, payload);
        // Keep the returned API resource intact so callers can reliably read
        // the created question id before creating its answer options.
        return { success: true, data: res?.data || res };
      } catch (error) {
        console.error("Create question error:", error);
        showToast(error.message || "فشل إضافة السؤال", "error");
        return { success: false, message: error.message };
      }
    },
    [fetchAdminExams, showToast],
  );

  const updateAdminQuestion = useCallback(
    async (questionId, payload) => {
      try {
        const res = await api.updateAdminQuestion(questionId, payload);
        showToast("تم تعديل السؤال بنجاح");
        await fetchAdminExams();
        return { success: true, data: res };
      } catch (error) {
        console.error("Update question error:", error);
        showToast(error.message || "فشل تعديل السؤال", "error");
        return { success: false, message: error.message };
      }
    },
    [fetchAdminExams, showToast],
  );

  const deleteAdminQuestion = useCallback(
    async (questionId) => {
      try {
        await api.deleteAdminQuestion(questionId);
        showToast("تم حذف السؤال بنجاح");
        await fetchAdminExams();
        return { success: true };
      } catch (error) {
        console.error("Delete question error:", error);
        showToast(error.message || "فشل حذف السؤال", "error");
        return { success: false, message: error.message };
      }
    },
    [fetchAdminExams, showToast],
  );

  const createAdminOption = useCallback(
    async (questionId, payload) => {
      try {
        const res = await api.createAdminOption(questionId, payload);
        return { success: true, data: res?.data || res };
      } catch (error) {
        console.error("Create option error:", error);
        showToast(error.message || "فشل إضافة الخيار", "error");
        return { success: false, message: error.message };
      }
    },
    [fetchAdminExams, showToast],
  );

  const updateAdminOption = useCallback(
    async (optionId, payload) => {
      try {
        const res = await api.updateAdminOption(optionId, payload);
        showToast("تم تعديل خيار الإجابة");
        await fetchAdminExams();
        return { success: true, data: res };
      } catch (error) {
        console.error("Update option error:", error);
        showToast(error.message || "فشل تعديل الخيار", "error");
        return { success: false, message: error.message };
      }
    },
    [fetchAdminExams, showToast],
  );

  const deleteAdminOption = useCallback(
    async (optionId) => {
      try {
        await api.deleteAdminOption(optionId);
        showToast("تم حذف خيار الإجابة");
        await fetchAdminExams();
        return { success: true };
      } catch (error) {
        console.error("Delete option error:", error);
        showToast(error.message || "فشل حذف الخيار", "error");
        return { success: false, message: error.message };
      }
    },
    [fetchAdminExams, showToast],
  );

  // ============================================================
  // LESSONS FETCHING (GET /api/v1/admin/lessons or student/lessons)
  // ============================================================

  const fetchLessons = useCallback(
    async (gradeId = null) => {
      setIsLoadingLessons(true);
      try {
        if (userRole === "teacher") {
          const remoteLessons = await api.getAdminLessons(gradeId);
          if (remoteLessons === null) {
            showToast("تعذر الاتصال بالخادم لتحميل الدروس", "error");
            return null;
          }
          if (Array.isArray(remoteLessons)) {
            setLessonsList(
              remoteLessons.filter((lesson) => lesson?.id).map((l, idx) => {
                const video = l.video || l.videos?.[0] || null;
                const sectionName =
                  l.section_name || l.section?.name || l.branch || "";
                const gradeId =
                  l.grade_id || l.gradeId || l.section?.grade_id || l.grade?.id;

                return {
                  ...l,
                  video,
                videoId: video?.id || l.video_id || l.videoId || null,
                  id: l.id,
                  number: idx + 1,
                  title: l.title || "درس رياضيات",
                  branch: sectionName,
                  grade: l.grade?.name || l.grade_name || (gradeId ? getGradeNameById(gradeId) : ""),
                  gradeId: gradeId || null,
                  description: l.description || "",
                  duration: video?.duration || l.duration || "",
                  videoUrl:
                    video?.video_url || video?.url || l.video_url || l.videoUrl || "",
                  quiz: l.quiz || null,
                };
              }),
            );
            return remoteLessons;
          }
        } else if (userRole === "student") {
          const studentLessons = await api.getStudentLessons();
          if (Array.isArray(studentLessons)) {
            setLessonsList(
              studentLessons.filter((lesson) => lesson?.id).map((l, idx) => {
                const video = l.video || l.videos?.[0] || null;
                const sectionName =
                  l.section_name || l.section?.name || l.branch || "";
                const gradeId =
                  l.grade_id || l.gradeId || l.section?.grade_id || l.grade?.id;

                return {
                  ...l,
                  video,
                  videoId: video?.id || l.video_id || l.videoId || null,
                  id: l.id,
                  number: idx + 1,
                  title: l.title || "درس رياضيات",
                  branch: sectionName,
                  grade: l.grade?.name || l.grade_name || (gradeId ? getGradeNameById(gradeId) : ""),
                  gradeId: gradeId || null,
                  description: l.description || "",
                  duration: video?.duration || l.duration || "",
                  videoUrl:
                    video?.video_url || video?.url || l.video_url || l.videoUrl || "",
                  isCompleted: Boolean(l.is_completed),
                  progress: l.progress || 0,
                  accessStatus: l.access_status || "",
                  quiz: l.quiz || null,
                };
              }),
            );
            return studentLessons;
          }
        }
        return null;
      } catch (err) {
        console.warn("Fetch lessons notice:", err);
        showToast(
          err?.message || "تعذر تحميل الدروس من الخادم",
          "error",
        );
        return null;
      } finally {
        setIsLoadingLessons(false);
      }
    },
    [userRole, showToast],
  );

  // ============================================================
  // STUDENT EXAMS & VIDEOS HELPERS
  // ============================================================

  const getStudentExam = useCallback(async (examId) => {
    return await api.getStudentExam(examId);
  }, []);

  const getStudentLessonDetails = useCallback(async (lessonId) => {
    return await api.getStudentLesson(lessonId);
  }, []);

  const getStudentExamAttempts = useCallback(async (examId) => {
    return await api.getStudentExamAttempts(examId);
  }, []);

  const getStudentLessonQuizAnswers = useCallback(
    async (lessonId, attemptId) =>
      api.getStudentLessonQuizAnswers(lessonId, attemptId),
    [],
  );

  const getStudentVideo = useCallback(async (videoId) => {
    return await api.getStudentVideo(videoId);
  }, []);

  const downloadStudentMemo = useCallback(
    async (memoId) => api.downloadStudentMemo(memoId),
    [],
  );

  const downloadStudentMaterial = useCallback(
    async (materialId) => api.downloadStudentMaterial(materialId),
    [],
  );

  // ============================================================
  // BACKWARD COMPATIBLE LOGIN
  // ============================================================

  const loginWithCredentials = useCallback(
    async ({ email = "", password = "", code = "" } = {}) => {
      if (email.trim() && password) {
        return adminLoginWithCredentials({ email, password });
      }

      return studentLoginWithCode(code);
    },
    [adminLoginWithCredentials, studentLoginWithCode],
  );

  // ============================================================
  // LOGIN WITH CODE
  // ============================================================

  const loginWithCode = useCallback(
    async (code) => {
      return studentLoginWithCode(code);
    },
    [studentLoginWithCode],
  );

  // ============================================================
  // REGISTER STUDENT
  // ============================================================

  const registerStudent = useCallback(
    async (studentData) => {
      return submitActivationRequest(studentData);
    },
    [submitActivationRequest],
  );

  // ============================================================
  // LOGOUT
  // ============================================================

  const logout = useCallback(async () => {
    try {
      if (userRole === "student") {
        await api.studentLogout();
      } else if (userRole === "teacher") {
        await api.adminLogout();
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      tokenStorage.clearTokens();
    }

    setIsAuthenticated(false);

    localStorage.removeItem("el_eamid_auth");
    localStorage.removeItem("el_eamid_role");
    localStorage.removeItem("el_eamid_student");

    setUserRole("student");
    setStudent(null);
    setLessonsList([]);
    setStudentExamsList([]);
    setMemosList([]);

    showToast("تم تسجيل الخروج");
  }, [userRole, showToast]);

  // ============================================================
  // SELECT ACTIVE STUDENT
  // ============================================================

  const selectActiveStudent = useCallback((selectedStudent) => {
    setStudent(selectedStudent);
  }, []);

  // ============================================================
  // LESSONS - ADD
  // ============================================================

  const addLesson = useCallback(
    async (lessonData) => {
      try {
        const gradeId =
          Number(lessonData.grade_id || lessonData.gradeId) ||
          getGradeIdByName(lessonData.grade);
        const result = await api.createAdminLesson({
          ...lessonData,
          grade_id: gradeId,
        });

        if (result?.success === false) {
          throw new Error(result.message || result.error || "فشل حفظ الدرس");
        }

        const savedLesson =
          result?.lesson ||
          result?.data?.lesson ||
          result?.data?.data ||
          result?.data ||
          result ||
          {};
        const createdLesson = savedLesson?.lesson || savedLesson;
        await fetchLessons();
        showToast("تمت إضافة الدرس بنجاح", "success");

        return {
          success: true,
          data: createdLesson,
        };
      } catch (error) {
        console.error("Create lesson API error:", error);
        showToast(error.message || "فشل إضافة الدرس إلى الخادم", "error");
        return { success: false, message: error.message };
      }
    },
    [fetchLessons, showToast],
  );

  const saveAdminLessonQuiz = useCallback(
    async (lessonId, payload) => {
      try {
        const data = await api.saveAdminLessonQuiz(lessonId, payload);
        await fetchLessons();
        showToast("تم حفظ اختبار الدرس بنجاح", "success");
        return { success: true, data };
      } catch (error) {
        showToast(error.message || "تعذّر حفظ اختبار الدرس", "error");
        return { success: false, message: error.message };
      }
    },
    [fetchLessons, showToast],
  );

  // ============================================================
  // LESSONS - DELETE
  // ============================================================

  const deleteLesson = useCallback(
    async (lessonId) => {
      try {
        const result = await api.deleteAdminLesson(lessonId);
        if (result?.success === false) {
          throw new Error(result.message || result.error || "فشل حذف الدرس");
        }

        setLessonsList((prev) => {
          return prev.filter((lesson) => String(lesson.id) !== String(lessonId));
        });

        await fetchLessons();
        showToast(
          result?.isOfflineMode
            ? "تعذر الاتصال بالخادم؛ تم الحذف محليًا فقط"
            : "تم حذف الدرس من الخادم",
          result?.isOfflineMode ? "error" : "success",
        );
        return { success: true, isOfflineMode: result?.isOfflineMode };
      } catch (error) {
        console.error("Delete lesson API error:", error);
        showToast(error.message || "فشل حذف الدرس من الخادم", "error");
        return { success: false, message: error.message };
      }
    },
    [fetchLessons, showToast],
  );

  // ============================================================
  // QUIZ - ADD QUESTION
  // ============================================================

  const addQuestionToLessonQuiz = useCallback(
    async (lessonId, question) => {
      try {
        const lesson = lessonsList.find(
          (item) => String(item.id) === String(lessonId),
        );
        if (!lesson) throw new Error("الدرس المطلوب غير موجود في بيانات الخادم");

        const existingQuestions = (lesson.quiz?.questions || []).map(
          (existing, questionIndex) => {
            const options = existing.options || existing.choices || [];
            const correctIndex = Number.isInteger(existing.correctIndex)
              ? existing.correctIndex
              : options.findIndex(
                  (option) =>
                    option?.is_correct ||
                    option?.isCorrect ||
                    option?.id === existing.correct_option_id,
                );
            return {
              question_text:
                existing.question_text || existing.question || existing.text || "",
              points: Number(existing.points) || 1,
              sort_order: existing.sort_order || questionIndex + 1,
              options: options.map((option, optionIndex) => ({
                option_text:
                  typeof option === "string"
                    ? option
                    : option.option_text || option.text || "",
                is_correct:
                  typeof option === "object"
                    ? Boolean(
                        option.is_correct ||
                          option.isCorrect ||
                          option.id === existing.correct_option_id,
                      )
                    : optionIndex === correctIndex,
                sort_order: option.sort_order || optionIndex + 1,
              })),
            };
          },
        );
        const newOptions = (question.options || []).map((option, index) => ({
          option_text:
            typeof option === "string"
              ? option
              : option.option_text || option.text || "",
          is_correct: index === question.correctIndex,
          sort_order: index + 1,
        }));

        const result = await api.saveAdminLessonQuiz(lessonId, {
          title: lesson.quiz?.title || `اختبار: ${lesson.title || ""}`,
          description: lesson.quiz?.description || "",
          duration_minutes:
            lesson.quiz?.duration_minutes || lesson.quiz?.durationMinutes || 10,
          passing_percentage: lesson.quiz?.passing_percentage || 60,
          questions: [
            ...existingQuestions,
            {
              question_text: String(question.question || "").trim(),
              points: 1,
              sort_order: existingQuestions.length + 1,
              options: newOptions,
            },
          ],
        });
        await fetchLessons();
        showToast("تم حفظ السؤال في الخادم");
        return { success: true, data: result };
      } catch (error) {
        showToast(error?.message || "تعذر حفظ السؤال في الخادم", "error");
        return { success: false, message: error?.message || "تعذر حفظ السؤال" };
      }
    },
    [fetchLessons, lessonsList, showToast],
  );

  // ============================================================
  // QUIZ - DELETE QUESTION
  // ============================================================

  const deleteQuestionFromQuiz = useCallback(
    async (lessonId, questionId) => {
      try {
        await api.deleteAdminQuestion(questionId);
        await fetchLessons();
        showToast("تم حذف السؤال من الخادم");
        return { success: true };
      } catch (error) {
        showToast(error?.message || "تعذر حذف السؤال من الخادم", "error");
        return { success: false, message: error?.message || "تعذر حذف السؤال" };
      }
    },
    [fetchLessons, showToast],
  );

  // ============================================================
  // VIDEO PROGRESS
  // ============================================================

  const reportVideoProgress = useCallback(async (lessonId, progressData) => {
    try {
      const res = await api.updateVideoProgress(lessonId, progressData);

      if (!res?.success) return res;

      const completionPercentage = Number(
        res.data?.completion_percentage ??
          res.data?.progress?.completion_percentage ??
          progressData?.completion_percentage,
      );
      if (Number.isFinite(completionPercentage)) {
        setLessonsList((prev) => {
          const updated = prev.map((l) =>
            l.id === Number(lessonId) ||
            l.video_id === Number(lessonId) ||
            l.videoId === Number(lessonId) ||
            l.video?.id === Number(lessonId) ||
            l.videos?.some((video) => video.id === Number(lessonId))
              ? {
                  ...l,
                  isCompleted:
                    completionPercentage >= 90 || Boolean(l.isCompleted),
                  progress: completionPercentage,
                }
              : l,
          );
          return updated;
        });
      }

      return res;
    } catch (error) {
      console.error("Video progress error:", error);

      return {
        success: false,
        message: error?.message || "Failed",
      };
    }
  }, []);

  const fetchStudentExams = useCallback(async () => {
    setIsLoadingStudentExams(true);
    try {
      const exams = await api.getStudentExams();
      setStudentExamsList(exams);
      return { success: true, data: exams };
    } catch (error) {
      setStudentExamsList([]);
      showToast(error?.message || "تعذر تحميل اختبارات الطالب", "error");
      return { success: false, error: error?.message || "تعذر تحميل الاختبارات" };
    } finally {
      setIsLoadingStudentExams(false);
    }
  }, [showToast]);

  // ============================================================
  // START EXAM
  // ============================================================

  const startExamAttempt = useCallback(async (examId) => {
    try {
      return await api.startExamAttempt(examId);
    } catch (error) {
      console.error("Start exam error:", error);

      return {
        success: false,
        message: error?.message || "Failed",
      };
    }
  }, []);

  // ============================================================
  // SUBMIT EXAM
  // ============================================================

  const submitExamAttempt = useCallback(async (examId, answers) => {
    try {
      return await api.submitExamAttempt(examId, answers);
    } catch (error) {
      console.error("Submit exam error:", error);

      return {
        success: false,
        message: error?.message || "Failed",
      };
    }
  }, []);

  const updateStudentProfile = useCallback(
    async (payload) => {
      try {
        const result = await api.updateStudentProfile(payload);
        const updatedProfile = result?.data?.student || result?.data?.user || result?.data;
        if (updatedProfile && typeof updatedProfile === "object") {
          setStudent((current) => ({ ...current, ...updatedProfile }));
        }
        await fetchStudentProfile();
        showToast("تم تحديث بيانات الحساب");
        return { success: true, data: updatedProfile || result?.data };
      } catch (error) {
        showToast(error?.message || "تعذر تحديث بيانات الحساب", "error");
        return { success: false, error: error?.message || "تعذر تحديث البيانات" };
      }
    },
    [fetchStudentProfile, showToast],
  );

  // ============================================================
  // MEMOS - ADMIN API
  // ============================================================

  const fetchStudentMemos = useCallback(async () => {
    setIsLoadingMemos(true);
    try {
      const memos = await api.getStudentMemos();
      setMemosList(memos);
      return { success: true, data: memos };
    } catch (error) {
      setMemosList([]);
      showToast(error?.message || "تعذر تحميل مذكرات الطالب", "error");
      return { success: false, error: error?.message || "تعذر تحميل المذكرات" };
    } finally {
      setIsLoadingMemos(false);
    }
  }, [showToast]);

  const fetchAdminMemos = useCallback(
    async (gradeId = null) => {
      setIsLoadingMemos(true);
      try {
        const response = await api.getAdminMemos(gradeId);
        setMemosList(response);
        return { success: true, data: response };
      } catch (error) {
        console.error("Fetch admin memos error:", error);
        setMemosList([]);
        showToast(error?.message || "تعذر تحميل المذكرات", "error");
        return { success: false, message: error?.message || "فشل تحميل المذكرات" };
      } finally {
        setIsLoadingMemos(false);
      }
    },
    [showToast],
  );

  const fetchAdminMemoDetails = useCallback(
    async (memoId) => {
      try {
        return await api.getAdminMemoDetails(memoId);
      } catch (error) {
        console.error("Fetch admin memo details error:", error);
        showToast(error?.message || "تعذر تحميل تفاصيل المذكرة", "error");
        return null;
      }
    },
    [showToast],
  );

  const addMemo = useCallback(
    async (memoData) => {
      try {
        const createdMemo = await api.createAdminMemo(memoData);
        await fetchAdminMemos();
        showToast("تم إضافة المذكرة");
        return { success: true, data: createdMemo };
      } catch (error) {
        console.error("Create admin memo error:", error);
        showToast(error?.message || "فشل إضافة المذكرة", "error");
        return { success: false, message: error?.message || "فشل إضافة المذكرة" };
      }
    },
    [fetchAdminMemos, showToast],
  );

  const updateMemo = useCallback(
    async (memoId, updatedData) => {
      try {
        const response = await api.updateAdminMemo(memoId, updatedData);
        const updatedMemo = response?.memo || response;
        await fetchAdminMemos();
        showToast("تم تعديل المذكرة");
        return { success: true, data: updatedMemo };
      } catch (error) {
        console.error("Update admin memo error:", error);
        showToast(error?.message || "فشل تعديل المذكرة", "error");
        return { success: false, message: error?.message || "فشل تعديل المذكرة" };
      }
    },
    [fetchAdminMemos, showToast],
  );

  const deleteMemo = useCallback(
    async (memoId) => {
      try {
        await api.deleteAdminMemo(memoId);
        await fetchAdminMemos();
        showToast("تم حذف المذكرة");
        return { success: true };
      } catch (error) {
        console.error("Delete admin memo error:", error);
        showToast(error?.message || "فشل حذف المذكرة", "error");
        return { success: false, message: error?.message || "فشل حذف المذكرة" };
      }
    },
    [fetchAdminMemos, showToast],
  );

  // ============================================================
  // LOCAL STUDENT CRUD
  // ============================================================

  const addStudent = useCallback(
    (studentData) => {
      const newStudent = {
        id: Date.now(),
        ...studentData,
      };

      setStudentsList((prev) => {
        const updated = [...prev, newStudent];

        localStorage.setItem("el_eamid_students_list", JSON.stringify(updated));

        return updated;
      });

      showToast("تم إضافة الطالب");
    },
    [showToast],
  );

  const updateStudent = useCallback(
    (studentId, updatedData) => {
      setStudentsList((prev) => {
        const updated = prev.map((item) =>
          item.id === studentId
            ? {
                ...item,
                ...updatedData,
              }
            : item,
        );

        localStorage.setItem("el_eamid_students_list", JSON.stringify(updated));

        return updated;
      });

      showToast("تم تعديل بيانات الطالب");
    },
    [showToast],
  );

  const deleteStudent = useCallback(
    async (studentId) => {
      const result = await api.deleteDeactivatedStudent(studentId);
      if (!result?.success) {
        showToast(
          result?.message || result?.error || "Failed to delete deactivated student",
          "error",
        );
        return result;
      }

      setStudentsList((current) => {
        const updated = current.filter(
          (item) => String(item.id) !== String(studentId),
        );
        localStorage.setItem("el_eamid_students_list", JSON.stringify(updated));
        return updated;
      });
      await Promise.all([fetchApprovedStudents(), fetchAdminStudents()]);
      showToast("\u062a\u0645 \u062d\u0630\u0641 \u0627\u0644\u0637\u0627\u0644\u0628 \u0645\u0646 \u0627\u0644\u062e\u0627\u062f\u0645 \u0628\u0646\u062c\u0627\u062d");
      return result;
    },
    [fetchAdminStudents, fetchApprovedStudents, showToast],
  );

  // ============================================================
  // ADMIN STUDENT API INTEGRATION
  // ============================================================

  const createStudentByAdmin = useCallback(
    async (studentData) => {
      try {
        const result = await api.createStudentByAdmin(studentData);
        if (result?.success) {
          const gradeId = Number(
            studentData.grade_id || studentData.gradeId || 1,
          );
          const createdStudent =
            result.student ||
            result.data?.student ||
            result.data?.data?.student ||
            result.data?.data ||
            result.data;
          const [, codesResult] = await Promise.all([
            fetchApprovedStudents(),
            fetchSubscriptionCodes(gradeId),
          ]);
          const studentName =
            `${studentData.first_name || studentData.firstName || ""} ${
              studentData.last_name || studentData.lastName || ""
            }`.trim();
          const createdCode =
            createdStudent?.subscription_code ||
            createdStudent?.subscription?.code ||
            codesResult?.data?.find(
              (item) =>
                (createdStudent?.id &&
                  String(item.student_id) === String(createdStudent.id)) ||
                item.student_name?.trim() === studentName,
            )?.subscription_code;

          showToast(
            createdCode
              ? `تم إنشاء حساب الطالب. كود الاشتراك: ${createdCode}`
              : result?.message ||
                  "تم إنشاء حساب الطالب وتفعيل كود الاشتراك بنجاح",
          );
          return { success: true, ...result };
        }
        showToast(result?.message || "فشل إنشاء حساب الطالب", "error");
        return result;
      } catch (error) {
        console.error("Create student by admin error:", error);
        showToast(error.message || "حدث خطأ أثناء إنشاء الطالب", "error");
        return { success: false, message: error.message };
      }
    },
    [fetchApprovedStudents, fetchSubscriptionCodes, showToast],
  );

  const updateStudentByAdmin = useCallback(
    async (studentId, updatedData) => {
      try {
        const result = await api.updateStudent(studentId, updatedData);
        showToast("تم تحديث بيانات الطالب بنجاح");
        await fetchApprovedStudents();
        await fetchAdminStudents();
        return { success: true, ...result };
      } catch (error) {
        console.error("Update student error:", error);
        showToast(
          error.message || "حدث خطأ أثناء تحديث بيانات الطالب",
          "error",
        );
        return { success: false, message: error.message };
      }
    },
    [fetchApprovedStudents, fetchAdminStudents, showToast],
  );

  // ============================================================
  // LOAD DATA AFTER AUTHENTICATION
  // ============================================================

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const timer = setTimeout(() => {
      if (userRole === "teacher") {
        fetchPendingRequests();
        fetchApprovedStudents();
        fetchAdminExams();
        fetchSubscriptionCodes(1);
        fetchAdminStudents(1);
        fetchLessons();
      }

      if (userRole === "student") {
        fetchStudentProfile();
        fetchLessons();
        fetchStudentExams();
      }
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, [
    isAuthenticated,
    isAuthReady,
    userRole,
    fetchPendingRequests,
    fetchApprovedStudents,
    fetchAdminExams,
    fetchAdminExamDetails,
    fetchSubscriptionCodes,
    fetchAdminStudents,
    fetchLessons,
    fetchStudentProfile,
    fetchStudentExams,
  ]);

  // ============================================================
  // CONTEXT VALUE
  // ============================================================

  const value = {
    // Auth
    isAuthenticated,
    isAuthReady,
    userRole,
    student,
    setStudent,
    studentsList,
    setStudentsList,

    // Requests
    pendingRequests,
    approvedSubscriptions,
    pendingLoading,
    approvedLoading,
    isLoadingRequests: pendingLoading,
    isLoadingApproved: approvedLoading,
    fetchPendingRequests,
    fetchApprovedStudents,

    // Subscription Codes (Admin)
    subscriptionCodesList,
    isLoadingCodes,
    fetchSubscriptionCodes,

    // Admin Exams & Questions & Options
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

    // Admin Students Pagination
    paginatedStudents,
    studentsPagination,
    isLoadingStudents,
    fetchAdminStudents,

    // Profile
    fetchStudentProfile,
    updateStudentProfile,

    // UI
    toast,
    setToast,
    showToast,
    isAuthModalOpen,
    openAuthModal,
    closeAuthModal,

    // Authentication
    studentLoginWithCode,
    adminLoginWithCredentials,
    loginWithCredentials,
    loginWithCode,
    registerStudent,
    submitActivationRequest,
    logout,
    selectActiveStudent,

    // Admin requests
    approveRequest,
    cancelRequest,
    deactivateStudent,
    deleteDeactivatedStudentRecord,
    deactivateAndDeleteStudentRecord,
    resetStudentDevice,
    approveActivationRequest: approveRequest,
    cancelActivationRequest: cancelRequest,
    deactivateStudentSubscription: deactivateStudent,
    resetTrustedDevice: resetStudentDevice,

    // Lessons
    lessonsList,
    setLessonsList,
    isLoadingLessons,
    fetchLessons,
    studentExamsList,
    isLoadingStudentExams,
    fetchStudentExams,
    getStudentExamAttempts,
    getStudentLessonQuizAnswers,
    getStudentLessonDetails,
    downloadStudentMemo,
    downloadStudentMaterial,
    addLesson,
    deleteLesson,
    saveAdminLessonQuiz,

    // Quiz
    addQuestionToLessonQuiz,
    deleteQuestionFromQuiz,

    // Student learning & exams
    reportVideoProgress,
    startExamAttempt,
    submitExamAttempt,
    getStudentExam,
    getStudentVideo,

    // Memos
    memosList,
    setMemosList,
    isLoadingMemos,
    fetchStudentMemos,
    fetchAdminMemos,
    fetchAdminMemoDetails,
    addMemo,
    updateMemo,
    deleteMemo,

    // Students
    addStudent,
    updateStudent,
    deleteStudent,
    createStudentByAdmin,
    updateStudentByAdmin,
    updateStudentByTeacher: updateStudent,
    deleteStudentByTeacher: deleteStudent,
    getStudentDetails,

    // Constants
    GRADES,
    TEACHER_INFO,
  };

  return (
    <StudentContext.Provider value={value}>{children}</StudentContext.Provider>
  );
};

export default StudentProvider;
