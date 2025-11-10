# ChittyChronicle Evidence Orchestrator Dashboard - Design Guidelines

## Design Approach
**System-Based Approach**: Drawing from Material Design and Fluent Design principles optimized for data-intensive legal tech applications. Emphasis on scannable information architecture, clear status indicators, and operational efficiency.

## Typography System
- **Primary Font**: Inter (Google Fonts) - exceptional legibility for data
- **Monospace Font**: JetBrains Mono - for content hashes and technical identifiers

**Hierarchy**:
- Dashboard Title: text-2xl font-semibold
- Section Headers: text-lg font-medium
- Table Headers: text-sm font-medium uppercase tracking-wide
- Body/Data: text-sm font-normal
- Metadata/Timestamps: text-xs
- Status Badges: text-xs font-medium uppercase tracking-wider

## Layout System
**Spacing Primitives**: Use Tailwind units 2, 4, 6, 8 for consistent rhythm
- Component padding: p-4 to p-6
- Section spacing: space-y-6
- Card gaps: gap-4
- Table cell padding: px-4 py-3

**Grid Structure**:
- Main container: max-w-[1400px] mx-auto px-6
- Sidebar (filters): fixed w-64 on desktop, collapsible drawer on mobile
- Content area: flex-1 with responsive tables

## Component Architecture

### Dashboard Header
Full-width bar with auto-refresh controls, global search, and user context. Include live status indicator showing last refresh timestamp and next poll countdown.

### Filter Sidebar
Persistent left panel (desktop) containing:
- Case selector dropdown with search
- Target system checkboxes (ChittyLedger, ChittyVerify, ChittyTrust, ChittyChain) with active count badges
- Status filter group with badge preview
- Date range picker with quick presets (Today, Last 7 days, Last 30 days)
- Clear all filters button at bottom

### Evidence Table
Primary data surface with:
- Fixed header row with sortable columns
- Columns: Envelope Title, Content Hash (mono font, truncated with tooltip), Target Systems (icon grid), Status, Created, Actions
- Row hover state with subtle elevation
- Expandable row detail showing full distribution breakdown per target
- Batch selection checkboxes with sticky action bar when items selected
- Empty state illustration when no results

### Status Badge System
Compact rounded-full badges with icon + text:
- Pending: Clock icon
- Dispatching: Spinner icon (animated)
- Delivered: Check icon
- Failed: Alert icon
- Badge clustering when showing multiple statuses per envelope

### Action Components
- Primary actions: Retry Failed, Acknowledge, Refresh (icon buttons with tooltips)
- Batch action bar: Slides up from table bottom, shows selection count + bulk operations
- Quick actions menu (3-dot) per table row

### Distribution Detail Panel
Expandable accordion within table rows showing:
- Four-column grid for each Chitty target
- Per-target status timeline with timestamps
- Message delivery logs in collapsed/expandable format
- Copy hash button per entry

### Statistics Dashboard Cards
Row of metric cards above table:
- Total Envelopes
- Success Rate (percentage with trend indicator)
- Failed Items Requiring Attention (highlighted)
- Average Delivery Time
Cards use grid-cols-1 md:grid-cols-2 lg:grid-cols-4

## Icons
**Library**: Heroicons (via CDN)
Use outline style for navigation, solid style for status indicators

## Responsive Behavior
- Desktop (lg): Sidebar visible, full table columns
- Tablet (md): Collapsible sidebar, condensed table
- Mobile: Drawer sidebar, card-based evidence list replacing table

## Data Display Patterns
- Hash values: Monospace font, first 8 + last 8 characters with ellipsis
- Timestamps: Relative format (2h ago) with tooltip showing absolute time
- Target systems: Icon badges in horizontal list with tooltips
- Loading states: Skeleton screens matching table structure

## Interaction Patterns
- Auto-refresh: Polling indicator in header, manual refresh button
- Search: Debounced input with clear button, searches titles and hashes
- Filters: Immediate application with result count update
- Sorting: Click column headers, visual indicator for active sort
- Expansion: Smooth height transition for row details

## Visual Hierarchy Principles
- Failed/attention items: Visually distinct through badge prominence and optional row treatment
- Successful items: Lower visual weight, allowing focus on issues
- Critical actions: Primary button styling
- Metadata: Reduced opacity and smaller size

This design prioritizes operational clarity, rapid status identification, and efficient evidence management workflows for legal professionals requiring authoritative data presentation.