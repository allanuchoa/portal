# user-session

## Purpose

Manage user session lifecycle: logout, session persistence across browser restarts, and session expiration handling.

## Requirements

### Requirement: Logout
The system SHALL allow users to end their session via a logout button.

#### Scenario: Logout button in launcher header
- **WHEN** the launcher dashboard is displayed
- **THEN** the header SHALL contain a "Sair" button

#### Scenario: Logout action
- **WHEN** the user clicks "Sair"
- **THEN** the system SHALL call `supabase.auth.signOut()` and upon completion SHALL display the login view

#### Scenario: Logout error
- **WHEN** `signOut()` returns an error
- **THEN** the system SHALL log the error to console and SHALL still redirect to the login view

### Requirement: Session persistence
The Supabase client SHALL be configured to persist the session across browser restarts.

#### Scenario: Session survives page reload
- **WHEN** a user is authenticated and refreshes the page
- **THEN** the session SHALL still be available via `getSession()` without re-login
