//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import "../../registry/EVMNS.sol";
import "../../evmregistrar/IBaseRegistrar.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {BytesUtils} from "../BytesUtils.sol";

contract TestUnwrap is Ownable {
    using BytesUtils for bytes;

    bytes32 private constant ETH_NODE =
        0x508b635792ccd7149e70e60de9be8731ce05ec4242c91d20e497968774e30bd1;

    EVMNS public immutable ens;
    IBaseRegistrar public immutable registrar;
    mapping(address => bool) public approvedWrapper;

    constructor(EVMNS _evmns, IBaseRegistrar _registrar) {
        ens = _evmns;
        registrar = _registrar;
    }

    function setWrapperApproval(
        address wrapper,
        bool approved
    ) public onlyOwner {
        approvedWrapper[wrapper] = approved;
    }

    function wrapETH2LD(
        string calldata label,
        address wrappedOwner,
        uint32 fuses,
        uint64 expiry,
        address resolver
    ) public {
        _unwrapETH2LD(keccak256(bytes(label)), wrappedOwner, msg.sender);
    }

    function setSubnodeRecord(
        bytes32 parentNode,
        string memory label,
        address newOwner,
        address resolver,
        uint64 ttl,
        uint32 fuses,
        uint64 expiry
    ) public {
        bytes32 node = _makeNode(parentNode, keccak256(bytes(label)));
        _unwrapSubnode(node, newOwner, msg.sender);
    }

    function wrapFromUpgrade(
        bytes calldata name,
        address wrappedOwner,
        uint32 fuses,
        uint64 expiry,
        address approved,
        bytes calldata extraData
    ) public {
        (bytes32 labelhash, uint256 offset) = name.readLabel(0);
        bytes32 parentNode = name.namehash(offset);
        bytes32 node = _makeNode(parentNode, labelhash);

        if (parentNode == ETH_NODE) {
            _unwrapETH2LD(labelhash, wrappedOwner, msg.sender);
        } else {
            _unwrapSubnode(node, wrappedOwner, msg.sender);
        }
    }

    function _unwrapETH2LD(
        bytes32 labelhash,
        address wrappedOwner,
        address sender
    ) private {
        uint256 tokenId = uint256(labelhash);
        address registrant = registrar.ownerOf(tokenId);

        require(
            approvedWrapper[sender] &&
                sender == registrant &&
                registrar.isApprovedForAll(registrant, address(this)),
            "Unauthorised"
        );

        registrar.reclaim(tokenId, wrappedOwner);
        registrar.transferFrom(registrant, wrappedOwner, tokenId);
    }

    function _unwrapSubnode(
        bytes32 node,
        address newOwner,
        address sender
    ) private {
        address owner = ens.owner(node);

        require(
            approvedWrapper[sender] &&
                owner == sender &&
                ens.isApprovedForAll(owner, address(this)),
            "Unauthorised"
        );

        ens.setOwner(node, newOwner);
    }

    function _makeNode(
        bytes32 node,
        bytes32 labelhash
    ) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(node, labelhash));
    }
}
