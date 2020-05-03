
import { fromString } from 'bip32-path';
import { Transaction as EthereumTx } from 'ethereumjs-tx';

import {
  addressValidator,
  derivationPathValidator,
} from '../purser-core/validators';
import {
  derivationPathNormalizer,
  multipleOfTwoHexValueNormalizer,
  addressNormalizer,
  hexSequenceNormalizer,
} from '../purser-core/normalizers';
import {
  warning,
  bigNumber,
  objectToErrorString,
} from '../purser-core/utils';
import {
  transactionObjectValidator,
  messageVerificationObjectValidator,
  messageOrDataValidator,
  getChainDefinition,
} from '../purser-core/helpers';
import { TransactionObjectTypeWithDerivationPath, TransactionObjectTypeWithTo } from "../purser-core/types";

import { HEX_HASH_TYPE, SIGNATURE } from '../purser-core/defaults';

import { payloadListener } from './helpers';

import { staticMethods as messages } from './messages';
import { STD_ERRORS } from './defaults';
import { PAYLOAD_SIGNTX, PAYLOAD_SIGNMSG, PAYLOAD_VERIFYMSG } from './payloads';

/**
 * Sign a transaction object and return the serialized signature (as a hex string)
 *
 * @method signTransaction
 *
 * @param {string} derivationPath the derivation path for the account with which to sign the transaction
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
export const signTransaction = async (obj: TransactionObjectTypeWithDerivationPath): Promise<string | void> => {
  const transactionObject : TransactionObjectTypeWithTo =
      {
        chainId: obj.chainId,
        gasPrice: obj.gasPrice,
        gasLimit: obj.gasLimit,
        nonce: obj.nonce,
        value: obj.value,
        inputData: obj.inputData,
        to: obj.to
      };


  const {
    gasPrice,
    gasLimit,
    chainId,
    nonce,
    to,
    value,
    inputData,
  } = transactionObjectValidator(transactionObject);
  const derivationPath = obj.derivationPath;
  derivationPathValidator(derivationPath);
  /*
   * @TODO Reduce code repetition
   *
   * Between the unsigned EthereumTx signature object values and the values
   * sent to the Trezor server
   */
  const unsignedTransaction = new EthereumTx(
    {
      /*
       * We could really do with some BN.js flow types declarations :(
       */
      gasPrice: hexSequenceNormalizer(
        multipleOfTwoHexValueNormalizer(gasPrice),
      ),
      gasLimit: hexSequenceNormalizer(
        multipleOfTwoHexValueNormalizer(gasPrice),
      ),
      /*
       * Nonces needs to be sent in as a hex string, and to be padded as a multiple of two.
       * Eg: '3' to be '03', `12c` to be `012c`
       */
      nonce: hexSequenceNormalizer(
        multipleOfTwoHexValueNormalizer(nonce.toString(16)),
      ),
      value: hexSequenceNormalizer(
        multipleOfTwoHexValueNormalizer(value),
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
    getChainDefinition(chainId),
  );
  /*
   * Modify the default payload to set the transaction details
   */
  const modifiedPayloadObject = Object.assign(
    {},
    PAYLOAD_SIGNTX,
    {
      /*
       * Path needs to be sent in as an derivation path array
       */
      address_n: fromString(
        derivationPathNormalizer(derivationPath),
        true,
      ).toPathArray(),
      gas_price: multipleOfTwoHexValueNormalizer(gasPrice),
      gas_limit: multipleOfTwoHexValueNormalizer(gasLimit),
      chain_id: chainId,
      nonce: multipleOfTwoHexValueNormalizer(nonce.toString(16)),
      value: multipleOfTwoHexValueNormalizer(value),
      /*
       * Trezor service requires the prefix from the input data to be stripped
       */
      data: hexSequenceNormalizer(inputData, false),
    },
    /*
     * Only send (and normalize) the destingation address if one was
     * provided in the initial transaction object.
     *
     * Trezor service requires the prefix from the address to be stripped
     */
    to ? { to: addressNormalizer(to, false) } : {},
  );
  /*
   * We need to catch the cancelled error since it's part of a normal user workflow
   */
  try {
    /*
     * See fundamentals of Elliptic Curve Digital Signature Algorithm (ECDSA) to
     * get an general idea of where the three components come from:
     * https://en.wikipedia.org/wiki/Elliptic_Curve_Digital_Signature_Algorithm
     *
     * Also, see EIP-155 for the 27 and 28 magic numbers expected in the recovery
     * parameter:
     * https://github.com/ethereum/EIPs/blob/master/EIPS/eip-155.md
     *
     * Now, trezor will give you the recovery paramenter already encoded, but if you
     * want to derive the magic numbers again:
     *
     * recoveryParam - 35 - (chainId * 2)
     *
     * If the result is odd, then V is 27, if it's even, it's 28
     */
    const {
      r: rSignatureComponent,
      s: sSignatureComponent,
      v: recoveryParameter,
    } = await payloadListener({ payload: modifiedPayloadObject });
    /*
     * Add the signature values to the unsigned trasaction
     */
    unsignedTransaction.r = Buffer.from(hexSequenceNormalizer(rSignatureComponent), HEX_HASH_TYPE);
    unsignedTransaction.s = Buffer.from(hexSequenceNormalizer(sSignatureComponent), HEX_HASH_TYPE);
    unsignedTransaction.v = Buffer.from(hexSequenceNormalizer(
      bigNumber(recoveryParameter).toString(16),
    ), HEX_HASH_TYPE);
    return hexSequenceNormalizer(
      unsignedTransaction.serialize().toString(HEX_HASH_TYPE),
    );
  } catch (caughtError) {
    /*
     * If the user cancels signing the transaction we still throw,
     * but we customize the message.
     */
    if (caughtError.message === STD_ERRORS.CANCEL_TX_SIGN) {
      throw new Error(messages.userSignTxCancel);
    }
    /*
     * But throw otherwise, so we can see what's going on
     */
    throw new Error(
      `${messages.userSignTxGenericError}: ${objectToErrorString(
        modifiedPayloadObject,
      )} ${caughtError.message}`,
    );
  }
};

/**
 * Sign a message and return the signature. Useful for verifying addresses.
 * (In conjunction with `verifyMessage`)
 *
 * @method signMessage
 *
 * @param {string} derivationPath the derivation path for the account with which to sign the message
 * @param {string} message the message you want to sign
 * @param {string} messageData the message data you want to sign
 *
 * All the above params are sent in as props of an object.
 *
 * @return {Promise<string>} The signed message `hex` string (wrapped inside a `Promise`)
 */
export const signMessage = async (obj: {
  derivationPath,
  message,
  messageData,
}): Promise<string | void> => {
  if (obj === null || typeof obj !== 'object'){
    throw new Error(messages.signMessageArgumentMissing);
  }
  const { derivationPath, message, messageData } = obj;
  /*
   * Validate input values: derivationPath and message
   */
  derivationPathValidator(derivationPath);
  const toSign = messageOrDataValidator({ message, messageData });
  warning(messages.messageSignatureOnlyTrezor);
  try {
    const { signature: signedMessage = '' } = await payloadListener({
      payload: Object.assign({}, PAYLOAD_SIGNMSG, {
        /*
         * Path needs to be sent in as an derivation path array
         *
         * We also normalize it first (but for some reason Flow doesn't pick up
         * the default value value of `path` and assumes it's undefined -- it can be,
         * but it will not pass the validator)
         */
        path: fromString(
          derivationPathNormalizer(derivationPath),
          true,
        ).toPathArray(),
        // $FlowFixMe need Buffer types
        message: Buffer.from(toSign).toString(HEX_HASH_TYPE),
      }),
    });
    /*
     * Add the hex `0x` prefix
     */
    return hexSequenceNormalizer(signedMessage);
  } catch (caughtError) {
    /*
     * If the user cancels signing the message we still throw,
     * but we customize the message
     */
    if (caughtError.message === STD_ERRORS.CANCEL_TX_SIGN) {
      throw new Error(messages.userSignTxCancel);
    }
    /*
     * But throw otherwise, so we can see what's going on
     */
    throw new Error(
      `${messages.userSignTxGenericError}: message: (${message}) ${
        caughtError.message
      }`,
    );
  }
};

/**
 * Verify a signed message. Useful for verifying addresses. (In conjunction with `signMessage`)
 *
 * @method verifyMessage
 *
 * @param {string} address The address that verified the original message (without the hex `0x` identifier)
 * @param {string} message The message to verify if it was signed correctly
 * @param {string} signature The message signature as a `hex` string (you usually get this via `signMessage`)
 *
 * All the above params are sent in as props of an {MessageObjectType} object.
 *
 * @return {Promise<boolean>} A boolean to indicate if the message/signature pair are valid (wrapped inside a `Promise`)
 */
export const verifyMessage = async (obj : {
  address : string,
  message : string,
  signature: string
}): Promise<boolean> => {
  const {address} = obj;
  /*
   * Validate the address locally
   */
  addressValidator(address);

  const signatureMessage = { message: obj.message, signature: obj.signature };
  /*
   * Validate the rest of the pros using the core helper
   */
  const { message, signature } = messageVerificationObjectValidator(
    signatureMessage,
  );
  warning(messages.messageSignatureOnlyTrezor);
  try {
    const { success: isMessageValid } = await payloadListener({
      payload: Object.assign({}, PAYLOAD_VERIFYMSG, {
        /*
         * Trezor service requires the prefix from the address to be stripped
         */
        address: addressNormalizer(address, false),
        message,
        /*
         * Trezor service requires the prefix from the signature to be stripped
         */
        signature: hexSequenceNormalizer(signature, false),
      }),
    });
    return isMessageValid;
  } catch (caughtError) {
    warning(
      `${
        messages.messageSignatureInvalid
      }: message (${message}), signature (${signature})`,
    );
    return false;
  }
};
