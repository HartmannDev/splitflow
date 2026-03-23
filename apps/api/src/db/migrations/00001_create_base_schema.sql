BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE category_type AS ENUM ('income', 'expense');
CREATE TYPE transaction_type AS ENUM ('income', 'expense', 'transfer');
CREATE TYPE transaction_status AS ENUM ('pending', 'done', 'cancelled');
CREATE TYPE transfer_direction AS ENUM ('out', 'in');
CREATE TYPE recurring_mode AS ENUM ('subscription', 'installment');
CREATE TYPE recurring_frequency AS ENUM (
	'daily',
	'weekly',
	'fortnightly',
	'monthly',
	'quarterly',
	'semiannually',
	'annually'
);
CREATE TYPE shared_transaction_type AS ENUM ('expense');
CREATE TYPE shared_split_method AS ENUM ('equal', 'fixed');
CREATE TYPE shared_transaction_status AS ENUM (
	'pending',
	'partially_accepted',
	'accepted',
	'cancelled'
);
CREATE TYPE participant_approval_status AS ENUM (
	'pending',
	'accepted',
	'rejected',
	'superseded'
);
CREATE TYPE participant_payment_status AS ENUM (
	'unpaid',
	'marked_paid',
	'confirmed_paid'
);
CREATE TYPE notification_type AS ENUM (
	'share_invite',
	'share_updated',
	'payment_marked',
	'payment_confirm_request',
	'payment_confirmed',
	'recurring_generated'
);
CREATE TYPE notification_status AS ENUM (
	'pending',
	'read',
	'resolved',
	'dismissed',
	'superseded'
);

CREATE TABLE users (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	role user_role NOT NULL DEFAULT 'user',
	name text NOT NULL,
	last_name text NOT NULL,
	email text NOT NULL,
	password_hash text NOT NULL,
	password_salt text NOT NULL,
	is_active boolean NOT NULL DEFAULT true,
	email_verified_at timestamptz,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	deleted_at timestamptz
);

CREATE UNIQUE INDEX users_email_unique_idx
	ON users (lower(email))
	WHERE deleted_at IS NULL;

CREATE TABLE currencies (
	code char(3) PRIMARY KEY,
	name text NOT NULL,
	symbol text NOT NULL,
	decimal_places smallint NOT NULL,
	is_active boolean NOT NULL DEFAULT true,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT currencies_code_uppercase CHECK (code = upper(code)),
	CONSTRAINT currencies_decimal_places_valid CHECK (decimal_places BETWEEN 0 AND 6)
);

CREATE TABLE contacts (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id uuid NOT NULL REFERENCES users(id),
	linked_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
	name text NOT NULL,
	email text,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	deleted_at timestamptz,
	CONSTRAINT contacts_email_not_blank CHECK (email IS NULL OR btrim(email) <> '')
);

CREATE UNIQUE INDEX contacts_user_email_unique_idx
	ON contacts (user_id, lower(email))
	WHERE email IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX contacts_user_id_idx ON contacts (user_id);
CREATE INDEX contacts_linked_user_id_idx ON contacts (linked_user_id) WHERE linked_user_id IS NOT NULL;

CREATE TABLE groups (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	owner_user_id uuid NOT NULL REFERENCES users(id),
	previous_group_id uuid REFERENCES groups(id) ON DELETE SET NULL,
	name text NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	deleted_at timestamptz
);

CREATE INDEX groups_owner_user_id_idx ON groups (owner_user_id);
CREATE INDEX groups_previous_group_id_idx ON groups (previous_group_id) WHERE previous_group_id IS NOT NULL;

CREATE TABLE group_members (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	group_id uuid NOT NULL REFERENCES groups(id),
	member_user_id uuid REFERENCES users(id),
	member_contact_id uuid REFERENCES contacts(id),
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	deleted_at timestamptz,
	CONSTRAINT group_members_single_member_ref CHECK (
		(member_user_id IS NOT NULL AND member_contact_id IS NULL)
		OR (member_user_id IS NULL AND member_contact_id IS NOT NULL)
	)
);

