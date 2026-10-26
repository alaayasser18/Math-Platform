import { TEACHER_INFO } from "../data/platformData";
import { MessageCircle } from "lucide-react";

export default function Footer() {
  return (
    <footer className="footer-compact">
      <div className="container footer-compact-inner">
        {/* Brand & Teacher */}
        <div className="footer-compact-brand">
          <div className="brand-logo-box footer-logo-box">
            <img
              src="/logo.png"
              alt="شعار العميد"
              className="brand-logo-img"
              onError={(e) => {
                e.target.src = "/favicon.svg";
              }}
            />
          </div>
          <div className="footer-brand-text">
            <span className="footer-brand-title">منصة العميد في الرياضيات</span>
            <span className="footer-brand-dot">•</span>
            <span className="footer-brand-teacher">أ / محمد عبد الخالق</span>
          </div>
        </div>

        {/* WhatsApp Quick Action */}
        <div className="footer-compact-actions">
          <a
            href={`https://wa.me/${TEACHER_INFO.contacts.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`تواصل واتساب على +${TEACHER_INFO.contacts.whatsapp}`}
            className="footer-whatsapp-pill"
          >
            <MessageCircle size={15} />
            <span dir="ltr">+{TEACHER_INFO.contacts.whatsapp}</span>
            <span className="footer-wa-label">واتساب</span>
          </a>

          {/* Copyright */}
          <div className="footer-compact-copy">
            © {new Date().getFullYear()} جميع الحقوق محفوظة
          </div>
        </div>
      </div>
    </footer>
  );
}
