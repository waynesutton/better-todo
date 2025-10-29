# Full-Page Notes Feature

## Overview

Full-page notes is a new feature that allows users to create and manage multiple expandable notes for each date. Unlike inline notes that appear within the todo list view, full-page notes provide a dedicated workspace with advanced editing capabilities including line numbers, syntax highlighting, and markdown rendering.

## Feature Description

### Core Functionality

Users can create unlimited full-page notes for any date in their todo list. Each note operates as a separate document with its own title and content area, accessible through a tabbed interface similar to modern code editors.

### Key Components

**1. Database Schema**
- New `fullPageNotes` table in Convex schema
- Fields: `userId`, `date`, `title`, `content`, `order`, `collapsed`, `pinnedToTop`
- Indexes: `by_user_and_date` for efficient querying
- Search indexes: `search_content` and `search_title` for full-text search

**2. Navigation & Access**
- FileText icon in date header (next to copy icon)
- Notes folder in sidebar under dates that have full-page notes
- Checkbox icon to return to todos view from full-page notes
- FilePlus icon to create new notes within full-page notes view

**3. User Interface**

**Tab System**
- Chrome-style tabs displaying note titles
- Horizontally scrollable when more than 4 tabs are open
- X button on each tab to close (does not delete the note)
- Double-click tab title to rename
- Tab order persists based on creation order

**Editing Experience**
- Single-click to start typing
- Line numbers that scale with font size
- Markdown rendering in display mode
- Syntax highlighting for code blocks
- Copy button for note content
- Auto-save on content changes

**Sidebar Integration**
- Collapsible "Notes" folder under each date
- Displays all full-page note titles
- Click note title to open that note
- Three-dot menu for rename/delete actions
- Active state indicator for currently open note

### User Workflow

1. User clicks FileText icon on a date header
2. First note is auto-created or first existing note opens
3. User can type immediately (auto-enters edit mode)
4. Click FilePlus to create additional notes
5. Switch between notes via tabs or sidebar
6. Close tabs with X button (note remains in database)
7. Return to todos with Checkbox icon

## Technical Implementation

### Backend (Convex)

**Mutations**
- `createFullPageNote`: Creates new note with auto-incrementing order
- `updateFullPageNote`: Updates title or content (idempotent, no pre-read)
- `deleteFullPageNote`: Permanently removes note
- `reorderFullPageNotes`: Updates note order (parallel updates)

**Queries**
- `getFullPageNotesByDate`: Returns all notes for a date, sorted by order
- `getFullPageNote`: Returns single note by ID
- `getFullPageNoteCounts`: Returns count of notes per date for sidebar

**Write Conflict Prevention**
- Direct patching without pre-reading
- Idempotent mutation design
- Parallel updates with Promise.all
- No unnecessary data reads

### Frontend (React)

**Components**
- `FullPageNoteView.tsx`: Main note editing/display component
- `FullPageNoteTabs.tsx`: Tab navigation interface
- `NotesForDate` (in Sidebar.tsx): Sidebar folder display

**State Management**
- `showFullPageNotes`: Boolean for view toggle
- `openFullPageNoteTabs`: Array of open tab IDs
- `selectedFullPageNoteId`: Currently active note ID
- `isEditMode`: Toggle between edit/display modes

**Key Features**
- Reactive queries for real-time updates
- Automatic edit mode for new notes
- Font size integration with user preferences
- Line height calculation (fontSize * 1.5)
- Context-aware copy button

### Styling (CSS)

**Desktop**
- Tab height: 48px
- Tab width: 120-200px
- Font size: 13px (tab titles)
- Border radius: 6px (tabs)
- Smooth scrolling for tab overflow

**Mobile Responsive**
- Tab width: 80-120px
- Reduced padding: 8px (tabs), 12px (content)
- Smaller font: 12px (tabs)
- Touch-optimized tap targets

**Theme Support**
- Works across dark, light, and tan themes
- Active note overlay: rgba(0, 0, 0, 0.2)
- Parent date active state: white text
- Follows existing theme variables

## User Preferences

**Font Size Integration**
- Full-page notes respect Todo Text Font Size setting
- Line numbers scale proportionally
- Line height maintains 1.5 ratio
- Applies to both edit and display modes

## Data Persistence

**Auto-Save**
- Content saves on blur or mode change
- Title saves on Enter or blur
- No manual save button required

**Data Retention**
- Closing tab does not delete note
- Notes persist in database until explicitly deleted
- Order maintained across sessions
- Search indexes enable future search features

## Security & Permissions

**Authentication**
- All mutations require authenticated user
- Queries return empty array for unauthenticated users
- User ID automatically attached to all notes
- Users can only access their own notes

**Authorization**
- Owner-only access enforced at query level
- Delete operations verify ownership
- Internal mutations for secure operations

## Future Enhancements

**Potential Features**
- Note templates
- Export/import functionality
- Collaborative editing
- Version history
- Rich text formatting
- File attachments
- Note search within app
- Tags and categories
- Pinning notes
- Note sharing

## Performance Considerations

**Optimizations**
- Indexed queries for fast retrieval
- Direct patching to avoid write conflicts
- Parallel updates for reordering
- Lazy loading of note content
- Efficient re-rendering with React keys

**Scaling**
- No limit on notes per date
- Pagination ready for large collections
- Search indexes for quick lookups
- Optimized database queries

## Mobile Experience

**Responsive Design**
- Full touch support
- Optimized tab sizes
- Reduced padding for screen space
- Sidebar auto-closes on mobile after opening note
- Date format: "10/28/25" instead of full date

**Interactions**
- Single-tap to edit
- Swipe to scroll tabs
- Pinch to zoom (system default)
- Haptic feedback on actions

## Success Metrics

**User Adoption**
- Percentage of users creating full-page notes
- Average notes per user
- Average notes per date
- Daily/weekly active note users

**Engagement**
- Note edit frequency
- Time spent in full-page notes
- Note content length
- Tab switching patterns

**Performance**
- Load time for notes
- Save operation latency
- Search query response time
- UI responsiveness score

## Integration Points

**Existing Features**
- Shares font size preference with todos
- Integrates with date navigation
- Works with theme system
- Respects authentication state
- Compatible with keyboard shortcuts

**Search Integration**
- Notes indexed for future global search
- Search by title and content
- User-scoped search results

## Implementation Timeline

**Phase 1: Core Features** ✅
- Database schema
- Basic CRUD operations
- Tab interface
- Sidebar integration

**Phase 2: Polish** ✅
- Font size integration
- Mobile optimization
- Active state indicators
- ESC key support

**Phase 3: Launch** 
- Documentation
- Launch page updates
- User onboarding
- Performance monitoring

## Known Limitations

**Current Constraints**
- No real-time collaboration
- No version history
- No rich text editing
- No file attachments
- No export formats
- No note templates

**Technical Debt**
- Consider note archiving feature
- Evaluate need for soft deletes
- Review query performance at scale
- Assess mobile UX improvements

## Conclusion

Full-page notes extends Better Todo from a simple task manager into a comprehensive productivity tool. By providing dedicated note-taking space tied to specific dates, users can maintain context for their tasks while enjoying a powerful editing experience with syntax highlighting and markdown support.

