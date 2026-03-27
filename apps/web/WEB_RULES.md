# Web Rules

## Frontend Stack Without Next.js

## Summary

Use `React + Vite + TypeScript` for the web frontend.

This fits SplitFlow better than Next.js if the priority is:

- a simpler stack
- fast delivery of the authenticated product
- plain CSS instead of utility CSS frameworks
- no SSR framework overhead

Given the business case, the web app is mainly an online-only product UI over an existing API. The highest-value work is forms, tables, auth, shared-transaction workflows, notifications, and admin screens. That does not require Next.js.

## Recommended Stack

- Build tool / app shell: `Vite`
- UI runtime: `React + TypeScript`
- Routing: `React Router`
- Styling: plain CSS with `CSS Modules` for component styles
- Global styling: one `global.css` for reset, tokens, layout helpers, typography, and theme variables
- Forms: `React Hook Form + Zod`
- Server state / API cache: `TanStack Query`
- Tables: `TanStack Table` when list screens become complex
- Charts: `Recharts` only if dashboard/reporting screens need it
- Testing: `Vitest + React Testing Library`, plus `Playwright` for core flows
- Code quality: `Biome`, aligned with the existing repo

## Key Implementation Choices

- Create the frontend as `apps/web` in the current monorepo.
- Build it as a client-rendered SPA with both public and authenticated routes in the same app.
- Public pages are intentionally small and focused on landing and auth-related flows.
- Keep public pages lightweight and mostly static; do not introduce SSR just for them.
- Use the backend's existing session-cookie auth and keep auth/business rules in the API.
- Prefer a deployment/proxy setup where the frontend can call the API without awkward cookie/CORS friction.
- Generate TypeScript API types from the backend OpenAPI docs, but keep the actual client lightweight and handwritten.
- Start with native HTML + custom components + CSS Modules.
- Do not adopt Radix by default. Add it only later if complex widgets become painful.

## Architecture Decisions

### Routing

- Use a single SPA with both public and authenticated routes.
- Public pages and authenticated pages should live in the same frontend app.
- Keep the public route surface intentionally small:
  - landing page
  - login and auth-related pages
- Protected routes should be enforced in the client app based on the current authenticated user state.

### Route Groups

- Organize routes into three top-level groups:
  - public
  - authenticated user app
  - authenticated admin app
- Public routes should include:
  - landing page
  - login
  - signup
  - forgot password
  - reset password
  - email verification flow if needed
- Authenticated user routes should include the main product experience.
- Authenticated admin routes should include account management and app-level administration.

### Initial Route Map

- Public routes:
  - `/`
  - `/login`
  - `/signup`
  - `/forgot-password`
  - `/reset-password`
  - `/verify-email`
- User app routes:
  - `/app`
  - `/app/accounts`
  - `/app/transactions`
  - `/app/transactions/new`
  - `/app/notifications`
  - `/app/settings`
- Admin app routes:
  - `/admin`
  - `/admin/users`
  - `/admin/users/:id`
  - `/admin/categories`
- Treat the full route map above as the intended v1 scope.
- Implementation can happen incrementally, but the architecture should assume the full scope from the beginning.

### Navigation Model

- User shell navigation:
  - `Dashboard`
  - `Accounts`
  - `Transactions`
  - `Notifications`
  - `Settings`
- Admin shell navigation:
  - `Overview`
  - `Users`
  - `Categories`
- Notifications should exist as a dedicated page and can also be exposed later as a header shortcut or badge.
- Default post-login route should be `/app`.
- Public shell navigation should stay minimal and should not mirror the authenticated app shell.

### Dashboard

- `/app` should be the main post-login landing screen for authenticated users.
- The first version of the dashboard should prioritize clarity and actionability over dense analytics.
- The dashboard should help the user quickly:
  - understand their current financial snapshot
  - see what needs attention
  - jump into common actions

### Dashboard Content

- Top summary area:
  - total balance across active accounts
  - income summary for the current period
  - expense summary for the current period
  - net result for the current period
