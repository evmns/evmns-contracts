//SPDX-License-Identifier: MIT
pragma solidity ~0.8.17;

import {BaseRegistrarImplementation} from "./BaseRegistrarImplementation.sol";
import {StringUtils} from "./StringUtils.sol";
import {Resolver} from "../resolvers/Resolver.sol";
import {ENS} from "../registry/ENS.sol";
import {ReverseRegistrar} from "../reverseRegistrar/ReverseRegistrar.sol";
import {ReverseClaimer} from "../reverseRegistrar/ReverseClaimer.sol";
import {IEVMRegistrarController, IPriceOracle} from "./IEVMRegistrarController.sol";

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {INameWrapper} from "../wrapper/INameWrapper.sol";
import {ERC20Recoverable} from "../utils/ERC20Recoverable.sol";

error CommitmentTooNew(bytes32 commitment);
error CommitmentTooOld(bytes32 commitment);
error NameNotAvailable(string name);
error DurationTooShort(uint256 duration);
error ResolverRequiredWhenDataSupplied();
error UnexpiredCommitmentExists(bytes32 commitment);
error InsufficientValue();
error Unauthorised(bytes32 node);
error MaxCommitmentAgeTooLow();
error MaxCommitmentAgeTooHigh();

/**
 * @dev A registrar controller for registering and renewing names at fixed cost.
 */
