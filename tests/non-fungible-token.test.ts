import { IClient, encryption } from "postchain-client";
import { createAccount } from "./utils/ft4";
import { setupTestEnvironment, teardownTestEnvironment } from "./utils/setup";
import { TEST_PROJECT, TIMEOUT_SETUP, TIMEOUT_TEST } from "./utils/constants";
import { StartedNetwork, StartedTestContainer } from "testcontainers";
import { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { op } from "@chromia/ft4";
import { TokenMetadata } from "./utils/types";
import { serializeTokenMetadata } from "./utils/metadata";
import { expect } from "@jest/globals"; // Added this line to import expect from Jest
import { randomCollectionName } from "./utils/random";

describe('Token', () => {
  let network: StartedNetwork;
  let postgres: StartedPostgreSqlContainer;
  let container: StartedTestContainer;
  let dapp1Client: IClient;
  let dapp2Client: IClient;

  beforeAll(async () => {
    const {
      dapp1Client: dapp1,
      dapp2Client: dapp2,
      network: n,
      postgres: p,
      container: c
    } = await setupTestEnvironment();
    dapp1Client = dapp1;
    dapp2Client = dapp2;
    network = n;
    postgres = p;
    container = c;
  }, TIMEOUT_SETUP);

  afterAll(async () => {
    await teardownTestEnvironment(network, postgres, container);
  });

  it('able to create a Non-Fungible Token', async () => {
    const keyPair = encryption.makeKeyPair();
    const session = await createAccount(dapp1Client, keyPair);

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

    await session.transactionBuilder()
      .add(op("importer.nft", serializeTokenMetadata(tokenMetadata), tokenId))
      .buildAndSend();

    const balance = await session.query<number>(
      "yours.balance", 
      { 
        account_id: session.account.id, 
        project: TEST_PROJECT, 
        collection, 
        token_id: tokenId 
      }
    );
    expect(balance).toBe(1);
  }, TIMEOUT_TEST);

  it('NFT has correct metadata', async () => {
    const keyPair = encryption.makeKeyPair();
    const session = await createAccount(dapp1Client, keyPair);

    const collection = randomCollectionName();
    const tokenId = 1;

    const tokenMetadata: TokenMetadata = {
      name: `Avatar #${tokenId}`,
      attributes: [{ trait_type: "Background", value: "Blue" }],
      yours: {
        modules: [],
        project: TEST_PROJECT,
        collection,
      },
      description: "Avatar Description",
      image: "Avatar Image",
      animation_url: "Avatar Animation"
    };

    await session.transactionBuilder()
      .add(op("importer.nft", serializeTokenMetadata(tokenMetadata), tokenId))
      .buildAndSend();

    const metadata = await session.query<TokenMetadata>("yours.metadata", { project: TEST_PROJECT, collection, token_id: tokenId });
    expect(metadata.name).toBe(tokenMetadata.name);
    expect(metadata.attributes[0].trait_type).toEqual(tokenMetadata.attributes[0].trait_type);
    expect(metadata.attributes[0].value).toEqual(tokenMetadata.attributes[0].value);
    expect(metadata.yours.modules).toBeDefined();
    expect(metadata.yours.project).toEqual(tokenMetadata.yours.project);
    expect(metadata.yours.collection).toEqual(tokenMetadata.yours.collection);
    expect(metadata.description).toBe(tokenMetadata.description);
    expect(metadata.image).toBe(tokenMetadata.image);
    expect(metadata.animation_url).toBe(tokenMetadata.animation_url);
  }, TIMEOUT_TEST);
});