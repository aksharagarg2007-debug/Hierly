const API_BASE = 'http://127.0.0.1:5000';

const state = {
  user: null,
  view: 'dashboard',
  aptitude: null,
  coding: null,
  interviews: null,
  adminQuestions: null,
  authMode: 'login',
};

const app = document.getElementById('app');

function customFetch(url, options = {}) {
  const defaults = {
    credentials: 'include',
    headers: {},
  };

  const finalOptions = { ...defaults, ...options };

  if (finalOptions.body && !(finalOptions.body instanceof FormData) && !finalOptions.headers['Content-Type']) {
    finalOptions.headers['Content-Type'] = 'application/json';
  }

  return fetch(`${API_BASE}${url}`, finalOptions).then(async (res) => {
    const text = await res.text();
    if (res.status === 401) {
      return {};
    }
    if (!text) {
      return {};
    }

    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    if (!contentType.includes('application/json')) {
      return { raw: text };
    }

    const payload = JSON.parse(text);
    if (!res.ok) {
      throw new Error(payload.error || 'Request failed');
    }
    return payload;
  });
}

function renderShell() {
  app.innerHTML = `
    <div class="app-shell">
      <header class="topbar">
        <div class="topbar-inner">
          <div class="brand">
            <div class="brand-mark">H</div>
            <span>Hierly</span>
          </div>
          <nav class="nav" id="nav"></nav>
          <div id="user-box"></div>
        </div>
      </header>
      <main id="main"></main>
    </div>
  `;

  const navEl = document.getElementById('nav');
  const userBox = document.getElementById('user-box');

  if (!state.user) {
    navEl.innerHTML = '';
    userBox.innerHTML = '';
    return;
  }

  const menu = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'resume', label: 'Resume' },
    { key: 'aptitude', label: 'Aptitude' },
    { key: 'coding', label: 'Coding' },
    { key: 'interview', label: 'Interview' },
    { key: 'reports', label: 'Reports' },
  ];

  if (state.user.is_admin) {
    menu.push({ key: 'admin', label: 'Admin' });
  }

  navEl.innerHTML = menu.map((item) => `
    <button class="${state.view === item.key ? 'active' : ''}" data-view="${item.key}">${item.label}</button>
  `).join('');

  navEl.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => {
      state.view = button.dataset.view;
      renderShell();
      renderView();
    });
  });

  userBox.innerHTML = `
    <div class="user-chip">
      <span>${state.user.name}</span>
      <button class="secondary-btn" id="logout-btn">Logout</button>
    </div>
  `;

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await customFetch('/logout');
    state.user = null;
    renderShell();
    renderView();
  });
}

async function loadUser() {
  try {
    const profile = await customFetch('/api/auth/profile');
    state.user = profile;
  } catch (error) {
    state.user = null;
  }
}

async function renderView() {
  const main = document.getElementById('main');

  if (!state.user) {
    main.innerHTML = `
      <section class="auth-wrap">
        <div class="auth-box">
          <div class="switch-row">
            <button class="${state.authMode === 'login' ? 'active' : ''}" data-auth="login">Login</button>
            <button class="${state.authMode === 'register' ? 'active' : ''}" data-auth="register">Register</button>
          </div>
          <form id="auth-form" class="form-grid">
            <div class="field" id="name-field" hidden>
              <label for="name">Full name</label>
              <input id="name" name="name" placeholder="Your full name" />
            </div>
            <div class="field">
              <label for="email">Email</label>
              <input id="email" name="email" type="email" placeholder="you@example.com" required />
            </div>
            <div class="field">
              <label for="password">Password</label>
              <input id="password" name="password" type="password" placeholder="••••••••" required />
            </div>
            <button type="submit" class="primary-btn">${state.authMode === 'login' ? 'Sign in' : 'Create account'}</button>
          </form>
          <div id="auth-message"></div>
        </div>
      </section>
    `;

    const form = document.getElementById('auth-form');
    const nameField = document.getElementById('name-field');
    const authButtons = document.querySelectorAll('[data-auth]');

    authButtons.forEach((button) => {
      button.addEventListener('click', () => {
        state.authMode = button.dataset.auth;
        renderShell();
        renderView();
      });
    });

    nameField.hidden = state.authMode !== 'register';

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const body = new URLSearchParams({
        email: form.email.value.trim(),
        password: form.password.value,
      });

      if (state.authMode === 'register') {
        body.append('name', form.name.value.trim());
      }

      try {
        const response = await fetch(`${API_BASE}${state.authMode === 'login' ? '/login' : '/register'}`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
          body: body.toString(),
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(text.includes('Please') || text.includes('Wrong') || text.includes('already') ? text.replace(/<.*?>/g, '').trim() : 'Authentication failed');
        }

        await loadUser();
        state.view = 'dashboard';
        renderShell();
        renderView();
      } catch (error) {
        const msg = document.getElementById('auth-message');
        msg.className = 'message error';
        msg.textContent = error.message;
      }
    });

    return;
  }

  if (state.view === 'dashboard') {
    renderDashboard(main);
  } else if (state.view === 'resume') {
    renderResume(main);
  } else if (state.view === 'aptitude') {
    renderAptitude(main);
  } else if (state.view === 'coding') {
    renderCoding(main);
  } else if (state.view === 'interview') {
    renderInterview(main);
  } else if (state.view === 'reports') {
    renderReports(main);
  } else if (state.view === 'admin') {
    renderAdmin(main);
  }
}

