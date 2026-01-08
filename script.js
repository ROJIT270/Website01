/**
 * script.js - Full client-side implementation
 * - Theme (light/dark)
 * - Navigation + hamburger
 * - Projects (load from projects.json with fallback)
 * - Project modal with focus trap
 * - Skills animation & toggle
 * - OffTopic Blog (admin-only creation; visitors can view and like)
 * - Admin auth (client-side, localStorage) for managing blogs
 * - Contact form: integrated with Formspree endpoint (AJAX + non-JS fallback)
 * - CV (download simulation + print)
 * - Scroll & interaction effects (parallax, profile tilt, navbar shrink)
 * - Reveal on scroll + scroll progress
 */

/* ===========================
   Configuration
   =========================== */
const FORMSPREE_ENDPOINT = "https://formspree.io/f/mpqwvbwy"
const ADMIN_PASS_KEY = "portfolio-admin-pass"
const ADMIN_AUTH_KEY = "portfolio-admin-auth"

/* ===========================
   State
   =========================== */
const state = {
  projects: [],
  filteredProjects: [],
  currentFilter: "all",
  blogs: [],
  currentBlogId: null,
  theme: "light",
  skillViewMode: "percent",
}

/* ===========================
   Initialization
   =========================== */
document.addEventListener("DOMContentLoaded", () => {
  const yearEl = document.getElementById("year")
  if (yearEl) yearEl.textContent = new Date().getFullYear()

  initTheme()
  initNav()
  initProjects()
  initSkills()
  initBlogs() // renamed from initPosts
  initContact()
  initCV()
  initObservers()
  initScrollEffects()
  initAdmin()
})

/* ===========================
   Admin helpers
   =========================== */
function isAdmin() {
  return localStorage.getItem(ADMIN_AUTH_KEY) === "true"
}

function setAdminAuthenticated(val) {
  if (val) localStorage.setItem(ADMIN_AUTH_KEY, "true")
  else localStorage.removeItem(ADMIN_AUTH_KEY)
  updateAdminUI()
}

/* ===========================
   Admin UI + Flow
   =========================== */
function initAdmin() {
  const adminBtn = document.getElementById("admin-toggle")
  if (!adminBtn) return

  adminBtn.addEventListener("click", () => {
    if (isAdmin()) {
      if (confirm("Log out of admin mode?")) {
        setAdminAuthenticated(false)
        alert("Logged out of admin mode.")
      }
      return
    }

    const storedPass = localStorage.getItem(ADMIN_PASS_KEY)
    if (!storedPass) {
      const p1 = prompt("No admin password set. Create a new admin password:")
      if (!p1) return
      const p2 = prompt("Confirm admin password:")
      if (p1 !== p2) {
        alert("Passwords did not match — try again.")
        return
      }
      localStorage.setItem(ADMIN_PASS_KEY, p1)
      localStorage.setItem(ADMIN_AUTH_KEY, "true")
      alert("Admin password set. You are now logged in as admin.")
      updateAdminUI()
      return
    }

    const attempt = prompt("Enter admin password:")
    if (!attempt) return
    if (attempt === storedPass) {
      setAdminAuthenticated(true)
      alert("Admin login successful.")
    } else {
      alert("Incorrect password.")
    }
  })

  updateAdminUI()
}

function updateAdminUI() {
  const panel = document.getElementById("admin-blog-panel")
  const adminBtn = document.getElementById("admin-toggle")
  if (isAdmin()) {
    if (panel) {
      panel.removeAttribute("aria-hidden")
      panel.style.display = "flex"
    }
    if (adminBtn) adminBtn.textContent = "Admin (Logout)"
  } else {
    if (panel) {
      panel.setAttribute("aria-hidden", "true")
      panel.style.display = "none"
    }
    if (adminBtn) adminBtn.textContent = "Admin"
  }

  renderBlogs()
}

/* ===========================
   Theme Management
   =========================== */
