import GenericWallet from '../purser-core/genericWallet';
import { userInputValidator } from '../purser-core/helpers';
import { DESCRIPTORS, REQUIRED_PROPS } from '../purser-core/defaults';
import {TYPE_HARDWARE, SUBTYPE_LEDGER, SignMessageData, MessageVerificationObjectType} from '../purser-core/types';
import {
  GenericClassArgumentsType,
  TransactionObjectType,
} from '../purser-core/types';

import { signTransaction, signMessage, verifyMessage } from './staticMethods';

const { WALLET_PROPS } = DESCRIPTORS;

export default class LedgerWallet extends GenericWallet {
  constructor(propObject: GenericClassArgumentsType) {
    super(propObject);
    Object.defineProperties(this, {
      /*
       * Set the actual type and subtype (overwrite the generic ones)
       */
      type: Object.assign({}, { value: TYPE_HARDWARE }, WALLET_PROPS),
      subtype: Object.assign({}, { value: SUBTYPE_LEDGER }, WALLET_PROPS),
      sign: Object.assign(
        {},
        {
          value: async (transactionObject: TransactionObjectType) => {
            /*
             * Validate the trasaction's object input
             */
            userInputValidator({
              firstArgument: transactionObject,
            });
            const { chainId = this.chainId } = transactionObject || {};
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
              publicKey: await this.publicKey,
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
