// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title BitmaskConfig
/// @notice Compresses multiple boolean configuration flags into a single bytes32
///         storage slot, eliminating redundant SLOAD operations.
/// @dev Uses inline Yul assembly for bitwise get/set to avoid Solidity's
///      stack-heavy boolean encoding. Each flag occupies one bit.
contract BitmaskConfig {
    // Bit offset constants.
    uint256 private constant PAUSED_BIT = 1 << 0; // 0x01
    uint256 private constant LOCKED_BIT = 1 << 1; // 0x02
    uint256 private constant PUBLIC_BIT = 1 << 2; // 0x04
    uint256 private constant MIGRATED_BIT = 1 << 3; // 0x08

    /// @dev Single storage slot holding all configuration flags as a bitmask.
    bytes32 private configFlags;

    // ─── Events ─────────────────────────────────────────────────────────

    event ConfigUpdated(bytes32 oldFlags, bytes32 newFlags);

    // ─── Getters ────────────────────────────────────────────────────────

    function isPaused() external view returns (bool) {
        return _getFlag(PAUSED_BIT);
    }

    function isLocked() external view returns (bool) {
        return _getFlag(LOCKED_BIT);
    }

    function isPublic() external view returns (bool) {
        return _getFlag(PUBLIC_BIT);
    }

    function isMigrated() external view returns (bool) {
        return _getFlag(MIGRATED_BIT);
    }

    function getRawConfig() external view returns (bytes32) {
        return configFlags;
    }

    // ─── Setters ────────────────────────────────────────────────────────

    function setPaused(bool value) external {
        _setFlag(PAUSED_BIT, value);
    }

    function setLocked(bool value) external {
        _setFlag(LOCKED_BIT, value);
    }

    function setPublic(bool value) external {
        _setFlag(PUBLIC_BIT, value);
    }

    function setMigrated(bool value) external {
        _setFlag(MIGRATED_BIT, value);
    }

    // ─── Internal Bitwise Operations ────────────────────────────────────

    /// @dev Get a single bit flag using inline assembly.
    function _getFlag(uint256 bit) private view returns (bool flag) {
        assembly {
            flag := and(sload(configFlags.slot), bit)
        }
    }

    /// @dev Set or clear a single bit flag using inline assembly.
    function _setFlag(uint256 bit, bool value) private {
        bytes32 oldFlags;
        bytes32 newFlags;

        assembly {
            let slot := configFlags.slot
            oldFlags := sload(slot)

            if value {
                newFlags := or(oldFlags, bit)
            }
            if iszero(value) {
                newFlags := and(oldFlags, not(bit))
            }
            sstore(slot, newFlags)
        }

        emit ConfigUpdated(oldFlags, newFlags);
    }
}
