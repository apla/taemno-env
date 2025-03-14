#!/usr/bin/env node

/**
 * @taemno/os CLI tool
 * Command-line interface for managing secrets
 */
const taemnoOS = require("../index.js");
const fs = require("fs").promises;
const path = require("path");
const os = require("os");

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

const cliName = "taemno-env";

// Help text
const helpText = `
@taemno/os - Secure secrets management across operating systems

Usage:
  taemno-os [command] [options]

Commands:
  set <service> <account> <secret>   Store a secret
  get <service> <account>            Retrieve a secret
  delete <service> <account>         Delete a secret
  exists <service> <account>         Check if a secret exists
  resolve [file]                     Resolve secrets in environment variables
  verify [file]                      Verify all secrets are accessible
  help                               Show this help message

Examples:
  taemno-os set service account "my-secret"
  taemno-os get service account
  taemno-os resolve .env
  taemno-os verify
`;

/**
 * Process a set command
 * @param {Array} args - Command arguments
 */
async function handleSet(args) {
	if (args.length < 3) {
		console.error("Error: Missing arguments for set command");
		console.log("Usage: taemno-os set <service> <account> <secret>");
		process.exit(1);
	}

	const [service, account, secret] = args;

	try {
		await taemnoOS.set(service, account, secret);
		console.log(`Secret stored: ${service}/${account}`);
	} catch (error) {
		console.error(`Error: ${error.message}`);
		process.exit(1);
	}
}

/**
 * Process a get command
 * @param {Array} args - Command arguments
 */
async function handleGet(args) {
	if (args.length < 2) {
		console.error("Error: Missing arguments for get command");
		console.log("Usage: taemno-os get <service> <account>");
		process.exit(1);
	}

	const [service, account] = args;

	try {
		const secret = await taemnoOS.get(service, account);
		console.log(secret);
	} catch (error) {
		console.error(`Error: ${error.message}`);
		process.exit(1);
	}
}

/**
 * Process a delete command
 * @param {Array} args - Command arguments
 */
async function handleDelete(args) {
	if (args.length < 2) {
		console.error("Error: Missing arguments for delete command");
		console.log("Usage: taemno-os delete <service> <account>");
		process.exit(1);
	}

	const [service, account] = args;

	try {
		await taemnoOS.delete(service, account);
		console.log(`Secret deleted: ${service}/${account}`);
	} catch (error) {
		console.error(`Error: ${error.message}`);
		process.exit(1);
	}
}

/**
 * Process an exists command
 * @param {Array} args - Command arguments
 */
async function handleExists(args) {
	if (args.length < 2) {
		console.error("Error: Missing arguments for exists command");
		console.log("Usage: taemno-os exists <service> <account>");
		process.exit(1);
	}

	const [service, account] = args;

	try {
		const exists = await taemnoOS.exists(service, account);
		console.log(exists ? "true" : "false");
		process.exit(exists ? 0 : 1);
	} catch (error) {
		console.error(`Error: ${error.message}`);
		process.exit(1);
	}
}

/**
 * Process a resolve command
 * @param {Array} args - Command arguments
 */
async function handleResolve(args) {
	let env = process.env;

	// If a file is specified, load it
	if (args.length > 0) {
		const file = args[0];
		try {
			const envContent = await fs.readFile(file, "utf8");
			env = dotenv.parse(envContent);
		} catch (error) {
			console.error(`Error: Failed to read env file: ${error.message}`);
			process.exit(1);
		}
	}

	try {
		const resolvedEnv = await taemnoOS.resolveEnvironment(env);

		// Output the resolved environment
		for (const [key, value] of Object.entries(resolvedEnv)) {
			console.log(`${key}=${value}`);
		}
	} catch (error) {
		console.error(`Error: ${error.message}`);
		process.exit(1);
	}
}

/**
 * Process a verify command
 * @param {Array} args - Command arguments
 */
async function handleVerify(args) {
	let env = process.env;

	// If a file is specified, load it
	if (args.length > 0) {
		const file = args[0];
		try {
			const envContent = await fs.readFile(file, "utf8");
			env = dotenv.parse(envContent);
		} catch (error) {
			console.error(`Error: Failed to read env file: ${error.message}`);
			process.exit(1);
		}
	}

	try {
		const result = await taemnoOS.verifyEnvironment(env);

		if (result.success) {
			console.log("All secrets are available");
			process.exit(0);
		} else {
			console.error("Missing secrets:");
			result.missingSecrets.forEach(({ key, service, account }) => {
				console.error(`  ${key}: ${service}/${account}`);
			});
			process.exit(1);
		}
	} catch (error) {
		console.error(`Error: ${error.message}`);
		process.exit(1);
	}
}

// Process commands
(async () => {
	try {
		switch (command) {
			case "set":
				await handleSet(args.slice(1));
				break;
			case "get":
				await handleGet(args.slice(1));
				break;
			case "delete":
				await handleDelete(args.slice(1));
				break;
			case "exists":
				await handleExists(args.slice(1));
				break;
			case "resolve":
				await handleResolve(args.slice(1));
				break;
			case "verify":
				await handleVerify(args.slice(1));
				break;
			case "help":
			case "--help":
			case "-h":
			default:
				console.log(helpText);
				break;
		}
	} catch (error) {
		console.error(`Error: ${error.message}`);
		process.exit(1);
	}
})();