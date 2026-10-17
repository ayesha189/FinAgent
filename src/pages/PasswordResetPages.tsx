import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import systemLogo from '../assets/images/finagent_system_logo.jpg';
import './RegistrationPage.css';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000';
const GENERIC_RESET_MESSAGE = 'If that account exists, a reset link has been sent';

function PasswordPageLayout({ title, description, children }: {
    title: string;
    description: string;
    children: ReactNode;
}) {
    return (
        <div className="password-reset-container">
            <header className="password-reset-header">
                <Link className="reg-brand" to="/login">
                    <img className="reg-system-logo" src={systemLogo} alt="FinAgent Logo" />
                    <span>FinAgent</span>
                </Link>
                <span>Account security</span>
            </header>
            <main className="password-reset-main">
                <section className="password-reset-card">
                    <div className="password-reset-icon"><ShieldCheck size={22} /></div>
                    <h1>{title}</h1>
                    <p className="password-reset-description">{description}</p>
                    {children}
                </section>
            </main>
        </div>
    );
}

export function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsSubmitting(true);
        try {
            await fetch(`${API_URL}/auth/password-reset/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim() }),
            });
        } catch {
            // Keep the response identical whether the account exists or the service is unavailable.
        } finally {
            setSubmitted(true);
            setIsSubmitting(false);
        }
    }

    return (
        <PasswordPageLayout
            title="Reset your password"
            description="Enter the email address associated with your account."
        >
            {submitted ? (
                <div className="password-reset-notice" role="status">
                    <CheckCircle2 size={18} />
                    <span>{GENERIC_RESET_MESSAGE}</span>
                </div>
            ) : (
                <form className="password-reset-form" onSubmit={handleSubmit}>
                    <label>
                        <span>Email address</span>
                        <div className="password-reset-input-wrap">
                            <Mail size={16} />
                            <input
                                autoComplete="email"
                                onChange={(event) => setEmail(event.target.value)}
                                required
                                type="email"
                                value={email}
                            />
                        </div>
                    </label>
                    <button disabled={isSubmitting} type="submit">
                        {isSubmitting ? 'Sending...' : 'Send reset link'}
                        <ArrowRight size={16} />
                    </button>
                </form>
            )}
            <Link className="password-reset-back" to="/login"><ArrowLeft size={15} />Back to sign in</Link>
        </PasswordPageLayout>
    );
}

export function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') ?? '';
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError('');
        if (!token) {
            setError('This password reset link is invalid or expired.');
            return;
        }
        if (password !== confirmPassword) {
            setError('The passwords do not match.');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_URL}/auth/password-reset/complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            });
            if (!response.ok) {
                setError('This password reset link is invalid or expired. Request a new link and try again.');
                return;
            }
            setSuccess(true);
        } catch {
            setError('The password reset service is unavailable. Please try again later.');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <PasswordPageLayout
            title="Choose a new password"
            description="Use at least 8 characters. Your other active sessions will be signed out."
        >
            {success ? (
                <div className="password-reset-result" role="status">
                    <div className="password-reset-notice"><CheckCircle2 size={18} /><span>Password updated. Existing sessions have been invalidated.</span></div>
                    <Link className="password-reset-primary-link" to="/login">Continue to sign in<ArrowRight size={16} /></Link>
                </div>
            ) : (
                <form className="password-reset-form" onSubmit={handleSubmit}>
                    {!token && <p className="password-reset-error">This password reset link is invalid or expired.</p>}
                    {error && <p className="password-reset-error" role="alert">{error}</p>}
                    <label>
                        <span>New password</span>
                        <div className="password-reset-input-wrap">
                            <LockKeyhole size={16} />
                            <input autoComplete="new-password" minLength={8} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
                        </div>
                    </label>
                    <label>
                        <span>Confirm new password</span>
                        <div className="password-reset-input-wrap">
                            <LockKeyhole size={16} />
                            <input autoComplete="new-password" minLength={8} onChange={(event) => setConfirmPassword(event.target.value)} required type="password" value={confirmPassword} />
                        </div>
                    </label>
                    <button disabled={isSubmitting || !token} type="submit">
                        {isSubmitting ? 'Updating...' : 'Update password'}
                        <ArrowRight size={16} />
                    </button>
                </form>
            )}
            {!success && <Link className="password-reset-back" to="/login"><ArrowLeft size={15} />Back to sign in</Link>}
        </PasswordPageLayout>
    );
}