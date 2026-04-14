import { buildHashValidator } from '../../modules/auth/hash-validator.ts'
import { db } from '../db.ts'
import {
	demoAccounts,
	demoContacts,
	demoGroupMembers,
	demoGroups,
	demoNotifications,
	demoPassword,
	demoPersonalCategories,
	demoRecurringTransactions,
	demoSharedTransactionLinks,
	demoSharedTransactionParticipants,
	demoSharedTransactions,
	demoTags,
	demoTransactions,
	demoTransactionTags,
	demoUserProfiles,
} from './data.ts'
import { seedBaseRecords } from './base.ts'
import { ensureRequiredEnv, upsertRows } from './helpers.ts'

export const seedDemoRecords = async () => {
	await db.transaction(async (tx) => {
		await seedBaseRecords(tx)
	})

	const passwordPepper = ensureRequiredEnv('PASSWORD_PEPPER')
	const { createHash } = buildHashValidator(passwordPepper)
	const { passwordHash } = await createHash(demoPassword)
	const users = demoUserProfiles.map((profile) => ({
		...profile,
		password_hash: passwordHash,
		is_active: true,
		email_verified_at: '2026-03-01T08:00:00.000Z',
		deleted_at: null,
	}))

	await db.transaction(async (tx) => {
		await upsertRows(tx, {
			table: 'users',
			conflictTarget: '(id)',
			columns: ['id', 'role', 'name', 'last_name', 'email', 'password_hash', 'is_active', 'email_verified_at', 'deleted_at'],
			rows: users,
		})

		await upsertRows(tx, {
			table: 'contacts',
			conflictTarget: '(id)',
			columns: ['id', 'user_id', 'linked_user_id', 'name', 'email'],
			rows: demoContacts,
		})

		await upsertRows(tx, {
			table: 'accounts',
			conflictTarget: '(id)',
			columns: ['id', 'user_id', 'currency_code', 'name', 'icon', 'color', 'initial_value', 'is_archived'],
			rows: demoAccounts,
		})

		await upsertRows(tx, {
			table: 'categories',
			conflictTarget: '(id)',
			columns: ['id', 'user_id', 'type', 'name', 'icon', 'color', 'is_default'],
			rows: demoPersonalCategories,
		})

		await upsertRows(tx, {
			table: 'tags',
			conflictTarget: '(id)',
			columns: ['id', 'user_id', 'name', 'color'],
			rows: demoTags,
		})

		await upsertRows(tx, {
			table: 'groups',
			conflictTarget: '(id)',
			columns: ['id', 'owner_user_id', 'previous_group_id', 'name'],
			rows: demoGroups,
		})

		await upsertRows(tx, {
			table: 'group_members',
			conflictTarget: '(id)',
			columns: ['id', 'group_id', 'member_user_id', 'member_contact_id'],
			rows: demoGroupMembers,
		})

		await upsertRows(tx, {
			table: 'recurring_transactions',
			conflictTarget: '(id)',
			columns: [
				'id',
				'user_id',
				'type',
				'mode',
				'frequency',
				'template_description',
				'template_amount',
				'template_notes',
				'template_category_id',
				'template_account_id',
				'starts_on',
				'next_generation_date',
				'total_occurrences',
				'current_version',
				'is_active',
			],
			rows: demoRecurringTransactions,
		})

		await upsertRows(tx, {
			table: 'transactions',
			conflictTarget: '(id)',
			columns: [
				'id',
				'user_id',
				'type',
				'status',
				'amount',
				'description',
				'notes',
				'transaction_date',
				'account_id',
				'category_id',
				'recurring_transaction_id',
				'recurring_version',
				'transfer_pair_id',
				'transfer_direction',
				'is_from_shared',
				'source_shared_transaction_participant_id',
			],
			rows: demoTransactions,
		})

		await upsertRows(tx, {
			table: 'transaction_tags',
			conflictTarget: '(id)',
			columns: ['id', 'transaction_id', 'tag_id'],
			rows: demoTransactionTags,
		})

		await upsertRows(tx, {
			table: 'shared_transactions',
			conflictTarget: '(id)',
			columns: ['id', 'owner_user_id', 'group_id', 'type', 'total_amount', 'description', 'notes', 'transaction_date', 'split_method', 'status', 'current_edit_version'],
			rows: demoSharedTransactions,
		})

		await upsertRows(tx, {
			table: 'shared_transaction_participants',
			conflictTarget: '(id)',
			columns: [
				'id',
				'shared_transaction_id',
				'participant_user_id',
				'participant_contact_id',
				'amount',
				'approval_status',
				'approval_version',
				'approved_at',
				'payment_status',
				'payment_marked_at',
				'payment_confirmed_at',
				'user_transaction_id',
			],
			rows: demoSharedTransactionParticipants,
		})

		for (const link of demoSharedTransactionLinks) {
			await tx.query(
				`UPDATE transactions
				SET source_shared_transaction_participant_id = $2
				WHERE id = $1`,
				[link.transaction_id, link.source_shared_transaction_participant_id],
			)
		}

		await upsertRows(tx, {
			table: 'notifications',
			conflictTarget: '(id)',
			columns: [
				'id',
				'user_id',
				'type',
				'title',
				'message',
				'related_shared_transaction_id',
				'related_shared_participant_id',
				'related_transaction_id',
				'status',
				'read_at',
				'acted_at',
			],
			rows: demoNotifications,
		})
	})
}
