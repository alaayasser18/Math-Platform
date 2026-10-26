import { PlayCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { TEACHER_INFO } from '../data/platformData';

export default function HeroSection({ student = {}, onExploreLessons }) {
  const studentName = student?.name || 'طالب متميز';
  const studentGrade = student?.grade || 'الصف الثالث الثانوي';

  return (
    <section className="relative pt-6 pb-12 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Hero Card (Matches Figma Design) */}
        <div className="relative rounded-3xl bg-gradient-to-l from-[#0e1628]/95 via-[#111c34]/90 to-[#0c1322]/95 border border-indigo-500/20 shadow-2xl shadow-indigo-950/50 p-6 sm:p-10 overflow-hidden">
          
          {/* Neon Glow Border Strip on Right/Left Edge */}
          <div className="absolute top-0 right-0 bottom-0 w-2.5 bg-gradient-to-b from-cyan-400 via-indigo-500 to-purple-600 shadow-[0_0_20px_rgba(6,182,212,0.8)]"></div>
          
          {/* Subtle Ambient Background Light */}
          <div className="absolute -top-24 -left-24 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 right-1/3 w-80 h-80 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none"></div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            
            {/* Content Column (Arabic Right / 7 cols) */}
            <div className="lg:col-span-7 space-y-5 text-right">
              
              {/* Dynamic Welcome Pill tailored to Registered Student */}
              <div className="inline-flex flex-wrap items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-2xl sm:rounded-full bg-cyan-950/60 border border-cyan-400/30 text-cyan-300 text-xs font-semibold shadow-inner max-w-full">
                <Sparkles className="w-4 h-4 text-cyan-400 animate-spin shrink-0" style={{ animationDuration: '6s' }} />
                <span className="break-words">أهلاً بك يا <strong className="text-white underline decoration-cyan-400">{studentName}</strong> في منصة الرياضيات</span>
                <span className="text-[11px] bg-cyan-500/20 text-cyan-200 px-2 py-0.5 rounded-full border border-cyan-400/30 shrink-0">
                  {studentGrade}
                </span>
              </div>

              {/* Main Teacher Headline */}
              <div>
                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white font-['Alexandria'] leading-tight">
                  مستر / <span className="bg-gradient-to-l from-cyan-400 via-indigo-300 to-white bg-clip-text text-transparent">محمد عبد الخالق</span>
                </h1>
                <p className="text-sm sm:text-lg font-semibold text-indigo-300 mt-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block"></span>
                  {TEACHER_INFO.title}
                </p>
              </div>

              {/* Subtitle / Description */}
              <p className="text-xs sm:text-base text-slate-300 leading-relaxed max-w-2xl font-light">
                {TEACHER_INFO.quote}
              </p>

              {/* 3 Figma Stat Badges with Glowing Counters */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-3 pt-2 max-w-xl">
                <div className="p-2 sm:p-3.5 rounded-xl sm:rounded-2xl bg-slate-900/80 border border-white/10 text-center hover:border-cyan-500/40 transition-all">
                  <div className="text-base sm:text-2xl font-black text-cyan-400 font-['Cairo']">
                    +2500
                  </div>
                  <div className="text-[10px] sm:text-xs text-slate-400 font-medium mt-0.5">
                    طالب متفوق
                  </div>
                </div>

                <div className="p-2 sm:p-3.5 rounded-xl sm:rounded-2xl bg-slate-900/80 border border-white/10 text-center hover:border-indigo-500/40 transition-all">
                  <div className="text-base sm:text-2xl font-black text-indigo-400 font-['Cairo']">
                    +120
                  </div>
                  <div className="text-[10px] sm:text-xs text-slate-400 font-medium mt-0.5">
                    محاضرة تفاعلية
                  </div>
                </div>

                <div className="p-2 sm:p-3.5 rounded-xl sm:rounded-2xl bg-slate-900/80 border border-white/10 text-center hover:border-purple-500/40 transition-all">
                  <div className="text-base sm:text-2xl font-black text-purple-400 font-['Cairo']">
                    99%
                  </div>
                  <div className="text-[10px] sm:text-xs text-slate-400 font-medium mt-0.5">
                    نسبة النجاح
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-3">
                <button
                  onClick={onExploreLessons}
                  className="btn-primary text-sm sm:text-base py-3 px-6 rounded-xl font-bold cursor-pointer"
                >
                  <PlayCircle className="w-5 h-5" />
                  ابدأ استعراض الدروس
                </button>
              </div>

            </div>

            {/* Teacher Image Portrait Column (Arabic Left / 5 cols) */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <div className="relative group max-w-sm sm:max-w-md w-full">
                
                {/* Glowing Aura behind the image */}
                <div className="absolute -inset-2 bg-gradient-to-tr from-cyan-500/30 via-indigo-600/30 to-purple-600/30 rounded-3xl blur-xl group-hover:blur-2xl transition duration-500 opacity-80"></div>
                
                {/* Image Frame Container */}
                <div className="relative rounded-3xl overflow-hidden border-2 border-indigo-500/30 bg-slate-950 shadow-2xl">
                  <img
                    src="/teacher.png"
                    alt="مستر محمد عبد الخالق"
                    className="w-full h-auto max-h-[380px] object-cover object-top transform group-hover:scale-102 transition duration-500"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  
                  {/* Floating Tag over image */}
                  <div className="absolute bottom-3 right-3 left-3 p-3 rounded-2xl bg-slate-950/85 backdrop-blur-md border border-white/10 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white font-['Alexandria']">أ / محمد عبد الخالق</h4>
                      <p className="text-[10px] text-cyan-400 font-medium">سلسلة مذكرات العميد في الرياضيات</p>
                    </div>
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-1 rounded-lg border border-emerald-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      معتمد
                    </span>
                  </div>
                </div>

              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
