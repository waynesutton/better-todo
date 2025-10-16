# Quick Start Guide

Get Better Todo running in under 2 minutes.

## Prerequisites

- Node.js 18 or higher installed
- A terminal/command line

## Setup Steps

### 1. Install Dependencies

```bash
npm install
```

This installs all required packages including React, Convex, WorkOS, and other dependencies.

### 2. Initialize Convex

```bash
npx convex dev
```

This command will:

- Prompt you to create a Convex account (if you don't have one)
- Create a new Convex project
- Automatically set up WorkOS AuthKit (no manual configuration needed!)
- Generate your `.env.local` file with all necessary environment variables
- Start the Convex backend in development mode

**Note**: When prompted to select an authentication method during setup, WorkOS AuthKit is already configured in the code. The CLI will handle the provisioning automatically.

### 3. Start the Frontend

Open a new terminal window and run:

```bash
npm run dev
```

This starts the Vite development server at `http://localhost:5173`

### 4. Access the App

1. Open your browser to `http://localhost:5173`
2. Click "Sign In with WorkOS"
3. You'll receive an email invitation to set up your WorkOS account
4. Complete the sign-up process
5. Start creating todos!

## What Just Happened?

The Convex CLI automatically:

- Created a WorkOS team for you
- Set up AuthKit with proper redirect URIs
- Configured CORS settings
- Generated secure API keys
- Stored everything in your `.env.local` file

No dashboard hopping or manual configuration required!

## Development Workflow

Keep both terminals running:

- Terminal 1: `npx convex dev` (backend)
- Terminal 2: `npm run dev` (frontend)

Changes to your code will auto-reload in both the backend and frontend.

## Creating Your First Todo

1. Type in the input field at the bottom
2. Use markdown syntax:
   - `# Header 1` for h1
   - `## Header 2` for h2
   - `### Header 3` for h3
   - Regular text for todos
3. Press Cmd+Enter (Mac) or Ctrl+Enter (Windows) to add
4. Check the checkbox to complete and auto-archive

## Features to Try

- **Drag and Drop**: Hover over the ⋮⋮ icon and drag to reorder
- **Move Between Days**: Click the ⋯ menu to move todos to previous/next day
- **Collapsible Headers**: Click the ▼ icon next to headers to collapse sections
- **Archive**: Completed todos automatically move to the archive at the top
- **Theme Toggle**: Click the sun/moon icon in the sidebar
- **Sign Out**: Click the wave icon (👋) in the sidebar

## Troubleshooting

### Port Already in Use

If port 5173 is taken, Vite will automatically try the next available port.

### Convex Not Starting

Make sure you're running `npx convex dev` in the project root directory.

### Authentication Issues

1. Check that `.env.local` exists and has `VITE_CONVEX_URL`
2. Make sure `npx convex dev` is running
3. Clear your browser cache and try again

## Next Steps

- Read the full [README.md](./README.md) for detailed documentation
- Check [files.md](./files.md) to understand the project structure
- Review [changelog.md](./changelog.md) for feature details

## Need Help?

- Convex Docs: https://docs.convex.dev
- WorkOS AuthKit Docs: https://workos.com/docs/user-management/authkit
- Convex + WorkOS Guide: https://docs.convex.dev/auth/authkit

Happy todo-ing!
