import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';
import globeHeroImg from '../assets/images/finagent_exact_detail_1791525303032.jpg';
import systemLogo from '../assets/images/finagent_system_logo.jpg';

export default function Home() {
  const navigate = useNavigate();

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
      <header className="navbar">
        <a href="/" className="brand">
          <img
            src={systemLogo}
            alt="FinAgent Logo"
            style={{ width: '46px', height: '46px', objectFit: 'contain', borderRadius: '10px' }}
          />
          <span>FinAgent</span>
        </a>

      </header>

      {/* Hero Section */}
      <main className="hero">
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
            <button
              className="hero-login"
              onClick={() => navigate('/login')}
            >
              Login <span className="arrow">→</span>
            </button>

            <button
              className="hero-register"
              onClick={() => navigate('/register')}
            >
              Register <span className="arrow">→</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
