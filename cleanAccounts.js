// Convenience utility to reset addresses to 0 balance

const axios = require('axios');
const BASE_URL = 'http://jobcoin.projecticeland.net/laparocolpotomy/api';
const GRAVEYARD = 'graveyard';

const accounts = [
	'1',
	'2',
	'3'
];

accounts.forEach(account => {
	axios
		.get(`${BASE_URL}/addresses/${account}`)
		.then(response => {
			const { balance } = response.data;
			console.log('balance', balance);
			return axios
				.post(`${BASE_URL}/transactions`, {
					fromAddress: account,
					toAddress: GRAVEYARD,
					amount: balance
				});
		})
		.then(response => console.log('cleaned'))
		.catch(err => console.log('error', err));
});
