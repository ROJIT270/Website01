/**
 * script.js - Full client-side implementation
 * - Theme (light/dark)
 * - Navigation + hamburger
 * - Projects (load from projects.json with fallback)
 * - Project modal with focus trap
 * - Skills animation & toggle
 * - Experience posts (admin-only creation; visitors can like)
 * - Admin auth (client-side, localStorage) for managing posts
 * - Contact form: integrated with Formspree endpoint (AJAX + non-JS fallback)
 * - CV (download simulation + print)
 * - Scroll & interaction effects (parallax, profile tilt, navbar shrink)
 * - Reveal on scroll + scroll progress
 *
 * NOTE: This is a client-side site for demo/personal use. Admin auth is stored in localStorage,
 * which is NOT secure for production. For production, use server-side authentication and a server to
 * persist posts and admin credentials.
 */

/* ===========================
   Configuration
   =========================== */
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mpqwvbwy';
const ADMIN_PASS_KEY = 'portfolio-admin-pass';
const ADMIN_AUTH_KEY = 'portfolio-admin-auth';

/* ===========================
   State
   =========================== */
const state = {
  projects: [],
  filteredProjects: [],
  currentFilter: 'all',
  posts: [],
  editingPostId: null,
  theme: 'light',
  skillViewMode: 'percent'
};

/* ===========================
   Initialization
   =========================== */
document.addEventListener('DOMContentLoaded', () => {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  initTheme();
  initNav();
  initProjects();
  initSkills();
  initPosts();
  initContact(); // Formspree integration
  initCV();
  initObservers();
  initScrollEffects();
  initAdmin();
});

/* ===========================
   Admin helpers
   =========================== */
function isAdmin() {
  return localStorage.getItem(ADMIN_AUTH_KEY) === 'true';
}

function setAdminAuthenticated(val) {
  if (val) localStorage.setItem(ADMIN_AUTH_KEY, 'true');
  else localStorage.removeItem(ADMIN_AUTH_KEY);
  updateAdminUI();
}

/* ===========================
   Admin UI + Flow
   =========================== */
function initAdmin() {
  const adminBtn = document.getElementById('admin-toggle');
  if (!adminBtn) return;

  adminBtn.addEventListener('click', () => {
    if (isAdmin()) {
      if (confirm('Log out of admin mode?')) {
        setAdminAuthenticated(false);
        alert('Logged out of admin mode.');
      }
      return;
    }

    const storedPass = localStorage.getItem(ADMIN_PASS_KEY);
    if (!storedPass) {
      const p1 = prompt('No admin password set. Create a new admin password:');
      if (!p1) return;
      const p2 = prompt('Confirm admin password:');
      if (p1 !== p2) {
        alert('Passwords did not match — try again.');
        return;
      }
      localStorage.setItem(ADMIN_PASS_KEY, p1);
      localStorage.setItem(ADMIN_AUTH_KEY, 'true');
      alert('Admin password set. You are now logged in as admin.');
      updateAdminUI();
      return;
    }

    const attempt = prompt('Enter admin password:');
    if (!attempt) return;
    if (attempt === storedPass) {
      setAdminAuthenticated(true);
      alert('Admin login successful.');
    } else {
      alert('Incorrect password.');
    }
  });

  updateAdminUI();
}

function updateAdminUI() {
  const panel = document.getElementById('admin-post-panel');
  const adminBtn = document.getElementById('admin-toggle');
  if (isAdmin()) {
    if (panel) {
      panel.removeAttribute('aria-hidden');
      panel.style.display = 'flex';
    }
    if (adminBtn) adminBtn.textContent = 'Admin (Logout)';
  } else {
    if (panel) {
      panel.setAttribute('aria-hidden', 'true');
      panel.style.display = 'none';
    }
    if (adminBtn) adminBtn.textContent = 'Admin';
  }

  // Re-render posts so edit/delete controls reflect admin state
  renderPosts();
}

/* ===========================
   Theme Management
   =========================== */
function initTheme() {
  const saved = localStorage.getItem('portfolio-theme');
  const system = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  state.theme = saved || system;
  applyTheme(state.theme);

  const btn = document.getElementById('theme-toggle');
  const footerBtn = document.getElementById('footer-theme-toggle');
  if (btn) btn.addEventListener('click', toggleTheme);
  if (footerBtn) footerBtn.addEventListener('click', toggleTheme);

  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem('portfolio-theme')) {
        state.theme = e.matches ? 'dark' : 'light';
        applyTheme(state.theme);
      }
    });
  }
}

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  const icon = document.querySelector('#theme-toggle i');
  if (icon) icon.className = t === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  const footerBtn = document.getElementById('footer-theme-toggle');
  if (footerBtn) footerBtn.innerHTML = t === 'dark' ? '<i class="fas fa-sun"></i> Light' : '<i class="fas fa-moon"></i> Dark';
}

