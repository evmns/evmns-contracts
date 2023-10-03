//SPDX-License-Identifier: MIT
pragma solidity ~0.8.17;

import {BaseRegistrarImplementation} from "./BaseRegistrarImplementation.sol";
import {StringUtils} from "./StringUtils.sol";
import {Resolver} from "../resolvers/Resolver.sol";
import {EVMNS} from "../registry/EVMNS.sol";
import {EmojiUtils} from "./EmojiUtils.sol";
import {ReverseRegistrar} from "../reverseRegistrar/ReverseRegistrar.sol";
import {ReverseClaimer} from "../reverseRegistrar/ReverseClaimer.sol";
import {IEVMRegistrarController, IPriceOracle} from "./IEVMRegistrarController.sol";

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {INameWrapper} from "../wrapper/INameWrapper.sol";
import {ERC20Recoverable} from "../utils/ERC20Recoverable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

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
error NotLaunched();

/**
 * @dev A registrar controller for registering and renewing names at fixed cost.
 */
contract EVMRegistrarController is
    Ownable,
    IEVMRegistrarController,
    IERC165,
    ERC20Recoverable,
    ReverseClaimer
{
    using StringUtils for *;
    using Address for address;

    uint256 public constant MIN_REGISTRATION_DURATION = 365 days;
    bytes32 private constant ETH_NODE =
        0x508b635792ccd7149e70e60de9be8731ce05ec4242c91d20e497968774e30bd1;
    uint64 private constant MAX_EXPIRY = type(uint64).max;
    BaseRegistrarImplementation immutable base;
    IPriceOracle public immutable prices;
    EmojiUtils public immutable emojiUtils;
    uint256 public immutable minCommitmentAge;
    uint256 public immutable maxCommitmentAge;

    ReverseRegistrar public immutable reverseRegistrar;
    INameWrapper public immutable nameWrapper;

    mapping(bytes32 => uint256) public commitments;

    bool launched = false;
    bool allow12register = false;
    uint launchedtime = 0;
    uint allow12registertime = 0;
    address marketingController;
    address earningAccount;

    event NameRegistered(
        string name,
        bytes32 indexed label,
        address indexed owner,
        uint256 baseCost,
        uint256 duration,
        uint256 expires
    );
    event NameRenewed(
        string name,
        bytes32 indexed label,
        uint256 cost,
        uint256 duration,
        uint256 expires
    );

    constructor(
        BaseRegistrarImplementation _base,
        IPriceOracle _prices,
        EmojiUtils _emojiUtils,
        uint256 _minCommitmentAge,
        uint256 _maxCommitmentAge,
        ReverseRegistrar _reverseRegistrar,
        INameWrapper _nameWrapper,
        EVMNS _evmns,
        uint _launchedtime,
        uint _allow12registertime,
        address _earningAccount
    ) ReverseClaimer(_evmns, msg.sender) {
        if (_maxCommitmentAge <= _minCommitmentAge) {
            revert MaxCommitmentAgeTooLow();
        }

        if (_maxCommitmentAge > block.timestamp) {
            revert MaxCommitmentAgeTooHigh();
        }

        base = _base;
        prices = _prices;
        emojiUtils = _emojiUtils;
        minCommitmentAge = _minCommitmentAge;
        maxCommitmentAge = _maxCommitmentAge;
        reverseRegistrar = _reverseRegistrar;
        nameWrapper = _nameWrapper;
        launchedtime = _launchedtime;
        allow12registertime = _allow12registertime;
        earningAccount = _earningAccount;
    }

    function namelen(string memory name) public view returns (uint) {
        return name.strlen();
    }

    function transferMarketingController(address controller) public onlyOwner {
        marketingController = controller;
    }

    modifier onlaunch() {
        if (!launched) {
            if (block.timestamp < launchedtime) {
                revert NotLaunched();
            }
            launched = true;
        }
        _;
    }

    function rentPrice(
        string memory name,
        uint256 duration
    ) public view override returns (uint256 price) {
        bytes32 label = keccak256(bytes(name));
        price = prices.price(name, base.nameExpires(uint256(label)), duration);
    }

    function valid(string memory name) public pure returns (bool) {
        return
            name.strlen() > 0 && name.strlen() <= 250 && !hasInvalidChar(name);
    }

    function available(string memory name) public view override returns (bool) {
        if (!allow12register) {
            if (block.timestamp < allow12registertime && name.strlen() == 12) {
                return false;
            }
        }
        bytes32 label = keccak256(bytes(name));
        return
            valid(name) &&
            !hasZeroWidthChar(name) &&
            base.available(uint256(label));
    }

    //chineseChar and dot
    function hasInvalidChar(string memory str) public pure returns (bool) {
        bytes memory byteArray = bytes(str);
        uint len = byteArray.length;
        uint i = 0;
        while (i < len) {
            uint c = uint(uint8(byteArray[i]));
            //has dot
            if (c == 0x2e) {
                return true;
            }
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

    function hasZeroWidthChar(string memory input) public pure returns (bool) {
        bytes memory nb = bytes(input);
        if (nb.length < 3) return false;
        // zero width for /u200b /u200c /u200d and U+FEFF
        for (uint256 i; i < nb.length - 2; i++) {
            if (bytes1(nb[i]) == 0xe2 && bytes1(nb[i + 1]) == 0x80) {
                if (
                    bytes1(nb[i + 2]) == 0x8b ||
                    bytes1(nb[i + 2]) == 0x8c ||
                    bytes1(nb[i + 2]) == 0x8d
                ) {
                    return true;
                }
            } else if (bytes1(nb[i]) == 0xef) {
                if (bytes1(nb[i + 1]) == 0xbb && bytes1(nb[i + 2]) == 0xbf)
                    return true;
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

    function commit(bytes32 commitment) public override onlaunch {
        if (commitments[commitment] + maxCommitmentAge >= block.timestamp) {
            revert UnexpiredCommitmentExists(commitment);
        }
        commitments[commitment] = block.timestamp;
    }

    function register(
        string calldata name,
        address nameOwner,
        uint256 duration,
        bytes32 secret,
        address resolver,
        bytes[] calldata data,
        bool reverseRecord,
        uint16 ownerControlledFuses
    ) public payable override {
        if (!allow12register) {
            if (block.timestamp > allow12registertime) {
                allow12register = true;
            } else if (name.strlen() == 12) {
                revert("12 words is locked");
            }
        }

        uint256 price = rentPrice(name, duration);
        if (msg.value < price && price > 0) {
            revert InsufficientValue();
        }
        if (!available(name)) {
            revert NameNotAvailable(name);
        }
        _consumeCommitment(
            name,
            duration,
            makeCommitment(
                name,
                nameOwner,
                duration,
                secret,
                resolver,
                data,
                reverseRecord,
                ownerControlledFuses
            )
        );

        uint256 expires = nameWrapper.registerAndWrapETH2LD(
            name,
            nameOwner,
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
            nameOwner,
            price,
            duration,
            expires
        );

        if (msg.value > price) {
            payable(msg.sender).transfer(msg.value - price);
        }
        payable(marketingController).transfer((price * 35) / 100);
        payable(earningAccount).transfer(address(this).balance);
    }

    function availableWithEmoji(string memory name) public view returns (bool) {
        if (!allow12register) {
            if (block.timestamp < allow12registertime && name.strlen() == 12) {
                return false;
            }
        }
        bytes32 label = keccak256(bytes(name));
        return
            valid(name) &&
            !emojiUtils.hasZeroWidthEmoji(name) &&
            base.available(uint256(label));
    }

    function registerWithEmoji(
        string calldata name,
        address nameOwner,
        uint256 duration,
        bytes32 secret,
        address resolver,
        bytes[] calldata data,
        bool reverseRecord,
        uint16 ownerControlledFuses
    ) public payable {
        if (!allow12register) {
            if (block.timestamp > allow12registertime) {
                allow12register = true;
            } else if (name.strlen() == 12) {
                revert("12 words is locked");
            }
        }

        uint256 price = rentPrice(name, duration);
        if (msg.value < price && price > 0) {
            revert InsufficientValue();
        }
        if (!availableWithEmoji(name)) {
            revert NameNotAvailable(name);
        }
        _consumeCommitment(
            name,
            duration,
            makeCommitment(
                name,
                nameOwner,
                duration,
                secret,
                resolver,
                data,
                reverseRecord,
                ownerControlledFuses
            )
        );

        uint256 expires = nameWrapper.registerAndWrapETH2LD(
            name,
            nameOwner,
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
            nameOwner,
            price,
            duration,
            expires
        );

        if (msg.value > price) {
            payable(msg.sender).transfer(msg.value - price);
        }
        payable(marketingController).transfer((price * 35) / 100);
        payable(earningAccount).transfer(address(this).balance);
    }

    function renew(string calldata name, uint256 duration) external payable {
        bytes32 labelhash = keccak256(bytes(name));
        uint256 tokenId = uint256(labelhash);
        uint256 price = rentPrice(name, duration);
        if (msg.value < price) {
            revert InsufficientValue();
        }
        uint256 expires = nameWrapper.renew(tokenId, duration);

        if (msg.value > price) {
            payable(msg.sender).transfer(msg.value - price);
        }

        emit NameRenewed(name, labelhash, msg.value, duration, expires);
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
        bytes32 commitment
    ) internal {
        // Require an old enough commitment.
        if (commitments[commitment] + minCommitmentAge > block.timestamp) {
            revert CommitmentTooNew(commitment);
        }

        // If the commitment is too old, or the name is registered, stop
        if (commitments[commitment] + maxCommitmentAge <= block.timestamp) {
            revert CommitmentTooOld(commitment);
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
