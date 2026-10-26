# MVSU Textbook Adoption Platform

A full-stack web application that digitizes the university textbook adoption workflow across instructors, Heads of Department, and bookstore staff.

The platform centralizes textbook submissions, departmental approvals, rejection feedback, submission history, and bookstore fulfillment in one role-based system.

## Live Demo

**Live Demo:** Coming soon

## Project Documentation


## Project Resources


| **[Project Presentation](https://docs.google.com/presentation/d/1ChllU2mYl-RszkceHimEuTIwK-hh_tYji-nucKF-5Ps/edit?usp=sharing)** | Problem, product decisions, workflow, architecture, validation | 12 slides |
| **[Product One-Pager](https://docs.google.com/document/d/10DR53Mjux0YG00x2OVd0eUg5wzNXBI-E3MuHgu12Cwg/edit?usp=sharing)** | Goal, users, workflow, business rules, decisions, tradeoffs | 2 min |
| **[PM Spec Sheet](https://docs.google.com/document/d/1hvH_k3ETCxrg_UXUUbYzxoaerauhjaOzk0zz_5v_eoM/edit?usp=sharing)** | Requirements, business rules, roadmap, risks, success metrics | 10 min |
| **[Database Design](https://docs.google.com/document/d/1zjVPVZeJ-llLjCd0SLkXGqUtbRLpTZZUMr9UYNNI7IE/edit?usp=sharing)** | ERD, keys, relationships, constraints, data model | 8 min |

## Product Goal

Create a centralized workflow that allows faculty, department leadership, and bookstore staff to submit, review, approve, and track textbook adoption requests from initial submission through bookstore fulfillment.

## Problem

Textbook adoption can involve multiple stakeholders working across forms, messages, and separate records. This makes it harder to:

- Track whether a request is Pending, Approved, or Rejected
- Preserve rejection feedback
- Route requests to the correct department leadership
- Give bookstore staff visibility into approved textbooks
- Maintain historical records of previous submissions

The platform creates one source of truth for the entire workflow.

## User Roles

### Instructor

Instructors can:

- View assigned courses
- Submit textbook adoption requests
- Track submission status
- View rejection feedback
- Access previous submissions
- Submit updated requests without deleting historical records

### Head of Department

Heads of Department can:

- Review requests from instructors in their department
- Approve or reject requests
- Provide rejection feedback
- View departmental submission history
- Submit textbook requests for courses they teach
- Confirm and automatically approve their own submissions

### Bookstore

Bookstore staff can:

- View academically approved requests
- Track fulfillment progress
- Move requests through ordering stages
- Preserve completed requests as historical records

## Core Workflow

```text
Instructor submits textbook request
        ↓
Course determines department
        ↓
Department determines designated HoD
        ↓
HoD reviews request
   ↙              ↘
Rejected         Approved
   ↓                ↓
Feedback         Bookstore
                    ↓
             Ready to be ordered
                    ↓
                 Ordered
                    ↓
                 Arrived
                    ↓
             Ready to pick up
                    ↓
               Picked up
                    ↓
                 Archive
```

The designated HoD is captured on the request when the submission is created. This preserves the original reviewer assignment even if department leadership changes later.

## Key Product Decisions

### Department-Based Routing

The department is the source of truth for approval routing.

```text
Course → Department → Designated HoD
```

This avoids maintaining duplicate Instructor-to-HoD relationships throughout the system.

### Assignment vs. Approval

The platform separates:

- `assigned_hod_id` — the reviewer assigned when the request is submitted
- `approved_by` — the user who actually approves the request

This creates clearer workflow history and auditability.

### History Over Mutation

Corrected or repeated submissions create new requests rather than overwriting older ones.

Each submission preserves its own textbook snapshot so historical textbook information remains unchanged.

### Forward-Only Fulfillment

Bookstore requests move through a controlled workflow:

```text
Approved
→ Ready to be ordered
→ Ordered
→ Arrived
→ Ready to pick up
→ Picked up
→ Archive
```

Completed requests are archived rather than deleted.

## Tech Stack

### Frontend

- React
- JavaScript
- React Router
- Axios

### Backend

- Node.js
- Express
- REST APIs
- JWT authentication
- bcrypt password hashing

### Database

- MySQL
- Relational database design
- Transactional request creation

### Testing

The project includes:

- Backend tests
- Frontend tests
- HTTP/MySQL integration tests
- End-to-end browser testing

Testing covers major workflows including authentication, department isolation, submission, approval, rejection, HoD self-submission, bookstore fulfillment, and historical record preservation.

## Architecture

```text
React Frontend
      ↓
Express REST API
      ↓
MySQL Database
```

Core domain structure:

```text
Department
├── Users
├── Courses
└── Designated HoD

Course
└── Textbook Requests

Request
├── Requester
├── Assigned HoD
├── Approval Actor
├── Status
├── Rejection Feedback
└── Textbook Snapshot
```

## Synthetic Demo Dataset

The portfolio version uses synthetic data only.

The demo environment includes:

- 3 departments
- 13 demo users
- 12 courses
- 9 seeded textbook adoption requests

The seeded data covers multiple workflow states, including:

- Pending
- Approved
- Rejected
- Ready to be ordered
- Ordered
- Arrived
- Ready to pick up

## Demo Accounts

All demo accounts use the password:

```text
DemoTextbooks!2026
```

### Instructor

```text
alice.carter@example.test
```

### Head of Department

```text
david.brooks@example.test
```

### Bookstore

```text
bookstore@example.test
```

Additional demo accounts are available in the seed data.

## Local Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd textbook-adoption-platform
```

### 2. Install Dependencies

```bash
npm install
npm install --prefix backend
```

### 3. Configure Environment Variables

Create a local `.env` file based on `.env.example`.

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=textbook_adoption_demo

JWT_SECRET=your_private_jwt_secret
```

Do not commit `.env`.

### 4. Initialize the Database

Create an empty MySQL database, then run:

```bash
npm run db:init
```

This loads the current schema and synthetic demo seed.

### 5. Start the Application

```bash
npm run dev
```

## Security

The application includes:

- bcrypt password hashing
- JWT-based authentication
- backend role authorization
- department-level access control
- environment-based secrets
- production CORS restrictions
- transactional database operations
- no production credentials committed to source control

The repository includes `.env.example` only. Actual database credentials and JWT secrets remain private.

## Project Evolution

The project began as a simpler textbook submission MVP and evolved into a more structured role-based workflow.

Major improvements included:

- Moving approval routing to the department level
- Removing duplicated Instructor-to-HoD relationships
- Separating reviewer assignment from approval metadata
- Adding backend role and department authorization
- Preserving historical textbook submissions
- Creating a forward-only bookstore fulfillment workflow
- Adding integration and end-to-end testing
- Preparing the application for deployment

## MVP Scope

Current functionality includes:

- Role-based authentication
- Instructor dashboard
- Head of Department dashboard
- Bookstore dashboard
- Department-based routing
- Approval and rejection workflow
- Rejection feedback
- Submission history
- HoD self-submission
- Bookstore fulfillment tracking
- Historical record preservation

## Future Improvements

Future product opportunities include:

- Banner and university IT integration
- Automated faculty and course synchronization
- Institutional SSO
- Email and status notifications
- Adoption analytics
- AI-assisted textbook recommendations
- Historical adoption insights
- Vendor ordering integrations
- Administrative reporting

## Portfolio Context

This project was developed as both a software engineering project and a product design exercise.

The work included:

- User and workflow definition
- Product requirements
- Database and API design
- Role-based access rules
- Approval workflow design
- Product tradeoff decisions
- Full-stack implementation
- Testing
- Deployment preparation

## Author

**Shovkat Zeynalli**

Solo: Product, Design & Full-Stack Engineering