CREATE UNIQUE INDEX group_members_group_user_unique_idx
	ON group_members (group_id, member_user_id)
	WHERE member_user_id IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX group_members_group_contact_unique_idx
	ON group_members (group_id, member_contact_id)
	WHERE member_contact_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX group_members_group_id_idx ON group_members (group_id);

CREATE TABLE accounts (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id uuid NOT NULL REFERENCES users(id),
	currency_code char(3) NOT NULL REFERENCES currencies(code),
	name text NOT NULL,
	icon text NOT NULL,
	color text NOT NULL,
	initial_value numeric(18, 6) NOT NULL DEFAULT 0,
	is_archived boolean NOT NULL DEFAULT false,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	deleted_at timestamptz
);

CREATE INDEX accounts_user_id_idx ON accounts (user_id);
CREATE INDEX accounts_currency_code_idx ON accounts (currency_code);

CREATE TABLE categories (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id uuid REFERENCES users(id),
	type category_type NOT NULL,
	name text NOT NULL,
	is_default boolean NOT NULL DEFAULT false,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	deleted_at timestamptz,
	CONSTRAINT categories_name_not_blank CHECK (btrim(name) <> ''),
	CONSTRAINT categories_ownership_rule CHECK (
		(
			is_default = true
			AND user_id IS NULL
		)
		OR (
			is_default = false
			AND user_id IS NOT NULL
		)
	)
);

CREATE UNIQUE INDEX categories_user_name_type_unique_idx
	ON categories (user_id, type, lower(name))
	WHERE user_id IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX categories_default_name_type_unique_idx
	ON categories (type, lower(name))
	WHERE is_default = true AND deleted_at IS NULL;

CREATE TABLE tags (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id uuid NOT NULL REFERENCES users(id),
	name text NOT NULL,
	color text NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	deleted_at timestamptz
);

CREATE UNIQUE INDEX tags_user_name_unique_idx
	ON tags (user_id, lower(name))
	WHERE deleted_at IS NULL;

CREATE INDEX tags_user_id_idx ON tags (user_id);

CREATE TABLE recurring_transactions (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id uuid NOT NULL REFERENCES users(id),
	type category_type NOT NULL,
	mode recurring_mode NOT NULL,
	frequency recurring_frequency NOT NULL,
	template_description text NOT NULL,
	template_amount numeric(18, 6) NOT NULL,
	template_notes text,
	template_category_id uuid REFERENCES categories(id),
	template_account_id uuid NOT NULL REFERENCES accounts(id),
	starts_on date NOT NULL,
	next_generation_date date NOT NULL,
	total_occurrences integer,
	current_version integer NOT NULL DEFAULT 1,
	is_active boolean NOT NULL DEFAULT true,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	deleted_at timestamptz,
	CONSTRAINT recurring_transactions_template_amount_positive CHECK (template_amount > 0),
	CONSTRAINT recurring_transactions_total_occurrences_valid CHECK (
		total_occurrences IS NULL OR total_occurrences > 0
	),
	CONSTRAINT recurring_transactions_current_version_valid CHECK (current_version > 0),
	CONSTRAINT recurring_transactions_next_generation_valid CHECK (next_generation_date >= starts_on)
);

CREATE INDEX recurring_transactions_user_id_idx ON recurring_transactions (user_id);
CREATE INDEX recurring_transactions_next_generation_date_idx
	ON recurring_transactions (next_generation_date)
	WHERE deleted_at IS NULL AND is_active = true;

