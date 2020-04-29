/* @flow */

import { Transaction as EthereumTx } from 'ethereumjs-tx';

import {
  derivationPathValidator,
  hexSequenceValidator,
} from '@colony/purser-core/validators';
import {
  derivationPathNormalizer,
  multipleOfTwoHexValueNormalizer,
  hexSequenceNormalizer,
  addressNormalizer,
} from '@colony/purser-core/normalizers';
import { warning, objectToErrorString } from '@colony/purser-core/utils';
import {
  verifyMessageSignature,
  transactionObjectValidator,
  messageVerificationObjectValidator,
  messageOrDataValidator,
  getChainDefinition,
} from '@colony/purser-core/helpers';
import { HEX_HASH_TYPE, SIGNATURE } from '@colony/purser-core/defaults';
import { ledgerConnection, handleLedgerConnectionError } from './helpers';

import { staticMethods as messages } from './messages';

import { LedgerInstanceType } from './flowtypes';

/**
 * Sign a transaction object and return the serialized signature (as a hex string)
 *
 * @method signTransaction
 *
 * @param {string} derivationPath the derivation path for the account with which to sign the transaction (provided by the Wallet instance)
 * @param {bigNumber} gasPrice gas price for the transaction in WEI (as an instance of bigNumber), defaults to 9000000000 (9 GWEI)
 * @param {bigNumber} gasLimit gas limit for the transaction (as an instance of bigNumber), defaults to 21000
 * @param {number} chainId the id of the chain for which this transaction is intended
 * @param {number} nonce the nonce to use for the transaction (as a number)
 * @param {string} to the address to which to the transaction is sent
 * @param {bigNumber} value the value of the transaction in WEI (as an instance of bigNumber), defaults to 1
 * @param {string} inputData data appended to the transaction (as a `hex` string)
 *
 * All the above params are sent in as props of an {TransactionObjectType} object.
 *
 * @return {Promise<string>} the hex signature string
 */
export const signTransaction = async ({
  derivationPath,
  ...transactionObject
}: Object = {}): Promise<string | void> => {
  const {
    gasPrice,
    gasLimit,
    chainId,
    nonce,
    to,
    value,
    inputData,
  } = transactionObjectValidator(transactionObject);
  try {
    const ledger: LedgerInstanceType = await ledgerConnection();
    derivationPathValidator(derivationPath);
    /*
     * Ledger needs the unsigned "raw" transaction hex, which it will sign and
     * return the (R) and (S) signature components alog with the reco(V)ery param.
     *
     *
     * See fundamentals of Elliptic Curve Digital Signature Algorithm (ECDSA) to
     * get an general idea of where the three components come from:
     * https://en.wikipedia.org/wiki/Elliptic_Curve_Digital_Signature_Algorithm
     *
     * Also, see EIP-155 for the 27 and 28 magic numbers expected in the recovery
     * parameter:
     * https://github.com/ethereum/EIPs/blob/master/EIPS/eip-155.md
     */
    const unsignedTransaction = new EthereumTx(
      Object.assign(
        {},
        {
          /*
           * We could really do with some BN.js flow types declarations :(
           */
          gasPrice: hexSequenceNormalizer(
            /*
             * @TODO Add `bigNumber` `toHexString` wrapper method
             *
             * Flow confuses bigNumber's `toString` with the String object
             * prototype `toString` method
             */
            /* $FlowFixMe */
            multipleOfTwoHexValueNormalizer(gasPrice.toString(16)),
          ),
          gasLimit: hexSequenceNormalizer(
            /*
             * @TODO Add `bigNumber` `toHexString` wrapper method
             *
             * Flow confuses bigNumber's `toString` with the String object
             * prototype `toString` method
             */
            /* $FlowFixMe */
            multipleOfTwoHexValueNormalizer(gasLimit.toString(16)),
          ),
          /*
           * Nonces needs to be sent in as a hex string, and to be padded as a multiple of two.
           * Eg: '3' to be '03', `12c` to be `012c`
           */
          nonce: hexSequenceNormalizer(
            /*
             * @TODO Add `bigNumber` `toHexString` wrapper method
             *
             * Flow confuses bigNumber's `toString` with the String object
             * prototype `toString` method
             */
            /* $FlowFixMe */
            multipleOfTwoHexValueNormalizer(nonce.toString(16)),
          ),
          value: hexSequenceNormalizer(
            /*
             * @TODO Add `bigNumber` `toHexString` wrapper method
             *
             * Flow confuses bigNumber's `toString` with the String object
             * prototype `toString` method
             */
            /* $FlowFixMe */
            multipleOfTwoHexValueNormalizer(value.toString(16)),
          ),
          data: hexSequenceNormalizer(inputData),
          /*
           * The transaction object needs to be seeded with the (R) and (S) signature components with
           * empty data, and the Reco(V)ery param as the chain id (all, im hex string format).
           *
           * See this issue for context:
           * https://github.com/LedgerHQ/ledgerjs/issues/43
           */
          r: hexSequenceNormalizer(
            multipleOfTwoHexValueNormalizer(String(SIGNATURE.R)),
          ),
          s: hexSequenceNormalizer(
            multipleOfTwoHexValueNormalizer(String(SIGNATURE.S)),
          ),
          v: hexSequenceNormalizer(
            /*
             * @TODO Add `bigNumber` `toHexString` wrapper method
             *
             * Flow confuses bigNumber's `toString` with the String object
             * prototype `toString` method
             */
            /* $FlowFixMe */
            multipleOfTwoHexValueNormalizer(chainId.toString(16)),
          ),
        },
        to ? { to: addressNormalizer(to) } : {},
      ),
      getChainDefinition(chainId),
    );
    /*
     * Sign the transaction object via your Ledger Wallet
     *
     * We also warn the user here, since the device will need confirmation, but only in dev mode.
     */
    warning(messages.userSignInteractionWarning);
    const {
      r: rSignatureComponent,
      s: sSignatureComponent,
      v: recoveryParameter,
    } = await ledger.signTransaction(
      derivationPathNormalizer(derivationPath),
      unsignedTransaction.serialize().toString(HEX_HASH_TYPE),
    );
    /*
     * Proving that we signed the above transaction.
     *
     * @NOTE We need to modify the original transaction
     * Otherwise EthereumTx will complain because internally it checks for the valid instance
     */
    unsignedTransaction.r = hexSequenceNormalizer(rSignatureComponent);
    unsignedTransaction.s = hexSequenceNormalizer(sSignatureComponent);
    unsignedTransaction.v = hexSequenceNormalizer(recoveryParameter);
    const serializedSignedTransaction = unsignedTransaction
      .serialize()
      .toString(HEX_HASH_TYPE);
    /*
     * Add the hex prefix
     */
    return hexSequenceNormalizer(serializedSignedTransaction);
  } catch (caughtError) {
    return handleLedgerConnectionError(
      caughtError,
      `${messages.userSignTxGenericError}: ${objectToErrorString(
        transactionObject,
      )} ${caughtError.message}`,
    );
  }
};

