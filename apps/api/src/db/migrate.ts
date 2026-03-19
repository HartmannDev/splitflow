import fs from 'node:fs'
import { db } from './db.ts'

const migrationsDir = 'src/db/migrations'

await fs.readdir(migrationsDir, (err, files) => {
	console.log(files)
	if (files.length === 0) {
		console.error('No migration files found in the /migrations directory.')
		return
	}

	files.forEach(async (file) => {
		await fs.readFile(`${migrationsDir}/${file}`, 'utf-8', async (err, sql) => {
			if (err) {
				console.error(`Error reading migration file ${file}:`, err)
				return
			}

			await db.transaction(async (tx) => {
				await tx.query(sql)
			})
		})
	})

	if (err) {
		console.error('Error reading migration files:', err)
		return
	}
})
