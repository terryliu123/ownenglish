# OwnEnglish Client

React + TypeScript frontend for OwnEnglish platform.

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Start development server

```bash
npm run dev
```

The app will be available at http://localhost:5173

### 3. Build for production

```bash
npm run build
```

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Routing
- **Zustand** - State management
- **TanStack Query** - Server state management

## Project Structure

```
src/
├── components/       # Reusable components
│   └── layout/      # Layout components
├── pages/           # Page components
│   ├── auth/       # Login, Register
│   ├── teacher/    # Teacher pages
│   └── student/    # Student pages
├── stores/         # Zustand stores
├── services/       # API services
├── types/          # TypeScript types
└── utils/          # Utility functions
```

## Environment Variables

Create `.env` file:

```
VITE_API_URL=http://localhost:8000/api/v1
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build
