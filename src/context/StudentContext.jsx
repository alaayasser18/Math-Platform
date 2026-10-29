import { useCallback, useEffect, useRef, useState } from "react";

import { GRADES, TEACHER_INFO } from "../data/platformData";

import {
  api,
  tokenStorage,
  getGradeNameById,
  getGradeIdByName,
  getOrCreateDeviceId,
} from "../services/api";

import { StudentContext } from "./StudentContextValue";

// ============================================================
// HELPERS (pure functions, no state)
// ============================================================

const normalizeLesson = (lesson, index, { forStudent = false } = {}) => {
  const video = lesson.video || lesson.videos?.[0] || null;
  const sectionName =
    lesson.section_name || lesson.section?.name || lesson.branch || "";
  const gradeId =
    lesson.grade_id ||
    lesson.gradeId ||
    lesson.section?.grade_id ||
    lesson.grade?.id;

  return {
    ...lesson,
    video,
    videoId: video?.id || lesson.video_id || lesson.videoId || null,
    id: lesson.id,
    number: index + 1,
    title: lesson.title || "درس رياضيات",
    branch: sectionName,
    grade:
      lesson.grade?.name ||
      lesson.grade_name ||
      (gradeId ? getGradeNameById(gradeId) : ""),
    gradeId: gradeId || null,
    description: lesson.description || "",
    duration: video?.duration || lesson.duration || "",
    videoUrl:
      video?.video_url ||
      video?.url ||
      lesson.video_url ||
      lesson.videoUrl ||
      "",
    ...(forStudent
      ? {
          isCompleted: Boolean(lesson.is_completed),
          progress: lesson.progress || 0,
          accessStatus: lesson.access_status || "",
        }
      : {}),
    quiz: lesson.quiz || lesson.exam || null,
  };
};

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
  // آخر صف تم تحميل أكواده، عشان نقدر نعمل refetch لنفس الصف بعد أي تعديل
  const codesGradeRef = useRef(1);

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
  // آخر صفحة تم تحميلها، عشان الـ refetch مايرجعش لصفحة 1
  const studentsPageRef = useRef(1);

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
      const hasSavedSession = localStorage.getItem("el_eamid_auth") === "true";
      const savedToken =
        savedRole === "teacher"
          ? tokenStorage.getAdminToken()
          : savedRole === "student"
            ? tokenStorage.getStudentToken()
            : null;

      // تنظيف أي مفاتيح محلية قديمة من النسخ السابقة
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
  // PAGINATED STUDENTS (GET /api/v1/admin/students?page=)
  // ============================================================

  const fetchAdminStudents = useCallback(
    async (page) => {
      const targetPage = page ?? studentsPageRef.current;
      setIsLoadingStudents(true);
      try {
        const res = await api.getAllStudents(targetPage);
        if (!res?.success) {
          if (res?.error) showToast(res.error, "error");
          return res;
        }

        const list = Array.isArray(res.data) ? res.data : [];
        studentsPageRef.current = res.current_page ?? targetPage;
        setPaginatedStudents(list);
        setStudentsPagination({
          current_page: res.current_page ?? targetPage,
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
    },
    [showToast],
  );

  // ============================================================
  // FETCH SUBSCRIPTION CODES (GET /api/v1/admin/subscription-codes)
  // ============================================================

  const fetchSubscriptionCodes = useCallback(
    async (grade) => {
      setIsLoadingCodes(true);
      try {
        const rawGrade = grade ?? codesGradeRef.current;
        const gradeId =
          typeof rawGrade === "number"
            ? rawGrade
            : isNaN(Number(rawGrade))
              ? getGradeIdByName(rawGrade)
              : Number(rawGrade);
        const resolvedGradeId = gradeId || 1;
        codesGradeRef.current = resolvedGradeId;

        const result = await api.getSubscriptionCodes(resolvedGradeId);

        if (result?.success) {
          const list = Array.isArray(result.data)
            ? result.data
            : result.data?.students || result.data?.data || [];
          setSubscriptionCodesList(list);
          return { success: true, data: list };
        }

        setSubscriptionCodesList([]);
        showToast(result?.message || "فشل تحميل أكواد الاشتراك", "error");
        return result;
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

  // يعيد تحميل كل القوائم المرتبطة بالطلاب والاشتراكات من السيرفر
  const refreshStudentData = useCallback(
    () =>
      Promise.allSettled([
        fetchPendingRequests(),
        fetchApprovedStudents(),
        fetchAdminStudents(),
        fetchSubscriptionCodes(),
      ]),
    [
      fetchPendingRequests,
      fetchApprovedStudents,
      fetchAdminStudents,
      fetchSubscriptionCodes,
    ],
  );

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
          profile.trusted_device ||
          profile.device ||
          profile.trustedDevice ||
          null;
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
                  (profileStudent.grade_id || prev?.grade_id
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
      const error =
        result?.error || result?.message || "تعذر تحميل بيانات الطالب";
      showToast(error, "error");
      return { success: false, error };
    } catch (error) {
      console.error("Failed to fetch student profile:", error);
      showToast(error?.message || "تعذر تحميل بيانات الطالب", "error");
      return {
        success: false,
        error: error?.message || "تعذر تحميل بيانات الطالب",
      };
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

        // لا نضيف الطلب محليًا؛ المعلم يشوفه من السيرفر عبر fetchPendingRequests
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
          showToast(
            result?.message || result?.error || "فشل قبول الطلب",
            "error",
          );

          return result;
        }

        showToast("تم قبول الطلب بنجاح");

        await refreshStudentData();

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
    [refreshStudentData, showToast],
  );

  // ============================================================
  // CANCEL REQUEST
  // ============================================================

  const cancelRequest = useCallback(
    async (requestId) => {
      try {
        const result = await api.cancelActivationRequest(requestId);

        if (!result?.success) {
          showToast(
            result?.message || result?.error || "فشل إلغاء الطلب",
            "error",
          );

          return result;
        }

        showToast("تم إلغاء الطلب");

        await refreshStudentData();

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
    [refreshStudentData, showToast],
  );

  // ============================================================
  // DEACTIVATE SUBSCRIPTION
  // ============================================================

  const deactivateStudent = useCallback(
    async (subscriptionId) => {
      try {
        const result = await api.deactivateStudent(subscriptionId);

        if (!result?.success) {
          showToast(
            result?.message || result?.error || "فشل إلغاء تفعيل الطالب",
            "error",
          );

          return result;
        }

        showToast("تم إلغاء تفعيل الطالب");

        await refreshStudentData();

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
    [refreshStudentData, showToast],
  );

  // ============================================================
  // DELETE (PERMANENT) DEACTIVATED STUDENT / SUBSCRIPTION
  // ============================================================

  const deleteDeactivatedStudentRecord = useCallback(
    async ({ studentId, subscriptionId }) => {
      try {
        const result = subscriptionId
          ? await api.deleteDeactivatedSubscription(subscriptionId)
          : await api.deleteDeactivatedStudent(studentId);

        if (!result?.success) {
          showToast(
            result?.message ||
              result?.error ||
              "Failed to permanently delete the student",
            "error",
          );
          return result;
        }

        showToast("تم حذف الطالب والاشتراك نهائيًا");
        await refreshStudentData();
        return result;
      } catch (error) {
        console.error("Delete deactivated student error:", error);
        showToast(
          error?.message || "Failed to permanently delete the student",
          "error",
        );
        return { success: false, message: error?.message || "Delete failed" };
      }
    },
    [refreshStudentData, showToast],
  );

  const deactivateAndDeleteStudentRecord = useCallback(
    async ({ subscriptionId }) => {
      if (!subscriptionId) {
        return {
          success: false,
          message:
            "A subscription ID is required to deactivate an active student",
        };
      }

      let deactivated = false;
      try {
        const deactivation = await api.deactivateStudent(subscriptionId);
        if (!deactivation?.success) {
          showToast(
            deactivation?.message ||
              deactivation?.error ||
              "فشل تعطيل اشتراك الطالب",
            "error",
          );
          return deactivation;
        }
        deactivated = true;

        const deletion =
          await api.deleteDeactivatedSubscription(subscriptionId);
        if (!deletion?.success) {
          showToast(
            deletion?.message ||
              deletion?.error ||
              "تم التعطيل، لكن تعذر الحذف النهائي",
            "error",
          );
          await refreshStudentData();
          return { ...deletion, success: false, deactivated: true };
        }

        showToast("تم تعطيل الاشتراك وحذف الطالب نهائيًا");
        await refreshStudentData();
        return deletion;
      } catch (error) {
        console.error("Deactivate and delete student error:", error);
        showToast(error?.message || "حدث خطأ أثناء تنفيذ العملية", "error");
        if (deactivated) {
          await refreshStudentData();
        }
        return {
          success: false,
          deactivated,
          message: error?.message || "Operation failed",
        };
      }
    },
    [refreshStudentData, showToast],
  );

  // ============================================================
  // RESET DEVICE
  // ============================================================

  const resetStudentDevice = useCallback(
    async (subscriptionId) => {
      try {
        const result = await api.resetStudentDevice(subscriptionId);

        if (!result?.success) {
          if (
            result?.error?.includes("مفيهوش جهاز موثوق") ||
            result?.error?.includes("مفيش جهاز موثوق")
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

        await Promise.allSettled([
          fetchApprovedStudents(),
          fetchAdminStudents(),
        ]);

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
      const exam =
        response?.exam || response?.data?.exam || response?.data || response;
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
        ]
          .filter(Boolean)
          .join(" ");
        const duplicateExam =
          error?.status === 409 ||
          /already\s+exists|duplicate|unique|exam.+exists|quiz.+exists/i.test(
            serverMessage,
          );
        const message = duplicateExam
          ? "تم إنشاء امتحان لهذا الدرس بالفعل. يمكنك إضافة الأسئلة إلى الامتحان الموجود."
          : error.message || "فشل إنشاء الامتحان";
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
        // نرجّع الـ resource كما هو عشان المستدعي يقدر يقرأ id السؤال الجديد
        return { success: true, data: res?.data || res };
      } catch (error) {
        console.error("Create question error:", error);
        showToast(error.message || "فشل إضافة السؤال", "error");
        return { success: false, message: error.message };
      }
    },
    [showToast],
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
    [showToast],
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
              remoteLessons
                .filter((lesson) => lesson?.id)
                .map((lesson, idx) => normalizeLesson(lesson, idx)),
            );
            return remoteLessons;
          }
        } else if (userRole === "student") {
          const studentLessons = await api.getStudentLessons();
          if (Array.isArray(studentLessons)) {
            setLessonsList(
              studentLessons
                .filter((lesson) => lesson?.id)
                .map((lesson, idx) =>
                  normalizeLesson(lesson, idx, { forStudent: true }),
                ),
            );
            return studentLessons;
          }
        }
        return null;
      } catch (err) {
        console.warn("Fetch lessons notice:", err);
        showToast(err?.message || "تعذر تحميل الدروس من الخادم", "error");
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

  const loginWithCode = useCallback(
    async (code) => {
      return studentLoginWithCode(code);
    },
    [studentLoginWithCode],
  );

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
    setPendingRequests([]);
    setApprovedSubscriptions([]);
    setSubscriptionCodesList([]);
    setPaginatedStudents([]);
    setAdminExamsList([]);
    studentsPageRef.current = 1;
    codesGradeRef.current = 1;

    showToast("تم تسجيل الخروج");
  }, [userRole, showToast]);

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

        // القائمة تتحدث من السيرفر فقط
        await fetchLessons();
        showToast("تم حذف الدرس من الخادم");
        return { success: true };
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
        if (!lesson)
          throw new Error("الدرس المطلوب غير موجود في بيانات الخادم");

        const existingQuiz = lesson.quiz || lesson.exam;
        const existingQuestions = (existingQuiz?.questions || []).map(
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
                existing.question_text ||
                existing.question ||
                existing.text ||
                "",
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
          title: existingQuiz?.title || `اختبار: ${lesson.title || ""}`,
          description: existingQuiz?.description || "",
          duration_minutes:
            existingQuiz?.duration_minutes ||
            existingQuiz?.durationMinutes ||
            10,
          passing_percentage: existingQuiz?.passing_percentage || 60,
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
        return {
          success: false,
          message: error?.message || "تعذر حذف السؤال",
        };
      }
    },
    [fetchLessons, showToast],
  );

  const fetchStudentExams = useCallback(async () => {
    setIsLoadingStudentExams(true);
    try {
      const exams = await api.getStudentExams();
      setStudentExamsList(exams);
      return { success: true, data: exams };
    } catch (error) {
      setStudentExamsList([]);
      showToast(error?.message || "تعذر تحميل اختبارات الطالب", "error");
      return {
        success: false,
        error: error?.message || "تعذر تحميل الاختبارات",
      };
    } finally {
      setIsLoadingStudentExams(false);
    }
  }, [showToast]);

  // ============================================================
  // VIDEO PROGRESS
  // ============================================================

  const refreshedVideosRef = useRef(new Set());

  const reportVideoProgress = useCallback(
    async (videoId, progressData) => {
      try {
        const res = await api.updateVideoProgress(videoId, progressData);
        if (!res?.success) return res;

        const completionPercentage = Number(
          res.data?.completion_percentage ??
            res.data?.progress?.completion_percentage ??
            progressData?.completion_percentage,
        );

        if (Number.isFinite(completionPercentage)) {
          const vid = Number(videoId);
          setLessonsList((prev) =>
            prev.map((l) => {
              const ownsVideo =
                l.videoId === vid ||
                l.video?.id === vid ||
                l.videos?.some((video) => video.id === vid);
              return ownsVideo
                ? {
                    ...l,
                    isCompleted:
                      completionPercentage >= 90 || Boolean(l.isCompleted),
                    progress: completionPercentage,
                  }
                : l;
            }),
          );

          // القفل بيتحدد من الباك: نعيد تحميله عند 80% وتاني عند الانتهاء
          const stage =
            completionPercentage >= 100
              ? 100
              : completionPercentage >= 80
                ? 80
                : 0;
          const stageKey = `${vid}:${stage}`;
          if (stage > 0 && !refreshedVideosRef.current.has(stageKey)) {
            refreshedVideosRef.current.add(stageKey);
            fetchLessons();
            fetchStudentExams();
          }
        }

        return res;
      } catch (error) {
        console.error("Video progress error:", error);
        return { success: false, message: error?.message || "Failed" };
      }
    },
    [fetchLessons, fetchStudentExams],
  );

  // ============================================================
  // START / SUBMIT EXAM
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
        const updatedProfile =
          result?.data?.student || result?.data?.user || result?.data;
        if (updatedProfile && typeof updatedProfile === "object") {
          setStudent((current) => ({ ...current, ...updatedProfile }));
        }
        await fetchStudentProfile();
        showToast("تم تحديث بيانات الحساب");
        return { success: true, data: updatedProfile || result?.data };
      } catch (error) {
        showToast(error?.message || "تعذر تحديث بيانات الحساب", "error");
        return {
          success: false,
          error: error?.message || "تعذر تحديث البيانات",
        };
      }
    },
    [fetchStudentProfile, showToast],
  );

  // ============================================================
  // MEMOS
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
        return {
          success: false,
          message: error?.message || "فشل تحميل المذكرات",
        };
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
        return {
          success: false,
          message: error?.message || "فشل إضافة المذكرة",
        };
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
        return {
          success: false,
          message: error?.message || "فشل تعديل المذكرة",
        };
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
        return {
          success: false,
          message: error?.message || "فشل حذف المذكرة",
        };
      }
    },
    [fetchAdminMemos, showToast],
  );

  // ============================================================
  // ADMIN STUDENT API INTEGRATION
  // ============================================================

  const deleteStudent = useCallback(
    async (studentId) => {
      const result = await api.deleteDeactivatedStudent(studentId);
      if (!result?.success) {
        showToast(
          result?.message ||
            result?.error ||
            "Failed to delete deactivated student",
          "error",
        );
        return result;
      }

      await refreshStudentData();
      showToast("تم حذف الطالب من الخادم بنجاح");
      return result;
    },
    [refreshStudentData, showToast],
  );

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
            fetchAdminStudents(),
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
    [
      fetchApprovedStudents,
      fetchSubscriptionCodes,
      fetchAdminStudents,
      showToast,
    ],
  );

  const updateStudentByAdmin = useCallback(
    async (studentId, updatedData) => {
      try {
        const result = await api.updateStudent(studentId, updatedData);
        showToast("تم تحديث بيانات الطالب بنجاح");
        await refreshStudentData();
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
    [refreshStudentData, showToast],
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

    // Requests
    pendingRequests,
    approvedSubscriptions,
    pendingLoading,
    approvedLoading,
    isLoadingRequests: pendingLoading,
    isLoadingApproved: approvedLoading,
    fetchPendingRequests,
    fetchApprovedStudents,
    refreshStudentData,

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

    // Students (كلها شغالة على السيرفر)
    studentsList: paginatedStudents,
    setStudentsList: setPaginatedStudents,
    addStudent: createStudentByAdmin,
    updateStudent: updateStudentByAdmin,
    deleteStudent,
    createStudentByAdmin,
    updateStudentByAdmin,
    updateStudentByTeacher: updateStudentByAdmin,
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
