// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract DAOToken is ERC20, ERC20Permit, ERC20Votes, Ownable {

    /// @notice Total number of tokens in circulation
    uint public capacity = 10000;
    address public minter = address(0);

    function decimals() public pure override returns (uint8) {
		  return 0;
	  }

    modifier onlyMinter() {
        require(msg.sender == minter, "the sender is not the minter");
        _;
    }

    constructor() ERC20("PIC DAO token", "PICT") ERC20Permit("DAOToken") {
    }

    function _afterTokenTransfer(address from, address to, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._afterTokenTransfer(from, to, amount);
    }

    function _burn(address account, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._burn(account, amount);
    }
    
    function _mint(address to, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._mint(to, amount);
    }

    function mint(address to, uint256 amount) public onlyMinter{
      if(totalSupply() + amount <= capacity){
        _mint(to, amount);
      }
      //else no mint
    }

    function adminMint(address to, uint256 amount) public onlyOwner{
      if(totalSupply() + amount <= capacity){
        _mint(to, amount);
      }
      //else no mint
    }

    function setCapacity(uint256 _newcapacity) public onlyOwner{
      require(_newcapacity > totalSupply(), "invalid capacity");
      capacity = _newcapacity;
    }

    function setMinter(address _minter) public onlyOwner{
      minter = _minter;
    }
}