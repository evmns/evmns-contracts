//SPDX-License-Identifier: MIT
pragma solidity ~0.8.17;

import "./EVMRegistrarController.sol";
import "./IBulkRenewal.sol";
import "./IPriceOracle.sol";

import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

contract StaticBulkRenewal is IBulkRenewal {
    EVMRegistrarController controller;

    constructor(EVMRegistrarController _controller) {
        controller = _controller;
    }

    function rentPrice(
        string[] calldata names,
        uint256 duration
    ) external view override returns (uint256 total) {
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
