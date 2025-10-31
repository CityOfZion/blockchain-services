declare global {
  namespace NodeJS {
    interface ProcessEnv {
      TEST_PRIVATE_KEY: string
      TEST_PRIVATE_KEY_TO_SWAP_TOKEN: string
      TEST_ETHEREUM_PRIVATE_KEY: string
      TEST_ADDRESS_TO_SWAP_TOKEN: string
      TEST_SWAP_ID: string
      TEST_XRP_ADDRESS_TO_SWAP_TOKEN: string
      TEST_XRP_EXTRA_ID_TO_SWAP_TOKEN: string
      TEST_BRIDGE_NEO3_PRIVATE_KEY: string
      TEST_BRIDGE_NEOX_PRIVATE_KEY: string
      TEST_BRIDGE_NEO3_RECEIVE_ADDRESS: string
      TEST_BRIDGE_NEOX_RECEIVE_ADDRESS: string
    }
  }
}

export {}
