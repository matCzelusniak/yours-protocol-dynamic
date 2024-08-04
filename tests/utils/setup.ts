import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { GenericContainer, StartedTestContainer, Network, StartedNetwork, Wait } from 'testcontainers';
import { config } from 'dotenv';
import { createClient } from 'postchain-client';

config();

export async function setupTestEnvironment() {
  // Start a new network for containers
  const network = await new Network().start();

  // Start a PostgreSQL container
  const postgres = await new PostgreSqlContainer("postgres:14.9-alpine3.18")
    .withNetwork(network)
    .withExposedPorts(5432)
    .withDatabase("postchain")
    .withPassword("postchain")
    .withUsername("postchain")
    .withNetworkAliases("postgres")
    .withWaitStrategy(Wait.forLogMessage("PostgreSQL init process complete"))
    .withStartupTimeout(60000)
    .start();

  // Start a Chromia node container
  const container = await new GenericContainer(process.env.CLI_IMAGE!)
    .withNetwork(network)
    .withCopyDirectoriesToContainer([{ source: process.cwd(), target: "/usr/app" }])
    .withExposedPorts(7740)
    .withEnvironment({
      CHR_DB_URL: "jdbc:postgresql://postgres/postchain",
    })
    .withCommand(["chr", "node", "start", "--directory-chain-mock"])
    .withWaitStrategy(Wait.forLogMessage("Node is initialized"))
    .withStartupTimeout(60000)
    .start();

  // Create a Postchain client for communication
  const dapp1Client = await createClient({
    blockchainIid: 1,
    nodeUrlPool: "http://localhost:" + container.getMappedPort(7740),
  });

  const dapp2Client = await createClient({
    blockchainIid: 2,
    nodeUrlPool: "http://localhost:" + container.getMappedPort(7740),
  });

  return {
    network,
    postgres,
    container,
    dapp1Client,
    dapp2Client,
  }
}

export async function teardownTestEnvironment(network: StartedNetwork, postgres: StartedPostgreSqlContainer, container: StartedTestContainer) {
  await container.stop();
  await postgres.stop();
  await network.stop();
}