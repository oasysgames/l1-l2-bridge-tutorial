// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract L2StandardERC721Factory {
    event OptimismMintableERC721Created(
        address indexed localToken,
        address indexed remoteToken,
        address deployer
    );

    function createOptimismMintableERC721(
        address _remoteToken,
        string memory /*_name*/,
        string memory /*_symbol*/
    ) external returns (address) {
        emit OptimismMintableERC721Created(
            address(0),
            _remoteToken,
            msg.sender
        );
        return _remoteToken;
    }
}