CREATE TABLE transactions (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id uuid NOT NULL REFERENCES users(id),
	type transaction_type NOT NULL,
	status transaction_status NOT NULL DEFAULT 'done',
	amount numeric(18, 6) NOT NULL,
	description text NOT NULL,
	notes text,
	transaction_date timestamptz NOT NULL,
	account_id uuid NOT NULL REFERENCES accounts(id),
	category_id uuid REFERENCES categories(id),
	recurring_transaction_id uuid REFERENCES recurring_transactions(id),
	recurring_version integer,
	transfer_pair_id uuid,
	transfer_direction transfer_direction,
	is_from_shared boolean NOT NULL DEFAULT false,
	source_shared_transaction_participant_id uuid,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	deleted_at timestamptz,
	CONSTRAINT transactions_amount_positive CHECK (amount > 0),
	CONSTRAINT transactions_description_not_blank CHECK (btrim(description) <> ''),
	CONSTRAINT transactions_recurring_version_valid CHECK (
		recurring_version IS NULL OR recurring_version > 0
	),
	CONSTRAINT transactions_transfer_rule CHECK (
		(
			type = 'transfer'
			AND transfer_pair_id IS NOT NULL
			AND transfer_direction IS NOT NULL
			AND category_id IS NULL
		)
		OR (
			type IN ('income', 'expense')
			AND transfer_pair_id IS NULL
			AND transfer_direction IS NULL
		)
	)
);

CREATE INDEX transactions_user_id_idx ON transactions (user_id);
CREATE INDEX transactions_account_id_idx ON transactions (account_id);
CREATE INDEX transactions_category_id_idx ON transactions (category_id) WHERE category_id IS NOT NULL;
CREATE INDEX transactions_recurring_transaction_id_idx
	ON transactions (recurring_transaction_id)
	WHERE recurring_transaction_id IS NOT NULL;
CREATE INDEX transactions_transfer_pair_id_idx
	ON transactions (transfer_pair_id)
	WHERE transfer_pair_id IS NOT NULL;
CREATE INDEX transactions_transaction_date_idx ON transactions (transaction_date);

CREATE TABLE transaction_tags (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	transaction_id uuid NOT NULL REFERENCES transactions(id),
	tag_id uuid NOT NULL REFERENCES tags(id),
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	deleted_at timestamptz
);

CREATE UNIQUE INDEX transaction_tags_transaction_tag_unique_idx
	ON transaction_tags (transaction_id, tag_id)
	WHERE deleted_at IS NULL;

CREATE INDEX transaction_tags_tag_id_idx ON transaction_tags (tag_id);

CREATE TABLE shared_transactions (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	owner_user_id uuid NOT NULL REFERENCES users(id),
	group_id uuid NOT NULL REFERENCES groups(id),
	type shared_transaction_type NOT NULL DEFAULT 'expense',
	total_amount numeric(18, 6) NOT NULL,
	description text NOT NULL,
	notes text,
	transaction_date timestamptz NOT NULL,
	split_method shared_split_method NOT NULL,
	status shared_transaction_status NOT NULL DEFAULT 'pending',
	current_edit_version integer NOT NULL DEFAULT 1,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	deleted_at timestamptz,
	CONSTRAINT shared_transactions_total_amount_positive CHECK (total_amount > 0),
	CONSTRAINT shared_transactions_description_not_blank CHECK (btrim(description) <> ''),
	CONSTRAINT shared_transactions_current_edit_version_valid CHECK (current_edit_version > 0)
);

CREATE INDEX shared_transactions_owner_user_id_idx ON shared_transactions (owner_user_id);
CREATE INDEX shared_transactions_group_id_idx ON shared_transactions (group_id);
CREATE INDEX shared_transactions_transaction_date_idx ON shared_transactions (transaction_date);

