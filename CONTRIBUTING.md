# 🚀 Schedula — Smart Appointment Booking Platform

<p align="center">
  <img src="./assets/banner.png" alt="Schedula Banner" width="100%" />
</p>

<p align="center">
  <img src="https://img.shields.io/github/stars/DevROHIT11/Schedula-GSSoC-26?style=for-the-badge" />
  <img src="https://img.shields.io/github/forks/DevROHIT11/Schedula-GSSoC-26?style=for-the-badge" />
  <img src="https://img.shields.io/github/issues/DevROHIT11/Schedula-GSSoC-26?style=for-the-badge" />
  <img src="https://img.shields.io/github/license/DevROHIT11/Schedula-GSSoC-26?style=for-the-badge" />
  <img src="https://img.shields.io/badge/GSSoC-2026-orange?style=for-the-badge" />
</p>

---

# 📖 About The Project

Schedula is a modern full-stack appointment booking platform built during the **Odoo x VIT Hackathon 2026 ⚡**

The platform allows users to:
- Find services
- View available slots
- Book appointments
- Make secure payments
- Reschedule or cancel bookings
- Leave reviews and ratings

Schedula supports multiple user roles:
- 👤 Customers (customer@app.com)
- 🧑‍💼 Organisers (organiser@app.com)
- 🛡️ Admins (admin@app.com)

with dedicated dashboards and workflows for each.

The project is designed to solve real-world appointment scheduling problems for:
- Healthcare
- Sports
- Counseling
- Events
- Mock interviews
- Online services

---

# ✨ Features

## 👤 Customer Features

- Real-time appointment booking
- Slot availability checking
- Secure online payments
- Rescheduling & cancellation
- Subscription plans
- Credits & rewards system
- Reviews & ratings
- Saved services
- AI chatbot support

---

## 🧑‍💼 Organiser Features

- Create and manage services
- Weekly & flexible scheduling
- Booking calendar
- Capacity management
- Meeting link management
- Dashboard analytics

---

## 🛡️ Admin Features

- User management
- Platform analytics
- Booking reports
- Customer feedback management
- Top providers & trends

---

# 🌟 Key Highlights

- ✅ No double-bookings using database locks
- ✅ Secure Razorpay payment verification
- ✅ Multi-language support
- ✅ Mobile responsive UI
- ✅ Real-time notifications
- ✅ Recommendation system
- ✅ Role-based authentication
- ✅ Modern clean UI

---

# 🛠️ Tech Stack

## Frontend
- React.js
- Vite
- Tailwind CSS
- Framer Motion
- Recharts

## Backend
- Node.js
- Express.js

## Database
- MySQL

## Authentication
- JWT
- bcrypt
- OTP Verification

## Payment Gateway
- Razorpay

---

# 🎥 Demo Videos

## 📺 Solution Walkthrough

<https://drive.google.com/file/d/16iv33VRchUstvMA7w2nEdvjQM2TFTmdE/view?usp=sharing>

---

## 📺 Full Platform Walkthrough

 <https://drive.google.com/file/d/1t904ag11pgaV6CiDPxbMl0djOYP5WqXm/view?usp=drive_link>

---

# ⚙️ Installation Guide

## 1️⃣ Clone Repository

```bash
git clone https://github.com/your-username/schedula-gssoc.git
```

---

## 2️⃣ Move Into Project Directory

```bash
cd schedula-gssoc
```

---

# 🔧 Backend Setup

```bash
cd backend
npm install
cp .env.example .env
npm run db:init
npm run dev
```

Backend runs at:

```bash
http://localhost:4000
```

---

# 💻 Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at:

```bash
http://localhost:5173
```

---

# 📂 Project Structure

```bash
schedula-gssoc/
│
├── frontend/
├── backend/
├── docs/
├── README.md
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
└── LICENSE
```

---

# 👨‍💻 Contribution Guidelines

We welcome contributions from everyone ❤️

Whether you're fixing bugs, improving UI, enhancing performance, or improving documentation — every contribution matters.

---

# 🚀 How To Contribute

## 📋 Contribution Workflow Rules

To maintain proper project structure and review quality, all contributors are required to follow the repository templates strictly.