- Accounts section:
  - list of active accounts with current balance
  - account color/icon visible for recognition
- Recent transactions section:
  - latest transactions from the unified transaction feed
  - include visual identifiers for shared and recurring items
- Attention / pending section:
  - pending shared transaction actions
  - pending notifications
  - any important items requiring user action should be grouped here
- Quick actions section:
  - create expense
  - create income
  - create transfer
  - go to transactions

### Dashboard Defaults

- Assume this initial summary card order:
  - total balance
  - income
  - expense
  - net result
- The default current period should be the current month.
- Current period should be configurable later in user setup/settings.
- The main balance should be shown in the user's main currency only.
- Main currency should be configurable later in user setup/settings.
- The recent transactions section should show the last `10` items by default.
- The recent transactions count can be adjusted later if the final layout needs more or less space.

### Dashboard Behavior

- The dashboard should be scannable at a glance and should not try to expose every report in the first version.
- If there is no meaningful data yet, show useful empty states with clear next actions.
- The dashboard should remain useful on mobile and desktop, but the primary design target is product web usage.
- Summary values should use the same currency/money formatting rules as the rest of the app.
- The dashboard should reuse the same primary create patterns defined elsewhere in this document.

### Settings / Setup

- The app should include a user settings/setup area under `/app/settings`.
- The first version of settings can be defined at the frontend spec level even before a backend endpoint exists.
- Until backend persistence exists, settings should use safe frontend defaults and be treated as planned product behavior.

### Initial Settings Scope

- Main currency
  - used for the dashboard main balance presentation
- Default reporting period
  - used for dashboard summaries and similar views
- Timezone
  - used for date handling and presentation
- Date format
  - optional display preference if introduced early
- Default transaction status
  - useful for pre-filling the transaction form
- Default account
  - optional convenience for new transaction creation

### Settings Defaults

- Main currency: no custom setting until backend support exists
- Default reporting period: current month
- Timezone: use the user's environment/browser timezone by default
- Date format: use the app default until user customization exists
- Default transaction status: `pending`
- Default account: none selected

### Settings Evolution Rule

- Settings should start simple and expand only when the related behavior is already meaningful in the product.
- Do not overbuild settings before there is a clear backend model and real user value.

### Accounts UX

- The accounts area should prioritize quick recognition and current financial state over dense tabular detail.

### Accounts List

- Use a card or list-item component instead of a table for the main accounts view.
- Each account card should show the most important information at a glance:
  - account name
  - current balance
  - currency
  - account icon
  - account color
  - archived state when applicable
- Do not emphasize the initial amount in the list view.
- Current balance is more important than initial amount and should be the primary numeric value shown.

### Accounts Form

- The account create/edit form should follow the same visual language as the transaction form.
- The form should stay straightforward and focused on the required fields.
- Recommended default:
  - use a proper page or dedicated form view for the main create/edit experience
  - allow a smaller quick-create version later from transaction pickers when needed
- Reasoning:
  - the dedicated form is better for picking name, icon, color, currency, and other account details cleanly
  - quick-create inside the transaction flow can exist later as a simplified convenience path

### Account Form Fields

- Required:
  - name
  - currency
  - icon
  - color
- Optional but shown:
  - initial balance
- Edit-only:
  - archive account action

### Account Form Defaults

- Initial balance should default to `0`.
- Currency should use the same searchable picker style used across the app.
- Icon selection should use a curated subset of the chosen icon system.
- Color selection should use a curated palette instead of a free-form color picker.
- The final icon subset and color palette can be chosen during implementation based on real UI needs, but both should remain curated rather than fully unrestricted.

### Account Form Validation

- Name is required.
- Currency is required.
- Icon is required.
- Color is required.
- Initial balance must be a valid decimal value.

### Account Form Interaction Rules

- Use a dedicated create/edit form as the main account management flow.
- Use the same visual language as transaction forms for consistency.
- Account archive should be a separate action button in edit mode instead of a simple inline toggle.

