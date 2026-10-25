# 🚀 Scripta

Scripta is an AI-powered Social Media Management Platform built with the MERN Stack. It enables users to create, schedule, publish, and analyze content across multiple social media platforms from a single dashboard.

## ✨ Features

- 🤖 AI Caption Generation (Google Gemini)
- 📅 Post Scheduling & Calendar
- 📊 Analytics Dashboard
- 📱 Facebook, Instagram, LinkedIn & YouTube Integration
- 🖼 Media Upload with Cloudinary
- 👥 Team Workspaces & Collaboration
- 🔐 JWT Authentication & OAuth
- 🔔 Notifications

## 🛠 Tech Stack

- **Frontend:** React, Vite, Tailwind CSS
- **Backend:** Node.js, Express.js
- **Database:** MongoDB Atlas
- **AI:** Google Gemini API
- **Storage:** Cloudinary
- **Authentication:** JWT & OAuth

## 🚀 Getting Started

```bash
git clone https://github.com/coptercode/socialmedia-management-platform-july26.git
cd socialmedia-management-platform-july26

# Backend
cd backend
npm install
npm run dev

# Frontend
cd ../frontend
npm install
npm run dev
```

## 🐳 Docker

For a production-like local run (backend + frontend + MongoDB):

```bash
cp .env.example backend/.env   # fill in real values
docker compose up --build
```

Frontend: http://localhost:8080 · Backend: http://localhost:4000
