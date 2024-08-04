import { getTestEnvironment, teardown, TestEnvironment } from "./utils/setup";
import { TEST_PROJECT, TIMEOUT_SETUP, TIMEOUT_TEST } from "./utils/constants";
import { createAccount } from "./utils/ft4";
import { serializeTokenMetadata } from "./utils/metadata";
import { randomCollectionName } from "./utils/random";
import { TokenMetadata } from "./utils/types";
import { encryption } from "postchain-client";
import { performCrossChainTransfer } from "./utils/crosschain";
import { op } from "@chromia/ft4";

describe('Crosschain', () => {
  let environment: TestEnvironment;

  beforeAll(async () => {
    environment = await getTestEnvironment();
  }, TIMEOUT_SETUP);

  afterAll(async () => {
    await teardown();
  }, TIMEOUT_SETUP);

  it('able to create a Non-Fungible Token', async () => {
    const keyPair = encryption.makeKeyPair();
    const dapp1Session = await createAccount(environment.dapp1Client, keyPair);
    const dapp2Session = await createAccount(environment.dapp2Client, keyPair);

    const collection = randomCollectionName();
    const tokenId = 0;

    const tokenMetadata: TokenMetadata = {
      name: `Avatar #${tokenId}`,
      attributes: [{ trait_type: "Background", value: "Blue" }],
      yours: {
        modules: [],
        project: TEST_PROJECT,
        collection,
      },
      description: "A Test Description",
      image: "A Test Image",
      animation_url: "A Test Animation"
    };

    await dapp1Session.transactionBuilder()
      .add(op("importer.nft", serializeTokenMetadata(tokenMetadata), tokenId))
      .buildAndSend();

    const metadata = await dapp1Session.query<TokenMetadata>("yours.metadata", { project: TEST_PROJECT, collection, token_id: tokenId });
    await performCrossChainTransfer(
      dapp1Session,
      dapp2Session.client,
      dapp2Session.account.id,
      tokenId,
      1,
      metadata
    );

    const dapp1Balance = await dapp1Session.query<number>(
      "yours.balance",
      {
        account_id: dapp1Session.account.id,
        project: TEST_PROJECT,
        collection,
        token_id: tokenId
      }
    );
    expect(dapp1Balance).toBe(0);

    const dapp2Balance = await dapp2Session.query<number>(
      "yours.balance",
      {
        account_id: dapp2Session.account.id,
        project: TEST_PROJECT,
        collection,
        token_id: tokenId
      }
    );
    expect(dapp2Balance).toBe(1);
  }, TIMEOUT_TEST);
});