### Account Color Usage

- The account color should be visible in the account card.
- Use the color in a controlled, reusable way such as:
  - icon background
  - accent strip
  - subtle tinted area
- Avoid making the whole card overly saturated or visually noisy.
- Recommendation:
  - prefer color on the icon container or a restrained accent area first
  - use gradients only if they remain subtle and reusable across account cards

### Account Icons

- The account icon should be visible in the card and help the user quickly identify the account.
- We need an icon library that works well for both web and mobile so the visual language can stay aligned across platforms.
- Recommendation:
  - choose a library with broad coverage, simple outlines, and React support
  - prioritize consistency, readability at small sizes, and cross-platform availability over novelty
- Selected default:
  - `Lucide`
- Reasoning:
  - clean and modern product-UI fit
  - works well in React web apps
  - strong match for navigation, account cards, actions, and status indicators
  - aligns well with the restrained visual system already defined for the product

### Notifications UX

- Notifications should behave as a longer-lived product inbox, not just ephemeral alerts.
- The main notifications experience should live at `/app/notifications`.
- Notifications should also be represented in the authenticated user shell with a header badge or similar indicator.

### Notifications Page

- Use a list of cards or list items instead of a dense table.
- Each notification item should show:
  - title
  - message or short description
  - timestamp
  - notification type or status indicator
  - direct actions when the notification is actionable
- Actionable notifications should allow the user to act directly from the notification item whenever it is safe and clear to do so.
- Non-actionable notifications should still link to the related record or relevant screen.

### Notifications Behavior

- Implement all notification types exposed by the backend.
- Keep read and resolved concepts separate and let the backend remain the source of truth for those states.
- Default list behavior should prioritize active and relevant notifications.
- Outdated or superseded notifications should be hidden by default.
- Outdated or superseded notifications should still be accessible when the user explicitly chooses to view them.
- The page should support this behavior through filters or a dedicated visibility toggle.

### Notifications Prioritization

- Show unread, pending, or otherwise actionable notifications first.
- Shared transaction and payment-related notifications should feel especially prominent because they are tied to user actions.
- Recurring and other informational notifications should still appear, but should not visually compete with urgent actions when both are present.

### Notifications Header UX

- Show a notifications badge in the authenticated user shell header.
- The badge should communicate the count of notifications requiring attention.
- A lightweight dropdown or preview can be added later, but the dedicated notifications page remains the main source of truth.

### Groups And Shared UX

- Groups should feel like a supporting workflow for shared transactions, not a separate primary product area.
- Shared transactions remain part of the unified transaction experience.
- Group management should exist as a secondary area, not a primary navigation destination.

### Group Management

- Add a dedicated user route for group management as a secondary route.
- Keep it outside the primary user navigation by default.
- Use a card or list-item view for groups.
- Each group item should show:
  - group name
  - member count
  - member preview
  - current/active version state when relevant

### Group Versioning UX

- Membership changes should be explained clearly to the user.
- The UI should not make membership changes feel like silent edits to history.
- When membership changes, the UX should communicate that a new group version will be created for future shared transactions.
- Older group versions should remain visible in the UI.
- Older group versions should be de-emphasized and read-only.

### Shared Transaction Flow

- Shared transactions should be created from the unified transaction form when shared mode is enabled.
- Selecting a group should load the group members into the form.
- Split methods in v1 should remain limited to:
  - `equal`
  - `fixed`
- Shared-related transaction indicators in the unified transaction list should remain visible through icons, badges, labels, or filters as needed.

### Group Picker Behavior

- The group picker should follow the same picker rules used elsewhere in the app.
- Users should be able to create a new group inline from the group picker without leaving the transaction form.

### Shared Edit And Reapproval UX

- If editing a shared transaction will trigger reapproval, the UI should warn the user clearly before saving.
- The warning should explain that participants may need to review and accept the updated shared transaction again.

### Admin Users UX

- The admin experience should remain operational and restrained.
- Admin screens are for account and lifecycle management, not access to private financial data.
- The UI should reinforce that boundary clearly.

