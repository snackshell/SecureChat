# ClassChat - Real-time Group Messaging

A real-time group chat application built with React, Express.js, PostgreSQL, and WebSockets. Designed for classmates to communicate in a secure, private group environment.

## Features

### 🔐 Authentication
- Username and shared group password system
- Group password: `2025`
- Admin access: username `adu`, password `1995`
- Persistent user sessions

### 💬 Group Chat
- Real-time messaging with WebSocket connections
- Message history persistence
- Admin user visual distinction (red styling/badges)
- Typing indicators
- Message timestamps

### 📱 Direct Messaging
- Private chat between users
- Separate message storage
- Click on any user to start a DM

### 🖼️ Image Sharing
- Upload and share images in both group and direct messages
- 5MB file size limit
- Image preview before sending
- Inline image display in chat

### 👥 User Management
- Online/offline status indicators
- User list sidebar
- Real-time user status updates

### 📱 Responsive Design
- Mobile-friendly interface
- Clean, minimal Material Design inspired UI
- Dark/light mode support

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Shadcn/UI** component library
- **WebSocket** for real-time communication
- **React Query** for API state management
- **Wouter** for routing

### Backend
- **Express.js** with TypeScript
- **PostgreSQL** database
- **Drizzle ORM** for database operations
- **WebSocket (ws)** for real-time messaging
- **Multer** for file uploads

## Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL database

### Environment Variables
Create a `.env` file in the root directory:

```env
DATABASE_URL=postgresql://username:password@host:port/database
