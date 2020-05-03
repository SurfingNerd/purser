import GenericWallet from '../purser-core/genericWallet';
import { userInputValidator } from '../purser-core/helpers';
import { warning } from '../purser-core/utils';
import { DESCRIPTORS, REQUIRED_PROPS } from '../purser-core/defaults';
import {
  TYPE_HARDWARE,
  SUBTYPE_TREZOR,
  TransactionObjectTypeWithTo,
  SignMessageData,
  MessageVerificationObjectType
} from '../purser-core/types';

import type {
  TransactionObjectType,
  GenericClassArgumentsType,
} from '../purser-core/types';

import { signTransaction, signMessage, verifyMessage } from './staticMethods';

import { classInstance as messages } from './messages';
import { REQUIRED_PROPS as REQUIRED_TREZOR_PROPS } from './defaults';

const { WALLET_PROPS } = DESCRIPTORS;

export default class TrezorWallet extends GenericWallet {
  constructor(propObject: GenericClassArgumentsType) {
    super(propObject);
    Object.defineProperties(this, {
      /*
       * Set the actual type and subtype (overwrite the generic ones)
       */
      type: Object.assign({}, { value: TYPE_HARDWARE }, WALLET_PROPS),
      subtype: Object.assign({}, { value: SUBTYPE_TREZOR }, WALLET_PROPS),
      sign: Object.assign(
        {},
        {
          value: async (transactionObject: TransactionObjectTypeWithTo) => {
            let requiredSignProps: Array<String> =
              REQUIRED_TREZOR_PROPS.SIGN_TRANSACTION;
            const { chainId = this.chainId, to } = transactionObject || {};
            /*
             * If we don't have a destination address, it means the user wants
             * to deploy a contract.
             *
             * For this the Trezor service requires a `inputData` value set.
             *
             * Otherwise, a `to` address *must* be set.
             */
            if (!to) {
              requiredSignProps =
                REQUIRED_TREZOR_PROPS.SIGN_TRANSACTION_CONTRACT;
              /*
               * Warn the user (in dev mode, at least) about Trezor's contract
               * deployment requirements
               */
              warning(messages.signContractDeployment);
            }
            /*
             * Validate the trasaction's object input
             */
            userInputValidator({
              firstArgument: transactionObject,
              requiredAll: requiredSignProps,
            });
            return signTransaction(
              Object.assign({}, transactionObject, {
                derivationPath: await this.derivationPath,
                chainId,
              }),
            );
          },
        },
        WALLET_PROPS,
      ),
      signMessage: Object.assign(
        {},
        {
          value: async (messageObject: SignMessageData) => {
            /*
             * Validate the trasaction's object input
             */
            userInputValidator({
              firstArgument: messageObject,
              requiredOr: REQUIRED_PROPS.SIGN_MESSAGE,
            });
            return signMessage({
              derivationPath: await this.derivationPath,
              message: messageObject.message,
              messageData: messageObject.messageData,
            });
          },
        },
        WALLET_PROPS,
      ),
      verifyMessage: Object.assign(
        {},
        {
          value: async (signatureVerificationObject: MessageVerificationObjectType) => {
            /*
             * Validate the trasaction's object input
             */
            userInputValidator({
              firstArgument: signatureVerificationObject,
              requiredAll: REQUIRED_PROPS.VERIFY_MESSAGE,
            });
            const { message, signature } = signatureVerificationObject;
            return verifyMessage({
              address: this.address,
              message,
              signature,
            });
          },
        },
        WALLET_PROPS,
      ),
    });
  }
}