/**
 * Sign a message and return the signature. Useful for verifying identities.
 *
 * @method signMessage
 *
 * @param {string} derivationPath the derivation path for the account with which to sign the message
 * @param {string} message the message you want to sign
 *
 * All the above params are sent in as props of an {object}.
 *
 * @return {Promise<string>} The signed message `hex` string (wrapped inside a `Promise`)
 */
export const signMessage = async ({
  derivationPath,
  message,
  messageData,
}: Object = {}): Promise<string | void> => {
  /*
   * Validate input values: derivationPath and message
   */
  derivationPathValidator(derivationPath);
  const toSign = messageOrDataValidator({ message, messageData });
  try {
    const ledger: LedgerInstanceType = await ledgerConnection();
    /*
     * Sign the message object via your Ledger Wallet
     *
     * We also warn the user here, since the device will need confirmation, but only in dev mode.
     */
    warning(messages.userSignMessageInteractionWarning);
    const {
      r: rSignatureComponent,
      s: sSignatureComponent,
      v: recoveryParameter,
      /*
       * Flow bugs out here claiming the `r` property is not available on the return object.
       */
      /* $FlowFixMe */
    } = await ledger.signPersonalMessage(
      derivationPathNormalizer(derivationPath),
      /*
       * The message needs to be sent in as an hex string
       *
       * Also, Flow don't know about Buffer
       */
      /* $FlowFixMe */
      Buffer.from(toSign).toString(HEX_HASH_TYPE),
    );
    /*
     * Combine the (R), and (S) signature components, alogn with the reco(V)ery param (that
     * gets converted into `hex`)
     */
    return hexSequenceNormalizer(
      `${rSignatureComponent}` +
        `${sSignatureComponent}` +
        `${recoveryParameter.toString(16)}`,
    );
  } catch (caughtError) {
    return handleLedgerConnectionError(
      caughtError,
      `${messages.userSignTxGenericError}: message: (${toSign.toString()}) ${
        caughtError.message
      }`,
    );
  }
};

/**
 * Verify a signed message. Useful for verifying identity. (In conjunction with `signMessage`)
 *
 * @method verifyMessage
 *
 * @param {string} publicKey The public key to verify the signature agains (this is coming from the wallet instance)
 * @param {string} message The message to verify if it was signed correctly
 * @param {string} signature The message signature as a `hex` string (you usually get this via `signMessage`)
 *
 * All the above params are sent in as props of an {MessageVerificationObjectType} object.
 *
 * @return {Promise<boolean>} A boolean to indicate if the message/signature pair are valid (wrapped inside a `Promise`)
 */
export const verifyMessage = async ({
  publicKey,
  ...signatureMessage
}: Object): Promise<boolean> => {
  /*
   * Validate the public key locally
   */
  hexSequenceValidator(publicKey);
  /*
   * Validate the rest of the pros using the core helper
   */
  const { message, signature } = messageVerificationObjectValidator(
    signatureMessage,
  );
  return verifyMessageSignature({
    /*
     * Ensure the public key has the hex `0x` prefix
     */
    publicKey: hexSequenceNormalizer(publicKey),
    message,
    /*
     * Ensure the signature has the hex `0x` prefix
     */
    signature: hexSequenceNormalizer(signature),
  });
};
