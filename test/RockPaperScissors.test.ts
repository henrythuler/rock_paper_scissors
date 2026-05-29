import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

type GameData = {
  hashOptionP1: string; // Hash of Player 1's option
  timeOut: string;      // Timeout duration in seconds (uint64)
  timeOutP1: string;    // Player 1 timeout timestamp (uint256)
  timeOutP2: string;    // Player 2 timeout timestamp (uint256)
  nLockTime: string;    // Lock time for the game (uint256)
  player1: string;      // Player 1's address (address)
  player2: string;      // Player 2's address (address)
  optionP2: number;     // Player 2's option (int8)
  optionP1: number;     // Player 1's option (int8)
  keyGame: string;      // Player 1's keygame
};

function fetchGameData(rawGameData: any) {
  
  const gameData: GameData = {
    hashOptionP1: rawGameData[0],
    timeOut: rawGameData[1],
    timeOutP1: rawGameData[2],
    timeOutP2: rawGameData[3],
    nLockTime: rawGameData[4],
    player1: rawGameData[5],
    player2: rawGameData[6],
    optionP2: Number(rawGameData[7]),
    optionP1: Number(rawGameData[8]),
    keyGame: rawGameData[9]
  };
  return gameData;
}

function hexStringToUint8Array(hexString: string): Uint8Array {
  // Ensure the hex string length is even
  if (hexString.length % 2 !== 0) {
      throw new Error("Hex string must have an even length");
  }

  // Convert the string into an array of bytes
  const byteArray = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < byteArray.length; i++) {
      const byte = hexString.substring(i * 2, i * 2 + 2);
      byteArray[i] = parseInt(byte, 16);
  }

  return byteArray;
}

let keySeed = hexStringToUint8Array ("abcddbe576b4818846aa77e82f4ed5fa78f92766b141f282d36703886d196df39322abcddbe576b4818846aa77e82f4ed5fa78f92766b141f282d36703886d196df39322")
let gameKey = ethers.keccak256(keySeed);

const DEFAULT_BID = ethers.parseEther("0.01");

