const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EscrowERC20", function () {

  let owner;
  let player1;
  let player2;
  let esc;
  let Escrow;
  let MockToken;
  let token;
  const address0 = '0x0000000000000000000000000000000000000000';

  before(async function () {
    [owner, player1, player2, ...addrs] = await ethers.getSigners();
    
    MockToken = await ethers.getContractFactory("MockToken");
    token = await MockToken.connect(owner).deploy();
    await token.deployed();

    await token.connect(owner).transfer(player1.address, ethers.utils.parseEther("10000"));
    await token.connect(owner).transfer(player2.address, ethers.utils.parseEther("10000"));

    Escrow = await ethers.getContractFactory("EscrowERC20");
    esc = await Escrow.deploy(token.address);
    await esc.deployed();

  });


  describe("EscrowERC20 Tests", function () {


    it("Should start a game and take tokens from players", async function () {

      const amount = await token.totalSupply();
      // Approve Escrow to take players tokens
      await token.connect(player1).approve(esc.address, amount);
      await token.connect(player2).approve(esc.address, amount);

      // Place the bet from the owner account
      await expect(esc.connect(owner).startGame(
        player1.address,
        player2.address,
        ethers.utils.parseEther("100")))
      .to.emit(esc, "GameStarted")
      .withArgs(player1.address, player2.address, ethers.utils.parseEther("200"));
      
      expect(await esc.bets(player1.address, player2.address)).to.be.eq(ethers.utils.parseEther("200"));
      // Ensure the mapping works both ways
      expect(await esc.bets(player2.address, player1.address)).to.be.eq(ethers.utils.parseEther("200"));

      // Testing require statemets

      // Testing onlyOwner
      await expect(esc.connect(player1).startGame(
        player1.address,
        player2.address,
        ethers.utils.parseEther("100")
      )).to.be.reverted;

      // Testing if the players can have only 1 bet
      await expect(esc.connect(owner).startGame(
        player1.address,
        player2.address,
        ethers.utils.parseEther("100")))
      .to.be.revertedWith("You can't place another bet");

      await expect(esc.connect(owner).startGame(
        address0,
        player2.address,
        ethers.utils.parseEther("100")))
      .to.be.revertedWith("Player can't be the 0 address");
    });

    it("Should end the game and withdraw the winnings", async function () {

      await expect(esc.connect(owner).payOutWinner(
        player1.address,
        player2.address,
        player1.address
      )).to.emit(esc, "GameEnded")
      .withArgs(
        player1.address, 
        player2.address, 
        player1.address, 
        ethers.utils.parseEther("200")
      );

      expect(await token.balanceOf(player1.address)).to.be.eq(ethers.utils.parseEther("10100"));
      expect(await token.balanceOf(player2.address)).to.be.eq(ethers.utils.parseEther("9900"));

      expect(await esc.bets(player1.address, player2.address)).to.be.eq(0);
      expect(await esc.bets(player2.address, player1.address)).to.be.eq(0);
    });

    it("Should test if the pausable plugin works", async function () {

      await esc.connect(owner).pauseContract();

      await expect(esc.connect(owner).startGame(
        player1.address,
        player2.address,
        ethers.utils.parseEther("100")))
      .to.be.revertedWith("Pausable: paused");

      await expect(esc.connect(owner).pauseContract()).to.be.revertedWith("Pausable: paused");

      // Testing only Owner
      await expect (esc.connect(player1).unPauseContract()).to.be.reverted;

      await esc.connect(owner).unPauseContract();

      await expect(esc.connect(owner).startGame(
        player1.address,
        player2.address,
        ethers.utils.parseEther("100")));

    });
  });
});
