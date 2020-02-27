
# Migrating purser from flow-js to typescript

this is a small diary of the migration process from flow to typescript


Done with the help of this tutorial:
https://medium.com/inato/migrating-from-flow-to-typescript-why-how-worth-it-5b7703d12089


Current Strategy: Start with purser-core and then digging forward to other modules.



## Known Issues

### Removed Functionality

- removed eslint for now, going to reactivate proper linting for TS later on.
- genericWallet `otherAddresses` property and in the constructor ?? added again ?! TODO: check.