function toggleTheme() {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  applyTheme(state.theme);
  localStorage.setItem('portfolio-theme', state.theme);
}

/* ===========================
   Navigation
   =========================== */
function initNav() {
  const hamburger = document.querySelector('.hamburger');
  const nav = document.getElementById('nav-menu');
  if (hamburger && nav) {
    hamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      hamburger.classList.toggle('active');
      nav.classList.toggle('active');
      const expanded = hamburger.classList.contains('active');
      hamburger.setAttribute('aria-expanded', expanded);
    });

    document.addEventListener('click', (e) => {
      if (!nav.contains(e.target) && !hamburger.contains(e.target)) {
        hamburger.classList.remove('active');
        nav.classList.remove('active');
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const id = link.getAttribute('href');
      const el = document.querySelector(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (hamburger && nav) { hamburger.classList.remove('active'); nav.classList.remove('active'); hamburger.setAttribute('aria-expanded', 'false'); }
    });
  });
}

/* ===========================
   Projects
   =========================== */
async function initProjects() {
  try {
    const res = await fetch('projects.json');
    if (!res.ok) throw new Error('no projects.json');
    const data = await res.json();
    state.projects = Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('projects.json not found — using demo', err);
    state.projects = demoProjects();
  }
  state.filteredProjects = state.projects.slice();
  renderProjects();
  renderFilterTags();
  initProjectSearch();
}

function demoProjects() {
  return [
    {
      id: 101,
      title: "Demo Shop",
      description: "Demo e-commerce site.",
      fullDescription: "Demo full description with features.",
      tags: ["React", "Node.js"],
      image: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 400'%3E%3Crect width='600' height='400' fill='%234f46e5'/%3E%3Ctext x='50%25' y='50%25' fill='white' font-size='32' text-anchor='middle' dominant-baseline='middle'%3EDemo Shop%3C/text%3E%3C/svg%3E",
      github: "#",
      demo: "#"
    }
  ];
}

function renderProjects() {
  const grid = document.getElementById('projects-grid');
  if (!grid) return;
  grid.innerHTML = '';
  if (!state.filteredProjects.length) {
    grid.innerHTML = '<p class="muted">No projects found.</p>';
    return;
  }
  state.filteredProjects.forEach(p => {
    const card = document.createElement('article');
    card.className = 'project-card';
    card.tabIndex = 0;
    card.innerHTML = `
      <img loading="lazy" class="project-thumbnail" src="${p.image || defaultProjectImage(p.title)}" alt="${escapeHtml(p.title)}">
      <div class="project-content">
        <h3 class="project-title">${escapeHtml(p.title)}</h3>
        <p class="project-description">${escapeHtml(p.description)}</p>
        <div class="project-tags">${(p.tags || []).map(t => `<span class="project-tag">${escapeHtml(t)}</span>`).join('')}</div>
      </div>
    `;
    card.addEventListener('click', () => openProjectModal(p));
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openProjectModal(p); } });
    grid.appendChild(card);
  });
}

function defaultProjectImage(title) {
  const txt = encodeURIComponent(title || 'Project');
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 360'%3E%3Crect width='600' height='360' fill='%2306b6d4'/%3E%3Ctext x='50%25' y='50%25' fill='white' font-family='Arial' font-size='32' text-anchor='middle' dominant-baseline='middle'%3E${txt}%3C/text%3E%3C/svg%3E`;
}

function renderFilterTags() {
  const container = document.getElementById('filter-tags');
  if (!container) return;
  container.innerHTML = '';
  const set = new Set();
  state.projects.forEach(p => (p.tags || []).forEach(t => set.add(t)));
  set.forEach(tag => {
    const btn = document.createElement('button');
    btn.className = 'filter-tag';
    btn.textContent = tag;
    btn.type = 'button';
    btn.addEventListener('click', () => {
      toggleFilter(tag, btn);
    });
    container.appendChild(btn);
  });
}

function toggleFilter(tag, btn) {
  const buttons = document.querySelectorAll('.filter-tag');
  if (state.currentFilter === tag) {
    state.currentFilter = 'all';
    buttons.forEach(b => b.classList.remove('active'));
    state.filteredProjects = state.projects.slice();
  } else {
    state.currentFilter = tag;
    buttons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.filteredProjects = state.projects.filter(p => (p.tags || []).includes(tag));
  }
  renderProjects();
}