async function renderDashboard(main) {
  try {
    const data = await customFetch('/api/dashboard');
    const scores = data.SCORES || {};
    const activity = data.ACTIVITY || [];
    const trend = data.TREND || { labels: [], data: [] };

    main.innerHTML = `
      <section class="hero">
        <h1>Welcome back, ${state.user.name.split(' ')[0]}.</h1>
        <p>Your prep progress is tracked live. Keep moving through the modules and review your weekly improvement.</p>
      </section>

      <div class="grid grid-3">
        ${Object.entries(scores).map(([label, value]) => `
          <div class="card stat-card">
            <div class="label">${label}</div>
            <div class="stat-value">${value}</div>
            <div class="progress-wrap">
              <div class="progress-bar"><span style="width:${value}%"></span></div>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="grid grid-2 mt-12">
        <div class="card">
          <div class="module-header">
            <h2>Latest activity</h2>
            <span class="badge">${data.tests || 0} total events</span>
          </div>
          <ul class="list">
            ${activity.length ? activity.map(([label, when]) => `
              <li><span>${label}</span><small>${when}</small></li>
            `).join('') : '<li><span>No activity yet</span></li>'}
          </ul>
        </div>

        <div class="card">
          <div class="module-header">
            <h2>Performance trend</h2>
            <span class="badge">Overall ${data.overall || 0}</span>
          </div>
          <div class="metric-list">
            ${trend.labels.length ? trend.labels.map((label, index) => `
              <div class="metric-item">
                <div class="label">${label}</div>
                <div class="stat-value" style="font-size:1.25rem; margin: 8px 0 0;">${trend.data[index] || 0}</div>
              </div>
            `).join('') : '<div class="muted">No trend data yet.</div>'}
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    main.innerHTML = `<div class="card"><h2>Dashboard unavailable</h2><p>${error.message}</p></div>`;
  }
}

