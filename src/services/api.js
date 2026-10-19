/**
 * MathPlatform API Client (OpenAPI 3.0.0 Aligned)
 * Base URL: VITE_API_URL (defaults to the production Railway API)
 */

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  "https://mathplatform-production-31e0.up.railway.app/api/v1";

const getCleanBaseDomain = () => {
  return String(API_BASE)
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/api\/documentation$/, "")
    .replace(/\/api\/v1$/, "");
};

export function buildApiUrl(endpoint) {
  const baseDomain = getCleanBaseDomain();
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  if (cleanEndpoint.startsWith("/api/v1")) {
    return `${baseDomain}${cleanEndpoint}`;
  }
  return `${baseDomain}/api/v1${cleanEndpoint}`;
}

// Token & Device Storage Keys
const ADMIN_TOKEN_KEY = "mathplatform_admin_token";
const STUDENT_TOKEN_KEY = "mathplatform_student_token";
const DEVICE_ID_KEY = "mathplatform_device_id";

// ======================================================================
// TOKEN STORAGE
// ======================================================================

export const tokenStorage = {
  getAdminToken: () =>
    typeof localStorage !== "undefined"
      ? localStorage.getItem(ADMIN_TOKEN_KEY)
      : null,

  setAdminToken: (token) => {
    if (token && typeof localStorage !== "undefined") {
      localStorage.setItem(ADMIN_TOKEN_KEY, token);
    }
  },

  clearAdminToken: () => {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
    }
  },

  getStudentToken: () =>
    typeof localStorage !== "undefined"
      ? localStorage.getItem(STUDENT_TOKEN_KEY)
      : null,

  setStudentToken: (token) => {
    if (token && typeof localStorage !== "undefined") {
      localStorage.setItem(STUDENT_TOKEN_KEY, token);
    }
  },

  clearStudentToken: () => {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(STUDENT_TOKEN_KEY);
    }
  },

  clearTokens: () => {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      localStorage.removeItem(STUDENT_TOKEN_KEY);
    }
  },
};

// ======================================================================
// DEVICE ID
// ======================================================================

/**
 * Generate or retrieve persistent UUID device identifier
 * for student device binding.
 */
export function getOrCreateDeviceId() {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);

    if (!id) {
      if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
      ) {
        id = crypto.randomUUID();
      } else {
        id = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
          /[xy]/g,
          function (c) {
            const r = (Math.random() * 16) | 0;
            const v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          },
        );
      }

      localStorage.setItem(DEVICE_ID_KEY, id);
    }

    return id;
  } catch {
    return "8f4c2e91-7a32-4d8b-91a2-5e6f3c8d1204";
  }
}

// ======================================================================
// GRADE MAPPING
// ======================================================================

export const GRADE_ID_MAP = {
  1: "الصف الأول الثانوي",
  2: "الصف الثاني الثانوي",
  3: "الصف الثالث الثانوي",
  4: "الصف الثالث الإعدادي",
  5: "الصف الثاني الإعدادي",
  6: "الصف الأول الإعدادي",

  sec1: 1,
  sec2: 2,
  sec3: 3,

  prep3: 4,
  prep2: 5,
  prep1: 6,

  "الصف الأول الثانوي": 1,
  "الصف الثاني الثانوي": 2,
  "الصف الثالث الثانوي": 3,
  "الصف الثالث الإعدادي": 4,
  "الصف الثاني الإعدادي": 5,
  "الصف الأول الإعدادي": 6,
};

export const getGradeNameById = (id) =>
  GRADE_ID_MAP[id] || "الصف الثالث الثانوي";

export const getGradeIdByName = (name) => GRADE_ID_MAP[name] || 1;

// ======================================================================
// STANDARD HTTP REQUEST
// ======================================================================

