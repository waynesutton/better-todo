# Shareable Full Page Notes with Custom URL Slugs

## Overview

This feature enables users to create shareable read-only links for their full-page notes with customizable URL slugs. Non-logged-in users can view shared notes through a public route, accessing limited sidebar functionality while other actions prompt login. Logged-in users viewing someone else's notes will see a read-only view.

## Feature Description

### Core Functionality

Users can generate shareable links for their full-page notes with custom URL slugs. Shared notes are accessible via `/share/:slug` route without requiring authentication. The public view provides limited functionality while maintaining the note's display capabilities.

### Key Components

**1. Sharing System**
- Share icon button in FullPageNoteTabs component
- Modal/popover for generating and managing share links
- Custom slug input with uniqueness validation
- Copy link functionality
- Revoke/disable sharing option

**2. Public Route**
- New route: `/share/:slug`
- No authentication required
- Displays note in read-only mode
- Shows limited sidebar with specific icons only

**3. Limited Sidebar for Non-Logged-In Users**
- Toggle sidebar (show/hide)
- Copy fullpage note text
- Enter fullpage note icon (fullscreen mode)
- Other icons show login prompt

**4. Read-Only Access**
- Non-logged-in users: read-only view
- Logged-in users viewing others' notes: read-only view
- Visual indicator showing note owner and read-only status
- No editing, saving, or deleting capabilities

## Technical Implementation

### Backend (Convex)

**Schema Updates**

Add to `fullPageNotes` table:
- `shareSlug`: `v.optional(v.string())` - Custom URL slug for sharing
- `isShared`: `v.optional(v.boolean())` - Whether note is currently shared

Add index:
- `by_shareSlug`: `["shareSlug"]` - For looking up notes by slug (unique constraint handled in application logic)

**Mutations**

`generateShareLink` (public mutation)
- Arguments: `{ noteId: v.id("fullPageNotes"), customSlug: v.optional(v.string()) }`
- Returns: `v.object({ shareUrl: v.string(), slug: v.string() })`
- Validates slug uniqueness (case-insensitive)
- Validates slug format (alphanumeric, hyphens, underscores, 3-50 chars)
- Generates random slug if customSlug not provided
- Updates note with shareSlug and isShared: true
- Returns full shareable URL

`revokeShareLink` (public mutation)
- Arguments: `{ noteId: v.id("fullPageNotes") }`
- Returns: `v.null()`
- Verifies note ownership
- Removes shareSlug and sets isShared: false

`updateShareSlug` (public mutation)
- Arguments: `{ noteId: v.id("fullPageNotes"), newSlug: v.string() }`
- Returns: `v.object({ shareUrl: v.string(), slug: v.string() })`
- Validates slug uniqueness
- Validates slug format
- Updates shareSlug while keeping isShared: true
- Returns updated shareable URL

**Queries**

`getNoteBySlug` (public query, no auth required)
- Arguments: `{ slug: v.string() }`
- Returns: `v.union(v.object({...note fields...}), v.null())`
- Looks up note by shareSlug
- Returns note data if isShared is true
- Returns null if note not found or not shared

`checkSlugAvailability` (public query, no auth required)
- Arguments: `{ slug: v.string() }`
- Returns: `v.boolean()`
- Checks if slug is available (case-insensitive)
- Returns true if available, false if taken

**Write Conflict Prevention**
- Direct patching without pre-reading shareSlug
- Idempotent slug generation
- Parallel availability checks minimized

### Frontend (React)

**New Components**

`ShareLinkModal.tsx`
- Modal component for managing share links
- Input field for custom slug
- Real-time slug availability checking
- Copy link button with visual feedback
- Revoke sharing button
- Slug format validation UI
- Error messages for conflicts

**Route Updates**

Add to `AppRouter` in `src/App.tsx`:
- New route: `<Route path="/share/:slug" element={<SharedNoteView />} />`

**New Page Component**

`SharedNoteView.tsx`
- Fetches note by slug using `getNoteBySlug` query
- Displays note in read-only mode
- Shows limited sidebar with specific icons
- Handles non-existent/invalid slugs
- Shows login prompt for restricted actions
- Displays note owner information (if available)

**FullPageNoteTabs Updates**

Add share icon button:
- Link icon next to copy and fullscreen buttons
- Opens ShareLinkModal
- Shows indicator if note is currently shared
- Positioned in action buttons area

**FullPageNoteView Updates**

Read-only mode detection:
- Check if `currentUserId !== note.userId`
- Disable text editing
- Hide save/delete controls
- Show read-only indicator
- Maintain display mode functionality

**Sidebar Updates**

Conditional rendering for public view:
- Show toggle sidebar button
- Show copy note text button
- Show enter fullscreen button
- Hide/disable other icons with login prompt
- Detect public route context

**Public Route Detection**

Create utility or context:
- Detect if current route is `/share/:slug`
- Pass context to components that need it
- Conditionally render sidebar and actions

## User Workflow

### For Note Owner (Logged In)

1. User opens full-page note
2. Clicks share icon in tab actions
3. ShareLinkModal opens
4. Optionally enters custom slug (or uses auto-generated)
5. System validates slug availability
6. Link is generated and displayed
7. User copies link to share
8. User can update slug later
9. User can revoke sharing anytime

### For Non-Logged-In Viewer

