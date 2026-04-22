# RouteCraft - Multi-Modal Route Orchestrator

RouteCraft is a full-stack application that helps users find the fastest, cheapest, and most optimal routes using a combination of public transport and ride-hailing services (including ONDC).

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js**: Version 18.0.0 or higher.
- **npm**: Usually comes with Node.js.

## Local Setup

1. **Download the Code**:
   Download the project files to your local machine.

2. **Install Dependencies**:
   Open your terminal/command prompt, navigate to the project directory, and run:
   ```bash
   npm install
   ```

3. **Environment Variables**:
   - Create a file named `.env` in the root directory.
   - Copy the contents from `.env.example` into `.env`.
   - Add your API keys:
     ```env
     GOOGLE_MAPS_API_KEY=your_google_maps_key
     OPENWEATHER_API_KEY=your_openweather_key
     # Optional: ONDC Credentials
     ONDC_GATEWAY_URL=https://api.ondc.org/gateway/v1
     ONDC_SUBSCRIBER_ID=your_subscriber_id
     ONDC_UKID=your_ukid
     ```

## Running the Application

### Development Mode
To start the application in development mode (with hot-reloading for the frontend):
```bash
npm run dev
```
The application will be available at `http://localhost:3000`.

### Production Build
To build the application for production:
```bash
npm run build
npm start
```

## Project Structure

- `server.ts`: The Express backend server that handles API requests and serves the Vite frontend.
- `src/`: Contains the React frontend code.
- `src/services/`: Contains the core logic for route orchestration, ride provider fetching, and scoring.
- `src/types.ts`: TypeScript interfaces used throughout the app.

## Key Features

- **Multi-Modal Routing**: Combines Auto, Metro, and Walking.
- **ONDC Integration**: Ready for the Open Network for Digital Commerce mobility protocol.
- **Surge Prediction**: Weather-aware price estimation (Rain/Heat surges).
- **Mode-Centric UI**: Compare the best prices for Auto, Bike, and Car at a glance.