function initTheme() {
  const saved = localStorage.getItem("portfolio-theme")
  const system = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  state.theme = saved || system
  applyTheme(state.theme)

  const btn = document.getElementById("theme-toggle")
  const footerBtn = document.getElementById("footer-theme-toggle")
  if (btn) btn.addEventListener("click", toggleTheme)
  if (footerBtn) footerBtn.addEventListener("click", toggleTheme)

  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
      if (!localStorage.getItem("portfolio-theme")) {
        state.theme = e.matches ? "dark" : "light"
        applyTheme(state.theme)
      }
    })
  }
}

function applyTheme(t) {
  document.documentElement.setAttribute("data-theme", t)
  const icon = document.querySelector("#theme-toggle i")
  if (icon) icon.className = t === "dark" ? "fas fa-sun" : "fas fa-moon"
  const footerBtn = document.getElementById("footer-theme-toggle")
  if (footerBtn)
    footerBtn.innerHTML = t === "dark" ? '<i class="fas fa-sun"></i> Light' : '<i class="fas fa-moon"></i> Dark'
}

function toggleTheme() {
  state.theme = state.theme === "light" ? "dark" : "light"
  applyTheme(state.theme)
  localStorage.setItem("portfolio-theme", state.theme)
}

/* ===========================
   Navigation
   =========================== */
function initNav() {
  const hamburger = document.querySelector(".hamburger")
  const nav = document.getElementById("nav-menu")
  if (hamburger && nav) {
    hamburger.addEventListener("click", (e) => {
      e.stopPropagation()
      hamburger.classList.toggle("active")
      nav.classList.toggle("active")
      const expanded = hamburger.classList.contains("active")
      hamburger.setAttribute("aria-expanded", expanded)
    })

    document.addEventListener("click", (e) => {
      if (!nav.contains(e.target) && !hamburger.contains(e.target)) {
        hamburger.classList.remove("active")
        nav.classList.remove("active")
        hamburger.setAttribute("aria-expanded", "false")
      }
    })
  }

  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault()
      const id = link.getAttribute("href")
      const el = document.querySelector(id)
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
      if (hamburger && nav) {
        hamburger.classList.remove("active")
        nav.classList.remove("active")
        hamburger.setAttribute("aria-expanded", "false")
      }
    })
  })
}

/* ===========================
   Projects
   =========================== */
async function initProjects() {
  try {
    const res = await fetch("projects.json")
    if (!res.ok) throw new Error("no projects.json")
    const data = await res.json()
    state.projects = Array.isArray(data) ? data : []
  } catch (err) {
    console.warn("projects.json not found — using demo", err)
    state.projects = demoProjects()
  }
  state.filteredProjects = state.projects.slice()
  renderProjects()
  renderFilterTags()
  initProjectSearch()
}

function demoProjects() {
  return [
    {
      id: 101,
      title: "Demo Shop",
      description: "Demo e-commerce site.",
      fullDescription: "Demo full description with features.",
      tags: ["React", "Node.js"],
      image:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 400'%3E%3Crect width='600' height='400' fill='%234f46e5'/%3E%3Ctext x='50%25' y='50%25' fill='white' font-size='32' text-anchor='middle' dominant-baseline='middle'%3EDemo Shop%3C/text%3E%3C/svg%3E",
      github: "#",
      demo: "#",
    },
  ]
}

function renderProjects() {
  const grid = document.getElementById("projects-grid")
  if (!grid) return
  grid.innerHTML = ""
  if (!state.filteredProjects.length) {
    grid.innerHTML = '<p class="muted">No projects found.</p>'
    return
  }
  state.filteredProjects.forEach((p) => {
    const card = document.createElement("article")
    card.className = "project-card"
    card.tabIndex = 0
    card.innerHTML = `
      <img loading="lazy" class="project-thumbnail" src="${p.image || defaultProjectImage(p.title)}" alt="${escapeHtml(p.title)}">
      <div class="project-content">
        <h3 class="project-title">${escapeHtml(p.title)}</h3>
        <p class="project-description">${escapeHtml(p.description)}</p>
        <div class="project-tags">${(p.tags || []).map((t) => `<span class="project-tag">${escapeHtml(t)}</span>`).join("")}</div>
      </div>
    `
    card.addEventListener("click", () => openProjectModal(p))
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        openProjectModal(p)
      }
    })
    grid.appendChild(card)
  })
}

