# 🏗 Global Economy

<h4 align="center">
  <a href="https://brantley-global.com/whitepaper">Documentation</a> |
  <a href="https://brantley-global.com">Website</a>
</h4>

An open-source, up-to-date toolkit for building decentralized applications (dapps) on the Global-Dominion blockchain. It's designed to make it easier for developers to create and deploy smart contracts and build user interfaces that interact with those contracts.

Built using NextJS, RainbowKit, Foundry/Hardhat, Wagmi, Viem, and Typescript.

- **Contract Hot Reload**: Frontend auto-adapts to your smart contract as you edit it.interactions with smart contracts with typescript autocompletion.
- **Burner Wallet & Local Faucet**: Quickly test your application with a burner wallet and local faucet.
- **Integration with Wallet Providers**: Connect to different wallet providers and interact with the Global-Dominion network.

## Requirements

Install the following tools:

- [Node (>= v20.18.3)](https://nodejs.org/en/download/)
- Yarn ([v1](https://classic.yarnpkg.com/en/docs/install/) or [v2+](https://yarnpkg.com/getting-started/install))
- [Git](https://git-scm.com/downloads)

## Quickstart

To get started with Global Economy, follow the steps below:

1. Install the latest version of Global Economy

```
navigate to packages/nextjs  && run
yarn install

navigate to packages/hardhat  && run
yarn install
```

This command will install all the necessary packages and dependencies, so it might take a while.

2. Run a local network in the first terminal:

```
yarn chain
```

This command starts a local Global-Dominion network that runs on your local machine and can be used for testing and development. Learn how to [customize your network configuration](https://docs.globalDEX.io/quick-start/environment#1-initialize-a-local-blockchain).

3. On a second terminal, deploy the test contract:

```
yarn deploy
```

This command deploys a test smart contract to the local network. Be sure hardhat config is configured correctly for local depployment. You can find more information about how to customize your contract and deployment script in [documentation](https://docs.globalDEX.io/quick-start/environment#2-deploy-your-smart-contract).

4. On a third terminal, start your NextJS app:

```
yarn start
```

Visit your app on: `http://localhost:3000`. You can interact with your smart contract using the `Debug Contracts` page. You can tweak the app config in `packages/nextjs/scaffold.config.ts`.

**What's next**:

Visit the [What's next section of our docs](https://docs.globalDEX.io/quick-start/environment#whats-next) to learn how to:

- Edit your smart contracts
- Edit your deployment scripts
- Customize your frontend
- Edit the app config
- Writing and running tests
- [Setting up external services and API keys](https://docs.globalDEX.io/deploying/deploy-smart-contracts#configuration-of-third-party-services-for-production-grade-apps)

## Documentation

To know more about products and platform, check out our [website](https://brantley-global.com).

## Hardhat

****remove .openzepplin directory to avoid address conflict during redeployments &&& run
npx hardhat clean

npx hardhat compile
npx hardhat run scripts/deploy.ts --network GLOBALCHAIN

## Nextjs

yarn build 

*****Cloudflare deploy only*****
npx wrangler pages deploy ./out --project-name globaleco

## Git

git remote set-url origin https://github.com/brantleyglobal/globaleconomy.git
git add .
git commit -m "Polished"
git push -u origin main
git branch ""

## Test

curl -X POST http://rpc.brantley-global.com:8545 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "method":"eth_blockNumber",
    "params":[],
    "id":1
  }'

## CF DB

npx wrangler d1 create global-db ***For future DBs

****local
npx wrangler d1 execute global-db --file=schema.sql
****deploy to Cloudflare
npx wrangler d1 execute global-db --file=schema.sql --remote

## CF WORK

wrangler deploy --env production

wrangler init my-worker

