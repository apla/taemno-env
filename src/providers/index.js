/**
 * Provider selector for different operating systems
 */
const os = require("os");

// Import platform-specific providers
const darwinProvider = require("./darwin.js");
// const linuxProvider = require("./linux.js");
// const win32Provider = require("./win32.js");

// Determine the current platform
const platform = os.platform();

// Select appropriate provider based on the platform
let provider;
switch (platform) {
	case "darwin":
		provider = darwinProvider;
		break;
	case "linux":
		provider = linuxProvider;
		break;
	case "win32":
		provider = win32Provider;
		break;
	default:
		throw new Error(`Unsupported platform: ${platform}`);
}

module.exports = provider;