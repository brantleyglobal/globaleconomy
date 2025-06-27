require("@nomiclabs/hardhat-ethers");

module.exports = {
  networks: {
    myChain: {
      url: "https://localhost",
      chainId: 1234,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
  solidity: "0.8.20",
};