### ✅ Before Creating an Issue
- Use the appropriate issue template
- Provide proper descriptions and relevant details
- Avoid creating duplicate or unclear issues

### ✅ Before Creating a Pull Request
- Follow the PR template properly
- Link the related issue number
- Add screenshots/videos for UI changes if applicable
- Keep pull requests clean and focused

⚠️ Pull requests or issues that do not follow the templates properly may be closed or rejected.

## 1️⃣ Fork the Repository

Click the **Fork** button on GitHub.

---

## 2️⃣ Clone Your Fork

```bash
git clone https://github.com/your-username/schedula-gssoc.git
```

---

## 3️⃣ Create a New Branch

You must name your branch with issue name 

```bash
git checkout -b feature/your-feature-name
```

Examples:
- `feature/navbar-ui`
- `bug/payment-fix`
- `docs/readme-update`

---

## 4️⃣ Make Your Changes

Work on the issue assigned to you. Don't work until the issue is assign to you, make sure that you follow the proper issue templates and explain it in detailed 

---

## 5️⃣ Commit Changes

```bash
git commit -m "Added responsive navbar"
```

---

## 6️⃣ Push Changes

```bash
git push origin feature/your-feature-name
```

---

## 7️⃣ Open Pull Request

Create a Pull Request and describe your changes clearly.

---

# 🏷️ Issue Labels

| Label | Description |
|---|---|
| `good first issue` | Beginner-friendly tasks |
| `bug` | Bug fixes |
| `enhancement` | Feature improvements |
| `documentation` | Docs-related changes |
| `frontend` | Frontend tasks |
| `backend` | Backend tasks |

---

# 🌱 Beginner Friendly Issues

Here are some beginner-friendly tasks contributors can work on:

- 📚 Improve and organize the documentation inside the [docs/](./docs/) folder by creating separate documentation files using content references from [README.md](./README.md).

---

# 📌 Pull Request Guidelines

Before submitting a PR:
- Ensure the project runs locally
- Keep PRs focused and clean
- Add screenshots for UI changes
- Link the related issue
- Write meaningful PR descriptions
- Improper PR can lead to rejection 

---

# ⚠️ AI Usage Policy

AI tools are allowed for:
- Learning concepts
- Debugging assistance
- Code explanations
- Small optimizations
- Documentation help

However:

❌ Do NOT directly copy-paste large AI-generated code without understanding it.

Every contributor is expected to:
- Understand the code they submit
- Be able to explain their implementation
- Write clean and maintainable code
- Follow project structure and standards

Pull requests containing blindly pasted AI-generated code may be rejected.

We encourage learning and responsible usage of AI tools ❤️

---

# 🎨 Coding Standards

- Write clean and readable code
- Follow existing folder structure
- Use meaningful variable names
- Avoid unnecessary dependencies
- Reuse components whenever possible

---

# 🧪 Testing

Before creating a PR:
- Test changes locally
- Check responsiveness
- Ensure there are no console errors
- Verify existing functionality works properly

---

# 🌱 Beginner Friendly

This repository is beginner-friendly and open to first-time contributors.

Start with issues labeled:
- `good first issue`
- `documentation`
- `beginner friendly`

---

# 💬 Need Help?

Feel free to:
- Open an issue
- Ask questions in discussions
- Reach out to maintainers

We are happy to help contributors 🚀

---

# 📈 Future Improvements

- Google Calendar sync
- SMS reminder system
- Advanced analytics
- One-to-one messaging
- Mobile application

---

# 👨‍💻 Maintainers

Rohit Bhalekar (PA)
- [GitHub](https://github.com/DevROHIT11)
- [LinkedIn](https://www.linkedin.com/in/rohit-bhalekar-1603b02ab)
- Email: rohitwork112004@gmail.com

---

Sandesh Shinde (Maintainer & Collaborator)
- [GitHub]()
- [LinkedIn]()
- Email: 


---

Tushar Kale (Maintainer & Collaborator)
- [GitHub]()
- [LinkedIn]()
- Email: 

---

# 📜 License

This project is licensed under the [MIT License](./LICENSE).

---

# ⭐ Support The Project

If you like this project:
- Give it a ⭐ on GitHub
- Share it with others
- Contribute during GSSoC 2026

---
