# 📓 KIIT Notes — Full-Stack MERN App

A private, secure note-taking app exclusively for `@kiit.ac.in` Google accounts.

---

## ✨ Features

- **Google OAuth** restricted to `@kiit.ac.in` domain only
- **Single-device enforcement** via Socket.IO (login on a second device kicks the first)
- **Anti-DevTools security** — blocks F12, Ctrl+Shift+I, right-click; detects open DevTools and blurs the UI
- **Full CRUD notes** with title, rich content, tags, colors, pin & archive
- **Real-time search** across note titles and content
- **Tag filtering** from the sidebar
- **Collapsible sidebar** with user profile
- **Rate limiting** + Helmet security headers on the backend
- **HttpOnly session cookies** (CSRF-safe)

---

## 🗂️ Project Structure

```
notes-app/
├── backend/
│   ├── config/
│   │   └── passport.js       # Google OAuth + KIIT domain check
│   ├── models/
│   │   ├── User.js
│   │   └── Note.js
│   ├── routes/
│   │   ├── auth.js
│   │   └── notes.js
│   ├── server.js             # Express + Socket.IO entry point
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── NoteCard.jsx / .module.css
    │   │   ├── NoteEditor.jsx / .module.css
    │   │   ├── ProtectedRoute.jsx
    │   │   └── Sidebar.jsx / .module.css
    │   ├── context/
    │   │   └── AuthContext.jsx   # Auth state + Socket.IO connection
    │   ├── hooks/
    │   │   └── useSecurity.js    # Anti-devtools hook
    │   ├── pages/
    │   │   ├── Login.jsx / .module.css
    │   │   └── Notes.jsx / .module.css
    │   ├── services/
    │   │   └── api.js
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── vite.config.js
    └── package.json
```

---

## 🚀 Setup Guide

### 1. Prerequisites

- Node.js 18+
- MongoDB Atlas account (free tier works)
- Google Cloud Console project

---

### 2. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project → **APIs & Services → Credentials**
3. Click **Create Credentials → OAuth 2.0 Client ID**
4. Application type: **Web application**
5. Authorized redirect URIs:
   - Development: `http://localhost:5000/api/auth/google/callback`
   - Production: `https://yourdomain.com/api/auth/google/callback`
6. Copy the **Client ID** and **Client Secret**

---

### 3. MongoDB Atlas Setup

1. Create a free cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a database user with read/write access
3. Whitelist your IP (or `0.0.0.0/0` for dev)
4. Copy the connection string: `mongodb+srv://user:pass@cluster.mongodb.net/kiit-notes`

---

### 4. Backend Setup

```bash
cd backend
cp .env.example .env
# Fill in your values in .env
npm install
npm run dev       # Development (nodemon)
# or
npm start         # Production
```

**`.env` values to fill:**

| Variable | Value |
|---|---|
| `MONGODB_URI` | Your Atlas connection string |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `SESSION_SECRET` | Any long random string (32+ chars) |
| `CLIENT_URL` | `http://localhost:5173` (dev) or your frontend URL |
| `SERVER_URL` | `http://localhost:5000` (dev) or your backend URL |

---

### 5. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

### 6. Production Deployment

#### Backend (Railway / Render / Fly.io)
- Set all environment variables from `.env`
- Set `NODE_ENV=production`
- Set `CLIENT_URL` to your frontend domain

#### Frontend (Vercel / Netlify)
- Set `VITE_API_URL` to your backend URL
- Build command: `npm run build`
- Output directory: `dist`

> **Note:** In production, update the Vite proxy config or set `VITE_API_URL` env var so API calls go to your deployed backend.

---

## 🔐 Security Architecture

### Authentication
- Google OAuth 2.0 via Passport.js
- Domain restriction enforced in `config/passport.js` — only `@kiit.ac.in` emails pass
- Session stored in MongoDB with HttpOnly, SameSite cookies
- Sessions expire after 24 hours

### Single-Device Enforcement
- When a user logs in, their `userId → socketId` is stored in a server-side `Map`
- If the same user opens the app on another device, the previous socket receives a `force_logout` event
- The old session is immediately invalidated and the UI shows a warning overlay

### Anti-DevTools (`useSecurity.js`)
1. **Keyboard blocking** — F12, Ctrl+Shift+I/J/C, Ctrl+U all preventDefault'd
2. **Right-click disabled** — contextmenu event blocked
3. **Size heuristic** — checks `outerWidth - innerWidth > 160px` every second (DevTools panel open)
4. **Debugger timing trap** — runs `debugger` statement every 3s; if paused >100ms, triggers detection
5. **Detection response** — blurs the page content and shows a fullscreen warning overlay

### Backend Security
- **Helmet.js** — sets X-Frame-Options, CSP, HSTS, etc.
- **Rate limiting** — 100 requests per 15 minutes per IP on `/api/`
- **Input validation** — Mongoose schema validators + maxlength constraints
- **CORS** — restricted to `CLIENT_URL` only

---

## 📝 License

MIT — for personal/educational use at KIIT University.
