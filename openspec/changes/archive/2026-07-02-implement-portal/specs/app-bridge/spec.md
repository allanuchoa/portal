## ADDED Requirements

### Requirement: Bridge script loads independently
The `workbench-bridge.js` SHALL initialize its own Supabase client and SHALL NOT depend on a pre-existing `window.supabase` instance from the host tool.

#### Scenario: Bridge self-initialization
- **WHEN** a tool loads `workbench-bridge.js` in its HTML
- **THEN** the bridge SHALL read `config.js` values and create its own Supabase client before performing any operations

### Requirement: Bridge checks authentication
The bridge SHALL verify the user's session on load and redirect to the portal if no session exists.

#### Scenario: No active session
- **WHEN** the bridge detects no active session via `getSession()`
- **THEN** it SHALL redirect the browser to the portal URL defined in `config.js`

#### Scenario: Active session
- **WHEN** the bridge detects an active session
- **THEN** it SHALL inject the header and proceed with tool initialization

### Requirement: Bridge injects unified header
The bridge SHALL inject a navigation header into the tool's DOM containing the workspace logo, user identity, and logout button.

#### Scenario: Header injection
- **WHEN** the bridge initializes with an active session
- **THEN** it SHALL prepend a header element to `<body>` containing the Allan Workbench logo linking back to the portal, the logged-in user's email, and a "Sair" button

#### Scenario: Header styling
- **WHEN** the header is injected
- **THEN** it SHALL use dark canvas background (`#101010`), body text color (`#f2f2f2`), and the electric green accent (`#00d992`) for the logo

### Requirement: Bridge handles logout
The bridge SHALL provide logout functionality that clears the session and redirects to the portal.

#### Scenario: Logout via bridge
- **WHEN** the user clicks "Sair" in the bridge-injected header
- **THEN** the bridge SHALL call `supabase.auth.signOut()` and redirect to the portal URL
