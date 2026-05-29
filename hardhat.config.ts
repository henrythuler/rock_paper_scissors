import type { HardhatUserConfig } from "hardhat/config";

import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { configVariable } from "hardhat/config";
//import {hardhatVer};     // <-- new plugin

import "@nomicfoundation/hardhat-verify";     // <-- new plugin

import dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
  plugins: [hardhatToolboxMochaEthersPlugin],
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 }, // choose ON or OFF and keep it
      evmVersion: "cancun",                    // you’re already compiling to cancun
      viaIR: false,                            // keep consistent (true/false) for both steps
      // metadata: { bytecodeHash: "ipfs" }     // leave default unless you *also* used it at deploy
    },
  },
  networks: {
    hardhat: {
      allowBlocksWithSameTimestamp: true,
      type: "edr-simulated",
      chainType: "l1",
      blockGasLimit: 1099511627775n,
    },
   
    local:{
      type: "http",
      chainType: "l1",
      url: "http://127.0.0.1:8545/",
      chainId: 31337,
      accounts:{
        mnemonic: "test test test test test test test test test test test junk"
      }
    },
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
      allowBlocksWithSameTimestamp: true,
      blockGasLimit: 1099511627775n, // or as a number if you prefer
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
      allowBlocksWithSameTimestamp: true,
      blockGasLimit: 1099511627775n, // or as a number if you prefer
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    }
  },
};

export default config;