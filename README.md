# AESERA Jewels Backend

This is a Node.js backend project using the MVC pattern. It provides an API to generate an OTP and JWT token based on a mobile number and name.

## Setup

1. Install dependencies:
   ```
   npm install
   ```
2. Create a `.env` file (already present) and set your JWT secret.
3. Start the server:
   ```
   npm run dev
   ```

## API Endpoint

- **POST** `/api/generate-otp`
  - **Body:** `{ "mobile": "string", "name": "string" }`
  - **Response:** `{ "mobile": "string", "otp": "string", "token": "string" }`

update for dev50


 