async function renderResume(main) {
  main.innerHTML = `
    <section class="module-header">
      <h2>Resume analysis</h2>
      <button class="secondary-btn" id="resume-refresh">Refresh</button>
    </section>

    <div class="grid grid-2">
      <div class="card">
        <form id="resume-form" class="form-grid">
          <div class="field">
            <label for="resume-file">Upload your PDF resume</label>
            <input id="resume-file" type="file" accept="application/pdf" required />
          </div>
          <div class="field">
            <label for="job-desc">Job description (optional)</label>
            <textarea id="job-desc" placeholder="Paste the JD here for better ATS matching..."></textarea>
          </div>
          <button type="submit" class="primary-btn">Analyze resume</button>
        </form>
        <div id="resume-message"></div>
      </div>

      <div class="card" id="resume-result-box">
        <div class="muted">No analysis yet. Upload a resume to get ATS feedback.</div>
      </div>
    </div>
  `;

  document.getElementById('resume-refresh').addEventListener('click', () => renderResume(document.getElementById('main')));

  document.getElementById('resume-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const fileInput = document.getElementById('resume-file');
    const file = fileInput.files[0];
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append('resume', file);
    formData.append('jd', document.getElementById('job-desc').value);

    try {
      const result = await fetch(`${API_BASE}/api/resume`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const payload = await result.json();
      if (!result.ok) throw new Error(payload.error || 'Resume analysis failed');
      const box = document.getElementById('resume-result-box');
      box.innerHTML = `
        <div class="module-header">
          <h2>Resume score: ${payload.score}/100</h2>
          <span class="badge">${payload.filename || 'uploaded.pdf'}</span>
        </div>
        <div class="label">Strengths</div>
        <ul class="list">${(payload.strengths || []).map((s) => `<li><span>${s}</span></li>`).join('')}</ul>
        <div class="label mt-12">Weaknesses</div>
        <ul class="list">${(payload.weaknesses || []).map((s) => `<li><span>${s}</span></li>`).join('')}</ul>
        <div class="label mt-12">Missing keywords</div>
        <ul class="list">${(payload.missing || []).map((s) => `<li><span>${s}</span></li>`).join('')}</ul>
        <div class="label mt-12">Tips</div>
        <ul class="list">${(payload.tips || []).map((s) => `<li><span>${s}</span></li>`).join('')}</ul>
      `;
      document.getElementById('resume-message').className = 'message success';
      document.getElementById('resume-message').textContent = 'Resume analyzed successfully.';
    } catch (error) {
      document.getElementById('resume-message').className = 'message error';
      document.getElementById('resume-message').textContent = error.message;
    }
  });
}

async function renderAptitude(main) {
  try {
    const data = await customFetch('/api/aptitude/questions');
    const categories = data.categories || [];
    const questions = data.questions || {};
    const firstCat = categories[0] || '';
    const selected = state.aptitude?.cat || firstCat;

    const renderQuestions = (cat) => {
      const list = questions[cat] || [];
      return list.map((q, index) => `
        <div class="card" style="padding:18px; margin-top:12px;">
          <div class="label">Question ${index + 1}</div>
          <h3 style="margin:12px 0 10px;">${q.q}</h3>
          <div class="answer-grid">
            ${q.o.map((option, optionIndex) => `
              <label>
                <input type="radio" name="q-${q.id}" value="${optionIndex}" />
                <span>${option}</span>
              </label>
            `).join('')}
          </div>
        </div>
      `).join('');
    };

    main.innerHTML = `
      <section class="module-header">
        <h2>Aptitude practice</h2>
        <button class="secondary-btn" id="aptitude-reset">Reset</button>
      </section>
      <div class="card">
        <div class="problem-tabs">
          ${categories.map((cat) => `
            <button class="problem-tab ${selected === cat ? 'active' : ''}" data-aptitude-cat="${cat}">${cat}</button>
          `).join('')}
        </div>
        <form id="aptitude-form">
          ${renderQuestions(selected)}
          <button type="submit" class="primary-btn mt-12">Submit answers</button>
        </form>
        <div id="aptitude-message"></div>
      </div>
    `;

    document.querySelectorAll('[data-aptitude-cat]').forEach((button) => {
      button.addEventListener('click', () => {
        state.aptitude = { cat: button.dataset.aptitudeCat };
        renderAptitude(document.getElementById('main'));
      });
    });

    document.getElementById('aptitude-reset').addEventListener('click', () => renderAptitude(document.getElementById('main')));

    document.getElementById('aptitude-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const cat = selected || firstCat;
      const qList = questions[cat] || [];
      const answers = qList.map((q) => {
        const selectedValue = document.querySelector(`input[name="q-${q.id}"]:checked`);
        return selectedValue ? Number(selectedValue.value) : -1;
      });
      if (answers.some((value) => value < 0)) {
        document.getElementById('aptitude-message').className = 'message error';
        document.getElementById('aptitude-message').textContent = 'Please answer all questions before submitting.';
        return;
      }

      const result = await customFetch('/api/aptitude', {
        method: 'POST',
        body: JSON.stringify({ cat, answers }),
      });

      const detail = result.results || [];
      document.getElementById('aptitude-message').className = 'message success';
      document.getElementById('aptitude-message').innerHTML = `
        <strong>Score: ${result.score}/${result.total}</strong>
        <div class="result-list">
          ${detail.map((item, index) => `
            <div class="result-item ${item.ok ? 'pass' : 'fail'}">
              <strong>Q${index + 1}:</strong> ${item.ok ? 'Correct' : 'Incorrect'}<br>
              <span>${item.correct || 'Try again'}</span>
            </div>
          `).join('')}
        </div>
      `;
    });
  } catch (error) {
    main.innerHTML = `<div class="card"><h2>Aptitude unavailable</h2><p>${error.message}</p></div>`;
  }
}

