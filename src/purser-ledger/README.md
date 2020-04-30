## [@colony/](https://www.npmjs.com/org/colony)purser-ledger

A `javascript` library to interact with a [Ledger](https://www.ledger.com/) based Ethereum wallet.

It extracts all the complexity from setting up, maintaining and interacting with it, while providing you with a [predictable interface](https://docs.colony.io/purser/interface-common-wallet-interface/).

### Installation
```js
yarn add @colony/purser-ledger
```

### Quick Usage
```js
import { open } from '@colony/purser-ledger'

const wallet = await open();

await wallet.setDefaultAddress(12); // Optional - Select another address from the ones available

console.log(wallet); // { address: '...', otherAddrresses: [...], publicKey: '...' }
```

### Documentation

You can find more in-depth description for this module's API in the [purser docs](https://docs.colony.io/purser/modules-@colonypurser-ledger/).

### Contributing

This package is part of the [purser monorepo](https://github.com/JoinColony/purser) package.

Please read our [Contributing Guidelines](https://github.com/JoinColony/purser/blob/master/.github/CONTRIBUTING.md) for how to get started.

### License

The `purser-ledger` library along with the whole purser monorepo are [MIT licensed](https://github.com/JoinColony/purser/blob/master/LICENSE).