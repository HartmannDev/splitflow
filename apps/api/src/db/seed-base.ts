import { db } from './db.ts'
import { seedBaseRecords } from './seeds/base.ts'

try {
	await db.transaction(async (tx) => {
		await seedBaseRecords(tx)
	})

	console.log('Base seeds applied successfully.')
} catch (error) {
	console.error('Failed to apply base seeds.')
	console.error(error)
	process.exitCode = 1
} finally {
	await db.closePool()
}