contract ActivitiesRegistrarController is
    Ownable,
    IEVMRegistrarController,
    IERC165,
    ERC20Recoverable,
    ReverseClaimer
{
    using StringUtils for *;
    using Address for address;

    uint256 public constant MIN_REGISTRATION_DURATION = 28 days;
    bytes32 private constant ETH_NODE =
        0x508b635792ccd7149e70e60de9be8731ce05ec4242c91d20e497968774e30bd1;
    uint64 private constant MAX_EXPIRY = type(uint64).max;
    BaseRegistrarImplementation immutable base;
    IPriceOracle public immutable prices;
    uint256 public immutable minCommitmentAge;
    uint256 public immutable maxCommitmentAge;

    ReverseRegistrar public immutable reverseRegistrar;
    INameWrapper public immutable nameWrapper;

    mapping(bytes32 => uint256) public commitments;

    mapping(address => uint8) public whitelist;

    mapping(address => uint8) public discounts;

    mapping(address => uint8) public registers;

    mapping(string => address) public limites;

    event NameRegistered(
        string name,
        bytes32 indexed label,
        address indexed owner,
        uint256 baseCost,
        uint256 premium,
        uint256 expires
    );
    event NameRenewed(
        string name,
        bytes32 indexed label,
        uint256 cost,
        uint256 expires
    );

    constructor(
        BaseRegistrarImplementation _base,
        IPriceOracle _prices,
        uint256 _minCommitmentAge,
        uint256 _maxCommitmentAge,
        ReverseRegistrar _reverseRegistrar,
        INameWrapper _nameWrapper,
        ENS _ens,
        uint160[][] memory _whitelist,
        string[][] memory _limits
    ) ReverseClaimer(_ens, msg.sender) {
        if (_maxCommitmentAge <= _minCommitmentAge) {
            revert MaxCommitmentAgeTooLow();
        }

        if (_maxCommitmentAge > block.timestamp) {
            revert MaxCommitmentAgeTooHigh();
        }
        base = _base;
        prices = _prices;
        minCommitmentAge = _minCommitmentAge;
        maxCommitmentAge = _maxCommitmentAge;
        reverseRegistrar = _reverseRegistrar;
        nameWrapper = _nameWrapper;
        for (uint i = 0; i < _whitelist.length; i++) {
            whitelist[address(uint160(_whitelist[i][0]))] = uint8(
                _whitelist[i][1]
            );
            discounts[address(uint160(_whitelist[i][0]))] = uint8(
                _whitelist[i][2]
            );
        }
        for (uint i = 0; i < _limits.length; i++) {
            limites[_limits[i][0]] = stringToAddress(_limits[i][1]);
        }
    }

    function stringToAddress(
        string memory _string
    ) public pure returns (address) {
        return address(bytes20(bytes(_string)));
    }

    function rentPrice(
        string memory name,
        uint256 duration
    ) public view override returns (IPriceOracle.Price memory price) {
        bytes32 label = keccak256(bytes(name));
        price = prices.price(name, base.nameExpires(uint256(label)), duration);
        price.base = (price.base * discounts[msg.sender]) / 100;
    }

    function valid(string memory name) public pure returns (bool) {
        require(!hasChineseChar(name), "Invalid chinese char");
        require(!hasZeroWidthChar(name), "Invalid zero with char");
        return name.strlen() >= 3 && name.strlen() != 12;
    }

    function available(string memory name) public view override returns (bool) {
        bytes32 label = keccak256(bytes(name));
        return valid(name) && base.available(uint256(label));
    }

    function availableWithOwner(
        string memory name,
        address owner
    ) public view returns (bool) {
        if (whitelist[msg.sender] < 1) revert("Invalid address");
        if (whitelist[msg.sender] == registers[msg.sender])
            revert("Max allowed!");
        if (limites[name] != address(0) && limites[name] != msg.sender)
            revert("Limited name!!!");
        bytes32 label = keccak256(bytes(name));
        return valid(name) && base.available(uint256(label));
    }

    function hasChineseChar(string memory str) internal pure returns (bool) {
        bytes memory byteArray = bytes(str);
        uint len = byteArray.length;
        uint i = 0;
        while (i < len) {
            uint c = uint(uint8(byteArray[i]));
            if (c < 0x80) {
                i += 1;
            } else if (c < 0xe0) {
                i += 2;
            } else if (c < 0xf0) {
                uint u = ((c & 0x1f) << 12) |
                    ((uint(uint8(byteArray[i + 1])) & 0x3f) << 6) |
                    (uint(uint8(byteArray[i + 2])) & 0x3f);
                if (u >= 0x4E00 && u <= 0x9FA5) {
                    return true;
                }
                i += 3;
            } else {
                i += 4;
            }
        }
        return false;
    }

    function hasZeroWidthChar(string memory name) public pure returns (bool) {
        bytes memory strBytes = bytes(name);
        uint len = strBytes.length;
        uint i = 0;
        while (i < len) {
            if (strBytes[i] == bytes1(0xE3) && i + 2 < len) {
                bytes2 char2 = bytes2((strBytes[i + 1] << 8) | strBytes[i + 2]);
                if (char2 == 0x200B || char2 == 0x200C || char2 == 0xFEFF) {
                    return true;
                }
                i += 3;
            } else {
                i += 1;
            }
        }
        return false;
    }

    function makeCommitment(
        string memory name,
        address owner,
        uint256 duration,
        bytes32 secret,
        address resolver,
        bytes[] calldata data,
        bool reverseRecord,
        uint16 ownerControlledFuses
    ) public pure override returns (bytes32) {
        bytes32 label = keccak256(bytes(name));
        if (data.length > 0 && resolver == address(0)) {
            revert ResolverRequiredWhenDataSupplied();
        }
        return
            keccak256(
                abi.encode(
                    label,
                    owner,
                    duration,
                    secret,
                    resolver,
                    data,
                    reverseRecord,
                    ownerControlledFuses
                )
            );
    }

    function commit(bytes32 commitment) public override {
        if (commitments[commitment] + maxCommitmentAge >= block.timestamp) {
            revert UnexpiredCommitmentExists(commitment);
        }
        commitments[commitment] = block.timestamp;
    }

    function register(
        string calldata name,
        address owner,
        uint256 duration,
        bytes32 secret,
        address resolver,
        bytes[] calldata data,
        bool reverseRecord,
        uint16 ownerControlledFuses
    ) public payable override {
        IPriceOracle.Price memory price = rentPrice(name, duration);
        if (msg.value < (price.base + price.premium)) {
            revert InsufficientValue();
        }

        _consumeCommitment(
            name,
            duration,
            makeCommitment(
                name,
                owner,
                duration,
                secret,
                resolver,
                data,
                reverseRecord,
                ownerControlledFuses
            ),
            owner
        );

        uint256 expires = nameWrapper.registerAndWrapETH2LD(
            name,
            owner,
            duration,
            resolver,
            ownerControlledFuses
        );

        if (data.length > 0) {
            _setRecords(resolver, keccak256(bytes(name)), data);
        }

        if (reverseRecord) {
            _setReverseRecord(name, resolver, msg.sender);
        }

        emit NameRegistered(
            name,
            keccak256(bytes(name)),
            owner,
            price.base,
            price.premium,
            expires
        );

        if (msg.value > (price.base + price.premium)) {
            payable(msg.sender).transfer(
                msg.value - (price.base + price.premium)
            );
        }

        registers[msg.sender]++;
    }

    function withdraw() public {
        payable(owner()).transfer(address(this).balance);
    }

    function supportsInterface(
        bytes4 interfaceID
    ) external pure returns (bool) {
        return
            interfaceID == type(IERC165).interfaceId ||
            interfaceID == type(IEVMRegistrarController).interfaceId;
    }

    /* Internal functions */

    function _consumeCommitment(
        string memory name,
        uint256 duration,
        bytes32 commitment,
        address owner
    ) internal {
        // Require an old enough commitment.
        if (commitments[commitment] + minCommitmentAge > block.timestamp) {
            revert CommitmentTooNew(commitment);
        }

        // If the commitment is too old, or the name is registered, stop
        if (commitments[commitment] + maxCommitmentAge <= block.timestamp) {
            revert CommitmentTooOld(commitment);
        }
        if (!availableWithOwner(name, owner)) {
            revert NameNotAvailable(name);
        }

        delete (commitments[commitment]);

        if (duration < MIN_REGISTRATION_DURATION) {
            revert DurationTooShort(duration);
        }
    }

    function _setRecords(
        address resolverAddress,
        bytes32 label,
        bytes[] calldata data
    ) internal {
        // use hardcoded .eth namehash
        bytes32 nodehash = keccak256(abi.encodePacked(ETH_NODE, label));
        Resolver resolver = Resolver(resolverAddress);
        resolver.multicallWithNodeCheck(nodehash, data);
    }

    function _setReverseRecord(
        string memory name,
        address resolver,
        address owner
    ) internal {
        reverseRegistrar.setNameForAddr(
            msg.sender,
            owner,
            resolver,
            string.concat(name, ".evm")
        );
    }
}
