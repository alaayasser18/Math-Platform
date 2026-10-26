import { useState } from "react";
import { X, LogIn, AlertCircle } from "lucide-react";
import { useStudent } from "../context/useStudent";
import { GRADES } from "../data/platformData";

export default function AuthModal() {
  const {
    isAuthModalOpen,
    closeAuthModal,
    studentLoginWithCode,
    submitActivationRequest,
  } = useStudent();

  const [activeTab, setActiveTab] = useState("login"); // 'login' | 'activate'
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Login Code State (Placeholder default, empty string)
  const [code, setCode] = useState("");

  // Register Form Data (All grades from 1st Prep to 3rd Sec)
  const [registerData, setRegisterData] = useState({
    firstName: "",
    lastName: "",
    gradeId: GRADES[0]?.numericId || 6,
    phone: "",
    parentPhone: "",
  });

  if (!isAuthModalOpen) return null;

  const validateActivation = () => {
    const errors = {};
    const nameRegex = /^[\u0600-\u06FFa-zA-Z\s]{2,30}$/;
    const phoneRegex = /^01[0125][0-9]{8}$/;

    const cleanFirst = registerData.firstName.trim();
    if (!cleanFirst) {
      errors.firstName = "الاسم الأول مطلوب";
    } else if (!nameRegex.test(cleanFirst)) {
      errors.firstName = "يرجى إدخال اسم بحروف فقط";
    }

    const cleanLast = registerData.lastName.trim();
    if (!cleanLast) {
      errors.lastName = "اسم العائلة مطلوب";
    } else if (!nameRegex.test(cleanLast)) {
      errors.lastName = "يرجى إدخال اسم بحروف فقط";
    }

    const cleanPhone = registerData.phone.trim();
    if (!cleanPhone) {
      errors.phone = "رقم هاتف الطالب مطلوب";
    } else if (!phoneRegex.test(cleanPhone)) {
      errors.phone = "رقم غير صحيح (11 رقماً يبدأ بـ 010, 011, 012, 015)";
    }

    const cleanParentPhone = registerData.parentPhone.trim();
    if (!cleanParentPhone) {
      errors.parentPhone = "رقم ولي الأمر مطلوب";
    } else if (!phoneRegex.test(cleanParentPhone)) {
      errors.parentPhone = "رقم غير صحيح (11 رقماً يبدأ بـ 010, 011, 012, 015)";
    } else if (cleanPhone && cleanPhone === cleanParentPhone) {
      errors.parentPhone = "لا يمكن تطابق رقم ولي الأمر مع هاتف الطالب";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    if (!code.trim()) {
      setErrorMessage("يرجى إدخال كود الاشتراك الخاص بك");
      return;
    }
    setIsLoading(true);
    const res = await studentLoginWithCode(code);
    setIsLoading(false);
    if (res.success) {
      closeAuthModal();
      setCode("");
    } else {
      setErrorMessage(res.message);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    if (!validateActivation()) {
      return;
    }

    setIsLoading(true);
    const res = await submitActivationRequest(registerData);
    setIsLoading(false);

    if (res.success) {
      closeAuthModal();
    } else {
      setErrorMessage(res.message);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={closeAuthModal}
      style={{ zIndex: 1100 }}
    >
      <div
        className="modal-content"
        style={{
          maxWidth: "480px",
          width: "100%",
          maxHeight: "92vh",
          overflowY: "auto",
          overflowX: "hidden",
          background: "#090e1a",
          border: "1px solid rgba(6, 182, 212, 0.3)",
          borderRadius: "var(--radius-xl, 20px)",
          padding: "clamp(1rem, 4vw, 1.75rem)",
          position: "relative",
          boxShadow: "0 20px 50px rgba(0,0,0,0.85)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          style={{
            position: "absolute",
            top: "16px",
            left: "16px",
            background: "rgba(255,255,255,0.05)",
            border: "none",
            color: "var(--text-muted)",
            borderRadius: "50%",
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 900, color: "#ffffff" }}>
            بوابة منصة العميد
          </h2>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            الدخول بكود الاشتراك أو تقديم طلب تفعيل جديد
          </p>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px",
            background: "rgba(255,255,255,0.04)",
            padding: "4px",
            borderRadius: "10px",
            marginBottom: "1.25rem",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setActiveTab("login");
              setErrorMessage("");
              setFieldErrors({});
            }}
            style={{
              padding: "8px",
              borderRadius: "8px",
              border: "none",
              background: activeTab === "login" ? "var(--cyan)" : "transparent",
              color: activeTab === "login" ? "#000" : "var(--text-muted)",
              fontWeight: 800,
              fontSize: "0.8rem",
              cursor: "pointer",
            }}
          >
            دخول بكود الاشتراك
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("activate");
              setErrorMessage("");
              setFieldErrors({});
            }}
            style={{
              padding: "8px",
              borderRadius: "8px",
              border: "none",
              background:
                activeTab === "activate" ? "var(--cyan)" : "transparent",
              color: activeTab === "activate" ? "#000" : "var(--text-muted)",
              fontWeight: 800,
              fontSize: "0.8rem",
              cursor: "pointer",
            }}
          >
            طلب تفعيل جديد
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div
            style={{
              background: "rgba(244, 63, 94, 0.15)",
              border: "1px solid rgba(244, 63, 94, 0.35)",
              color: "#fda4af",
              padding: "8px 12px",
              borderRadius: "8px",
              fontSize: "0.78rem",
              marginBottom: "1rem",
              textAlign: "center",
            }}
          >
            {errorMessage}
          </div>
        )}

        {/* Login Form */}
        {activeTab === "login" ? (
          <form onSubmit={handleLoginSubmit}>
            <div className="form-group" style={{ marginBottom: "1.25rem" }}>
              <label
                className="form-label"
                style={{ fontSize: "0.8rem", fontWeight: 700 }}
              >
                كود الاشتراك المعتمد
              </label>
              <input
                type="text"
                dir="ltr"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="اكتب كود الاشتراك هنا (مثال: SEC3-101)..."
                className="form-input"
                style={{
                  textAlign: "center",
                  fontSize: "1rem",
                  fontWeight: 800,
                  padding: "12px",
                }}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary"
              style={{
                width: "100%",
                justifyContent: "center",
                padding: "12px",
              }}
            >
              {isLoading ? "جاري التحقق..." : "تسجيل الدخول"}
            </button>
          </form>
        ) : (
          /* Activation Request Form with select dropdown and validation */
          <form onSubmit={handleRegisterSubmit} noValidate>
            <div
              className="grid-2col"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
                marginBottom: "10px",
              }}
            >
              <div>
                <label
                  className="form-label"
                  style={{ fontSize: "0.75rem", fontWeight: 700 }}
                >
                  الاسم الأول *
                </label>
                <input
                  type="text"
                  value={registerData.firstName}
                  onChange={(e) => {
                    setRegisterData({
                      ...registerData,
                      firstName: e.target.value,
                    });
                    if (fieldErrors.firstName)
                      setFieldErrors({ ...fieldErrors, firstName: null });
                  }}
                  placeholder="أحمد"
                  className="form-input"
                  style={{
                    fontSize: "0.85rem",
                    borderColor: fieldErrors.firstName ? "#f43f5e" : undefined,
                  }}
                />
                {fieldErrors.firstName && (
                  <span style={{ color: "#fda4af", fontSize: "0.7rem" }}>
                    {fieldErrors.firstName}
                  </span>
                )}
              </div>
              <div>
                <label
                  className="form-label"
                  style={{ fontSize: "0.75rem", fontWeight: 700 }}
                >
                  اسم العائلة *
                </label>
                <input
                  type="text"
                  value={registerData.lastName}
                  onChange={(e) => {
                    setRegisterData({
                      ...registerData,
                      lastName: e.target.value,
                    });
                    if (fieldErrors.lastName)
                      setFieldErrors({ ...fieldErrors, lastName: null });
                  }}
                  placeholder="علي"
                  className="form-input"
                  style={{
                    fontSize: "0.85rem",
                    borderColor: fieldErrors.lastName ? "#f43f5e" : undefined,
                  }}
                />
                {fieldErrors.lastName && (
                  <span style={{ color: "#fda4af", fontSize: "0.7rem" }}>
                    {fieldErrors.lastName}
                  </span>
                )}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: "10px" }}>
              <label
                className="form-label"
                style={{ fontSize: "0.75rem", fontWeight: 700 }}
              >
                الصف الدراسي *
              </label>
              <select
                value={registerData.gradeId}
                onChange={(e) =>
                  setRegisterData({
                    ...registerData,
                    gradeId: Number(e.target.value),
                  })
                }
                className="form-input"
                style={{
                  fontSize: "0.85rem",
                  background: "#0b1120",
                  color: "#fff",
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
                marginBottom: "14px",
              }}
            >
              <div>
                <label
                  className="form-label"
                  style={{ fontSize: "0.75rem", fontWeight: 700 }}
                >
                  هاتف الطالب *
                </label>
                <input
                  type="tel"
                  dir="ltr"
                  value={registerData.phone}
                  onChange={(e) => {
                    setRegisterData({ ...registerData, phone: e.target.value });
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
                  <span style={{ color: "#fda4af", fontSize: "0.7rem" }}>
                    {fieldErrors.phone}
                  </span>
                )}
              </div>
              <div>
                <label
                  className="form-label"
                  style={{ fontSize: "0.75rem", fontWeight: 700 }}
                >
                  هاتف ولي الأمر *
                </label>
                <input
                  type="tel"
                  dir="ltr"
                  value={registerData.parentPhone}
                  onChange={(e) => {
                    setRegisterData({
                      ...registerData,
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
                  <span style={{ color: "#fda4af", fontSize: "0.7rem" }}>
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
                justifyContent: "center",
                padding: "12px",
              }}
            >
              {isLoading ? "جاري إرسال الطلب..." : "إرسال طلب التفعيل للمعلم"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
