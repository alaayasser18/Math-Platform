import { useState, useMemo } from "react";
import {
  PlayCircle,
  FileText,
  Filter,
  Search,
  Award,
  BookOpen,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useStudent } from "../context/useStudent";
import { GRADES, BRANCHES } from "../data/platformData";

export default function LessonSection({
  student: propStudent,
  onWatchLesson,
  onTakeQuiz,
  onDownloadPdf,
}) {
  const navigate = useNavigate();
  const { student: ctxStudent, lessonsList, showToast } = useStudent();
  const student = propStudent || ctxStudent || {};
  const studentName = student?.name || "طالب متميز";
  const studentGrade = student?.grade || "";

  // Start with the student's grade as the default selected filter
  const [selectedGrade, setSelectedGrade] = useState(student?.grade || "الكل");
  const [selectedBranch, setSelectedBranch] = useState("الكل");
  const [searchQuery, setSearchQuery] = useState("");

  const gradeOptions = ["الكل", ...GRADES.map((g) => g.name)];
  const allLessons = useMemo(
    () => (Array.isArray(lessonsList) ? lessonsList : []),
    [lessonsList],
  );

  const filteredLessons = useMemo(() => {
    return allLessons.filter((lesson) => {
      const matchGrade =
        selectedGrade === "الكل" || lesson.grade === selectedGrade;

      const matchBranch =
        selectedBranch === "الكل" || lesson.branch === selectedBranch;

      const matchSearch =
        lesson.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lesson.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lesson.branch?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchGrade && matchBranch && matchSearch;
    });
  }, [allLessons, selectedGrade, selectedBranch, searchQuery]);

  const handleWatch = (lesson) => {
    if (typeof onWatchLesson === "function") {
      onWatchLesson(lesson);
    } else {
      navigate(`/watch/${lesson.id}`);
    }
  };

  const handleQuiz = (lesson) => {
    if (typeof onTakeQuiz === "function") {
      onTakeQuiz(lesson);
    } else {
      navigate(`/quiz/${lesson.id}`);
    }
  };

  const handleDownload = (lesson) => {
    if (typeof onDownloadPdf === "function") {
      onDownloadPdf(lesson);
    } else {
      showToast?.(`تم بدء تحميل مذكرة: ${lesson.pdfFile || lesson.title} 📥`);
    }
  };

  return (
    <section id="lessons-section" className="py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-4 border-b border-white/10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-2">
              <BookOpen className="w-3.5 h-3.5" />
              <span>المحتوى التعليمي والمحاضرات</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-['Alexandria']">
              الدروس والشروحات التفاعلية
            </h2>

            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              دروس مخصصة لـ{" "}
              <span className="text-cyan-400 font-semibold">{studentName}</span>{" "}
              ({studentGrade})
            </p>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />

            <input
              type="text"
              placeholder="ابحث عن درس أو موضوع..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-cyan-400 transition-colors"
            />
          </div>
        </div>

        {/* Grade Filters Tabs */}
        <div className="mb-5 overflow-x-auto pb-2 scrollbar-none">
          <div className="flex items-center gap-2 min-w-max">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 ml-2">
              <Filter className="w-3.5 h-3.5 text-cyan-400" />
              الصف:
            </span>

            {gradeOptions.map((grade) => {
              const isActive = selectedGrade === grade;
              const isStudentGrade = grade === studentGrade;

              return (
                <button
                  key={grade}
                  onClick={() => setSelectedGrade(grade)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? "bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md shadow-indigo-600/30"
                      : "bg-slate-900/80 text-slate-300 border border-white/5 hover:border-white/20"
                  }`}
                >
                  <span>{grade}</span>

                  {isStudentGrade && (
                    <span className="text-[10px] bg-cyan-400/20 text-cyan-300 px-1.5 py-0.2 rounded-md">
                      صفك
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Subject Branch Filters */}
        <div className="mb-6 overflow-x-auto pb-2 scrollbar-none">
          <div className="flex items-center gap-1.5 min-w-max">
            <span className="text-xs font-semibold text-slate-400 ml-2">
              الفرع:
            </span>

            {BRANCHES.map((branch) => {
              const isActive = selectedBranch === branch;

              return (
                <button
                  key={branch}
                  onClick={() => setSelectedBranch(branch)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    isActive
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  }`}
                >
                  {branch}
                </button>
              );
            })}
          </div>
        </div>

        {/* Lessons List Container */}
        <div className="space-y-3.5">
          {filteredLessons.length === 0 ? (
            <div className="py-16 text-center rounded-2xl bg-slate-900/40 border border-white/5">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 mx-auto mb-3">
                <Search className="w-6 h-6" />
              </div>

              <p className="text-white font-bold text-base">
                لا توجد دروس تطابق هذا البحث
              </p>

              <p className="text-xs text-slate-400 mt-1">
                جرب تغيير الصف الدراسي أو تفريغ خانة البحث
              </p>

              <button
                onClick={() => {
                  setSelectedGrade("الكل");
                  setSelectedBranch("الكل");
                  setSearchQuery("");
                }}
                className="mt-4 px-4 py-2 rounded-xl bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold hover:bg-indigo-600/50 transition-colors"
              >
                عرض كل الدروس
              </button>
            </div>
          ) : (
            filteredLessons.map((lesson) => (
              <div
                key={lesson.id}
                className="group relative rounded-2xl bg-slate-900/70 border border-white/10 hover:border-indigo-500/50 p-4 sm:p-5 transition-all duration-200 hover:shadow-xl hover:shadow-indigo-950/40 hover:-translate-y-0.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Right Side: Number & Info */}
                  <div className="flex items-start sm:items-center gap-3.5">
                    {/* Lesson Number Badge */}
                    <div className="w-11 h-11 rounded-xl bg-indigo-950/70 border border-indigo-500/30 text-cyan-400 flex items-center justify-center font-bold text-base shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors font-['Cairo']">
                      {lesson.number}
                    </div>

                    {/* Lesson Details */}
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-cyan-300 transition-colors font-['Alexandria']">
                          {lesson.title}
                        </h3>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        <span className="text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-500/20 font-medium">
                          {lesson.branch}
                        </span>

                        <span className="text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded-md border border-cyan-500/20">
                          {lesson.grade}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Left Side: Interactive Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                    {/* Watch Button */}
                    <button
                      onClick={() => handleWatch(lesson)}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/30 hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      <PlayCircle className="w-4 h-4" />
                      <span>مشاهدة الشرح</span>
                    </button>

                    {/* Quiz Button */}
                    <button
                      onClick={() => handleQuiz(lesson)}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/20 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="اختبار تقييمي للدرس"
                    >
                      <Award className="w-4 h-4 text-amber-400" />
                      <span className="hidden md:inline">امتحان الدرس</span>
                    </button>

                    {/* PDF Download Button */}
                    <button
                      onClick={() => handleDownload(lesson)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 hover:text-cyan-300 transition-colors cursor-pointer"
                      title="تحميل مذكرة الدرس PDF"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