### Admin Users List

- `/admin/users` should be the main user-management screen.
- Use a table-based list-first workflow for admin users.
- Recommended columns:
  - name
  - email
  - role
  - active status
  - email verification status
  - created date
  - actions
- Recommended filters:
  - text search
  - role
  - active or inactive status
  - verified or unverified status
  - include deleted
- Use badges or similar indicators to make inactive, deleted, and unverified states easy to scan.

### Admin User Detail

- Provide a dedicated detail page for one user at `/admin/users/:id`.
- The detail view should focus on management data and lifecycle actions.
- Show:
  - name
  - email
  - role
  - active status
  - email verification status
  - lifecycle timestamps
- Actions should include:
  - activate or reactivate
  - deactivate
  - reset password
  - soft delete
- Higher-risk actions should happen from the detail page rather than only inline in the list.

### Admin User Actions

- Create user should use a minimal operational form.
- When an admin creates a user, the UI should emphasize the follow-up reset/setup flow instead of exposing temporary password details prominently.
- Deactivation and delete flows should use strong confirmation dialogs.
- The UI should reflect the rule that admins cannot manage their own lifecycle through the normal admin management flow.

### Admin Structure

- `/admin` can have a lightweight overview, but `/admin/users` should remain the main operational destination.
- Admin categories should feel more like app setup/configuration than a generic CRUD screen.

### Categories And Tags UX

- Categories and tags should be treated as related but different product concepts.
- Categories should feel more structured and controlled.
- Tags should feel lighter, faster, and more personal.

### Categories UX

- Provide dedicated secondary routes for category management.
- Categories should support both:
  - default/admin-managed categories
  - personal/user-managed categories
- In the normal user experience, default and personal categories should appear in one management flow but remain clearly separated or labeled.
- Categories should be grouped or filtered by type:
  - income
  - expense
- Normal users should be able to:
  - create personal categories
  - edit their own categories
  - hide or remove their own categories for future use when allowed
- Default categories should be visible to normal users but not editable by them.
- Categories should include icons.
- Category management in admin should feel like app configuration rather than generic CRUD.

### Tags UX

- Provide a dedicated secondary route for tag management.
- Tags should also support inline creation and lightweight management from the transaction form.
- Tags should be shown in a lightweight chip/item style when possible.
- Users should be able to create, edit, and delete their own tags quickly.
- Tags should remain simpler and less structured than categories.

### Category And Tag Design Rules

- Categories should show:
  - name
  - type
  - icon
  - default/personal distinction when relevant
- Tags should show:
  - name
  - color
- Tags should use a curated color palette rather than unrestricted color selection.
- Categories do not need the same color treatment emphasis as tags or accounts.

### Category And Tag Behavior

- Category and tag management can live on secondary pages rather than in primary navigation.
- Inline creation inside the transaction form is especially important for tags and also useful for categories.
- If a category is already used historically, removing it should not break old transactions.
- Prefer hiding categories from future selection rather than breaking historical references.
- Do not add reordering or grouping complexity to tags in v1.

### Responsive And Navigation Behavior

- The app should stay structurally consistent across breakpoints, but layouts should adapt to the available space.
- Desktop should remain the primary productivity experience.
- Mobile should remain fully usable and should not feel like a reduced afterthought.

### User Shell Responsive Behavior

- Desktop:
  - use a left sidebar for primary navigation
  - use a top header for page title, contextual actions, notifications, and profile access
- Tablet and smaller desktop:
  - allow the sidebar to collapse to an icons-only state before switching fully to mobile navigation
- Mobile:
  - use a bottom navigation with four main destinations:
    - Dashboard
    - Transactions
    - Accounts
    - More
  - notifications should be accessed from a top-right header icon or similar header action
  - keep the primary create action prominent

### Mobile Create Action

- On mobile, the main floating create action should sit centered above the bottom navigation.
- The centered create action should remain visually prominent without conflicting with the bottom-nav destinations.

