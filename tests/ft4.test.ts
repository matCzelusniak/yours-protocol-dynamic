import { IClient, encryption } from "postchain-client";
import { createAccount } from "./utils/ft4";
import { setupTestEnvironment, teardownTestEnvironment } from "./utils/setup";
import { TIMEOUT_SETUP } from "./utils/constants";
import { StartedNetwork, StartedTestContainer } from "testcontainers";
import { StartedPostgreSqlContainer } from "@testcontainers/postgresql";

describe('FT4', () => {
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

  it('able to register an account to dapp1', async () => {
    const keyPair = encryption.makeKeyPair();
    const session = await createAccount(dapp1Client, keyPair);
    expect(session).toBeDefined();
    expect(session.account).toBeDefined();
  });

  it('able to register an account to dapp2', async () => {
    const keyPair = encryption.makeKeyPair();
    const session = await createAccount(dapp2Client, keyPair);
    expect(session).toBeDefined();
    expect(session.account).toBeDefined();
  });
});