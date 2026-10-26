import { useEffect, useState } from "react";
import { useStudent } from "../context/useStudent";
import {
  User,
  GraduationCap,
  Phone,
  MapPin,
  ShieldCheck,
  Calendar,
  ArrowLeft,
  BookOpen,
  Video,
  FileQuestion,
  CheckCircle2,
  Award,
  Key,
  RefreshCw,
  Clock,
  Smartphone,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function ProfilePage() {
  const {
    student,
    lessonsList,
    studentExamsList,
    memosList,
    isLoadingMemos,
    fetchStudentProfile,
    fetchStudentMemos,
    updateStudentProfile,
    showToast,
  } = useStudent();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    first_name: "",
    last_name: "",
    parent_phone: "",
  });

  useEffect(() => {
    fetchStudentMemos();
  }, [fetchStudentMemos]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const result = await fetchStudentProfile();
      if (result?.success) showToast("تم تحديث بيانات الحساب من السيرفر بنجاح");
    } finally {
      setIsRefreshing(false);
    }
  };

  const startEditingProfile = () => {
    setProfileForm({
      first_name: student?.first_name || "",
      last_name: student?.last_name || "",
      parent_phone: student?.parent_phone || student?.parentPhone || "",
    });
    setIsEditing(true);
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setIsSavingProfile(true);
    try {
      const result = await updateStudentProfile(profileForm);
      if (result?.success) setIsEditing(false);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const studentName =
    student?.name ||
    `${student?.first_name || ""} ${student?.last_name || ""}`.trim() ||
    "طالب";
  const studentGrade = student?.grade || "غير محدد";
  const studentPhone = student?.phone || "غير مسجل";
  const parentPhone =
    student?.parent_phone || student?.parentPhone || "غير مسجل";
  const governorate = student?.governorate || "غير محدد";
  const regDate =
    student?.start_date ||
    student?.created_at ||
    student?.registeredAt ||
    "-";

  const rawSubscriptionCode =
    student?.subscription_code || student?.code || student?.subscription;
  const subscriptionCode =
    (typeof rawSubscriptionCode === "string" && rawSubscriptionCode) ||
    rawSubscriptionCode?.code ||
    rawSubscriptionCode?.subscription_code ||
    student?.subscription?.code ||
    student?.subscription?.subscription_code ||
    "-";

  const subscriptionStatus =
    student?.subscription?.status ||
    student?.subscription?.approval_status ||
    student?.status ||
    "غير متاح";

  const subscriptionEndDate =
    student?.subscription?.end_date ||
    student?.subscription?.expires_at ||
    student?.subscription?.code_expires_at ||
    student?.end_date ||
    "—";

  const attendanceRate =
    student?.attendance_percentage ??
    student?.attendance_rate ??
    student?.attendanceRate ??
    "—";
  const completedQuizzes =
    student?.completed_exams ??
    student?.completed_quizzes ??
    student?.completedQuizzes ??
    "—";
  const averageScore =
    student?.average_score ?? student?.averageScore ?? "—";

  const trustedDeviceId =
    student?.trusted_device?.device_identifier ||
    (typeof student?.trusted_device === "string"
      ? student?.trusted_device
      : student?.device_identifier || null);

  // Grade-filtered content for this student
  const studentLessons = (lessonsList || []).filter(
    (l) => l.grade === studentGrade,
  );
  const studentMemos = (memosList || []).filter(
    (m) => m.grade === studentGrade,
  );

  return (
    <div
      className="container"
      style={{ paddingTop: "1.5rem", paddingBottom: "3rem" }}
    >
      {/* Student Dashboard Header */}
      <div
        className="form-card"
        style={{
          maxWidth: "100%",
          marginBottom: "1.5rem",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width: "4px",
            background:
              "linear-gradient(to bottom, var(--cyan), var(--primary))",
          }}
        ></div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1.25rem",
            paddingBottom: "1.25rem",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "18px",
                background:
                  "linear-gradient(135deg, var(--primary) 0%, var(--cyan) 100%)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.6rem",
                fontWeight: 900,
                boxShadow: "0 0 25px rgba(6, 182, 212, 0.3)",
              }}
            >
              {studentName ? studentName.trim().charAt(0) : <User size={30} />}
            </div>

            <div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <h1
                  style={{
                    fontSize: "1.4rem",
                    fontWeight: 900,
                    color: "#ffffff",
                  }}
                >
                  لوحة تحكم الطالب: {studentName}
                </h1>
                <span
                  className="badge-tag"
                  style={{
                    background: "rgba(16, 185, 129, 0.15)",
                    color: "var(--emerald)",
                    borderColor: "rgba(16, 185, 129, 0.3)",
                  }}
                >
                  طالب معتمد
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginTop: "4px",
                  fontSize: "0.8rem",
                  color: "var(--text-muted)",
                }}
              >
                <span style={{ color: "var(--cyan)", fontWeight: 700 }}>
                  {studentGrade}
                </span>
                <span>•</span>
                <span>
                  كود الاشتراك:{" "}
                  <strong style={{ color: "#fff", fontFamily: "monospace" }}>
                    #{subscriptionCode}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* Server Profile Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="btn-secondary"
            style={{
              padding: "7px 14px",
              fontSize: "0.8rem",
              display: "flex",
              alignItems: "center",
              gap: "7px",
              borderColor: "rgba(6, 182, 212, 0.4)",
              color: "var(--cyan)",
            }}
            title="تحديث بيانات الحساب والاشتراك من السيرفر"
          >
            <RefreshCw
              size={14}
              style={{
                animation: isRefreshing ? "spin 1s linear infinite" : "none",
              }}
            />
            <span>{isRefreshing ? "جارٍ التحديث..." : "تحديث البيانات"}</span>
          </button>
          <button
            type="button"
            onClick={startEditingProfile}
            className="btn-secondary"
            style={{
              padding: "7px 14px",
              fontSize: "0.8rem",
              display: "flex",
              alignItems: "center",
              gap: "7px",
            }}
          >
            <Pencil size={14} />
            تعديل بيانات التواصل
          </button>
        </div>

        {isEditing && (
          <form
            onSubmit={saveProfile}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "12px",
              marginTop: "1.25rem",
              padding: "1rem",
              background: "#090e1a",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
            }}
          >
            {[
              ["first_name", "الاسم الأول"],
              ["last_name", "اسم العائلة"],
              ["parent_phone", "هاتف ولي الأمر"],
            ].map(([field, label]) => (
              <label key={field} className="form-label">
                {label}
                <input
                  className="form-input"
                  required
                  type={field === "parent_phone" ? "tel" : "text"}
                  value={profileForm[field]}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      [field]: event.target.value,
                    }))
                  }
                  style={{ width: "100%", marginTop: "6px" }}
                />
              </label>
            ))}
            <div style={{ display: "flex", alignItems: "end", gap: "8px" }}>
              <button
                type="submit"
                className="btn-primary"
                disabled={isSavingProfile}
                style={{ justifyContent: "center", flex: 1 }}
              >
                <Save size={15} />
                {isSavingProfile ? "جارٍ الحفظ..." : "حفظ"}
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={isSavingProfile}
                onClick={() => setIsEditing(false)}
                aria-label="إلغاء تعديل بيانات التواصل"
              >
                <X size={15} />
              </button>
            </div>
          </form>
        )}

        {/* Academic Performance Summary */}
        <div style={{ marginTop: "1.25rem" }}>
          <h3
            style={{
              fontSize: "0.95rem",
              fontWeight: 800,
              color: "#ffffff",
              marginBottom: "0.75rem",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Award size={16} style={{ color: "var(--amber)" }} />
            <span>مؤشرات الأداء الأكاديمي والتحصيل:</span>
          </h3>
          <div className="stats-row" style={{ marginBottom: "0" }}>
            <div className="stat-box">
              <div className="stat-box-val" style={{ color: "var(--emerald)" }}>
                {attendanceRate}
              </div>
              <div className="stat-box-lbl">نسبة حضور المحاضرات</div>
            </div>
            <div className="stat-box">
              <div className="stat-box-val" style={{ color: "var(--cyan)" }}>
                {completedQuizzes}
              </div>
              <div className="stat-box-lbl">امتحانات تم اجتيازها</div>
            </div>
            <div className="stat-box">
              <div className="stat-box-val" style={{ color: "var(--amber)" }}>
                {averageScore}
              </div>
              <div className="stat-box-lbl">متوسط درجات الاختبارات</div>
            </div>
            <div className="stat-box">
              <div className="stat-box-val" style={{ color: "#818cf8" }}>
                {isLoadingMemos ? "..." : studentMemos.length}
              </div>
              <div className="stat-box-lbl">مذكرات مخصصة لصفك</div>
            </div>
          </div>
        </div>

        {/* Student Information (Read-Only) */}
        <div
          style={{
            marginTop: "1.5rem",
            paddingTop: "1.25rem",
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          <h3
            style={{
              fontSize: "0.95rem",
              fontWeight: 800,
              color: "#ffffff",
              marginBottom: "0.75rem",
            }}
          >
            بيانات الحساب الشخصي:
          </h3>
          <div
            className="profile-info-grid"
          >
            <div
              style={{
                background: "#090e1a",
                padding: "12px 14px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  marginBottom: "3px",
                }}
              >
                <User size={13} style={{ color: "var(--cyan)" }} />
                <span>الاسم:</span>
              </div>
              <div
                style={{
                  fontSize: "0.9rem",
                  fontWeight: 800,
                  color: "#ffffff",
                }}
              >
                {studentName}
              </div>
            </div>

            <div
              style={{
                background: "#090e1a",
                padding: "12px 14px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  marginBottom: "3px",
                }}
              >
                <GraduationCap size={13} style={{ color: "#818cf8" }} />
                <span>الصف:</span>
              </div>
              <div
                style={{
                  fontSize: "0.9rem",
                  fontWeight: 800,
                  color: "var(--cyan)",
                }}
              >
                {studentGrade}
              </div>
            </div>

            <div
              style={{
                background: "#090e1a",
                padding: "12px 14px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  marginBottom: "3px",
                }}
              >
                <Phone size={13} style={{ color: "var(--emerald)" }} />
                <span>هاتف الطالب (واتساب):</span>
              </div>
              <div
                style={{
                  fontSize: "0.9rem",
                  fontWeight: 800,
                  color: "#ffffff",
                  direction: "ltr",
                  textAlign: "right",
                }}
              >
                {studentPhone}
              </div>
            </div>

            <div
              style={{
                background: "#090e1a",
                padding: "12px 14px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  marginBottom: "3px",
                }}
              >
                <Phone size={13} style={{ color: "var(--purple)" }} />
                <span>هاتف ولي الأمر:</span>
              </div>
              <div
                style={{
                  fontSize: "0.9rem",
                  fontWeight: 800,
                  color: "#ffffff",
                  direction: "ltr",
                  textAlign: "right",
                }}
              >
                {parentPhone}
              </div>
            </div>

            <div
              style={{
                background: "#090e1a",
                padding: "12px 14px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  marginBottom: "3px",
                }}
              >
                <MapPin size={13} style={{ color: "var(--amber)" }} />
                <span>المحافظة:</span>
              </div>
              <div
                style={{
                  fontSize: "0.9rem",
                  fontWeight: 800,
                  color: "#ffffff",
                }}
              >
                {governorate}
              </div>
            </div>

            <div
              style={{
                background: "#090e1a",
                padding: "12px 14px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  marginBottom: "3px",
                }}
              >
                <Calendar size={13} style={{ color: "var(--cyan)" }} />
                <span>تاريخ التسجيل:</span>
              </div>
              <div
                style={{
                  fontSize: "0.9rem",
                  fontWeight: 800,
                  color: "#ffffff",
                }}
              >
                {regDate}
              </div>
            </div>

            <div
              style={{
                background: "#090e1a",
                padding: "12px 14px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  marginBottom: "3px",
                }}
              >
                <Key size={13} style={{ color: "var(--cyan)" }} />
                <span>كود الاشتراك الفعلي:</span>
              </div>
              <div
                style={{
                  fontSize: "0.9rem",
                  fontWeight: 800,
                  color: "var(--cyan)",
                  fontFamily: "monospace",
                  letterSpacing: "1px",
                }}
              >
                {subscriptionCode}
              </div>
            </div>

            <div
              style={{
                background: "#090e1a",
                padding: "12px 14px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  marginBottom: "3px",
                }}
              >
                <CheckCircle2 size={13} style={{ color: "var(--emerald)" }} />
                <span>حالة الاشتراك بالباك:</span>
              </div>
              <div
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 800,
                  color: "var(--emerald)",
                }}
              >
                {subscriptionStatus}
              </div>
            </div>

            <div
              style={{
                background: "#090e1a",
                padding: "12px 14px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  marginBottom: "3px",
                }}
              >
                <Clock size={13} style={{ color: "var(--amber)" }} />
                <span>صلاحية الاشتراك:</span>
              </div>
              <div
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 800,
                  color: "#ffffff",
                }}
              >
                {subscriptionEndDate}
              </div>
            </div>

            <div
              style={{
                background: "#090e1a",
                padding: "12px 14px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  marginBottom: "3px",
                }}
              >
                <ShieldCheck size={13} style={{ color: "var(--emerald)" }} />
                <span>حماية الجهاز الموثوق:</span>
              </div>
              <div
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 800,
                  color: "var(--emerald)",
                  fontFamily: trustedDeviceId ? "monospace" : "inherit",
                  wordBreak: "break-all",
                }}
              >
                {trustedDeviceId ? `جهاز موثق (${trustedDeviceId.slice(0, 12)}...) 🔒` : "جهازك الحالي مسجل ومحمي 🔒"}
              </div>
            </div>
          </div>
        </div>

        {/* Notice */}
        <div
          style={{
            marginTop: "1.25rem",
            background: "rgba(99, 102, 241, 0.1)",
            border: "1px solid rgba(99, 102, 241, 0.25)",
            padding: "0.85rem 1rem",
            borderRadius: "var(--radius-md)",
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
          }}
        >
          <ShieldCheck
            size={18}
            style={{ color: "var(--cyan)", flexShrink: 0, marginTop: "2px" }}
          />
          <div
            style={{
              fontSize: "0.8rem",
              color: "var(--text-muted)",
              lineHeight: "1.5",
            }}
          >
            <strong style={{ color: "#ffffff" }}>ملاحظة:</strong> حسابك موثق
            داخل المنصة. لتعديل الصف الدراسي أو أي بيانات، تواصل مع مستر محمد
            عبد الخالق.
          </div>
        </div>
      </div>

      {/* Recommended Lessons for Student */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <h2
            style={{
              fontSize: "1.15rem",
              fontWeight: 900,
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Video size={18} style={{ color: "var(--cyan)" }} />
            <span>محاضرات {studentGrade} المقررة لك:</span>
          </h2>
          <Link
            to="/lessons"
            className="btn-secondary"
            style={{ fontSize: "0.75rem" }}
          >
            <span>عرض كل المحاضرات</span>
            <ArrowLeft size={13} />
          </Link>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))",
            gap: "1rem",
          }}
        >
          {studentLessons.slice(0, 3).map((l) => (
            <div
              key={l.id}
              className="feature-card"
              style={{
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "6px",
                  }}
                >
                  <span className="badge-tag">{l.branch}</span>
                </div>
                <h4
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 800,
                    color: "#fff",
                    marginBottom: "6px",
                  }}
                >
                  {l.title}
                </h4>
                <p
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text-muted)",
                    lineHeight: "1.4",
                  }}
                >
                  {l.description}
                </p>
              </div>
              <div style={{ marginTop: "1rem", display: "flex", gap: "8px" }}>
                <Link
                  to={`/watch/${l.id}`}
                  className="btn-primary"
                  style={{
                    flex: 1,
                    padding: "7px 12px",
                    fontSize: "0.8rem",
                    justifyContent: "center",
                  }}
                >
                  <span>مشاهدة الفيديو</span>
                </Link>
                {(studentExamsList || []).some(
                  (exam) =>
                    String(exam.lesson_id || exam.lesson?.id) === String(l.id),
                ) && (
                  <Link
                    to={`/quiz/${
                      (studentExamsList || []).find(
                        (exam) =>
                          String(exam.lesson_id || exam.lesson?.id) ===
                          String(l.id),
                      )?.id
                    }`}
                    className="btn-secondary"
                    style={{
                      padding: "7px 12px",
                      fontSize: "0.8rem",
                      color: "var(--cyan)",
                    }}
                  >
                    <span>الامتحان</span>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Action Cards (Exams & Memos) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))",
          gap: "1rem",
        }}
      >
        <div
          className="feature-card"
          style={{
            padding: "1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "rgba(6, 182, 212, 0.15)",
              color: "var(--cyan)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <FileQuestion size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <h4
              style={{
                fontSize: "1rem",
                fontWeight: 800,
                color: "#fff",
                marginBottom: "2px",
              }}
            >
              بنك الامتحانات الشاملة
            </h4>
            <p
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                marginBottom: "8px",
              }}
            >
              اختبر فهمك لمسائل المستويات العليا
            </p>
            <Link
              to="/exams"
              className="btn-secondary"
              style={{
                fontSize: "0.75rem",
                padding: "4px 10px",
                display: "inline-flex",
              }}
            >
              <span>بدء الاختبارات</span>
              <ArrowLeft size={12} />
            </Link>
          </div>
        </div>

        <div
          className="feature-card"
          style={{
            padding: "1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "rgba(99, 102, 241, 0.15)",
              color: "#818cf8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <BookOpen size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <h4
              style={{
                fontSize: "1rem",
                fontWeight: 800,
                color: "#fff",
                marginBottom: "2px",
              }}
            >
              مذكرات وملخصات العميد
            </h4>
            <p
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                marginBottom: "8px",
              }}
            >
              تحميل مذكرات الشرح بصيغة PDF
            </p>
            <Link
              to="/memos"
              className="btn-secondary"
              style={{
                fontSize: "0.75rem",
                padding: "4px 10px",
                display: "inline-flex",
              }}
            >
              <span>تحميل المذكرات</span>
              <ArrowLeft size={12} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
