// Imports
const rs = require('randomstring');
const axios = require('axios');

// Constants
const BASE_URL = 'http://jobcoin.projecticeland.net/laparocolpotomy/api';
const HOUSE_ACCOUNT = 'houseAccount';
const POLLING_INTERVAL = 5000;
const MAX_SEND_DELAY = 20000; // In milliseconds

// Data
const clients = [];
const retry = [];

// Poll the addresses that we created as drop bins
setInterval(pollAddresses, POLLING_INTERVAL);

/**
 * Starts the mixing process by transferring the money from the dropbox to
 * the house account, then initiates the process to redistribute the funds.
 * @param {Client} client - Client that gives the necessary parameters to perform a tumble.
 * @returns void
 */
function cleanTarget(client) {
	const { pollingAddress, balance } = client;
	axios
		.post(`${BASE_URL}/transactions`, {
			fromAddress: pollingAddress,
			toAddress: HOUSE_ACCOUNT,
			amount: balance
		})
		.then(response => {
			distributeFunds(client);
		})
		.catch(err => console.log('post error', err));
}

/**
 * Split the funds into random parts and send them to the
 * addresses that the user specified. Each transaction will
 * occur after some random delay between 0 and MAX_SEND_DELAY
 * in order to reduce tracing sent money back to the original
 * deposit.
 * @param {Client} client - The client that requested the tumble
 * @returns void
 */
function distributeFunds(client) {
	const amounts = computeAmounts(client);

	amounts.forEach(target => {
		setTimeout(() => {
			axios
				.post(`${BASE_URL}/transactions`, {
					fromAddress: HOUSE_ACCOUNT,
					toAddress: target.address,
					amount: target.amount
				})
				.then(response => console.log('sent clean funds', response.data))
				.catch(err => {
					console.log('transfer error', err)
					retry.push(target);
				});
		}, Math.floor(Math.random() * MAX_SEND_DELAY))
	});
}

/**
 * Compute the amounts to send to each address. The amounts will be
 * randomized in order to mitigate tracing them back to the original
 * transaction. The house keeps 2% (such competitive pricing!!) of
 * the total as a transaction fee.
 * @param {Client} client - Client to compute distributed values for.
 * @returns {Array} The amounts and the addresses they should be sent to.
 */
function computeAmounts(client) {
	const { targets } = client;
	let { balance } = client;
	// Keep a 2% cut for the house
	balance *= 0.98;
	const numClients = targets.length;
	const amounts = new Array(numClients);
	const equalAmount = Math.trunc(balance / numClients);

	// Add an equal amount to each
	for (let i = 0; i < numClients; i++) {
		amounts[i] = equalAmount;
		balance -= equalAmount;
	}

	// Add one or the remaining balance to each
	for (let i = 0; i < numClients; i++) {
		const amount = balance >= 1 ? 1 : balance;
		amounts[i] += amount;
		balance -= amount;

		if (balance == 0) break;
	}

	// Randomize the amounts to some degree. Any one address
	// will not be less than (total / numAddresses) / 2
	for (let i = 0; i < (numClients / 2); i++) {
		const random = Math.random() * (equalAmount / 2);
		const negation = Math.random() > 0.5 ? 1 : -1;
		amounts[i] += negation * random;
		amounts[(numClients - 1) - i] += (-1 * negation) * random;
	}

	const returnValue = [];

	for (let i = 0; i < numClients; i++) {
		returnValue.push({
			address: targets[i],
			amount: amounts[i]
		});
	}

	return returnValue;
}

/**
 * Request the balance of each watched address and start
 * the cleaning process as soon as there's a balance.
 * Once the cleaning process start, any further deposits will
 * be ignored.
 * @returns void
 */
function pollAddresses() {

	clients.forEach((client, index) => {
		axios
			.get(`${BASE_URL}/addresses/${client.pollingAddress}`)
			.then(response => {
				const { balance } = response.data;

				if (balance > 0) {
					client.balance = balance;
					cleanTarget(client);
					clients.splice(index);
				}
			})
			.catch(err => console.log('poll error', err));
	});
}

// Route controllers
function indexRoute(req, res) {
	res.render('index');
};

function tumbleRoute(req, res) {
	const { addresses } = req.body;
	const pollingAddress = rs.generate(12);

	clients.push({
		pollingAddress,
		targets: addresses.split(/\r?\n/),
		balance: 0
	});

	res.render('response', { address: pollingAddress });
};

function debugRoute(req, res) {
	res.json(clients);
};

module.exports = {
	indexRoute,
	tumbleRoute,
	debugRoute
};
