import { useState, useMemo, useEffect } from "react";
import { useStudent } from "../context/useStudent";
import GradeFilter from "../Components/GradeFilter";
import useUrlState from "../hooks/useUrlState";
import { GRADES, BRANCHES } from "../data/platformData";
import { getGradeIdByName, getGradeNameById } from "../services/api";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  BookOpen,
  Download,
  GraduationCap,
  Shield,
  Plus,
  Trash2,
  X,
  AlertTriangle,
  FileText,
  Pencil,
} from "lucide-react";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const memoGradeValues = new Set([
  BRANCHES[0],
  ...GRADES.map((grade) => grade.name),
]);
const MEMO_URL_SCHEMA = {
  grade: {
    defaultValue: BRANCHES[0],
    normalize: (value) => (memoGradeValues.has(value) ? value : null),
  },
};

const createEmptyMemoForm = () => ({
  title: "",
  grade: "",
  pages: "",
  fileSize: "",
  year: "",
  sortOrder: "",
  isActive: null,
  fileUrl: "",
  coverImageUrl: "",
  pdfFile: null,
  coverImage: null,
});

function formatFileSize(bytes) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${(bytes / 1024).toFixed(2)} KB`;
}

function getMemoFileUrl(memo) {
  return (
    memo?.file_url ||
    memo?.pdf_file_url ||
    memo?.pdf_url ||
    (typeof memo?.pdf_file === "string" ? memo.pdf_file : "")
  );
}

function getMemoGradeName(memo) {
  const gradeValue = memo.grade?.id ?? memo.grade_id ?? memo.grade;
  const gradeName =
    typeof memo.grade === "object"
      ? memo.grade.name
      : memo.grade_name || memo.grade;
  const grade = GRADES.find(
    (item) =>
      String(item.numericId) === String(gradeValue) ||
      String(item.id) === String(gradeValue) ||
      String(item.numericId) === String(gradeName) ||
      String(item.id) === String(gradeName) ||
      item.name === gradeName,
  );

  return grade?.name || (typeof gradeName === "string" ? gradeName : "");
}

export default function MemosPage() {
  const {
    showToast,
    memosList,
    student,
    userRole,
    addMemo,
    updateMemo,
    deleteMemo,
    isLoadingMemos,
    fetchAdminMemos,
    fetchStudentMemos,
    fetchAdminMemoDetails,
    downloadStudentMemo,
  } = useStudent();
  const isTeacher = userRole === "teacher";

  // اسم صف الطالب بيتحدد من grade_id اللي راجع من السيرفر، مش من نص الصف
  // (نص الصف ممكن يرجع بالإنجليزي من الـ API).
  const studentGradeId = student?.grade_id || student?.gradeId;
  const studentGrade = studentGradeId
    ? getGradeNameById(studentGradeId)
    : student?.grade || "";
  const [urlState, setUrlState] = useUrlState(MEMO_URL_SCHEMA);
  const selectedGrade = isTeacher ? urlState.grade : studentGrade;
  const setSelectedGrade = (grade) => setUrlState({ grade });

  // Teacher Modals State
  const [isAddMemoOpen, setIsAddMemoOpen] = useState(false);
  const [editingMemo, setEditingMemo] = useState(null);
  const [deleteConfirmationMemo, setDeleteConfirmationMemo] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReadingPdf, setIsReadingPdf] = useState(false);
  const [downloadingMemoId, setDownloadingMemoId] = useState(null);

  const [newMemoData, setNewMemoData] = useState(createEmptyMemoForm);

  const effectiveGrade = isTeacher ? selectedGrade : studentGrade;

  useEffect(() => {
    if (isTeacher) {
      const gradeId =
        selectedGrade === BRANCHES[0] ? null : getGradeIdByName(selectedGrade);
      fetchAdminMemos(gradeId);
    } else {
      fetchStudentMemos();
    }
  }, [fetchAdminMemos, fetchStudentMemos, isTeacher, selectedGrade]);

  const filteredMemos = useMemo(() => {
    // الطالب: السيرفر بيرجّع له مذكرات صفه بس، فنعرض اللي راجع كما هو.
    if (!isTeacher) return memosList || [];

    return (memosList || []).filter((memo) => {
      if (effectiveGrade === BRANCHES[0]) return true;
      const memoGradeId = memo.grade_id || memo.grade?.id || memo.grade;
      return (
        getMemoGradeName(memo) === effectiveGrade ||
        String(memoGradeId) === String(getGradeIdByName(effectiveGrade))
      );
    });
  }, [memosList, effectiveGrade, isTeacher]);

  const resetMemoForm = () => {
    setNewMemoData(createEmptyMemoForm());
    setEditingMemo(null);
  };

  const handlePdfFileChange = async (event) => {
    const pdfFile = event.target.files?.[0];
    if (!pdfFile) return;

    if (
      pdfFile.type !== "application/pdf" &&
      !pdfFile.name.toLowerCase().endsWith(".pdf")
    ) {
      showToast("يُرجى اختيار ملف PDF صالح", "error");
      event.target.value = "";
      return;
    }

    setIsReadingPdf(true);
    try {
      const loadingTask = getDocument({
        data: await pdfFile.arrayBuffer(),
      });
      try {
        const pdf = await loadingTask.promise;
        setNewMemoData((current) => ({
          ...current,
          pdfFile,
          fileUrl: "",
          pages: String(pdf.numPages),
          fileSize: formatFileSize(pdfFile.size),
        }));
        await loadingTask.destroy();
      } catch (error) {
        await loadingTask.destroy();
        throw error;
      }
    } catch (error) {
      console.error("Failed to read uploaded memo PDF:", error);
      showToast(
        "تعذر قراءة ملف PDF. تأكدي من أن الملف صالح ثم حاولي مرة أخرى.",
        "error",
      );
      event.target.value = "";
    } finally {
      setIsReadingPdf(false);
    }
  };

  const handleSaveMemo = async (e) => {
    e.preventDefault();
    if (!newMemoData.title.trim()) {
      showToast("يرجى كتابة عنوان المذكرة أولاً", "error");
      return;
    }
    if (
      !newMemoData.pdfFile &&
      !newMemoData.fileUrl.trim() &&
      !getMemoFileUrl(editingMemo)
    ) {
      showToast("ملف PDF مطلوب لإضافة المذكرة", "error");
      return;
    }

    setIsProcessing(true);
    const payload = {
      grade_id: getGradeIdByName(newMemoData.grade),
      title: newMemoData.title.trim(),
      ...(newMemoData.fileUrl.trim()
        ? { file_url: newMemoData.fileUrl.trim() }
        : {}),
      ...(newMemoData.coverImageUrl.trim()
        ? { cover_image_url: newMemoData.coverImageUrl.trim() }
        : {}),
      ...(newMemoData.fileSize.trim()
        ? { file_size: newMemoData.fileSize.trim() }
        : {}),
      ...(newMemoData.pages ? { pages: Number(newMemoData.pages) } : {}),
      ...(newMemoData.year.trim() ? { year: newMemoData.year.trim() } : {}),
      ...(newMemoData.sortOrder !== ""
        ? { sort_order: Number(newMemoData.sortOrder) }
        : {}),
      ...(newMemoData.isActive !== null
        ? { is_active: newMemoData.isActive }
        : {}),
      ...(newMemoData.pdfFile ? { pdf_file: newMemoData.pdfFile } : {}),
      ...(newMemoData.coverImage
        ? { cover_image: newMemoData.coverImage }
        : {}),
    };

    try {
      const result = editingMemo
        ? await updateMemo(editingMemo.id, payload)
        : await addMemo(payload);
      if (!result?.success) return;
      setIsAddMemoOpen(false);
      resetMemoForm();
      await fetchAdminMemos(
        selectedGrade === BRANCHES[0] ? null : getGradeIdByName(selectedGrade),
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const openEditMemo = async (memo) => {
    setIsProcessing(true);
    try {
      const details = await fetchAdminMemoDetails(memo.id);
      if (!details) return;
      setEditingMemo(details);
      setNewMemoData({
        ...createEmptyMemoForm(),
        title: details.title || "",
        grade:
          getMemoGradeName(details) ||
          GRADES.find(
            (grade) =>
              String(grade.numericId) ===
              String(details.grade_id || details.grade?.id || details.grade),
          )?.name ||
          GRADES[0].name,
        pages: details.pages || "",
        fileSize: String(details.file_size || ""),
        year: String(details.year || ""),
        sortOrder: details.sort_order ?? 0,
        isActive:
          details.is_active == null
            ? null
            : ![false, 0, "0"].includes(details.is_active),
        fileUrl: getMemoFileUrl(details),
        coverImageUrl: details.cover_image_url || "",
      });
      setIsAddMemoOpen(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmDeleteMemo = async () => {
    if (!deleteConfirmationMemo) return;
    setIsProcessing(true);
    try {
      const result = await deleteMemo(deleteConfirmationMemo.id);
      if (result?.success) setDeleteConfirmationMemo(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadMemo = async (memo) => {
    if (isTeacher) {
      const fileUrl = getMemoFileUrl(memo);
      if (!fileUrl) {
        showToast("ملف PDF غير متاح لهذه المذكرة", "error");
        return;
      }
      window.open(fileUrl, "_blank", "noopener,noreferrer");
      return;
    }

    setDownloadingMemoId(memo.id);
    try {
      const { blob, filename } = await downloadStudentMemo(memo.id);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename || `${memo.title || "مذكرة"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      showToast(error?.message || "تعذر تنزيل المذكرة من الخادم", "error");
    } finally {
      setDownloadingMemoId(null);
    }
  };

  return (
    <div
      className="container"
      style={{ paddingTop: "1.5rem", paddingBottom: "3rem" }}
    >
      {/* Header */}
      <div
        className="section-header"
        style={{ alignItems: "center", marginBottom: "1.25rem", gap: "1rem" }}
      >
        <div>
          <h1 className="section-title">
            {isTeacher ? "مذكرات العميد PDF" : `مذكرات ${studentGrade}`}
          </h1>
          <p className="section-desc">
            {isTeacher
              ? "إدارة وتحميل مذكرات الشرح ونماذج الامتحانات"
              : `المذكرات الأصلية المخصصة لـ ${student?.name || "طالب المنصة"}`}
          </p>
        </div>

        {/* Action Button for Teacher */}
        {isTeacher && (
          <button
            onClick={() => {
              resetMemoForm();
              setIsAddMemoOpen(true);
            }}
            className="btn-primary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "0.85rem",
              padding: "9px 18px",
              background: "linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)",
              boxShadow: "0 4px 14px rgba(139, 92, 246, 0.35)",
            }}
          >
            <Plus size={17} />
            <span>رفع مذكرة جديدة PDF</span>
          </button>
        )}
      </div>

      {/* Grade Lock Banner for Student */}
      {!isTeacher && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background:
              "linear-gradient(90deg, rgba(168, 85, 247, 0.15) 0%, rgba(6, 182, 212, 0.1) 100%)",
            border: "1px solid rgba(168, 85, 247, 0.25)",
            borderRadius: "var(--radius-lg, 14px)",
            padding: "12px 18px",
            marginBottom: "1.5rem",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "10px",
                background: "rgba(168, 85, 247, 0.2)",
                color: "var(--purple)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <GraduationCap size={22} />
            </div>
            <div>
              <div
                style={{
                  fontWeight: 800,
                  color: "#ffffff",
                  fontSize: "0.95rem",
                }}
              >
                مذكرات وملخصات:{" "}
                <span style={{ color: "var(--purple)" }}>{studentGrade}</span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                تحتوي على شرح تفصيلي، خرائط ذهنية، وبنك أسئلة تابلت حديثة
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.75rem",
              color: "var(--emerald)",
              background: "rgba(16, 185, 129, 0.15)",
              padding: "4px 12px",
              borderRadius: "999px",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              fontWeight: 700,
            }}
          >
            <Shield size={13} />
            <span>تحميل مباشر ومجاني</span>
          </div>
        </div>
      )}

      {/* Grade Filter for Teacher */}
      {isTeacher && (
        <div style={{ marginBottom: "1.5rem" }}>
          <GradeFilter
            value={selectedGrade}
            onChange={setSelectedGrade}
            includeAll
            showLabel={true}
          />
        </div>
      )}

      {/* Memos Grid */}
      <div
        className="memos-grid"
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fill, minmax(min(260px, 100%), 1fr))",
          gap: "1.5rem",
        }}
      >
        {isLoadingMemos ? (
          <div
            style={{
              gridColumn: "1 / -1",
              textAlign: "center",
              padding: "3rem 1rem",
              color: "var(--text-muted)",
            }}
          >
            جارٍ تحميل المذكرات...
          </div>
        ) : filteredMemos.length === 0 ? (
          <div
            style={{
              gridColumn: "1 / -1",
              textAlign: "center",
              padding: "4rem 1rem",
              background: "var(--bg-card)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <BookOpen
              size={48}
              style={{ color: "var(--text-dim)", margin: "0 auto 1rem" }}
            />
            <p
              style={{ fontWeight: 800, fontSize: "1.1rem", color: "#ffffff" }}
            >
              لا توجد مذكرات مرفوعة لهذا القسم حالياً
            </p>
            <p
              style={{
                fontSize: "0.85rem",
                color: "var(--text-muted)",
                marginTop: "6px",
              }}
            >
              {isTeacher
                ? "اضغط على زر 'رفع مذكرة جديدة PDF' لإضافة المذكرات لطلابك"
                : "سيتم رفع المذكرات الخاصة بصفك قريباً"}
            </p>
            {isTeacher && (
              <button
                onClick={() => {
                  resetMemoForm();
                  setIsAddMemoOpen(true);
                }}
                className="btn-primary"
                style={{ marginTop: "1.25rem", fontSize: "0.85rem" }}
              >
                <Plus size={16} />
                <span>رفع أول مذكرة الآن</span>
              </button>
            )}
          </div>
        ) : (
          filteredMemos.map((memo) => (
            <div
              key={memo.id}
              className="feature-card"
              style={{
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                position: "relative",
              }}
            >
              <div>
                {/* Book Cover */}
                {(memo.cover_image_url || memo.cover_image) && (
                  <div
                    style={{
                      aspectRatio: "3/4",
                      borderRadius: "var(--radius-md)",
                      overflow: "hidden",
                      background: "#090d16",
                      border: "1px solid var(--border-subtle)",
                      marginBottom: "1rem",
                    }}
                  >
                    <img
                      src={memo.cover_image_url || memo.cover_image}
                      alt={memo.title}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "8px",
                  }}
                >
                  {getMemoGradeName(memo) && (
                    <span
                      className="badge-tag"
                      style={{
                        color: "var(--purple)",
                        background: "rgba(168, 85, 247, 0.12)",
                      }}
                    >
                      {getMemoGradeName(memo)}
                    </span>
                  )}
                  {isTeacher && (
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        onClick={() => openEditMemo(memo)}
                        className="btn-secondary"
                        style={{ padding: "4px 8px" }}
                        title="تعديل المذكرة"
                        disabled={isProcessing}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmationMemo(memo)}
                        className="btn-secondary"
                        style={{
                          padding: "4px 8px",
                          color: "#fb7185",
                          borderColor: "rgba(244, 63, 94, 0.3)",
                        }}
                        title="حذف هذه المذكرة"
                        disabled={isProcessing}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>

                <h3
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 800,
                    color: "#ffffff",
                    marginBottom: "0.75rem",
                    lineHeight: "1.4",
                  }}
                >
                  {memo.title}
                </h3>

                {(memo.year || memo.pages || memo.file_size) && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "8px",
                      marginBottom: "0.75rem",
                      color: "var(--text-muted)",
                      fontSize: "0.75rem",
                    }}
                  >
                    <span>
                      {[memo.year, memo.pages && `${memo.pages} صفحة`]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    <span>{memo.file_size}</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => handleDownloadMemo(memo)}
                disabled={downloadingMemoId === memo.id}
                className="btn-primary"
                style={{
                  width: "100%",
                  fontSize: "0.8rem",
                  padding: "10px",
                  justifyContent: "center",
                }}
              >
                <Download size={15} />
                <span>
                  {downloadingMemoId === memo.id
                    ? "جارٍ التنزيل..."
                    : "تحميل المذكرة PDF"}
                </span>
              </button>
            </div>
          ))
        )}
      </div>

      {/* MODAL: ADD NEW MEMO FOR TEACHER */}
      {isAddMemoOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(3, 7, 18, 0.8)",
            backdropFilter: "blur(8px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            direction: "rtl",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isProcessing) {
              setIsAddMemoOpen(false);
              resetMemoForm();
            }
          }}
        >
          <div
            className="feature-card"
            style={{
              width: "100%",
              maxWidth: "min(500px, 96vw)",
              maxHeight: "90vh",
              overflowY: "auto",
              overflowX: "hidden",
              padding: "clamp(1rem, 4vw, 1.75rem)",
              position: "relative",
              border: "1px solid rgba(168, 85, 247, 0.3)",
              background: "linear-gradient(145deg, #111827, #080d18)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
              borderRadius: "18px",
            }}
          >
            <button
              onClick={() => {
                setIsAddMemoOpen(false);
                resetMemoForm();
              }}
              disabled={isProcessing}
              style={{
                position: "absolute",
                top: "16px",
                left: "16px",
                color: "var(--text-muted)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              <X size={20} />
            </button>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "1.25rem",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "12px",
                  background: "rgba(168, 85, 247, 0.15)",
                  color: "var(--purple)",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <FileText size={22} />
              </div>
              <div>
                <h2
                  style={{
                    fontSize: "1.2rem",
                    fontWeight: 800,
                    color: "#fff",
                    margin: 0,
                  }}
                >
                  {editingMemo ? "تعديل المذكرة" : "رفع مذكرة جديدة PDF"}
                </h2>
                <p
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text-muted)",
                    margin: "4px 0 0",
                  }}
                >
                  أدخل بيانات المذكرة، المرحلة، وعدد الصفحات لإضافتها للمكتبة
                </p>
              </div>
            </div>

            <form
              onSubmit={handleSaveMemo}
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <div>
                <label
                  className="form-label"
                  style={{
                    fontWeight: 700,
                    marginBottom: "6px",
                    display: "block",
                  }}
                >
                  عنوان المذكرة{" "}
                  <span style={{ color: "#ffffff" }} aria-hidden="true">
                    *
                  </span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: مذكرة ليلة الامتحان في الجبر والهندسة الفراغية"
                  value={newMemoData.title}
                  onChange={(e) =>
                    setNewMemoData({ ...newMemoData, title: e.target.value })
                  }
                  className="form-input"
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <label
                  className="form-label"
                  style={{
                    fontWeight: 700,
                    marginBottom: "6px",
                    display: "block",
                  }}
                >
                  المرحلة الدراسية{" "}
                  <span style={{ color: "#ffffff" }} aria-hidden="true">
                    *
                  </span>
                </label>
                <select
                  required
                  value={newMemoData.grade}
                  onChange={(e) =>
                    setNewMemoData({ ...newMemoData, grade: e.target.value })
                  }
                  className="form-input"
                  style={{ width: "100%" }}
                >
                  <option value="" disabled>
                    اختر الصف
                  </option>
                  {GRADES.map((g) => (
                    <option key={g.name} value={g.name}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div
                className="grid-2col"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                }}
              >
                <div>
                  <label
                    className="form-label"
                    style={{
                      fontWeight: 700,
                      marginBottom: "6px",
                      display: "block",
                    }}
                  >
                    عدد الصفحات
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={newMemoData.pages}
                    onChange={(e) =>
                      setNewMemoData({
                        ...newMemoData,
                        pages: e.target.value,
                      })
                    }
                    className="form-input"
                    style={{ width: "100%" }}
                  />
                </div>

                <div>
                  <label
                    className="form-label"
                    style={{
                      fontWeight: 700,
                      marginBottom: "6px",
                      display: "block",
                    }}
                  >
                    الحجم التقريبي (MB)
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: 18.5 MB"
                    value={newMemoData.fileSize}
                    onChange={(e) =>
                      setNewMemoData({
                        ...newMemoData,
                        fileSize: e.target.value,
                      })
                    }
                    className="form-input"
                    style={{ width: "100%" }}
                  />
                </div>
              </div>

              <div>
                <label
                  className="form-label"
                  style={{
                    fontWeight: 700,
                    marginBottom: "6px",
                    display: "block",
                  }}
                >
                  ملف PDF{" "}
                  <span style={{ color: "#ffffff" }} aria-hidden="true">
                    *
                  </span>
                </label>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handlePdfFileChange}
                  required={
                    !newMemoData.fileUrl.trim() && !getMemoFileUrl(editingMemo)
                  }
                  disabled={isReadingPdf || isProcessing}
                  className="form-input"
                  style={{ width: "100%" }}
                />
                {isReadingPdf && (
                  <small style={{ color: "var(--text-muted)" }}>
                    جارٍ قراءة الملف وحساب الحجم وعدد الصفحات...
                  </small>
                )}
                {getMemoFileUrl(editingMemo) && (
                  <small style={{ color: "var(--text-muted)" }}>
                    اتركه فارغًا للاحتفاظ بالملف الحالي.
                  </small>
                )}
              </div>

              <div>
                <label
                  className="form-label"
                  style={{
                    fontWeight: 700,
                    marginBottom: "6px",
                    display: "block",
                  }}
                >
                  صورة الغلاف
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const coverImage = e.target.files?.[0] || null;
                    setNewMemoData({
                      ...newMemoData,
                      coverImage,
                      ...(coverImage ? { coverImageUrl: "" } : {}),
                    });
                  }}
                  className="form-input"
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <label
                  className="form-label"
                  style={{
                    fontWeight: 700,
                    marginBottom: "6px",
                    display: "block",
                  }}
                >
                  رابط ملف PDF (بديل لرفع الملف)
                </label>
                <input
                  type="url"
                  value={newMemoData.fileUrl}
                  onChange={(e) =>
                    setNewMemoData({
                      ...newMemoData,
                      fileUrl: e.target.value,
                      ...(e.target.value ? { pdfFile: null } : {}),
                    })
                  }
                  className="form-input"
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <label
                  className="form-label"
                  style={{
                    fontWeight: 700,
                    marginBottom: "6px",
                    display: "block",
                  }}
                >
                  رابط صورة الغلاف (اختياري)
                </label>
                <input
                  type="url"
                  value={newMemoData.coverImageUrl}
                  onChange={(e) =>
                    setNewMemoData({
                      ...newMemoData,
                      coverImageUrl: e.target.value,
                      ...(e.target.value ? { coverImage: null } : {}),
                    })
                  }
                  className="form-input"
                  style={{ width: "100%" }}
                />
              </div>

              <div
                className="grid-2col"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                }}
              >
                <div>
                  <label
                    className="form-label"
                    style={{
                      fontWeight: 700,
                      marginBottom: "6px",
                      display: "block",
                    }}
                  >
                    السنة
                  </label>
                  <input
                    type="text"
                    value={newMemoData.year}
                    onChange={(e) =>
                      setNewMemoData({ ...newMemoData, year: e.target.value })
                    }
                    className="form-input"
                    style={{ width: "100%" }}
                  />
                </div>
                <div>
                  <label
                    className="form-label"
                    style={{
                      fontWeight: 700,
                      marginBottom: "6px",
                      display: "block",
                    }}
                  >
                    ترتيب العرض
                  </label>
                  <input
                    type="number"
                    value={newMemoData.sortOrder}
                    onChange={(e) =>
                      setNewMemoData({
                        ...newMemoData,
                        sortOrder: e.target.value,
                      })
                    }
                    className="form-input"
                    style={{ width: "100%" }}
                  />
                </div>
              </div>

              <label
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <input
                  type="checkbox"
                  checked={newMemoData.isActive === true}
                  onChange={(e) =>
                    setNewMemoData({
                      ...newMemoData,
                      isActive: e.target.checked,
                    })
                  }
                />
                <span>المذكرة نشطة ومتاحة</span>
              </label>

              {newMemoData.coverImage && (
                <small style={{ color: "var(--text-muted)" }}>
                  صورة الغلاف المحددة: {newMemoData.coverImage.name}
                </small>
              )}

              {newMemoData.pdfFile && (
                <small style={{ color: "var(--text-muted)" }}>
                  ملف PDF المحدد: {newMemoData.pdfFile.name}
                </small>
              )}

              <div
                style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}
              >
                <button
                  type="submit"
                  disabled={isProcessing || isReadingPdf}
                  className="btn-primary"
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    padding: "11px",
                    background:
                      "linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)",
                  }}
                >
                  {isProcessing
                    ? "جارٍ الحفظ..."
                    : editingMemo
                      ? "حفظ التعديلات"
                      : "رفع المذكرة"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddMemoOpen(false);
                    resetMemoForm();
                  }}
                  disabled={isProcessing}
                  className="btn-secondary"
                  style={{ padding: "11px 20px" }}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deleteConfirmationMemo && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(3, 7, 18, 0.8)",
            backdropFilter: "blur(6px)",
            zIndex: 1100,
            display: "grid",
            placeItems: "center",
            padding: "1rem",
            direction: "rtl",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isProcessing) {
              setDeleteConfirmationMemo(null);
            }
          }}
        >
          <div
            className="feature-card"
            style={{
              width: "min(100%, 420px)",
              padding: "1.5rem",
              borderRadius: "18px",
              border: "1px solid rgba(244, 63, 94, 0.3)",
              background: "linear-gradient(145deg, #111827, #080d18)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "1rem",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: "rgba(244, 63, 94, 0.15)",
                  color: "#fb7185",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, color: "#fff", fontSize: "1.1rem" }}>
                  تأكيد حذف المذكرة
                </h3>
                <span
                  style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}
                >
                  إزالة الملف من مكتبة المذكرات
                </span>
              </div>
            </div>

            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "0.9rem",
                lineHeight: 1.7,
                margin: "0 0 1.25rem",
              }}
            >
              هل أنت متأكد من حذف مذكرة:{" "}
              <strong style={{ color: "#fff" }}>
                [ {deleteConfirmationMemo.title} ]
              </strong>
              ؟
            </p>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={confirmDeleteMemo}
                disabled={isProcessing}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "10px",
                  border: "1px solid rgba(244, 63, 94, 0.4)",
                  background: "linear-gradient(135deg, #e11d48, #be123c)",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                نعم، حذف المذكرة
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirmationMemo(null)}
                disabled={isProcessing}
                className="btn-secondary"
                style={{ flex: 1, justifyContent: "center" }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
