//SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract EmojiUtils is Ownable {
    struct Emoji {
        bool end;
        uint8 length;
        mapping(bytes1 => Emoji) nexts;
    }

    mapping(bytes1 => Emoji) emojilink;

    function addEmojis(bytes[] calldata _emojis) public onlyOwner {
        for (uint i = 0; i < _emojis.length; i++) {
            //emojis.push(_emojis[i]);
            if (emojilink[bytes1(_emojis[i][0])].length == 0) {
                emojilink[bytes1(_emojis[i][0])].length = 1;
                emojilink[bytes1(_emojis[i][0])].end = false;
            }
            Emoji storage currentNode = emojilink[bytes1(_emojis[i][0])];
            for (uint8 j = 1; j < _emojis[i].length; j++) {
                if (currentNode.nexts[_emojis[i][j]].length == 0) {
                    currentNode.nexts[_emojis[i][j]].length = j + 1;
                    if (j == _emojis[i].length - 1) {
                        currentNode.nexts[_emojis[i][j]].end = true;
                    } else {
                        currentNode.nexts[_emojis[i][j]].end = false;
                    }
                } else {
                    if (j == _emojis[i].length - 1) {
                        currentNode.nexts[_emojis[i][j]].end = true;
                    }
                }
                currentNode = currentNode.nexts[_emojis[i][j]];
            }
        }
    }

    function hasZeroWidthEmoji(string memory input) public view returns (bool) {
        bytes memory nb = bytes(input);
        // zero width for /u200b /u200c /u200d and U+FEFF
        if (nb.length < 10) {
            if (nb.length < 3) return false;
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
        } else {
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
                if (i > nb.length - 10) {
                    continue;
                }
                uint8 findLength = 0;

                Emoji storage currentNode = emojilink[nb[i]];

                if (currentNode.length == 0) continue;

                for (uint256 ei = i + 1; ei < nb.length; ei++) {
                    bytes1 key = nb[ei];
                    currentNode = currentNode.nexts[key];
                    if (currentNode.length > 0) {
                        if (currentNode.end) {
                            findLength = currentNode.length;
                        }
                    } else {
                        break;
                    }
                }
                if (findLength > 0) {
                    i = i + findLength - 1;
                }
            }
            return false;
        }
    }
}
