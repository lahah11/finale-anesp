# ANESP Mission Order System - Frontend

Frontend application for the ANESP Mission Order System built with Next.js, TypeScript, and Tailwind CSS.

## Features

- User authentication and authorization
- Mission management interface
- Employee management system
- Institution management
- Logistics assignment interface
- Document upload and verification
- Signature management
- Responsive design

## Getting Started

First, install the dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment Variables

Copy `.env.example` to `.env.local` and configure the following variables:

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
```

## Technologies Used

- Next.js 14
- TypeScript
- Tailwind CSS
- React Hook Form
- Axios
- React Query (optional)

## Project Structure

```
src/
├── app/                 # Next.js app router pages
├── components/          # Reusable React components
├── services/           # API service functions
├── hooks/              # Custom React hooks
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## Development

This project uses:
- ESLint for code linting
- Prettier for code formatting
- TypeScript for type safety
- Tailwind CSS for styling

## Deployment

The application can be deployed to any platform that supports Next.js applications.