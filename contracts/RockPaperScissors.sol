// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;
import "./Keccak256Utils.sol";
import "./ClaimWinnerUtils.sol";

/**
 * Jesus is the LORD!!!
 *
 * @title Contract Rock Paper Scissors Peer-to-Peer
 * @author Henry Thuler Serbillera
 * @notice Provably Fair Gameplay - On-Chain Verification - Timeout Mechanism
 */
contract RockPaperScissors {
    // Struct to group all game-related fields
    struct GameData {
        bytes32 hashOptionP1; // Hash of Player 1's option
        uint64 timeOut; // Timeout duration in seconds
        uint256 timeOutP1; // Player 1 timeout timestamp
        uint256 timeOutP2; // Player 2 timeout timestamp
        uint256 nLockTime; // Lock time for the game
        address player1; // Player 1's address
        address player2; // Player 2's address
        int8 optionP2; // Player 2's option
        int8 optionP1; // Player 1's option
        bytes keyGame; // Player 1's keyGame
    }

    // Instance of the struct
    GameData public gameData;
    // Keep the state of the last game until the end of the next
    GameData public lastGameRecord;

    // Immutable owner field
    address payable public immutable owner;

    uint256 public bid = 0.01 ether; // Minimum bid amount
    uint8 public commission = 1; // Commission percentage

    constructor() {
        owner = payable(msg.sender);

        gameData.hashOptionP1 = 0; //hash of Player 1's option
        gameData.timeOut = 60 * 20; // 20 min;
        gameData.timeOutP1 = 0;
        gameData.timeOutP2 = 0;
        gameData.nLockTime = 0;
        gameData.player1 = address(0);
        gameData.player2 = address(0);
        gameData.optionP2 = -1;
        gameData.optionP1 = -1;
        gameData.keyGame = new bytes(0);

        lastGameRecord = gameData;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "You do not have permission");
        _;
    }

    /**
     * New minimum bid value
     */
    function setBid(uint256 newBid) external onlyOwner {
        require(
            gameData.hashOptionP1 == 0,
            "You can not change the bid with a game in progress"
        );
        bid = newBid;
    }

    /**
     * New platform commission
     */
    function setComission(uint8 newComission) external onlyOwner {
        require(
            gameData.hashOptionP1 == 0,
            "You can not change the comission with a game in progress"
        );
        commission = newComission;
    }

    /**
     * After the game ends, the reset function must be called
     * The state of the last game is recorded in lastGameRecord
     */
    function resetGameFields() private {
        lastGameRecord = gameData;

        gameData.hashOptionP1 = 0;
        gameData.player1 = address(0);
        gameData.player2 = address(0);
        gameData.optionP2 = -1;
        gameData.optionP1 = -1;
        gameData.keyGame = new bytes(0);

        bid = 0.01 ether;
    }

    /**
     * Match Start;
     *
     * hashOptionP1In informed by player 1 must be the keccak256 hash of the concatenation
     * of a 32-byte key and a value: 0 -> Rock, 1 -> Paper, 2 -> Scissors.
     *
     * If OptionP1 is negative, the result will automatically lead to player 2's victory
     * when the game result is revealed.
     *
     * Player 1 must be attentive to the game's timing to avoid running out of time
     * to respond before the result is claimed by player 2.
     *
     */
    function playerInit(bytes32 hashOptionP1In) public payable {
        require(msg.value >= bid, "Invalid Bid");
        require(gameData.hashOptionP1 == 0, "Player 1 already chose");

        bid = msg.value; // Minimum bid is set to the amount sent by player 1

        gameData.hashOptionP1 = hashOptionP1In;
        gameData.player1 = msg.sender;

        gameData.nLockTime = block.timestamp;
        gameData.timeOutP1 = gameData.nLockTime + gameData.timeOut;
        gameData.timeOutP2 = gameData.timeOutP1;
    }

    /**
     * Player 1 can cancel the game at any time, as long as the challenge has not been accepted;
     *
     * Once accepted, the game can no longer be canceled;
     *
     * In the case of a game not yet accepted, player 1 must be attentive to the game's timing
     * to avoid running out of time to respond before the result is claimed by player 2.
     *
     */
    function quitGame() public {
        require(
            gameData.optionP2 == -1,
            "Can't quit game after other player acceptance"
        );
        require(
            msg.sender == gameData.player1,
            "Only player 1 can quit the game"
        );

        address contractAddress = address(this);
        payable(gameData.player1).transfer(
            (contractAddress.balance * (100 - commission)) / 100
        );

        // The rest of the balance goes to the contract owner;
        owner.transfer(contractAddress.balance);
        resetGameFields();
    }

    /**
     * Any user can accept the challenge during Player 1's waiting time
     *
     * The bet amount matched by Player 2 will be the same amount offered by Player 1
     *
     */
    function acceptGame(int8 optionP2In) public payable {
        require(gameData.optionP2 == -1, "Game Already Accepted");
        require(optionP2In > -1, "Your option must be 0, 1, or 2");
        require(optionP2In < 3, "Your option must be 0, 1, or 2");
        require(msg.value == bid, "Invalid amount");

        // Zero confirms do not exist in ETH, so block.timestamp > gameData.nLockTime
        require(
            block.timestamp > gameData.nLockTime,
            "TX locktime can't be lower than base locktime"
        );
        require(
            block.timestamp <= gameData.timeOutP1,
            "Can't accept after timeout"
        );

        owner.transfer((address(this).balance / 100) * commission); // Payment of the commission to the contract owner

        gameData.player2 = msg.sender;
        gameData.timeOutP2 = block.timestamp + (2 * gameData.timeOut);
        gameData.optionP2 = optionP2In;
    }

    /**
     * This method presents the result of the challenge after Player 2 has accepted the game
     * Only Player 1 can call this method;
     *
     * optionP1In must be greater than or equal to zero and less than 3, representing the choices of Rock, Paper, or Scissors.
     *
     */
    function resultGame(bytes memory keygame, int8 optionP1In) public payable {
        require(
            msg.sender == gameData.player1,
            "You cannot ask for a game result"
        );
        require(
            gameData.optionP2 > -1,
            "Can't verify result before player 2 acceptance"
        );

        gameData.keyGame = keygame;
        gameData.optionP1 = optionP1In;

        if (
            (keccak256(Keccak256Utils.appendByteToBytes(keygame, optionP1In)) !=
                gameData.hashOptionP1) || (optionP1In < 0 || optionP1In > 2)
        ) {
            payable(gameData.player2).transfer(address(this).balance);
        } else if (
            (ClaimWinnerUtils.claimWinner(optionP1In, gameData.optionP2) == 1)
        ) {
            payable(gameData.player1).transfer(address(this).balance);
        } else if (
            ClaimWinnerUtils.claimWinner(optionP1In, gameData.optionP2) == 2
        ) {
            payable(gameData.player2).transfer(address(this).balance);
        } else {
            // In the case of a draw, the bet amount is returned to both players
            payable(gameData.player1).transfer(address(this).balance / 2);
            payable(gameData.player2).transfer(address(this).balance);
        }

        resetGameFields();
    }

    /*
     * If Player 1 does not respond until Player 2's timeout, this method can be triggered
     *
     */
    function claimGame() public {
        require(gameData.optionP2 > -1, "Only accepted game can be claimed");
        require(
            block.timestamp > gameData.timeOutP2,
            "Game can only be claimed after Player 2 timeout"
        );
        payable(gameData.player2).transfer(address(this).balance);
        resetGameFields();
    }

    /**
     * If player 1 does not quite game after 48h of timeout,
     * the contract owner can cancel the game and receive 10% from bid.
     */
    function cancelGame() external onlyOwner {
        require(
            block.timestamp > gameData.timeOutP1 + (3600 * 48),
            "Can't cancel game before 48h after player 1 timeout"
        );
        require(
            gameData.optionP2 == -1,
            "Can't cancel game after other player acceptance"
        );

        address contractAddress = address(this);
        payable(owner).transfer(contractAddress.balance / 10);

        // The rest of the balance goes to player 1;
        payable(gameData.player1).transfer(contractAddress.balance);
        resetGameFields();
    }
}