### Public And Admin Responsive Behavior

- Public shell should stay lightweight and simple across breakpoints.
- Admin shell should keep a desktop-first sidebar/header structure.
- On smaller screens, admin navigation can move into a drawer rather than using the same bottom-nav approach as the main user app.

### Responsive Content Rules

- Keep a consistent page rhythm across the app:
  - page title
  - primary actions
  - filters
  - main content
- On mobile, filters should collapse into a dedicated filter sheet or panel instead of always staying inline.
- Transactions should adapt to a list/card-oriented presentation on mobile instead of relying on wide desktop table layouts.
- Admin-heavy table screens may use controlled horizontal overflow when necessary, but user-facing financial flows should prefer more adaptive layouts.

### Loading, Empty, And Error States

- Loading, empty, and error states should be treated as reusable product patterns rather than ad hoc fallbacks.
- These patterns should stay consistent across dashboard, transactions, accounts, notifications, groups, admin screens, and picker flows.

### Loading States

- Prefer skeleton-based loading states for page and section content.
- Use spinners primarily for localized actions such as:
  - saving a form
  - deleting an item
  - loading picker results
- Avoid relying on generic full-page spinners as the main loading pattern.

### Empty States

- Empty states should be encouraging but restrained.
- They should explain:
  - what the area is for
  - why it is empty when useful
  - what the next action should be
- Empty states should include a CTA when there is a meaningful next step.
- Dashboard empty states should lightly support onboarding, such as creating the first account or first transaction.
- No notifications can use a calmer confirmation-style empty state.

### No Results States

- Distinguish between:
  - a truly empty dataset
  - no results caused by search or filters
- No-results states should suggest clearing or adjusting filters rather than behaving like first-time onboarding.

### Error States

- Error states should be user-friendly by default.
- Distinguish between:
  - page load failures
  - section-level failures
  - form submission failures
- Prefer retryable patterns when a retry makes sense.
- Form submission errors should show field-level validation when possible and a form-level error when necessary.

### Destructive Action Pattern

- For destructive actions such as delete and archive:
  - confirm first
  - then execute
- Do not rely on optimistic delete-with-undo patterns in the initial version.

### Picker State Patterns

- Picker and quick-create flows should also support:
  - loading states
  - empty states
  - no-results states
  - inline create actions when relevant
- If no matching account, category, tag, or group is found, the picker should make creation or recovery actions clear.

### Transactions UX Model

- Use one unified transactions experience instead of splitting normal, shared, and recurring transactions into separate primary pages.
- The main transaction list should show all transaction types in the same screen.
- Shared and recurring transactions should be distinguishable inside the list through clear UI identifiers, such as:
  - an icon
  - a badge
  - a secondary label
- Transaction filters should allow the user to narrow the list by transaction type or source when needed.
- Transaction create and edit flows should also be unified.
- Shared and recurring behavior should be selectable as part of the transaction form instead of being treated as fully separate top-level user flows.
- The transaction form should expose the relevant options and fields conditionally based on the selected transaction mode.
- The unified transaction experience should still respect backend distinctions and business rules for:
  - normal transactions
  - recurring transactions
  - shared transactions
- Route design should support this product decision:
  - keep `/app/transactions` as the main transaction hub
  - keep `/app/transactions/new` as the main creation entrypoint
  - avoid top-level user navigation entries for recurring and shared transaction management

### Transactions List

- The unified transactions page should use one main list/table for all transaction kinds.
- Initial columns:
  - date
  - description
  - category
  - account
  - amount
  - other indications
  - actions
- The `other indications` column should communicate special transaction characteristics, such as:
  - shared
  - recurring
  - tags
- Prefer compact visual identifiers for those indications:
  - icons
  - badges
  - short labels when clarity requires them
- The `actions` column should use compact icon actions for:
  - edit
  - delete
  - more actions

### Transactions Filters

- Initial filters should include:
  - text search across description and notes
  - period/date range
  - category
  - account
  - tags
