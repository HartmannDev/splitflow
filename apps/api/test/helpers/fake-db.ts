import type { UserType } from '../../src/modules/users/model.ts'

type SessionRow = {
	sess: string
	expiresAt: Date
}

type VerificationTokenRow = {
	userId: string
	token: string
	expiresAt: Date
}

type UserRow = Pick<UserType, 'id' | 'role' | 'name' | 'lastname' | 'email'> & {
	passwordHash: string
	emailVerifiedAt?: string | null
	createdAt?: string
	updatedAt?: string
	deletedAt?: string | null
	isActive?: boolean
}

type CategoryRow = {
	id: string
	userId: string | null
	type: 'income' | 'expense'
	name: string
	icon: string
	color: string
	isDefault: boolean
	createdAt?: string
	updatedAt?: string
	deletedAt?: string | null
}

type CurrencyRow = {
	code: string
	name: string
	symbol: string
	decimalPlaces: number
	isActive?: boolean
	createdAt?: string
	updatedAt?: string
	deletedAt?: string | null
}

type AccountRow = {
	id: string
	userId: string
	currencyCode: string
	name: string
	icon: string
	color: string
	initialValue: string
	isArchived?: boolean
	createdAt?: string
	updatedAt?: string
	deletedAt?: string | null
}

type ContactRow = {
	id: string
	userId: string
	name: string
	email?: string | null
	linkedUserId?: string | null
	createdAt?: string
	updatedAt?: string
	deletedAt?: string | null
}

type GroupRow = {
	id: string
	ownerUserId: string
	previousGroupId?: string | null
	name: string
	createdAt?: string
	updatedAt?: string
	deletedAt?: string | null
}

type GroupMemberRow = {
	id: string
	groupId: string
	memberUserId?: string | null
	memberContactId?: string | null
	createdAt?: string
	updatedAt?: string
	deletedAt?: string | null
}

type TagRow = {
	id: string
	userId: string
	name: string
	color: string
	createdAt?: string
	updatedAt?: string
	deletedAt?: string | null
}

class FakePool {
	private readonly sessions = new Map<string, SessionRow>()

	async query(sql: string, params: unknown[] = []) {
		if (sql.includes('INSERT INTO sessions')) {
			const [sessionId, session, expiresAt] = params as [string, string, Date]

			this.sessions.set(sessionId, {
				sess: session,
				expiresAt,
			})

			return { rowCount: 1, rows: [] }
		}

		if (sql.includes('expires_at as "expiresAt"')) {
			const [sessionId] = params as [string]
			const session = this.sessions.get(sessionId)

			if (!session) {
				return { rowCount: 0, rows: [] }
			}

			return {
				rowCount: 1,
				rows: [
					{
						sess: JSON.parse(session.sess),
						expiresAt: session.expiresAt,
					},
				],
			}
		}

		if (sql.includes('DELETE FROM sessions')) {
			const [sessionId] = params as [string]
			const deleted = this.sessions.delete(sessionId)

			return { rowCount: deleted ? 1 : 0, rows: [] }
		}

		throw new Error(`Unsupported session query: ${sql}`)
	}

	async connect() {
		return {
			query: this.query.bind(this),
			release() {},
		}
	}

	async end() {
		this.sessions.clear()
	}
}

export class FakeDatabase {
	public readonly pool = new FakePool()
	private readonly users = new Map<string, UserRow>()
	private readonly verificationTokens = new Map<string, VerificationTokenRow>()
	private readonly categories = new Map<string, CategoryRow>()
	private readonly currencies = new Map<string, CurrencyRow>()
	private readonly accounts = new Map<string, AccountRow>()
	private readonly contacts = new Map<string, ContactRow>()
	private readonly groups = new Map<string, GroupRow>()
	private readonly groupMembers = new Map<string, GroupMemberRow>()
	private readonly tags = new Map<string, TagRow>()

	private buildUserResponse(user: UserRow) {
		return {
			id: user.id,
			role: user.role,
			name: user.name,
			lastname: user.lastname,
			email: user.email,
			isActive: user.isActive,
			emailVerifiedAt: user.emailVerifiedAt,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt,
			deletedAt: user.deletedAt,
		}
	}

	private normalizeSeedUser(user: UserRow): UserRow {
		const timestamp = new Date().toISOString()

		return {
			...user,
			email: user.email.toLowerCase(),
			createdAt: user.createdAt ?? timestamp,
			updatedAt: user.updatedAt ?? timestamp,
			emailVerifiedAt: user.emailVerifiedAt ?? null,
			deletedAt: user.deletedAt ?? null,
			isActive: user.isActive ?? true,
		}
	}

	private buildCategoryResponse(category: CategoryRow) {
		return {
			id: category.id,
			userId: category.userId,
			type: category.type,
			name: category.name,
			icon: category.icon,
			color: category.color,
			isDefault: category.isDefault,
			createdAt: category.createdAt,
			updatedAt: category.updatedAt,
			deletedAt: category.deletedAt,
		}
	}

	private normalizeSeedCategory(category: CategoryRow): CategoryRow {
		const timestamp = new Date().toISOString()

		return {
			...category,
			name: category.name.trim(),
			icon: category.icon.trim(),
			color: category.color.trim(),
			createdAt: category.createdAt ?? timestamp,
			updatedAt: category.updatedAt ?? timestamp,
			deletedAt: category.deletedAt ?? null,
		}
	}

