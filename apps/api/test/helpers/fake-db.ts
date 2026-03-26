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
		return {
			...currency,
			code: currency.code.toUpperCase(),
			isActive: currency.isActive ?? true,
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
}

export type { AccountRow, CategoryRow, CurrencyRow, UserRow }
