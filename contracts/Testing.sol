// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TestReturnTypes
 * @dev This contract provides multiple functions that each return a
 *      different type (bool, string, uint, int). This is to help test
 *      the 'callContract' rule in a variety of scenarios.
 */
contract TestReturnTypes {
    function returnTrue () external pure returns (bool) {
        return true;
    }

    function returnFalse () external pure returns (bool) {
        return false;
    }

    function returnString() external pure returns (string memory) {
      return "TEST";
    }

    function returnUint() external pure returns (uint256) {
        return uint256(100); 
    }

    function returnPositiveInt() external pure returns (int256) {
        return int256(100);
    }

    function returnNegativeInt() external pure returns (int256) {
        return int256(-100);
    }
}