- Filters should be designed so they can expand later without restructuring the page.
- A future-ready place should exist for transaction-mode filtering, such as:
  - normal
  - recurring
  - shared

### Transaction Form

- Use one unified create/edit transaction form.
- The form should include toggles or mode selectors that reveal the required fields for each transaction mode.
- The form should support conditional sections for:
  - standard transaction data
  - recurring settings
  - shared transaction settings
- Only the fields relevant to the selected mode should be visible or required.
- The UI should make the selected mode obvious so the user understands what kind of transaction is being created or edited.
- Use the unified form for:
  - expense
  - income
- Use a separate form flow for:
  - transfer
- Reasoning:
  - transfer has meaningfully different required information
  - separating transfer keeps the normal transaction form cleaner
  - expense and income are still close enough to share one main form structure

### Transaction Form Fields

- Unified expense/income form:
  - required:
    - amount
    - description
    - transaction date
    - account
    - category
  - optional:
    - status
    - notes
    - tags
  - type is predefined by the entrypoint used to open the form and should not be shown as a visible field
  - amount and status should be visually grouped together

- Recurring add-on fields for expense/income:
  - required when recurring is enabled:
    - recurring mode: `subscription` or `installment`
    - frequency
  - optional when recurring is enabled:
    - total occurrences
  - inherited from the base expense/income form:
    - amount
    - description
    - transaction date
    - account
    - category
    - notes
  - `startsOn` should use the main transaction date instead of being exposed as a separate field
  - `totalOccurrences` visibility should depend on the selected recurring mode

- Shared add-on fields for expense and income:
  - required when shared is enabled:
    - group
    - owner account
    - owner category
    - split method
  - inherited from the base form:
    - amount
    - description
    - transaction date
    - notes
  - optional when shared is enabled:
    - participant amounts when split method is `fixed`
  - once a group is selected, the form should load the group members
  - participant amount editing should only be enabled when split method is `fixed`

- Separate transfer form:
  - required:
    - from account
    - to account
    - description
    - transaction date
    - amount when both accounts use the same currency
    - from amount and to amount when accounts use different currencies
  - optional:
    - none required in the first version beyond the core fields above
  - transfer form should reuse the same account picker pattern used elsewhere
  - when accounts use different currencies, the UI may later expose a conversion factor helper

- Edit behavior:
  - normal transactions should open the unified expense/income form
  - transfers should open the dedicated transfer form
  - recurring and shared transactions should open the appropriate version of the unified flow with the related mode enabled

### Transaction Form Behavior

- Expense and income should use the same main form structure.
- Shared and recurring should behave as add-on modes within the main transaction form.
- Transfer should use a separate form because its required information is meaningfully different.
- The form should stay visually compact and reveal advanced sections only when the related mode is enabled.

### Picker Pattern

- Use one consistent picker pattern for:
  - accounts
  - categories
  - tags
  - groups
- The picker pattern should support:
  - searchable single-select behavior
  - searchable multi-select behavior
  - inline create without leaving the transaction form
- Inline create should be supported for:
  - accounts
  - categories
  - tags
- The transaction form should remain open while inline create is happening.
- After successful creation, the new option should immediately be available and selected when appropriate.

### Transaction Form Defaults

- Default status: `pending`
- Default date shortcut: `today`
- Date field quick options:
  - `today`
  - `yesterday`
  - `other`, which opens a date picker
- Default split method: `equal`
- Default recurring toggle: off
- Default shared toggle: off
- Default account: none selected
- Default category: none selected
- Default tags: none selected

### Transaction Form Validation

- Description is required.
- Amount is required.
- Account is required for normal income and expense.
- Category is required for normal income and expense.
- Tags must be unique.
- If recurring is enabled:
  - recurring mode is required
  - frequency is required
  - `totalOccurrences` visibility and requirement should depend on the recurring mode
- If shared is enabled:
  - group is required
  - owner account is required
  - owner category is required
  - split method is required
  - when split method is `fixed`, participant amounts are required
  - fixed participant amounts should match the total amount
