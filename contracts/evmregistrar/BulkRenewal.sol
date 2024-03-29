//SPDX-License-Identifier: MIT
pragma solidity ~0.8.17;

import "../registry/EVMNS.sol";
import "./EVMRegistrarController.sol";
import "./IEVMRegistrarController.sol";
import "../resolvers/Resolver.sol";
import "./IBulkRenewal.sol";
import "./IPriceOracle.sol";

import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

contract BulkRenewal is IBulkRenewal {
    bytes32 private constant ETH_NAMEHASH =
        0x508b635792ccd7149e70e60de9be8731ce05ec4242c91d20e497968774e30bd1;

    EVMNS public immutable ens;

    constructor(EVMNS _evmns) {
        ens = _evmns;
    }

    function getController() internal view returns (EVMRegistrarController) {
        Resolver r = Resolver(ens.resolver(ETH_NAMEHASH));
        return
            EVMRegistrarController(
                r.interfaceImplementer(
                    ETH_NAMEHASH,
                    type(IEVMRegistrarController).interfaceId
                )
            );
    }

    function rentPrice(
        string[] calldata names,
        uint256 duration
    ) external view override returns (uint256 total) {
        EVMRegistrarController controller = getController();
        uint256 length = names.length;
        for (uint256 i = 0; i < length; ) {
            uint256 price = controller.rentPrice(names[i], duration);
            unchecked {
                ++i;
                total += price;
            }
        }
    }

    function renewAll(
        string[] calldata names,
        uint256 duration
    ) external payable override {
        EVMRegistrarController controller = getController();
        uint256 length = names.length;
        uint256 total;
        for (uint256 i = 0; i < length; ) {
            uint256 price = controller.rentPrice(names[i], duration);
            controller.renew{value: price}(names[i], duration);
            unchecked {
                ++i;
                total += price;
            }
        }
        // Send any excess funds back
        payable(msg.sender).transfer(address(this).balance);
    }

    function supportsInterface(
        bytes4 interfaceID
    ) external pure returns (bool) {
        return
            interfaceID == type(IERC165).interfaceId ||
            interfaceID == type(IBulkRenewal).interfaceId;
    }
}
