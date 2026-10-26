import { BookOpen, Download, CheckCircle2 } from 'lucide-react';
import { useStudent } from '../context/useStudent';

export default function NotesSection({ onDownloadPdf }) {
  const { memosList } = useStudent();
  const memos = Array.isArray(memosList) ? memosList : [];

  return (
    <section id="notes-section" className="py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold mb-3">
            <BookOpen className="w-4 h-4 text-purple-400" />
            <span>السلسلة التعليمية الأشهر في مصر</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white font-['Alexandria']">
            سلسلة مذكرات <span className="bg-gradient-to-l from-cyan-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">العميد في الرياضيات</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            إعداد مستر / محمد عبد الخالق - متوفرة للتحميل بصيغة PDF مجاناً لجميع طلاب المنصة
          </p>
        </div>

        {/* Memos Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {memos.map((memo) => (
            <div
              key={memo.id}
              className="glass-panel p-5 bg-slate-900/80 border border-white/10 rounded-2xl flex flex-col justify-between group hover:border-purple-500/50 hover:shadow-2xl hover:shadow-purple-950/40 transition-all duration-300 hover:-translate-y-1.5"
            >
              <div>
                {/* Book Cover Image */}
                <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-4 bg-slate-950 border border-white/10 group-hover:border-purple-500/40 transition-colors">
                  <img
                    src={memo.cover_image_url || memo.cover_image || ''}
                    alt={memo.title}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md border border-white/10 text-[10px] font-bold text-cyan-300">
                    {memo.year}
                  </div>
                  <div className="absolute bottom-2 left-2 right-2 px-2.5 py-1.5 rounded-lg bg-slate-950/90 backdrop-blur-md border border-white/10 flex items-center justify-between text-[11px] text-slate-300">
                    <span>{memo.pages} صفحة</span>
                    <span className="text-purple-300 font-bold">{memo.file_size || '—'}</span>
                  </div>
                </div>

                {/* Grade Badge */}
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 inline-block mb-2">
                  {memo.grade?.name || memo.grade_name || memo.grade || '—'}
                </span>

                {/* Title */}
                <h3 className="text-sm font-bold text-white mb-3 group-hover:text-cyan-300 transition-colors font-['Alexandria'] line-clamp-2">
                  {memo.title}
                </h3>

                {/* Features List */}
                <ul className="space-y-1.5 mb-5 text-right">
                  {(Array.isArray(memo.features) ? memo.features : []).map((feat, idx) => (
                    <li key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Download Button */}
              <button
                onClick={() => onDownloadPdf?.(memo)}
                className="w-full btn-primary py-2.5 text-xs rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer group-hover:bg-gradient-to-r group-hover:from-purple-600 group-hover:to-cyan-600"
              >
                <Download className="w-4 h-4 text-cyan-300" />
                تحميل المذكرة PDF
              </button>

            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
