import { Session, transactionBuilder } from "@chromia/ft4";
import { noopAuthenticator, op } from "@chromia/ft4";
import { TokenMetadata } from "./types";
import { IClient } from "postchain-client";

export async function performCrossChainTransfer(
  fromSession: Session,
  toChain: IClient,
  toAccountId: Buffer,
  tokenId: number,
  amount: number,
  metadata: TokenMetadata
): Promise<void> {
  return new Promise<void>(async (resolve, reject) => {
    try {
      await fromSession.transactionBuilder()
        .add(op(
          "yours.init_transfer",
          toAccountId,
          metadata.yours.project,
          metadata.yours.collection,
          tokenId,
          amount,
          metadata
        ), {
          onAnchoredHandler: async (data: any) => {
            if (!data) throw new Error("No data provided");
            const iccfProofOperation = await data.createProof(toChain.config.blockchainRid);
            await transactionBuilder(noopAuthenticator, toChain)
              .add(iccfProofOperation, {
                authenticator: noopAuthenticator,
              })
              .add(op(
                "yours.apply_transfer",
                data.tx,
                data.opIndex
              ), {
                authenticator: noopAuthenticator,
              })
              .buildAndSend();
            resolve();
          }
        })
        .buildAndSendWithAnchoring();
    } catch (error) {
      reject(error);
    }
  });
}
