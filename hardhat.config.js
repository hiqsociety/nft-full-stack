require('@nomiclabs/hardhat-ethers')
require('@nomiclabs/hardhat-waffle');
require('hardhat-contract-sizer');
require('solidity-coverage');
require("dotenv").config();

const { GOERLI_RPC_URL, PRIVATE_KEY } = process.env;

const {rinkebyApiKey, PK, etherscanApiKey, mnemonic} = require('./secrets.json')


/** @type import('hardhat/config').HardhatUserConfig */
const RINKEBY_RPC_URL = `https://rinkeby.infura.io/v3/${rinkebyApiKey}`
module.exports = {
  solidity: {
    version: '0.8.17',
    settings: {
      optimizer: {
        enabled: true,
        runs: 5
      }
    }
  },
  networks: {
    rinkeby: {
      url: RINKEBY_RPC_URL,
      accounts: [`0x${PRIVATE_KEY}`],
      saveDeployments: true,
    },

    goerli: {
      url: GOERLI_RPC_URL,
      accounts: [`0x${PRIVATE_KEY}`],
      saveDeployments: true,
    },

    hardhat: {
      accounts: {
        mnemonic,
        path: "m/44'/60'/0'/0/",
        initialIndex: 0,
        count: 1800,
      }
  },
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts'
  },
  mocha: {
    timeout: 60000
  },
  etherscan: {
    apiKey: {
      rinkeby: etherscanApiKey,
      goerli: etherscanApiKey
    },
    customChains: [
      {
        network: "rinkeby",
        chainId: 4,
        urls: {
          apiURL: "https://api-rinkeby.etherscan.io/api",
          browserURL: "https://rinkeby.etherscan.io"
        }
      },
      {
        network: "goerli",
        chainId: 5,
        urls: {
          apiURL: "https://api-goerli.etherscan.io/api",
          browserURL: "https://goerli.etherscan.io"
        }
      }
    ]
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: true,
  }
};

//npx hardhat accounts
task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log({address: account.address, balance: account.balance});
  }
});

