import { bigNumberify } from 'ethers/utils';

import { transactionObjectValidator } from '../../../core/helpers';
import {
  addressNormalizer,
  hexSequenceNormalizer,
} from '../../../core/normalizers';

import { signTransaction } from '../../../software/staticMethods';

jest.dontMock('../../../software/staticMethods');

jest.mock('ethers/utils');
jest.mock('../../../core/helpers');
jest.mock('../../../core/normalizers');

/*
 * These values are not correct. Do not use the as reference.
 * If the validators wouldn't be mocked, they wouldn't pass.
 */
const mockedSignedTransaction = 'mocked-signed-transaction';
const mockedInjectedCallback = jest.fn(transactionObject => {
  if (!transactionObject) {
    throw new Error();
  }
  return mockedSignedTransaction;
});
const chainId = 'mocked-chain-id';
const inputData = 'mocked-data';
const gasLimit = 'mocked-gas-limit';
const gasPrice = 'mocked-gas-price';
const nonce = 'mocked-nonce';
const to = 'mocked-destination-address';
const value = 'mocked-transaction-value';
const mockedTransactionObject = {
  gasPrice,
  gasLimit,
  chainId,
  nonce,
  to,
  value,
  inputData,
};
const mockedArgumentsObject = {
  ...mockedTransactionObject,
  callback: mockedInjectedCallback,
};
describe('`Software` Wallet Module', () => {
  afterEach(() => {
    mockedInjectedCallback.mockClear();
    transactionObjectValidator.mockClear();
    addressNormalizer.mockClear();
    hexSequenceNormalizer.mockClear();
    bigNumberify.mockClear();
  });
  describe('`signTransaction()` static method', () => {
    test('Calls the injected callback', async () => {
      await signTransaction(mockedArgumentsObject);
      expect(mockedInjectedCallback).toHaveBeenCalled();
      expect(mockedInjectedCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          chainId,
          data: inputData,
          gasLimit,
          gasPrice,
          nonce,
          to,
          value,
        }),
      );
    });
    test("Validates the transaction object's values", async () => {
      await signTransaction(mockedArgumentsObject);
      expect(transactionObjectValidator).toHaveBeenCalled();
      expect(transactionObjectValidator).toHaveBeenCalledWith(
        mockedTransactionObject,
      );
    });
    test("Normalizes the transaction object's values before call", async () => {
      await signTransaction(mockedArgumentsObject);
      /*
       * Destination address
       */
      expect(addressNormalizer).toHaveBeenCalled();
      expect(addressNormalizer).toHaveBeenCalledWith(to);
      /*
       * Transaction data
       */
      expect(hexSequenceNormalizer).toHaveBeenCalled();
      expect(hexSequenceNormalizer).toHaveBeenCalledWith(inputData);
    });
    test('Normalizes the signed transaction before returning', async () => {
      await signTransaction(mockedArgumentsObject);
      /*
       * The signed transaction string
       */
      expect(hexSequenceNormalizer).toHaveBeenCalled();
      expect(hexSequenceNormalizer).toHaveBeenCalledWith(
        mockedSignedTransaction,
      );
    });
    test("Converts numbers to Ethers's version of Big Number", async () => {
      await signTransaction(mockedArgumentsObject);
      /*
       * Gas price
       */
      expect(bigNumberify).toHaveBeenCalled();
      expect(bigNumberify).toHaveBeenCalledWith(gasPrice);
      /*
       * Gas limit
       */
      expect(bigNumberify).toHaveBeenCalledWith(gasLimit);
      /*
       * Transaction value
       */
      expect(bigNumberify).toHaveBeenCalledWith(value);
    });
    test('Throws if something goes wrong', async () => {
      expect(signTransaction()).rejects.toThrow();
    });
  });
});
