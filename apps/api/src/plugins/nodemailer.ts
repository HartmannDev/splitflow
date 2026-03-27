import { readFileSync } from 'node:fs'

import { createTransport } from 'nodemailer'

const readEnvValue = (name: string) => {
	const filePath = process.env[`${name}_FILE`]

	if (filePath) {
		return readFileSync(filePath, 'utf8').trim()
	}

	return process.env[name]
}

export const buildEmailTransporter = () => {
	const transporter = createTransport({
		service: 'gmail',
		auth: {
			user: process.env.GMAIL_APP_EMAIL,
			pass: readEnvValue('GMAIL_APP_PASSWORD'),
		},
		tls: {
			rejectUnauthorized: false,
		},
	})

	transporter.verify((error, _success) => {
		if (error) {
			console.error('Error verifying email transporter:', error)
			return
		}
		console.log('Email transporter is ready to send messages')
	})

	return transporter
}

export type EmailTransporter = ReturnType<typeof buildEmailTransporter>
