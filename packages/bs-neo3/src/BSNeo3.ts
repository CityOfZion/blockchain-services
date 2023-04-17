import {
  BlockchainDataService,
  BlockchainService,
  CalculateTransferFeeDetails,
  SendTransactionParam,
  Claimable,
  Account,
  Exchange,
  BDSClaimable,
  exchangeOptions,
  Token,
  IntentTransactionParam,
} from "@cityofzion/blockchain-service";
import { api, rpc, tx, u, wallet } from "@cityofzion/neon-js";
import * as AsteroidSDK from "@moonlight-io/asteroid-sdk-js";
import { gasInfoNeo3, neoInfoNeo3 } from "./constants";
import { claimGasExceptions } from "./excpetions";
import { explorerOptions } from "./explorer";
import tokens from "./assets/tokens.json";

const NEO_NS_HASH = "0x50ac1c37690cc2cfc594472833cf57505d5f46de";

export class BSNeo3<BSCustomName extends string = string>
  implements BlockchainService, Claimable
{
  blockchainName: BSCustomName;
  dataService: BlockchainDataService & BDSClaimable = explorerOptions.dora;
  derivationPath: string = "m/44'/888'/0'/0/?";
  feeToken: { hash: string; symbol: string; decimals: number } = gasInfoNeo3;
  exchange: Exchange = exchangeOptions.flamingo;
  tokenClaim: { hash: string; symbol: string; decimals: number } = neoInfoNeo3;
  tokens: Token[] = tokens;

  private keychain = new AsteroidSDK.Keychain();

  constructor(blockchainName: BSCustomName) {
    this.blockchainName = blockchainName;
  }

  async sendTransaction(param: SendTransactionParam): Promise<string> {
    try {
      const { senderAccount, transactionIntents } = param;
      const node = await this.dataService.getHigherNode();
      const facade = await api.NetworkFacade.fromConfig({ node: node.url });
      const intents = this.buildTransfer(transactionIntents, senderAccount);
      const signing = this.signTransfer(senderAccount);
      const result = await facade.transferToken(intents, signing);
      return result;
    } catch (error) {
      throw error;
    }
  }

  private buildTransfer(
    transactionIntents: IntentTransactionParam[],
    account: Account
  ) {
    const intents: api.Nep17TransferIntent[] = [];
    const neoAccount = new wallet.Account(account.getWif());
    for (const transactionIntent of transactionIntents) {
      const { amount, receiverAddress, tokenHash } = transactionIntent;
      intents.push({
        to: receiverAddress,
        contractHash: tokenHash,
        from: neoAccount,
        decimalAmt: amount,
      });
    }
    return intents;
  }

  private signTransfer(account: Account) {
    const neoAccount = new wallet.Account(account.getWif());
    const result: api.signingConfig = {
      signingCallback: api.signWithAccount(neoAccount),
    };
    return result;
  }

  generateMnemonic(): string {
    this.keychain.generateMnemonic(128);
    const list = this.keychain.mnemonic?.toString();
    if (!list) throw new Error("Failed to generate mnemonic");
    return list;
  }

  generateWif(mnemonic: string, index: number): string {
    this.keychain.importMnemonic(mnemonic);
    const childKey = this.keychain.generateChildKey(
      "neo",
      this.derivationPath.replace("?", index.toString())
    );
    return childKey.getWIF();
  }

  generateAccount(
    mnemonic: string,
    index: number
  ): { wif: string; address: string } {
    const wif = this.generateWif(mnemonic, index);
    const { address } = new wallet.Account(wif);
    return { address, wif };
  }

  generateAccountFromWif(wif: string): string {
    const { address } = new wallet.Account(wif);
    return address;
  }

  async decryptKey(
    encryptedKey: string,
    password: string
  ): Promise<{ wif: string; address: string }> {
    const wif = await wallet.decrypt(encryptedKey, password);
    const { address } = new wallet.Account(wif);
    return { address, wif };
  }

  validateAddress(address: string): boolean {
    return wallet.isAddress(address);
  }

  validateEncryptedKey(encryptedKey: string): boolean {
    return wallet.isNEP2(encryptedKey);
  }

  validateWif(wif: string): boolean {
    return wallet.isWIF(wif);
  }

  async calculateTransferFee(param: SendTransactionParam): Promise<{
    result: number;
    details?: CalculateTransferFeeDetails | undefined;
  }> {
    const node = await this.dataService.getHigherNode();
    const url = node.url;
    const rpcClient = new rpc.NeoServerRpcClient(url);
    const intents = this.buildTransfer(
      param.transactionIntents,
      param.senderAccount
    );
    const txBuilder = new api.TransactionBuilder();
    for (const intent of intents) {
      if (intent.decimalAmt) {
        const [tokenInfo] = await api.getTokenInfos(
          [intent.contractHash],
          rpcClient
        );
        const amt = u.BigInteger.fromDecimal(
          intent.decimalAmt,
          tokenInfo.decimals
        );
        txBuilder.addNep17Transfer(
          intent.from,
          intent.to,
          intent.contractHash,
          amt
        );
      }
    }
    const txn = txBuilder.build();
    const accountScriptHash = wallet.getScriptHashFromAddress(
      param.senderAccount.getAddress()
    );
    const invokeFunctionResponse = await rpcClient.invokeScript(
      u.HexString.fromHex(txn.script),
      [
        {
          account: accountScriptHash,
          scopes: String(tx.WitnessScope.CalledByEntry),
        },
      ]
    );
    const systemFee = u.BigInteger.fromNumber(
      invokeFunctionResponse.gasconsumed
    ).toDecimal(gasInfoNeo3.decimals);

    const networkFeeResponse = await rpcClient.calculateNetworkFee(txn);

    const networkFee = Number(networkFeeResponse) / 10 ** gasInfoNeo3.decimals;

    const sumFee = Number(systemFee) + networkFee;

    const result: { result: number; details?: CalculateTransferFeeDetails } = {
      result: sumFee,
      details: {
        networkFee: networkFee.toString(),
        systemFee,
      },
    };
    return result;
  }

  //Claimable interface implementation
  async claim(
    account: Account
  ): Promise<{ txid: string; symbol: string; hash: string }> {
    const balance = await this.dataService.getBalance(account.getAddress());
    const neoHash = neoInfoNeo3.hash;
    const neoBalance = balance.find((balance) => balance.hash === neoHash);
    const gasBalance = balance.find(
      (balance) => balance.hash === gasInfoNeo3.hash
    );
    const neoAccount = new wallet.Account(account.getWif());

    if (!neoBalance || !gasBalance) throw new Error(`Problem to claim`);

    const dataToClaim: SendTransactionParam = {
      transactionIntents: [
        {
          amount: neoBalance.amount,
          receiverAddress: account.getAddress(),
          tokenHash: neoBalance.hash,
        },
      ],
      senderAccount: account,
    };

    const feeToClaim = await this.calculateTransferFee(dataToClaim);

    if (gasBalance.amount < feeToClaim.result) {
      claimGasExceptions.InsuficientGas(
        String(gasBalance.amount),
        String(feeToClaim.result)
      );
    }
    const url = (await this.dataService.getHigherNode()).url;
    const facade = await api.NetworkFacade.fromConfig({ node: url });
    const signing = this.signTransfer(account);
    const txid = await facade.claimGas(neoAccount, signing);
    const result: { txid: string; symbol: string; hash: string } = {
      hash: gasInfoNeo3.hash,
      symbol: gasInfoNeo3.symbol,
      txid,
    };
    return result;
  }

  /*
    1 - IPV4 address record
    5 - Canonical name record
    16 - Text record
    28 - IPV6 address record
  */
  // Gets the record of a second-level domain or its subdomains with the specific type.
  async getNeoNsRecord(
    domainName: string,
    type: "1" | "5" | "16" | "28"
  ): Promise<any> {
    const url = (await this.dataService.getHigherNode()).url;
    const rpcClient = new rpc.NeoServerRpcClient(url);
    return rpcClient.invokeFunction(NEO_NS_HASH, "getRecord", [
      {
        type: "String",
        value: domainName,
      },
      {
        type: "Integer",
        value: type,
      },
    ]);
  }

  // Gets the domain owner. If the domain has expired, an error message is returned instead of the owner.
  async getOwnerOfNeoNsRecord(domainName: string): Promise<any> {
    const url = (await this.dataService.getHigherNode()).url;
    const rpcClient = new rpc.NeoServerRpcClient(url);
    return rpcClient.invokeFunction(NEO_NS_HASH, "ownerOf", [
      {
        type: "ByteArray",
        value: domainName,
      },
    ]);
  }
}
