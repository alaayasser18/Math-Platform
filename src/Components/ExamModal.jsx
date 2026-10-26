import { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Timer, RotateCcw, ArrowRight, ArrowLeft, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function ExamModal({ isOpen, onClose, lesson, student }) {
  if (!isOpen || !lesson || !lesson.quiz) return null;

  return <QuizModalContent key={`${lesson.id}`} onClose={onClose} lesson={lesson} student={student} />;
}

function QuizModalContent({ onClose, lesson, student }) {
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState((lesson?.quiz?.durationMinutes || 10) * 60);

  const questions = lesson?.quiz?.questions || [];
  const totalQuestions = questions.length;

  useEffect(() => {
    if (isSubmitted || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsSubmitted(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isSubmitted, timeLeft]);

  const currentQ = questions[currentQuestionIdx];

  const handleSelectOption = (optIdx) => {
    if (isSubmitted) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQuestionIdx]: optIdx,
    }));
  };

  const calculateScore = () => {
    let score = 0;
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctIndex) {
        score++;
      }
    });
    return score;
  };

  const handleSubmit = () => {
    setIsSubmitted(true);
    const score = calculateScore();
    const percentage = Math.round((score / totalQuestions) * 100);

    if (percentage >= 50) {
      // Trigger confetti celebration
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (err) {
        console.error(err);
      }
    }
  };

  const formatTime = (sec) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const score = calculateScore();
  const percentage = Math.round((score / (totalQuestions || 1)) * 100);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content w-full max-w-2xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 md:p-8 bg-slate-900 border border-indigo-500/30 rounded-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
          <div>
            <span className="text-xs font-semibold text-cyan-400 bg-cyan-950/60 px-2.5 py-0.5 rounded-full border border-cyan-500/20">
              {lesson.quiz.title}
            </span>
            <h3 className="text-base sm:text-lg font-bold text-white mt-1 font-['Alexandria']">
              اختبار: {lesson.title}
            </h3>
          </div>

          <div className="flex items-center gap-3">
            {!isSubmitted && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-white/10 text-xs font-bold text-amber-300">
                <Timer className="w-4 h-4 text-amber-400" />
                <span>{formatTime(timeLeft)}</span>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {isSubmitted ? (
          /* Results View */
          <div className="text-center py-6 space-y-6">
            <div className="relative inline-block">
              <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mx-auto shadow-2xl ${
                percentage >= 80 ? 'bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-emerald-500/30' :
                percentage >= 50 ? 'bg-gradient-to-tr from-indigo-500 to-cyan-600 text-white shadow-indigo-500/30' :
                'bg-gradient-to-tr from-rose-500 to-orange-600 text-white shadow-rose-500/30'
              }`}>
                {percentage >= 50 ? <Trophy className="w-12 h-12" /> : <AlertCircle className="w-12 h-12" />}
              </div>
            </div>

            <div>
              <h4 className="text-2xl font-extrabold text-white">
                {percentage >= 80 ? `ممتاز وتفوق رائع يا ${student.name}! 🌟` :
                 percentage >= 50 ? `أحسنت يا ${student.name}، بداية جيدة! 👍` :
                 `تحتاج لمراجعة الشرح مرة أخرى يا ${student.name} 💪`}
              </h4>
              <p className="text-sm text-slate-300 mt-1">
                حصلت على <strong className="text-cyan-400 text-lg">{score}</strong> من إجمالي <strong className="text-white text-lg">{totalQuestions}</strong> أسئلة ({percentage}%)
              </p>
            </div>

            {/* Answer Explanations Review */}
            <div className="text-right space-y-3 max-h-60 overflow-y-auto p-3 rounded-2xl bg-slate-950/60 border border-white/5">
              <h5 className="text-xs font-bold text-slate-300 mb-2">مراجعة الإجابات ونموذج الحل التفصيلي:</h5>
              {questions.map((q, idx) => {
                const userAns = selectedAnswers[idx];
                const isCorrect = userAns === q.correctIndex;
                return (
                  <div key={q.id} className="p-3 rounded-xl bg-slate-900 border border-white/5 space-y-1 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-white">{idx + 1}. {q.question}</p>
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] shrink-0 ${
                        isCorrect ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {isCorrect ? 'صحيحة' : 'خاطئة'}
                      </span>
                    </div>
                    <p className="text-slate-400">
                      إجابتك: <strong className={isCorrect ? 'text-emerald-400' : 'text-rose-400'}>
                        {userAns !== undefined ? q.options[userAns] : 'لم تجب'}
                      </strong> | الإجابة الصحيحة: <strong className="text-emerald-400">{q.options[q.correctIndex]}</strong>
                    </p>
                    {q.explanation && (
                      <p className="text-[11px] text-indigo-300 bg-indigo-950/40 p-2 rounded-lg border border-indigo-500/20 mt-1">
                        💡 التوضيح: {q.explanation}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Restart or Close */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  setSelectedAnswers({});
                  setIsSubmitted(false);
                  setCurrentQuestionIdx(0);
                  setTimeLeft((lesson?.quiz?.durationMinutes || 10) * 60);
                }}
                className="btn-secondary text-xs sm:text-sm py-2.5 px-5 rounded-xl cursor-pointer flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                إعادة الامتحان
              </button>
              <button
                onClick={onClose}
                className="btn-primary text-xs sm:text-sm py-2.5 px-6 rounded-xl font-bold cursor-pointer"
              >
                إغلاق
              </button>
            </div>

          </div>
        ) : (
          /* Active Exam View */
          <div className="space-y-6">
            
            {/* Progress Bar & Indicators */}
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>السؤال <strong className="text-white">{currentQuestionIdx + 1}</strong> من <strong className="text-white">{totalQuestions}</strong></span>
                <span>المتبقي: {totalQuestions - Object.keys(selectedAnswers).length} أسئلة</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-300"
                  style={{ width: `${((currentQuestionIdx + 1) / totalQuestions) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Question Text Box */}
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-white/10 text-right">
              <span className="text-[11px] font-bold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-500/20 mb-2 inline-block">
                مسألة رياضيات #{currentQuestionIdx + 1}
              </span>
              <h4 className="text-base sm:text-lg font-bold text-white leading-relaxed mt-1 font-['Alexandria']">
                {currentQ?.question}
              </h4>
            </div>

            {/* Options List */}
            <div className="space-y-2.5">
              {currentQ?.options?.map((opt, optIdx) => {
                const isSelected = selectedAnswers[currentQuestionIdx] === optIdx;
                const optionLetters = ['أ', 'ب', 'جـ', 'د'];
                return (
                  <button
                    key={optIdx}
                    onClick={() => handleSelectOption(optIdx)}
                    className={`w-full p-4 rounded-xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-l from-indigo-950 to-slate-900 border-cyan-400 text-white shadow-lg shadow-cyan-500/10'
                        : 'bg-slate-800/40 border-white/10 text-slate-300 hover:bg-slate-800/80 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isSelected ? 'bg-cyan-500 text-slate-950' : 'bg-slate-700 text-slate-300'
                      }`}>
                        {optionLetters[optIdx] || optIdx + 1}
                      </span>
                      <span className="text-sm font-semibold">{opt}</span>
                    </div>
                    {isSelected && <CheckCircle className="w-5 h-5 text-cyan-400" />}
                  </button>
                );
              })}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <button
                disabled={currentQuestionIdx === 0}
                onClick={() => setCurrentQuestionIdx((p) => Math.max(0, p - 1))}
                className="btn-secondary text-xs py-2 px-4 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
              >
                <ArrowRight className="w-4 h-4" />
                السابق
              </button>

              {currentQuestionIdx < totalQuestions - 1 ? (
                <button
                  onClick={() => setCurrentQuestionIdx((p) => Math.min(totalQuestions - 1, p + 1))}
                  className="btn-primary text-xs py-2 px-5 rounded-xl font-bold cursor-pointer flex items-center gap-1"
                >
                  <span>التالي</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  className="btn-primary text-xs py-2 px-6 rounded-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-500/30 cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  تسليم الامتحان وإنهاء
                </button>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
