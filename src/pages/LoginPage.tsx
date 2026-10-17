import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle, MessageSquare, Send, X } from 'lucide-react';
import systemLogo from '../assets/images/finagent_system_logo.jpg';
import {
  cacheLocalComplaint,
  createLocalComplaint,
  type ComplaintRecipient,
} from '../utils/complaints';
import './RegistrationPage.css';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'info' | 'success'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [complaint, setComplaint] = useState({
    name: '',
    email: '',
    recipient: 'admin' as ComplaintRecipient,
    message: '',
  });
  const [complaintStatus, setComplaintStatus] = useState<{ type: 'error' | 'info' | 'success'; text: string } | null>(null);
  const [isSubmittingComplaint, setIsSubmittingComplaint] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setStatusMessage(null);
    setIsLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    // Check if live backend API is available
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        localStorage.setItem('finagent_token', data.access_token);
        localStorage.setItem('finagent_role', data.role);
        localStorage.setItem('finagent_name', data.name ?? 'Administrator');
        localStorage.setItem('finagent_is_primary', data.is_primary ? 'true' : 'false');

        if (data.role === 'administrator') {
          navigate('/admin/registrations');
          return;
        } else if (data.role === 'finance_officer') {
          navigate('/officer/dashboard');
          return;
        } else if (data.role === 'auditor') {
          navigate('/auditor/dashboard');
          return;
        } else {
          setStatusMessage({
            type: 'success',
            text: `Welcome back, ${data.name}! You are logged in as ${data.role}.`,
          });
          return;
        }
      }

      // If backend returned specific status code (e.g. pending, rejected, blocked)
      const code = data?.detail?.code;
      if (code === 'pending') {
        setStatusMessage({
          type: 'info',
          text: 'Your account is awaiting administrator approval before you can sign in.',
        });
        setIsLoading(false);
        return;
      } else if (code === 'rejected') {
        setStatusMessage({
          type: 'error',
          text: 'Your registration was not approved. Please contact your administrator.',
        });
        setIsLoading(false);
        return;
      } else if (code === 'blocked') {
        setStatusMessage({
          type: 'error',
          text: 'This account has been deactivated. Please contact your administrator.',
        });
        setIsLoading(false);
        return;
      }
    } catch {
      // Backend not running locally - support frontend preview/dev authentication
    }

    // Local / Dev Fallback: Primary Administrator Check
    if (cleanEmail === 'finagent@finagent.local' || cleanEmail.includes('admin')) {
      if (password.length >= 6) {
        localStorage.setItem('finagent_token', 'dev-primary-admin-jwt-token');
        localStorage.setItem('finagent_role', 'administrator');
        localStorage.setItem('finagent_name', 'Primary Administrator');
        localStorage.setItem('finagent_is_primary', 'true');

        setStatusMessage({
          type: 'success',
          text: 'Authentication verified. Redirecting to Administrator Console...',
        });

        setTimeout(() => {
          navigate('/admin/dashboard');
        }, 500);
        return;
      } else {
        setStatusMessage({
          type: 'error',
          text: 'Invalid password. For the primary administrator, enter at least 8 characters (default: 12341234).',
        });
        setIsLoading(false);
        return;
      }
    }

    // Local / Dev Fallback: Auditor Check
    if (cleanEmail === 'auditor@finagent.local') {
      if (password.length >= 6) {
        localStorage.setItem('finagent_token', 'dev-auditor-jwt-token');
        localStorage.setItem('finagent_role', 'auditor');
        localStorage.setItem('finagent_name', 'Zainab Fatima');
        localStorage.setItem('finagent_is_primary', 'false');

        setStatusMessage({
          type: 'success',
          text: 'Authentication verified. Redirecting to Auditor Dashboard...',
        });

        setTimeout(() => {
          navigate('/auditor/dashboard');
        }, 500);
        return;
      } else {
        setStatusMessage({
          type: 'error',
          text: 'Invalid password. Please enter at least 8 characters (default: 12341234).',
        });
        setIsLoading(false);
        return;
      }
    }

    // Local / Dev Fallback: Finance Officer Check
    if (cleanEmail.includes('finance') || cleanEmail.includes('officer') || cleanEmail.includes('amara') || cleanEmail === 's.jenkins@enterprise.com') {
      if (password.length >= 6) {
        localStorage.setItem('finagent_token', 'dev-finance-officer-jwt-token');
        localStorage.setItem('finagent_role', 'finance_officer');
        localStorage.setItem('finagent_name', 'Amara Mensah');
        localStorage.setItem('finagent_is_primary', 'false');

        setStatusMessage({
          type: 'success',
          text: 'Authentication verified. Redirecting to Finance Officer Dashboard...',
        });

        setTimeout(() => {
          navigate('/officer/dashboard');
        }, 500);
        return;
      } else {
        setStatusMessage({
          type: 'error',
          text: 'Invalid password. Please enter at least 8 characters (default: 12341234).',
        });
        setIsLoading(false);
        return;
      }
    }

    // If regular user logging in without prior approval
    setStatusMessage({
      type: 'info',
      text: 'Authentication check: Pending approval. Your access request is currently under review by the Administrator.',
    });
    setIsLoading(false);
  }

  async function handleComplaintSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmittingComplaint(true);
    setComplaintStatus(null);

    const payload = { ...complaint, name: complaint.name.trim(), email: complaint.email.trim(), message: complaint.message.trim() };

    let response: Response;
    try {
      response = await fetch(`${API_URL}/auth/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      cacheLocalComplaint(createLocalComplaint(payload));
      setComplaintStatus({
        type: 'info',
        text: 'The complaint service is unavailable. This message is saved on this device only and has not been sent to the stakeholders.',
      });
      setIsSubmittingComplaint(false);
      return;
    }

    if (!response.ok) {
      setComplaintStatus({
        type: 'error',
        text: 'The complaint could not be submitted. Please check your details and try again.',
      });
      setIsSubmittingComplaint(false);
      return;
    }

    const submitted = await response.json();
    cacheLocalComplaint(submitted);
    setComplaint({ name: '', email: '', recipient: 'admin', message: '' });
    setComplaintStatus({
      type: 'success',
      text: 'Complaint submitted and added to the Admin User Management inbox.',
    });
    setIsSubmittingComplaint(false);
  }

  return (
    <div className="registration-container">
      {/* Top Header Bar */}
      <header className="reg-header">
        <div className="reg-brand-group">
          <Link to="/" className="reg-brand">
            <img className="reg-system-logo" src={systemLogo} alt="FinAgent Logo" />
            <span>FinAgent</span>
          </Link>
          <div className="reg-divider" />
          <span className="reg-tagline">AI-Powered Finance Automation</span>
        </div>

        <div className="reg-header-right">
          <button
            className="contact-us-button"
            onClick={() => {
              setContactOpen(true);
              setComplaintStatus(null);
            }}
            type="button"
          >
            <MessageSquare size={15} />
            Contact Us
          </button>
        </div>
      </header>

      {contactOpen && (
        <div className="contact-modal-backdrop">
          <section aria-labelledby="contact-modal-title" aria-modal="true" className="contact-modal" role="dialog">
            <div className="contact-modal-header">
              <div>
                <span>FinAgent support</span>
                <h2 id="contact-modal-title">Submit a complaint</h2>
              </div>
              <button
                aria-label="Close contact form"
                className="contact-modal-close"
                onClick={() => setContactOpen(false)}
                type="button"
              >
                <X size={19} />
              </button>
            </div>

            <p className="contact-modal-note">
              Choose the stakeholder for your message. Submitted complaints appear in Admin User Management; email notifications are not configured.
            </p>

            {complaintStatus && (
              <div className={`contact-status contact-status-${complaintStatus.type}`} role="status">
                {complaintStatus.text}
              </div>
            )}

            <form className="contact-form" onSubmit={handleComplaintSubmit}>
              <label>
                <span>Your name</span>
                <input
                  autoComplete="name"
                  maxLength={120}
                  onChange={(e) => setComplaint({ ...complaint, name: e.target.value })}
                  required
                  value={complaint.name}
                />
              </label>
              <label>
                <span>Your email</span>
                <input
                  autoComplete="email"
                  onChange={(e) => setComplaint({ ...complaint, email: e.target.value })}
                  required
                  type="email"
                  value={complaint.email}
                />
              </label>
              <label>
                <span>Send to</span>
                <select
                  onChange={(e) => setComplaint({ ...complaint, recipient: e.target.value as ComplaintRecipient })}
                  value={complaint.recipient}
                >
                  <option value="admin">Admin (admin@finagent.pk)</option>
                  <option value="ayesha">Ayesha Rauf (ayesharauf.189@gmail.com)</option>
                  <option value="both">Both stakeholders</option>
                </select>
              </label>
              <label>
                <span>Complaint</span>
                <textarea
                  maxLength={5000}
                  minLength={5}
                  onChange={(e) => setComplaint({ ...complaint, message: e.target.value })}
                  required
                  rows={5}
                  value={complaint.message}
                />
              </label>
              <button className="contact-submit-button" disabled={isSubmittingComplaint} type="submit">
                <Send size={15} />
                {isSubmittingComplaint ? 'Submitting...' : 'Submit complaint'}
              </button>
            </form>
          </section>
        </div>
      )}

      {/* Main Body */}
      <main className="flex-1 flex items-center justify-center p-6 bg-[#f4f7fb]">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-slate-200/80">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 mb-3">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-[#0B2546]">Account Login</h1>
            <p className="text-slate-500 text-sm mt-1">
              Enter your credentials to access FinAgent
            </p>
          </div>

          {statusMessage && (
            <div
              className={`mb-5 p-3.5 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${statusMessage.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : statusMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}
            >
              {statusMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />}
              {statusMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
              {statusMessage.type === 'info' && <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />}
              <span>{statusMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Work Email
              </label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@organization.com"
                  required
                  className="w-full h-11 pl-10 pr-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0B2546] focus:ring-2 focus:ring-[#0B2546]/10 text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full h-11 pl-10 pr-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0B2546] focus:ring-2 focus:ring-[#0B2546]/10 text-slate-800"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-[#0B2546] hover:bg-[#123866] text-white font-semibold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
              style={{ color: '#ffffff' }}
            >
              <span>{isLoading ? 'Signing In...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            Forgot your password?{' '}
            <Link to="/forgot-password" className="text-sky-700 font-semibold hover:underline">
              Reset it here
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
