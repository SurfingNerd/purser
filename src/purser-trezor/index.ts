/* @flow */

import { fromString } from 'bip32-path';

import {
  derivationPathSerializer,
  userInputValidator,
} from '@colony/purser-core/helpers';
import { warning, objectToErrorString } from '@colony/purser-core/utils';

import { PATH, CHAIN_IDS } from '@colony/purser-core/defaults';
import type { WalletArgumentsType } from '@colony/purser-core/flowtypes';

import TrezorWallet from './class';
import { payloadListener } from './helpers';

import { staticMethods as messages } from './messages';
import { STD_ERRORS } from './defaults';
import { PAYLOAD_XPUB } from './payloads';

/**
 * Open a new wallet from the public key and chain code, which are received
 * form the Trezor service after interacting (confirming) with the hardware
 * in real life.
 *
 * @method open
 *
 * @param {number} addressCount the number of extra addresses to generate from the derivation path
 * @param {number} chainId The id of the network to use, defaults to mainnet (1)
 *
 * The above param is sent in as a prop of an {WalletArgumentsType} object.
 *
 * @return {WalletType} The wallet object resulted by instantiating the class
 * (Object is wrapped in a promise).
 *
 */
export const open = async (
  argumentObject: WalletArgumentsType = {},
): Promise<TrezorWallet | void> => {
  /*
   * Validate the trasaction's object input
   */
  userInputValidator({
    firstArgument: argumentObject,
  });
  const { addressCount, chainId = CHAIN_IDS.HOMESTEAD } = argumentObject;
  /*
   * @TODO Reduce code repetition
   * By moving this inside a helper. This same patter will be used on the
   * ledger wallet as well.
   *
   * If we're on a testnet set the coin type id to `1`
   * This will be used in the derivation path
   */
  const coinType: number =
    chainId === CHAIN_IDS.HOMESTEAD ? PATH.COIN_MAINNET : PATH.COIN_TESTNET;
  /*
   * Get to root derivation path based on the coin type.
   *
   * Based on this, we will then derive all the needed address indexes
   * (inside the class constructor)
   */
  const rootDerivationPath: string = derivationPathSerializer({
    change: PATH.CHANGE,
    coinType,
  });
  /*
   * Modify the default payload to overwrite the path with the new
   * coin type id derivation
   */
  const modifiedPayloadObject: Object = Object.assign({}, PAYLOAD_XPUB, {
    path: fromString(rootDerivationPath, true).toPathArray(),
  });
  /*
   * We need to catch the cancelled error since it's part of a normal user workflow
   */
  try {
    /*
     * Get the harware wallet's public key and chain code, to use for deriving
     * the rest of the accounts
     */
    const { publicKey, chainCode } = await payloadListener({
      payload: modifiedPayloadObject,
    });
    const walletInstance: TrezorWallet = new TrezorWallet({
      publicKey,
      chainCode,
      rootDerivationPath,
      addressCount,
      chainId,
    });
    return walletInstance;
  } catch (caughtError) {
    /*
     * Don't throw an error if the user cancelled
     */
    if (caughtError.message === STD_ERRORS.CANCEL_ACC_EXPORT) {
      return warning(messages.userExportCancel);
    }
    /*
     * But throw otherwise, so we can see what's going on
     */
    throw new Error(
      /*
       * @TODO Move message to general
       *
       * Right now this message string is added under the "static methods" category.
       * Since this is used in multiple places, there's a case to be made about
       * making it a "general" category message.
       */
      `${messages.userExportGenericError}: ${objectToErrorString(
        modifiedPayloadObject,
      )} ${caughtError.message}`,
    );
  }
};

const trezorWallet: Object = {
  open,
};

export default trezorWallet;