	private assertCategoryUnique(nextCategory: CategoryRow) {
		const duplicated = [...this.categories.values()].some(
			(category) =>
				category.id !== nextCategory.id &&
				category.deletedAt === null &&
				category.type === nextCategory.type &&
				category.name.toLowerCase() === nextCategory.name.toLowerCase() &&
				((category.isDefault && nextCategory.isDefault) ||
					(!category.isDefault && !nextCategory.isDefault && category.userId === nextCategory.userId)),
		)

		if (duplicated) {
			throw { code: '23505' }
		}
	}

	private buildAccountResponse(account: AccountRow) {
		return {
			id: account.id,
			userId: account.userId,
			currencyCode: account.currencyCode,
			name: account.name,
			icon: account.icon,
			color: account.color,
			initialValue: account.initialValue,
			isArchived: account.isArchived,
			createdAt: account.createdAt,
			updatedAt: account.updatedAt,
			deletedAt: account.deletedAt,
		}
	}

	private normalizeSeedCurrency(currency: CurrencyRow): CurrencyRow {
		const timestamp = new Date().toISOString()

		return {
			...currency,
			code: currency.code.toUpperCase(),
			isActive: currency.isActive ?? true,
			createdAt: currency.createdAt ?? timestamp,
			updatedAt: currency.updatedAt ?? timestamp,
			deletedAt: currency.deletedAt ?? null,
		}
	}

	private buildCurrencyResponse(currency: CurrencyRow) {
		return {
			code: currency.code,
			name: currency.name,
			symbol: currency.symbol,
			decimalPlaces: currency.decimalPlaces,
			isActive: currency.isActive,
			createdAt: currency.createdAt,
			updatedAt: currency.updatedAt,
			deletedAt: currency.deletedAt,
		}
	}

	private normalizeSeedAccount(account: AccountRow): AccountRow {
		const timestamp = new Date().toISOString()

		return {
			...account,
			currencyCode: account.currencyCode.toUpperCase(),
			name: account.name.trim(),
			icon: account.icon.trim(),
			color: account.color.trim(),
			initialValue: account.initialValue.trim(),
			isArchived: account.isArchived ?? false,
			createdAt: account.createdAt ?? timestamp,
			updatedAt: account.updatedAt ?? timestamp,
			deletedAt: account.deletedAt ?? null,
		}
	}

	private normalizeSeedContact(contact: ContactRow): ContactRow {
		const timestamp = new Date().toISOString()

		return {
			...contact,
			name: contact.name.trim(),
			email: contact.email?.toLowerCase() ?? null,
			linkedUserId: contact.linkedUserId ?? null,
			createdAt: contact.createdAt ?? timestamp,
			updatedAt: contact.updatedAt ?? timestamp,
			deletedAt: contact.deletedAt ?? null,
		}
	}

	private buildContactResponse(contact: ContactRow) {
		return {
			id: contact.id,
			userId: contact.userId,
			name: contact.name,
			email: contact.email ?? null,
			createdAt: contact.createdAt,
			updatedAt: contact.updatedAt,
			deletedAt: contact.deletedAt,
		}
	}

	private normalizeSeedGroup(group: GroupRow): GroupRow {
		const timestamp = new Date().toISOString()

		return {
			...group,
			name: group.name.trim(),
			previousGroupId: group.previousGroupId ?? null,
			createdAt: group.createdAt ?? timestamp,
			updatedAt: group.updatedAt ?? timestamp,
			deletedAt: group.deletedAt ?? null,
		}
	}

	private normalizeSeedGroupMember(member: GroupMemberRow): GroupMemberRow {
		const timestamp = new Date().toISOString()

		return {
			...member,
			memberUserId: member.memberUserId ?? null,
			memberContactId: member.memberContactId ?? null,
			createdAt: member.createdAt ?? timestamp,
			updatedAt: member.updatedAt ?? timestamp,
			deletedAt: member.deletedAt ?? null,
		}
	}

	private buildGroupResponse(group: GroupRow) {
		return {
			id: group.id,
			ownerUserId: group.ownerUserId,
			previousGroupId: group.previousGroupId ?? null,
			name: group.name,
			createdAt: group.createdAt,
			updatedAt: group.updatedAt,
			deletedAt: group.deletedAt,
		}
	}

	private buildGroupMemberResponse(member: GroupMemberRow) {
		return {
			id: member.id,
			groupId: member.groupId,
			memberUserId: member.memberUserId ?? null,
			memberContactId: member.memberContactId ?? null,
			createdAt: member.createdAt,
			updatedAt: member.updatedAt,
			deletedAt: member.deletedAt,
		}
	}

	private normalizeSeedTag(tag: TagRow): TagRow {
		const timestamp = new Date().toISOString()

		return {
			...tag,
			name: tag.name.trim(),
			color: tag.color.trim(),
			createdAt: tag.createdAt ?? timestamp,
			updatedAt: tag.updatedAt ?? timestamp,
			deletedAt: tag.deletedAt ?? null,
		}
	}

