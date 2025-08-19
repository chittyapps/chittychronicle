pragma solidity ^0.8.20;
// SPDX-License-Identifier: MIT
contract RevocationRegistry {
    mapping(bytes32 => bool) public revoked;
    event Revoked(bytes32 indexed credHash, address indexed by);

    function revoke(bytes32 credHash) external {
        revoked[credHash] = true;
        emit Revoked(credHash, msg.sender);
    }
}
