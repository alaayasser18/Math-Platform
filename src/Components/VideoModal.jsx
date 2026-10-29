import { useState } from "react";
import { X, Award, Download, CheckCircle } from "lucide-react";
import ProtectedVideoPlayer from "./ProtectedVideoPlayer";

export default function VideoModal({
  isOpen,
  onClose,
  lesson,
  onOpenQuiz,
  onDownloadPdf,
}) {
  const [activeTab, setActiveTab] = useState("overview");

  if (!isOpen || !lesson) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content w-full max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 bg-slate-900 border border-indigo-500/30 rounded-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-indigo-600/30 text-indigo-300 text-xs font-bold border border-indigo-500/30">
              الدرس {lesson.number}
            </span>
            <h3 className="text-base sm:text-lg font-bold text-white truncate max-w-lg font-['Alexandria']">
              {lesson.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player Box */}
        <div className="mb-5 shadow-2xl">
          <ProtectedVideoPlayer
            videoUrl={
              lesson.videoUrl ||
              "https://youtu.be/qJ-Op0x0yCM?si=HrcEYlkOUWW4X5m9"
            }
            title={lesson.title}
            duration={lesson.duration}
            thumbnail={lesson.videoThumbnail || "/teacher.png"}
            videoId={lesson.videoId}
          />
        </div>

        {/* Lesson Tabs */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-2 mb-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeTab === "overview"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            نظرة عامة على الدرس
          </button>

          <button
            onClick={() => setActiveTab("points")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeTab === "points"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            النقاط الأساسية والقوانين
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === "overview" && (
          <div className="space-y-3 text-right">
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {lesson.description}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    onClose();
                    onOpenQuiz(lesson);
                  }}
                  className="btn-primary text-xs sm:text-sm py-2 px-4 rounded-xl font-bold cursor-pointer flex items-center gap-1.5"
                >
                  <Award className="w-4 h-4 text-amber-300" />
                  حل امتحان تقييمي للدرس
                </button>

                <button
                  onClick={() => onDownloadPdf(lesson)}
                  className="btn-secondary text-xs sm:text-sm py-2 px-4 rounded-xl font-medium cursor-pointer flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4 text-cyan-400" />
                  تحميل مذكرة الدرس PDF
                </button>
              </div>

              <span className="text-xs text-slate-400">
                الصف: <strong className="text-cyan-400">{lesson.grade}</strong>{" "}
                | الفرع:{" "}
                <strong className="text-indigo-300">{lesson.branch}</strong>
              </span>
            </div>
          </div>
        )}

        {activeTab === "points" && (
          <div className="space-y-2 text-right">
            <h4 className="text-xs font-bold text-slate-200 mb-2">
              أهم النقاط التي تم شرحها في هذا الدرس:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {lesson.keyPoints?.map((pt, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-800/60 border border-white/5 flex items-start gap-2 text-xs text-slate-300"
                >
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{pt}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
