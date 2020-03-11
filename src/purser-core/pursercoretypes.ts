

export type DerivationPathDefaultType = {
    HEADER_KEY: string,
    PURPOSE: number,
    COIN_MAINNET: number,
    COIN_TESTNET: number,
    ACCOUNT: number,
    CHANGE: number,
    INDEX: number,
    DELIMITER: string,
};

export type DerivationPathObjectType = {
    purpose?: number,
    coinType?: number,
    account?: number,
    change?: number,
    addressIndex?: number,
};

export type GenericClassArgumentsType = {
    publicKey: string,
    chainCode?: string,
    rootDerivationPath: string,
    addressCount?: number,
    chainId?: number,
};

export interface TransactionObjectType {
    chainId: number,
    gasPrice: string,
    gasLimit: string,
    nonce: number,
    value: string,
    inputData: string,
};


export interface TransactionObjectTypeWithTo extends TransactionObjectType {
    to: string | undefined
}

export interface TransactionObjectTypeWithAddresses extends TransactionObjectTypeWithTo {
    from: string | undefined
}




/*
export type WalletObjectType = {
    address: string,
    otherAddresses?: Array<string>,
    defaultGasLimit?: number,
    keystore?: Promise<string>,
    mnemonic?: string,
    path?: string,
    readonly derivationPath?: Promise<string>,
    privateKey?: string,
    readonly publicKey?: Promise<string>,
    sign: (...*) => Promise<TransactionObjectType>,
};
*/

export type WalletArgumentsType = {
    address?: string,
    /*
     * Used to select the address index from the hardware wallet
     */
    addressCount?: number,
    privateKey?: string,
    mnemonic?: string,
    originalMnemonic?: string,
    path?: string,
    keystore?: string,
    entropy?: Uint8Array,
    password?: string,
    chainId?: number,
    sign?: () => {},
    signMessage?: () => {},
};

export type MessageObjectType = {
    message: string,
};

export type MessageVerificationObjectType = {
    message: string,
    signature: string,
};

/*
 * Types used for modules exports
 */
export type LibraryExportType = {
    wallets: Object,
    about: {
        name: string,
        version: string,
        environment: string,
    },
    utils: Object,
    debug?: Object,
};
