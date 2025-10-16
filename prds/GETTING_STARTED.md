# Getting Started with Better Todo

Your real-time markdown todo app is ready to go! Here's everything you need to know.

## Project Structure

```
better-todo/
├── convex/              Backend (Convex database & functions)
│   ├── schema.ts        Database schema
│   ├── todos.ts         Queries & mutations
│   ├── auth.config.ts   WorkOS AuthKit setup
│   └── http.ts          Auth HTTP routes
├── src/                 Frontend (React app)
│   ├── components/      UI components
│   ├── context/         Theme context
│   ├── styles/          Global CSS
│   ├── App.tsx          Main app
│   └── main.tsx         Entry point
├── package.json         Dependencies
└── README.md            Full documentation
```

## Running the App

### Step 1: Start Convex Backend

```bash
npx convex dev
```

This will:

- Automatically set up WorkOS AuthKit (zero config!)
- Create your `.env.local` file
- Start the backend server

### Step 2: Start Frontend (in a new terminal)

```bash
npm run dev
```

### Step 3: Open Browser

Go to `http://localhost:5173` and sign in!

## Key Features

### 1. Markdown Support

- Type `# Header` for h1, `## Header` for h2, `### Header` for h3
- Use `**bold**` and `*italic*`
- Code blocks with triple backticks

### 2. Drag and Drop

- Hover over ⋮⋮ to drag todos
- Reorder within the same day

### 3. Move Between Days

- Click ⋯ menu
- Select "Move to Previous Day" or "Move to Next Day"

### 4. Auto-Archive

- Check a todo to complete it
- It automatically moves to the Archive section
- Archive is at the top of each day (click to expand)

### 5. Collapsible Headers

- H1, H2, H3 headers can collapse/expand
- Click the ▼ icon
- Hides nested content

### 6. Themes

- Dark mode: Sublime Text style (#2E3842 background)
- Light mode: Apple Notes style
- Toggle with sun/moon icon

### 7. Daily Organization

- Sidebar shows all dates with todos
- Click any date to switch
- Today is always available

## Keyboard Shortcuts

- `Cmd+Enter` or `Ctrl+Enter`: Add new todo

## Mobile Friendly

- Responsive design
- Touch-friendly drag and drop
- Sidebar slides in/out with hamburger menu

## Authentication

- WorkOS AuthKit (enterprise-grade)
- Sign in once, stay logged in
- Sign out with 👋 icon in sidebar

## Real-Time Sync

Changes sync instantly across:

- Multiple browser tabs
- Multiple devices
- Multiple users (coming soon!)

## Next Steps

1. Create your first todo
2. Try markdown formatting
3. Toggle themes
4. Drag and drop to reorder
5. Move todos between days
6. Archive completed tasks

## Need Help?

- Check [README.md](./README.md) for full docs
- See [QUICKSTART.md](./QUICKSTART.md) for setup help
- View [files.md](./files.md) for code structure
- Read [changelog.md](./changelog.md) for features

## Deployment

Ready to deploy? See README.md section on "Deploying" for production deployment instructions.

Enjoy your new todo app!