- For transfer:
  - from account is required
  - to account is required
  - from account and to account cannot be the same
  - if the accounts use the same currency, show one required amount field
  - if the accounts use different currencies, show two required amount fields

### Transaction Interactions

- Clicking a transaction row should open the edit/update flow.
- Delete should be available directly from the list.
- Recommendation:
  - use row click to open the edit form
  - keep delete as an explicit icon action in the actions column
  - prevent accidental edits when clicking on action icons by keeping row-click and action-click behavior clearly separated
- The `more actions` menu can be used later for lower-frequency actions without overloading the table.

### Primary Create Action

- The main create action for authenticated users should be a prominent floating `plus` button.
- The create button should be accessible from the main authenticated navigation area, such as:
  - the user shell navbar
  - the user shell sidebar
- Clicking the create button should open three primary options:
  - expense
  - income
  - transfer
- Selecting:
  - `expense` opens the unified transaction form in expense mode
  - `income` opens the unified transaction form in income mode
  - `transfer` opens the separate transfer form
- This create action should be treated as one of the main user actions in the product.
- The create menu should stay fast and lightweight:
  - minimal copy
  - clear icons or labels
  - no extra nesting
- Recommendation:
  - keep the floating button visible in the authenticated user shell
  - also allow context-specific entrypoints from the transactions screen when useful
  - avoid placing the create action in the admin shell, where the workflow focus is different

### Frontend Structure

- Use a feature-first hybrid structure in `apps/web`.
- Recommended top-level frontend folders:
  - `src/app`
  - `src/layouts`
  - `src/pages`
  - `src/features`
  - `src/components`
  - `src/lib`
  - `src/styles`
  - `src/types`
- Responsibilities:
  - `src/app`: bootstrap, router, providers, route guards, app-wide setup
  - `src/layouts`: `PublicLayout`, `UserLayout`, `AdminLayout`
  - `src/pages`: route-level page components only
  - `src/features`: domain-specific logic, hooks, feature UI, and state
  - `src/components`: reusable UI components not owned by one feature
  - `src/lib`: API client, config, formatters, helpers
  - `src/styles`: global CSS, tokens, theme variables
  - `src/types`: frontend-specific types not generated from the API
- Keep route pages thin and delegate business-specific logic to `features`.

### CSS Strategy

- Use a layered plain CSS approach:
  - one `global.css` for reset, design tokens, theme variables, typography, layout primitives, and a small set of shared utilities
  - one CSS Module per component or page for local styling
- Define global parameters for:
  - colors
  - spacing
  - typography
  - border radius
  - shadows
  - breakpoints
  - transitions
- Keep page-specific and component-specific CSS close to the related files.
- Avoid large generic global class systems; prefer local CSS Modules for maintainability.

### Component Philosophy

- Start with native HTML elements and a small in-house component layer.
- Create shared components early for the elements that benefit from consistency:
  - `Button`
  - `Input`
  - `Select`
  - `Textarea`
  - `Field`
  - `Card`
  - `Modal`
  - `Table`
  - `PageHeader`
  - `EmptyState`
  - `LoadingState`
- Do not adopt a large UI framework at the start.
- Reasoning:
  - SplitFlow is form-heavy and workflow-heavy, not design-system-heavy
  - a small internal component layer gives consistency without adding too much abstraction
  - this works well with plain CSS and keeps styling fully under our control

### API Integration

- The monorepo should be used to share code where it clearly helps, but not to force premature coupling.
- Preferred approach:
  - generate TypeScript types from the backend OpenAPI schema
  - keep a thin handwritten API client in `apps/web`
  - centralize request handling, credentials, JSON parsing, and error mapping in one API layer
- Recommended API client structure:
  - one shared `request()` wrapper for fetch behavior
  - one API module per domain, such as `auth`, `accounts`, `transactions`, and `sharedTransactions`
  - always send credentials for session-cookie auth
  - normalize API errors into a consistent frontend shape
  - handle `401` responses in one place so protected screens can react consistently