function defaultProjectImage(title) {
  const txt = encodeURIComponent(title || "Project")
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 360'%3E%3Crect width='600' height='360' fill='%2306b6d4'/%3E%3Ctext x='50%25' y='50%25' fill='white' font-family='Arial' font-size='32' text-anchor='middle' dominant-baseline='middle'%3E${txt}%3C/text%3E%3C/svg%3E`
}

function renderFilterTags() {
  const container = document.getElementById("filter-tags")
  if (!container) return
  container.innerHTML = ""
  const set = new Set()
  state.projects.forEach((p) => (p.tags || []).forEach((t) => set.add(t)))
  set.forEach((tag) => {
    const btn = document.createElement("button")
    btn.className = "filter-tag"
    btn.textContent = tag
    btn.type = "button"
    btn.addEventListener("click", () => {
      toggleFilter(tag, btn)
    })
    container.appendChild(btn)
  })
}

function toggleFilter(tag, btn) {
  const buttons = document.querySelectorAll(".filter-tag")
  if (state.currentFilter === tag) {
    state.currentFilter = "all"
    buttons.forEach((b) => b.classList.remove("active"))
    state.filteredProjects = state.projects.slice()
  } else {
    state.currentFilter = tag
    buttons.forEach((b) => b.classList.remove("active"))
    btn.classList.add("active")
    state.filteredProjects = state.projects.filter((p) => (p.tags || []).includes(tag))
  }
  renderProjects()
}

function initProjectSearch() {
  const input = document.getElementById("search-projects")
  if (!input) return
  input.addEventListener(
    "input",
    debounce((e) => {
      const q = (e.target.value || "").toLowerCase().trim()
      const pool =
        state.currentFilter === "all"
          ? state.projects
          : state.projects.filter((p) => (p.tags || []).includes(state.currentFilter))
      state.filteredProjects = pool.filter(
        (p) =>
          (p.title || "").toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q) ||
          (p.tags || []).some((t) => t.toLowerCase().includes(q)),
      )
      renderProjects()
    }, 180),
  )
}

/* ===========================
   Project modal (accessible with focus trap)
   =========================== */
let lastFocused = null
function openProjectModal(project) {
  const modal = document.getElementById("project-modal")
  const body = document.getElementById("modal-body")
  if (!modal || !body) return
  lastFocused = document.activeElement

  body.innerHTML = `
    <div class="modal-grid">
      <img class="modal-image" src="${project.image || defaultProjectImage(project.title)}" alt="${escapeHtml(project.title)}">
      <div class="modal-content-inner">
        <h2 id="modal-title">${escapeHtml(project.title)}</h2>
        <p>${escapeHtml(project.fullDescription || project.description || "")}</p>
        <div class="project-tags">${(project.tags || []).map((t) => `<span class="project-tag">${escapeHtml(t)}</span>`).join("")}</div>
        <div class="modal-links">
          ${project.github ? `<a class="btn btn-primary" href="${project.github}" target="_blank" rel="noopener noreferrer"><i class="fab fa-github"></i> View Code</a>` : ""}
          ${project.demo ? `<a class="btn btn-ghost" href="${project.demo}" target="_blank" rel="noopener noreferrer"><i class="fas fa-external-link-alt"></i> Live Demo</a>` : ""}
        </div>
      </div>
    </div>
  `

  modal.setAttribute("aria-hidden", "false")
  modal.style.display = "flex"
  setTimeout(() => modal.setAttribute("open", ""), 20)
  document.body.style.overflow = "hidden"

  const closeBtn = modal.querySelector(".modal-close")
  closeBtn && closeBtn.focus()
  trapFocus(modal)
}