function initProjectSearch() {
  const input = document.getElementById('search-projects');
  if (!input) return;
  input.addEventListener('input', debounce((e) => {
    const q = (e.target.value || '').toLowerCase().trim();
    const pool = state.currentFilter === 'all' ? state.projects : state.projects.filter(p => (p.tags || []).includes(state.currentFilter));
    state.filteredProjects = pool.filter(p => (p.title || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q) || (p.tags || []).some(t => t.toLowerCase().includes(q)));
    renderProjects();
  }, 180));
}

/* ===========================
   Project modal (accessible with focus trap)
   =========================== */
let lastFocused = null;
function openProjectModal(project) {
  const modal = document.getElementById('project-modal');
  const body = document.getElementById('modal-body');
  if (!modal || !body) return;
  lastFocused = document.activeElement;

  body.innerHTML = `
    <div class="modal-grid">
      <img class="modal-image" src="${project.image || defaultProjectImage(project.title)}" alt="${escapeHtml(project.title)}">
      <div class="modal-content-inner">
        <h2 id="modal-title">${escapeHtml(project.title)}</h2>
        <p>${escapeHtml(project.fullDescription || project.description || '')}</p>
        <div class="project-tags">${(project.tags || []).map(t => `<span class="project-tag">${escapeHtml(t)}</span>`).join('')}</div>
        <div class="modal-links">
          ${project.github ? `<a class="btn btn-primary" href="${project.github}" target="_blank" rel="noopener noreferrer"><i class="fab fa-github"></i> View Code</a>` : ''}
          ${project.demo ? `<a class="btn btn-ghost" href="${project.demo}" target="_blank" rel="noopener noreferrer"><i class="fas fa-external-link-alt"></i> Live Demo</a>` : ''}
        </div>
      </div>
    </div>
  `;

  modal.setAttribute('aria-hidden', 'false');
  modal.style.display = 'flex';
  setTimeout(() => modal.setAttribute('open', ''), 20);
  document.body.style.overflow = 'hidden';

  const closeBtn = modal.querySelector('.modal-close');
  closeBtn && closeBtn.focus();
  trapFocus(modal);
}

