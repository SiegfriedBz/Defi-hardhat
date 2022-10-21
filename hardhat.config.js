require("@nomiclabs/hardhat-waffle")
require("hardhat-gas-reporter")
require("@nomiclabs/hardhat-etherscan")
require("dotenv").config()
require("solidity-coverage")
require("hardhat-deploy")

const MAIN_NET_RPC_URL = process.env.MAIN_NET_RPC_URL || "http://eth-mainnet"
const GOERLI_RPC_URL = process.env.GOERLI_RPC_URL || "http://goerli"
const PRIV_KEY = process.env.PRIV_KEY || "key"

module.exports = {
  solidity: {
    compilers: [
      { version: "0.4.19" },
      { version: "0.6.12" },
      { version: "0.6.6" },
      { version: "0.8.17" },
    ],
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 31337,
      // yarn hardhat will run the forked simulated main net by default
      forking: {
        url: MAIN_NET_RPC_URL,
      },
    },
    goerli: {
      chainId: 5,
      url: GOERLI_RPC_URL,
      accounts: [PRIV_KEY],
      blockConfirmations: 6,
    },
  },
  namedAccounts: {
    deployer: {
      default: 0,
      0: 0,
      5: 0,
    },
    user01: {
      default: 1,
      0: 0,
      5: 1,
    },
  },
}