function closeProjectModal() {
  const modal = document.getElementById("project-modal")
  if (!modal) return
  modal.removeAttribute("open")
  modal.setAttribute("aria-hidden", "true")
  modal.style.display = "none"
  document.body.style.overflow = ""
  if (lastFocused) lastFocused.focus()
}
document.addEventListener("click", (e) => {
  const modal = document.getElementById("project-modal")
  if (!modal) return
  if (e.target === modal) closeProjectModal()
})
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const modal = document.getElementById("project-modal")
    if (modal && modal.getAttribute("aria-hidden") === "false") closeProjectModal()
    const blogModal = document.getElementById("blog-modal")
    if (blogModal && blogModal.getAttribute("aria-hidden") === "false") closeBlogModal()
  }
})
document.addEventListener("DOMContentLoaded", () => {
  const closeBtn = document.querySelector("#project-modal .modal-close")
  if (closeBtn) closeBtn.addEventListener("click", closeProjectModal)
  const blogCloseBtn = document.querySelector("#blog-modal .modal-close")
  if (blogCloseBtn) blogCloseBtn.addEventListener("click", closeBlogModal)
})
function trapFocus(container) {
  const focusable = container.querySelectorAll(
    'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
  )
  if (!focusable.length) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  function keyHandler(e) {
    if (e.key !== "Tab") return
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }
  container.addEventListener("keydown", keyHandler)
  container._removeTrap = () => container.removeEventListener("keydown", keyHandler)
}

/* ===========================
   Skills
   =========================== */
function initSkills() {
  document.querySelectorAll(".skill-progress").forEach((bar) => {
    const w = bar.style.width || bar.dataset.targetWidth || "0%"
    bar.dataset.targetWidth = w
    bar.style.width = "0"
  })
  const btn = document.getElementById("toggle-skill-view")
  if (btn) btn.addEventListener("click", toggleSkillView)
}

function toggleSkillView() {
  state.skillViewMode = state.skillViewMode === "percent" ? "level" : "percent"
  document.querySelectorAll(".skill-card").forEach((card) => {
    const valEl = card.querySelector(".skill-value")
    const prog = card.querySelector(".skill-progress")
    if (!valEl || !prog) return
    const percent = prog.dataset.targetWidth || prog.style.width || ""
    const level = prog.dataset.level || prog.getAttribute("data-level") || ""
    valEl.textContent = state.skillViewMode === "level" ? level || percent : percent || level
  })
}

function animateSkillBars() {
  document.querySelectorAll(".skill-progress").forEach((bar, i) => {
    const target = bar.dataset.targetWidth || "0%"
    setTimeout(() => (bar.style.width = target), i * 80)
  })
}

/* ===========================
   OffTopic Blog Section
   - Only admin can create/edit/delete blogs
   - Visitors can view titles, click to read full blog, and like
   =========================== */
function initBlogs() {
  const saved = localStorage.getItem("portfolio-blogs")
  try {
    state.blogs = saved ? JSON.parse(saved) : seedBlogs()
  } catch {
    state.blogs = seedBlogs()
  }
  renderBlogs()
  updateAdminUI()
  const addBtn = document.getElementById("add-blog")
  if (addBtn) addBtn.addEventListener("click", addBlog)
}

function seedBlogs() {
  return [
    {
      id: Date.now() - 3000,
      title: "Why I Love CSS Grid",
      content:
        "Just learned CSS Grid and it's absolutely life-changing! The ability to create complex layouts with just a few lines of code is incredible. I spent years fighting with floats and flexbox for 2D layouts, but Grid makes it so intuitive.\n\nThe grid-template-areas property is particularly amazing - you can literally draw your layout in ASCII art and CSS will make it happen. If you haven't tried it yet, I highly recommend diving in!",
      date: new Date(Date.now() - 86400000 * 3).toISOString(),
      likes: 5,
      liked: false,
    },
    {
      id: Date.now() - 2000,
      title: "The Art of Debugging",
      content:
        "Here's something I wish I learned earlier: sometimes the best debugging technique is to step away from the computer.\n\nI was stuck on a bug for 3 hours yesterday. Went for a walk, came back, and solved it in 5 minutes. Your brain continues processing problems in the background, even when you're not actively thinking about them.\n\nSo next time you're stuck, give yourself permission to take a break. It's not procrastination - it's debugging.",
      date: new Date(Date.now() - 86400000 * 2).toISOString(),
      likes: 12,
      liked: false,
    },
  ]
}

