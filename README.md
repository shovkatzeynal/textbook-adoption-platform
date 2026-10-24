> Recovery update (2026-09-30): use [LOCAL_SETUP.md](LOCAL_SETUP.md) to run the MVP and [PROJECT_RECOVERY_REPORT.md](PROJECT_RECOVERY_REPORT.md) for verified behavior. The specification below is historical. Historical SQL exports are excluded from this repository; do not use them for initialization.

# 📚 Textbook Adoption Form Web Application

## 🔗 Project Resources
- 📄 [Slides Presentation](https://www.canva.com/design/DAGi7ZeTm1c/mVnG26sxeCXtbX68FLs3YA/edit)
- 📘 [Full Spec Sheet (Google Docs)](https://docs.google.com/document/d/1p_ne2BhTwww10c8rM2-mE_tNAN3_z3xgyJY8UoO-3oc/edit?tab=t.0)

---

## 🧾 About This Document
This is a project spec sheet — a simple document that explains what this app is for, how it works, what it includes, and what we plan to build later. It's written in a way that anyone, even without technical experience, can understand the project's purpose and how everything fits together.

---

## ❗ Problem Statement
This project is a digital solution for simplifying how textbooks are requested and approved at Mississippi Valley State University (MVSU).

It replaces slow, paper-based systems with an easy-to-use web application that works for instructors, department heads, and bookstore staff.

---

## ✅ Project Summary
This platform digitizes the textbook adoption process at **Mississippi Valley State University (MVSU)**. It allows:
- Faculty to manage course textbooks and submit forms
- Heads of Departments (HoDs) to approve or reject forms with comments
- Bookstore staff to view approved forms and initiate orders

Each role accesses a personalized dashboard. The app uses a **MySQL** backend and a **React + Node.js** stack.

---

## 👥 Core Users & Sample Profiles
- **Instructor** – _Dr. Smith_, teaches Psychology 101 and submits textbook forms for review.
- **Head of Department (HoD)** – _Dr. Garner_, oversees faculty submissions, can also submit forms.
- **Bookstore Staff** – Can view only HoD-approved forms and initiate orders.

---

## 🎯 User Goals
- Submit textbook forms digitally (no paper/email)
- Receive quick and clear feedback from HoDs
- Track submission status
- Provide bookstore with verified, approved forms
- Streamline textbook procurement

---

## 🔑 Key Features

### P0 – Must Have
- Instructor/HoD signup and login with role-based redirects
- Assigned course view
- Textbook form creation & submission
- HoD approval/rejection with comments
- Bookstore sees only approved forms
- Role-based dashboards

### P1 – Important
- Manual course addition (Instructor, HoD)
- View previous submissions
- View rejection feedback
- One-click order button for Bookstore

### P2 – Future Plans
- Notifications (e.g., form rejected)
- Department structure (multiple HoDs)
- Filter/search/sort in dashboards
- Integration with registration system (e.g., Argawan Noori’s project)

### ❌ Out of Scope
- Cross-institution integration
- Real-time collaborative editing
- Analytics dashboards

---

## 🏗️ System Architecture & Tech Stack

### Frontend
- **React.js** – Interface
- **React Router** – Navigation
- **localStorage** – Temporary session storage

### Backend
- **Node.js + Express** – API and server

### Database
- **MySQL** – Data storage
- **mysql2** – MySQL connector

### Helpers & Security
- **bcrypt** – Password hashing
- **CORS + body-parser** – API communication
- **express-rate-limit** – Rate-limiting for backend

---

## 🧪 UX Walkthrough
- **Login/Signup**: Select role → Redirect to dashboard
- **Instructor Dashboard**: View courses/forms, add/edit, view feedback
- **HoD Dashboard**: View all departmental submissions, approve/reject, submit own forms
- **Bookstore Page**: View approved forms, click to place orders

---

## 🔧 Engineering Breakdown

| Feature                  | Description                                              |
|--------------------------|----------------------------------------------------------|
| Auth System              | Role-based login/signup, hashed passwords (bcrypt)       |
| Instructor Dashboard     | Manage textbook forms, submit per course                 |
| HoD Dashboard            | View, approve/reject instructor forms                    |
| Bookstore Dashboard      | View only approved forms, initiate ordering              |
| Course Assignment        | Auto/manual course management                            |
| Rejection Feedback       | (Future) Attach and display comments on rejected forms   |
| Database Schema          | Users, Courses, Forms, Departments (future feature)      |

---

## 🧱 Data Model Overview

```sql
users(user_id, name, email, role, department_id, ...)
courses(course_id, name, instructor_id, department_id)
forms(form_id, course_id, submitted_by, approved_by, status, feedback, ...)
departments(department_id, name, hod_id) -- future





# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
