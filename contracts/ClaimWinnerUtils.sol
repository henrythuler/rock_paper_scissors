// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title Utils for Claiming the Winner of Rock Paper Scissors
 * @author Henry Thuler Serbillera
 * @notice Developed for the P2P Rock Paper Scissors game
 */
library ClaimWinnerUtils {
    /**
     *
     * Verifies the result of the game based on optionP1In and optionP2, and determines the winner accordingly.
     *
     */
    function claimWinner(
        int8 optionP1In,
        int8 optionP2In
    ) internal pure returns (int8 winner) {
        if ((optionP1In - optionP2In + 3) % 3 == 0) {
            return 0; // Draw
        } else if ((optionP1In - optionP2In + 3) % 3 == 1) {
            return 1; // Player 1 wins
        } else {
            return 2; // Player 2 wins
        }
    }
}