function saveBlogs() {
  localStorage.setItem("portfolio-blogs", JSON.stringify(state.blogs))
}

function renderBlogs() {
  const c = document.getElementById("blogs-container")
  if (!c) return
  c.innerHTML = ""

  if (!state.blogs.length) {
    c.innerHTML = `
      <div class="blogs-empty">
        <i class="fas fa-feather-alt"></i>
        <p>No blog posts yet. Check back soon!</p>
      </div>
    `
    return
  }

  const sorted = [...state.blogs].sort((a, b) => new Date(b.date) - new Date(a.date))
  sorted.forEach((blog) => {
    const card = document.createElement("article")
    card.className = "blog-card"
    card.dataset.blogId = blog.id

    const preview = blog.content.length > 150 ? blog.content.substring(0, 150) + "..." : blog.content
    const formattedDate = new Date(blog.date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })

    card.innerHTML = `
      <div class="blog-card-header">
        <div class="blog-card-info">
          <h3 class="blog-card-title">${escapeHtml(blog.title)}</h3>
          <div class="blog-card-meta">
            <span><i class="fas fa-calendar-alt"></i> ${formattedDate}</span>
            <span><i class="fas fa-heart"></i> ${blog.likes || 0} likes</span>
          </div>
        </div>
        <div class="blog-card-actions" onclick="event.stopPropagation()">
          <button aria-label="like" onclick="likeBlog(${blog.id})" class="${blog.liked ? "liked" : ""}">
            <i class="fas fa-heart"></i> ${blog.likes || 0}
          </button>
        </div>
      </div>
      <p class="blog-card-preview">${escapeHtml(preview)}</p>
      <div class="read-more-hint">
        <span>Click to read more</span>
        <i class="fas fa-arrow-right"></i>
      </div>
    `

    card.addEventListener("click", () => openBlogModal(blog.id))
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        openBlogModal(blog.id)
      }
    })
    card.tabIndex = 0
    c.appendChild(card)
  })
}

function addBlog() {
  if (!isAdmin()) {
    alert("Only the site owner (admin) can add blogs.")
    return
  }
  const titleInput = document.getElementById("blog-title")
  const contentInput = document.getElementById("blog-content")
  if (!titleInput || !contentInput) return

  const title = titleInput.value.trim()
  const content = contentInput.value.trim()

  if (!title) {
    alert("Please add a title for your blog.")
    return
  }
  if (!content) {
    alert("Please write some content.")
    return
  }

  const newBlog = {
    id: Date.now(),
    title,
    content,
    date: new Date().toISOString(),
    likes: 0,
    liked: false,
  }
  state.blogs.unshift(newBlog)
  saveBlogs()
  renderBlogs()
  titleInput.value = ""
  contentInput.value = ""
}

function likeBlog(id) {
  const blog = state.blogs.find((x) => x.id === id)
  if (!blog) return
  blog.liked = !blog.liked
  blog.likes = (blog.likes || 0) + (blog.liked ? 1 : -1)
  saveBlogs()
  renderBlogs()

  // Update modal if open
  if (state.currentBlogId === id) {
    const likeBtn = document.querySelector(".blog-modal-like button")
    if (likeBtn) {
      likeBtn.className = blog.liked ? "liked" : ""
      likeBtn.innerHTML = `<i class="fas fa-heart"></i> ${blog.liked ? "Liked" : "Like"} (${blog.likes})`
    }
  }
}