describe("RockPaperScissors", function () {

  let rockPaperScissors: any;
  let owner: any;
  let player1: any;
  let player2: any;

  beforeEach(async () => {

    [owner, player1, player2] = await ethers.getSigners();

    rockPaperScissors = await ethers.deployContract("RockPaperScissors");
  
  });
  
  it("should have created", async function () {

    let gameData = fetchGameData(await rockPaperScissors.gameData());
    expect(gameData.optionP2).to.equal(-1);
  });

  it("should init game", async function () {
   
    let player1Instance = rockPaperScissors.connect(player1);
    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = 2;
    let optionP1str = optionP1In.toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str)));

    await player1Instance.playerInit(hashOptionP1In, {value: DEFAULT_BID,});

    let gameData = fetchGameData(await rockPaperScissors.gameData()); 
    expect(gameData.hashOptionP1).to.equal(hashOptionP1In);
  });

  it("should NOT init game (Invalid Bid)", async function () {

    const player1Instance = rockPaperScissors.connect(player1);

    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = 2;
    let optionP1str = optionP1In.toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str)));

    await expect(player1Instance.playerInit(hashOptionP1In, {value: DEFAULT_BID - 1n}))
    .to.be.revertedWith("Invalid Bid");
  });  
  
  it("should NOT init game (Player1 already chose)", async function () {

    const player1Instance = rockPaperScissors.connect(player1);

    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = 2;
    let optionP1str = optionP1In.toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str)));
  
    await player1Instance.playerInit(hashOptionP1In, {value: DEFAULT_BID});

    await expect(player1Instance.playerInit(hashOptionP1In, {value: DEFAULT_BID}))
    .to.be.revertedWith("Player 1 already chose");
  });

  it("should quit game", async function () {
    
    const player1Instance = rockPaperScissors.connect(player1);

    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = 2;
    let optionP1str = optionP1In.toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str)));

    await player1Instance.playerInit(hashOptionP1In, {value: DEFAULT_BID});

    let balanceP1before = await ethers.provider.getBalance(player1.address);
    let balanceOwnerbefore = await ethers.provider.getBalance(owner.address);
    let balanceContractBefore = await ethers.provider.getBalance(rockPaperScissors);

    const tx = await player1Instance.quitGame();
    // Wait for the transaction to be mined
    const receipt = await tx.wait();
    // Retrieve gas used and gas price
    const gasUsed = receipt!.gasUsed; // BigNumber
    const gasPrice = tx.gasPrice; // BigNumber
    // Calculate the fee (gas used * gas price)
    const fee = gasUsed * gasPrice;

    let balanceP1after = await ethers.provider.getBalance(player1.address);
    let balanceOwnerafter = await ethers.provider.getBalance(owner.address);
    let balanceContractAfter = await ethers.provider.getBalance(rockPaperScissors);

    let gameData = fetchGameData(await rockPaperScissors.gameData());

    //Balance distrubution verification after quit game
    expect((balanceOwnerafter - balanceOwnerbefore) + (balanceP1after - balanceP1before + BigInt(fee))).to.equal(balanceContractBefore);
    expect(balanceContractBefore - (balanceOwnerafter - balanceOwnerbefore) - (balanceP1after - balanceP1before + BigInt(fee)) ).to.equal(balanceContractAfter);
    //Comission payment verification
    expect(balanceContractBefore - (balanceP1after - balanceP1before + BigInt(fee))).to.equal(balanceOwnerafter - balanceOwnerbefore);
    //Game reset verification
    expect(gameData.hashOptionP1).to.equal("0x0000000000000000000000000000000000000000000000000000000000000000");
  });

  it("should NOT quit game (Accepted)", async function () {
    
    const player1Instance = rockPaperScissors.connect(player1);
    const player2Instance = rockPaperScissors.connect(player2);

    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = 2;
    let optionP1str = optionP1In.toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str)));

    await player1Instance.playerInit(hashOptionP1In, {value: DEFAULT_BID});

    let gameData = fetchGameData(await rockPaperScissors.gameData());

    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.nLockTime) + 1]);
    await ethers.provider.send("evm_mine", []);

    await player2Instance.acceptGame(1, {value: DEFAULT_BID});

    await expect(player1Instance.quitGame())
    .to.be.revertedWith("Can't quit game after other player acceptance");
  });

  it("should NOT quit game (Not Player 1)", async function () {
    
    const player1Instance = rockPaperScissors.connect(player1);
    const player2Instance = rockPaperScissors.connect(player2);

    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = 2;
    let optionP1str = optionP1In.toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str)));

    await player1Instance.playerInit(hashOptionP1In, {value: DEFAULT_BID});

    await expect(player2Instance.quitGame())
    .to.be.revertedWith("Only player 1 can quit the game");
  });

  it("should accept game", async function () {
    
    const player1Instance = rockPaperScissors.connect(player1);
    const player2Instance = rockPaperScissors.connect(player2);

    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = 2;
    let optionP1str = optionP1In.toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str))); 
 
    await player1Instance.playerInit(hashOptionP1In, {value: DEFAULT_BID});

    let gameData = fetchGameData(await rockPaperScissors.gameData());

    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.nLockTime) + 1]);
    await ethers.provider.send("evm_mine", []);

    let balanceOwnerbefore = await ethers.provider.getBalance(owner.address);
    let balanceContractBefore = await ethers.provider.getBalance(rockPaperScissors);

    await player2Instance.acceptGame(1, {value: DEFAULT_BID});

    let balanceOwnerafter = await ethers.provider.getBalance(owner.address);
    let balanceContractAfter = await ethers.provider.getBalance(rockPaperScissors);

    gameData = fetchGameData(await rockPaperScissors.gameData());
   
    //Comission payment verification
    expect((balanceOwnerafter - balanceOwnerbefore) + balanceContractAfter).to.equal( 2n * balanceContractBefore);
    //Game accepted state verification
    expect(gameData.optionP2).to.equal(1);
  });

  it("should NOT accept game (Already Accepted)", async function () {

    const player1Instance = rockPaperScissors.connect(player1);
    const player2Instance = rockPaperScissors.connect(player2);

    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = 2;
    let optionP1str = optionP1In.toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str)));

    await player1Instance.playerInit(hashOptionP1In, {value: DEFAULT_BID});

    let gameData = fetchGameData(await rockPaperScissors.gameData());

    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.nLockTime) + 2]);
    await ethers.provider.send("evm_mine", []);

    await player2Instance.acceptGame(1, {value: DEFAULT_BID});

    const player3Instance = rockPaperScissors.connect(owner);

    gameData = fetchGameData(await rockPaperScissors.gameData());

    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.nLockTime) + 5]);
    await ethers.provider.send("evm_mine", []);

    await expect(player3Instance.acceptGame(0, {value: DEFAULT_BID}))
    .to.be.revertedWith("Game Already Accepted");
  });

  it("should NOT accept game (Negative Option)", async function () {
    
    const player1Instance = rockPaperScissors.connect(player1);
    const player2Instance = rockPaperScissors.connect(player2);

    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = 2;
    let optionP1str = optionP1In.toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str)));

    await player1Instance.playerInit(hashOptionP1In, {value: DEFAULT_BID});

    await expect(player2Instance.acceptGame(-1, {value: DEFAULT_BID}))
    .to.be.revertedWith("Your option must be 0, 1, or 2");
  });

  it("should NOT accept game (Option Out of Range)", async function () {
    
    const player1Instance = rockPaperScissors.connect(player1);
    const player2Instance = rockPaperScissors.connect(player2);

    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = 2;
    let optionP1str = optionP1In.toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str)));

    await player1Instance.playerInit(hashOptionP1In, {value: DEFAULT_BID});

    await expect(player2Instance.acceptGame(3, {value: DEFAULT_BID}))
    .to.be.revertedWith("Your option must be 0, 1, or 2");
  });

  it("should NOT accept game (Invalid Amount)", async function () {
    
    const player1Instance = rockPaperScissors.connect(player1);
    const player2Instance = rockPaperScissors.connect(player2);

    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = 2;
    let optionP1str = optionP1In.toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str)));

    await player1Instance.playerInit(hashOptionP1In, {value: DEFAULT_BID});

    await expect(player2Instance.acceptGame(1, {value: DEFAULT_BID + 1n}))
    .to.be.revertedWith("Invalid amount");
  });

  it("should NOT accept game (Timestap == Nlocktime)", async function () {

    const player1Instance = rockPaperScissors.connect(player1);
    const player2Instance = rockPaperScissors.connect(player2);
    
    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = 2;
    let optionP1str = optionP1In.toString(16);
    
    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str)));
    await player1Instance.playerInit(hashOptionP1In, {value: DEFAULT_BID});

    let gameData = fetchGameData(await rockPaperScissors.gameData());

    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.nLockTime)]);
    await ethers.provider.send("evm_mine", []);

    await expect(player2Instance.acceptGame(1, {value: DEFAULT_BID}))
    .to.be.revertedWith("TX locktime can't be lower than base locktime");
  });

  it("should NOT accept game (Timeout Player 1)", async function () {
  
    const player1Instance = rockPaperScissors.connect(player1);
    const player2Instance = rockPaperScissors.connect(player2);

    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = 2;
    let optionP1str = optionP1In.toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str)));

    const latestBlock = await ethers.provider.getBlock("latest");
    const latestTimestamp = latestBlock!.timestamp;

    if(latestBlock){
      await ethers.provider.send("evm_setNextBlockTimestamp", [latestTimestamp + 2]);
      await ethers.provider.send("evm_mine", []);
    }
      
    await player1Instance.playerInit(hashOptionP1In, {value: DEFAULT_BID});

    let gameData = fetchGameData(await rockPaperScissors.gameData());

    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.nLockTime) + Number(gameData.timeOut) + 1]);
    await ethers.provider.send("evm_mine", []);

    await expect(player2Instance.acceptGame(1, {value: DEFAULT_BID}))
    .to.be.revertedWith("Can't accept after timeout");
  });

  it("should NOT result game (Not player 1)", async function () {
    
    const player1Instance = rockPaperScissors.connect(player1);
    const player2Instance = rockPaperScissors.connect(player2);

    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = 2;
    let optionP1str = optionP1In.toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str)));
    
    await player1Instance.playerInit(hashOptionP1In, {value: DEFAULT_BID});

    let gameData = fetchGameData(await rockPaperScissors.gameData());

    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.nLockTime) + 1]);
    await ethers.provider.send("evm_mine", []);

    player2Instance.acceptGame(1, {value: DEFAULT_BID})
    
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.nLockTime) + 1]);
    await ethers.provider.send("evm_mine", []);

    await expect(player2Instance.resultGame(hexStringToUint8Array(keygame), optionP1In))
    .to.revertedWith("You cannot ask for a game result");
  });

  it("should NOT result game (Not Accepted)", async function () {
    
    const player1Instance = rockPaperScissors.connect(player1);

    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = 2;
    let optionP1str = optionP1In.toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str)));
    
    await player1Instance.playerInit(hashOptionP1In, {value: DEFAULT_BID});

    let gameData = fetchGameData(await rockPaperScissors.gameData());

    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.nLockTime) + 1]);
    await ethers.provider.send("evm_mine", []);

    await expect(player1Instance.resultGame(hexStringToUint8Array(keygame), optionP1In))
    .to.revertedWith("Can't verify result before player 2 acceptance");
  });

  it("should give victory to Player 1 (Rock > Scissors)", async function () {
    
    const player1Instance = rockPaperScissors.connect(player1);
    const player2Instance = rockPaperScissors.connect(player2);

    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = 0;
    let optionP1str = optionP1In.toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str)));

    await player1Instance.playerInit(hashOptionP1In, {value: DEFAULT_BID});

    let gameData = fetchGameData(await rockPaperScissors.gameData());

    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.nLockTime) + 1]);
    await ethers.provider.send("evm_mine", []);

    await player2Instance.acceptGame(2, {value: DEFAULT_BID});

    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.nLockTime) + 1]);
    await ethers.provider.send("evm_mine", []);

    let balanceP1before = await ethers.provider.getBalance(player1.address);
    let balanceP2before = await ethers.provider.getBalance(player2.address);

    await player1Instance.resultGame(hexStringToUint8Array(keygame), optionP1In);

    let balanceP1after = await ethers.provider.getBalance(player1.address);
    let balanceP2after = await ethers.provider.getBalance(player2.address);

    let gameDataLast = fetchGameData(await rockPaperScissors.lastGameRecord());
  
    expect(balanceP1after > balanceP1before).to.equal(true);
    expect(balanceP2after == balanceP2before).to.equal(true);
    expect(gameDataLast.keyGame).to.equal(gameKey);
  });

  it("should give victory to Player 2 (Rock < Paper)", async function () {
    
    const player1Instance = rockPaperScissors.connect(player1);
    const player2Instance = rockPaperScissors.connect(player2);

    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = 0;
    let optionP1str = optionP1In.toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str)));

    await player1Instance.playerInit(hashOptionP1In, {value: DEFAULT_BID});

    let gameData = fetchGameData(await rockPaperScissors.gameData());

    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.nLockTime) + 1]);
    await ethers.provider.send("evm_mine", []);

    await player2Instance.acceptGame(1, {value: DEFAULT_BID});

    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.nLockTime) + 1]);
    await ethers.provider.send("evm_mine", []);

    let balanceP1before = await ethers.provider.getBalance(player1.address);
    let balanceP2before = await ethers.provider.getBalance(player2.address);

    await player1Instance.resultGame(hexStringToUint8Array(keygame), optionP1In);

    let balanceP1after = await ethers.provider.getBalance(player1.address);
    let balanceP2after = await ethers.provider.getBalance(player2.address);

    let gameDataLast = fetchGameData(await rockPaperScissors.lastGameRecord());

    expect(balanceP1after < balanceP1before).to.equal(true);
    expect(balanceP2after > balanceP2before).to.equal(true);
    expect(gameDataLast.keyGame).to.equal(gameKey);
  });

  it("should give victory to Player 1 (Scissors > Paper)", async function () {
    
    const player1Instance = rockPaperScissors.connect(player1);
    const player2Instance = rockPaperScissors.connect(player2);

    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = 2;
    let optionP1str = optionP1In.toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str)));

    await player1Instance.playerInit(hashOptionP1In, {value: DEFAULT_BID});

    let gameData = fetchGameData(await rockPaperScissors.gameData());

    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.nLockTime) + 1]);
    await ethers.provider.send("evm_mine", []);

    await player2Instance.acceptGame(1, {value: DEFAULT_BID});

    gameData = fetchGameData(await rockPaperScissors.gameData());

    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.nLockTime) + 1]);
    await ethers.provider.send("evm_mine", []);

    let balanceP1before = await ethers.provider.getBalance(player1.address);
    let balanceP2before = await ethers.provider.getBalance(player2.address);

    await player1Instance.resultGame(hexStringToUint8Array(keygame), optionP1In);

    let balanceP1after = await ethers.provider.getBalance(player1.address);
    let balanceP2after = await ethers.provider.getBalance(player2.address);
  
    let gameDataLast = fetchGameData(await rockPaperScissors.lastGameRecord());
  
    expect(balanceP1after > balanceP1before).to.equal(true);
    expect(balanceP2after == balanceP2before).to.equal(true);
    expect(gameDataLast.keyGame).to.equal(gameKey);
  });

  it("should give draw (Paper <> Paper)", async function () {
    
    const player1Instance = rockPaperScissors.connect(player1);
    const player2Instance = rockPaperScissors.connect(player2);

    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = 1;
    let optionP1str = optionP1In.toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str)));

    await player1Instance.playerInit(hashOptionP1In, {value: DEFAULT_BID});

    let gameData = fetchGameData(await rockPaperScissors.gameData());

    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.nLockTime) + 1]);
    await ethers.provider.send("evm_mine", []);

    await player2Instance.acceptGame(1, {value: DEFAULT_BID});

    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.nLockTime) + 1]);
    await ethers.provider.send("evm_mine", []);

    let balanceP1before = await ethers.provider.getBalance(player1.address);
    let balanceP2before = await ethers.provider.getBalance(player2.address);

    await player1Instance.resultGame(hexStringToUint8Array(keygame), optionP1In);

    let balanceP1after = await ethers.provider.getBalance(player1.address);
    let balanceP2after = await ethers.provider.getBalance(player2.address);

    let gameDataLast = fetchGameData(await rockPaperScissors.lastGameRecord());

    expect(balanceP1after > balanceP1before).to.equal(true);
    expect(balanceP2after > balanceP2before).to.equal(true);
    expect(gameDataLast.keyGame).to.equal(gameKey);
  });

  it("should give victory to Player 2 (wrong p1 keygame)", async function () {
  
    const player1Instance = rockPaperScissors.connect(player1);
    const player2Instance = rockPaperScissors.connect(player2);

    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = 2;
    let optionP1str = optionP1In.toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str)));

    await player1Instance.playerInit(hashOptionP1In, {value: DEFAULT_BID});

    let gameData = fetchGameData(await rockPaperScissors.gameData());

    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.nLockTime) + 1]);
    await ethers.provider.send("evm_mine", []);

    await player2Instance.acceptGame(1, {value: DEFAULT_BID});

    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.nLockTime) + 1]);
    await ethers.provider.send("evm_mine", []);

    let balanceP1before = await ethers.provider.getBalance(player1.address);
    let balanceP2before = await ethers.provider.getBalance(player2.address);

    await player1Instance.resultGame(hexStringToUint8Array(keygame.substring(0, keygame.length - 2) + "ab"), optionP1In);

    let balanceP1after = await ethers.provider.getBalance(player1.address);
    let balanceP2after = await ethers.provider.getBalance(player2.address);

    expect(balanceP1after < balanceP1before).to.equal(true);
    expect(balanceP2after > balanceP2before).to.equal(true);
  });

  it("should give victory to Player 2 (wrong p1 option)", async function () {
    
    const player1Instance = rockPaperScissors.connect(player1);
    const player2Instance = rockPaperScissors.connect(player2);

    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = 2;
    let optionP1str = optionP1In.toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str)));

    await player1Instance.playerInit(hashOptionP1In, {value: DEFAULT_BID});

    let gameData = fetchGameData(await rockPaperScissors.gameData());

    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.nLockTime) + 1]);
    await ethers.provider.send("evm_mine", []);

    await player2Instance.acceptGame(1, {value: DEFAULT_BID});

    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.nLockTime) + 1]);
    await ethers.provider.send("evm_mine", []);

    let balanceP1before = await ethers.provider.getBalance(player1.address);
    let balanceP2before = await ethers.provider.getBalance(player2.address);

    await player1Instance.resultGame(hexStringToUint8Array(keygame), optionP1In - 1);

    let balanceP1after = await ethers.provider.getBalance(player1.address);
    let balanceP2after = await ethers.provider.getBalance(player2.address);
  
    gameData = fetchGameData(await rockPaperScissors.gameData());

    let gameDataLast = fetchGameData(await rockPaperScissors.lastGameRecord());
  
    expect(balanceP1after < balanceP1before).to.equal(true);
    expect(balanceP2after > balanceP2before).to.equal(true);
    expect(gameDataLast.keyGame).to.equal(gameKey);
  });

  it("should give victory to Player 2 (negative p1 option)", async function () {

    const player1Instance = rockPaperScissors.connect(player1);
    const player2Instance = rockPaperScissors.connect(player2);

    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = -2;
    let optionP1str = optionP1In.toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str)));

    await player1Instance.playerInit(hashOptionP1In, {value: DEFAULT_BID});

    let gameData = fetchGameData(await rockPaperScissors.gameData());

    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.nLockTime) + 1]);
    await ethers.provider.send("evm_mine", []);

    await player2Instance.acceptGame(1, {value: DEFAULT_BID});

    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.nLockTime) + 1]);
    await ethers.provider.send("evm_mine", []);

    let balanceP1before = await ethers.provider.getBalance(player1.address);
    let balanceP2before = await ethers.provider.getBalance(player2.address);

    await player1Instance.resultGame(hexStringToUint8Array(keygame), optionP1In);

    let balanceP1after = await ethers.provider.getBalance(player1.address);
    let balanceP2after = await ethers.provider.getBalance(player2.address);

    let gameDataLast = fetchGameData(await rockPaperScissors.lastGameRecord());
  
    expect(balanceP1after <= balanceP1before).to.equal(true);
    expect(balanceP2after > balanceP2before).to.equal(true);
    expect(gameDataLast.keyGame).to.equal(gameKey);
  });

  it("should claim game", async function () {

    const player1Instance = rockPaperScissors.connect(player1);
    const player2Instance = rockPaperScissors.connect(player2);

    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = 2;
    let optionP1str = optionP1In.toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str)));

    await player1Instance.playerInit(hashOptionP1In, {value: DEFAULT_BID});

    let gameData = fetchGameData(await rockPaperScissors.gameData());

    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.nLockTime) + 1]);
    await ethers.provider.send("evm_mine", []);

    await player2Instance.acceptGame(1, {value: DEFAULT_BID});

    gameData = fetchGameData(await rockPaperScissors.gameData());

    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.timeOutP2) + 5]);
    await ethers.provider.send("evm_mine", []);

    let balanceP1before = await ethers.provider.getBalance(player1.address);
    let balanceP2before = await ethers.provider.getBalance(player2.address);

    await player2Instance.claimGame();

    let balanceP1after = await ethers.provider.getBalance(player1.address);
    let balanceP2after = await ethers.provider.getBalance(player2.address);

    let gameDataLast = fetchGameData(await rockPaperScissors.lastGameRecord());
  
    expect(balanceP1after == balanceP1before).to.equal(true);
    expect(balanceP2after > balanceP2before).to.equal(true);
    expect(gameDataLast.keyGame).to.equal("0x");
  });

  it("should NOT claim game (Not Accepted)", async function () {

    const player1Instance = rockPaperScissors.connect(player1);
    const player2Instance = rockPaperScissors.connect(player2);

    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = 2;
    let optionP1str = optionP1In.toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str)));
    
    await player1Instance.playerInit(hashOptionP1In, {value: DEFAULT_BID});

    let gameData = fetchGameData(await rockPaperScissors.gameData());

    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.nLockTime) + 1]);
    await ethers.provider.send("evm_mine", []);

    await expect(player2Instance.claimGame()).to.be.revertedWith("Only accepted game can be claimed");
  });

  it("should NOT claim game (Timeout P2)", async function () {
    
    const player1Instance = rockPaperScissors.connect(player1);
    const player2Instance = rockPaperScissors.connect(player2);

    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = 2;
    let optionP1str = optionP1In.toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str)));
    
    await player1Instance.playerInit(hashOptionP1In, {value: DEFAULT_BID});

    let gameData = fetchGameData(await rockPaperScissors.gameData());

    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.nLockTime) + 1]);
    await ethers.provider.send("evm_mine", []);

    await player2Instance.acceptGame(1, {value: DEFAULT_BID});

    gameData = fetchGameData(await rockPaperScissors.gameData());

    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.timeOutP2) - 10]);
    await ethers.provider.send("evm_mine", []);

    await expect(player2Instance.claimGame()).to.be.revertedWith("Game can only be claimed after Player 2 timeout");
  });

  it("should Init game again", async function () {
    
    const player1Instance = rockPaperScissors.connect(player1);
    const player2Instance = rockPaperScissors.connect(player2);

    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = 2;
    let optionP1str = optionP1In.toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str)));
    
    await player1Instance.playerInit(hashOptionP1In, {value: DEFAULT_BID});

    let gameData = fetchGameData(await rockPaperScissors.gameData());

    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.nLockTime) + 1]);
    await ethers.provider.send("evm_mine", []);

    await player2Instance.acceptGame(1, {value: DEFAULT_BID});

    gameData = fetchGameData(await rockPaperScissors.gameData());

    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.timeOutP2) + 1]);
    await ethers.provider.send("evm_mine", []);

    await player2Instance.claimGame();

    await player2Instance.playerInit(hashOptionP1In, {value: DEFAULT_BID});

    let gameDataLast = fetchGameData(await rockPaperScissors.lastGameRecord());

    expect(gameDataLast.hashOptionP1).to.equal(hashOptionP1In);
  });

    it("should cancel current game", async function () {
    
    const player1Instance = rockPaperScissors.connect(player1);
    const ownerInstance = rockPaperScissors.connect(owner);

    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = 2;
    let optionP1str = optionP1In.toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str)));
    
    let balanceP1before = await ethers.provider.getBalance(player1.address);

    await player1Instance.playerInit(hashOptionP1In, {value: DEFAULT_BID});

    let gameData = fetchGameData(await rockPaperScissors.gameData());

    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.nLockTime) + 1]);
    await ethers.provider.send("evm_mine", []);

    gameData = fetchGameData(await rockPaperScissors.gameData());

    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.timeOutP1) + 3600 * 50]);
    await ethers.provider.send("evm_mine", []);

    let balanceOwnerBefore = await ethers.provider.getBalance(owner.address);
    let balanceContractBefore = await ethers.provider.getBalance(rockPaperScissors);

    const tx = await ownerInstance.cancelGame();
    // Wait for the transaction to be mined
    const receipt = await tx.wait();
    // Retrieve gas used and gas price
    const gasUsed = receipt!.gasUsed; // BigNumber
    const gasPrice = tx.gasPrice; // BigNumber
    // Calculate the fee (gas used * gas price)
    const fee = gasUsed * gasPrice;

    let balanceP1after = await ethers.provider.getBalance(player1.address);
    let balanceOwnerAfter = await ethers.provider.getBalance(owner.address);

    gameData = fetchGameData(await rockPaperScissors.gameData());

    expect(balanceP1after < balanceP1before).to.equal(true);
    expect(balanceOwnerAfter).to.equal((balanceOwnerBefore + balanceContractBefore / 10n) - BigInt(fee));
    expect(gameData.hashOptionP1).to.equal("0x0000000000000000000000000000000000000000000000000000000000000000");
  });

  it("should not cancel current game (Timeout P1)", async function () {
    
    const player1Instance = rockPaperScissors.connect(player1);
    const ownerInstance = rockPaperScissors.connect(owner);

    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = 2;
    let optionP1str = optionP1In.toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str)));

    await player1Instance.playerInit(hashOptionP1In, {value: DEFAULT_BID});

    let gameData = fetchGameData(await rockPaperScissors.gameData());

    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.nLockTime) + 1]);
    await ethers.provider.send("evm_mine", []);

    gameData = fetchGameData(await rockPaperScissors.gameData());

    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.timeOutP1) + 3600 * 24]);
    await ethers.provider.send("evm_mine", []);

    await expect(ownerInstance.cancelGame()).to.be.revertedWith("Can't cancel game before 48h after player 1 timeout");
  });

  it("should not cancel current game (P2 accepted)", async function () {
    
    const player1Instance = rockPaperScissors.connect(player1);
    const player2Instance = rockPaperScissors.connect(player2);
    const ownerInstance = rockPaperScissors.connect(owner);

    let keygame: string = gameKey.substring(2, gameKey.length)
    let optionP1In: number = 2;
    let optionP1str = optionP1In.toString(16);

    while(optionP1str.length % 2 === 1 )
      optionP1str = "0" + optionP1str;

    let hashOptionP1In = (ethers.keccak256(hexStringToUint8Array(keygame + optionP1str)));

    await player1Instance.playerInit(hashOptionP1In, {value: DEFAULT_BID});

    let gameData = fetchGameData(await rockPaperScissors.gameData());

    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.nLockTime) + 1]);
    await ethers.provider.send("evm_mine", []);

    await player2Instance.acceptGame(1, {value: DEFAULT_BID});

    gameData = fetchGameData(await rockPaperScissors.gameData());

    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(gameData.timeOutP1) + 3600 * 49]);
    await ethers.provider.send("evm_mine", []);

    await expect(ownerInstance.cancelGame()).to.be.revertedWith("Can't cancel game after other player acceptance");
  });
});