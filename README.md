# 🚀 RouteCraft – Multi-Modal Route Orchestrator

## 🌍 Overview

**RouteCraft** is an AI-powered smart commute assistant that helps users discover the **fastest, cheapest, and most efficient travel routes** by combining:

* 🚶 Walking
* 🚌 Public Transport (Bus/Metro)
* 🚕 Ride-hailing (Auto, Bike, Car via ONDC-ready integration)

> 💡 Built for real-world urban mobility challenges with a focus on optimization, cost-efficiency, and user convenience.

---

## ✨ Key Features

### 🔀 Multi-Modal Routing

* Combines different transport modes intelligently
* Supports:

  * Walk → Bus → Walk
  * Walk → Metro → Walk
  * Walk → Bus → Metro → Walk

---

### 💰 Smart Cost Optimization

* Compares fares across multiple ride providers
* Suggests the most cost-efficient route

---

### ⏱️ Time-Based Optimization

* Calculates total travel duration
* Minimizes delays using shortest path logic

---

### 🌦️ Surge Prediction Engine

* Weather-aware pricing using OpenWeather API
* Detects:

  * 🌧️ Rain surge
  * 🌡️ Heat surge

---

### 🔗 ONDC Integration (Ready)

* Designed for integration with ONDC mobility network
* Enables decentralized ride booking ecosystem

---

### 🧠 Intelligent Route Scoring

Each route is evaluated using:

score = total_time + (cost × weight) + transfer_penalty

* ⏱️ Time efficiency
* 💸 Cost effectiveness
* 🔄 Number of transfers

---

## 🏗️ System Architecture

```
User Input (Source, Destination)
        ↓
Coordinate Conversion (Maps API)
        ↓
Nearest Transit Nodes Detection
        ↓
Route Generation Engine
        ↓
Multi-Modal Combinations
        ↓
Scoring Algorithm
        ↓
Best Route + Alternatives
        ↓
Frontend Visualization (Map + UI)
```

---

## 🔄 Application Flow

### 1️⃣ Input

* User enters source & destination

### 2️⃣ Processing

* Convert locations → coordinates
* Find:

  * nearest bus stops
  * nearest metro stations

### 3️⃣ Route Generation

* Create multiple route combinations
* Use:

  * OSRM API → walking distance
  * Static/Graph data → bus/metro

### 4️⃣ Optimization

* Calculate:

  * total_time
  * total_cost
  * transfers

### 5️⃣ Output

* Best route displayed on map
* Alternative routes shown for comparison

---

## ⚙️ Tech Stack

### Frontend

* React (Vite)
* TypeScript
* Tailwind CSS

### Backend

* Node.js
* Express.js

### APIs & Services

* Google Maps API
* OpenWeather API
* ONDC (planned integration)
* OSRM (routing)

---

## 📁 Project Structure

```
RouteCraft/
│
├── server.ts              # Backend server (Express)
├── src/
│   ├── components/        # UI components
│   ├── pages/             # Pages (Landing, Login, Signup)
│   ├── services/          # Core logic (routing, scoring)
│   ├── types.ts           # Type definitions
│   └── main.tsx           # Entry point
│
├── package.json
├── vite.config.ts
└── README.md
```

---

## 🛠️ Installation & Setup

### 🔹 Prerequisites

* Node.js (v18+)
* npm

---

### 🔹 Steps

```bash
# Clone repo
git clone https://github.com/Sharanyagh2023/RouteCraft.git

# Go to project
cd RouteCraft

# Install dependencies
npm install
```

---

### 🔹 Environment Setup

Create a `.env` file:

```
GOOGLE_MAPS_API_KEY=your_google_maps_key
OPENWEATHER_API_KEY=your_openweather_key

# Optional
ONDC_GATEWAY_URL=https://api.ondc.org/gateway/v1
ONDC_SUBSCRIBER_ID=your_subscriber_id
ONDC_UKID=your_ukid
```

---

## ▶️ Running the Project

### 🔹 Development Mode

```bash
npm run dev
```

👉 Runs on: **http://localhost:3000**

---

### 🔹 Production Mode

```bash
npm run build
npm start
```

---

## 🧪 Future Enhancements

* 🤖 AI-based traffic prediction
* 🎤 Voice-based navigation assistant
* 📊 User travel analytics dashboard
* 🚦 Real-time traffic + delay detection
* 💳 Direct ONDC booking integration

---

## 🌱 Impact

* 🚀 Reduces commute time
* 💸 Saves travel cost
* 🌍 Promotes sustainable transport
* 📱 Improves urban mobility experience

---

## 👩‍💻 Author

**Mariya Momin**
B.Tech CSE | AI & Full Stack Developer

---

## ⭐ Support

If you like this project:

* ⭐ Star the repo
* 🍴 Fork it
* 🚀 Contribute

---