function editBlog(id) {
  if (!isAdmin()) {
    alert("Only admin can edit blogs.")
    return
  }
  const blog = state.blogs.find((x) => x.id === id)
  if (!blog) return

  const newTitle = prompt("Edit blog title:", blog.title)
  if (newTitle === null) return

  const newContent = prompt("Edit blog content:", blog.content)
  if (newContent === null) return

  if (newTitle.trim()) blog.title = newTitle.trim()
  if (newContent.trim()) blog.content = newContent.trim()

  saveBlogs()
  renderBlogs()
  if (state.currentBlogId === id) openBlogModal(id)
}

function deleteBlog(id) {
  if (!isAdmin()) {
    alert("Only admin can delete blogs.")
    return
  }
  if (confirm("Delete this blog post?")) {
    state.blogs = state.blogs.filter((x) => x.id !== id)
    saveBlogs()
    renderBlogs()
    if (state.currentBlogId === id) closeBlogModal()
  }
}

/* ===========================
   Blog Modal
   =========================== */
function openBlogModal(id) {
  const modal = document.getElementById("blog-modal")
  const body = document.getElementById("blog-modal-body")
  if (!modal || !body) return

  const blog = state.blogs.find((x) => x.id === id)
  if (!blog) return

  state.currentBlogId = id
  lastFocused = document.activeElement

  const formattedDate = new Date(blog.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  // Convert newlines to paragraphs
  const contentHtml = blog.content
    .split("\n\n")
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("")

  const adminControls = isAdmin()
    ? `
    <div class="blog-modal-admin">
      <button onclick="editBlog(${blog.id})"><i class="fas fa-edit"></i> Edit</button>
      <button class="delete" onclick="deleteBlog(${blog.id})"><i class="fas fa-trash"></i> Delete</button>
    </div>
  `
    : ""

  body.innerHTML = `
    <div class="blog-modal-header">
      <h2 id="blog-modal-title" class="blog-modal-title">${escapeHtml(blog.title)}</h2>
      <div class="blog-modal-meta">
        <span><i class="fas fa-calendar-alt"></i> ${formattedDate}</span>
        <span><i class="fas fa-heart"></i> ${blog.likes || 0} likes</span>
      </div>
    </div>
    <div class="blog-modal-content">
      ${contentHtml}
    </div>
    <div class="blog-modal-footer">
      <div class="blog-modal-like">
        <button onclick="likeBlog(${blog.id})" class="${blog.liked ? "liked" : ""}">
          <i class="fas fa-heart"></i> ${blog.liked ? "Liked" : "Like"} (${blog.likes || 0})
        </button>
      </div>
      ${adminControls}
    </div>
  `

  modal.setAttribute("aria-hidden", "false")
  modal.style.display = "flex"
  setTimeout(() => modal.setAttribute("open", ""), 20)
  document.body.style.overflow = "hidden"

  const closeBtn = modal.querySelector(".modal-close")
  closeBtn && closeBtn.focus()
  trapFocus(modal)
}

function closeBlogModal() {
  const modal = document.getElementById("blog-modal")
  if (!modal) return
  state.currentBlogId = null
  modal.removeAttribute("open")
  modal.setAttribute("aria-hidden", "true")
  modal.style.display = "none"
  document.body.style.overflow = ""
  if (lastFocused) lastFocused.focus()
}

document.addEventListener("click", (e) => {
  const blogModal = document.getElementById("blog-modal")
  if (blogModal && e.target === blogModal) closeBlogModal()
})

/* ===========================
   Contact (Formspree integration)
   =========================== */
function initContact() {
  const form = document.getElementById("contact-form")
  if (!form) return

  form.action = FORMSPREE_ENDPOINT
  form.method = "POST"

  form.addEventListener("submit", async (e) => {
    e.preventDefault()

    const submitBtn = form.querySelector('button[type="submit"]')

    const inputs = form.querySelectorAll("input, textarea")
    let ok = true
    inputs.forEach((input) => {
      if (!validateField(input)) ok = false
    })
    if (!ok) return

    const payload = {
      name: form.name.value || "",
      email: form.email.value || "",
      subject: form.subject.value || "",
      message: form.message.value || "",
    }

    const gotcha = form.querySelector('input[name="_gotcha"]')
    if (gotcha && gotcha.value) return

    if (submitBtn) {
      submitBtn.disabled = true
      submitBtn.dataset.origText = submitBtn.textContent
      submitBtn.textContent = "Sending..."
    }

    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (res.ok) {
        alert("Message sent — thank you!")
        form.reset()
      } else {
        if (data && data.errors && Array.isArray(data.errors)) {
          alert("Submission error: " + data.errors.map((e) => e.message).join(", "))
        } else {
          alert("Something went wrong. Please try again.")
        }
      }
    } catch (err) {
      console.error("Form submission error:", err)
      alert("Network error. Please check your connection and try again.")
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false
        submitBtn.textContent = submitBtn.dataset.origText || "Send Message"
      }
    }
  })

  const inputs = form.querySelectorAll("input, textarea")
  inputs.forEach((input) => {
    input.addEventListener("blur", () => validateField(input))
    input.addEventListener("input", () => {
      const err = input.parentElement.querySelector(".error-message")
      if (err) err.textContent = ""
    })
  })
}

