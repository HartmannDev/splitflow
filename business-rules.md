# SplitFlow Business Rules and Data Design Reference

## Purpose

This document consolidates the business rules, architectural decisions, and database design decisions discussed so far for the SplitFlow project. It is intended to be used as the reference for continuing the backend/API and database implementation inside the IDE.

---

## Product Overview

SplitFlow is a financial tracker system with:

- an offline-first mobile app
- a web app with online-only data access
- a backend API
- a PostgreSQL database

The mobile app uses local storage first and synchronizes with the backend later.  
The web app uses the backend directly for CRUD operations.  
The backend is responsible for authentication, ownership, data integrity, synchronization support, sharing workflows, notifications, and business rules.

---

## Tenancy Model

The system is multi-tenant by **user ownership**.

Each user owns their own data.  
There is no organization/workspace tenant model for now.

This means:

- accounts belong to one user
- transactions belong to one user
- tags belong to one user
- contacts belong to one user
- recurring transactions belong to one user
- groups are created by one user
- shared data is handled through explicit sharing relationships

---

## Authentication and User Model

The authentication system will be custom-built using PostgreSQL and the API app.

There is one unified `users` table.

Users can have different roles using a role/type field.

Supported roles:

- `user`
- `admin`

### User authentication fields

The `users` table should include at least:

- id
- role
- name
- last_name
- email
- password_hash
- password_salt
- is_active
- email_verified_at
- created_at
- updated_at
- deleted_at

### Password security

- `password_hash` is stored in the database
- `password_salt` is stored in the database
- the **pepper** is stored only in environment variables and never in the database

---

## Admin Scope

Admins exist in the same `users` table using the admin role.

Admins are responsible for:

- setup of standard app information
- management of default categories
- app-level aggregate visibility

Admins must **not** see individual private user data.

---

## Main Architecture Rules

### Mobile app

The mobile app is offline-first.

It should:

- create and edit local data immediately
- store data in a local database
- queue changes for sync
- synchronize with the backend later

### Web app

The web app is online-only.

It should:

- consume the backend directly
- use standard CRUD APIs
- not depend on local-first storage

### Backend responsibilities

The backend must handle:

- authentication
- authorization
- database persistence
- ownership validation
- sync support
- shared transaction workflows
- notification generation
- recurring transaction generation
- transfer integrity
- business rule enforcement

---

## Sync Rules

### Record identifiers

Use **UUID** as primary keys across the system.

Reasons:

- safer for offline-first creation
- easier syncing between local and server records
- suitable for URLs in the web app
- avoids ID collisions between devices

### Sync metadata

All syncable business tables should include:

- `created_at`
- `updated_at`
- `deleted_at`

This is the minimum sync metadata agreed so far.

### Sync conflict resolution

Use **last write wins** for normal user-owned data.

This means the most recent update is considered the valid one.

For shared transactions, special approval rules apply and override normal silent conflict behavior.

### Soft delete

Business data uses **soft delete**.

- records are not hard deleted immediately
- linked data cannot be hard deleted if foreign keys would break
- cleanup rules can be defined later

---

## Money and Currency Rules

### Money precision

All amount fields must use:

- `numeric(18,6)`

This applies to all monetary values in all tables.

Reason:

- better financial precision
- safer for split amounts
- avoids floating-point issues
- allows more than 2 decimal places internally

### Currency support

The system will support currencies.

There will be a dedicated `currencies` table using ISO-style codes.

Recommended fields:

- `code` as primary key, such as `AUD`, `USD`, `BRL`
- `name`
- `symbol`
- `decimal_places`
- `is_active`
- `created_at`
- `updated_at`

Each account must reference one currency.

---

## Contacts Rules

Contacts belong to one user.

Contacts are used to represent people that may or may not already be app users.

A contact may later become linked to a real app user.

### Contact ownership

Each contact belongs to exactly one user.

### Contact uniqueness

For the same owner user, email must be unique.

Recommended uniqueness rule:

- unique `(user_id, email)` when email is not null

### Contact linking

A contact may have a `linked_user_id` pointing to a real app user.

This supports non-users becoming real users later while preserving history.

---

## Group Rules

Groups are used to support shared transactions.

### Group ownership

Each group has one owner user.

### Membership change rule

When membership changes, **a new group must be created**.

Do not keep the same group record and only update members.

Reason:

- historical visibility becomes easier
- old transactions remain linked to the old membership
- new members do not gain access to previous transactions
- removed members do not remain connected to future transactions
- business logic is simpler

### Group version lineage

A group may optionally reference the previous group version.

Suggested field:

- `previous_group_id`

### Group member references

A group member can reference:

- a real app user
- a contact

Exactly one should be present.

---

## Accounts Rules

Accounts belong to one user.

Each account has:

- name
- icon
- color
- initial value
- currency
- archived status
- timestamps
- soft delete

### Ownership

Each account belongs to exactly one user.

### Currency

Each account must reference a currency.

---

## Categories Rules

Categories can be:

- admin-defined default categories
- user-defined personal categories

### Category types

