import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-[17px] font-semibold text-ink">Attendly</h1>
          <p className="mt-1.5 text-[13px] text-ink-muted">Sign in to manage attendance</p>
        </div>

        <div className="glass rounded-card p-6 shadow-panel">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
