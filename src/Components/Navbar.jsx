import React, { useState } from 'react';
import { User, BookOpen, GraduationCap, Phone, Menu, X, Edit3, Sparkles } from 'lucide-react';

export default function Navbar({ student = {}, onOpenStudentModal, activeTab, setActiveTab }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { id: 'home', label: 'الرئيسية' },
    { id: 'lessons', label: 'المحاضرات والدروس' },
    { id: 'exams', label: 'بنك الامتحانات' },
    { id: 'notes', label: 'مذكرات العميد' },
    { id: 'teacher', label: 'عن الأستاذ' },
  ];

  const studentName = student?.name || 'طالب متميز';
  const studentGrade =
    student?.grade ||
    student?.grade_name ||
    student?.subscription?.grade?.name ||
    '';

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#070b14]/80 border-b border-white/10 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Right Section: Brand Logo & Title */}
          <div className="flex items-center gap-3.5 cursor-pointer" onClick={() => setActiveTab('home')}>
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-2xl blur opacity-40 group-hover:opacity-80 transition duration-300"></div>
              <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-900 border border-white/20 p-1 flex items-center justify-center">
                <img 
                  src="/logo.png" 
                  alt="لوجو منصة العميد" 
                  className="w-full h-full object-cover rounded-lg"
                  onError={(e) => { e.target.src = '/favicon.svg'; }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold tracking-tight bg-gradient-to-l from-white via-slate-100 to-cyan-400 bg-clip-text text-transparent font-['Alexandria']">
                  منصة العميد
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-medium">
                  الرياضيات
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                أ / محمد عبد الخالق
              </p>
            </div>
          </div>

          {/* Center Section: Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1.5 rounded-2xl border border-white/5 shadow-inner">
            {navLinks.map((link) => {
              const isActive = activeTab === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => setActiveTab(link.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md shadow-indigo-600/30 font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
          </nav>

          {/* Left Section: Student Profile Pill (Dynamic Name & Grade) */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={onOpenStudentModal}
              title="انقر لتعديل بيانات الطالب والصف"
              className="group relative flex items-center gap-3 p-1.5 pr-4 pl-2 rounded-2xl bg-gradient-to-l from-slate-900/90 to-indigo-950/60 border border-indigo-500/30 hover:border-cyan-400/60 transition-all duration-300 shadow-lg shadow-black/40 hover:shadow-cyan-500/20 cursor-pointer"
            >
              {/* Dynamic Student Details */}
              <div className="text-right">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {studentName}
                  </span>
                  <Edit3 className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                </div>
                {studentGrade && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-[11px] font-medium text-cyan-300/90 bg-cyan-950/60 px-2 py-0.2 rounded-md border border-cyan-500/20">
                      {studentGrade}
                    </span>
                  </div>
                )}
              </div>

              {/* Student Avatar Icon */}
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white font-bold text-base shadow-md group-hover:scale-105 transition-transform">
                {studentName ? studentName.trim().charAt(0) : <User className="w-5 h-5" />}
              </div>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex sm:hidden items-center gap-2">
            <button
              onClick={onOpenStudentModal}
              className="p-2 rounded-xl bg-slate-800 border border-white/10 text-cyan-400"
              title="تعديل بيانات الطالب"
            >
              <User className="w-5 h-5" />
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-slate-800 border border-white/10 text-slate-200"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-slate-950 border-b border-white/10 px-4 py-4 space-y-3">
          {/* Mobile Student Info Display */}
          <div 
            onClick={() => { onOpenStudentModal(); setMobileMenuOpen(false); }}
            className="p-3 rounded-xl bg-indigo-950/50 border border-indigo-500/30 flex items-center justify-between cursor-pointer"
          >
            <div>
              <p className="text-xs text-slate-400">حساب الطالب الحالي:</p>
              <p className="font-bold text-white text-sm">{studentName}</p>
              <p className="text-xs text-cyan-400 mt-0.5">{studentGrade}</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-medium flex items-center gap-1">
              <Edit3 className="w-3 h-3" />
              تغيير
            </span>
          </div>

          {/* Mobile Nav Links */}
          <div className="grid grid-cols-1 gap-1">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => { setActiveTab(link.id); setMobileMenuOpen(false); }}
                className={`w-full text-right px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  activeTab === link.id
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                {link.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
