/**
 * @taemno/os - Secure secrets management across operating systems
 * Manages secrets through native OS keychains/secure storage
 */
const { resolveSecrets, storeSecret, retrieveSecret, secretExists, deleteSecret } = require("./utility.js");
const provider = require("./providers/index.js");

/**
 * Main class for @taemno/os functionality
 */
class TaemnoOS {
	/**
	 * Initialize the TaemnoOS instance
	 * @param {Object} options - Configuration options
	 */
	constructor(options = {}) {
		this.options = {
			envPrefix: "$(taemno os://",
			envSuffix: ")",
			...options
		};
		this.provider = provider;
	}

	/**
	 * Process environment variables and substitute secret references
	 * @param {Object} env - Environment variables object (defaults to process.env)
	 * @returns {Promise<Object>} - Environment with secrets resolved
	 */
	async resolveEnvironment(env = process.env) {
		return await resolveSecrets(env, this.options.envPrefix, this.options.envSuffix, this.provider);
	}

	/**
	 * Store a secret in the system keychain
	 * @param {string} service - Service identifier
	 * @param {string} account - Account identifier
	 * @param {string} secret - Secret value to store
	 * @returns {Promise<boolean>} - Success status
	 */
	async set(service, account, secret) {
		return await storeSecret(service, account, secret, this.provider);
	}

	/**
	 * Retrieve a secret from the system keychain
	 * @param {string} service - Service identifier
	 * @param {string} account - Account identifier
	 * @returns {Promise<string>} - Retrieved secret
	 */
	async get(service, account) {
		return await retrieveSecret(service, account, this.provider);
	}

	/**
	 * Check if a secret exists in the system keychain
	 * @param {string} service - Service identifier
	 * @param {string} account - Account identifier
	 * @returns {Promise<boolean>} - True if secret exists
	 */
	async exists(service, account) {
		return await secretExists(service, account, this.provider);
	}

	/**
	 * Delete a secret from the system keychain
	 * @param {string} service - Service identifier
	 * @param {string} account - Account identifier
	 * @returns {Promise<boolean>} - Success status
	 */
	async delete(service, account) {
		return await deleteSecret(service, account, this.provider);
	}

	/**
	 * Verify that all secret references in environment are resolvable
	 * @param {Object} env - Environment variables object (defaults to process.env)
	 * @returns {Promise<Object>} - Object with success status and missing secrets if any
	 */
	async verifyEnvironment(env = process.env) {
		const missingSecrets = [];
		const regex = new RegExp(`${this.options.envPrefix.replace(/\$/g, "\\$").replace(/\(/g, "\\(")}(.+?)${this.options.envSuffix.replace(/\)/g, "\\)")}`, "g");

		for (const [key, value] of Object.entries(env)) {
			if (typeof value === "string") {
				let match;
				while ((match = regex.exec(value)) !== null) {
					const [, path] = match;
					const [service, account] = path.split("/");

					if (!await this.exists(service, account)) {
						missingSecrets.push({ key, service, account });
					}
				}
			}
		}

		return {
			success: missingSecrets.length === 0,
			missingSecrets
		};
	}
}

module.exports = new TaemnoOS();
module.exports.TaemnoOS = TaemnoOS;