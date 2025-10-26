# Better Todo App Overview

## How the app works

Better Todo is a real-time todo application built on Convex that provides instant synchronization across all devices. Users authenticate with Clerk to access their private data, then create todos with Notion-style inline input (just start typing). The app organizes todos by date in a resizable sidebar, allows adding notes with syntax highlighting, and provides drag-and-drop reordering. Everything syncs in real-time via Convex, so changes appear instantly across browsers and devices.

## Notable features

### Core functionality

- Real-time synchronization across all devices (Convex)
- User authentication with Clerk
- Notion-style inline input
- Daily notes with syntax highlighting and line numbers
- Three themes: Dark, Light, Tan
- Pomodoro timer with sound notifications
- Full-text search
- Drag-and-drop reordering
- Daily date-based organization
- Custom folders and month grouping
- Pinned todos and backlog
- Auto-archive on completion
- Bulk actions (archive/delete)
- Custom date labels
- Resizable/collapsible sidebar
- Keyboard shortcuts (Cmd+K, /, c, etc.)
- Copy unchecked todos to clipboard
- Progressive Web App (PWA) for mobile
- Unsplash backgrounds in Pomodoro full-screen mode
- Customizable todo font size

### Mobile-optimized

- Fully responsive design with auto-hiding sidebar
- Pull-to-refresh functionality
- Mobile menu toggle
- Touch-friendly controls

## Why did you build this

Better Todo was built to be "the open-source modern todo app for developers and busy people with convex and no ai assistants" - focusing on simplicity, speed, and staying in sync. The goal was to create a distraction-free task manager that keeps users focused on their work without unnecessary complexity.

## Tech stack

### Frontend

- React 18
- TypeScript
- Vite
- React Router
- Clerk
- @dnd-kit
- date-fns
- lucide-react
- Radix UI icons

### Backend

- Convex

### Deployment

- Netlify

## Challenges we ran into

No major challenges.

- Implementing real-time synchronization across devices
- Mobile responsiveness and touch interactions
- Secure authentication and private data handling
- Drag-and-drop with proper ordering
- Theme consistency across components
- Mobile UX parity with desktop
- Proper debouncing for auto-save
- Keyboard shortcuts without conflicts
- PWA implementation and offline support

## Success stories or metrics

- Number of users
- Number of forks
- Number of GitHub stars
