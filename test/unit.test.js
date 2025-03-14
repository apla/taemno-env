import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert";
import { TaemnoOS } from "../src/index.js";

describe("TaemnoOS", () => {
	let taemnoOS;
	let mockProvider;

	beforeEach(() => {
		// Create a fresh mock provider for each test
		mockProvider = {
			set: mock.fn(async () => true),
			get: mock.fn(async () => "test-secret"),
			exists: mock.fn(async () => true),
			delete: mock.fn(async () => true)
		};
		taemnoOS = new TaemnoOS();
		taemnoOS.provider = mockProvider;
	});

	afterEach(() => {
		mockProvider.set.mockClear();
		mockProvider.get.mockClear();
		mockProvider.exists.mockClear();
		mockProvider.delete.mockClear();
	});

	describe("resolveEnvironment", () => {
		it("should resolve secret references in environment variables", async () => {
			const env = {
				TEST_KEY: "$(taemno os://service/account)",
				NORMAL_KEY: "normal-value",
				MIXED_KEY: "prefix-$(taemno os://service/account)-suffix"
			};

			const resolvedEnv = await taemnoOS.resolveEnvironment(env);

			assert.deepStrictEqual(resolvedEnv, {
				TEST_KEY: "test-secret",
				NORMAL_KEY: "normal-value",
				MIXED_KEY: "prefix-test-secret-suffix"
			});

			assert.strictEqual(mockProvider.get.mock.calls.length, 1);
			assert.deepStrictEqual(mockProvider.get.mock.calls[0].arguments, ["service", "account"]);
		});

		it("should handle multiple secret references in a single variable", async () => {
			const env = {
				COMPLEX_KEY: "$(taemno os://service1/account1) and $(taemno os://service2/account2)"
			};

			// Use mock.fn.mockImplementation
			mockProvider.get.mockImplementation(async (service, account) => {
				if (service === "service1" && account === "account1") return "secret1";
				if (service === "service2" && account === "account2") return "secret2";
				return "unknown";
			});

			const resolvedEnv = await taemnoOS.resolveEnvironment(env);

			assert.deepStrictEqual(resolvedEnv, {
				COMPLEX_KEY: "secret1 and secret2"
			});

			assert.strictEqual(mockProvider.get.mock.calls.length, 2);
		});

		it("should throw an error if a secret is not found", async () => {
			const env = {
				TEST_KEY: "$(taemno os://service/account)"
			};

			mockProvider.get.mockImplementation(async () => {
				throw new Error("Secret not found");
			});

			await assert.rejects(
				taemnoOS.resolveEnvironment(env),
				/Failed to resolve secret/
			);
		});
	});

	describe("set", () => {
		it("should store a secret", async () => {
			await taemnoOS.set("service", "account", "secret");

			assert.strictEqual(mockProvider.set.mock.calls.length, 1);
			assert.deepStrictEqual(mockProvider.set.mock.calls[0].arguments, ["service", "account", "secret"]);
		});
	});

	describe("get", () => {
		it("should retrieve a secret", async () => {
			const secret = await taemnoOS.get("service", "account");

			assert.strictEqual(secret, "test-secret");
			assert.strictEqual(mockProvider.get.mock.calls.length, 1);
			assert.deepStrictEqual(mockProvider.get.mock.calls[0].arguments, ["service", "account"]);
		});
	});

	describe("exists", () => {
		it("should check if a secret exists", async () => {
			const exists = await taemnoOS.exists("service", "account");

			assert.strictEqual(exists, true);
			assert.strictEqual(mockProvider.exists.mock.calls.length, 1);
			assert.deepStrictEqual(mockProvider.exists.mock.calls[0].arguments, ["service", "account"]);
		});
	});

	describe("delete", () => {
		it("should delete a secret", async () => {
			await taemnoOS.delete("service", "account");

			assert.strictEqual(mockProvider.delete.mock.calls.length, 1);
			assert.deepStrictEqual(mockProvider.delete.mock.calls[0].arguments, ["service", "account"]);
		});
	});

	describe("verifyEnvironment", () => {
		it("should verify all secrets are available", async () => {
			const env = {
				TEST_KEY: "$(taemno os://service/account)",
				NORMAL_KEY: "normal-value"
			};

			const result = await taemnoOS.verifyEnvironment(env);

			assert.deepStrictEqual(result, {
				success: true,
				missingSecrets: []
			});

			assert.strictEqual(mockProvider.exists.mock.calls.length, 1);
			assert.deepStrictEqual(mockProvider.exists.mock.calls[0].arguments, ["service", "account"]);
		});

		it("should report missing secrets", async () => {
			const env = {
				TEST_KEY: "$(taemno os://service/account)",
				MISSING_KEY: "$(taemno os://missing/account)"
			};

			mockProvider.exists.mockImplementation(async (service) => {
				return service === "service";
			});

			const result = await taemnoOS.verifyEnvironment(env);

			assert.deepStrictEqual(result, {
				success: false,
				missingSecrets: [
					{ key: "MISSING_KEY", service: "missing", account: "account" }
				]
			});
		});
	});
});