async function renderCoding(main) {
  try {
    const problems = await customFetch('/api/coding/problems');
    state.coding = state.coding || { selected: problems[0]?.id || null, lang: 'Python' };

    const selectedProblem = problems.find((p) => p.id === Number(state.coding.selected)) || problems[0];

    main.innerHTML = `
      <section class="module-header">
        <h2>Coding practice</h2>
      </section>

      <div class="grid grid-2">
        <div class="card">
          <div class="problem-tabs">
            ${problems.map((problem) => `
              <button class="problem-tab ${selectedProblem?.id === problem.id ? 'active' : ''}" data-problem-id="${problem.id}">${problem.title}</button>
            `).join('')}
          </div>

          <div class="card" style="padding:16px; margin-top:8px;">
            <div class="label">Difficulty</div>
            <div class="badge" style="margin-top:8px;">${selectedProblem?.diff || ''}</div>
            <p>${selectedProblem?.desc || ''}</p>
            <div class="label">Example</div>
            <p>${selectedProblem?.ex || ''}</p>
          </div>
        </div>

        <div class="card">
          <div class="field">
            <label for="code-lang">Language</label>
            <select id="code-lang">
              <option value="Python" ${state.coding.lang === 'Python' ? 'selected' : ''}>Python</option>
              <option value="JavaScript" ${state.coding.lang === 'JavaScript' ? 'selected' : ''}>JavaScript</option>
            </select>
          </div>
          <textarea id="code-editor" class="editor" spellcheck="false">def two_sum(nums, target):
    # Write your solution here
    pass
</textarea>
          <button class="primary-btn mt-12" id="run-code">Run tests</button>
          <div id="code-message"></div>
        </div>
      </div>
    `;

    document.querySelectorAll('[data-problem-id]').forEach((button) => {
      button.addEventListener('click', () => {
        state.coding.selected = Number(button.dataset.problemId);
        renderCoding(document.getElementById('main'));
      });
    });

    document.getElementById('code-lang').addEventListener('change', (event) => {
      state.coding.lang = event.target.value;
    });

    document.getElementById('run-code').addEventListener('click', async () => {
      const lang = document.getElementById('code-lang').value;
      const code = document.getElementById('code-editor').value;
      const res = await customFetch('/api/code', {
        method: 'POST',
        body: JSON.stringify({ id: Number(state.coding.selected), lang, code }),
      });

      const results = res || [];
      const passCount = results.filter((item) => item.pass).length;
      document.getElementById('code-message').className = 'message success';
      document.getElementById('code-message').innerHTML = `
        <strong>${passCount}/${results.length} tests passed</strong>
        <div class="result-list">
          ${results.map((item) => `
            <div class="result-item ${item.pass ? 'pass' : 'fail'}">
              <div><strong>Input:</strong> ${item.input}</div>
              <div><strong>Expected:</strong> ${item.expected}</div>
              <div><strong>Got:</strong> ${item.got}</div>
            </div>
          `).join('')}
        </div>
      `;
    });
  } catch (error) {
    main.innerHTML = `<div class="card"><h2>Coding unavailable</h2><p>${error.message}</p></div>`;
  }
}

