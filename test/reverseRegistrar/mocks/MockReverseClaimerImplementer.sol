//SPDX-License-Identifier: MIT
pragma solidity >=0.8.17 <0.9.0;

import {EVMNS} from "../../../contracts/registry/EVMNS.sol";
import {ReverseClaimer} from "../../../contracts/reverseRegistrar/ReverseClaimer.sol";

contract MockReverseClaimerImplementer is ReverseClaimer {
    constructor(EVMNS ens, address claimant) ReverseClaimer(ens, claimant) {}
}
