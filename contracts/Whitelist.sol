// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Whitelist {
    address public owner;
    mapping(address => bool) private whitelisted;

    event AddressAdded(address indexed addedAddress);
    event AddressRemoved(address indexed removedAddress);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    function addAddress(address _addr) external onlyOwner {
        require(!whitelisted[_addr], "Address is already whitelisted");
        whitelisted[_addr] = true;
        emit AddressAdded(_addr);
    }

    function removeAddress(address _addr) external onlyOwner {
        require(whitelisted[_addr], "Address is not whitelisted");
        whitelisted[_addr] = false;
        emit AddressRemoved(_addr);
    }

    function isWhitelisted(address _addr) external view returns (bool) {
        return whitelisted[_addr];
    }
}