CREATE TABLE shared_transaction_participants (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	shared_transaction_id uuid NOT NULL REFERENCES shared_transactions(id),
	participant_user_id uuid REFERENCES users(id),
	participant_contact_id uuid REFERENCES contacts(id),
	amount numeric(18, 6) NOT NULL,
	approval_status participant_approval_status NOT NULL DEFAULT 'pending',
	approval_version integer NOT NULL DEFAULT 1,
	approved_at timestamptz,
	payment_status participant_payment_status NOT NULL DEFAULT 'unpaid',
	payment_marked_at timestamptz,
	payment_confirmed_at timestamptz,
	user_transaction_id uuid REFERENCES transactions(id),
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	deleted_at timestamptz,
	CONSTRAINT shared_transaction_participants_single_participant_ref CHECK (
		(participant_user_id IS NOT NULL AND participant_contact_id IS NULL)
		OR (participant_user_id IS NULL AND participant_contact_id IS NOT NULL)
	),
	CONSTRAINT shared_transaction_participants_amount_positive CHECK (amount > 0),
	CONSTRAINT shared_transaction_participants_approval_version_valid CHECK (approval_version > 0),
	CONSTRAINT shared_transaction_participants_payment_confirmed_rule CHECK (
		payment_confirmed_at IS NULL OR payment_marked_at IS NOT NULL
	)
);

CREATE UNIQUE INDEX shared_tx_participants_user_unique_idx
	ON shared_transaction_participants (shared_transaction_id, participant_user_id)
	WHERE participant_user_id IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX shared_tx_participants_contact_unique_idx
	ON shared_transaction_participants (shared_transaction_id, participant_contact_id)
	WHERE participant_contact_id IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX shared_tx_participants_user_transaction_unique_idx
	ON shared_transaction_participants (user_transaction_id)
	WHERE user_transaction_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX shared_tx_participants_shared_transaction_id_idx
	ON shared_transaction_participants (shared_transaction_id);

CREATE TABLE notifications (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id uuid NOT NULL REFERENCES users(id),
	type notification_type NOT NULL,
	title text NOT NULL,
	message text NOT NULL,
	related_shared_transaction_id uuid REFERENCES shared_transactions(id),
	related_shared_participant_id uuid REFERENCES shared_transaction_participants(id),
	related_transaction_id uuid REFERENCES transactions(id),
	status notification_status NOT NULL DEFAULT 'pending',
	created_at timestamptz NOT NULL DEFAULT now(),
	read_at timestamptz,
	acted_at timestamptz,
	updated_at timestamptz NOT NULL DEFAULT now(),
	deleted_at timestamptz,
	CONSTRAINT notifications_title_not_blank CHECK (btrim(title) <> ''),
	CONSTRAINT notifications_message_not_blank CHECK (btrim(message) <> '')
);

CREATE INDEX notifications_user_id_idx ON notifications (user_id);
CREATE INDEX notifications_status_idx ON notifications (status);
CREATE INDEX notifications_related_shared_transaction_id_idx
	ON notifications (related_shared_transaction_id)
	WHERE related_shared_transaction_id IS NOT NULL;

CREATE TABLE user_devices (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id uuid NOT NULL REFERENCES users(id),
	device_name text NOT NULL,
	device_type text NOT NULL,
	device_identifier text NOT NULL,
	last_seen_at timestamptz,
	last_sync_at timestamptz,
	is_active boolean NOT NULL DEFAULT true,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	deleted_at timestamptz,
	CONSTRAINT user_devices_device_name_not_blank CHECK (btrim(device_name) <> ''),
	CONSTRAINT user_devices_device_type_not_blank CHECK (btrim(device_type) <> ''),
	CONSTRAINT user_devices_device_identifier_not_blank CHECK (btrim(device_identifier) <> '')
);

CREATE UNIQUE INDEX user_devices_user_identifier_unique_idx
	ON user_devices (user_id, device_identifier)
	WHERE deleted_at IS NULL;

CREATE INDEX user_devices_user_id_idx ON user_devices (user_id);

ALTER TABLE transactions
	ADD CONSTRAINT transactions_source_shared_transaction_participant_id_fkey
	FOREIGN KEY (source_shared_transaction_participant_id)
	REFERENCES shared_transaction_participants(id);

CREATE INDEX transactions_source_shared_transaction_participant_id_idx
	ON transactions (source_shared_transaction_participant_id)
	WHERE source_shared_transaction_participant_id IS NOT NULL;

CREATE TABLE sessions (
  sid TEXT PRIMARY KEY,
  sess JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);

COMMIT;
