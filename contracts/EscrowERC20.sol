// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract EscrowERC20 is Ownable, Pausable {

    event GameStarted(address indexed _player1, address indexed _player2, uint indexed _totalAmount);
    event GameEnded(
        address indexed _player1, 
        address indexed _player2, 
        address indexed _winner, 
        uint _totalAmount
        );

    IERC20 public shake;

    mapping(address => mapping(address => uint)) public bets;

    constructor(address _token) {
        shake = IERC20(_token);
    }

    function startGame(
        address _player1, 
        address _player2, 
        uint _amount
        ) external onlyOwner whenNotPaused {
        require(_player1 != address(0) && _player2 != address(0), "Player can't be the 0 address");
        require(_amount != 0, "the amount can't be 0");
        require(bets[_player1][_player2] == 0 && bets[_player2][_player1] == 0, "You can't place another bet");


        // Stores how much tokens did the players bet;
        bets[_player1][_player2] = _amount * 2;
        bets[_player2][_player1] = _amount * 2;

        // They will first need to approve this contract through front end
        require(
            shake.transferFrom(_player1, address(this), _amount),
            "ESCROW: Transfer didn't go through"
        );

        require(
            shake.transferFrom(_player2, address(this), _amount),
            "ESCROW: Transfer didn't go through"
        );
        emit GameStarted(_player1, _player2, _amount * 2);
    }


    function payOutWinner(
        address _player1, 
        address _player2, 
        address _winner
        ) external onlyOwner whenNotPaused 
    {   
        // This will ensure that the winnings will be payed out just once in case there is some bug.
        require(bets[_player1][_player2] == bets[_player2][_player1]);
        require(bets[_player1][_player2] != 0, "You don't have any bets");


        uint winnings = bets[_player1][_player2];

        bets[_player1][_player2] = 0;
        bets[_player2][_player1] = 0;

        require(
            shake.transfer(_winner, winnings),
            "ESCROW: Transfer didn't go through"        
        );
        emit GameEnded(_player1, _player2, _winner, winnings);
    }

    function _pause() internal override {
        super._pause();
    }

    function _unpause() internal override {
        super._unpause();
    }

    function pauseContract() external onlyOwner {
        _pause();
    }

    function unPauseContract() external onlyOwner {
        _unpause();
    }

}