async function renderInterview(main) {
  let cameraStream = null;
  let currentQuestion = 0;
  let questions = [];
  let answers = [];
  let recognition = null;
  let isListening = false;
  let interviewType = "HR";
  let role = "Software Developer";
  let gender = "female";
  let three = null;
  let avatarScene = null;
  let avatarRenderer = null;
  let avatarHead = null;
  let avatarMouth = null;
  let speaking = false;
  let animationId = null;

  try {
    const data = await customFetch('/api/interview/questions');
    const categories = data.categories || [];
    const questionData = data.questions || {};

    interviewType = categories[0] || "HR";
    questions = questionData[interviewType] || [];

    const questionTextValue = (q) =>
      typeof q === "string" ? q : (q.q || q.question || q.text || "");

    if (!questions.length) {
      main.innerHTML = '<div class="card"><h2>No interview questions available</h2></div>';
      return;
    }

    main.innerHTML = `
      <section class="module-header">
        <h2>Hierly AI Video Interview</h2>
        <span class="badge">3D AI Interviewer</span>
      </section>

      <div class="grid grid-2">
        <div class="card">
          <div class="label">YOUR AI INTERVIEWER</div>

          <div id="avatar-stage" style="
            width:100%;height:350px;position:relative;
            background:linear-gradient(145deg,#081b3e,#315b88);
            border-radius:18px;overflow:hidden;margin-top:12px;">
            <canvas id="avatar-canvas" style="width:100%;height:100%;display:block;"></canvas>
            <div id="avatar-loading" style="
              position:absolute;bottom:12px;left:0;right:0;
              color:white;text-align:center;font-size:13px;">
              Creating your 3D interviewer...
            </div>
          </div>

          <div class="field mt-12">
            <label>Choose interviewer</label>
            <select id="avatar-gender">
              <option value="female">Female interviewer</option>
              <option value="male">Male interviewer</option>
            </select>
          </div>

          <div class="field mt-12">
            <label>Interview role</label>
            <select id="role-select">
              <option>Software Developer</option>
              <option>Data Analyst</option>
              <option>Web Developer</option>
              <option>QA Engineer</option>
            </select>
          </div>

          <div class="field mt-12">
            <label>Interview type</label>
            <select id="type-select">
              ${categories.map(cat =>
                `<option value="${cat}">${cat}</option>`
              ).join('')}
            </select>
          </div>

          <button class="primary-btn mt-12" id="start-camera">
            Start Interview
          </button>
        </div>

        <div class="card">
          <div class="label">YOUR LIVE CAMERA</div>
          <video id="candidate-video" autoplay muted playsinline
            style="width:100%;height:350px;background:#0f172a;
            border-radius:18px;object-fit:cover;margin-top:12px;">
          </video>

          <div class="grid grid-2 mt-12">
            <button class="secondary-btn" id="camera-btn">Camera ON/OFF</button>
            <button class="secondary-btn" id="mic-btn">Mic ON/OFF</button>
          </div>
          <div id="camera-message" class="muted mt-12">
            Camera not started.
          </div>
        </div>
      </div>

      <div class="card mt-12">
        <div class="module-header">
          <h2>Interview Question</h2>
          <span class="badge" id="question-number">
            Question 0/${questions.length}
          </span>
        </div>

        <h3 id="question-text">Start your interview to begin.</h3>

        <textarea id="candidate-answer"
          placeholder="Speak or type your answer here..."
          style="width:100%;min-height:120px;margin-top:15px;">
        </textarea>

        <div class="grid grid-2 mt-12">
          <button class="secondary-btn" id="speak-question">🔊 Hear Question</button>
          <button class="secondary-btn" id="start-speaking">🎤 Speak Answer</button>
        </div>

        <button class="primary-btn mt-12" id="next-question" disabled>
          Next Question
        </button>

        <div id="interview-message"></div>
      </div>

      <div class="card mt-12" id="interview-result" hidden></div>
    `;

    const video = document.getElementById('candidate-video');
    const answerBox = document.getElementById('candidate-answer');
    const questionText = document.getElementById('question-text');
    const nextButton = document.getElementById('next-question');
    const status = document.getElementById('avatar-loading');

    // Create a procedural 3D interviewer using Three.js
    async function createAvatar() {
      try {
        three = await import(
          'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js'
        );

        const THREE = three;
        const canvas = document.getElementById('avatar-canvas');

        avatarScene = new THREE.Scene();
        avatarScene.background = new THREE.Color('#102747');

        const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
        camera.position.set(0, 0, 6);

        avatarRenderer = new THREE.WebGLRenderer({
          canvas,
          antialias: true
        });

        avatarRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        avatarScene.add(new THREE.HemisphereLight(0xffffff, 0x52617b, 2));

        const light = new THREE.DirectionalLight(0xffffff, 2.5);
        light.position.set(-3, 4, 5);
        avatarScene.add(light);

        const group = new THREE.Group();
        avatarScene.add(group);

        const skin = new THREE.MeshStandardMaterial({
          color: '#d99c79',
          roughness: 0.65
        });

        const shirt = new THREE.MeshStandardMaterial({
          color: '#233f68',
          roughness: 0.8
        });

        const hair = new THREE.MeshStandardMaterial({
          color: gender === 'female' ? '#30201c' : '#211b19',
          roughness: 0.85
        });

        // Body and shoulders
        const body = new THREE.Mesh(
          new THREE.SphereGeometry(1, 40, 40),
          shirt
        );
        body.scale.set(1.3, 1.15, 0.65);
        body.position.y = -1.65;
        group.add(body);

        // Neck
        const neck = new THREE.Mesh(
          new THREE.CylinderGeometry(0.28, 0.32, 0.65, 32),
          skin
        );
        neck.position.y = -0.95;
        group.add(neck);

        // Head
        avatarHead = new THREE.Group();
        avatarHead.position.y = 0.15;
        group.add(avatarHead);

        const face = new THREE.Mesh(
          new THREE.SphereGeometry(1, 48, 48),
          skin
        );
        face.scale.set(0.76, 1.02, 0.68);
        avatarHead.add(face);

        // Hair cap
        const hairCap = new THREE.Mesh(
          new THREE.SphereGeometry(0.79, 40, 32, 0, Math.PI * 2, 0, Math.PI * 0.48),
          hair
        );
        hairCap.position.y = 0.28;
        hairCap.scale.set(1, 0.9, 0.9);
        avatarHead.add(hairCap);

        // Eyes
        const eyeWhite = new THREE.MeshStandardMaterial({ color: '#ffffff' });
        const pupil = new THREE.MeshStandardMaterial({ color: '#241b19' });

        [-0.29, 0.29].forEach(x => {
          const eye = new THREE.Mesh(
            new THREE.SphereGeometry(0.105, 24, 24),
            eyeWhite
          );
          eye.position.set(x, 0.13, 0.58);
          eye.scale.set(1.2, 0.8, 0.45);
          avatarHead.add(eye);

          const iris = new THREE.Mesh(
            new THREE.SphereGeometry(0.055, 20, 20),
            pupil
          );
          iris.position.set(x, 0.13, 0.635);
          avatarHead.add(iris);
        });

        // Nose
        const nose = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 24, 24),
          skin
        );
        nose.scale.set(0.65, 1.5, 0.65);
        nose.position.set(0, -0.08, 0.67);
        avatarHead.add(nose);

        // Mouth
        const mouthMaterial = new THREE.MeshStandardMaterial({
          color: '#602b2b'
        });

        avatarMouth = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 24, 16),
          mouthMaterial
        );
        avatarMouth.scale.set(1.5, 0.18, 0.3);
        avatarMouth.position.set(0, -0.43, 0.64);
        avatarHead.add(avatarMouth);

        function resize() {
          const rect = canvas.getBoundingClientRect();
          const width = Math.max(rect.width, 1);
          const height = Math.max(rect.height, 1);
          avatarRenderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        }

        resize();
        window.addEventListener('resize', resize);

        function animate() {
          animationId = requestAnimationFrame(animate);

          const now = performance.now() / 1000;

          avatarHead.rotation.y = Math.sin(now * 0.65) * 0.035;
          avatarHead.rotation.x = Math.sin(now * 0.8) * 0.018;

          avatarMouth.scale.y = speaking
            ? 0.18 + Math.abs(Math.sin(now * 12)) * 0.5
            : 0.18;

          avatarRenderer.render(avatarScene, camera);
        }

        animate();

        status.textContent = 'Your 3D interviewer is ready';

      } catch (error) {
        status.textContent = '3D avatar could not load. Check internet/WebGL.';
        console.error('Three.js error:', error);
      }
    }

    await createAvatar();

    function updateQuestion() {
      if (currentQuestion >= questions.length) {
        questionText.textContent = 'All questions completed!';
        nextButton.textContent = 'Submit Interview';
        return;
      }

      questionText.textContent = questionTextValue(questions[currentQuestion]);

      document.getElementById('question-number').textContent =
        `Question ${currentQuestion + 1}/${questions.length}`;

      answerBox.value = answers[currentQuestion] || '';

      nextButton.textContent =
        currentQuestion === questions.length - 1
          ? 'Submit Interview'
          : 'Next Question';

      nextButton.disabled = false;
    }

    function speak(text) {
      if (!window.speechSynthesis) {
        alert('Speech playback is not supported in this browser.');
        return;
      }

      window.speechSynthesis.cancel();

      const speech = new SpeechSynthesisUtterance(text);
      speech.lang = 'en-US';
      speech.rate = 0.9;

      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v =>
        gender === 'female'
          ? /female|samantha|zira/i.test(v.name)
          : /male|david|daniel/i.test(v.name)
      );

      if (preferred) speech.voice = preferred;

      speaking = true;
      status.textContent = 'AI interviewer is speaking...';

      speech.onend = () => {
        speaking = false;
        status.textContent = 'Waiting for your answer';
      };

      speech.onerror = () => {
        speaking = false;
        status.textContent = 'Ready';
      };

      window.speechSynthesis.speak(speech);
    }

    async function startCamera() {
      try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });

        video.srcObject = cameraStream;

        document.getElementById('camera-message').textContent =
          'Camera and microphone are enabled.';

        return true;
      } catch (error) {
        document.getElementById('camera-message').textContent =
          'Camera permission denied. You can still type answers.';
        return false;
      }
    }

    document.getElementById('start-camera').addEventListener('click', async () => {
      await startCamera();

      currentQuestion = 0;
      answers = [];
      updateQuestion();

      speak(questionTextValue(questions[currentQuestion]));
    });

    document.getElementById('camera-btn').addEventListener('click', async () => {
      if (!cameraStream) {
        await startCamera();
        return;
      }

      const track = cameraStream.getVideoTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        document.getElementById('camera-message').textContent =
          track.enabled ? 'Camera is ON' : 'Camera is OFF';
      }
    });

    document.getElementById('mic-btn').addEventListener('click', () => {
      if (!cameraStream) return;

      const track = cameraStream.getAudioTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        document.getElementById('camera-message').textContent =
          track.enabled ? 'Microphone is ON' : 'Microphone is OFF';
      }
    });

    document.getElementById('speak-question').addEventListener('click', () => {
      if (questions[currentQuestion]) {
        speak(questionTextValue(questions[currentQuestion]));
      }
    });

    document.getElementById('start-speaking').addEventListener('click', () => {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!SpeechRecognition) {
        alert('Speech recognition is not supported. Please use Chrome.');
        return;
      }

      if (recognition && isListening) {
        recognition.stop();
        return;
      }

      recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        isListening = true;
        status.textContent = 'Listening to your answer...';
      };

      recognition.onresult = event => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        answerBox.value = transcript;
      };

      recognition.onend = () => {
        isListening = false;
        answers[currentQuestion] = answerBox.value;
        status.textContent = 'Answer recorded';
      };

      recognition.onerror = () => {
        isListening = false;
        status.textContent = 'Speech recognition error';
      };

      recognition.start();
    });

    nextButton.addEventListener('click', async () => {
      answers[currentQuestion] = answerBox.value.trim();

      if (!answers[currentQuestion]) {
        alert('Please answer the question first.');
        return;
      }

      if (currentQuestion < questions.length - 1) {
        currentQuestion++;
        updateQuestion();
        speak(questionTextValue(questions[currentQuestion]));
        return;
      }

      nextButton.disabled = true;
      nextButton.textContent = 'Submitting...';

      try {
        const result = await customFetch('/api/interview', {
          method: 'POST',
          body: JSON.stringify({
            type: interviewType,
            role,
            questions: questions.map(questionTextValue),
            answers
          })
        });

        const resultBox = document.getElementById('interview-result');
        resultBox.hidden = false;

        resultBox.innerHTML = `
          <h2>Interview Report</h2>
          <div class="stat-value">${result.score || 0}/100</div>
          <h3>Strengths</h3>
          ${(result.strengths || []).map(item =>
            `<div class="result-item pass">${item}</div>`
          ).join('')}
          <h3>Areas to improve</h3>
          ${(result.weaknesses || []).map(item =>
            `<div class="result-item fail">${item}</div>`
          ).join('')}
          <h3>Suggestions</h3>
          ${(result.tips || []).map(item =>
            `<div class="result-item">${item}</div>`
          ).join('')}
        `;

        document.getElementById('interview-message').className = 'message success';
        document.getElementById('interview-message').textContent =
          'Interview completed successfully!';

        status.textContent = 'Interview completed';

      } catch (error) {
        document.getElementById('interview-message').className = 'message error';
        document.getElementById('interview-message').textContent = error.message;
        nextButton.disabled = false;
        nextButton.textContent = 'Retry Submission';
      }

      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
      }

      window.speechSynthesis?.cancel();
      speaking = false;
    });

    document.getElementById('avatar-gender').addEventListener('change', event => {
      gender = event.target.value;
      window.speechSynthesis?.cancel();
      speaking = false;

      // Rebuild the 3D avatar with the selected appearance.
      if (animationId) cancelAnimationFrame(animationId);
      if (avatarRenderer) avatarRenderer.dispose();

      avatarScene = null;
      avatarRenderer = null;
      avatarHead = null;
      avatarMouth = null;

      createAvatar();
    });

    document.getElementById('role-select').addEventListener('change', event => {
      role = event.target.value;
    });

    document.getElementById('type-select').addEventListener('change', event => {
      interviewType = event.target.value;
      questions = questionData[interviewType] || [];
      currentQuestion = 0;
      answers = [];
      updateQuestion();
    });

  } catch (error) {
    main.innerHTML = `
      <div class="card">
        <h2>Interview unavailable</h2>
        <p>${error.message}</p>
      </div>
    `;
  }
}

