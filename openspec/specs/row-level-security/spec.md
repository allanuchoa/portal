# row-level-security

## Purpose

Define Row Level Security policies for all Registry tables (`profiles`, `applications`, `user_applications`). RLS is mandatory — the frontend uses only `anon_key` and must never perform writes to the tool catalog or permission tables.

## Requirements

### Requirement: RLS enabled on all registry tables
Row Level Security SHALL be enabled on `profiles`, `applications`, and `user_applications`.

#### Scenario: RLS verification
- **WHEN** querying `pg_tables` for tables in the `public` schema
- **THEN** `rowsecurity` SHALL be `true` for `profiles`, `applications`, and `user_applications`

### Requirement: Profiles read access
Users SHALL be able to read their own profile and SHALL NOT be able to read other users' profiles.

#### Scenario: User reads own profile
- **WHEN** an authenticated user queries `profiles` with `id = auth.uid()`
- **THEN** the row SHALL be returned

#### Scenario: User attempts to read another profile
- **WHEN** an authenticated user queries `profiles` for a different `id`
- **THEN** no rows SHALL be returned

### Requirement: Applications read access via user_applications
Only users with active grants in `user_applications` SHALL be able to read application records.

#### Scenario: User with grant reads applications
- **WHEN** a user has a row in `user_applications` linking them to an active application
- **THEN** that application SHALL be visible when querying `applications`

#### Scenario: User without any grants reads applications
- **WHEN** a user has no rows in `user_applications`
- **THEN** no rows SHALL be returned when querying `applications`

#### Scenario: User reads inactive application
- **WHEN** a user has a grant for an application where `is_active = false`
- **THEN** that application SHALL NOT be returned

### Requirement: User applications read access
Users SHALL only see their own `user_applications` rows.

#### Scenario: User reads own grants
- **WHEN** an authenticated user queries `user_applications` where `user_id = auth.uid()`
- **THEN** their own rows SHALL be returned

#### Scenario: User attempts to read other users' grants
- **WHEN** an authenticated user queries `user_applications` for a different `user_id`
- **THEN** no rows SHALL be returned

### Requirement: Write restrictions on registry tables
Users SHALL NOT be able to insert, update, or delete rows in `applications` or `user_applications` via the `anon_key` client; only the `service_role` (server-side bypass of RLS) SHALL perform these operations. This prevents a user from self-granting access to tools or altering the tool registry.

#### Scenario: User attempts to insert into applications
- **WHEN** an authenticated user attempts an INSERT into `applications` via the `anon_key` client
- **THEN** the database SHALL reject the operation

#### Scenario: User attempts to update applications
- **WHEN** an authenticated user attempts an UPDATE on `applications` via the `anon_key` client
- **THEN** the database SHALL reject the operation

#### Scenario: User attempts to delete from applications
- **WHEN** an authenticated user attempts a DELETE on `applications` via the `anon_key` client
- **THEN** the database SHALL reject the operation

#### Scenario: User attempts to insert into user_applications
- **WHEN** an authenticated user attempts an INSERT into `user_applications` via the `anon_key` client
- **THEN** the database SHALL reject the operation (prevents self-granting tool access)

#### Scenario: User attempts to update user_applications
- **WHEN** an authenticated user attempts an UPDATE on `user_applications` via the `anon_key` client
- **THEN** the database SHALL reject the operation

#### Scenario: User attempts to delete from user_applications
- **WHEN** an authenticated user attempts a DELETE on `user_applications` via the `anon_key` client
- **THEN** the database SHALL reject the operation

### Requirement: Profile self-update
Users SHALL be able to update only the `name` column of their own `profiles` row; no other column (including `role`) SHALL be writable via the `anon_key` client, preventing privilege escalation.

#### Scenario: User updates own name
- **WHEN** an authenticated user updates `name` on the `profiles` row where `id = auth.uid()`
- **THEN** the update SHALL succeed

#### Scenario: User attempts to update another profile
- **WHEN** an authenticated user attempts to update a `profiles` row belonging to another user
- **THEN** the database SHALL reject the operation

#### Scenario: User attempts to update own role
- **WHEN** an authenticated user attempts to update the `role` column on their own `profiles` row
- **THEN** the database SHALL reject the operation (prevents privilege escalation)
