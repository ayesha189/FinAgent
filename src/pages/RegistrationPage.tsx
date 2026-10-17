import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  User,
  Mail,
  Lock,
  Shield,
  TrendingUp,
  Zap,
  Info,
  ArrowRight,
  ChevronDown,
  Settings,
  ShieldAlert
} from 'lucide-react';
import './RegistrationPage.css';
import laptopImg from '../assets/images/finagent_laptop_dashboard_1791527983999.jpg';

export default function RegistrationPage() {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '',
  });

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  function handleSelectRole(role: string) {
    setForm({
      ...form,
      role,
    });
    setIsDropdownOpen(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!form.role) {
      setMessage({
        type: 'error',
        text: 'Please select your role from the list.',
      });
      return;
    }

    if (form.password !== form.confirmPassword) {
      setMessage({
        type: 'error',
        text: 'Passwords do not match. Please re-enter matching passwords.',
      });
      return;
    }

    if (form.password.length < 8) {
      setMessage({
        type: 'error',
        text: 'Password must contain at least 8 characters.',
      });
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setMessage({
        type: 'success',
        text: 'Your access request has been submitted. Your account is currently pending administrator approval. You will be able to log in once reviewed.',
      });
      setForm({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: '',
      });
    }, 600);
  }

  return (
    <div className="registration-container">
      {/* Top Header Bar matching screenshot */}
      <header className="reg-header">
        <div className="reg-brand-group">
          <Link to="/" className="reg-brand">
            <svg
              className="w-7 h-7 drop-shadow-xs"
              viewBox="0 0 44 44"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path d="M8 18.5L16 13.8V33L8 28.5V18.5Z" fill="#38BDF8" />
              <path d="M8 18.5L16 23.2V33L8 28.5V18.5Z" fill="#0284C7" />
              <path d="M17 10L25 5.3V37.5L17 33V10Z" fill="#0EA5E9" />
              <path d="M17 22L25 26.5V37.5L17 33V22Z" fill="#0369A1" />
              <path d="M26 15.2L34 10.6V30.2L26 34.8V15.2Z" fill="#0284C7" />
              <path d="M26 25.5L34 21V30.2L26 34.8V25.5Z" fill="#0B2546" />
            </svg>
            <span>FinAgent</span>
          </Link>
          <div className="reg-divider" />
          <span className="reg-tagline">AI-Powered Finance Automation</span>
        </div>

        <div className="reg-header-right">
          <span>Smarter Finance</span>
          <span>·</span>
          <span>Safer Decisions</span>
        </div>
      </header>

      {/* Main Split Grid */}
      <main className="reg-body">
        {/* Left Dark Blue Sidebar matching screenshot */}
        <aside className="reg-sidebar">
          <div>
            <h2 className="sidebar-heading">
              Build a Smarter
              <br />
              Finance Department
            </h2>
            <p className="sidebar-desc">
              FinAgent automates finance operations with the power of AI, helping your team
              work faster, safer and smarter.
            </p>

            <div className="sidebar-features">
              <div className="feature-item">
                <div className="feature-icon-wrapper">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <div className="feature-title">Automate</div>
                  <div className="feature-subtitle">repetitive finance tasks</div>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon-wrapper">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <div className="feature-title">Ensure</div>
                  <div className="feature-subtitle">compliance & accuracy</div>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon-wrapper">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <div className="feature-title">Make</div>
                  <div className="feature-subtitle">data-driven decisions</div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom 3D Laptop Graphic on dark desk */}
          <div className="sidebar-graphic">
            <img
              src={laptopImg}
              alt="FinAgent Finance Analytics Dashboard"
              referrerPolicy="no-referrer"
            />
          </div>
        </aside>

        {/* Right Form Area matching screenshot */}
        <section className="reg-content-area">
          <div className="reg-title-box">
            <h1>Create Your Account</h1>
            <p>
              Register to access the FinAgent system. Your account will be reviewed and
              approved by the administrator before you can log in.
            </p>
          </div>

          {message && (
            <div
              className={`reg-alert ${
                message.type === 'success' ? 'reg-alert-success' : 'reg-alert-error'
              }`}
              role="alert"
            >
              {message.text}
            </div>
          )}

          <form className="reg-form" onSubmit={handleSubmit}>
            {/* Row 1: Full Name & Email */}
            <div className="form-grid-2">
              <div className="form-field">
                <label htmlFor="fullName">Full Name</label>
                <div className="input-with-icon">
                  <User className="field-icon" />
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    value={form.fullName}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    autoComplete="name"
                    required
                  />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="email">Email Address</label>
                <div className="input-with-icon">
                  <Mail className="field-icon" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Password & Confirm Password */}
            <div className="form-grid-2">
              <div className="form-field">
                <label htmlFor="password">Password</label>
                <div className="input-with-icon">
                  <Lock className="field-icon" />
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Create a password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <div className="input-with-icon">
                  <Lock className="field-icon" />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm your password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Row 3: Role Selector */}
            <div className="form-field">
              <label>Role</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="role-select-btn"
                  aria-haspopup="listbox"
                  aria-expanded={isDropdownOpen}
                >
                  <span className="flex items-center gap-2">
                    {form.role ? (
                      <>
                        {form.role === 'Finance Officer' && <User className="w-4 h-4 text-sky-600" />}
                        {form.role === 'Auditor' && <ShieldAlert className="w-4 h-4 text-sky-600" />}
                        {form.role === 'Administrator' && <Settings className="w-4 h-4 text-sky-600" />}
                        <span className="font-medium text-[#0B2545]">{form.role}</span>
                      </>
                    ) : (
                      <span className="text-[#98ABC0]">Select your role</span>
                    )}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${
                      isDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Options (Finance Officer, Auditor, Administrator) */}
                {isDropdownOpen && (
                  <div className="role-dropdown-menu" role="listbox">
                    <div
                      className={`role-option ${form.role === 'Finance Officer' ? 'active' : ''}`}
                      onClick={() => handleSelectRole('Finance Officer')}
                      role="option"
                      aria-selected={form.role === 'Finance Officer'}
                    >
                      <User className="role-opt-icon" />
                      <span>Finance Officer</span>
                    </div>

                    <div
                      className={`role-option ${form.role === 'Auditor' ? 'active' : ''}`}
                      onClick={() => handleSelectRole('Auditor')}
                      role="option"
                      aria-selected={form.role === 'Auditor'}
                    >
                      <ShieldAlert className="role-opt-icon" />
                      <span>Auditor</span>
                    </div>

                    <div
                      className={`role-option ${form.role === 'Administrator' ? 'active' : ''}`}
                      onClick={() => handleSelectRole('Administrator')}
                      role="option"
                      aria-selected={form.role === 'Administrator'}
                    >
                      <Settings className="role-opt-icon" />
                      <span>Administrator</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Approval Required Callout Banner */}
            <div className="approval-callout">
              <div className="callout-icon-col">
                <div className="w-6 h-6 rounded-full border-[1.5px] border-[#0B2545] flex items-center justify-center font-bold text-xs text-[#0B2545]">
                  i
                </div>
              </div>
              <div className="callout-divider" />
              <div className="callout-content">
                <div className="callout-title">Approval Required</div>
                <div className="callout-text">
                  Registrations for Finance Officer and Auditor roles will be reviewed and
                  approved by the Administrator before you can log in.
                </div>
              </div>
            </div>

            {/* Bottom Actions Row */}
            <div className="form-footer-row">
              <div className="already-account">
                Already have an account?{' '}
                <Link to="/login" className="login-link">
                  Log in
                </Link>
              </div>

              <button
                type="submit"
                className="btn-register-submit"
                disabled={isSubmitting}
              >
                <span>{isSubmitting ? 'Submitting...' : 'Register'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