function validateField(input) {
  const err = input.parentElement.querySelector(".error-message")
  if (!err) return true
  err.textContent = ""

  if (input.hasAttribute("required") && !input.value.trim()) {
    err.textContent = "This field is required."
    return false
  }

  if (input.type === "email" && input.value) {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRe.test(input.value)) {
      err.textContent = "Please enter a valid email."
      return false
    }
  }

  return true
}

/* ===========================
   CV
   =========================== */
function initCV() {
  const dlBtn = document.getElementById("download-cv")
  const printBtn = document.getElementById("print-cv")

  if (dlBtn) {
    dlBtn.addEventListener("click", () => {
      alert("CV download simulated. In production, link to a real PDF.")
    })
  }

  if (printBtn) {
    printBtn.addEventListener("click", () => {
      const printable = document.getElementById("printable-cv")
      if (printable) {
        printable.style.display = "block"
        window.print()
        printable.style.display = "none"
      }
    })
  }
}

/* ===========================
   Observers & Scroll Effects
   =========================== */
function initObservers() {
  const revealEls = document.querySelectorAll(".reveal")
  const skillsSection = document.getElementById("skills")

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view")
          if (entry.target === skillsSection) animateSkillBars()
        }
      })
    },
    { threshold: 0.15 },
  )

  revealEls.forEach((el) => revealObserver.observe(el))
}

function initScrollEffects() {
  const progress = document.getElementById("scroll-progress")
  const navbar = document.getElementById("navbar")
  const heroImage = document.querySelector("[data-parallax]")
  const profileImg = document.getElementById("profile-img")

  window.addEventListener("scroll", () => {
    const scrollTop = window.scrollY
    const docHeight = document.documentElement.scrollHeight - window.innerHeight
    const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0

    if (progress) progress.style.width = scrollPercent + "%"
    if (navbar) {
      if (scrollTop > 60) navbar.classList.add("scrolled")
      else navbar.classList.remove("scrolled")
    }

    if (heroImage) {
      const parallaxVal = scrollTop * 0.15
      heroImage.style.transform = `translateY(${parallaxVal}px)`
    }
  })

  if (profileImg) {
    profileImg.addEventListener("mouseenter", () => profileImg.classList.add("tilt"))
    profileImg.addEventListener("mouseleave", () => profileImg.classList.remove("tilt"))
  }
}

/* ===========================
   Utilities
   =========================== */
function escapeHtml(str) {
  if (!str) return ""
  const div = document.createElement("div")
  div.textContent = str
  return div.innerHTML
}

function debounce(fn, delay) {
  let timer
  return function (...args) {
    clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), delay)
  }
}
