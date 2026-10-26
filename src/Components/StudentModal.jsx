import { useState } from 'react';
import { X, Check, User, GraduationCap, Phone, MapPin, Sparkles } from 'lucide-react';
import { GRADES } from '../data/platformData';

export default function StudentModal({ isOpen, onClose, student, onSaveStudent }) {
  const [formData, setFormData] = useState({
    name: student.name || '',
    grade: student.grade || GRADES[0].name,
    gradeId: student.gradeId || GRADES[0].id,
    phone: student.phone || '',
    parentPhone: student.parentPhone || '',
    governorate: student.governorate || 'القاهرة',
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleGradeSelect = (gradeObj) => {
    setFormData((prev) => ({
      ...prev,
      grade: gradeObj.name,
      gradeId: gradeObj.id,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    onSaveStudent(formData);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 900);
  };

  const governorates = [
    'القاهرة', 'الجيزة', 'الإسكندرية', 'الدقهلية', 'الشرقية', 'القليوبية', 
    'كفر الشيخ', 'الغربية', 'المنوفية', 'البحيرة', 'الإسماعيلية', 'بورسعيد', 
    'السويس', 'بني سويف', 'الفيوم', 'المنيا', 'أسيوط', 'سوهاج', 'قنا', 'الأقصر', 'أسوان'
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content w-full max-w-lg max-h-[92vh] overflow-y-auto p-4 sm:p-6 md:p-8 relative bg-slate-900 border border-indigo-500/30 rounded-2xl sm:rounded-3xl" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-lg shadow-indigo-600/30 mb-3">
            <GraduationCap className="w-7 h-7" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-white">
            تسجيل وتعديل بيانات الطالب
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            سيتم تحديث الاسم والصف في التوب بار والمحتوى التعليمي فوراً
          </p>
        </div>

        {savedSuccess ? (
          <div className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4 animate-bounce">
              <Check className="w-8 h-8" />
            </div>
            <h4 className="text-xl font-bold text-white mb-2">تم حفظ البيانات بنجاح! 🎉</h4>
            <p className="text-sm text-slate-400">أهلاً بك يا بطل الرياضيات {formData.name}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Student Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <User className="w-4 h-4 text-cyan-400" />
                اسم الطالب الكامل <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="اكتب اسمك ثلاثي أو رباعي..."
                className="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors text-sm"
              />
            </div>

            {/* Grade Selection Cards */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-indigo-400" />
                الصف الدراسي <span className="text-rose-400">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {GRADES.map((g) => {
                  const isSelected = formData.grade === g.name;
                  return (
                    <button
                      type="button"
                      key={g.id}
                      onClick={() => handleGradeSelect(g)}
                      className={`p-3 rounded-xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-r from-indigo-950 to-slate-900 border-cyan-400 text-white shadow-md shadow-cyan-500/10'
                          : 'bg-slate-800/40 border-white/5 text-slate-300 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{g.icon}</span>
                        <span className="text-xs font-semibold">{g.name}</span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-cyan-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Phone Numbers Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-cyan-400" />
                  رقم هاتف الطالب (واتساب)
                </label>
                <input
                  type="tel"
                  dir="ltr"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="010XXXXXXXX"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-indigo-400" />
                  رقم ولي الأمر
                </label>
                <input
                  type="tel"
                  dir="ltr"
                  value={formData.parentPhone}
                  onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                  placeholder="011XXXXXXXX"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 text-sm"
                />
              </div>
            </div>

            {/* Governorate Selection */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                المحافظة
              </label>
              <select
                value={formData.governorate}
                onChange={(e) => setFormData({ ...formData, governorate: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-white/10 text-white focus:outline-none focus:border-cyan-400 text-sm"
              >
                {governorates.map((gov) => (
                  <option key={gov} value={gov} className="bg-slate-900 text-white">
                    {gov}
                  </option>
                ))}
              </select>
            </div>

            {/* Submit Button */}
            <div className="pt-3">
              <button
                type="submit"
                className="w-full btn-primary py-3 text-base rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-5 h-5 text-cyan-300" />
                حفظ وتحديث البيانات فوراً
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
}
