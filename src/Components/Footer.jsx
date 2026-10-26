import { Link } from "react-router-dom";
import { TEACHER_INFO } from "../data/platformData";
import { Heart, MessageCircle } from "lucide-react";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div
          className="footer-grid"
          style={{
            display: "grid",
            gap: "2rem",
            paddingBottom: "2rem",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          {/* Col 1 */}
          <div className="footer-brand-col">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "0.85rem",
              }}
            >
              <div
                className="brand-logo-box"
                style={{ width: "40px", height: "40px" }}
              >
                <img src="/logo.png" alt="العميد" className="brand-logo-img" />
              </div>
              <div>
                <div
                  style={{ fontSize: "1rem", fontWeight: 800, color: "#fff" }}
                >
                  منصة العميد في الرياضيات
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--cyan)" }}>
                  أ / محمد عبد الخالق
                </div>
              </div>
            </div>
            <p
              style={{
                fontSize: "0.8rem",
                color: "var(--text-muted)",
                lineHeight: "1.7",
                maxWidth: "480px",
              }}
            >
              المنصة التعليمية المتخصصة في تدريس الرياضيات لجميع المراحل
              الثانوية والإعدادية، شروحات فيديو تفاعلية، امتحانات إلكترونية
              دورية وسلسلة مذكرات العميد الشاملة.
            </p>
          </div>

          {/* Col 2 */}
          <div>
            <h4
              style={{
                fontSize: "0.9rem",
                fontWeight: 800,
                color: "#ffffff",
                marginBottom: "0.75rem",
              }}
            >
              روابط سريعة
            </h4>
            <ul
              style={{
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                fontSize: "0.8rem",
              }}
            >
              <li>
                <Link to="/" style={{ color: "var(--text-muted)" }}>
                  الرئيسية
                </Link>
              </li>
              <li>
                <Link to="/lessons" style={{ color: "var(--text-muted)" }}>
                  المحاضرات والدروس
                </Link>
              </li>
              <li>
                <Link to="/exams" style={{ color: "var(--text-muted)" }}>
                  بنك الامتحانات
                </Link>
              </li>
              <li>
                <Link to="/memos" style={{ color: "var(--text-muted)" }}>
                  مذكرات العميد PDF
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3 */}
          <div>
            <h4
              style={{
                fontSize: "0.9rem",
                fontWeight: 800,
                color: "#ffffff",
                marginBottom: "0.75rem",
              }}
            >
              تواصل معنا
            </h4>
            <p
              style={{
                fontSize: "0.8rem",
                color: "var(--text-muted)",
                marginBottom: "8px",
              }}
            >
              للاستفسارات والمتابعة عبر واتساب:
            </p>
            <a
              href={`https://wa.me/${TEACHER_INFO.contacts.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`التواصل عبر واتساب على الرقم +${TEACHER_INFO.contacts.whatsapp}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                color: "var(--emerald)",
                fontWeight: 700,
                fontSize: "0.85rem",
              }}
            >
              <MessageCircle size={16} />
              <span dir="ltr">+{TEACHER_INFO.contacts.whatsapp} (واتساب)</span>
            </a>
          </div>
        </div>

        <div
          className="footer-bottom-row"
          style={{
            paddingTop: "1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
            fontSize: "0.75rem",
          }}
        >
          <div>
            © {new Date().getFullYear()} جميع الحقوق محفوظة لمنصة العميد في
            الرياضيات | مستر محمد عبد الخالق
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              color: "var(--text-muted)",
            }}
          >
            <span>صُنعت بكل</span>
            <Heart
              size={14}
              style={{ color: "var(--rose)", fill: "var(--rose)" }}
            />
            <span>لتفوق طلابنا الأعزاء</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
