# EVM Rule Engine

A lightweight and extensible rule engine for evaluating conditions on Ethereum Virtual Machine (EVM) accounts and contracts. Define custom rules to check wallet balances, contract balances, ERC-20 token holdings, transaction counts, NFT ownership, and more.

Compatible with Node and browser environments.

---

## Features

- **Wallet Balance**: Validate that an account's ETH balance meets specific criteria.
- **Contract Balance**: Ensure a contract holds a required amount of ETH.
- **ERC20 Balance**: Check if an account holds a sufficient balance of a given ERC20 token.
- **Transaction Count**: Verify that an account’s number of transactions (nonce) meets expectations.
- **NFT Ownership**: Determine if an account owns at least one NFT or a specific NFT token.
- **Address Type Verification**: Confirm whether an address is a contract or an externally owned account (EOA).
- **Contract Call Evaluation**: Execute contract functions and evaluate their results against expected outcomes.
- **Dynamic Rule Loading**: Easily load and export rules from JSON definitions.

---

## Install

```sh
npm install evm-rule-engine
```

---

## Usage

### Basic Example

The following example shows how to set up the rule engine, add a rule, and evaluate an EVM address:

```typescript
import { ethers } from 'ethers'
import { EVMRuleEngine, walletBalance } from 'evm-rule-engine'

// Configure the network (example using a local Anvil instance)
const networks = [
  {
    provider: new ethers.JsonRpcProvider('http://127.0.0.1:8545'),
    chainId: '31337'
  }
]

// Create an instance of the rule engine with the network configuration
const engine = new EVMRuleEngine({ networks })

// Add a wallet balance rule: check if the wallet has at least 1 ETH
engine.addRule(
  walletBalance(networks, '31337', {
    value: ethers.parseEther('1'),
    compareType: 'gte'
  })
)

// Evaluate all rules against a given address
const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
engine.evaluate(address)
  .then(result => {
    console.log('Evaluation Result:', result)
  })
  .catch(error => {
    console.error('Error evaluating rules:', error)
  })
```

### Loading Rules from JSON

Rules can also be defined in JSON format and loaded dynamically using the `createRulesFromDefinitions` function:

```typescript
import { createRulesFromDefinitions } from 'evm-rule-engine'

// Define rule JSON objects
const ruleDefinitions = [
  { type: 'walletBalance', chainId: '31337', params: { value: ethers.parseEther('1'), compareType: 'gte' } },
  { type: 'numTransactions', chainId: '31338', params: { value: '5', compareType: 'gte' } }
]

// Create rule instances from the JSON definitions and add them to the engine
const rules = createRulesFromDefinitions(networks, ruleDefinitions)
engine.addRules(rules)

// Export rules as JSON definitions
console.log(engine.exportRulesAsJson())
```

---

## Testing

This project uses [Mocha](https://mochajs.org/) and [Chai](https://www.chaijs.com/) for testing. Some tests require one or more local Anvil instances.

Start Anvil on port 8545 with chain ID `31337`:

```sh
anvil --port 8545 --chain-id 31337
```

Start another instance on port 8546 with chain ID `31338`:

```sh
anvil --port 8546 --chain-id 31338
```

Run the tests with:

```sh
npm run test
```

---

## Development

### Building Contracts

If your rules interact with Solidity contracts, build them using Forge:

```sh
npm run build:contract
```

### Linting and Building the Project

**Lint the Code:**

```sh
npm run lint
```

**Build the Project:**

```sh
npm run build
```

Other scripts available in the [package.json](./package.json) include test coverage and dependency checks.

---

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests to improve the engine, add new features, or fix bugs.

---

## License

This project is dual-licensed under the [Apache-2.0](LICENSE-APACHE) or [MIT](LICENSE-MIT) license.

