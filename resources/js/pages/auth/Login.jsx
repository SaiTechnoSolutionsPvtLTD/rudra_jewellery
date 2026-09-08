import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    // Generate ambient sparkles
    const field = document.getElementById('sparkleField');
    if (field) {
      field.innerHTML = '';
      for (let i = 0; i < 40; i++) {
        const s = document.createElement('div');
        s.className = 'sparkle';
        s.style.left = Math.random() * 100 + 'vw';
        s.style.top = Math.random() * 100 + 'vh';
        s.style.animationDelay = Math.random() * 3.5 + 's';
        s.style.animationDuration = 2.5 + Math.random() * 3 + 's';
        field.appendChild(s);
      }
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const res = await login(email, password);
    if (res?.success) {
      navigate('/dashboard', { replace: true });
    } else {
      setError(res?.message || 'Invalid credentials');
    }
  };

  return (
    <div className="login-wrapper relative min-h-screen flex items-center justify-center bg-radial-maroon p-5 overflow-y-auto">
      <style>{`
        :root{
          --gold: #d4af37;
          --gold-light: #f3d98b;
          --gold-dark: #a8791f;
          --black: #0d0b08;
          --charcoal: #1a1611;
          --cream: #f8f1e5;
          --maroon: #3d0c11;
          --glass-border: rgba(212,175,55,0.35);
        }

        .bg-radial-maroon {
          background: radial-gradient(circle at 20% 20%, var(--maroon), var(--black) 60%);
        }

        .sparkle-field{
          position:absolute;
          inset:0;
          pointer-events:none;
          z-index:0;
        }
        .sparkle{
          position:absolute;
          width:4px;height:4px;
          background:var(--gold-light);
          border-radius:50%;
          opacity:0.7;
          animation:twinkle 3.5s infinite ease-in-out;
          box-shadow:0 0 8px 2px var(--gold-light);
        }
        @keyframes twinkle{
          0%,100%{opacity:0.2; transform:scale(0.8);}
          50%{opacity:1; transform:scale(1.4);}
        }

        .corner-ornament{
          position:fixed;
          width:120px;height:120px;
          border:2px solid var(--gold);
          opacity:0.25;
          z-index:0;
        }
        .corner-ornament.top-left{top:30px;left:30px;border-right:none;border-bottom:none;}
        .corner-ornament.bottom-right{bottom:30px;right:30px;border-left:none;border-top:none;}

        .login-card{
          position:relative;
          z-index:2;
          width:100%;
          max-width:420px;
          background:linear-gradient(160deg, rgba(26,22,17,0.9), rgba(13,11,8,0.95));
          border:1px solid var(--glass-border);
          border-radius:18px;
          backdrop-filter:blur(14px);
          box-shadow:0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(212,175,55,0.08) inset;
          padding:45px 38px 38px;
          animation:riseIn 0.8s ease;
          margin:auto;
        }
        @keyframes riseIn{
          from{opacity:0; transform:translateY(30px);}
          to{opacity:1; transform:translateY(0);}
        }

        .brand-logo{
          width:64px;height:64px;
          margin:0 auto 14px;
          border-radius:50%;
          background:linear-gradient(135deg, var(--gold-light), var(--gold-dark));
          display:flex;
          align-items:center;
          justify-content:center;
          font-family:'Playfair Display',serif;
          font-weight:800;
          font-size:26px;
          color:var(--black);
          box-shadow:0 0 25px rgba(212,175,55,0.5);
        }
        .brand-name{
          font-family:'Playfair Display',serif;
          font-weight:700;
          font-size:28px;
          letter-spacing:1.5px;
          background:linear-gradient(90deg, var(--gold-light), var(--gold), var(--gold-dark));
          -webkit-background-clip:text;
          -webkit-text-fill-color:transparent;
        }

        .divider-orn{
          display:flex;
          align-items:center;
          justify-content:center;
          gap:10px;
          margin:22px 0 26px;
          color:var(--gold);
          opacity:0.6;
          font-size:14px;
        }
        .divider-orn::before, .divider-orn::after{
          content:"";
          height:1px;
          width:60px;
          background:linear-gradient(90deg, transparent, var(--gold), transparent);
        }

        .form-input{
          width:100%;
          padding:15px 16px 15px 44px;
          background:rgba(255,255,255,0.03);
          border:1px solid rgba(212,175,55,0.25);
          border-radius:10px;
          color:var(--cream);
          font-size:14.5px;
          outline:none;
          transition:all 0.3s ease;
        }
        .form-input::placeholder{color:rgba(248,241,229,0.35);}
        .form-input:focus{
          border-color:var(--gold);
          background:rgba(212,175,55,0.06);
          box-shadow:0 0 0 3px rgba(212,175,55,0.12);
        }
        .btn-login{
          width:100%;
          padding:15px;
          border:none;
          border-radius:10px;
          background:linear-gradient(90deg, var(--gold-dark), var(--gold), var(--gold-light));
          background-size:200% auto;
          color:var(--black);
          font-weight:600;
          font-size:15px;
          letter-spacing:0.5px;
          cursor:pointer;
          transition:all 0.4s ease;
          box-shadow:0 10px 25px rgba(212,175,55,0.3);
        }
        .btn-login:hover{
          background-position:right center;
          transform:translateY(-2px);
          box-shadow:0 14px 30px rgba(212,175,55,0.45);
        }
      `}</style>

      <div className="sparkle-field" id="sparkleField"></div>
      <div className="corner-ornament top-left"></div>
      <div className="corner-ornament bottom-right"></div>

      <div className="login-card">
        <div className="brand-header text-center mb-7">
          <div className="brand-logo">RJ</div>
          <div className="brand-name">Rudhra Jewellers</div>
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
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              placeholder="Email address"
              required
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
                className="accent-[#d4af37]"
              />
              Remember me
            </label>
          </div>

          <button type="submit" className="btn-login">
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