- Good sharing candidates:
  - generated API types
  - stable domain constants
  - formatting helpers only if they are truly cross-app
- Avoid sharing backend business logic directly into the frontend unless ownership is very clear.

### Auth UX Model

- The backend remains the source of truth for authentication.
- The frontend should:
  - call `GET /me` when the app boots to check whether a session already exists
  - store the current user in query cache or app state
  - redirect unauthenticated users away from protected routes
  - redirect authenticated users away from login and signup pages when appropriate
  - handle expired sessions by clearing user state and returning to the login flow
  - show a clear message or route when a user is blocked by email verification rules
- In practice, this means the SPA does not decide by itself who is logged in; it asks the API and adapts the UI based on the response.

### Layout Families

- Use three layout families:
  - public shell
  - authenticated user shell
  - authenticated admin shell
- Public shell:
  - used for landing and auth-related pages
  - minimal chrome
  - focused on entry and recovery flows
- Authenticated user shell:
  - used for the main product
  - includes the main navigation and app workspace structure
- Authenticated admin shell:
  - used for admin-only flows
  - should remain visually related to the product, but clearly separated in navigation and information hierarchy

### Design Token Baseline

- The frontend should follow `.interface-design/system.md` as the design source of truth.
- Product direction:
  - clean
  - modern
  - practical
  - medium density
  - minimal depth
  - restrained emphasis
- Token baseline:
  - spacing base unit: `4px`
  - spacing scale: `4, 8, 12, 16, 20, 24, 32, 40, 48`
  - radius scale:
    - `sm: 6px`
    - `md: 8px`
    - `lg: 12px`
    - `xl: 16px`
  - brand colors:
    - teal: `#28B384`
    - teal-strong: `#159270`
    - orange: `#FD9D02`
    - orange-strong: `#F77902`
  - neutrals and semantic roles should match `.interface-design/system.md`
- Use neutral surfaces and backgrounds so brand colors remain intentional and high-signal.
- Prefer borders over heavy shadow systems.

## Public Interfaces / Contracts

- Frontend consumes the existing API for:
  - auth
  - accounts
  - categories
  - tags
  - contacts
  - transactions
  - recurring transactions
  - groups
  - shared transactions
  - notifications
  - user/admin management as exposed by the backend
- Standardize frontend environment variables for:
  - API base URL
  - app base URL
  - cookie/session deployment assumptions

## Test Plan

- Public pages:
  - routes render correctly
  - responsive layout works
- Auth:
  - signup, login, logout, reset password, current-user bootstrap
  - protected routes redirect correctly
- Core product:
  - accounts/categories/tags CRUD
  - transaction create/edit/delete
  - transfer flow
  - recurring transaction flow
  - shared transaction invite/update/accept/reject/payment flows
  - notifications list and status updates
- UX/state:
  - loading, empty, and API error states exist for all list/detail screens
  - money and currency formatting remain consistent
  - query invalidation/refetch behavior is correct after mutations

## Assumptions And Defaults

- We are optimizing for product app delivery, not SEO-led growth pages.
- Public pages are present, but they are intentionally limited to landing and auth-related flows.
- Plain CSS means:
  - no Tailwind
  - no CSS-in-JS by default
  - CSS Modules for local scope
- Radix is optional, not foundational.
- We prefer small internal abstractions over large UI frameworks at the start.
- We prefer generated API types plus handwritten API calls over a fully generated runtime client.
- We are intentionally avoiding offline/local-first web behavior because the business rules reserve that complexity for mobile.

## Decision Approach

- For remaining frontend decisions not yet explicitly defined here, use pragmatic best practices as the default direction.
- Prefer decisions that improve:
  - clarity
  - consistency
  - accessibility
  - maintainability
  - implementation speed
- Favor simple, reusable patterns before introducing extra complexity.
- During implementation, open questions should be revisited when real UI constraints make a different choice clearly better.
- It is acceptable to evolve or replace these defaults later if implementation reveals a better direction.
