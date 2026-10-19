import { useState } from "react";
import {
  LogIn,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { useStudent } from "../context/useStudent";
import { GRADES } from "../data/platformData";

export default function LoginPage() {
  const {
    studentLoginWithCode,
    submitActivationRequest,
    adminLoginWithCredentials,
  } = useStudent();

  // Active View Tab: 'student' | 'admin' | 'activate'
  const [activeTab, setActiveTab] = useState("student");

  // Loading & Error States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [activationSuccess, setActivationSuccess] = useState(null);

  // Form 1: Student Login State (Placeholder default, empty string)
  const [studentCode, setStudentCode] = useState("");

  // Form 2: Admin Login State (Email & Password)
  const [adminData, setAdminData] = useState({
    email: "",
    password: "",
  });

  // Password visibility toggle
  const [showPassword, setShowPassword] = useState(false);

  // Form 3: Student Activation Request State (From 1st Prep to 3rd Sec)
  const [activationData, setActivationData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    parentPhone: "",
    gradeId: GRADES[0]?.numericId || 6, // Default 1st Prep
  });

  // Validation function for Student Activation
  const validateActivation = () => {
    const errors = {};
    const nameRegex = /^[\u0600-\u06FFa-zA-Z\s]{2,30}$/;
    const phoneRegex = /^01[0125][0-9]{8}$/;

    const cleanFirst = activationData.firstName.trim();
    if (!cleanFirst) {
      errors.firstName = "الاسم الأول مطلوب";
    } else if (!nameRegex.test(cleanFirst)) {
      errors.firstName = "يرجى إدخال اسم صحيح بحروف فقط (حرفين على الأقل)";
    }

    const cleanLast = activationData.lastName.trim();
    if (!cleanLast) {
      errors.lastName = "اسم العائلة مطلوب";
    } else if (!nameRegex.test(cleanLast)) {
      errors.lastName = "يرجى إدخال اسم عائلة صحيح بحروف فقط";
    }

    const cleanPhone = activationData.phone.trim();
    if (!cleanPhone) {
      errors.phone = "رقم هاتف الطالب مطلوب";
    } else if (!phoneRegex.test(cleanPhone)) {
      errors.phone =
        "رقم غير صحيح، يجب أن يتكون من 11 رقماً ويبدأ بـ (010, 011, 012, 015)";
    }

    const cleanParentPhone = activationData.parentPhone.trim();
    if (!cleanParentPhone) {
      errors.parentPhone = "رقم هاتف ولي الأمر مطلوب";
    } else if (!phoneRegex.test(cleanParentPhone)) {
      errors.parentPhone =
        "رقم غير صحيح، يجب أن يتكون من 11 رقماً ويبدأ بـ (010, 011, 012, 015)";
    } else if (cleanPhone && cleanPhone === cleanParentPhone) {
      errors.parentPhone = "لا يمكن أن يتطابق هاتف ولي الأمر مع هاتف الطالب";
    }

    if (!activationData.gradeId) {
      errors.gradeId = "يرجى اختيار الصف الدراسي";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 1. Handle Student Login
  const handleStudentLogin = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    if (!studentCode.trim()) {
      setErrorMessage("يرجى كتابة كود الاشتراك الخاص بك");
      return;
    }
    setIsLoading(true);
    const res = await studentLoginWithCode(studentCode);
    setIsLoading(false);
    if (!res.success) {
      setErrorMessage(res.message);
    }
  };

  // 2. Handle Admin Login
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!adminData.email.trim() || !adminData.password.trim()) {
      setErrorMessage("يرجى إدخال البريد الإلكتروني وكلمة المرور");
      return;
    }

    setIsLoading(true);

    const res = await adminLoginWithCredentials({
      email: adminData.email.trim(),
      password: adminData.password,
    });

    setIsLoading(false);

    if (!res?.success) {
      setErrorMessage(res?.message || res?.error || "فشل تسجيل الدخول");
    }
  };
  // 3. Handle Activation Request Submission with Validation
  const handleActivationSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!validateActivation()) {
      setErrorMessage(
        "يرجى مراجعة البيانات المدخلة وتصحيح الأخطاء الموضحة أدناه",
      );
      return;
    }

    setIsLoading(true);
    const res = await submitActivationRequest(activationData);
    setIsLoading(false);

    if (res.success) {
      setActivationSuccess({
        name: `${activationData.firstName.trim()} ${activationData.lastName.trim()}`,
        grade:
          GRADES.find((g) => g.numericId === Number(activationData.gradeId))
            ?.name || "الصف المحدد",
        phone: activationData.phone,
      });
      setFieldErrors({});
    } else {
      setErrorMessage(res.message);
    }
  };

  return (
    <div
      style={{
        minHeight: "85vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem",
      }}
    >
      <div
        className="form-card"
        style={{
          width: "100%",
          maxWidth: "520px",
          padding: "2.25rem 2rem",
          background: "#090e1a",
          border: "1px solid rgba(6, 182, 212, 0.35)",
          borderRadius: "var(--radius-xl, 24px)",
          boxShadow: "0 25px 60px rgba(0,0,0,0.85)",
          position: "relative",
        }}
      >
        {/* Glow Top Accent */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "20%",
            right: "20%",
            height: "3px",
            background:
              "linear-gradient(90deg, transparent, var(--cyan), transparent)",
          }}
        ></div>

        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <h1
            style={{
              fontSize: "1.6rem",
              fontWeight: 900,
              color: "#ffffff",
              letterSpacing: "-0.5px",
            }}
          >
            منصة العميد في الرياضيات
          </h1>
          <p
            style={{
              fontSize: "0.85rem",
              color: "var(--text-muted)",
              marginTop: "4px",
            }}
          >
            أ / محمد عبد الخالق • بوابة الوصول والاشتراكات المعتمدة
          </p>
        </div>

        {/* Navigation Tabs */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "6px",
            background: "rgba(255,255,255,0.03)",
            padding: "5px",
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.08)",
            marginBottom: "1.5rem",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setActiveTab("student");
              setErrorMessage("");
              setFieldErrors({});
              setActivationSuccess(null);
            }}
            style={{
              padding: "9px 8px",
              borderRadius: "9px",
              border: "none",
              background:
                activeTab === "student" ? "var(--cyan)" : "transparent",
              color: activeTab === "student" ? "#000" : "var(--text-muted)",
              fontWeight: 800,
              fontSize: "0.8rem",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            دخول الطالب
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("activate");
              setErrorMessage("");
              setFieldErrors({});
              setActivationSuccess(null);
            }}
            style={{
              padding: "9px 8px",
              borderRadius: "9px",
              border: "none",
              background:
                activeTab === "activate" ? "var(--cyan)" : "transparent",
              color: activeTab === "activate" ? "#000" : "var(--text-muted)",
              fontWeight: 800,
              fontSize: "0.8rem",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            طلب تفعيل جديد
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("admin");
              setErrorMessage("");
              setFieldErrors({});
              setActivationSuccess(null);
            }}
            style={{
              padding: "9px 8px",
              borderRadius: "9px",
              border: "none",
              background:
                activeTab === "admin"
                  ? "linear-gradient(135deg, #4f46e5, #06b6d4)"
                  : "transparent",
              color: activeTab === "admin" ? "#fff" : "var(--text-muted)",
              fontWeight: 800,
              fontSize: "0.8rem",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            دخول المعلم
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div
            style={{
              background: "rgba(244, 63, 94, 0.15)",
              border: "1px solid rgba(244, 63, 94, 0.35)",
              color: "#fda4af",
              padding: "10px 14px",
              borderRadius: "10px",
              fontSize: "0.8rem",
              marginBottom: "1.25rem",
              textAlign: "center",
              lineHeight: "1.5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 1: STUDENT LOGIN BY SUBSCRIPTION CODE                            */}
        {/* ==================================================================== */}
        {activeTab === "student" && (
          <div>
            <form onSubmit={handleStudentLogin}>
              <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                <label
                  className="form-label"
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    marginBottom: "8px",
                  }}
                >
                  كود الاشتراك المعتمد (Subscription Code)
                </label>
                <input
                  type="text"
                  dir="ltr"
                  required
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value)}
                  placeholder="مثال: SEC3-101 أو كود التفعيل الخاص بك..."
                  className="form-input"
                  style={{
                    fontSize: "1rem",
                    fontWeight: 800,
                    padding: "13px",
                    textAlign: "center",
                    letterSpacing: "1.5px",
                    background: "#050914",
                    borderColor: "rgba(6, 182, 212, 0.4)",
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary"
                style={{
                  width: "100%",
                  padding: "13px",
                  fontSize: "0.95rem",
                  fontWeight: 800,
                  justifyContent: "center",
                  borderRadius: "12px",
                }}
              >
                {isLoading ? (
                  <span>جاري التحقق من كود الاشتراك...</span>
                ) : (
                  <>
                    <LogIn size={18} />
                    <span>تسجيل الدخول وفتح المحتوى</span>
                  </>
                )}
              </button>
            </form>

            {/* Switch to Register */}
            <div
              style={{
                textAlign: "center",
                marginTop: "1.5rem",
                paddingTop: "1.25rem",
                borderTop: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setActiveTab("activate");
                  setErrorMessage("");
                  setFieldErrors({});
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--cyan)",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <UserPlus size={15} />
                <span>طالب جديد؟ اضغط هنا لتقديم طلب تفعيل اشتراك</span>
              </button>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 2: STUDENT ACTIVATION REQUEST (POST /api/v1/auth/activate)       */}
        {/* ==================================================================== */}
        {activeTab === "activate" && (
          <div>
            {activationSuccess ? (
              /* Success confirmation state without any auto-approve button */
              <div style={{ textAlign: "center", padding: "1rem 0" }}>
                <div
                  style={{
                    width: "60px",
                    height: "60px",
                    borderRadius: "50%",
                    background: "rgba(16, 185, 129, 0.15)",
                    border: "2px solid var(--emerald)",
                    color: "var(--emerald)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                  }}
                >
                  <CheckCircle2 size={32} />
                </div>
                <h2
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 900,
                    color: "#ffffff",
                    marginBottom: "8px",
                  }}
                >
                  تم تقديم طلب التفعيل بنجاح!
                </h2>
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--text-muted)",
                    lineHeight: "1.6",
                    marginBottom: "1.5rem",
                  }}
                >
                  مرحباً بك يا{" "}
                  <strong style={{ color: "#fff" }}>
                    {activationSuccess.name}
                  </strong>{" "}
                  في{" "}
                  <strong style={{ color: "var(--cyan)" }}>
                    {activationSuccess.grade}
                  </strong>
                  .
                  <br />
                  تم إرسال بياناتك بنجاح، وطلبك قيد المراجعة حالياً من مستر محمد
                  عبد الخالق لمنحك كود الدخول والاشتراك.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("student");
                    setActivationSuccess(null);
                  }}
                  className="btn-primary"
                  style={{
                    width: "100%",
                    justifyContent: "center",
                    padding: "12px",
                    borderRadius: "10px",
                  }}
                >
                  <span>العودة لصفحة تسجيل الدخول</span>
                </button>
              </div>
            ) : (
              /* Activation request form with dropdown select for grades and validation */
              <form onSubmit={handleActivationSubmit} noValidate>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "8px",
                    marginBottom: "12px",
                  }}
                >
                  <div>
                    <label
                      className="form-label"
                      style={{ fontSize: "0.78rem", fontWeight: 700 }}
                    >
                      الاسم الأول *
                    </label>
                    <input
                      type="text"
                      value={activationData.firstName}
                      onChange={(e) => {
                        setActivationData({
                          ...activationData,
                          firstName: e.target.value,
                        });
                        if (fieldErrors.firstName)
                          setFieldErrors({ ...fieldErrors, firstName: null });
                      }}
                      placeholder="أحمد"
                      className="form-input"
                      style={{
                        fontSize: "0.85rem",
                        borderColor: fieldErrors.firstName
                          ? "#f43f5e"
                          : undefined,
                      }}
                    />
                    {fieldErrors.firstName && (
                      <span
                        style={{
                          color: "#fda4af",
                          fontSize: "0.72rem",
                          marginTop: "3px",
                          display: "block",
                        }}
                      >
                        {fieldErrors.firstName}
                      </span>
                    )}
                  </div>

                  <div>
                    <label
                      className="form-label"
                      style={{ fontSize: "0.78rem", fontWeight: 700 }}
                    >
                      اسم العائلة (اللقب) *
                    </label>
                    <input
                      type="text"
                      value={activationData.lastName}
                      onChange={(e) => {
                        setActivationData({
                          ...activationData,
                          lastName: e.target.value,
                        });
                        if (fieldErrors.lastName)
                          setFieldErrors({ ...fieldErrors, lastName: null });
                      }}
                      placeholder="علي"
                      className="form-input"
                      style={{
                        fontSize: "0.85rem",
                        borderColor: fieldErrors.lastName
                          ? "#f43f5e"
                          : undefined,
                      }}
                    />
                    {fieldErrors.lastName && (
                      <span
                        style={{
                          color: "#fda4af",
                          fontSize: "0.72rem",
                          marginTop: "3px",
                          display: "block",
                        }}
                      >
                        {fieldErrors.lastName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Grade Selection as a Dropdown Select Box (From 1st Prep to 3rd Sec) */}
                <div className="form-group" style={{ marginBottom: "12px" }}>
                  <label
                    className="form-label"
                    style={{ fontSize: "0.78rem", fontWeight: 700 }}
                  >
                    الصف الدراسي *
                  </label>
                  <select
                    value={activationData.gradeId}
                    onChange={(e) => {
                      setActivationData({
                        ...activationData,
                        gradeId: Number(e.target.value),
                      });
                      if (fieldErrors.gradeId)
                        setFieldErrors({ ...fieldErrors, gradeId: null });
                    }}
                    className="form-input"
                    style={{
                      fontSize: "0.85rem",
                      padding: "10px 12px",
                      background: "#0b1120",
                      color: "#ffffff",
                    }}
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
                    gap: "8px",
                    marginBottom: "16px",
                  }}
                >
                  <div>
                    <label
                      className="form-label"
                      style={{ fontSize: "0.78rem", fontWeight: 700 }}
                    >
                      هاتف الطالب (واتساب) *
                    </label>
                    <input
                      type="tel"
                      dir="ltr"
                      value={activationData.phone}
                      onChange={(e) => {
                        setActivationData({
                          ...activationData,
                          phone: e.target.value,
                        });
                        if (fieldErrors.phone)
                          setFieldErrors({ ...fieldErrors, phone: null });
                      }}
                      placeholder="010XXXXXXXX"
                      className="form-input"
                      style={{
                        fontSize: "0.85rem",
                        borderColor: fieldErrors.phone ? "#f43f5e" : undefined,
                      }}
                    />
                    {fieldErrors.phone && (
                      <span
                        style={{
                          color: "#fda4af",
                          fontSize: "0.72rem",
                          marginTop: "3px",
                          display: "block",
                        }}
                      >
                        {fieldErrors.phone}
                      </span>
                    )}
                  </div>

                  <div>
                    <label
                      className="form-label"
                      style={{ fontSize: "0.78rem", fontWeight: 700 }}
                    >
                      هاتف ولي الأمر *
                    </label>
                    <input
                      type="tel"
                      dir="ltr"
                      value={activationData.parentPhone}
                      onChange={(e) => {
                        setActivationData({
                          ...activationData,
                          parentPhone: e.target.value,
                        });
                        if (fieldErrors.parentPhone)
                          setFieldErrors({ ...fieldErrors, parentPhone: null });
                      }}
                      placeholder="011XXXXXXXX"
                      className="form-input"
                      style={{
                        fontSize: "0.85rem",
                        borderColor: fieldErrors.parentPhone
                          ? "#f43f5e"
                          : undefined,
                      }}
                    />
                    {fieldErrors.parentPhone && (
                      <span
                        style={{
                          color: "#fda4af",
                          fontSize: "0.72rem",
                          marginTop: "3px",
                          display: "block",
                        }}
                      >
                        {fieldErrors.parentPhone}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary"
                  style={{
                    width: "100%",
                    padding: "13px",
                    fontSize: "0.9rem",
                    justifyContent: "center",
                    borderRadius: "12px",
                  }}
                >
                  {isLoading
                    ? "جاري إرسال طلب التفعيل..."
                    : "تقديم طلب تفعيل الحساب والاشتراك"}
                </button>

                <div style={{ textAlign: "center", marginTop: "1.25rem" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("student");
                      setErrorMessage("");
                      setFieldErrors({});
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-muted)",
                      fontSize: "0.8rem",
                      cursor: "pointer",
                    }}
                  >
                    لديك كود بالفعل؟{" "}
                    <strong style={{ color: "#fff" }}>
                      العودة لتسجيل الدخول
                    </strong>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 3: ADMIN / TEACHER LOGIN (POST /api/v1/admin/auth/login)         */}
        {/* ==================================================================== */}
        {activeTab === "admin" && (
          <div>
            <form onSubmit={handleAdminLogin}>
              <div className="form-group" style={{ marginBottom: "12px" }}>
                <label
                  className="form-label"
                  style={{ fontSize: "0.8rem", fontWeight: 700 }}
                >
                  البريد الإلكتروني للإدارة (Email)
                </label>
                <input
                  type="email"
                  required
                  dir="ltr"
                  value={adminData.email}
                  onChange={(e) =>
                    setAdminData({ ...adminData, email: e.target.value })
                  }
                  placeholder="admin@example.com"
                  className="form-input"
                  style={{ fontSize: "0.9rem", padding: "10px 14px" }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                <label
                  className="form-label"
                  style={{ fontSize: "0.8rem", fontWeight: 700 }}
                >
                  كلمة المرور (Password)
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    dir="ltr"
                    value={adminData.password}
                    onChange={(e) =>
                      setAdminData({ ...adminData, password: e.target.value })
                    }
                    placeholder="••••••••"
                    className="form-input"
                    style={{
                      fontSize: "0.9rem",
                      padding: "10px 42px 10px 14px",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      padding: "4px",
                      display: "flex",
                      alignItems: "center",
                      transition: "color 0.2s",
                    }}
                    title={
                      showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"
                    }
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary"
                style={{
                  width: "100%",
                  padding: "13px",
                  fontSize: "0.95rem",
                  fontWeight: 800,
                  justifyContent: "center",
                  borderRadius: "12px",
                  background:
                    "linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)",
                  boxShadow: "0 0 25px rgba(79, 70, 229, 0.4)",
                }}
              >
                {isLoading ? (
                  <span>جاري تسجيل دخول الإدارة...</span>
                ) : (
                  <>
                    <ShieldCheck size={18} />
                    <span>دخول لوحة تحكم المعلم</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