	private buildTagResponse(tag: TagRow) {
		return {
			id: tag.id,
			userId: tag.userId,
			name: tag.name,
			color: tag.color,
			createdAt: tag.createdAt,
			updatedAt: tag.updatedAt,
			deletedAt: tag.deletedAt,
		}
	}

	private assertTagNameUnique(nextTag: TagRow) {
		const duplicated = [...this.tags.values()].some(
			(tag) =>
				tag.id !== nextTag.id &&
				tag.userId === nextTag.userId &&
				tag.deletedAt === null &&
				tag.name.toLowerCase() === nextTag.name.toLowerCase(),
		)

		if (duplicated) {
			throw { code: '23505' }
		}
	}

	private assertContactEmailUnique(nextContact: ContactRow) {
		if (!nextContact.email) {
			return
		}

		const duplicated = [...this.contacts.values()].some(
			(contact) =>
				contact.id !== nextContact.id &&
				contact.userId === nextContact.userId &&
				contact.deletedAt === null &&
				contact.email?.toLowerCase() === nextContact.email?.toLowerCase(),
		)

		if (duplicated) {
			throw { code: '23505' }
		}
	}

	async query(sql: string, params?: unknown[]) {
		const queryParams = params ?? []

		if (sql.includes('password_hash as "passwordHash"') && sql.includes('email_verified_at as "emailVerifiedAt"')) {
			const [email] = queryParams as [string]
			const user = [...this.users.values()].find(
				(candidate) =>
					candidate.email.toLowerCase() === email.toLowerCase() && candidate.deletedAt === null && candidate.isActive,
			)

			return {
				rowCount: user ? 1 : 0,
				rows: user
					? [
							{
								id: user.id,
								email: user.email,
								passwordHash: user.passwordHash,
								role: user.role,
								emailVerifiedAt: user.emailVerifiedAt,
							},
						]
					: [],
			}
		}

		if (sql.includes('INSERT INTO users')) {
			const isManagedCreate = queryParams.length === 7
			const [
				id,
				roleOrName,
				nameOrLastname,
				lastnameOrEmail,
				emailOrPasswordHash,
				passwordHashOrEmailVerifiedAt,
				emailVerifiedAt,
			] = queryParams as [string, string, string, string, string, string, string | null]

			const role = isManagedCreate ? roleOrName : 'user'
			const name = isManagedCreate ? nameOrLastname : roleOrName
			const lastname = isManagedCreate ? lastnameOrEmail : nameOrLastname
			const email = isManagedCreate ? emailOrPasswordHash : lastnameOrEmail
			const passwordHash = isManagedCreate ? passwordHashOrEmailVerifiedAt : (emailOrPasswordHash as string)
			const verifiedAt = isManagedCreate ? emailVerifiedAt : (passwordHashOrEmailVerifiedAt as string | null)

			const emailExists = [...this.users.values()].some((user) => user.email.toLowerCase() === email.toLowerCase())

			if (emailExists) {
				throw { code: '23505' }
			}

			const timestamp = new Date().toISOString()
			this.users.set(id, {
				id,
				role: role as UserRow['role'],
				name,
				lastname,
				email: email.toLowerCase(),
				passwordHash,
				emailVerifiedAt: verifiedAt,
				createdAt: timestamp,
				updatedAt: timestamp,
				deletedAt: null,
				isActive: true,
			})

			return { rowCount: 1, rows: [] }
		}

		if (sql.includes('INSERT INTO verification_tokens')) {
			const [userId, token] = queryParams as [string, string, string]
			const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

			this.verificationTokens.set(token, {
				userId,
				token,
				expiresAt,
			})

			return { rowCount: 1, rows: [] }
		}

		if (sql.includes('FROM verification_tokens') && sql.includes('WHERE token = $1')) {
			const [token] = queryParams as [string]
			const verificationToken = this.verificationTokens.get(token)

			if (!verificationToken || verificationToken.expiresAt <= new Date()) {
				return { rowCount: 0, rows: [] }
			}

			return {
				rowCount: 1,
				rows: [
					{
						user_id: verificationToken.userId,
					},
				],
			}
		}

		if (sql.includes('FROM users') && sql.includes('WHERE id = $1') && sql.includes('deleted_at IS NULL')) {
			const [id] = queryParams as [string]
			const user = this.users.get(id)

			if (!user || user.deletedAt !== null) {
				return { rowCount: 0, rows: [] }
			}

			return {
				rowCount: 1,
				rows: [this.buildUserResponse(user)],
			}
		}

		if (sql.includes('FROM users') && sql.includes('WHERE id = $1') && !sql.includes('deleted_at IS NULL')) {
			const [id] = queryParams as [string]
			const user = this.users.get(id)

			if (!user) {
				return { rowCount: 0, rows: [] }
			}

			return {
				rowCount: 1,
				rows: [this.buildUserResponse(user)],
			}
		}

		if (sql.includes('SELECT id') && sql.includes('FROM users') && sql.includes('WHERE lower(email) = lower($1)')) {
			const [email] = queryParams as [string]
			const user = [...this.users.values()].find(
				(candidate) => candidate.email.toLowerCase() === email.toLowerCase() && candidate.deletedAt === null,
			)

			return {
				rowCount: user ? 1 : 0,
				rows: user ? [{ id: user.id }] : [],
			}
		}

		if (
			sql.includes('FROM users') &&
			sql.includes('WHERE deleted_at IS NULL') &&
			sql.includes('ORDER BY created_at DESC')
		) {
			const rows = [...this.users.values()]
				.filter((user) => user.deletedAt === null)
				.sort((left, right) => right.createdAt!.localeCompare(left.createdAt!))
				.map((user) => this.buildUserResponse(user))

			return {
				rowCount: rows.length,
				rows,
			}
		}

		if (
			sql.includes('FROM users') &&
			sql.includes('ORDER BY created_at DESC') &&
			!sql.includes('WHERE deleted_at IS NULL')
		) {
			const rows = [...this.users.values()]
				.sort((left, right) => right.createdAt!.localeCompare(left.createdAt!))
				.map((user) => this.buildUserResponse(user))

			return {
				rowCount: rows.length,
				rows,
			}
		}

		if (sql.includes('UPDATE users') && sql.includes('SET name = $2') && sql.includes('RETURNING')) {
			const [id, name, lastname, email, emailVerifiedAt] = queryParams as [
				string,
				string,
				string,
				string,
				string | null,
			]
			const user = this.users.get(id)

			if (!user || user.deletedAt !== null) {
				return { rowCount: 0, rows: [] }
			}

			const emailExists = [...this.users.values()].some(
				(candidate) =>
					candidate.id !== id && candidate.deletedAt === null && candidate.email.toLowerCase() === email.toLowerCase(),
			)

			if (emailExists) {
				throw { code: '23505' }
			}

			user.name = name
			user.lastname = lastname
			user.email = email.toLowerCase()
			user.emailVerifiedAt = emailVerifiedAt
			user.updatedAt = new Date().toISOString()

			return {
				rowCount: 1,
				rows: [this.buildUserResponse(user)],
			}
		}

		if (sql.includes('UPDATE users') && sql.includes('SET password_hash = $2')) {
			const [id, passwordHash] = queryParams as [string, string]
			const user = this.users.get(id)

			if (!user || user.deletedAt !== null) {
				return { rowCount: 0, rows: [] }
			}

			user.passwordHash = passwordHash
			user.updatedAt = new Date().toISOString()

			return { rowCount: 1, rows: [] }
		}

		if (sql.includes('UPDATE users') && sql.includes('SET password_hash = $1')) {
			const [passwordHash, id] = queryParams as [string, string]
			const user = this.users.get(id)

			if (!user || user.deletedAt !== null) {
				return { rowCount: 0, rows: [] }
			}

			user.passwordHash = passwordHash
			user.updatedAt = new Date().toISOString()

			return { rowCount: 1, rows: [] }
		}

		if (sql.includes('UPDATE users') && sql.includes('SET email_verified_at = NOW()')) {
			const [id] = queryParams as [string]
			const user = this.users.get(id)

			if (!user) {
				return { rowCount: 0, rows: [] }
			}

			user.emailVerifiedAt = new Date().toISOString()
			user.updatedAt = new Date().toISOString()

			return { rowCount: 1, rows: [] }
		}

		if (sql.includes('UPDATE users') && sql.includes('SET role = $2') && sql.includes('is_active = $3')) {
			const [id, role, isActive] = queryParams as [string, UserRow['role'], boolean]
			const user = this.users.get(id)

			if (!user) {
				return { rowCount: 0, rows: [] }
			}

			user.role = role
			user.isActive = isActive
			user.deletedAt = isActive ? null : (user.deletedAt ?? new Date().toISOString())
			user.updatedAt = new Date().toISOString()

			return {
				rowCount: 1,
				rows: [this.buildUserResponse(user)],
			}
		}

		if (sql.includes('UPDATE users') && sql.includes('SET deleted_at = NOW()')) {
			const [id] = queryParams as [string]
			const user = this.users.get(id)

			if (!user || user.deletedAt !== null) {
				return { rowCount: 0, rows: [] }
			}

			const timestamp = new Date().toISOString()
			user.deletedAt = timestamp
			user.updatedAt = timestamp
			user.isActive = false

			return { rowCount: 1, rows: [] }
		}

		if (sql.includes('DELETE FROM verification_tokens') && sql.includes('WHERE user_id = $1')) {
			const [userId] = queryParams as [string]
			let deletedCount = 0

			for (const [token, verificationToken] of this.verificationTokens.entries()) {
				if (verificationToken.userId === userId) {
					this.verificationTokens.delete(token)
					deletedCount += 1
				}
			}

			return { rowCount: deletedCount, rows: [] }
		}

		if (sql.includes('DELETE FROM verification_tokens') && sql.includes('WHERE token = $1')) {
			const [token] = queryParams as [string]
			const deleted = this.verificationTokens.delete(token)

			return { rowCount: deleted ? 1 : 0, rows: [] }
		}

		if (sql.includes('INSERT INTO categories')) {
			const [id, userId, type, name, icon, color, isDefault] = queryParams as [
				string,
				string | null,
				CategoryRow['type'],
				string,
				string,
				string,
				boolean,
			]

			const category: CategoryRow = {
				id,
				userId,
				type,
				name: name.trim(),
				icon: icon.trim(),
				color: color.trim(),
				isDefault,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				deletedAt: null,
			}

			this.assertCategoryUnique(category)
			this.categories.set(id, category)

			return { rowCount: 1, rows: [] }
		}

		if (sql.includes('SELECT code') && sql.includes('FROM currencies') && sql.includes('AND is_active = true')) {
			const [code] = queryParams as [string]
			const currency = this.currencies.get(code.toUpperCase())

			return {
				rowCount: currency && currency.isActive ? 1 : 0,
				rows: currency && currency.isActive ? [{ code: currency.code }] : [],
			}
		}

		if (sql.includes('INSERT INTO currencies')) {
			const [code, name, symbol, decimalPlaces] = queryParams as [string, string, string, number]
			const normalizedCode = code.toUpperCase()

			if (this.currencies.has(normalizedCode)) {
				throw { code: '23505' }
			}

			const timestamp = new Date().toISOString()
			this.currencies.set(normalizedCode, {
				code: normalizedCode,
				name: name.trim(),
				symbol: symbol.trim(),
				decimalPlaces,
				isActive: true,
			})

			return {
				rowCount: 1,
				rows: [
					{
						code: normalizedCode,
						name: name.trim(),
						symbol: symbol.trim(),
						decimalPlaces,
						isActive: true,
						createdAt: timestamp,
						updatedAt: timestamp,
						deletedAt: null,
					},
				],
			}
		}

		if (sql.includes('FROM currencies') && sql.includes('ORDER BY code ASC')) {
			let currencies = [...this.currencies.values()]

			if (sql.includes('WHERE deleted_at IS NULL')) {
				currencies = currencies.filter((currency) => currency.deletedAt === null)
			}

			if (sql.includes('AND is_active = true')) {
				currencies = currencies.filter((currency) => currency.isActive)
			}

			return {
				rowCount: currencies.length,
				rows: currencies
					.sort((left, right) => left.code.localeCompare(right.code))
					.map((currency) => this.buildCurrencyResponse(currency)),
			}
		}

		if (sql.includes('FROM currencies') && sql.includes('WHERE code = $1')) {
			const [code] = queryParams as [string]
			const currency = this.currencies.get(code.toUpperCase())

			if (!currency) {
				return { rowCount: 0, rows: [] }
			}

			if (sql.includes('AND deleted_at IS NULL') && currency.deletedAt !== null) {
				return { rowCount: 0, rows: [] }
			}

			return {
				rowCount: 1,
				rows: [this.buildCurrencyResponse(currency)],
			}
		}

		if (sql.includes('FROM categories') && sql.includes('WHERE id = $1') && sql.includes('is_default = true AND $2 = true')) {
			const [id, isAdmin, userId] = queryParams as [string, boolean, string]
			const category = this.categories.get(id)

			if (!category || category.deletedAt !== null) {
				return { rowCount: 0, rows: [] }
			}

			const canAccess = (category.isDefault && isAdmin) || (!category.isDefault && category.userId === userId)

			return {
				rowCount: canAccess ? 1 : 0,
				rows: canAccess ? [this.buildCategoryResponse(category)] : [],
			}
		}

		if (sql.includes('FROM categories') && sql.includes('ORDER BY is_default DESC')) {
			const [firstParam, secondParam] = queryParams as [string | undefined, CategoryRow['type'] | undefined]
			const userId = typeof firstParam === 'string' && firstParam.includes('-') ? firstParam : undefined
			const typeFilter =
				firstParam === 'income' || firstParam === 'expense'
					? firstParam
					: secondParam === 'income' || secondParam === 'expense'
						? secondParam
						: undefined

			let categories = [...this.categories.values()].filter((category) => category.deletedAt === null)

			if (sql.includes('AND is_default = true') && !sql.includes('OR (user_id = $1')) {
				categories = categories.filter((category) => category.isDefault)
			} else if (sql.includes('AND user_id = $1') && sql.includes('AND is_default = false')) {
				categories = categories.filter((category) => !category.isDefault && category.userId === userId)
			} else if (sql.includes('OR (user_id = $1 AND is_default = false)')) {
				categories = categories.filter((category) => category.isDefault || (!category.isDefault && category.userId === userId))
			}

			if (typeFilter) {
				categories = categories.filter((category) => category.type === typeFilter)
			}

			categories.sort((left, right) => {
				if (left.isDefault !== right.isDefault) {
					return left.isDefault ? -1 : 1
				}

				const nameComparison = left.name.toLowerCase().localeCompare(right.name.toLowerCase())
				if (nameComparison !== 0) {
					return nameComparison
				}

				return left.createdAt!.localeCompare(right.createdAt!)
			})

			return {
				rowCount: categories.length,
				rows: categories.map((category) => this.buildCategoryResponse(category)),
			}
		}

		if (sql.includes('UPDATE categories') && sql.includes('SET name = $2') && sql.includes('RETURNING')) {
			const [id, name, type, icon, color] = queryParams as [string, string, CategoryRow['type'], string, string]
			const category = this.categories.get(id)

			if (!category || category.deletedAt !== null) {
				return { rowCount: 0, rows: [] }
			}

			const nextCategory: CategoryRow = {
				...category,
				name: name.trim(),
				type,
				icon: icon.trim(),
				color: color.trim(),
			}

			this.assertCategoryUnique(nextCategory)

			category.name = nextCategory.name
			category.type = nextCategory.type
			category.icon = nextCategory.icon
			category.color = nextCategory.color
			category.updatedAt = new Date().toISOString()

			return {
				rowCount: 1,
				rows: [this.buildCategoryResponse(category)],
			}
		}

		if (sql.includes('UPDATE categories') && sql.includes('SET deleted_at = NOW()')) {
			const [id] = queryParams as [string]
			const category = this.categories.get(id)

			if (!category || category.deletedAt !== null) {
				return { rowCount: 0, rows: [] }
			}

			const timestamp = new Date().toISOString()
			category.deletedAt = timestamp
			category.updatedAt = timestamp

			return { rowCount: 1, rows: [] }
		}

		if (sql.includes('INSERT INTO accounts')) {
			const [id, userId, currencyCode, name, icon, color, initialValue] = queryParams as [
				string,
				string,
				string,
				string,
				string,
				string,
				string,
			]

			const account = this.normalizeSeedAccount({
				id,
				userId,
				currencyCode,
				name,
				icon,
				color,
				initialValue,
			})

			this.accounts.set(id, account)

			return { rowCount: 1, rows: [] }
		}

		if (sql.includes('INSERT INTO contacts')) {
			const [id, userId, name, email] = queryParams as [string, string, string, string | null]
			const contact = this.normalizeSeedContact({
				id,
				userId,
				name,
				email,
			})

			this.assertContactEmailUnique(contact)
			this.contacts.set(id, contact)

			return { rowCount: 1, rows: [] }
		}

		if (sql.includes('SELECT id') && sql.includes('FROM contacts') && sql.includes('id = ANY($2)')) {
			const [userId, contactIds] = queryParams as [string, string[]]
			const rows = [...this.contacts.values()]
				.filter((contact) => contact.userId === userId && contact.deletedAt === null && contactIds.includes(contact.id))
				.map((contact) => ({ id: contact.id }))

			return {
				rowCount: rows.length,
				rows,
			}
		}

		if (sql.includes('FROM accounts') && sql.includes('WHERE id = $1') && sql.includes('user_id = $2')) {
			const [id, userId] = queryParams as [string, string]
			const account = this.accounts.get(id)

			if (!account || account.deletedAt !== null || account.userId !== userId) {
				return { rowCount: 0, rows: [] }
			}

			return {
				rowCount: 1,
				rows: [this.buildAccountResponse(account)],
			}
		}

		if (sql.includes('FROM accounts') && sql.includes('WHERE user_id = $1') && sql.includes('ORDER BY is_archived ASC')) {
			const [userId, currencyCode] = queryParams as [string, string | undefined]
			let accounts = [...this.accounts.values()].filter((account) => account.userId === userId && account.deletedAt === null)

			if (sql.includes('AND is_archived = false')) {
				accounts = accounts.filter((account) => !account.isArchived)
			}

			if (currencyCode) {
				accounts = accounts.filter((account) => account.currencyCode === currencyCode.toUpperCase())
			}

			accounts.sort((left, right) => {
				if (left.isArchived !== right.isArchived) {
					return left.isArchived ? 1 : -1
				}

				return right.createdAt!.localeCompare(left.createdAt!)
			})

			return {
				rowCount: accounts.length,
				rows: accounts.map((account) => this.buildAccountResponse(account)),
			}
		}

		if (sql.includes('UPDATE accounts') && sql.includes('SET currency_code = $2') && sql.includes('RETURNING')) {
			const [id, currencyCode, name, icon, color, initialValue, isArchived] = queryParams as [
				string,
				string,
				string,
				string,
				string,
				string,
				boolean,
			]
			const account = this.accounts.get(id)

			if (!account || account.deletedAt !== null) {
				return { rowCount: 0, rows: [] }
			}

			account.currencyCode = currencyCode.toUpperCase()
			account.name = name.trim()
			account.icon = icon.trim()
			account.color = color.trim()
			account.initialValue = initialValue.trim()
			account.isArchived = isArchived
			account.updatedAt = new Date().toISOString()

			return {
				rowCount: 1,
				rows: [this.buildAccountResponse(account)],
			}
		}

		if (sql.includes('UPDATE accounts') && sql.includes('SET deleted_at = NOW()')) {
			const [id] = queryParams as [string]
			const account = this.accounts.get(id)

			if (!account || account.deletedAt !== null) {
				return { rowCount: 0, rows: [] }
			}

			const timestamp = new Date().toISOString()
			account.deletedAt = timestamp
			account.updatedAt = timestamp

			return { rowCount: 1, rows: [] }
		}

		if (sql.includes('FROM contacts') && sql.includes('WHERE id = $1') && sql.includes('user_id = $2')) {
			const [id, userId] = queryParams as [string, string]
			const contact = this.contacts.get(id)

			if (!contact || contact.userId !== userId) {
				return { rowCount: 0, rows: [] }
			}

			if (sql.includes('AND deleted_at IS NULL') && contact.deletedAt !== null) {
				return { rowCount: 0, rows: [] }
			}

			return {
				rowCount: 1,
				rows: [this.buildContactResponse(contact)],
			}
		}

		if (sql.includes('FROM contacts') && sql.includes('WHERE user_id = $1') && sql.includes('ORDER BY created_at DESC')) {
			const [userId] = queryParams as [string]
			let contacts = [...this.contacts.values()].filter((contact) => contact.userId === userId)

			if (sql.includes('AND deleted_at IS NULL')) {
				contacts = contacts.filter((contact) => contact.deletedAt === null)
			}

			contacts.sort((left, right) => right.createdAt!.localeCompare(left.createdAt!))

			return {
				rowCount: contacts.length,
				rows: contacts.map((contact) => this.buildContactResponse(contact)),
			}
		}

		if (sql.includes('UPDATE contacts') && sql.includes('SET name = $2') && sql.includes('RETURNING')) {
			const [id, name, email] = queryParams as [string, string, string | null]
			const contact = this.contacts.get(id)

			if (!contact || contact.deletedAt !== null) {
				return { rowCount: 0, rows: [] }
			}

			const nextContact = this.normalizeSeedContact({
				...contact,
				name,
				email,
				createdAt: contact.createdAt,
			})

			this.assertContactEmailUnique(nextContact)

			contact.name = nextContact.name
			contact.email = nextContact.email
			contact.updatedAt = new Date().toISOString()

			return {
				rowCount: 1,
				rows: [this.buildContactResponse(contact)],
			}
		}

		if (sql.includes('UPDATE contacts') && sql.includes('SET deleted_at = NOW()')) {
			const [id] = queryParams as [string]
			const contact = this.contacts.get(id)

			if (!contact || contact.deletedAt !== null) {
				return { rowCount: 0, rows: [] }
			}

			const timestamp = new Date().toISOString()
			contact.deletedAt = timestamp
			contact.updatedAt = timestamp

			return { rowCount: 1, rows: [] }
		}

		if (sql.includes('INSERT INTO groups')) {
			const [id, ownerUserId, previousGroupId, name] = queryParams as [string, string, string | null, string]
			const group = this.normalizeSeedGroup({
				id,
				ownerUserId,
				previousGroupId,
				name,
			})

			this.groups.set(id, group)
			return { rowCount: 1, rows: [] }
		}

		if (sql.includes('INSERT INTO group_members')) {
			const [id, groupId, memberUserId, memberContactId] = queryParams as [string, string, string | null, string | null]
			const member = this.normalizeSeedGroupMember({
				id,
				groupId,
				memberUserId,
				memberContactId,
			})

			this.groupMembers.set(id, member)
			return { rowCount: 1, rows: [] }
		}

		if (sql.includes('FROM groups') && sql.includes('WHERE id = $1') && sql.includes('owner_user_id = $2')) {
			const [id, ownerUserId] = queryParams as [string, string]
			const group = this.groups.get(id)

			if (!group || group.ownerUserId !== ownerUserId) {
				return { rowCount: 0, rows: [] }
			}

			if (sql.includes('AND deleted_at IS NULL') && group.deletedAt !== null) {
				return { rowCount: 0, rows: [] }
			}

			return {
				rowCount: 1,
				rows: [this.buildGroupResponse(group)],
			}
		}

		if (sql.includes('FROM groups') && sql.includes('WHERE owner_user_id = $1') && sql.includes('ORDER BY created_at DESC')) {
			const [ownerUserId] = queryParams as [string]
			let groups = [...this.groups.values()].filter((group) => group.ownerUserId === ownerUserId)

			if (sql.includes('AND deleted_at IS NULL')) {
				groups = groups.filter((group) => group.deletedAt === null)
			}

			groups.sort((left, right) => right.createdAt!.localeCompare(left.createdAt!))

			return {
				rowCount: groups.length,
				rows: groups.map((group) => this.buildGroupResponse(group)),
			}
		}

		if (sql.includes('FROM group_members') && sql.includes('group_id = ANY($1)')) {
			const [groupIds] = queryParams as [string[]]
			const members = [...this.groupMembers.values()]
				.filter((member) => member.deletedAt === null && groupIds.includes(member.groupId))
				.sort((left, right) => left.createdAt!.localeCompare(right.createdAt!))
				.map((member) => this.buildGroupMemberResponse(member))

			return {
				rowCount: members.length,
				rows: members,
			}
		}

		if (sql.includes('UPDATE groups') && sql.includes('SET name = $2') && sql.includes('RETURNING')) {
			const [id, name] = queryParams as [string, string]
			const group = this.groups.get(id)

			if (!group || group.deletedAt !== null) {
				return { rowCount: 0, rows: [] }
			}

			group.name = name.trim()
			group.updatedAt = new Date().toISOString()

			return {
				rowCount: 1,
				rows: [this.buildGroupResponse(group)],
			}
		}

		if (sql.includes('UPDATE groups') && sql.includes('SET deleted_at = NOW()')) {
			const [id] = queryParams as [string]
			const group = this.groups.get(id)

			if (!group || group.deletedAt !== null) {
				return { rowCount: 0, rows: [] }
			}

			const timestamp = new Date().toISOString()
			group.deletedAt = timestamp
			group.updatedAt = timestamp

			return { rowCount: 1, rows: [] }
		}

		if (sql.includes('INSERT INTO tags')) {
			const [id, userId, name, color] = queryParams as [string, string, string, string]
			const tag = this.normalizeSeedTag({
				id,
				userId,
				name,
				color,
			})

			this.assertTagNameUnique(tag)
			this.tags.set(id, tag)

			return { rowCount: 1, rows: [] }
		}

		if (sql.includes('FROM tags') && sql.includes('WHERE id = $1') && sql.includes('user_id = $2')) {
			const [id, userId] = queryParams as [string, string]
			const tag = this.tags.get(id)

			if (!tag || tag.userId !== userId) {
				return { rowCount: 0, rows: [] }
			}

			if (sql.includes('AND deleted_at IS NULL') && tag.deletedAt !== null) {
				return { rowCount: 0, rows: [] }
			}

			return {
				rowCount: 1,
				rows: [this.buildTagResponse(tag)],
			}
		}

		if (sql.includes('FROM tags') && sql.includes('WHERE user_id = $1') && sql.includes('ORDER BY created_at DESC')) {
			const [userId] = queryParams as [string]
			let tags = [...this.tags.values()].filter((tag) => tag.userId === userId)

			if (sql.includes('AND deleted_at IS NULL')) {
				tags = tags.filter((tag) => tag.deletedAt === null)
			}

			tags.sort((left, right) => right.createdAt!.localeCompare(left.createdAt!))

			return {
				rowCount: tags.length,
				rows: tags.map((tag) => this.buildTagResponse(tag)),
			}
		}

		if (sql.includes('UPDATE tags') && sql.includes('SET name = $2') && sql.includes('RETURNING')) {
			const [id, name, color] = queryParams as [string, string, string]
			const tag = this.tags.get(id)

			if (!tag || tag.deletedAt !== null) {
				return { rowCount: 0, rows: [] }
			}

			const nextTag = this.normalizeSeedTag({
				...tag,
				name,
				color,
				createdAt: tag.createdAt,
			})

			this.assertTagNameUnique(nextTag)

			tag.name = nextTag.name
			tag.color = nextTag.color
			tag.updatedAt = new Date().toISOString()

			return {
				rowCount: 1,
				rows: [this.buildTagResponse(tag)],
			}
		}

		if (sql.includes('UPDATE tags') && sql.includes('SET deleted_at = NOW()')) {
			const [id] = queryParams as [string]
			const tag = this.tags.get(id)

			if (!tag || tag.deletedAt !== null) {
				return { rowCount: 0, rows: [] }
			}

			const timestamp = new Date().toISOString()
			tag.deletedAt = timestamp
			tag.updatedAt = timestamp

			return { rowCount: 1, rows: [] }
		}

		if (sql.includes('UPDATE currencies') && sql.includes('SET name = $2')) {
			const [code, name, symbol, decimalPlaces, isActive] = queryParams as [string, string, string, number, boolean]
			const currency = this.currencies.get(code.toUpperCase())

			if (!currency) {
				return { rowCount: 0, rows: [] }
			}

			currency.name = name.trim()
			currency.symbol = symbol.trim()
			currency.decimalPlaces = decimalPlaces
			currency.isActive = isActive
			if (isActive) {
				currency.deletedAt = null
			}
			currency.updatedAt = new Date().toISOString()

			return {
				rowCount: 1,
				rows: [this.buildCurrencyResponse(currency)],
			}
		}

		if (sql.includes('UPDATE currencies') && sql.includes('SET deleted_at = NOW()')) {
			const [code] = queryParams as [string]
			const currency = this.currencies.get(code.toUpperCase())

			if (!currency || currency.deletedAt !== null) {
				return { rowCount: 0, rows: [] }
			}

			const timestamp = new Date().toISOString()
			currency.isActive = false
			currency.deletedAt = timestamp
			currency.updatedAt = timestamp

			return { rowCount: 1, rows: [] }
		}

		throw new Error(`Unsupported database query: ${sql}`)
	}

