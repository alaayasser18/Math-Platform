import { useState } from "react";
import { AlertCircle, BookOpenCheck, Eye, EyeOff, LoaderCircle, ShieldCheck, UserRound } from "lucide-react";
import { useStudent } from "../context/useStudent";
import { GRADES } from "../data/platformData";

export default function AuthPage({ role }) {
  const isTeacher = role === "teacher";
  const { studentLoginWithCode, adminLoginWithCredentials, submitActivationRequest } = useStudent();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [activationMode, setActivationMode] = useState(false);
  const [success, setSuccess] = useState(false);
  const [code, setCode] = useState("");
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [activation, setActivation] = useState({ firstName: "", lastName: "", phone: "", parentPhone: "", gradeId: GRADES[0]?.numericId || 6 });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const result = activationMode
        ? await submitActivationRequest(activation)
        : isTeacher
          ? await adminLoginWithCredentials({ email: credentials.email.trim(), password: credentials.password })
          : await studentLoginWithCode(code.trim());
      if (!result?.success) setError(result?.message || result?.error || "تعذر إتمام الطلب. يرجى المحاولة مرة أخرى.");
      else if (activationMode) setSuccess(true);
    } catch (requestError) {
      setError(requestError?.message || "تعذر الاتصال بالخادم. تحقق من اتصالك وحاول مرة أخرى.");
    } finally {
      setIsLoading(false);
    }
  };

  const updateActivation = (field) => (event) => setActivation((current) => ({ ...current, [field]: event.target.value }));

  return <main className="auth-page" dir="rtl">
    <section className="auth-card" aria-labelledby="auth-title">
      <div className="auth-brand-mark" aria-hidden="true"><BookOpenCheck size={25} /></div>
      <p className="auth-eyebrow">منصة تعليم الرياضيات</p>
      <h1 id="auth-title">{success ? "تم استلام طلبك" : activationMode ? "طلب تفعيل حساب طالب" : isTeacher ? "دخول المعلم" : "دخول الطالب"}</h1>
      <p className="auth-description">{success ? "أُرسل طلب التفعيل إلى الإدارة للمراجعة. ستتمكن من الدخول بعد اعتماد حسابك." : activationMode ? "أدخل بياناتك الدراسية لإرسال طلب تفعيل إلى إدارة المنصة." : isTeacher ? "سجّل الدخول إلى لوحة إدارة المنصة ومتابعة الطلاب." : "أدخل كود الاشتراك المعتمد للوصول إلى دروسك وامتحاناتك."}</p>

      {!success && error && <div className="auth-alert" role="alert"><AlertCircle size={18} /><span>{error}</span></div>}

      {success ? <div className="auth-success" role="status">تم إرسال طلب التفعيل بنجاح. يمكنك العودة لتسجيل الدخول بعد اعتماد الحساب.</div> : <form className="auth-form" onSubmit={handleSubmit}>
        {activationMode ? <>
          <div className="auth-field-row">
            <label className="auth-field"><span>الاسم الأول</span><input required autoComplete="given-name" value={activation.firstName} onChange={updateActivation("firstName")} /></label>
            <label className="auth-field"><span>اسم العائلة</span><input required autoComplete="family-name" value={activation.lastName} onChange={updateActivation("lastName")} /></label>
          </div>
          <label className="auth-field"><span>الصف الدراسي</span><select required value={activation.gradeId} onChange={(event) => setActivation((current) => ({ ...current, gradeId: Number(event.target.value) }))}>{GRADES.map((grade) => <option key={grade.id} value={grade.numericId}>{grade.name}</option>)}</select></label>
          <div className="auth-field-row">
            <label className="auth-field"><span>هاتف الطالب</span><input required type="tel" inputMode="tel" dir="ltr" autoComplete="tel" placeholder="010XXXXXXXX" value={activation.phone} onChange={updateActivation("phone")} /></label>
            <label className="auth-field"><span>هاتف ولي الأمر</span><input required type="tel" inputMode="tel" dir="ltr" placeholder="011XXXXXXXX" value={activation.parentPhone} onChange={updateActivation("parentPhone")} /></label>
          </div>
        </> : isTeacher ? <>
          <label className="auth-field"><span>البريد الإلكتروني</span><input required type="email" dir="ltr" autoComplete="username" value={credentials.email} onChange={(event) => setCredentials((current) => ({ ...current, email: event.target.value }))} placeholder="name@example.com" /></label>
          <label className="auth-field"><span>كلمة المرور</span><span className="auth-password-wrap"><input required type={showPassword ? "text" : "password"} dir="ltr" autoComplete="current-password" value={credentials.password} onChange={(event) => setCredentials((current) => ({ ...current, password: event.target.value }))} /><button className="auth-password-toggle" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} aria-pressed={showPassword}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button></span></label>
        </> : <label className="auth-field"><span>كود الاشتراك</span><input required dir="ltr" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="أدخل كود الاشتراك" /></label>}
        <button className="auth-submit" type="submit" disabled={isLoading}>
          {isLoading ? <><LoaderCircle className="auth-spinner" size={19} /> جارٍ {activationMode ? "إرسال الطلب" : "التحقق من البيانات"}...</> : <>{isTeacher ? <ShieldCheck size={19} /> : <UserRound size={19} />}{activationMode ? "إرسال طلب التفعيل" : "تسجيل الدخول"}</>}
        </button>
      </form>}

      {!isTeacher && !success && <div className="auth-links">
        <button type="button" className="auth-text-button" onClick={() => { setActivationMode((value) => !value); setError(""); }}>{activationMode ? "لديك كود اشتراك؟ تسجيل دخول الطالب" : "طالب جديد؟ أرسل طلب تفعيل حساب"}</button>
      </div>}
      <div className="auth-security-note"><ShieldCheck size={15} /> يتم التحقق من صلاحية الحساب عبر خادم المنصة</div>
    </section>
  </main>;
}