function translateApiError(message) {
  if (typeof message !== "string") return message;

  const normalized = message.trim().toLowerCase().replace(/[.!؟]+$/g, "");
  const translations = {
    "this subscription is not active": "الاشتراك ده غير نشط.",
    "this subscription does not have an active trusted device":
      "الاشتراك ده مفيهوش جهاز موثوق نشط لإعادة ضبطه.",
    "invalid subscription code": "كود الاشتراك غير صحيح.",
    "no active trusted device":
      "مفيش جهاز موثوق نشط للاشتراك ده.",
    "subscription not found": "الاشتراك ده غير موجود.",
    unauthenticated: "انتهت الجلسة. يلزم تسجيل الدخول مرة أخرى.",
    "admin access required": "العملية دي متاحة لحساب الإدارة فقط.",
  };

  if (translations[normalized]) return translations[normalized];

  if (normalized.includes("this subscription is not active")) {
    return translations["this subscription is not active"];
  }
  if (
    normalized.includes(
      "this subscription does not have an active trusted device",
    )
  ) {
    return translations[
      "this subscription does not have an active trusted device"
    ];
  }

  // Never expose an untranslated English server or network error in the UI.
  if (/[a-z]/i.test(message)) {
    return "حدث خطأ أثناء تنفيذ الطلب. يُرجى مراجعة البيانات والمحاولة مرة أخرى.";
  }
  return message;
}

async function request(endpoint, options = {}, authType = null) {
  const url = buildApiUrl(endpoint);

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...options.headers,
  };

  if (authType === "admin") {
    const token = tokenStorage.getAdminToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  if (authType === "student") {
    const token = tokenStorage.getStudentToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  try {
    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 15000);

    let response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      let errorMsg =
        data?.message ||
        data?.error ||
        `خطأ ${response.status}: فشل استدعاء الخادم`;

      if (data?.errors && typeof data.errors === "object") {
        const errorEntries = Object.values(data.errors).flat();
        if (errorEntries.length > 0) {
          errorMsg = errorEntries.join(" - ");
        }
      }

      errorMsg = translateApiError(errorMsg);

      const err = new Error(errorMsg);

      err.status = response.status;
      err.data = data;

      throw err;
    }

    return {
      success: true,
      data,
      isOffline: false,
    };
  } catch (err) {
    console.warn(
      `[API] Network or offline fallback for ${endpoint}:`,
      err.message,
    );

    return {
      success: false,
      isNetworkError:
        err.name === "AbortError" ||
        err.message?.includes("Failed to fetch") ||
        err.message?.includes("fetch failed") ||
        err.message?.includes("NetworkError") ||
        err.message?.includes("ECONNREFUSED") ||
        err.code === "ECONNREFUSED",

      error: translateApiError(err.message),
      status: err.status || 0,
      data: err.data || null,
    };
  }
}

// ======================================================================
// RESPONSE NORMALIZER
// ======================================================================

function normalizeApiSuccess(res) {
  if (!res?.success) {
    return res;
  }

  const payload = res.data;

  // لو الـ backend بالفعل بيرجع:
  // { success: true, data: ... }
  if (
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    Object.prototype.hasOwnProperty.call(payload, "success")
  ) {
    return {
      ...payload,
      data: payload.data ?? payload,
      isOffline: false,
    };
  }

  // لو الـ backend بيرجع البيانات مباشرة
  return {
    success: true,
    data: payload,
    isOffline: false,
  };
}

// ======================================================================
// API ENDPOINTS
// ======================================================================

