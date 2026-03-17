import type { FastifyReply, FastifyRequest } from 'fastify'
import { randomUUID } from 'node:crypto'

import type { CreateTransactionInput, Transaction } from './model.ts'

const transactions: Transaction[] = []

export const getTransactions = async (req: FastifyRequest, res: FastifyReply) => {
	res.code(200).send(transactions)
}

export const createTransaction = async (req: FastifyRequest, res: FastifyReply) => {
	const { amount, currency, date }: CreateTransactionInput = req.body
	const transactionID = randomUUID()

	transactions.push({
		transactionID: transactionID,
		amount,
		currency,
		date,
	})

	res.code(201).send({ message: 'Transaction created successfully', transactionID })
}
