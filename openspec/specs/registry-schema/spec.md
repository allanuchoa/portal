# registry-schema

## Purpose

Define the relational structure of the Allan Workbench Registry — the tables `profiles`, `applications`, and `user_applications` that govern user identity, tool catalog, and N:N permission mapping across the ecosystem.

## Requirements

### Requirement: Profiles table
The system SHALL maintain a `public.profiles` table linked to Supabase Auth users.

#### Scenario: Table structure
- **WHEN** the table is created
- **THEN** it SHALL contain columns: `id` (UUID, PK, FK to `auth.users.id`), `name` (TEXT), `role` (TEXT, default `'user'`, CHECK constraint `role IN ('user', 'admin')`), `updated_at` (TIMESTAMPTZ, default `now()`)

#### Scenario: Role domain constraint
- **WHEN** attempting to insert or update `role` with a value other than `'user'` or `'admin'`
- **THEN** the database SHALL reject the operation with a check constraint violation

#### Scenario: Auto-update of updated_at
- **WHEN** any column on a `profiles` row is updated
- **THEN** `updated_at` SHALL be refreshed to `now()` via an `BEFORE UPDATE` trigger

#### Scenario: Auto-create profile on signup
- **WHEN** a new user is inserted into `auth.users`
- **THEN** a corresponding row SHALL be automatically created in `public.profiles` with `id` matching the new user, `role` set to `'user'`, and `name` populated from the user's user metadata `full_name` when present (otherwise NULL)

### Requirement: Applications table
The system SHALL maintain a `public.applications` table as the tool registry.

#### Scenario: Table structure
- **WHEN** the table is created
- **THEN** it SHALL contain columns: `id` (UUID, PK, default `gen_random_uuid()`), `slug` (TEXT, UNIQUE, NOT NULL), `name` (TEXT, NOT NULL), `url` (TEXT, NOT NULL), `icon` (TEXT), `category` (TEXT), `is_active` (BOOLEAN, default `true`), `created_at` (TIMESTAMPTZ, default `now()`)

#### Scenario: Unique slug constraint
- **WHEN** attempting to insert a duplicate `slug`
- **THEN** the database SHALL reject the insert with a unique constraint violation

### Requirement: User applications table
The system SHALL maintain a `public.user_applications` junction table for N:N permission mapping.

#### Scenario: Table structure
- **WHEN** the table is created
- **THEN** it SHALL contain columns: `user_id` (UUID, PK, FK to `profiles.id`), `application_id` (UUID, PK, FK to `applications.id`), `granted_at` (TIMESTAMPTZ, default `now()`)

#### Scenario: Composite primary key
- **WHEN** attempting to insert a duplicate `(user_id, application_id)` pair
- **THEN** the database SHALL reject the insert with a unique constraint violation

#### Scenario: Cascading delete from profiles
- **WHEN** a user is deleted from `profiles`
- **THEN** all corresponding rows in `user_applications` SHALL be deleted automatically

#### Scenario: Cascading delete from applications
- **WHEN** an application is deleted from `applications`
- **THEN** all corresponding rows in `user_applications` SHALL be deleted automatically
