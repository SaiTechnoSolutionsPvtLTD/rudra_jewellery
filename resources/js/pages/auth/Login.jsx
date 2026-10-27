import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { sanitizeErrorMessage } from '../../services/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    // Preload Dashboard bundle in background for instant transition
    import('../Dashboard').catch(() => {});
  }, []);

  const sparkles = React.useMemo(() => {
    return Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      left: `${(i * 2.5 + (i % 7) * 11) % 100}vw`,
      top: `${(i * 3.7 + (i % 5) * 17) % 100}vh`,
      delay: `${(i * 0.2) % 3.5}s`,
      duration: `${2.5 + ((i % 4) * 0.8)}s`,
    }));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError('');
    setIsSubmitting(true);

    try {
      const res = await login(email, password);
      if (res?.success) {
        navigate('/dashboard', { replace: true });
      } else {
        setError(sanitizeErrorMessage(res?.message, 'Invalid email/username or password.'));
        setIsSubmitting(false);
      }
    } catch (err) {
      setError(sanitizeErrorMessage(err, 'Invalid email/username or password.'));
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-wrapper relative min-h-screen flex items-center justify-center bg-radial-maroon p-5 overflow-y-auto">

      <div className="sparkle-field">
        {sparkles.map((s) => (
          <div
            key={s.id}
            className="sparkle"
            style={{
              left: s.left,
              top: s.top,
              animationDelay: s.delay,
              animationDuration: s.duration,
            }}
          />
        ))}
      </div>
      <div className="corner-ornament top-left"></div>
      <div className="corner-ornament bottom-right"></div>

      <div className="login-card">
        <div className="brand-header text-center mb-7">
          <div className="brand-logo">RJ</div>
          <div className="brand-name">Rudra Jewellery</div>
          <div className="text-xs uppercase tracking-[3px] text-[#f3d98b] opacity-65 mt-1.5">
            Timeless Elegance
          </div>
        </div>

        <div className="divider-orn">✦</div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="bg-[rgba(212,175,55,0.15)] border-l-4 border-[#d4af37] text-[#f3d98b] p-2.5 text-xs mb-5 rounded">
              {error}
            </div>
          )}

          <div className="relative mb-5">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#d4af37] opacity-80 text-base">
              ✉
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value.toLowerCase().replace(/\s+/g, ''))}
              className="form-input lowercase"
              placeholder="Email address"
              required
              disabled={isSubmitting}
              autoFocus
            />
          </div>

          <div className="relative mb-5">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#d4af37] opacity-80 text-base">
              🔒
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              placeholder="Password"
              disabled={isSubmitting}
              required
            />
            <button
              type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#f3d98b] opacity-60 text-xs font-semibold hover:opacity-100 bg-none border-none cursor-pointer"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? 'HIDE' : 'SHOW'}
            </button>
          </div>

          <div className="flex items-center justify-between mb-6 text-xs text-[rgba(248,241,229,0.7)]">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                disabled={isSubmitting}
                className="accent-[#d4af37]"
              />
              Remember me
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`btn-login flex items-center justify-center gap-2 ${isSubmitting ? 'opacity-75 cursor-not-allowed' : ''}`}
          >
            {isSubmitting ? (
              <>
                <i className="fa-solid fa-circle-notch animate-spin text-base"></i>
                <span>Signing In...</span>
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
        <div className="mt-6 pt-4 border-t border-[rgba(212,175,55,0.15)] text-center text-xs text-[#f3d98b]/70 font-medium tracking-wide">
          © 2026 <strong className="font-bold text-[#f3d98b]">Rudra Jewellery</strong>. All Rights Reserved. <span className="mx-1 opacity-40">|</span> Developed by <strong className="font-semibold text-[#f3d98b]">Sai Techno Solutions Pvt Ltd</strong>.
        </div>
      </div>
    </div>
  );
}
