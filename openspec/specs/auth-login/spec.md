# auth-login

## Purpose

Provide a Supabase Auth login form (email/password) styled per DESIGN.md tokens. Handle session detection, form validation, loading states, and error display.

## Requirements

### Requirement: Session check on page load
The system SHALL verify the user's authentication state when the page loads and redirect accordingly.

#### Scenario: User with active session
- **WHEN** a user with a valid Supabase session opens `index.html`
- **THEN** the login view SHALL be hidden and the launcher dashboard SHALL be displayed

#### Scenario: User without session
- **WHEN** a user without a session opens `index.html`
- **THEN** the login view SHALL be displayed

#### Scenario: Session check fails
- **WHEN** the Supabase `getSession()` call returns an error
- **THEN** the login view SHALL be displayed and the error SHALL be logged to console

### Requirement: Login form
The system SHALL provide a login form with email and password fields styled per DESIGN.md tokens.

#### Scenario: Form structure
- **WHEN** the login view is displayed
- **THEN** the form SHALL contain an email input, a password input, and a submit button with text "Entrar"

#### Scenario: Form styling
- **WHEN** the login view is rendered
- **THEN** the card SHALL have background `#101010`, 1px hairline border `#3d3a39`, rounded 8px corners, and the submit button SHALL have background `#00d992` with text `#101010`

### Requirement: Login submission
The system SHALL authenticate users via Supabase `signInWithPassword` and handle success and failure states.

#### Scenario: Successful login
- **WHEN** a user submits valid email and password
- **THEN** the system SHALL call `supabase.auth.signInWithPassword()`, and upon success SHALL hide the login view and display the launcher dashboard

#### Scenario: Failed login
- **WHEN** a user submits invalid credentials
- **THEN** the system SHALL display an error message below the form fields using body muted text color (`#bdbdbd`)

#### Scenario: Loading state during login
- **WHEN** the login form is submitted
- **THEN** the submit button SHALL show a loading state (disabled + text change to "Entrando...") until the auth call resolves

### Requirement: Login form validation
The system SHALL validate that both email and password fields are non-empty before submitting.

#### Scenario: Empty fields
- **WHEN** the user clicks "Entrar" with empty email or password
- **THEN** the form SHALL NOT submit and SHALL show a validation message
