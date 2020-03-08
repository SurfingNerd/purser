/* @flow */

import BigNumber from 'bn.js';

export type MetamaskInpageProviderType = {
  enable: () => Promise<Array<string>>,
  mux: Object,
  publicConfigStore: {
    _events: Object,
    _state: Object,
  },
  rpcEngine: Object,
};

export type Web3CallbackType = (error: Error, result: string) => any;

export type Web3TransactionType = {
  blockHash: string,
  blockNumber: number,
  from: string,
  gas: number,
  gasPrice: BigNumber,
  hash: string,
  input: string,
  nonce: number,
  r: string,
  s: string,
  to: string,
  transactionIndex: number,
  v: string,
  value: string,
};

export type MetamaskStateEventsObserverType = (state: Object) => any;

export type MetamaskWalletConstructorArgumentsType = {
  address: string,
};

export type getTransactionMethodType = (
  transactionHash: string,
) => Promise<Web3TransactionType>;

export type signMessageMethodType = (
  signature: string,
  currentAddress: string,
  callback: Web3CallbackType,
) => void;

export type signTrasactionMethodType = (
  transactionObject: Object,
  callback: Web3CallbackType,
) => void;

export type verifyMessageMethodType = (
  message: string,
  signature: string,
  callback: Web3CallbackType,
) => void;
