import { db } from './db.ts'
import { demoPassword } from './seeds/data.ts'
import { seedDemoRecords } from './seeds/demo.ts'

try {
	await seedDemoRecords()

	console.log('Demo seeds applied successfully.')
	console.log(`Demo login password: ${demoPassword}`)
} catch (error) {
	console.error('Failed to apply demo seeds.')
	console.error(error)
	process.exitCode = 1
} finally {
	await db.closePool()
}