function closeProjectModal() {
  const modal = document.getElementById('project-modal');
  if (!modal) return;
  modal.removeAttribute('open');
  modal.setAttribute('aria-hidden', 'true');
  modal.style.display = 'none';
  document.body.style.overflow = '';
  if (lastFocused) lastFocused.focus();
}
document.addEventListener('click', (e) => {
  const modal = document.getElementById('project-modal');
  if (!modal) return;
  if (e.target === modal) closeProjectModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modal = document.getElementById('project-modal');
    if (modal && modal.getAttribute('aria-hidden') === 'false') closeProjectModal();
  }
});
document.addEventListener('DOMContentLoaded', () => {
  const closeBtn = document.querySelector('.modal-close');
  if (closeBtn) closeBtn.addEventListener('click', closeProjectModal);
});
function trapFocus(container) {
  const focusable = container.querySelectorAll('a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])');
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  function keyHandler(e) {
    if (e.key !== 'Tab') return;
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  container.addEventListener('keydown', keyHandler);
  container._removeTrap = () => container.removeEventListener('keydown', keyHandler);
}

/* ===========================
   Skills
   =========================== */
function initSkills() {
  document.querySelectorAll('.skill-progress').forEach((bar) => {
    const w = bar.style.width || bar.dataset.targetWidth || '0%';
    bar.dataset.targetWidth = w;
    bar.style.width = '0';
  });
  const btn = document.getElementById('toggle-skill-view');
  if (btn) btn.addEventListener('click', toggleSkillView);
}

function toggleSkillView() {
  state.skillViewMode = state.skillViewMode === 'percent' ? 'level' : 'percent';
  document.querySelectorAll('.skill-card').forEach((card) => {
    const valEl = card.querySelector('.skill-value');
    const prog = card.querySelector('.skill-progress');
    if (!valEl || !prog) return;
    const percent = prog.dataset.targetWidth || prog.style.width || '';
    const level = prog.dataset.level || prog.getAttribute('data-level') || '';
    valEl.textContent = state.skillViewMode === 'level' ? (level || percent) : (percent || level);
  });
}

function animateSkillBars() {
  document.querySelectorAll('.skill-progress').forEach((bar, i) => {
    const target = bar.dataset.targetWidth || '0%';
    setTimeout(() => bar.style.width = target, i * 80);
  });
}

/* ===========================
   Experience Sharing (Posts)
   - Only admin can create/edit/delete posts (client-side)
   - Visitors can view and like posts
   =========================== */
function initPosts() {
  const saved = localStorage.getItem('portfolio-posts');
  try { state.posts = saved ? JSON.parse(saved) : seedPosts(); } catch { state.posts = seedPosts(); }
  renderPosts();
  updateAdminUI();
  const addBtn = document.getElementById('add-post');
  if (addBtn) addBtn.addEventListener('click', addPost);
}

function seedPosts() {
  return [
    { id: Date.now() - 3000, content: "Just learned CSS Grid — life-changing!", date: new Date(Date.now() - 86400000 * 3).toISOString(), likes: 5 },
    { id: Date.now() - 2000, content: "Step away to debug sometimes — it helps.", date: new Date(Date.now() - 86400000 * 2).toISOString(), likes: 12 }
  ];
}

function savePosts() { localStorage.setItem('portfolio-posts', JSON.stringify(state.posts)); }

function renderPosts() {
  const c = document.getElementById('posts-container');
  if (!c) return;
  c.innerHTML = '';
  const sorted = [...state.posts].sort((a, b) => new Date(b.date) - new Date(a.date));
  sorted.forEach(p => {
    const card = document.createElement('div');
    card.className = 'post-card';
    card.dataset.postId = p.id;

    const editDeleteHtml = isAdmin() ? `
      <button aria-label="edit" onclick="editPost(${p.id})"><i class="fas fa-edit"></i></button>
      <button aria-label="delete" onclick="deletePost(${p.id})"><i class="fas fa-trash"></i></button>
    ` : '';

    card.innerHTML = `
      <div class="post-header">
        <span class="post-date">${new Date(p.date).toLocaleDateString()}</span>
        <div class="post-actions">
          <button aria-label="like" onclick="likePost(${p.id})"><i class="fas fa-heart ${p.liked ? 'liked' : ''}"></i> ${p.likes || 0}</button>
          ${editDeleteHtml}
        </div>
      </div>
      <div class="post-body"><p>${escapeHtml(p.content)}</p></div>
    `;
    c.appendChild(card);
  });
}

function addPost() {
  if (!isAdmin()) {
    alert('Only the site owner (admin) can add posts.');
    return;
  }
  const ta = document.getElementById('post-content');
  if (!ta) return;
  const content = ta.value.trim();
  if (!content) { alert('Please write something.'); return; }
  const newP = { id: Date.now(), content, date: new Date().toISOString(), likes: 0, liked: false };
  state.posts.unshift(newP);
  savePosts();
  renderPosts();
  ta.value = '';
}

function likePost(id) {
  const p = state.posts.find(x => x.id === id); if (!p) return;
  p.liked = !p.liked; p.likes = (p.likes || 0) + (p.liked ? 1 : -1);
  savePosts(); renderPosts();
}
function editPost(id) {
  if (!isAdmin()) { alert('Only admin can edit posts.'); return; }
  const p = state.posts.find(x => x.id === id); if (!p) return;
  const val = prompt('Edit post', p.content);
  if (val !== null) { p.content = val; savePosts(); renderPosts(); }
}
function deletePost(id) {
  if (!isAdmin()) { alert('Only admin can delete posts.'); return; }
  if (confirm('Delete post?')) { state.posts = state.posts.filter(x => x.id !== id); savePosts(); renderPosts(); }
}

/* ===========================
   Contact (Formspree integration)
   - Sends JSON to FORMSPREE_ENDPOINT
   - Form has action for non-JS fallback
   =========================== */
function initContact() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.action = FORMSPREE_ENDPOINT;
  form.method = 'POST';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector('button[type="submit"]');

    const inputs = form.querySelectorAll('input, textarea');
    let ok = true;
    inputs.forEach(input => { if (!validateField(input)) ok = false; });
    if (!ok) return;

    const payload = {
      name: form.name.value || '',
      email: form.email.value || '',
      subject: form.subject.value || '',
      message: form.message.value || ''
    };

    // Honeypot
    const gotcha = form.querySelector('input[name="_gotcha"]');
    if (gotcha && gotcha.value) return;

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.dataset.origText = submitBtn.textContent;
      submitBtn.textContent = 'Sending...';
    }

    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        alert('Message sent — thank you!');
        form.reset();
      } else {
        if (data && data.errors && Array.isArray(data.errors)) {
          alert('Submission error: ' + data.errors.map(err => err.message).join('; '));
        } else if (data && data.error) {
          alert('Submission error: ' + data.error);
        } else {
          alert('An error occurred sending your message. Please try again later.');
        }
      }
    } catch (err) {
      console.error('Form submit failed', err);
      alert('Network error while sending message. Please try again or email directly.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = submitBtn.dataset.origText || 'Send Message';
        delete submitBtn.dataset.origText;
      }
    }
  });
}