1. Visits `/share/:slug` URL
2. Note loads in read-only view
3. Can toggle sidebar
4. Can copy note content
5. Can enter fullscreen mode
6. Other actions show login prompt
7. Sidebar shows limited functionality

### For Logged-In Viewer (Viewing Others' Notes)

1. Visits `/share/:slug` URL while logged in
2. Note loads in read-only view
3. Visual indicator shows "Viewing [Owner]'s note (read-only)"
4. Cannot edit, save, or delete
5. Full display mode functionality available
6. Can copy content
7. Can enter fullscreen

## UI/UX Considerations

### Share Link Modal

- Clean, minimal design matching existing modals
- Slug input with placeholder: "my-custom-slug"
- Real-time availability indicator (green checkmark or red X)
- Format validation feedback
- Copy button with success animation
- Revoke button with confirmation
- Shows current share URL if already shared

### Read-Only Indicators

- Subtle banner or badge: "Viewing [Owner]'s note (read-only)"
- Disabled state for edit controls
- Tooltip on disabled actions explaining read-only status
- Visual distinction without being intrusive

### Login Prompts

- Tooltip/modal on restricted icons
- Message: "Login to create your own note"
- Link to Clerk sign-in with redirect back to shared note
- Consistent with existing sign-in prompts

### Error States

- Invalid slug: "Note not found or no longer shared"
- 404-style page for non-existent slugs
- Clear error messages
- Link back to home page

## Security & Permissions

### Slug Validation

- Only alphanumeric characters, hyphens, underscores
- Length: 3-50 characters
- Case-insensitive uniqueness check
- Reserved words prevention (share, api, admin, etc.)
- No special characters or spaces

### Access Control

- Only note owner can generate/revoke share links
- Public queries bypass authentication
- Note must have `isShared: true` to be accessible
- Ownership verification in all mutations
- Slug lookup only returns shared notes

### Data Privacy

- Only note content and title exposed (no user metadata)
- No access to other notes from same user
- No access to user's todos or other data
- Read-only prevents any modifications

## Edge Cases

### Slug Conflicts

- Real-time availability checking
- Case-insensitive comparison
- Clear error message if slug taken
- Suggest alternative slugs
- Auto-append numbers if conflict

### Revoked Sharing

- Shared link becomes invalid immediately
- Shows "Note no longer shared" message
- Option to go back or sign in

### Deleted Notes

- Shared note deletion removes share link
- Public route shows "Note not found"
- Handle gracefully with 404 page

### Slug Changes

- Old slug becomes invalid
- New slug works immediately
- Consider redirecting old slugs (optional enhancement)

### Multiple Tabs

- Share state updates in real-time
- Modal reflects current sharing status
- Copy button always shows latest URL

## Performance Considerations

### Slug Availability Checking

- Debounce input (300-500ms)
- Minimal query load
- Cache recent checks
- Index on shareSlug for fast lookups

### Public Route Loading

- Optimize note query for public access
- No unnecessary data fetching
- Fast initial render
- Graceful loading states

## Theme Compatibility

### All Themes Supported

- Share modal matches existing theme system
- Read-only indicators use theme colors
- Public route respects user's theme preference
- Sidebar icons match theme styling
- Login prompts use theme-aware Clerk appearance

### Dark Mode
- Share modal background: `#2e3842`
- Read-only indicator: Subtle overlay
- Disabled states: Lower opacity

### Light Mode
- Share modal background: `#ffffff`
- Read-only indicator: Light border
- Disabled states: Grayed out

### Tan Mode
- Share modal background: `#faf8f5`
- Read-only indicator: Warm border
- Disabled states: Muted colors

## Implementation Checklist

### Backend
- [ ] Update schema with shareSlug and isShared fields
- [ ] Add by_shareSlug index
- [ ] Implement generateShareLink mutation
- [ ] Implement revokeShareLink mutation
- [ ] Implement updateShareSlug mutation
- [ ] Implement getNoteBySlug query (public)
- [ ] Implement checkSlugAvailability query (public)
- [ ] Add slug validation utilities
- [ ] Add reserved words list
- [ ] Test write conflict prevention

### Frontend
- [ ] Create ShareLinkModal component
- [ ] Add share icon to FullPageNoteTabs
- [ ] Create SharedNoteView page component
- [ ] Add `/share/:slug` route
- [ ] Update FullPageNoteView for read-only mode
- [ ] Update Sidebar for public view
- [ ] Add read-only indicators
- [ ] Implement login prompts for restricted actions
- [ ] Add error handling for invalid slugs
- [ ] Add loading states
- [ ] Test all themes

### Testing
- [ ] Test slug generation and uniqueness
- [ ] Test public access without authentication
- [ ] Test read-only mode for logged-in users
- [ ] Test sidebar functionality in public view
- [ ] Test slug updates and revocation
- [ ] Test error states
- [ ] Test theme compatibility
- [ ] Test mobile responsiveness

## Future Enhancements

### Potential Features
- View count tracking
- Expiration dates for share links
- Password protection for shared notes
- Edit permissions (collaborative editing)
- Share analytics
- Bulk sharing
- QR code generation for share links
- Email sharing option

## Conclusion

This feature transforms full-page notes into shareable content while maintaining security and user control. The custom slug system provides memorable URLs, and the read-only public view ensures content safety. The implementation follows existing patterns and maintains consistency with the app's design system and theme support.