async function renderReports(main) {
  try {
    const data = await customFetch('/api/dashboard');
    main.innerHTML = `
      <section class="module-header">
        <h2>Performance report</h2>
      </section>
      <div class="card">
        <div class="stat-value">${data.overall || 0}</div>
        <div class="label">Overall score</div>
        <div class="metric-list mt-12">
          ${Object.entries(data.SCORES || {}).map(([label, value]) => `
            <div class="metric-item">
              <div class="label">${label}</div>
              <div style="font-size:1.2rem; font-weight:700; margin-top:8px;">${value}/100</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } catch (error) {
    main.innerHTML = `<div class="card"><h2>Reports unavailable</h2><p>${error.message}</p></div>`;
  }
}

async function renderAdmin(main) {
  if (!state.user?.is_admin) {
    main.innerHTML = `<div class="card"><h2>Access denied</h2><p>You do not have admin permissions.</p></div>`;
    return;
  }

  main.innerHTML = `
    <section class="module-header">
      <h2>Admin controls</h2>
    </section>
    <div class="grid grid-2">
      <div class="card">
        <form id="admin-form" class="form-grid">
          <div class="field">
            <label for="admin-cat">Category</label>
            <select id="admin-cat">
              <option>Quantitative</option>
              <option>Logical</option>
              <option>Verbal</option>
            </select>
          </div>
          <div class="field">
            <label for="admin-question">Question</label>
            <textarea id="admin-question" required></textarea>
          </div>
          <div class="field">
            <label for="admin-options">Options (one per line)</label>
            <textarea id="admin-options" required></textarea>
          </div>
          <div class="field">
            <label for="admin-answer">Correct option index (1-based)</label>
            <input id="admin-answer" type="number" min="1" value="1" />
          </div>
          <div class="field">
            <label for="admin-expl">Explanation</label>
            <textarea id="admin-expl"></textarea>
          </div>
          <button type="submit" class="primary-btn">Add question</button>
        </form>
        <div id="admin-message"></div>
      </div>

      <div class="card">
        <div class="label">Admin notes</div>
        <ul class="list mt-12">
          <li><span>Use this form to create new aptitude questions.</span></li>
          <li><span>Each option should be on its own line, and the answer index is 1-based.</span></li>
          <li><span>Questions appear immediately in the aptitude section.</span></li>
        </ul>
      </div>
    </div>
  `;

  document.getElementById('admin-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = new URLSearchParams({
      cat: document.getElementById('admin-cat').value,
      q: document.getElementById('admin-question').value,
      options: document.getElementById('admin-options').value,
      answer: String(document.getElementById('admin-answer').value),
      expl: document.getElementById('admin-expl').value,
    });

    try {
      const response = await fetch(`${API_BASE}/admin`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: payload.toString(),
      });
      const text = await response.text();
      if (!response.ok) {
        throw new Error(text || 'Failed to add question');
      }
      document.getElementById('admin-message').className = 'message success';
      document.getElementById('admin-message').textContent = 'Question added successfully.';
      document.getElementById('admin-form').reset();
    } catch (error) {
      document.getElementById('admin-message').className = 'message error';
      document.getElementById('admin-message').textContent = error.message;
    }
  });
}

(async function init() {
  await loadUser();
  renderShell();
  renderView();
})();