function validateField(field) {
  if (!field) return true;
  const group = field.parentElement;
  const err = group ? group.querySelector('.error-message') : null;
  let message = '';

  if (field.hasAttribute('required') && !field.value.trim()) {
    message = 'This field is required';
  } else if (field.type === 'email' && field.value) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(field.value)) message = 'Enter a valid email';
  }

  if (message) {
    if (group) group.classList.add('error');
    if (err) err.textContent = message;
    return false;
  } else {
    if (group) group.classList.remove('error');
    if (err) err.textContent = '';
    return true;
  }
}

/* ===========================
   CV (download simulation + print)
   =========================== */
function initCV() {
  const dl = document.getElementById('download-cv');
  const pr = document.getElementById('print-cv');
  if (dl) dl.addEventListener('click', () => { alert('Download simulated (replace link in script to enable actual CV download).'); });
  if (pr) pr.addEventListener('click', () => window.print());
}

/* ===========================
   Observers & scroll effects
   =========================== */
function initObservers() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('in-view'); obs.unobserve(entry.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));

  const skills = document.querySelector('.skills');
  if (skills) {
    const sObs = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) animateSkillBars(); });
    }, { threshold: 0.3 });
    sObs.observe(skills);
  }
}

let lastY = 0, ticking = false;
function initScrollEffects() {
  window.addEventListener('scroll', (e) => {
    lastY = window.scrollY || window.pageYOffset;
    if (!ticking) requestAnimationFrame(() => { applyScroll(lastY); ticking = false; });
    ticking = true;
    updateProgress();
  }, { passive: true });

  const wrap = document.querySelector('.hero-image[data-parallax]');
  const img = document.getElementById('profile-img');
  if (wrap && img) {
    wrap.addEventListener('mousemove', (ev) => profileTilt(ev, wrap, img));
    wrap.addEventListener('mouseleave', () => resetTilt(img));
    wrap.addEventListener('mousedown', () => img.classList.add('tilt'));
    wrap.addEventListener('mouseup', () => img.classList.remove('tilt'));
  }
}

function applyScroll(y) {
  const heroBg = document.querySelector('.hero-bg');
  if (heroBg) heroBg.style.transform = `translateX(-50%) translateY(${y * 0.12}px)`;
  const heroImage = document.querySelector('.hero-image[data-parallax]');
  if (heroImage) heroImage.style.transform = `translateY(${y * 0.04}px)`;
  const heroText = document.querySelector('.hero-left');
  const heroH = document.querySelector('.hero')?.clientHeight || 700;
  if (heroText) {
    const pct = Math.min(y / (heroH * 0.7), 1);
    heroText.style.opacity = `${1 - pct * 0.12}`;
    heroText.style.transform = `translateY(${pct * 6}px)`;
  }
  const navbar = document.getElementById('navbar');
  if (navbar) { if (y > 48) navbar.classList.add('scrolled'); else navbar.classList.remove('scrolled'); }
}

function updateProgress() {
  const total = document.documentElement.scrollHeight - window.innerHeight;
  const cur = window.scrollY || window.pageYOffset;
  const pct = total ? (cur / total) * 100 : 0;
  const bar = document.getElementById('scroll-progress');
  if (bar) bar.style.width = `${pct}%`;
}

function profileTilt(e, wrapper, img) {
  const rect = wrapper.getBoundingClientRect();
  const x = (e.clientX - rect.left) - rect.width / 2;
  const y = (e.clientY - rect.top) - rect.height / 2;
  const rx = clamp(-(y / (rect.height / 2)) * 4, -6, 6);
  const ry = clamp((x / (rect.width / 2)) * 4, -6, 6);
  img.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.02)`;
  img.style.transition = 'transform .08s linear';
}
function resetTilt(img) { img.style.transform = ''; img.style.transition = 'transform .25s ease'; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

/* ===========================
   Utilities
   =========================== */
function escapeHtml(s) { if (!s) return ''; return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }
function debounce(fn, wait = 150) { let t; return function (...a) { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), wait); }; }