export const api = {
  // ====================================================================
  // 1. STUDENT AUTHENTICATION
  // ====================================================================

  async validateSession(role) {
    const endpoint =
      role === "teacher"
        ? "/api/v1/admin/approved-students"
        : role === "student"
          ? "/api/v1/student/profile"
          : null;

    if (!endpoint) {
      return {
        success: false,
        message: "نوع الحساب غير معروف",
      };
    }

    const authType = role === "teacher" ? "admin" : "student";
    const res = await request(endpoint, { method: "GET" }, authType);

    return res.success
      ? { success: true, data: res.data }
      : {
          success: false,
          message: res.error || "تعذر التحقق من الجلسة",
          status: res.status,
          isNetworkError: res.isNetworkError,
        };
  },

  /**
   * POST /api/v1/auth/activate
   */
  async activateStudent(input = {}) {
    const payload = {
      first_name: String(input.first_name || input.firstName || "").trim(),
      last_name: String(input.last_name || input.lastName || "").trim(),
      phone: String(input.phone || "").trim(),
      parent_phone: String(
        input.parent_phone || input.parentPhone || "",
      ).trim(),
      grade_id: Number(input.grade_id || input.gradeId || 1),
    };

    const res = await request("/api/v1/auth/activate", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (res.success) {
      return normalizeApiSuccess(res);
    }

    throw new Error(res.error || "فشل تقديم طلب التفعيل");
  },

  /**
   * POST /api/v1/auth/login
   *
   * Accepts either:
   *
   * studentLogin("SEC3-101")
   *
   * OR
   *
   * studentLogin({
   *   subscription_code: "SEC3-101",
   *   device_identifier: "..."
   * })
   */
  async studentLogin(input) {
    const subscriptionCode =
      typeof input === "string" ? input : input?.subscription_code;

    const cleanCode = String(subscriptionCode || "")
      .trim()
      .toUpperCase();

    if (!cleanCode) {
      return {
        success: false,
        message: "كود الاشتراك مطلوب",
      };
    }

    const deviceId =
      typeof input === "object" && input?.device_identifier
        ? input.device_identifier
        : getOrCreateDeviceId();

    const res = await request("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({
        subscription_code: cleanCode,
        device_identifier: deviceId,
      }),
    });

    if (!res.success) {
      const serverError =
        res.data?.message ||
        res.data?.errors?.subscription_code?.[0] ||
        res.error;
      if (serverError) {
        const translatedError = translateApiError(serverError);
        return {
          success: false,
          message: translatedError,
          error: translatedError,
        };
      }
      return {
        success: false,
        message:
          res.data?.message ||
          res.data?.errors?.subscription_code?.[0] ||
          res.error ||
          "كود الاشتراك غير صالح أو الحساب غير مفعّل",
        error: res.error || "كود الاشتراك غير صالح أو الحساب غير مفعّل",
      };
    }

    const result = normalizeApiSuccess(res);
    const token =
      result?.data?.token ||
      result?.token ||
      result?.data?.access_token ||
      result?.access_token;

    if (!token) {
      return {
        success: false,
        message: "لم يُرجع الخادم رمز دخول صالحًا",
      };
    }

    tokenStorage.setStudentToken(token);
    return { ...result, token };
  },

  /**
   * POST /api/v1/auth/logout
   */
  async studentLogout() {
    try {
      await request(
        "/api/v1/auth/logout",
        {
          method: "POST",
        },
        "student",
      );
    } finally {
      tokenStorage.clearStudentToken();
    }

    return {
      success: true,
    };
  },

  // ====================================================================
  // 2. ADMIN AUTHENTICATION
  // ====================================================================

  /**
   * POST /api/v1/admin/auth/login
   *
   * Supports:
   * adminLogin(email, password)
   *
   * OR:
   * adminLogin({ email, password })
   */
  async adminLogin(emailOrCredentials, password) {
    const credentials =
      typeof emailOrCredentials === "object"
        ? emailOrCredentials
        : {
            email: emailOrCredentials,
            password,
          };

    const email = String(credentials?.email || "").trim();

    const adminPassword = String(credentials?.password || "");

    if (!email || !adminPassword) {
      return {
        success: false,
        message: "البريد الإلكتروني وكلمة المرور مطلوبان",
      };
    }

    const res = await request("/api/v1/admin/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email,
        password: adminPassword,
      }),
    });

    if (res.success) {
      const result = normalizeApiSuccess(res);
      const token =
        result?.data?.token ||
        result?.token ||
        result?.data?.access_token ||
        result?.access_token;

      if (!token) {
        return {
          success: false,
          message: "لم يُرجع الخادم رمز دخول صالحًا",
        };
      }

      tokenStorage.setAdminToken(token);
      return {
        ...result,
        success: true,
        message: result?.message || "تم تسجيل دخول المعلم / الإدارة بنجاح",
        token,
      };
    }

    const errorMessage =
      res.data?.message ||
      res.data?.errors?.email?.[0] ||
      res.data?.errors?.password?.[0] ||
      res.error ||
      "بيانات تسجيل الدخول غير صحيحة (تأكد من البريد الإلكتروني وكلمة المرور)";

    return {
      success: false,
      message: translateApiError(errorMessage),
      error: translateApiError(errorMessage),
    };
  },

  /**
   * POST /api/v1/admin/auth/logout
   */
  async adminLogout() {
    try {
      await request(
        "/api/v1/admin/auth/logout",
        {
          method: "POST",
        },
        "admin",
      );
    } finally {
      tokenStorage.clearAdminToken();
    }

    return {
      success: true,
    };
  },

  // ====================================================================
  // 3. ACTIVATION REQUESTS & SUBSCRIPTIONS
  // ====================================================================

  /**
   * GET /api/v1/admin/activation-requests
   */
  async getPendingActivationRequests() {
    const res = await request(
      "/api/v1/admin/activation-requests",
      {
        method: "GET",
      },
      "admin",
    );

    if (res.success) {
      const normalized = normalizeApiSuccess(res);

      const list = Array.isArray(normalized.data)
        ? normalized.data
        : normalized.data?.data || [];

      return {
        ...normalized,
        data: list,
      };
    }

    return {
      success: false,
      data: [],
      error: res.error || "فشل تحميل طلبات التفعيل المعلقة",
    };
  },

  // Alias used by StudentContext
  async getActivationRequests() {
    return api.getPendingActivationRequests();
  },

  /**
   * POST /api/v1/admin/activation-requests/{subscription}/approve
   */
  async approveActivationRequest(subscriptionId) {
    const res = await request(
      `/api/v1/admin/activation-requests/${subscriptionId}/approve`,
      {
        method: "POST",
      },
      "admin",
    );

    if (res.success) {
      return normalizeApiSuccess(res);
    }

    return {
      success: false,
      error: res.error || "فشل قبول طلب التفعيل",
    };
  },

  /**
   * POST /api/v1/admin/activation-requests/{subscription}/cancel
   */
  async cancelActivationRequest(subscriptionId) {
    const res = await request(
      `/api/v1/admin/activation-requests/${subscriptionId}/cancel`,
      {
        method: "POST",
      },
      "admin",
    );

    if (res.success) {
      return normalizeApiSuccess(res);
    }

    return {
      success: false,
      error: res.error || "فشل إلغاء طلب التفعيل",
    };
  },

  // Backward compatibility
  async rejectActivationRequest(subscriptionId) {
    return api.cancelActivationRequest(subscriptionId);
  },

  /**
   * GET /api/v1/admin/approved-students
   */
  async getApprovedStudents() {
    const res = await request(
      "/api/v1/admin/approved-students",
      {
        method: "GET",
      },
      "admin",
    );

    if (res.success) {
      const normalized = normalizeApiSuccess(res);

      const list = Array.isArray(normalized.data)
        ? normalized.data
        : normalized.data?.data || [];

      return {
        ...normalized,
        data: list,
      };
    }

    return {
      success: false,
      data: [],
      error: res.error || "فشل تحميل قائمة الطلاب المعتمدين",
    };
  },

  /**
   * POST /api/v1/admin/subscriptions/{subscription}/deactivate
   */
  async deactivateSubscription(subscriptionId) {
    const res = await request(
      `/api/v1/admin/subscriptions/${subscriptionId}/deactivate`,
      {
        method: "POST",
      },
      "admin",
    );

    if (res.success) {
      return normalizeApiSuccess(res);
    }

    return {
      success: false,
      error: res.error || "فشل تعطيل الاشتراك",
    };
  },

  // Alias used by StudentContext
  async deactivateStudent(subscriptionId) {
    return api.deactivateSubscription(subscriptionId);
  },

  /**
   * POST /api/v1/admin/subscriptions/{subscription}/reset-device
   */
  async resetTrustedDevice(subscriptionId) {
    const res = await request(
      `/api/v1/admin/subscriptions/${subscriptionId}/reset-device`,
      {
        method: "POST",
      },
      "admin",
    );

    if (res.success) {
      return normalizeApiSuccess(res);
    }

    return {
      success: false,
      error: res.error || "فشل إعادة ضبط جهاز الطالب",
      status: res.status,
      isNetworkError: res.isNetworkError,
    };
  },

  // Alias used by StudentContext
  async resetStudentDevice(subscriptionId) {
    return api.resetTrustedDevice(subscriptionId);
  },

  /**
   * GET /api/v1/admin/subscription-codes?grade_id={grade_id}
   */
  async getSubscriptionCodesByGrade(gradeId) {
    const res = await request(
      `/api/v1/admin/subscription-codes?grade_id=${gradeId}`,
      {
        method: "GET",
      },
      "admin",
    );

    if (res.success) {
      const normalized = normalizeApiSuccess(res);
      const codes = normalized.data;
      const list = Array.isArray(codes)
        ? codes
        : codes?.students || codes?.data || [];

      return {
        ...normalized,
        data: list,
      };
    }

    return {
      success: false,
      error: res.error || "فشل جلب أكواد الاشتراك للمرحلة",
    };
  },

  // Alias used by StudentContext
  async getSubscriptionCodes(gradeId) {
    return api.getSubscriptionCodesByGrade(gradeId);
  },

  // ====================================================================
  // 4. ADMIN STUDENTS CRUD
  // ====================================================================

  /**
   * GET /api/v1/admin/students?page=1
   */
  async getAllStudents(page = 1) {
    const res = await request(
      `/api/v1/admin/students?page=${page}`,
      {
        method: "GET",
      },
      "admin",
    );

    if (res.success) {
      const payload = res.data?.data ?? res.data;
      const list = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(res.data?.data)
            ? res.data.data
            : [];

      return {
        data: list,
        current_page:
          payload?.current_page || res.data?.current_page || Number(page) || 1,
        last_page: payload?.last_page || res.data?.last_page || 1,
        total: payload?.total || res.data?.total || list.length,
      };
    }

    return {
      data: [],
      current_page: 1,
      last_page: 1,
      total: 0,
    };
  },

  /**
   * POST /api/v1/admin/students
   */
  async createStudentByAdmin(payload = {}) {
    const body = {
      first_name: String(payload.first_name || payload.firstName || "").trim(),
      last_name: String(payload.last_name || payload.lastName || "").trim(),
      phone: String(payload.phone || "").trim(),
      parent_phone: String(
        payload.parent_phone || payload.parentPhone || "",
      ).trim(),
      grade_id: Number(payload.grade_id || payload.gradeId || 1),

      start_date:
        payload.start_date ||
        payload.startDate ||
        new Date().toISOString().split("T")[0],

      end_date:
        payload.end_date ||
        payload.endDate ||
        new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0],

      code_expires_at:
        payload.code_expires_at ||
        payload.codeExpiresAt ||
        new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0],
    };

    const res = await request(
      "/api/v1/admin/students",
      {
        method: "POST",
        body: JSON.stringify(body),
      },
      "admin",
    );

    if (res.success) {
      const result = normalizeApiSuccess(res);
      return {
        ...result,
        success: true,
        data: result.data?.data ?? result.data,
      };
    }

    return {
      success: false,
      message: res.error || "فشل إنشاء حساب الطالب",
      status: res.status,
      isNetworkError: res.isNetworkError,
    };
  },

  /**
   * GET /api/v1/admin/students/{student}
   */
  async getStudentDetails(studentId) {
    const res = await request(
      `/api/v1/admin/students/${studentId}`,
      {
        method: "GET",
      },
      "admin",
    );

    if (res.success) {
      const payload = res.data?.data ?? res.data?.student ?? res.data;
      return {
        success: true,
        data: payload,
      };
    }

    return {
      success: false,
      data: null,
      error: res.error || "فشل جلب بيانات الطالب",
    };
  },

  /**
   * PUT /api/v1/admin/students/{student}
   */
  async updateStudent(studentId, payload = {}) {
    const body = {
      first_name: String(payload.first_name || payload.firstName || "").trim(),
      last_name: String(payload.last_name || payload.lastName || "").trim(),
      phone: String(payload.phone || "").trim(),
      parent_phone: String(
        payload.parent_phone || payload.parentPhone || "",
      ).trim(),
      grade_id: Number(payload.grade_id || payload.gradeId || 1),
    };

    const res = await request(
      `/api/v1/admin/students/${studentId}`,
      {
        method: "PUT",
        body: JSON.stringify(body),
      },
      "admin",
    );

    if (res.success) {
      return res.data;
    }

    throw new Error(res.error || "فشل تحديث بيانات الطالب");
  },

  // ====================================================================
  // 5. ADMIN LESSONS
  // ====================================================================

  /**
   * GET /api/v1/admin/lessons
   */
  async getAdminLessons(gradeId = null) {
    const query = gradeId ? `?grade_id=${gradeId}` : "";

    const res = await request(
      `/api/v1/admin/lessons${query}`,
      {
        method: "GET",
      },
      "admin",
    );

    if (res.success) {
      const payload = res.data?.data ?? res.data;
      if (Array.isArray(payload)) return payload;
      return payload?.lessons || payload?.data || [];
    }

    if (res.isNetworkError) {
      return null;
    }

    throw new Error(res.error || "فشل جلب قائمة الدروس من الخادم");
  },

  /**
   * POST /api/v1/admin/lessons
   */
  async createAdminLesson(payload = {}) {
    const gradeValue = payload.grade_id ?? payload.gradeId ?? payload.grade;
    const numericGradeId = Number(gradeValue);
    const body = {
      grade_id: Number.isFinite(numericGradeId)
        ? numericGradeId
        : getGradeIdByName(gradeValue),

      section_name: String(
        payload.section_name || payload.branch || "الجبر والهندسة الفراغية",
      ).trim(),

      title: String(payload.title || "").trim(),

      description: payload.description || "",

      video_url: String(payload.video_url || payload.videoUrl || "").trim(),
    };

    const res = await request(
      "/api/v1/admin/lessons",
      {
        method: "POST",
        body: JSON.stringify(body),
      },
      "admin",
    );

    if (res.success) {
      return res.data;
    }

    throw new Error(res.error || "فشل إنشاء المحاضرة");
  },

  /**
   * DELETE /api/v1/admin/lessons/{lesson}
   */
  async deleteAdminLesson(lessonId) {
    const res = await request(
      `/api/v1/admin/lessons/${lessonId}`,
      {
        method: "DELETE",
      },
      "admin",
    );

    if (res.success) {
      return res.data;
    }

    throw new Error(res.error || "فشل حذف المحاضرة");
  },

  // ====================================================================
  // 6. ADMIN EXAMS
  // ====================================================================

  /**
   * GET /api/v1/admin/exams
   */
  async getAdminExams() {
    const res = await request(
      "/api/v1/admin/exams",
      {
        method: "GET",
      },
      "admin",
    );

    if (res.success) {
      const payload = res.data?.data ?? res.data;
      if (Array.isArray(payload)) return payload;
      return payload?.exams || payload?.data || [];
    }

    throw new Error(res.error || "فشل جلب قائمة الامتحانات");
  },

  /**
   * POST /api/v1/admin/exams
   */
  async createAdminExam(payload = {}) {
    const lessonId = Number(payload.lesson_id ?? payload.lessonId);
    if (!Number.isInteger(lessonId) || lessonId < 1) {
      throw new Error("يُرجى اختيار محاضرة لربط الامتحان بها.");
    }

    const body = {
      lesson_id: lessonId,
      title: String(payload.title || "").trim(),
      description: payload.description || "",
      duration_minutes:
        payload.duration_minutes !== undefined
          ? Number(payload.duration_minutes)
          : payload.durationMinutes !== undefined
            ? Number(payload.durationMinutes)
            : 20,
      passing_percentage: Number(
        payload.passing_percentage || payload.passingPercentage || 60,
      ),
    };

    const res = await request(
      "/api/v1/admin/exams",
      {
        method: "POST",
        body: JSON.stringify(body),
      },
      "admin",
    );

    if (res.success) {
      return res.data;
    }

    throw new Error(res.error || "فشل إنشاء الاختبار");
  },

  /**
   * GET /api/v1/admin/exams/{exam}
   */
  async getAdminExamDetails(examId) {
    const res = await request(
      `/api/v1/admin/exams/${examId}`,
      {
        method: "GET",
      },
      "admin",
    );

    if (res.success) {
      return res.data?.data || res.data;
    }

    throw new Error(res.error || "فشل جلب تفاصيل الاختبار");
  },

  /**
   * PUT /api/v1/admin/exams/{exam}
   */
  async updateAdminExam(examId, payload) {
    const res = await request(
      `/api/v1/admin/exams/${examId}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
      "admin",
    );

    if (res.success) {
      return res.data;
    }

    throw new Error(res.error || "فشل تعديل الاختبار");
  },

  /**
   * DELETE /api/v1/admin/exams/{exam}
   */
  async deleteAdminExam(examId) {
    const res = await request(
      `/api/v1/admin/exams/${examId}`,
      {
        method: "DELETE",
      },
      "admin",
    );

    if (res.success) {
      return res.data;
    }

    throw new Error(res.error || "فشل حذف الاختبار");
  },

  // ====================================================================
  // QUESTIONS
  // ====================================================================

  /**
   * POST /api/v1/admin/exams/{exam}/questions
   */
  async createAdminQuestion(examId, payload) {
    const body = {
      question_text: payload.question_text || payload.question || "",
      points: Number(payload.points || 1),
    };

    const res = await request(
      `/api/v1/admin/exams/${examId}/questions`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
      "admin",
    );

    if (res.success) {
      return res.data;
    }

    throw new Error(res.error || "فشل إضافة السؤال");
  },

  /**
   * PUT /api/v1/admin/questions/{question}
   */
  async updateAdminQuestion(questionId, payload) {
    const res = await request(
      `/api/v1/admin/questions/${questionId}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
      "admin",
    );

    if (res.success) {
      return res.data;
    }

    throw new Error(res.error || "فشل تعديل السؤال");
  },

  /**
   * DELETE /api/v1/admin/questions/{question}
   */
  async deleteAdminQuestion(questionId) {
    const res = await request(
      `/api/v1/admin/questions/${questionId}`,
      {
        method: "DELETE",
      },
      "admin",
    );

    if (res.success) {
      return res.data;
    }

    throw new Error(res.error || "فشل حذف السؤال");
  },

  // ====================================================================
  // OPTIONS
  // ====================================================================

  /**
   * POST /api/v1/admin/questions/{question}/options
   */
  async createAdminOption(questionId, payload) {
    const body = {
      option_text: String(payload.option_text || payload.text || "").trim(),
      is_correct: Boolean(payload.is_correct),
    };

    const res = await request(
      `/api/v1/admin/questions/${questionId}/options`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
      "admin",
    );

    if (res.success) {
      return res.data;
    }

    throw new Error(res.error || "فشل إضافة خيار الإجابة");
  },

  /**
   * PUT /api/v1/admin/options/{option}
   */
  async updateAdminOption(optionId, payload) {
    const res = await request(
      `/api/v1/admin/options/${optionId}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
      "admin",
    );

    if (res.success) {
      return res.data;
    }

    throw new Error(res.error || "فشل تعديل خيار الإجابة");
  },

  /**
   * DELETE /api/v1/admin/options/{option}
   */
  async deleteAdminOption(optionId) {
    const res = await request(
      `/api/v1/admin/options/${optionId}`,
      {
        method: "DELETE",
      },
      "admin",
    );

    if (res.success) {
      return res.data;
    }

    throw new Error(res.error || "فشل حذف خيار الإجابة");
  },

  // ====================================================================
  // 7. STUDENT PROFILE / LESSONS / VIDEOS
  // ====================================================================

  /**
   * GET /api/v1/student/profile
   */
  async getStudentProfile() {
    const res = await request(
      "/api/v1/student/profile",
      {
        method: "GET",
      },
      "student",
    );

    if (res.success) {
      return normalizeApiSuccess(res);
    }

    return {
      success: false,
      data: null,
      error: res.error || "فشل جلب الملف الشخصي للطالب",
    };
  },

  /**
   * GET /api/v1/student/lessons
   */
  async getStudentLessons() {
    const res = await request(
      "/api/v1/student/lessons",
      {
        method: "GET",
      },
      "student",
    );

    if (res.success) {
      const payload = res.data?.data ?? res.data;
      if (Array.isArray(payload)) return payload;
      return payload?.lessons || payload?.data || [];
    }

    throw new Error(res.error || "فشل جلب دروس الطالب");
  },

  /**
   * GET /api/v1/student/videos/{video}
   */
  async getStudentVideo(videoId) {
    const res = await request(
      `/api/v1/student/videos/${videoId}`,
      {
        method: "GET",
      },
      "student",
    );

    if (res.success) {
      return res.data?.data || res.data;
    }

    const err = new Error(res.error || "الفيديو مقفل أو غير متاح حالياً");
    err.status = res.status;
    err.isLocked = res.status === 403;
    throw err;
  },

  /**
   * POST /api/v1/student/videos/{video}/progress
   *
   * Body:
   * {
   *   current_position_seconds,
   *   watched_duration_seconds,
   *   completion_percentage
   * }
   */
  async updateVideoProgress(videoId, payload = {}) {
    const currentPos =
      payload.current_position_seconds ?? payload.currentPositionSeconds ?? 0;
    const watchedDur =
      payload.watched_duration_seconds ??
      payload.watchedDurationSeconds ??
      currentPos;
    const compPct =
      payload.completion_percentage ?? payload.completionPercentage ?? 0;

    const body = {
      current_position_seconds: Math.floor(Number(currentPos)),
      watched_duration_seconds: Math.floor(Number(watchedDur)),
      completion_percentage: Math.min(
        100,
        Math.max(0, Math.round(Number(compPct))),
      ),
    };

    const res = await request(
      `/api/v1/student/videos/${videoId}/progress`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
      "student",
    );

    if (res.success) {
      return normalizeApiSuccess(res);
    }

    return {
      success: false,
      error: res.error,
    };
  },

  // ====================================================================
  // 8. STUDENT EXAMS
  // ====================================================================

  /**
   * GET /api/v1/student/exams/{exam}
   */
  async getStudentExam(examId) {
    const res = await request(
      `/api/v1/student/exams/${examId}`,
      {
        method: "GET",
      },
      "student",
    );

    if (res.success) {
      return res.data?.data || res.data;
    }

    const err = new Error(res.error || "الاختبار مقفل أو غير متاح حالياً");
    err.status = res.status;
    err.isLocked = res.status === 403;
    throw err;
  },

  /**
   * POST /api/v1/student/exams/{exam}/start
   */
  async startStudentExam(examId) {
    const res = await request(
      `/api/v1/student/exams/${examId}/start`,
      {
        method: "POST",
      },
      "student",
    );

    if (res.success) {
      return res.data;
    }

    throw new Error(res.error || "فشل بدء الاختبار");
  },

  /**
   * Alias used by StudentContext
   */
  async startExamAttempt(examId) {
    return api.startStudentExam(examId);
  },

  /**
   * POST /api/v1/student/exams/{exam}/submit
   */
  async submitStudentExam(examId, payload = {}) {
    let attempt_id = 1;
    let answers = [];

    if (Array.isArray(payload)) {
      answers = payload;
    } else if (payload && typeof payload === "object") {
      attempt_id = payload.attempt_id || payload.attemptId || 1;
      answers = Array.isArray(payload.answers) ? payload.answers : [];
    }

    const formattedAnswers = answers.map((a, idx) => ({
      question_id: Number(a.question_id || a.questionId || idx + 1),
      option_id: Number(
        a.option_id ||
          a.optionId ||
          (a.selectedOptionIndex !== undefined ? a.selectedOptionIndex + 1 : 1),
      ),
    }));

    const body = {
      attempt_id: Number(attempt_id),
      answers: formattedAnswers,
    };

    const res = await request(
      `/api/v1/student/exams/${examId}/submit`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
      "student",
    );

    if (res.success) {
      return res.data;
    }

    throw new Error(res.error || "فشل تسليم إجابات الاختبار");
  },

  /**
   * Alias used by StudentContext
   */
  async submitExamAttempt(examId, answers) {
    return api.submitStudentExam(examId, answers);
  },

  // ============================================================
  // 9. OPENAPI 3.0.0 OPERATION ID ALIASES (Only for different names)
  // ============================================================
  approveStudentActivation: (subId) => api.approveActivationRequest(subId),
  cancelStudentActivation: (subId) => api.cancelActivationRequest(subId),
  adminExamsIndex: () => api.getAdminExams(),
  adminExamsStore: (payload) => api.createAdminExam(payload),
  adminExamsShow: (examId) => api.getAdminExamDetails(examId),
  adminExamsUpdate: (examId, payload) => api.updateAdminExam(examId, payload),
  adminExamsDestroy: (examId) => api.deleteAdminExam(examId),
  adminExamQuestionStore: (examId, payload) =>
    api.createAdminQuestion(examId, payload),
  adminQuestionUpdate: (qId, payload) => api.updateAdminQuestion(qId, payload),
  adminQuestionDestroy: (qId) => api.deleteAdminQuestion(qId),
  adminQuestionOptionStore: (qId, payload) =>
    api.createAdminOption(qId, payload),
  adminOptionUpdate: (optId, payload) => api.updateAdminOption(optId, payload),
  adminOptionDestroy: (optId) => api.deleteAdminOption(optId),
  adminLessonsIndex: (gradeId) => api.getAdminLessons(gradeId),
  adminLessonsStore: (payload) => api.createAdminLesson(payload),
  adminLessonsDestroy: (lessonId) => api.deleteAdminLesson(lessonId),
  getStudentByAdmin: (studentId) => api.getStudentDetails(studentId),
  updateStudentByAdmin: (studentId, payload) =>
    api.updateStudent(studentId, payload),
  activateStudentAccount: (payload) => api.activateStudent(payload),
  studentExamShow: (examId) => api.getStudentExam(examId),
  studentExamStart: (examId) => api.startStudentExam(examId),
  studentExamSubmit: (examId, payload) =>
    api.submitStudentExam(examId, payload),
  studentLessonsIndex: () => api.getStudentLessons(),
  studentVideoShow: (videoId) => api.getStudentVideo(videoId),
  studentVideoProgress: (videoId, payload) =>
    api.updateVideoProgress(videoId, payload),
};

export default api;
