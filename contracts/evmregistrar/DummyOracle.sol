//SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

contract DummyOracle {
    int256 value;
    address public owner;

    constructor(int256 _value, address _owner) {
        owner = (_owner == address(0)) ? msg.sender : _owner;
        set(_value);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function!");
        _;
    }

    function setOwner(address _owner) public onlyOwner {
        owner = _owner;
    }

    function getOwner() public view returns (address) {
        return owner;
    }

    function set(int256 _value) public onlyOwner {
        value = _value;
    }

    function latestAnswer() public view returns (int256) {
        return value;
    }
}
