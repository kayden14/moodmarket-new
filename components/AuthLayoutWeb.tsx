// components/AuthLayoutWeb.tsx
//
// Shared split-panel auth layout for web.
// Used by login, signup, and reset-password screens.

import { useRouter } from 'expo-router';

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Lora:wght@400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; }

  .auth-root {
    min-height: 100vh; display: flex;
    font-family: 'Sora', sans-serif; background: #fff;
  }

  .auth-left {
    width: 48%; background: linear-gradient(155deg, #FFF0F2 0%, #FFE0E6 60%, #FFDDE4 100%);
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    padding: 60px 48px; position: relative; overflow: hidden;
  }
  .auth-left-blob {
    position: absolute; border-radius: 50%; filter: blur(72px); pointer-events: none;
  }
  .auth-brand { position: relative; z-index: 2; text-align: center; margin-bottom: 48px; }
  .auth-brand-mark {
    width: 72px; height: 72px; border-radius: 22px; background: #FF7A8A;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Lora', serif; font-size: 36px; font-weight: 700; color: #fff;
    margin: 0 auto 16px;
    box-shadow: 0 16px 40px rgba(255,122,138,0.4);
    cursor: pointer;
    transition: transform 0.18s ease, box-shadow 0.18s ease;
  }
  .auth-brand-mark:hover {
    transform: scale(1.07) translateY(-2px);
    box-shadow: 0 22px 48px rgba(255,122,138,0.52);
  }
  .auth-brand-mark:active {
    transform: scale(0.97);
  }
  .auth-brand-name {
    font-family: 'Lora', serif; font-size: 28px; font-weight: 700;
    color: #1A1A1A; letter-spacing: -0.5px; margin-bottom: 6px;
  }
  .auth-brand-tag { font-size: 14px; color: #9CA3AF; font-weight: 500; }

  .auth-testimonials { position: relative; z-index: 2; width: 100%; max-width: 360px; display: flex; flex-direction: column; gap: 12px; }
  .auth-testimonial {
    background: rgba(255,255,255,0.82); border: 1px solid #FFE4E8;
    border-radius: 16px; padding: 16px 18px;
    backdrop-filter: blur(12px);
    box-shadow: 0 4px 20px rgba(255,122,138,0.08);
  }
  .auth-testimonial-text { font-size: 13px; color: #374151; line-height: 1.6; margin-bottom: 10px; font-style: italic; }
  .auth-testimonial-author { display: flex; align-items: center; gap: 8px; }
  .auth-testimonial-avatar {
    width: 28px; height: 28px; border-radius: 14px; background: #FF7A8A;
    display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; color: #fff;
  }
  .auth-testimonial-name { font-size: 12px; font-weight: 700; color: #374151; }
  .auth-testimonial-stars { font-size: 11px; color: #FF7A8A; }

  .auth-right {
    width: 52%; display: flex; align-items: center; justify-content: center;
    padding: 48px 60px; background: #fff;
  }
  .auth-form-wrap { width: 100%; max-width: 420px; }

  .auth-eyebrow {
    font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;
    color: #FF7A8A; margin-bottom: 10px;
  }
  .auth-heading {
    font-family: 'Lora', serif; font-size: clamp(28px, 3vw, 40px);
    font-weight: 900; color: #1A1A1A; letter-spacing: -0.8px; line-height: 1.15; margin-bottom: 8px;
  }
  .auth-heading em { font-style: italic; color: #FF7A8A; }
  .auth-subheading { font-size: 15px; color: #6B7280; margin-bottom: 32px; line-height: 1.5; }

  .auth-error {
    background: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px;
    padding: 12px 16px; margin-bottom: 20px;
    font-size: 14px; color: #DC2626; font-weight: 500; text-align: center;
  }

  .auth-field { margin-bottom: 18px; }
  .auth-field-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 7px; }
  .auth-field-label { font-size: 13px; font-weight: 700; color: #374151; }
  .auth-field-link { font-size: 12px; font-weight: 600; color: #FF7A8A; cursor: pointer; background: none; border: none; font-family: 'Sora', sans-serif; }
  .auth-field-link:hover { text-decoration: underline; }

  .auth-input-wrap {
    display: flex; align-items: center; gap: 10px;
    background: #F9FAFB; border: 1.5px solid #E5E7EB;
    border-radius: 14px; padding: 0 16px; height: 52px;
    transition: border-color 0.18s, background 0.18s;
  }
  .auth-input-wrap.focused { border-color: #FF7A8A; background: #FFF5F6; }
  .auth-input-wrap.error   { border-color: #FCA5A5; background: #FFF5F5; }
  .auth-input-icon { font-size: 17px; flex-shrink: 0; color: #9CA3AF; }
  .auth-input-wrap input {
    flex: 1; background: none; border: none; outline: none;
    font-size: 15px; color: #111827; font-family: 'Sora', sans-serif;
  }
  .auth-input-wrap input::placeholder { color: #9CA3AF; }
  .auth-eye-btn { background: none; border: none; cursor: pointer; font-size: 16px; color: #9CA3AF; padding: 4px; }
  .auth-eye-btn:hover { color: #6B7280; }

  .auth-cta {
    width: 100%; background: #FF7A8A; color: #fff; border: none; border-radius: 14px;
    height: 52px; font-size: 16px; font-weight: 800; cursor: pointer; margin-top: 4px;
    font-family: 'Sora', sans-serif;
    box-shadow: 0 8px 24px rgba(255,122,138,0.3);
    transition: transform 0.16s ease, box-shadow 0.16s ease, opacity 0.15s;
    display: flex; align-items: center; justify-content: center; gap: 8px;
  }
  .auth-cta:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(255,122,138,0.42); }
  .auth-cta:active { transform: translateY(0); opacity: 0.88; }
  .auth-cta:disabled { opacity: 0.55; cursor: not-allowed; }

  .auth-spinner {
    width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.35);
    border-top-color: #fff; border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .auth-divider { display: flex; align-items: center; gap: 14px; margin: 22px 0; }
  .auth-divider-line { flex: 1; height: 1px; background: #E5E7EB; }
  .auth-divider-text { font-size: 13px; color: #9CA3AF; font-weight: 500; white-space: nowrap; }

  .auth-socials { display: flex; gap: 10px; }
  .auth-social-btn {
    flex: 1; height: 48px; background: #F9FAFB; border: 1.5px solid #E5E7EB;
    border-radius: 13px; display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: background 0.15s, border-color 0.15s, transform 0.12s;
    font-size: 19px;
  }
  .auth-social-btn:hover { background: #F3F4F6; border-color: #D1D5DB; transform: translateY(-1px); }
  .auth-social-btn:active { transform: translateY(0); }

  .auth-footer { display: flex; justify-content: center; align-items: center; gap: 5px; margin-top: 24px; font-size: 14px; color: #6B7280; }
  .auth-footer-link { color: #FF7A8A; font-weight: 700; cursor: pointer; background: none; border: none; font-size: 14px; font-family: 'Sora', sans-serif; }
  .auth-footer-link:hover { text-decoration: underline; }

  .auth-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(6px); z-index: 500; display: flex; align-items: center; justify-content: center; }
  .auth-modal {
    background: #fff; border-radius: 24px; padding: 32px;
    width: min(440px, 92vw); box-shadow: 0 40px 100px rgba(0,0,0,0.25);
    font-family: 'Sora', sans-serif;
  }
  .auth-modal-title { font-family: 'Lora', serif; font-size: 24px; font-weight: 700; color: #1A1A1A; margin-bottom: 6px; }
  .auth-modal-sub { font-size: 14px; color: #6B7280; margin-bottom: 24px; line-height: 1.6; }
  .auth-modal-close { position: absolute; top: 16px; right: 16px; background: none; border: 1px solid #E5E7EB; border-radius: 50%; width: 32px; height: 32px; cursor: pointer; font-size: 16px; color: #6B7280; display: flex; align-items: center; justify-content: center; }
  .auth-modal-close:hover { border-color: #FF7A8A; color: #FF7A8A; }
  .auth-modal-input {
    width: 100%; height: 50px; border: 1.5px solid #E5E7EB; border-radius: 13px;
    padding: 0 16px; font-size: 15px; color: #111827; margin-bottom: 16px;
    font-family: 'Sora', sans-serif; outline: none;
    transition: border-color 0.15s;
  }
  .auth-modal-input:focus { border-color: #FF7A8A; }
  .auth-modal-btn {
    width: 100%; height: 50px; background: #FF7A8A; color: #fff; border: none;
    border-radius: 13px; font-size: 15px; font-weight: 700; cursor: pointer;
    font-family: 'Sora', sans-serif;
    transition: opacity 0.15s, transform 0.15s;
  }
  .auth-modal-btn:hover { opacity: 0.88; transform: translateY(-1px); }
  .auth-modal-cancel { width: 100%; background: none; border: none; margin-top: 12px; color: #9CA3AF; font-size: 14px; cursor: pointer; font-family: 'Sora', sans-serif; }
  .auth-modal-cancel:hover { color: #6B7280; }
  .auth-success-icon { font-size: 48px; text-align: center; margin-bottom: 12px; }

  .auth-secure { display: flex; align-items: center; justify-content: center; gap: 5px; margin-top: 20px; font-size: 11px; color: #9CA3AF; }

  @media (max-width: 768px) {
    .auth-left { display: none; }
    .auth-right { width: 100%; padding: 40px 24px; }
  }
`;

interface AuthLayoutWebProps {
  eyebrow?: string;
  heading: React.ReactNode;
  subheading: string;
  error?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthLayoutWeb({
  eyebrow,
  heading,
  subheading,
  error,
  children,
  footer,
}: AuthLayoutWebProps) {
  const router = useRouter();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="auth-root">
        {/* ── Left panel ── */}
        <div className="auth-left">
          <div
            className="auth-left-blob"
            style={{
              width: 320,
              height: 320,
              background: 'rgba(255,122,138,0.14)',
              top: -100,
              right: -80,
            }}
          />
          <div
            className="auth-left-blob"
            style={{
              width: 220,
              height: 220,
              background: 'rgba(255,180,190,0.18)',
              bottom: 60,
              left: -50,
            }}
          />

          <div className="auth-brand">
            <div
              className="auth-brand-mark"
              onClick={() => router.push('/admin')}
              title="Admin"
            >
              M
            </div>
            <div className="auth-brand-name">MoodMarket</div>
            <div className="auth-brand-tag">Shop by how you feel</div>
          </div>

          <div className="auth-testimonials">
            {[
              {
                text: '"Finally a shopping app that gets me. It knew I needed comfort food before I even did."',
                name: 'Ama A.',
                stars: '★★★★★',
              },
              {
                text: '"The mood scanner is scary accurate. Opened it stressed, it recommended a candle — instant calm."',
                name: 'Kofi M.',
                stars: '★★★★★',
              },
            ].map((t, i) => (
              <div key={i} className="auth-testimonial">
                <div className="auth-testimonial-text">{t.text}</div>
                <div className="auth-testimonial-author">
                  <div className="auth-testimonial-avatar">{t.name[0]}</div>
                  <div>
                    <div className="auth-testimonial-name">{t.name}</div>
                    <div className="auth-testimonial-stars">{t.stars}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="auth-right">
          <div className="auth-form-wrap">
            {eyebrow && <div className="auth-eyebrow">{eyebrow}</div>}
            <h1 className="auth-heading">{heading}</h1>
            <p className="auth-subheading">{subheading}</p>

            {error && <div className="auth-error">{error}</div>}

            {children}

            {footer && <div className="auth-footer">{footer}</div>}
          </div>
        </div>
      </div>
    </>
  );
}
