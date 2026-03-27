# Game E-commerce System (Fullstack)

A fullstack Game E-commerce platform that allows users to browse, purchase, and manage digital game products. The system includes a modern frontend and a robust backend API.

## 🧩 System Architecture
Frontend 
        ↓
 REST API (Backend)
        ↓
   Database 
- Frontend handles UI/UX and user interactions
- Backend handles business logic, authentication, and data processing
- Database stores users, products, orders, and transactions

## 🚀 Features

### 🖥️ Frontend
- Browse and search games
- Filter by category, price, platform
- Game detail page
- Cart & checkout UI
- Authentication (Login/Register)

### ⚙️ Backend
- RESTful API
- User authentication & authorization (JWT)
- Product management (CRUD)
- Order & payment processing
- Online payment integration (ZaloPay)
- Database management
- Role-based access (Admin/User)

## 🛠️ Tech Stack
- Frontend: Next.js, TailwindCSS
- Backend: Nest.js, JWT Authentication, RESTful API
- Database:  MongoDB

## 🔗 API Overview

| Method | Endpoint        | Description   |
|--------|---------------|---------------|
| POST   | /auth/login    | Login user    |
| POST   | /auth/register | Register user |
| POST   | /orders        | Create order  |

## ⚙️ Installation
### 1. Clone project
- git clone https://github.com/tantailuong099-cloud/Game_Ecommerce_FrontEnd.git
- git clone https://github.com/tantailuong099-cloud/Game_Ecommerce_BackEnd.git

### 2. Setup Backend
- cd Game_Ecommerce_BackEnd
- npm install
- npm start

### 3. Setup Frontend
- cd Game_Ecommerce_FrontEnd
- npm install
- npm run dev

## 🔄 Data Flow
- User interacts with UI
- Frontend sends API request via Axios
- Backend processes request
- Database returns data
- Backend sends response → Frontend renders UI

## 👨‍💻 Author
- GitHub: https://github.com/tantailuong099-cloud

## ⭐ Support
- If you like this project, give it a ⭐ on GitHub!
