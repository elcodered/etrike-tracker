import { useState } from "react";
import { Navigate } from "react-router-dom";
import {
  Bike,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Leaf,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { errorText } from "../api/client";
import { Field, ErrorState } from "../components/UI";
export default function LoginPage() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [show, setShow] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  if (user) return <Navigate to="/" replace />;
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email, password);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-page">
      <section className="login-story">
        <div className="login-brand">
          <Bike size={32} />
          <span>
            E-Trike <small>FLEET OPERATIONS</small>
          </span>
        </div>
        <div className="login-story-content">
          <span className="light-eyebrow">
            <span className="tiny-dot" /> A BETTER WAY TO KEEP MOVING
          </span>
          <h1>
            Your fleet.
            <br />
            One clear picture.
          </h1>
          <p>
            From the first trip to the final collection.
            <br />
            Keep every unit, driver, and daily report in view.
          </p>
          <div className="login-feature">
            <Check size={18} /> Update your entire fleet in minutes
          </div>
          <div className="login-feature">
            <Check size={18} /> Track rentals with a reliable daily record
          </div>
          <div className="login-feature">
            <Check size={18} /> Keep owners informed, effortlessly
          </div>
          <div className="login-preview">
            <div className="flex-between">
              <span>
                <span className="tiny-dot" /> DAILY OPERATIONS
              </span>
              <Bike size={24} />
            </div>
            <strong>
              Less reporting.
              <br />
              More clarity.
            </strong>
            <div className="preview-lines">
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
            <small>Every unit. Every day. All in one place.</small>
          </div>
        </div>
        <div className="login-story-footer">
          <Leaf size={16} /> Moving toward a more connected electric fleet.
        </div>
      </section>
      <section className="login-form-side">
        <div className="login-form">
          <span className="login-lock">
            <ShieldCheck size={25} />
          </span>
          <div className="eyebrow">WELCOME TO YOUR WORKSPACE</div>
          <h2>Good to see you.</h2>
          <p>Sign in to manage and monitor your e-trike fleet.</p>
          <form onSubmit={submit}>
            {error && <ErrorState message={error} />}
            <Field
              label="Email address"
              type="email"
              autoComplete="username"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Field label="Password">
              <div className="password-input">
                <input
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  aria-label={show ? "Hide password" : "Show password"}
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </Field>
            <button className="btn primary login-submit" disabled={busy}>
              {busy ? "Signing in…" : "Sign in to workspace"}
              <ArrowRight size={18} />
            </button>
          </form>
          <p className="login-help">
            Need access? Contact your fleet administrator.
          </p>
          <div className="login-security">
            <ShieldCheck size={15} /> Secure access for administrators,
            operators, and owners.
          </div>
        </div>
        <footer>E-Trike Rent & Status Tracking System</footer>
      </section>
    </div>
  );
}