	async transaction<T>(callback: (db: Pick<FakeDatabase, 'query'>) => Promise<T>) {
		return await callback({
			query: this.query.bind(this),
		})
	}

	async closePool() {
		await this.pool.end()
	}

	async testConnection() {
		return
	}

	seedUser(user: UserRow) {
		this.users.set(user.id, this.normalizeSeedUser(user))
	}

	seedCategory(category: CategoryRow) {
		this.categories.set(category.id, this.normalizeSeedCategory(category))
	}

	seedCurrency(currency: CurrencyRow) {
		const normalizedCurrency = this.normalizeSeedCurrency(currency)
		this.currencies.set(normalizedCurrency.code, normalizedCurrency)
	}

	seedAccount(account: AccountRow) {
		this.accounts.set(account.id, this.normalizeSeedAccount(account))
	}

	seedContact(contact: ContactRow) {
		this.contacts.set(contact.id, this.normalizeSeedContact(contact))
	}

	seedGroup(group: GroupRow) {
		this.groups.set(group.id, this.normalizeSeedGroup(group))
	}

	seedGroupMember(member: GroupMemberRow) {
		this.groupMembers.set(member.id, this.normalizeSeedGroupMember(member))
	}

	seedTag(tag: TagRow) {
		this.tags.set(tag.id, this.normalizeSeedTag(tag))
	}
}

export type { AccountRow, CategoryRow, ContactRow, CurrencyRow, GroupMemberRow, GroupRow, TagRow, UserRow }
