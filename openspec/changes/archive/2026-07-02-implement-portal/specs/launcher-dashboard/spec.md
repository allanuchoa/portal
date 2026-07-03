## ADDED Requirements

### Requirement: Registry query for user applications
The system SHALL query the Supabase Registry to fetch applications the authenticated user can access.

#### Scenario: User has granted applications
- **WHEN** an authenticated user loads the launcher
- **THEN** the system SHALL query `applications` joined with `user_applications` filtered by the user's ID and `is_active = true`

#### Scenario: Query returns results
- **WHEN** the query returns one or more applications
- **THEN** the system SHALL group them by `category` and render each group as a section

### Requirement: Launcher grid rendering
The system SHALL render application cards grouped by category in a responsive grid.

#### Scenario: Category grouping
- **WHEN** applications exist in multiple categories
- **THEN** each category SHALL be rendered as a labeled section with its applications in a grid below

#### Scenario: Card rendering
- **WHEN** an application card is rendered
- **THEN** it SHALL display the application icon (Lucide), name, and an "Acessar" button

#### Scenario: Card styling
- **WHEN** application cards are rendered
- **THEN** each card SHALL have background `#101010`, 1px hairline border `#3d3a39`, rounded 8px corners, and padding matching DESIGN.md card-feature tokens

#### Scenario: Responsive grid
- **WHEN** viewed on desktop (>= 1024px)
- **THEN** cards SHALL render in up to 3 columns
- **WHEN** viewed on tablet (768-1023px)
- **THEN** cards SHALL render in up to 2 columns
- **WHEN** viewed on mobile (< 768px)
- **THEN** cards SHALL render in single column

### Requirement: No applications granted state
The system SHALL display an informative message when the user has no granted applications.

#### Scenario: Empty launcher
- **WHEN** the Registry query returns zero applications for the authenticated user
- **THEN** the system SHALL display a centered card with text "Em desenvolvimento" and muted styling

### Requirement: Native redirection on application click
The system SHALL redirect the user to the application URL when a card is clicked, without passing tokens in the URL.

#### Scenario: Application card click
- **WHEN** the user clicks the "Acessar" button on an application card
- **THEN** the system SHALL execute `window.location.href = app.url` with no query parameters or hash fragments containing authentication tokens
