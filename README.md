# Online Food Ordering and Restaurant Management System

A starter full-stack project built with React, Node.js, Express, and SQLite.

## Features
- Browse food menu and categories
- Add items to a cart
- Place customer orders
- View recent orders and their status
- Admin API to add menu items and update order status

## Requirements
- Node.js 18+
- npm

## Run locally

### 1. Start the backend
```bash
cd server
npm install
npm run dev
```
The API runs at http://localhost:5000. SQLite database is created automatically at `server/data/restaurant.db`.

### 2. Start the frontend
Open another terminal:
```bash
cd client
npm install
npm run dev
```
Open the Vite URL shown in the terminal (usually http://localhost:5173).

## Demo note
This is an educational starter project. Admin endpoints are intentionally simple and are not protected by authentication yet. Add authentication and authorization before using it beyond a local academic demo.