Supported category types:

- `income`
- `expense`

Transfers do not need categories by default.

### Default categories

Default categories:

- are not owned by a normal user
- are created by an admin
- have `is_default = true`

### Personal categories

Personal categories:

- belong to one user
- have `is_default = false`

---

## Tags Rules

Tags belong to one user.

Suggested uniqueness:

- unique `(user_id, name)`

Tags support colors.

Transactions can have many tags.

---

## Transaction Rules

The `transactions` table is the real personal ledger.

Each transaction belongs to exactly one user.

### Transaction types

Supported transaction types:

- `income`
- `expense`
- `transfer`

### Transaction statuses

Suggested statuses:

- `pending`
- `done`
- `cancelled`

### Common fields

Transactions should include at least:

- id
- user_id
- type
- status
- amount
- description
- notes
- transaction_date
- account_id
- category_id
- recurring_transaction_id
- recurring_version
- transfer_pair_id
- transfer_direction
- is_from_shared
- source_shared_transaction_participant_id
- created_at
- updated_at
- deleted_at

### Reporting fields

Do **not** store derived reporting fields like:

- year
- month
- week
- day
- semester
- trimester
- fortnight

PostgreSQL can compute reporting values when needed.

---

## Transfer Rules

Transfers are represented by **two linked transaction rows**.

One row represents money going out.  
The other row represents money coming in.

### Transfer pairing

Both rows share the same `transfer_pair_id`.

### Transfer directions

Supported transfer directions:

- `out`
- `in`

### Transfer behavior

- one transaction row decreases one account
- the other transaction row increases another account
- both belong to the same user
- both are part of the same transfer pair

---

## Recurring Transaction Rules

Recurring transactions use a dedicated table.

Do **not** use an existing normal transaction row as the recurring template.

### Why a dedicated recurring table

Using a normal transaction as the template would mix two meanings:

- real historical event
- future generation pattern

A dedicated recurring table keeps those concerns separate.

### Recurring table purpose

The recurring table stores:

- recurrence rules
- template values
- next generation information
- subscription/installment mode
- active state
- version

### Recurring transaction types

Supported:

- `income`
- `expense`

### Recurring modes

Supported:

- `subscription`
- `installment`

### Frequencies

Supported:

- `daily`
- `weekly`
- `fortnightly`
- `monthly`
- `quarterly`
- `semiannually`
- `annually`

### Recurring count rule

Use one recurring model for both subscriptions and installments.

- if `total_occurrences` is null, it behaves like an ongoing subscription
- if `total_occurrences` has a value, it behaves like an installment plan

### Recurring template fields

The recurring template should contain values such as:

- template_description
- template_amount
- template_notes
- template_category_id
- template_account_id

Do **not** store `template_is_done`.

Generated transactions should decide their own status.

### Generation rule

Future transactions should be generated when the next frequency point is reached.

Example:

- monthly recurring generates the next transaction on the first day of the relevant month

### Generated transaction linking

Each generated real transaction should point back to the recurring transaction.

Suggested fields on transactions:

- `recurring_transaction_id`
- `recurring_version`

### Recurring editing rule

When editing recurring-generated transactions, only support:

- **this occurrence only**
- **this and future occurrences**

Do not support automatic updates of past occurrences as standard recurring behavior.

### Internal recommendation for recurring changes

If the user chooses to update future transactions:

- create a new template version for future generations
- keep past generated transactions unchanged

If the user chooses to update only the current occurrence:

- change only that generated transaction
- keep the recurring template unchanged

---

## Shared Transaction Rules

Shared transactions are not the same as normal personal transactions.

A shared transaction first exists as a shared definition.  
Then each participant may later receive their own personal transaction after acceptance.

### Shared transaction ownership

A shared transaction has one owner user.

### Shared transaction purpose

The shared transaction stores the common shared data only.

It should not store participant-specific account or category data.

### Shared transaction fields

Shared transactions should contain only shared/common information such as:

- owner_user_id
- group_id
- type
- total_amount
- description
- notes
- transaction_date
- split_method
- status
- current_edit_version
- timestamps
- soft delete

### Shared transaction type

For now, shared transactions only support:

- `expense`

### Split methods

Supported split methods:

- `equal`
- `fixed`

### Shared transaction statuses

Suggested statuses:

- `pending`
- `partially_accepted`
- `accepted`
- `cancelled`

### Important note

`account_id` and `category_id` should **not** be on `shared_transactions` because each participant may classify their accepted transaction differently.

---

## Shared Transaction Participant Rules

Each participant in a shared transaction has a row in `shared_transaction_participants`.

A participant may be:

- a real user
- a contact

Exactly one should be present.

### Participant fields

Suggested fields:

- shared_transaction_id
- participant_user_id
- participant_contact_id
- amount
- approval_status
- approval_version
- approved_at
- payment_status
- payment_marked_at
- payment_confirmed_at
- user_transaction_id
- timestamps
- soft delete

### Approval statuses

Suggested approval statuses:

- `pending`
- `accepted`
- `rejected`
- `superseded`

