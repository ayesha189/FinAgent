import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';
import './HomeNav.css';
import globeHeroImg from '../assets/images/finagent_exact_detail_1791525303032.jpg';
import systemLogo from '../assets/images/finagent_system_logo.jpg';

const NAV_LINKS = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'journey', label: 'Our Journey' },
  { id: 'services', label: 'Services' },
  { id: 'team', label: 'Team' },
  { id: 'contact', label: 'Contact' },
];

// TODO: replace these placeholder social links with the real profiles
const CONTACT = {
  email: 'ayesharauf.189@gmail.com',
  phone: '+923480427189',
  location: 'Faisalabad, Pakistan | Remote-First',
};

const SOCIALS = [
  { label: 'GitHub', href: '#', icon: 'github' },
  { label: 'LinkedIn', href: '#', icon: 'linkedin' },
  { label: 'Twitter', href: '#', icon: 'twitter' },
  { label: 'YouTube', href: '#', icon: 'youtube' },
];

function Icon({ name, size = 22 }: { name: string; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  switch (name) {
    case 'mail':
      return (
        <svg {...common}>
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      );
    case 'phone':
      return (
        <svg {...common}>
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      );
    case 'pin':
      return (
        <svg {...common}>
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      );
    case 'chevron':
      return (
        <svg {...common}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
      );
    case 'arrow-up':
      return (
        <svg {...common}>
          <line x1="12" y1="19" x2="12" y2="5" />
          <polyline points="5 12 12 5 19 12" />
        </svg>
      );
    case 'github':
      return (
        <svg {...common}>
          <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg {...common}>
          <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
          <rect x="2" y="9" width="4" height="12" />
          <circle cx="4" cy="4" r="2" />
        </svg>
      );
    case 'twitter':
      return (
        <svg {...common}>
          <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />
        </svg>
      );
    case 'youtube':
      return (
        <svg {...common}>
          <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
          <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
        </svg>
      );
    default:
      return null;
  }
}

export default function Home() {
  const navigate = useNavigate();
  const [showTop, setShowTop] = useState(false);
  const [sent, setSent] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeId, setActiveId] = useState('home');

  // Navbar background + active link tracking
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
      setShowTop(window.scrollY > 500);

      const probe = window.scrollY + 140;
      let current = NAV_LINKS[0].id;
      for (const { id } of NAV_LINKS) {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= probe) current = id;
      }
      setActiveId(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const goTo = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="home-page">
      {/* 3D Visual Background */}
      <div className="scene-background" aria-hidden="true">
        <img
          src={globeHeroImg}
          alt="FinAgent Global 3D Financial Intelligence"
          className="scene-image"
          referrerPolicy="no-referrer"
        />
        <div className="scene-overlay" />
      </div>

      {/* Top Navbar */}
      <header className={`site-nav ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="site-nav__inner">
          <a href="#home" className="site-nav__brand" onClick={goTo('home')}>
            <img src={systemLogo} alt="FinAgent Logo" />
            <span>FinAgent</span>
          </a>

          <nav
            id="site-nav-menu"
            className={`site-nav__links ${menuOpen ? 'is-open' : ''}`}
            aria-label="Primary"
          >
            {NAV_LINKS.map(({ id, label }) => (
              <a
                key={id}
                href={`#${id}`}
                onClick={goTo(id)}
                className={activeId === id ? 'is-active' : ''}
                aria-current={activeId === id ? 'page' : undefined}
              >
                {label}
              </a>
            ))}
          </nav>

          <button
            type="button"
            className={`site-nav__toggle ${menuOpen ? 'is-open' : ''}`}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            aria-controls="site-nav-menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="hero" id="home">
        <div className="hero-content">
          {/* Eyebrow badge */}
          <div className="eyebrow">
            <span>AI-POWERED FINANCIAL INTELLIGENCE</span>
          </div>

          <h1>
            Smarter Finance.
            <br />
            <span style={{ color: '#13315C' }}>Clearer Decisions.</span>
          </h1>

          <p className="hero-description">
            FinAgent uses the power of AI to analyze transactions, manage risk,
            ensure compliance and deliver actionable insights — helping you make
            smarter financial decisions, faster.
          </p>

          <div className="hero-buttons">
            <button className="hero-login" onClick={() => navigate('/login')}>
              Login <span className="arrow">→</span>
            </button>

            <button className="hero-register" onClick={() => navigate('/register')}>
              Register <span className="arrow">→</span>
            </button>
          </div>
        </div>
      </main>

      {/* About */}
      <section className="page-section" id="about">
        <div className="page-section__inner">
          <span className="section-eyebrow">About</span>
          <h2>About FinAgent</h2>
          <p className="section-lead">
            An AI platform that brings transaction analysis, risk management and
            compliance together in one place.
          </p>
          <div className="card-grid">
            <article className="info-card">
              <h3>Transaction Analysis</h3>
              <p>Automatically review transactions and surface patterns that matter.</p>
            </article>
            <article className="info-card">
              <h3>Risk Management</h3>
              <p>Spot exposure early with AI-driven risk scoring and alerts.</p>
            </article>
            <article className="info-card">
              <h3>Compliance</h3>
              <p>Stay audit-ready with automated checks and clear reporting.</p>
            </article>
          </div>
        </div>
      </section>

      {/* Our Journey */}
      <section className="page-section" id="journey">
        <div className="page-section__inner">
          <span className="section-eyebrow">Our Journey</span>
          <h2>How We Build FinAgent</h2>
          <p className="section-lead">From first idea to a working financial intelligence platform.</p>
          <ol className="timeline">
            <li>
              <h3>1. Research &amp; Requirements</h3>
              <p>Understand financial workflows and define what the system must do.</p>
            </li>
            <li>
              <h3>2. Design &amp; Architecture</h3>
              <p>Plan the UI, data models, APIs and AI agents.</p>
            </li>
            <li>
              <h3>3. Development</h3>
              <p>Build and integrate the core modules end-to-end.</p>
            </li>
            <li>
              <h3>4. Testing &amp; Iteration</h3>
              <p>Validate every flow and refine until it is ready to ship.</p>
            </li>
          </ol>
        </div>
      </section>

      {/* Services */}
      <section className="page-section" id="services">
        <div className="page-section__inner">
          <span className="section-eyebrow">Services</span>
          <h2>Our Services</h2>
          <p className="section-lead">
            AI-powered financial tools built to help you move faster with more confidence.
          </p>
          <div className="card-grid">
            <article className="info-card">
              <h3>Transaction Monitoring</h3>
              <p>Real-time analysis of transactions to flag unusual activity automatically.</p>
            </article>
            <article className="info-card">
              <h3>Risk Scoring &amp; Alerts</h3>
              <p>Clear risk scores and timely alerts so you can act before issues grow.</p>
            </article>
            <article className="info-card">
              <h3>Compliance Reporting</h3>
              <p>Audit-ready reports generated from your data with a full trail of checks.</p>
            </article>
            <article className="info-card">
              <h3>Actionable Insights</h3>
              <p>AI-generated summaries and recommendations that support better decisions.</p>
            </article>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="page-section" id="team">
        <div className="page-section__inner">
          <span className="section-eyebrow">Team</span>
          <h2>Meet the Team</h2>
          <p className="section-lead">The people behind FinAgent.</p>
          <div className="card-grid">
            {[
              { name: 'Ayesha Rauf', role: 'Frontend Developer & AI UI Engineer' },
              { name: 'Aqsa Ishaq', role: 'AI Agent Backend Developer' },
              { name: 'Musfira Umer', role: 'Backend Developer' },
            ].map((m) => (
              <article className="info-card team-card" key={m.name}>
                <div className="avatar" aria-hidden="true">
                  {m.name.charAt(0)}
                </div>
                <h3>{m.name}</h3>
                <p>{m.role}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="page-section" id="contact">
        <div className="page-section__inner">
          <span className="section-eyebrow">Contact</span>
          <h2>Get In Touch</h2>
          <p className="section-lead">Questions or want a demo? Send us a message.</p>

          <div className="contact-layout">
            {/* Left: contact info */}
            <div className="contact-info">
              <h3 className="contact-heading">Contact Information</h3>
              <div className="contact-cards">
                <div className="contact-card">
                  <div className="contact-icon">
                    <Icon name="mail" />
                  </div>
                  <div>
                    <strong>Email</strong>
                    <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
                  </div>
                </div>
                <div className="contact-card">
                  <div className="contact-icon">
                    <Icon name="phone" />
                  </div>
                  <div>
                    <strong>Phone</strong>
                    <a href={`tel:${CONTACT.phone.replace(/\s/g, '')}`}>{CONTACT.phone}</a>
                  </div>
                </div>
                <div className="contact-card">
                  <div className="contact-icon">
                    <Icon name="pin" />
                  </div>
                  <div>
                    <strong>Location</strong>
                    <span>{CONTACT.location}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: message form */}
            <form
              className="contact-form"
              onSubmit={(e) => {
                e.preventDefault();
                // TODO: connect to your backend / email service
                e.currentTarget.reset();
                setSent(true);
              }}
            >
              <h3 className="contact-heading">Send Us a Message</h3>
              <div className="form-row">
                <label>
                  Your Name
                  <input type="text" name="name" placeholder="Your full name" required />
                </label>
                <label>
                  Your Email
                  <input type="email" name="email" placeholder="you@example.com" required />
                </label>
              </div>
              <label>
                Subject
                <input type="text" name="subject" placeholder="How can we help you?" required />
              </label>
              <label>
                Message
                <textarea name="message" placeholder="Your message here..." rows={5} required />
              </label>
              <button type="submit" className="contact-submit">
                Send Message <span className="arrow">→</span>
              </button>
              {sent && (
                <p className="form-success" role="status">
                  Thank you for your message! We'll get back to you soon.
                </p>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="site-footer">
        <div className="site-footer__grid">
          <div className="site-footer__about">
            <a href="#home" className="site-footer__brand" onClick={goTo('home')}>
              <img src={systemLogo} alt="FinAgent Logo" />
              <span>FinAgent</span>
            </a>
            <p>
              AI-Powered Financial Intelligence | Analyze Transactions, Manage Risk | Smarter,
              Faster, Clearer
            </p>
            <div className="site-footer__socials">
              {SOCIALS.map((s) => (
                <a key={s.label} href={s.href} aria-label={s.label} target="_blank" rel="noreferrer">
                  <Icon name={s.icon} size={20} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4>Quick Links</h4>
            <ul className="site-footer__links">
              {NAV_LINKS.map(({ id, label }) => (
                <li key={id}>
                  <a href={`#${id}`} onClick={goTo(id)}>
                    <Icon name="chevron" size={16} />
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4>Contact Info</h4>
            <ul className="site-footer__contact">
              <li>
                <Icon name="mail" size={18} />
                <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
              </li>
              <li>
                <Icon name="phone" size={18} />
                <a href={`tel:${CONTACT.phone.replace(/\s/g, '')}`}>{CONTACT.phone}</a>
              </li>
              <li>
                <Icon name="pin" size={18} />
                <span>{CONTACT.location}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="site-footer__bottom">
          © {new Date().getFullYear()} FinAgent. All Rights Reserved.
        </div>
      </footer>

      {/* Scroll to top */}
      <button
        type="button"
        className={`scroll-top ${showTop ? 'is-visible' : ''}`}
        aria-label="Scroll to top"
        onClick={goTo('home')}
      >
        <Icon name="arrow-up" size={22} />
      </button>
    </div>
  );
}