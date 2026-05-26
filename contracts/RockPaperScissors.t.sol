// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {RockPaperScissors} from "./RockPaperScissors.sol";
import {Test} from "forge-std/Test.sol";

// Solidity tests are compatible with foundry, so they
// use the same syntax and offer the same functionality.

contract RockPaperScissorsTest is Test {
    RockPaperScissors rockPaperScissors;
}
