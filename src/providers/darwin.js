const { promisify } = require('util');
const { execFile } = require('child_process');
const execAsync = promisify(execFile);

const SECURITY_COMMAND = '/usr/bin/security';
const ALLOWED_KEYCHAIN = null; // null allows default, or specify a specific path.  NEVER allow arbitrary paths.

class KeychainError extends Error {
	constructor(message, originalError) {
		super(message);
		this.name = 'KeychainError';
		this.originalError = originalError;
	}
}

class InvalidInputError extends KeychainError {
	constructor(message) {
		super(message);
		this.name = 'InvalidInputError';
	}
}

/**
 * Validate and sanitize inputs to prevent command injection
 * @param {string} input - Input string to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function isValidInput(input) {
	return input.constructor.name === 'String' && /^[a-zA-Z0-9._-@#]+$/.test(input) && input.length <= 255;
}

function validateInputs(service, account, keychain) {
	if (!isValidInput(service)) {
		throw new InvalidInputError('Invalid service name');
	}
	if (!isValidInput(account)) {
		throw new InvalidInputError('Invalid account name');
	}
	if (keychain && !isValidInput(keychain)) {
		throw new InvalidInputError('Invalid keychain name');
	}
}

/**
 * Store a secret in the macOS Keychain
 * @param {string} service - Service identifier
 * @param {string} account - Account identifier
 * @param {string} secret - Secret value to store
 * @param {string} [keychain] - Optional keychain name
 * @returns {Promise<boolean>} - Success status
 */
async function set(service, account, secret, keychain = null) {
	validateInputs(service, account, keychain);

	const args = ['add-generic-password', '-s', `'${service}'`, '-a', service, '-a', account];

	if (keychain) {
		args.push('-k', keychain);
	}

	try {
		await execAsync(SECURITY_COMMAND, ['delete-generic-password', '-s', service, '-a', account]);
	} catch (deleteError) {
		// Ignore error if the item doesn't exist. If it doesn't we want to create the key
	}

	try {
		const child = execFile(SECURITY_COMMAND, args.concat(['-U', '-w']), { stdio: ['pipe', 'pipe', 'ignore'] });
		child.stdin.write(secret);
		child.stdin.end();
		await new Promise((resolve, reject) => {
			child.on('close', (code) => {
				if (code === 0) resolve(true);
				else reject(new KeychainError(`Failed to store secret`, new Error(`security command failed with code ${code}`)));
			});
		});
		return true;
	} catch (error) {
		throw new KeychainError(`Failed to store secret`, error);
	}
}

/**
 * Retrieve a secret from the macOS Keychain
 * @param {string} service - Service identifier
 * @param {string} account - Account identifier
 * @param {string} [keychain] - Optional keychain name
 * @returns {Promise<string>} - Retrieved secret
 */
async function get(service, account, keychain = null) {
	validateInputs(service, account, keychain);

	const args = ['find-generic-password', '-s', service, '-a', account, '-w'];

	if (keychain) {
		args.push('-k', keychain);
	}

	try {
		const { stdout } = await execAsync(SECURITY_COMMAND, args, { encoding: 'utf8' });
		return stdout.trim();
	} catch (error) {
		throw new KeychainError(`Secret not found: ${service}/${account}`, error);
	}
}

/**
 * Check if a secret exists in the macOS Keychain
 * @param {string} service - Service identifier
 * @param {string} account - Account identifier
 * @param {string} [keychain] - Optional keychain name
 * @returns {Promise<boolean>} - True if secret exists
 */
async function exists(service, account, keychain = null) {
	try {
		await get(service, account, keychain);
		return true;
	} catch (error) {
		return false;
	}
}

/**
 * Delete a secret from the macOS Keychain
 * @param {string} service - Service identifier
 * @param {string} account - Account identifier
 * @param {string} [keychain] - Optional keychain name
 * @returns {Promise<boolean>} - Success status
 */
async function deleteSecret(service, account, keychain = null) {
	validateInputs(service, account, keychain);

	const args = ['delete-generic-password', '-s', service, '-a', account];

	if (keychain) {
		args.push('-k', keychain);
	}

	try {
		await execAsync(SECURITY_COMMAND, args);
		return true;
	} catch (error) {
		return false;
	}
}

module.exports = {
	set,
	get,
	exists,
	delete: deleteSecret
};