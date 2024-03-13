// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IL2StandardERC721 is IERC721 {
    function l1Token() external returns (address);

    function mint(address _to, uint256 _tokenId) external;

    function burn(address _from, uint256 _tokenId) external;

    event L2BridgeMint(address indexed _account, uint256 _tokenId);
    event L2BridgeBurn(address indexed _account, uint256 _tokenId);
}
