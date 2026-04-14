import type { PoolClient } from 'pg'

import { baseCurrencies, baseDefaultCategories } from './data.ts'
import { upsertRows } from './helpers.ts'

export const seedBaseRecords = async (client: Pick<PoolClient, 'query'>) => {
	await upsertRows(client, {
		table: 'currencies',
		conflictTarget: '(code)',
		columns: ['code', 'name', 'symbol', 'decimal_places', 'is_active', 'deleted_at'],
		rows: baseCurrencies,
	})

	await upsertRows(client, {
		table: 'categories',
		conflictTarget: '(id)',
		columns: ['id', 'user_id', 'type', 'name', 'icon', 'color', 'is_default'],
		rows: baseDefaultCategories,
	})
}
