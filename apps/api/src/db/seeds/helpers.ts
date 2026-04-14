import { readFileSync } from 'node:fs'
import process from 'node:process'

import type { PoolClient } from 'pg'

export const readEnvValue = (name: string) => {
	const filePath = process.env[`${name}_FILE`]

	if (filePath) {
		return readFileSync(filePath, 'utf8').trim()
	}

	return process.env[name]
}

type SeedClient = Pick<PoolClient, 'query'>

type UpsertRowsInput = {
	table: string
	conflictTarget: string
	columns: string[]
	rows: Array<Record<string, unknown>>
}

export const upsertRows = async (client: SeedClient, { table, conflictTarget, columns, rows }: UpsertRowsInput) => {
	if (rows.length === 0) {
		return
	}

	const params: unknown[] = []
	const tuples = rows.map((row, rowIndex) => {
		const placeholders = columns.map((column, columnIndex) => {
			params.push(row[column] ?? null)
			return `$${rowIndex * columns.length + columnIndex + 1}`
		})

		return `(${placeholders.join(', ')})`
	})

	const updateColumns = columns.filter((column) => !['id', 'code'].includes(column))
	const updateSet = updateColumns.map((column) => `${column} = EXCLUDED.${column}`).join(', ')

	await client.query(
		`INSERT INTO ${table} (${columns.join(', ')})
		VALUES ${tuples.join(', ')}
		ON CONFLICT ${conflictTarget}
		DO UPDATE SET ${updateSet}`,
		params,
	)
}

export const ensureRequiredEnv = (name: string) => {
	const value = readEnvValue(name)

	if (!value) {
		throw new Error(`${name} environment variable is required for seeding`)
	}

	return value
}
