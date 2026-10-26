import AuthPage from "./AuthPage";

// Backwards-compatible student login entry point. Teacher login is routed
// directly to AuthPage with the teacher role and is never linked from here.
export default function LoginPage() {
  return <AuthPage role="student" />;
}
