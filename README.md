# OPD Booking System

A web-based booking system for medical outpatient departments that manages different types of patient reviews with daily limits.

## Features

- Book new patients (20 per day)
- Book review appointments (40 per day)
- Book chronic script appointments (40 per day)
- Patient information management
- Daily appointment limits enforcement
- Modern, responsive user interface

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

## Setup

1. Clone the repository
2. Install backend dependencies:
   ```bash
   npm install
   ```
3. Install frontend dependencies:
   ```bash
   cd client
   npm install
   ```

## Configuration

1. Create a `.env` file in the root directory with the following content:
   ```
   MONGODB_URI=mongodb://localhost:27017/opd-booking
   PORT=5000
   ```

## Running the Application

1. Start the backend server:
   ```bash
   npm run dev
   ```

2. In a new terminal, start the frontend development server:
   ```bash
   cd client
   npm start
   ```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Usage

1. Open the application in your web browser
2. Fill in the patient details:
   - First Name
   - Last Name
   - Date of Birth
   - Folder Number (optional)
   - Referral Source
   - Appointment Type
   - Appointment Date
3. Click "Book Appointment" to submit

The system will automatically enforce daily limits for each appointment type.

## Technologies Used

- Frontend:
  - React
  - Material-UI
  - Axios
  - date-fns

- Backend:
  - Node.js
  - Express
  - MongoDB
  - Mongoose 