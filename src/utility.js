/**
 * Utility functions for @taemno/os
 */

/**
 * Resolve secrets in environment variables
 * @param {Object} env - Environment variables
 * @param {string} prefix - Secret reference prefix
 * @param {string} suffix - Secret reference suffix
 * @param {Object} provider - OS provider for secrets
 * @returns {Promise<Object>} - Resolved environment
 */
async function resolveSecrets(env, prefix, suffix, provider) {
	const result = { ...env };
	const regex = new RegExp(`${prefix.replace(/\$/g, "\\$").replace(/\(/g, "\\(")}(.+?)${suffix.replace(/\)/g, "\\)")}`, "g");

	for (const [key, value] of Object.entries(result)) {
		if (typeof value === "string") {
			let newValue = value;
			let match;
			let matchFound = false;

			// Reset regex index
			regex.lastIndex = 0;

			// Create a copy of the string to replace values
			while ((match = regex.exec(value)) !== null) {
				matchFound = true;
				const [fullMatch, path] = match;
				const [service, account] = path.split("/");

				try {
					const secret = await retrieveSecret(service, account, provider);
					newValue = newValue.replace(fullMatch, secret);
				} catch (error) {
					throw new Error(`Failed to resolve secret for ${key}: ${error.message}`);
				}
			}

			if (matchFound) {
				result[key] = newValue;
			}
		}
	}

	return result;
}

/**
 * Store a secret in the system keychain
 * @param {string} service - Service identifier
 * @param {string} account - Account identifier
 * @param {string} secret - Secret value to store
 * @param {Object} provider - OS provider for secrets
 * @returns {Promise<boolean>} - Success status
 */
async function storeSecret(service, account, secret, provider) {
	return await provider.set(service, account, secret);
}

/**
 * Retrieve a secret from the system keychain
 * @param {string} service - Service identifier
 * @param {string} account - Account identifier
 * @param {Object} provider - OS provider for secrets
 * @returns {Promise<string>} - Retrieved secret
 */
async function retrieveSecret(service, account, provider) {
	return await provider.get(service, account);
}

/**
 * Check if a secret exists in the system keychain
 * @param {string} service - Service identifier
 * @param {string} account - Account identifier
 * @param {Object} provider - OS provider for secrets
 * @returns {Promise<boolean>} - True if secret exists
 */
async function secretExists(service, account, provider) {
	return await provider.exists(service, account);
}

/**
 * Delete a secret from the system keychain
 * @param {string} service - Service identifier
 * @param {string} account - Account identifier
 * @param {Object} provider - OS provider for secrets
 * @returns {Promise<boolean>} - Success status
 */
async function deleteSecret(service, account, provider) {
	return await provider.delete(service, account);
}

module.exports = {
	resolveSecrets,
	storeSecret,
	retrieveSecret,
	secretExists,
	deleteSecret
};