### Payment statuses

Suggested payment statuses:

- `unpaid`
- `marked_paid`
- `confirmed_paid`

### Acceptance rule

If the participant is a real app user:

- the shared item appears in a shared bucket
- it is not yet part of their personal transactions
- after acceptance, a real personal transaction is created in their ledger
- that created transaction is linked back in `user_transaction_id`

### Contact participant rule

If the participant is not a real app user:

- there is no real user-side acceptance flow
- the owner tracks the shared/contact participation for their own records

---

## Shared Transaction Edit Rule

Only **important edits** trigger a new approval request.

Examples of important edits may include:

- amount
- split values
- participants
- date
- significant shared details

Minor edits should not reopen the approval flow.

### Re-approval behavior

If an important edit is made after a participant already accepted:

- the participant’s current accepted personal transaction stays unchanged for now
- a new approval request is created
- the participant must accept the new version
- after acceptance, their personal transaction is updated or replaced

### Meaning of “unchanged until re-accepted”

It means the participant’s existing accepted transaction remains as the last approved version until they explicitly approve the new edited version.

This avoids silently changing another user’s personal data.

### Multiple updates before action

If the owner updates the same shared transaction multiple times before the participant acts:

- older pending notifications become superseded
- only the latest notification should remain actionable

---

## Shared Payment Confirmation Rules

There are two payment situations.

### 1. Participant is not a user

If the participant is only a contact:

- the owner can mark payment status for their own control

### 2. Participant is a real user

If the participant is a real user:

- the participant marks as paid
- the owner receives a notification
- the owner must confirm
- the payment status remains pending confirmation until the owner accepts

This should remain visible in notifications until the owner acts.

---

## Notification Rules

Notifications belong to one user.

They are used for:

- shared transaction invites
- shared transaction updates
- payment marked events
- payment confirmation requests
- payment confirmed events
- recurring generation events

### Notification fields

Suggested fields:

- user_id
- type
- title
- message
- related_shared_transaction_id
- related_shared_participant_id
- related_transaction_id
- status
- created_at
- read_at
- acted_at
- updated_at
- deleted_at

### Notification types

Suggested notification types:

- `share_invite`
- `share_updated`
- `payment_marked`
- `payment_confirm_request`
- `payment_confirmed`
- `recurring_generated`

### Notification statuses

Suggested statuses:

- `pending`
- `read`
- `resolved`
- `dismissed`
- `superseded`

---

## User Devices Rules

User devices are optional but recommended.

They support:

- sync control
- device session tracking
- future one-device rules if needed

### Suggested fields

- user_id
- device_name
- device_type
- device_identifier
- last_seen_at
- last_sync_at
- is_active
- timestamps
- soft delete

Suggested uniqueness:

- unique `(user_id, device_identifier)`

---

## Deletion and Foreign Key Rules

### Deletion rule

Business data uses soft delete.

### Hard delete rule

If a record has linked dependent data, it should not be hard deleted.

Foreign keys should protect integrity.

### General principle

- soft delete for business entities
- keep historical links
- physical cleanup as periodic tasks

---

## Database Technology Decisions

### Database

- PostgreSQL

### Primary keys

- UUID

### Money fields

- `numeric(18,6)`

### Currency identifiers

- ISO currency codes

### Status/type fields

Use database enums for stable values.

If needed later, enums can be replaced by another strategy, but current direction is to use enums.

### Naming

Use `snake_case` in the database.
Use `camelCase` in the source code.

---

## Backend Stack Direction

Recommended API stack direction:

- Node.js
- Fastify
- PostgreSQL
- `pg` as driver
- Kysely for typed queries
- SQL-first migrations

### Migration philosophy

Prefer:

- explicit migrations
- ordered migration files
- schema in migrations
- seed data separated from schema migrations

---

## Recommended Main Entities

The main entities agreed so far are:

- users
- currencies
- contacts
- groups
- group_members
- accounts
- categories
- tags
- recurring_transactions
- transactions
- transaction_tags
- shared_transactions
- shared_transaction_participants
- notifications
- user_devices

---

## Final High-Level Rule Summary

1. Each user owns their own data.
2. Admins are users with a different role.
3. UUID is used everywhere for main business entities.
4. Soft delete is used for business records.
5. Syncable data includes `created_at`, `updated_at`, and `deleted_at`.
6. Last write wins applies to normal user-owned data.
7. Shared transactions require approval rules and do not silently override already accepted user data.
8. Groups are versioned by creating a new group when membership changes.
9. Contacts may later become linked to real users.
10. Currencies use ISO codes.
11. All amount fields use `numeric(18,6)`.
12. Transfers are stored as two linked transaction rows.
13. Recurring templates live in their own table, not in normal transactions.
14. Recurring edits support only “this occurrence” or “this and future.”
15. Shared transactions store common shared data only; participant personal transactions store their own account/category mapping.
16. Important shared edits reopen approval.
17. Multiple pending shared updates collapse into only the latest actionable notification.
18. Payment confirmation for user participants requires owner confirmation.
