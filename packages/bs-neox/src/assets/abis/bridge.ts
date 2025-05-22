export const BRIDGE_ABI = [
  {
    inputs: [],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'target',
        type: 'address',
      },
    ],
    name: 'AddressEmptyCode',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'AddressInsufficientBalance',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'minAmount',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'provided',
        type: 'uint256',
      },
    ],
    name: 'AmountBelowMinAmount',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'maxAmount',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'provided',
        type: 'uint256',
      },
    ],
    name: 'AmountExceedsMaxAmount',
    type: 'error',
  },
  {
    inputs: [],
    name: 'BridgeNotPaused',
    type: 'error',
  },
  {
    inputs: [],
    name: 'BridgePaused',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'implementation',
        type: 'address',
      },
    ],
    name: 'ERC1967InvalidImplementation',
    type: 'error',
  },
  {
    inputs: [],
    name: 'ERC1967NonPayable',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'feeExpected',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'feeProvided',
        type: 'uint256',
      },
    ],
    name: 'ExactFeeRequired',
    type: 'error',
  },
  {
    inputs: [],
    name: 'FailedInnerCall',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'minExpected',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'provided',
        type: 'uint256',
      },
    ],
    name: 'InsufficientFee',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidAddress',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidAmount',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidDepositsLength',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidFee',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidInitialization',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidNonceSequence',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidRoot',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidTokenAddress',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidTokenConfig',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidTransfer',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidValidatorSignatures',
    type: 'error',
  },
  {
    inputs: [],
    name: 'InvalidValue',
    type: 'error',
  },
  {
    inputs: [],
    name: 'LengthMismatch',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'maxFeeAllowed',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'actualFee',
        type: 'uint256',
      },
    ],
    name: 'MaxFeeExceeded',
    type: 'error',
  },
  {
    inputs: [],
    name: 'NativeBridgeAlreadySet',
    type: 'error',
  },
  {
    inputs: [],
    name: 'NativeBridgeNotPaused',
    type: 'error',
  },
  {
    inputs: [],
    name: 'NativeBridgeNotSet',
    type: 'error',
  },
  {
    inputs: [],
    name: 'NativeBridgePaused',
    type: 'error',
  },
  {
    inputs: [],
    name: 'NoAuthorization',
    type: 'error',
  },
  {
    inputs: [],
    name: 'NonexistentClaimable',
    type: 'error',
  },
  {
    inputs: [],
    name: 'NotInitializing',
    type: 'error',
  },
  {
    inputs: [],
    name: 'ReentrancyGuardReentrantCall',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'token',
        type: 'address',
      },
    ],
    name: 'SafeERC20FailedOperation',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'neoXToken',
        type: 'address',
      },
    ],
    name: 'TokenBridgeAlreadyRegistered',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'neoXToken',
        type: 'address',
      },
    ],
    name: 'TokenBridgeNotPaused',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'neoXToken',
        type: 'address',
      },
    ],
    name: 'TokenBridgeNotRegistered',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'neoXToken',
        type: 'address',
      },
    ],
    name: 'TokenBridgePaused',
    type: 'error',
  },
  {
    inputs: [],
    name: 'TransferFailed',
    type: 'error',
  },
  {
    inputs: [],
    name: 'UUPSUnauthorizedCallContext',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'slot',
        type: 'bytes32',
      },
    ],
    name: 'UUPSUnsupportedProxiableUUID',
    type: 'error',
  },
  {
    inputs: [],
    name: 'WithdrawalsNotPaused',
    type: 'error',
  },
  {
    inputs: [],
    name: 'WithdrawalsPaused',
    type: 'error',
  },
  {
    anonymous: false,
    inputs: [],
    name: 'BridgePause',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [],
    name: 'BridgeUnpause',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'Fund',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint64',
        name: 'version',
        type: 'uint64',
      },
    ],
    name: 'Initialized',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'MaxNativeDepositsChange',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'MaxNativeWithdrawalChange',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'neoXToken',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'maxDeposits',
        type: 'uint256',
      },
    ],
    name: 'MaxTokenDepositsChange',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'neoXToken',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'maxAmount',
        type: 'uint256',
      },
    ],
    name: 'MaxTokenWithdrawalAmountChange',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint256',
        name: 'newAmount',
        type: 'uint256',
      },
    ],
    name: 'MinNativeWithdrawalChange',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'neoXToken',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'minAmount',
        type: 'uint256',
      },
    ],
    name: 'MinTokenWithdrawalAmountChange',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [],
    name: 'NativeBridgePause',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [],
    name: 'NativeBridgeUnpause',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'nonce',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'NativeClaim',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'nonce',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'NativeClaimable',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'nonce',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'NativeDeposit',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'nonce',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'depositRoot',
        type: 'bytes32',
      },
    ],
    name: 'NativeDepositRootUpdate',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'uint256',
        name: 'nonce',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'from',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'withdrawalHash',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'withdrawalRoot',
        type: 'bytes32',
      },
    ],
    name: 'NativeWithdrawal',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint256',
        name: 'newFee',
        type: 'uint256',
      },
    ],
    name: 'NativeWithdrawalFeeChange',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'neoXToken',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'neoN3Token',
        type: 'address',
      },
    ],
    name: 'TokenBridgePause',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'neoXToken',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'neoN3Token',
        type: 'address',
      },
    ],
    name: 'TokenBridgeUnpause',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'neoXToken',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'nonce',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'TokenClaim',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'neoXToken',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'nonce',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'TokenClaimable',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'neoXToken',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'nonce',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'TokenDeposit',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'neoXToken',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'neoN3Token',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'nonce',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'depositRoot',
        type: 'bytes32',
      },
    ],
    name: 'TokenDepositRootUpdate',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'neoXToken',
        type: 'address',
      },
      {
        components: [
          {
            internalType: 'address',
            name: 'neoN3Token',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'fee',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'minAmount',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'maxAmount',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'maxDeposits',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'decimalScalingFactor',
            type: 'uint256',
          },
        ],
        indexed: false,
        internalType: 'struct StorageTypes.TokenConfig',
        name: 'tokenConfig',
        type: 'tuple',
      },
    ],
    name: 'TokenRegister',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'neoXToken',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'neoN3Token',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'nonce',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'from',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'withdrawalHash',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'withdrawalRoot',
        type: 'bytes32',
      },
    ],
    name: 'TokenWithdrawal',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'neoXToken',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'fee',
        type: 'uint256',
      },
    ],
    name: 'TokenWithdrawalFeeChange',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'implementation',
        type: 'address',
      },
    ],
    name: 'Upgraded',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [],
    name: 'WithdrawalPause',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [],
    name: 'WithdrawalUnpause',
    type: 'event',
  },
  {
    inputs: [],
    name: 'GOV_ADMIN',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'UPGRADE_INTERFACE_VERSION',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'bridgePaused',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_nonce',
        type: 'uint256',
      },
    ],
    name: 'claimNative',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_neoXToken',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: '_nonce',
        type: 'uint256',
      },
    ],
    name: 'claimToken',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'nonce',
        type: 'uint256',
      },
    ],
    name: 'claimableNative',
    outputs: [
      {
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_depositRoot',
        type: 'bytes32',
      },
      {
        components: [
          {
            internalType: 'uint8',
            name: 'v',
            type: 'uint8',
          },
          {
            internalType: 'bytes32',
            name: 'r',
            type: 'bytes32',
          },
          {
            internalType: 'bytes32',
            name: 's',
            type: 'bytes32',
          },
        ],
        internalType: 'struct BridgeLib.Signature[]',
        name: '_signatures',
        type: 'tuple[]',
      },
      {
        components: [
          {
            internalType: 'uint256',
            name: 'nonce',
            type: 'uint256',
          },
          {
            internalType: 'address payable',
            name: 'to',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'amount',
            type: 'uint256',
          },
        ],
        internalType: 'struct BridgeLib.DepositData[]',
        name: '_deposits',
        type: 'tuple[]',
      },
    ],
    name: 'depositNative',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_neoXToken',
        type: 'address',
      },
      {
        internalType: 'bytes32',
        name: '_tokenDepositRoot',
        type: 'bytes32',
      },
      {
        components: [
          {
            internalType: 'uint8',
            name: 'v',
            type: 'uint8',
          },
          {
            internalType: 'bytes32',
            name: 'r',
            type: 'bytes32',
          },
          {
            internalType: 'bytes32',
            name: 's',
            type: 'bytes32',
          },
        ],
        internalType: 'struct BridgeLib.Signature[]',
        name: '_signatures',
        type: 'tuple[]',
      },
      {
        components: [
          {
            internalType: 'uint256',
            name: 'nonce',
            type: 'uint256',
          },
          {
            internalType: 'address payable',
            name: 'to',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'amount',
            type: 'uint256',
          },
        ],
        internalType: 'struct BridgeLib.DepositData[]',
        name: '_deposits',
        type: 'tuple[]',
      },
    ],
    name: 'depositToken',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_neoXToken',
        type: 'address',
      },
    ],
    name: 'isRegisteredToken',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'management',
    outputs: [
      {
        internalType: 'contract IBridgeManagement',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'nativeBridge',
    outputs: [
      {
        internalType: 'bool',
        name: 'paused',
        type: 'bool',
      },
      {
        components: [
          {
            internalType: 'uint256',
            name: 'nonce',
            type: 'uint256',
          },
          {
            internalType: 'bytes32',
            name: 'root',
            type: 'bytes32',
          },
        ],
        internalType: 'struct StorageTypes.State',
        name: 'depositState',
        type: 'tuple',
      },
      {
        components: [
          {
            internalType: 'uint256',
            name: 'nonce',
            type: 'uint256',
          },
          {
            internalType: 'bytes32',
            name: 'root',
            type: 'bytes32',
          },
        ],
        internalType: 'struct StorageTypes.State',
        name: 'withdrawalState',
        type: 'tuple',
      },
      {
        components: [
          {
            internalType: 'uint256',
            name: 'fee',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'minAmount',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'maxAmount',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'maxDeposits',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'decimalScalingFactor',
            type: 'uint256',
          },
        ],
        internalType: 'struct StorageTypes.NativeConfigV3',
        name: 'config',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'nativeBridgeIsSet',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'nativeBridgeV2',
    outputs: [
      {
        internalType: 'bool',
        name: 'paused',
        type: 'bool',
      },
      {
        components: [
          {
            internalType: 'uint256',
            name: 'nonce',
            type: 'uint256',
          },
          {
            internalType: 'bytes32',
            name: 'root',
            type: 'bytes32',
          },
        ],
        internalType: 'struct StorageTypes.State',
        name: 'depositState',
        type: 'tuple',
      },
      {
        components: [
          {
            internalType: 'uint256',
            name: 'nonce',
            type: 'uint256',
          },
          {
            internalType: 'bytes32',
            name: 'root',
            type: 'bytes32',
          },
        ],
        internalType: 'struct StorageTypes.State',
        name: 'withdrawalState',
        type: 'tuple',
      },
      {
        components: [
          {
            internalType: 'uint256',
            name: 'fee',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'minAmount',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'maxAmount',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'maxDeposits',
            type: 'uint256',
          },
        ],
        internalType: 'struct StorageTypes.NativeConfigV2',
        name: 'config',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'pauseBridge',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'pauseNativeBridge',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_neoXToken',
        type: 'address',
      },
    ],
    name: 'pauseTokenBridge',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'pauseWithdrawals',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'proxiableUUID',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_neoXToken',
        type: 'address',
      },
      {
        components: [
          {
            internalType: 'address',
            name: 'neoN3Token',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'fee',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'minAmount',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'maxAmount',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'maxDeposits',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'decimalScalingFactor',
            type: 'uint256',
          },
        ],
        internalType: 'struct StorageTypes.TokenConfig',
        name: '_tokenConfig',
        type: 'tuple',
      },
    ],
    name: 'registerToken',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    name: 'registeredTokens',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_maxNrDeposits',
        type: 'uint256',
      },
    ],
    name: 'setMaxNativeDeposits',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_amount',
        type: 'uint256',
      },
    ],
    name: 'setMaxNativeWithdrawalAmount',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address[]',
        name: '_neoXTokens',
        type: 'address[]',
      },
      {
        internalType: 'uint256[]',
        name: '_maxDeposits',
        type: 'uint256[]',
      },
    ],
    name: 'setMaxTokenDeposits',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address[]',
        name: '_neoXTokens',
        type: 'address[]',
      },
      {
        internalType: 'uint256[]',
        name: '_maxAmounts',
        type: 'uint256[]',
      },
    ],
    name: 'setMaxTokenWithdrawalAmount',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_amount',
        type: 'uint256',
      },
    ],
    name: 'setMinNativeWithdrawalAmount',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address[]',
        name: '_neoXTokens',
        type: 'address[]',
      },
      {
        internalType: 'uint256[]',
        name: '_minAmounts',
        type: 'uint256[]',
      },
    ],
    name: 'setMinTokenWithdrawalAmount',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_fee',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_minAmount',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_maxAmount',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_maxDeposits',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_decimalsHere',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_decimalsOnN3',
        type: 'uint256',
      },
    ],
    name: 'setNativeBridge',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '_fee',
        type: 'uint256',
      },
    ],
    name: 'setNativeWithdrawalFee',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address[]',
        name: '_neoXTokens',
        type: 'address[]',
      },
      {
        internalType: 'uint256[]',
        name: '_fees',
        type: 'uint256[]',
      },
    ],
    name: 'setTokenWithdrawalFee',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'tokenAddress',
        type: 'address',
      },
    ],
    name: 'tokenBridges',
    outputs: [
      {
        internalType: 'bool',
        name: 'paused',
        type: 'bool',
      },
      {
        components: [
          {
            internalType: 'uint256',
            name: 'nonce',
            type: 'uint256',
          },
          {
            internalType: 'bytes32',
            name: 'root',
            type: 'bytes32',
          },
        ],
        internalType: 'struct StorageTypes.State',
        name: 'depositState',
        type: 'tuple',
      },
      {
        components: [
          {
            internalType: 'uint256',
            name: 'nonce',
            type: 'uint256',
          },
          {
            internalType: 'bytes32',
            name: 'root',
            type: 'bytes32',
          },
        ],
        internalType: 'struct StorageTypes.State',
        name: 'withdrawalState',
        type: 'tuple',
      },
      {
        components: [
          {
            internalType: 'address',
            name: 'neoN3Token',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'fee',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'minAmount',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'maxAmount',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'maxDeposits',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'decimalScalingFactor',
            type: 'uint256',
          },
        ],
        internalType: 'struct StorageTypes.TokenConfig',
        name: 'config',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'tokenAddress',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'nonce',
        type: 'uint256',
      },
    ],
    name: 'tokenClaimables',
    outputs: [
      {
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'unclaimedRewards',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'unpauseBridge',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'unpauseNativeBridge',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_neoXToken',
        type: 'address',
      },
    ],
    name: 'unpauseTokenBridge',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'unpauseWithdrawals',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'newImplementation',
        type: 'address',
      },
      {
        internalType: 'bytes',
        name: 'data',
        type: 'bytes',
      },
    ],
    name: 'upgradeToAndCall',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'upgradeToV3',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_to',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: '_maxFee',
        type: 'uint256',
      },
    ],
    name: 'withdrawNative',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_neoXToken',
        type: 'address',
      },
      {
        internalType: 'address',
        name: '_to',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: '_amount',
        type: 'uint256',
      },
    ],
    name: 'withdrawToken',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'withdrawalsPaused',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    stateMutability: 'payable',
    type: 'receive',
  },
]
