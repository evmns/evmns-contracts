//SPDX-License-Identifier: MIT
pragma solidity ~0.8.17;

import "./IPriceOracle.sol";
import "./StringUtils.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

interface AggregatorInterface {
    function latestAnswer() external view returns (int256);
}

// StablePriceOracle sets a price in USD, based on an oracle.
contract StablePriceOracle is IPriceOracle {
    using StringUtils for *;

    // Rent in base price units by length
    uint256 public immutable price1Letter;
    uint256 public immutable price2Letter;
    uint256 public immutable price3Letter;
    uint256 public immutable price4Letter;
    uint256 public immutable price5Letter;

    // Oracle address
    AggregatorInterface public immutable usdOracle;

    event RentPriceChanged(uint256[] prices);

    constructor(AggregatorInterface _usdOracle, uint256[] memory _rentPrices) {
        usdOracle = _usdOracle;
        price1Letter = _rentPrices[0];
        price2Letter = _rentPrices[1];
        price3Letter = _rentPrices[2];
        price4Letter = _rentPrices[3];
        price5Letter = _rentPrices[4];
    }

    function price(
        string calldata name,
        uint256 expires,
        uint256 duration
    ) external view override returns (uint256) {
        if ((expires + 90 days) > block.timestamp) {
            return priceForRenew(name, duration);
        }

        uint256 len = name.strlen();
        uint256 basePrice;

        if (len >= 5) {
            basePrice = price5Letter * duration;
        } else if (len == 4) {
            if (duration >= 365 days) {
                basePrice =
                    price4Letter *
                    365 days +
                    price5Letter *
                    (duration - 365 days);
            } else {
                basePrice = price4Letter * duration;
            }
        } else if (len == 3) {
            if (duration >= 365 days) {
                basePrice =
                    price3Letter *
                    365 days +
                    price5Letter *
                    (duration - 365 days);
            } else {
                basePrice = price3Letter * duration;
            }
        } else if (len == 2) {
            if (duration >= 365 days) {
                basePrice =
                    price2Letter *
                    365 days +
                    price5Letter *
                    (duration - 365 days);
            } else {
                basePrice = price2Letter * duration;
            }
        } else {
            if (duration >= 365 days) {
                basePrice =
                    price1Letter *
                    365 days +
                    price5Letter *
                    (duration - 365 days);
            } else {
                basePrice = price1Letter * duration;
            }
        }

        return attoUSDToWei(basePrice);
    }

    function priceForRenew(
        string calldata name,
        uint256 duration
    ) public view returns (uint256) {
        uint256 basePrice;
        basePrice = price5Letter * duration;
        return attoUSDToWei(basePrice);
    }

    function attoUSDToWei(uint256 amount) internal view returns (uint256) {
        uint256 ethPrice = uint256(usdOracle.latestAnswer());
        return (amount * 1e8) / ethPrice;
    }

    function weiToAttoUSD(uint256 amount) internal view returns (uint256) {
        uint256 ethPrice = uint256(usdOracle.latestAnswer());
        return (amount * ethPrice) / 1e8;
    }

    function supportsInterface(
        bytes4 interfaceID
    ) public view virtual returns (bool) {
        return
            interfaceID == type(IERC165).interfaceId ||
            interfaceID == type(IPriceOracle).interfaceId;
    }
}
