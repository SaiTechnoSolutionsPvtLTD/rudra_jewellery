<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Rudhra Jewellers | Login</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700;800&family=Poppins:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
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

  *{margin:0;padding:0;box-sizing:border-box;}

  body{
    min-height:100vh;
    font-family:'Poppins',sans-serif;
    background:radial-gradient(circle at 20% 20%, var(--maroon), var(--black) 60%);
    display:flex;
    align-items:center;
    justify-content:center;
    overflow-x:hidden;
    overflow-y:auto;
    padding:40px 20px;
    position:relative;
  }

  /* Decorative floating sparkles */
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

  /* Ornamental corner frames */
  .corner-ornament{
    position:fixed;
    width:120px;height:120px;
    border:2px solid var(--gold);
    opacity:0.25;
    z-index:0;
  }
  .corner-ornament.top-left{top:30px;left:30px;border-right:none;border-bottom:none;}
  .corner-ornament.bottom-right{bottom:30px;right:30px;border-left:none;border-top:none;}

  /* Main login card */
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

  .brand-header{
    text-align:center;
    margin-bottom:30px;
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
  .brand-tagline{
    font-size:12px;
    letter-spacing:3px;
    text-transform:uppercase;
    color:var(--gold-light);
    opacity:0.65;
    margin-top:6px;
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

  .form-group{
    position:relative;
    margin-bottom:22px;
  }
  .form-input{
    width:100%;
    padding:15px 16px 15px 44px;
    background:rgba(255,255,255,0.03);
    border:1px solid rgba(212,175,55,0.25);
    border-radius:10px;
    color:var(--cream);
    font-size:14.5px;
    font-family:'Poppins',sans-serif;
    outline:none;
    transition:all 0.3s ease;
  }
  .form-input::placeholder{color:rgba(248,241,229,0.35);}
  .form-input:focus{
    border-color:var(--gold);
    background:rgba(212,175,55,0.06);
    box-shadow:0 0 0 3px rgba(212,175,55,0.12);
  }
  .input-icon{
    position:absolute;
    left:15px;
    top:50%;
    transform:translateY(-50%);
    color:var(--gold);
    opacity:0.8;
    font-size:16px;
  }
  .toggle-pass{
    position:absolute;
    right:15px;
    top:50%;
    transform:translateY(-50%);
    color:var(--gold-light);
    opacity:0.6;
    cursor:pointer;
    font-size:13px;
    user-select:none;
    background:none;
    border:none;
  }

  .form-options{
    display:flex;
    align-items:center;
    justify-content:space-between;
    margin-bottom:26px;
    font-size:13px;
  }
  .remember-me{
    display:flex;
    align-items:center;
    gap:8px;
    color:rgba(248,241,229,0.7);
  }
  .remember-me input{accent-color:var(--gold);}
  .forgot-link{
    color:var(--gold-light);
    text-decoration:none;
    transition:color 0.2s;
  }
  .forgot-link:hover{color:var(--gold);text-decoration:underline;}

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
  .btn-login:active{transform:translateY(0);}

  .divider-or{
    display:flex;
    align-items:center;
    gap:12px;
    margin:26px 0 20px;
    color:rgba(248,241,229,0.4);
    font-size:12px;
    text-transform:uppercase;
    letter-spacing:1px;
  }
  .divider-or::before, .divider-or::after{
    content:"";
    flex:1;
    height:1px;
    background:rgba(212,175,55,0.2);
  }

  .social-row{
    display:flex;
    gap:12px;
    margin-bottom:0px; /* Adjusted since signup text is removed */
  }
  .btn-social{
    flex:1;
    padding:12px;
    border-radius:10px;
    border:1px solid rgba(212,175,55,0.25);
    background:rgba(255,255,255,0.02);
    color:var(--cream);
    font-size:13px;
    display:flex;
    align-items:center;
    justify-content:center;
    gap:8px;
    cursor:pointer;
    transition:all 0.3s ease;
  }
  .btn-social:hover{
    border-color:var(--gold);
    background:rgba(212,175,55,0.08);
  }
  
  .error-msg {
    background: rgba(212,175,55,0.15);
    border-left: 3px solid var(--gold);
    color: var(--gold-light);
    padding: 10px 15px;
    font-size: 13px;
    margin-bottom: 20px;
    border-radius: 4px;
  }

  @media (max-width:480px){
    .login-card{padding:34px 24px 28px;}
    .brand-name{font-size:23px;}
  }
</style>
</head>
<body>

<div class="sparkle-field" id="sparkleField"></div>
<div class="corner-ornament top-left"></div>
<div class="corner-ornament bottom-right"></div>

<div class="login-card">
  <div class="brand-header">
    <div class="brand-logo">RJ</div>
    <div class="brand-name">Rudhra Jewellers</div>
    <div class="brand-tagline">Timeless Elegance</div>
  </div>

  <div class="divider-orn">✦</div>

  <form id="loginForm" method="POST" action="{{ route('login.post') }}">
    @csrf

    @if ($errors->any())
        <div class="error-msg">
            {{ $errors->first() }}
        </div>
    @endif

    <div class="form-group">
      <span class="input-icon">&#9993;</span>
      <input type="email" name="email" class="form-input" placeholder="Email address" value="{{ old('email') }}" required autofocus>
    </div>

    <div class="form-group">
      <span class="input-icon">&#128274;</span>
      <input type="password" name="password" id="passwordField" class="form-input" placeholder="Password" required>
      <button type="button" class="toggle-pass" onclick="togglePassword()">SHOW</button>
    </div>

    <div class="form-options">
      <label class="remember-me">
        <input type="checkbox" name="remember"> Remember me
      </label>
      <a href="#" class="forgot-link">Forgot password?</a>
    </div>

    <button type="submit" class="btn-login">Sign In</button>
  </form>


</div>

<script>
  // Generate ambient sparkles
  const field = document.getElementById('sparkleField');
  for(let i=0;i<40;i++){
    const s = document.createElement('div');
    s.className = 'sparkle';
    s.style.left = Math.random()*100 + 'vw';
    s.style.top = Math.random()*100 + 'vh';
    s.style.animationDelay = (Math.random()*3.5) + 's';
    s.style.animationDuration = (2.5 + Math.random()*3) + 's';
    field.appendChild(s);
  }

  function togglePassword(){
    const field = document.getElementById('passwordField');
    const btn = document.querySelector('.toggle-pass');
    if(field.type === 'password'){
      field.type = 'text';
      btn.textContent = 'HIDE';
    } else {
      field.type = 'password';
      btn.textContent = 'SHOW';
    }
  }
</script>

</body>
</html>