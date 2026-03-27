# 🎓 Student Tutor Support System (Fullstack)

A fullstack web application that connects students with tutors, allowing users to manage learning activities, communication, and academic support efficiently.

---

# 🧩 System Architecture

```text
Frontend ( Next.js)
        ↓
 REST API (Backend - NestJS)
        ↓
   Database (MongoDB)
```

- Frontend handles UI/UX and user interactions  
- Backend handles business logic, authentication, and API services  
- Database stores users, tutors, sessions, messages, and system data  

---

# 🚀 Features

## 🖥️ Frontend
- User-friendly and responsive UI  
- Student & Tutor dashboards  
- Browse and search tutors  
- Booking tutor sessions  
- Real-time chat / messaging  
- Authentication (Login/Register)  
- Profile management  

---

## ⚙️ Backend
- RESTful API architecture  
- Secure authentication & authorization (JWT)  
- User management (Student / Tutor / Admin)  
- Tutor booking & scheduling system  
- Messaging system  
- Session & course management  
- Database management  
- Role-based access control  

---

# 🛠️ Tech Stack

## 🎨 Frontend
- Next.js  
- TailwindCSS 

## ⚙️ Backend
- NestJS  
- JWT Authentication  
- RESTful API  

## 🗄️ Database
- MongoDB  

---

# 🔗 API Overview

| Method | Endpoint              | Description                  |
|--------|----------------------|------------------------------|
| POST   | /auth/login          | Login user                   |
| POST   | /auth/register       | Register user                |
| GET    | /users/profile       | Get user profile             |
| GET    | /tutors              | Get tutor list               |

---

# ⚙️ Installation

## 1. Clone project

```bash
git clone https://github.com/tantailuong099-cloud/Student_Tutor_Support_System_FrontEnd.git
git clone https://github.com/tantailuong099-cloud/Student_Tutor_Support_System_BackEnd.git
```

---

## 2. Setup Backend

```bash
cd Student_Tutor_Support_System_BackEnd
npm install
npm start
```

---

## 3. Setup Frontend

```bash
cd Student_Tutor_Support_System_FrontEnd
npm install
npm run dev
```

---

# 🔄 Data Flow

1. User interacts with UI  
2. Frontend sends API request via Axios  
3. Backend processes request  
4. Database returns data  
5. Backend sends response → Frontend renders UI  

---

# 👨‍💻 Author

- GitHub: https://github.com/tantailuong099-cloud  

---

# ⭐ Support

If you like this project, give it a ⭐ on GitHub!
