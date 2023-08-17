//SPDX-License-Identifier: MIT
pragma solidity ~0.8.17;

import "./IPriceOracle.sol";

interface IEVMRegistrarController {
    function rentPrice(string memory, uint256) external view returns (uint256);

    function available(string memory) external returns (bool);

    function makeCommitment(
        string memory,
        address,
        uint256,
        bytes32,
        address,
        bytes[] calldata,
        bool,
        uint16
    ) external pure returns (bytes32);

    function commit(bytes32) external;

    function register(
        string calldata,
        address,
        uint256,
        bytes32,
        address,
        bytes[] calldata,
        bool,
        uint16
    ) external payable;
}
