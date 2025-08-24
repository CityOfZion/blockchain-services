import { TNetworkId } from '@cityofzion/blockchain-service'
import { MoralisEDSEthereum } from '../services/exchange-data/MoralisEDSEthereum'
import { BSEthereumHelper } from '../helpers/BSEthereumHelper'
import { BSEthereum } from '../BSEthereum'

let service: BSEthereum<'test', TNetworkId>
let moralisEDSEthereum: MoralisEDSEthereum<'test', TNetworkId>

describe('MoralisEDSEthereum', () => {
  beforeAll(() => {
    service = new BSEthereum('test')
    moralisEDSEthereum = new MoralisEDSEthereum(service)
  })

  it('Should return the ETH price in USD', async () => {
    const tokenPriceList = await moralisEDSEthereum.getTokenPrices({
      tokens: [BSEthereumHelper.getNativeAsset(service.network)],
    })
    expect(tokenPriceList).toHaveLength(1)
    expect(tokenPriceList[0]).toEqual({
      usdPrice: expect.any(Number),
      token: BSEthereumHelper.getNativeAsset(service.network),
    })
  })

  it('Should return a list with prices of tokens in USD', async () => {
    const tokenPriceList = await moralisEDSEthereum.getTokenPrices({
      tokens: [
        {
          decimals: 18,
          hash: '0xfedae5642668f8636a11987ff386bfd215f942ee',
          name: 'PolicyPal Network Token',
          symbol: 'PAL',
        },
        {
          decimals: 18,
          hash: '0xfe0c30065b384f05761f15d0cc899d4f9f9cc0eb',
          name: 'ether.fi governance token',
          symbol: 'ETHFI',
        },
        {
          decimals: 18,
          hash: '0xfcf8eda095e37a41e002e266daad7efc1579bc0a',
          name: 'FLEX Coin',
          symbol: 'FLEX',
        },
        {
          decimals: 18,
          hash: '0xfb2f26f266fb2805a387230f2aa0a331b4d96fba',
          name: 'DADI',
          symbol: 'DADI',
        },
        {
          decimals: 18,
          hash: '0xfae4ee59cdd86e3be9e8b90b53aa866327d7c090',
          name: 'CPChain',
          symbol: 'CPC',
        },
        {
          decimals: 18,
          hash: '0xf6d8213c2b9ee9ac1e0afc808e7e889d7d077cae',
          name: 'TreeDAO Tree Token',
          symbol: 'Trees',
        },
        {
          decimals: 18,
          hash: '0xf6276830c265a779a2225b9d2fcbab790cbeb92b',
          name: 'XCELTOKEN',
          symbol: 'XCEL',
        },
        {
          decimals: 18,
          hash: '0xf509cdcdf44a0bcd2953ce3f03f4b433ef6e4c44',
          name: 'Fomoverse Token',
          symbol: 'FOMO',
        },
        {
          decimals: 18,
          hash: '0xf4b2a78f4e79f074f2b2e7cf3ea2a8f8d867fc21',
          name: 'Shintoshi AI',
          symbol: 'ShintoshiAI',
        },
        {
          decimals: 18,
          hash: '0xf3e014fe81267870624132ef3a646b8e83853a96',
          name: 'VIN',
          symbol: 'VIN',
        },
        {
          decimals: 18,
          hash: '0xf203ca1769ca8e9e8fe1da9d147db68b6c919817',
          name: 'Wrapped NCG',
          symbol: 'WNCG',
        },
        {
          decimals: null,
          hash: '0xf08fc026ca9f91662f322e839bacc4768671a961',
          name: null,
          symbol: null,
        },
        {
          decimals: 18,
          hash: '0xf01c994e79586eeef069d3603abae385d64df0e6',
          name: 'Staked CryptoGPT Token',
          symbol: 'stGPT',
        },
        {
          decimals: 18,
          hash: '0xe2d82dc7da0e6f882e96846451f4fabcc8f90528',
          name: 'Jesus Coin',
          symbol: 'JC',
        },
        {
          decimals: 18,
          hash: '0xdf44a80c17813789f60090638827aeb23698b122',
          name: 'stableDEX',
          symbol: 'STDEX',
        },
        {
          decimals: 6,
          hash: '0xdac17f958d2ee523a2206206994597c13d831ec7',
          name: 'Tether USD',
          symbol: 'USDT',
        },
        {
          decimals: 18,
          hash: '0xda754d0b8e7a4a5597e3f3c09593e1621dc9f6d1',
          name: 'World Cup Pot',
          symbol: 'WCP',
        },
        {
          decimals: 18,
          hash: '0xd9a12cde03a86e800496469858de8581d3a5353d',
          name: 'YUP',
          symbol: 'YUP',
        },
        {
          decimals: 18,
          hash: '0xd81b71cbb89b2800cdb000aa277dc1491dc923c3',
          name: 'NFTMart Token',
          symbol: 'NMT',
        },
        {
          decimals: null,
          hash: '0xef68e7c694f40c8202821edf525de3782458639f',
          name: null,
          symbol: null,
        },
        {
          decimals: 18,
          hash: '0xeccab39acb2caf9adba72c1cb92fdc106b993e0b',
          name: 'Azbit',
          symbol: 'AZ',
        },
        {
          decimals: 18,
          hash: '0xe8524434131bfde8ead553859ad42c8798c68a91',
          name: 'Corruption Gold',
          symbol: 'CGLD',
        },
        {
          decimals: 18,
          hash: '0xe7f445b93eb9cdabfe76541cc43ff8de930a58e6',
          name: 'xFORCE',
          symbol: 'xFORCE',
        },
        {
          decimals: 4,
          hash: '0xe530441f4f73bdb6dc2fa5af7c3fc5fd551ec838',
          name: 'GSENetwork',
          symbol: 'GSE',
        },
        {
          decimals: 18,
          hash: '0xbddab785b306bcd9fb056da189615cc8ece1d823',
          name: 'Ebakus',
          symbol: 'EBK',
        },
        {
          decimals: 5,
          hash: '0xbc0899e527007f1b8ced694508fcb7a2b9a46f53',
          name: 'BSKT',
          symbol: 'BSKT',
        },
        {
          decimals: 18,
          hash: '0xbbff862d906e348e9946bfb2132ecb157da3d4b4',
          name: 'Sharder',
          symbol: 'SS',
        },
        {
          decimals: 18,
          hash: '0xba5bde662c17e2adff1075610382b9b691296350',
          name: 'SuperRare',
          symbol: 'RARE',
        },
        {
          decimals: 10,
          hash: '0xb9b4cfe4194d7e8511aa9b9f1260bc7b9634249e',
          name: 'REGA Risk Sharing preICO Token',
          symbol: 'RST-P',
        },
        {
          decimals: 18,
          hash: '0xb4bebd34f6daafd808f73de0d10235a92fbb6c3d',
          name: 'Yearn Ecosystem Token Index',
          symbol: 'YETI',
        },
        {
          decimals: 18,
          hash: '0xb31c219959e06f9afbeb36b388a4bad13e802725',
          name: 'ONOT',
          symbol: 'ONOT',
        },
        {
          decimals: 18,
          hash: '0xb23d80f5fefcddaa212212f028021b41ded428cf',
          name: 'Prime',
          symbol: 'PRIME',
        },
        {
          decimals: 18,
          hash: '0xb1dc9124c395c1e97773ab855d66e879f053a289',
          name: 'yAxis',
          symbol: 'YAX',
        },
        {
          decimals: 0,
          hash: '0xaf47ebbd460f21c2b3262726572ca8812d7143b0',
          name: 'Promodl',
          symbol: 'PMOD',
        },
        {
          decimals: 18,
          hash: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
          name: 'Liquid staked Ether 2.0',
          symbol: 'stETH',
        },
        {
          decimals: 8,
          hash: '0xae66d00496aaa25418f829140bb259163c06986e',
          name: 'Super Wallet Token',
          symbol: 'SW',
        },
        {
          decimals: 18,
          hash: '0xadebeafcdcf5de0a5a7f7dfdd467b0e9fb205be9',
          name: 'OCP',
          symbol: 'OCP',
        },
        {
          decimals: 18,
          hash: '0xa54ddc7b3cce7fc8b1e3fa0256d0db80d2c10970',
          name: 'NEVERDIE',
          symbol: 'NDC',
        },
        {
          decimals: 18,
          hash: '0xa38b7ee9df79955b90cc4e2de90421f6baa83a3d',
          name: 'MonkeyCoin',
          symbol: 'MC',
        },
        {
          decimals: 18,
          hash: '0xa2dca1505b07e39f96ce41e875b447f46d50c6fc',
          name: 'Ethercash（以太现金）',
          symbol: 'ETHS',
        },
        {
          decimals: 6,
          hash: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          name: 'USD Coin',
          symbol: 'USDC',
        },
        {
          decimals: 18,
          hash: '0x9f284e1337a815fe77d2ff4ae46544645b20c5ff',
          name: 'Darwinia Commitment Token',
          symbol: 'KTON',
        },
        {
          decimals: 18,
          hash: '0x9eec65e5b998db6845321baa915ec3338b1a469b',
          name: 'OnlyChain',
          symbol: 'Only',
        },
        {
          decimals: 8,
          hash: '0x9e6b2b11542f2bc52f3029077ace37e8fd838d7f',
          name: 'Hacken',
          symbol: 'HKN',
        },
        {
          decimals: 18,
          hash: '0x9d39a5de30e57443bff2a8307a4256c8797a3497',
          name: 'Staked USDe',
          symbol: 'sUSDe',
        },
        {
          decimals: 18,
          hash: '0xad4f86a25bbc20ffb751f2fac312a0b4d8f88c64',
          name: 'OptionRoom Token',
          symbol: 'ROOM',
        },
        {
          decimals: 18,
          hash: '0xacd43e627e64355f1861cec6d3a6688b31a6f952',
          name: 'yearn Dai Stablecoin',
          symbol: 'yDAI',
        },
        {
          decimals: 18,
          hash: '0xab95e915c123fded5bdfb6325e35ef5515f1ea69',
          name: 'XENON',
          symbol: 'XNN',
        },
        {
          decimals: 9,
          hash: '0xa735a3af76cc30791c61c10d585833829d36cbe0',
          name: 'Image Generation AI | imgnAI.com',
          symbol: 'imgnAI',
        },
        {
          decimals: 18,
          hash: '0xa6dd98031551c23bb4a2fbe2c4d524e8f737c6f7',
          name: 'Tokenfy',
          symbol: 'TKNFY',
        },
        {
          decimals: 18,
          hash: '0xa64bd6c70cb9051f6a9ba1f163fdc07e0dfb5f84',
          name: 'Aave Interest bearing LINK',
          symbol: 'aLINK',
        },
        {
          decimals: 18,
          hash: '0x8f7b0b40e27e357540f90f187d90ce06366ac5a5',
          name: 'Value Chain',
          symbol: 'VLC',
        },
        {
          decimals: 18,
          hash: '0x8f26d7bab7a73309141a291525c965ecdea7bf42',
          name: 'Shells',
          symbol: 'SHL',
        },
        {
          decimals: 18,
          hash: '0x8e30ea2329d95802fd804f4291220b0e2f579812',
          name: 'Decentralized Vulnerability Platform',
          symbol: 'DVP',
        },
        {
          decimals: 18,
          hash: '0x8c4e7f814d40f8929f9112c5d09016f923d34472',
          name: 'XCELTOKEN PLUS',
          symbol: 'XLAB',
        },
        {
          decimals: 18,
          hash: '0x8c211128f8d232935afd80543e442f894a4355b7',
          name: 'scientificcoin',
          symbol: 'SNcoin',
        },
        {
          decimals: 8,
          hash: '0xc92e74b131d7b1d46e60e07f3fae5d8877dd03f0',
          name: 'Minereum',
          symbol: 'MNE',
        },
        {
          decimals: 5,
          hash: '0xc5bbae50781be1669306b9e001eff57a2957b09d',
          name: 'Gifto',
          symbol: 'GTO',
        },
        {
          decimals: 18,
          hash: '0xc3c6cf6bbca7b759d23a2586e80f795c57a32bef',
          name: 'lUSD',
          symbol: 'lUSD',
        },
        {
          decimals: 18,
          hash: '0xc0844fdf1bcbde59a3af0859455d964d350a2cb6',
          name: 'ROYAL',
          symbol: 'ROYAL',
        },
        {
          decimals: 18,
          hash: '0x64d91f12ece7362f91a6f8e7940cd55f05060b92',
          name: 'Burn',
          symbol: 'ASH',
        },
        {
          decimals: 18,
          hash: '0x62b9c7356a2dc64a1969e19c23e4f579f9810aa7',
          name: 'Convex CRV',
          symbol: 'cvxCRV',
        },
        {
          decimals: 18,
          hash: '0x5eac95ad5b287cf44e058dcf694419333b796123',
          name: 'AICRYPTO',
          symbol: 'AIC',
        },
        {
          decimals: 18,
          hash: '0x5ca381bbfb58f0092df149bd3d243b08b9a8386e',
          name: 'MXCToken',
          symbol: 'MXC',
        },
        {
          decimals: 6,
          hash: '0x5c406d99e04b8494dc253fcc52943ef82bca7d75',
          name: 'cUSD Currency',
          symbol: 'cUSD',
        },
        {
          decimals: 18,
          hash: '0x57e114b691db790c35207b2e685d4a43181e6061',
          name: 'ENA',
          symbol: 'ENA',
        },
        {
          decimals: 18,
          hash: '0x0000a1c00009a619684135b824ba02f7fbf3a572',
          name: 'Alchemy',
          symbol: 'ALCH',
        },
        {
          decimals: 18,
          hash: '0x3505f494c3f0fed0b594e01fa41dd3967645ca39',
          name: 'SWARM',
          symbol: 'SWM',
        },
        {
          decimals: 18,
          hash: '0x31a2e08f4232329e4eddb025c0275f43c9cd56d7',
          name: 'lUSD',
          symbol: 'lUSD',
        },
        {
          decimals: 8,
          hash: '0x2fa32a39fc1c399e0cc7b2935868f5165de7ce97',
          name: 'PayFair Token',
          symbol: 'PFR',
        },
        {
          decimals: 6,
          hash: '0x2f08119c6f07c006695e079aafc638b8789faf18',
          name: 'yearn Tether USD',
          symbol: 'yUSDT',
        },
        {
          decimals: 18,
          hash: '0x423071774c43c0aaf4210b439e7cda8c797e2f26',
          name: 'GALAXIS Token',
          symbol: 'GALAXIS',
        },
        {
          decimals: 18,
          hash: '0x420ab548b18911717ed7c4ccbf46371ea758458c',
          name: 'NOODLE.Finance',
          symbol: 'NOODLE',
        },
        {
          decimals: 8,
          hash: '0x41e5560054824ea6b0732e656e3ad64e20e94e45',
          name: 'Civic',
          symbol: 'CVC',
        },
        {
          decimals: 18,
          hash: '0x4162178b78d6985480a308b2190ee5517460406d',
          name: 'Colu Local Network',
          symbol: 'CLN',
        },
        {
          decimals: 18,
          hash: '0x3da85b2a7cf6f3ccec6953776161750681a7560f',
          name: 'Sp estate token',
          symbol: 'SPC',
        },
        {
          decimals: null,
          hash: '0x38c6a68304cdefb9bec48bbfaaba5c5b47818bb2',
          name: null,
          symbol: null,
        },
        {
          decimals: 18,
          hash: '0x3833dda0aeb6947b98ce454d89366cba8cc55528',
          name: 'SPHTX',
          symbol: 'SPHTX',
        },
        {
          decimals: 8,
          hash: '0x3832d2f059e55934220881f831be501d180671a7',
          name: 'renDOGE',
          symbol: 'renDOGE',
        },
        {
          decimals: 18,
          hash: '0x35fa164735182de50811e8e2e824cfb9b6118ac2',
          name: 'ether.fi ETH',
          symbol: 'eETH',
        },
        {
          decimals: 18,
          hash: '0x09a3ecafa817268f77be1283176b946c4ff2e608',
          name: 'Wrapped MIR Token',
          symbol: 'MIR',
        },
        {
          decimals: 4,
          hash: '0x08130635368aa28b217a4dfb68e1bf8dc525621c',
          name: 'AfroDex',
          symbol: 'AfroX',
        },
        {
          decimals: 18,
          hash: '0x0538a9b4f4dcb0cb01a7fa34e17c0ac947c22553',
          name: 'Court Token',
          symbol: 'COURT',
        },
        {
          decimals: 18,
          hash: '0x4993cb95c7443bdc06155c5f5688be9d8f6999a5',
          name: 'ROUND',
          symbol: 'ROUND',
        },
        {
          decimals: 18,
          hash: '0x491c9a23db85623eed455a8efdd6aba9b911c5df',
          name: 'HeroNodeToken',
          symbol: 'HER',
        },
        {
          decimals: 18,
          hash: '0x48af7b1c9dac8871c064f62fcec0d9d6f7c269f5',
          name: '.alpha',
          symbol: 'α',
        },
        {
          decimals: 18,
          hash: '0x46c5098f73fa656e82d7e9afbf3c00b32b7b1ee2',
          name: 'Staked BPT',
          symbol: 'xBPT',
        },
        {
          decimals: 18,
          hash: '0x443d2f2755db5942601fa062cc248aaa153313d3',
          name: 'Empty Set Dollar Stake',
          symbol: 'ESDS',
        },
        {
          decimals: 8,
          hash: '0x426ca1ea2406c07d75db9585f22781c096e3d0e0',
          name: 'Minereum',
          symbol: 'MNE',
        },
        {
          decimals: 18,
          hash: '0x424242115b5bbdc12a1f5c06dd8dd0ddd03c321d',
          name: 'AI42 Dust',
          symbol: 'DUST',
        },
        {
          decimals: 6,
          hash: '0x16772a7f4a3ca291c21b8ace76f9332ddffbb5ef',
          name: 'Ribbon USDC Theta Vault ETH Put',
          symbol: 'rUSDC-ETH-P-THETA',
        },
        {
          decimals: 18,
          hash: '0x143832e4bc4757114d4610fef606ec0a7a3c02d0',
          name: 'Rubicon Financial Technologies',
          symbol: 'RFT',
        },
        {
          decimals: 0,
          hash: '0x127cae460d6e8d039f1371f54548190efe73e756',
          name: 'ShiftCashExtraBonus',
          symbol: 'SCB',
        },
        {
          decimals: 18,
          hash: '0x1234567461d3f8db7496581774bd869c83d51c93',
          name: 'BitClave',
          symbol: 'CAT',
        },
        {
          decimals: 9,
          hash: '0x11ca76e90d27aa92d67757bcd84bcb0047030b51',
          name: 'AMGS',
          symbol: 'AMGS',
        },
        {
          decimals: 18,
          hash: '0x0f71b8de197a1c84d31de0f1fa7926c365f052b3',
          name: 'Arcona Distribution Contract',
          symbol: 'ARCONA',
        },
        {
          decimals: 9,
          hash: '0xd6e49800decb64c0e195f791348c1e87a5864fd7',
          name: 'ReceiptCoin',
          symbol: 'RC',
        },
        {
          decimals: 18,
          hash: '0xd4ae0807740df6fbaa7a258907132a2ac8d52fbc',
          name: 'KEOSToken',
          symbol: 'KEOS',
        },
        {
          decimals: 18,
          hash: '0xd49ff13661451313ca1553fd6954bd1d9b6e02b9',
          name: 'ElectrifyAsia',
          symbol: 'ELEC',
        },
        {
          decimals: 18,
          hash: '0xd2877702675e6ceb975b4a1dff9fb7baf4c91ea9',
          name: 'Wrapped LUNA Token',
          symbol: 'LUNA',
        },
        {
          decimals: 18,
          hash: '0xd037a81b22e7f814bc6f87d50e5bd67d8c329fa2',
          name: 'EMO tokens',
          symbol: 'EMO',
        },
        {
          decimals: 18,
          hash: '0xd0352a019e9ab9d757776f532377aaebd36fd541',
          name: 'Fusion Token',
          symbol: 'FSN',
        },
        {
          decimals: 18,
          hash: '0xceefb64bf3cf872b3be1af31c79636901e422deb',
          name: 'Neow',
          symbol: 'NEOW',
        },
        {
          decimals: 8,
          hash: '0xce4fe9b4b8ff61949dcfeb7e03bc9faca59d2eb3',
          name: 'Cream Balancer',
          symbol: 'crBAL',
        },
        {
          decimals: 18,
          hash: '0xcdcfc0f66c522fd086a1b725ea3c0eeb9f9e8814',
          name: 'Aurora DAO',
          symbol: 'AURA',
        },
        {
          decimals: 0,
          hash: '0xcce629ba507d7256cce7d30628279a155c5309c5',
          name: 'Asobicoin promo',
          symbol: 'ABXP',
        },
        {
          decimals: 8,
          hash: '0x9b11efcaaa1890f6ee52c6bb7cf8153ac5d74139',
          name: 'Attention Token of Media',
          symbol: 'ATM',
        },
        {
          decimals: 18,
          hash: '0x9ae380f0272e2162340a5bb646c354271c0f5cfc',
          name: 'Conic Finance Token',
          symbol: 'CNC',
        },
        {
          decimals: 18,
          hash: '0x9992ec3cf6a55b00978cddf2b27bc6882d88d1ec',
          name: 'Polymath',
          symbol: 'POLY',
        },
        {
          decimals: 18,
          hash: '0x981dc247745800bd2ca28a4bf147f0385eaa0bc0',
          name: 'NutsDAO',
          symbol: 'NUTS',
        },
        {
          decimals: 18,
          hash: '0x977b0584b50cdd64e2f8185b682a1f256448c7c8',
          name: 'CGW',
          symbol: 'CGW',
        },
        {
          decimals: 18,
          hash: '0x974e34a24cf2a9aed2386f41dea9117d309f9478',
          name: 'ATEC',
          symbol: 'ATEC',
        },
        {
          decimals: 18,
          hash: '0x5283d291dbcf85356a21ba090e6db59121208b44',
          name: 'Blur',
          symbol: 'BLUR',
        },
        {
          decimals: 18,
          hash: '0x519475b31653e46d20cd09f9fdcf3b12bdacb4f5',
          name: 'VIU',
          symbol: 'VIU',
        },
        {
          decimals: 18,
          hash: '0x515669d308f887fd83a471c7764f5d084886d34d',
          name: 'MUXE Token',
          symbol: 'MUXE',
        },
        {
          decimals: 18,
          hash: '0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b',
          name: 'Convex Token',
          symbol: 'CVX',
        },
        {
          decimals: 18,
          hash: '0x4dc3643dbc642b72c158e7f3d2ff232df61cb6ce',
          name: 'Amber Token',
          symbol: 'AMB',
        },
        {
          decimals: 18,
          hash: '0x4da27a545c0c5b758a6ba100e3a049001de870f5',
          name: 'Staked Aave',
          symbol: 'stkAAVE',
        },
        {
          decimals: 18,
          hash: '0x7c5d5100b339fe7d995a893af6cb496b9474373c',
          name: 'Loon Network',
          symbol: 'LOON',
        },
        {
          decimals: 18,
          hash: '0x7b94a1281db0335c9efd68aca5c98b494d775c70',
          name: 'Path Network Token',
          symbol: 'PATH',
        },
        {
          decimals: 18,
          hash: '0x78d9a9355a7823887868492c47368956ea473618',
          name: 'BastardToken',
          symbol: 'BASTARD',
        },
        {
          decimals: 18,
          hash: '0x77f0cc420dea0ae726db6bef1460a4b69176a8ea',
          name: 'KONG Land Alpha Citizenship',
          symbol: 'CITIZEN',
        },
        {
          decimals: 18,
          hash: '0x77599d2c6db170224243e255e6669280f11f1473',
          name: 'Opacity',
          symbol: 'OPQ',
        },
        {
          decimals: 18,
          hash: '0x72f29a3fdc7fe0d4d1d69e4a16763919dd9d7817',
          name: 'Land',
          symbol: 'LAND',
        },
        {
          decimals: 18,
          hash: '0x727f064a78dc734d33eec18d5370aef32ffd46e4',
          name: 'Orion Money Token',
          symbol: 'ORION',
        },
        {
          decimals: 8,
          hash: '0x71f1bc89f38b241f3ebf0d5a013fa2850c63a1d4',
          name: 'Zloadr Token',
          symbol: 'ZDR',
        },
        {
          decimals: 0,
          hash: '0x70bda5a9130a93541960320a09812da1cdaf38f2',
          name: 'WCDS挖头矿在即，全新DeFi资管平台WcdSwap即将创世挖矿，持WCDS/WBTC的LPtoken的用户，可竞享百倍收益！',
          symbol: 'WCDS挖头矿在即，全新DeFi资管平台WcdSwap即将创世挖矿，持WCDS/WBTC的LPtoken的用户，可竞享百倍收益！',
        },
        {
          decimals: 18,
          hash: '0x7079bb3222e8ec25056d62eaf494420bbc965f7e',
          name: 'W-DAI',
          symbol: 'Warp-Dai Stablecoin',
        },
        {
          decimals: 18,
          hash: '0x6beb418fc6e1958204ac8baddcf109b8e9694966',
          name: 'Linker Coin',
          symbol: 'LNC',
        },
        {
          decimals: 18,
          hash: '0x68e14bb5a45b9681327e16e528084b9d962c1a39',
          name: 'BitClave - Consumer Activity Token',
          symbol: 'CAT',
        },
        {
          decimals: 18,
          hash: '0x667965ed64a7fe180f3d10db398d95817c6a1f68',
          name: 'CryptoDonater Token',
          symbol: 'DOTO',
        },
        {
          decimals: 18,
          hash: '0x64e39084fce774b6e892e5a4da5a9032d7436871',
          name: 'AV DAO',
          symbol: 'Avault.fi',
        },
        {
          decimals: 18,
          hash: '0x24692791bc444c5cd0b81e3cbcaba4b04acd1f3b',
          name: 'UnikoinGold',
          symbol: 'UKG',
        },
        {
          decimals: null,
          hash: '0x239674c92872a62b7c13acc30425081f97915deb',
          name: null,
          symbol: null,
        },
        {
          decimals: 18,
          hash: '0x208a9c9d8e1d33a4f5b371bf1864aa125379ba1b',
          name: 'Asense.fi',
          symbol: 'Asense.fi Yield Finance',
        },
        {
          decimals: 9,
          hash: '0x1b8e12f839bd4e73a47addf76cf7f0097d74c14c',
          name: 'Value USD',
          symbol: 'vUSD',
        },
        {
          decimals: 0,
          hash: '0x194ee036eadb8858713ddb5155e5fa0fdab82cac',
          name: 'World Wifi Bonus',
          symbol: 'WifiB',
        },
        {
          decimals: 18,
          hash: '0x1844b21593262668b7248d0f57a220caaba46ab9',
          name: 'Oyster Pearl',
          symbol: 'PRL',
        },
        {
          decimals: 18,
          hash: '0x17e67d1cb4e349b9ca4bc3e17c7df2a397a7bb64',
          name: 'Freyr Coin',
          symbol: 'FREC',
        },
        {
          decimals: 18,
          hash: '0x8b353021189375591723e7384262f45709a3c3dc',
          name: 'Tomocoin',
          symbol: 'TOMO',
        },
        {
          decimals: 18,
          hash: '0x8a9c67fee641579deba04928c4bc45f66e26343a',
          name: 'Jarvis Reward Token',
          symbol: 'JRT',
        },
        {
          decimals: 18,
          hash: '0x8713d26637cf49e1b6b4a7ce57106aabc9325343',
          name: 'CNN Token',
          symbol: 'CNN',
        },
        {
          decimals: 18,
          hash: '0x86fa049857e0209aa7d9e616f7eb3b3b78ecfdb0',
          name: '',
          symbol: 'EOS',
        },
        {
          decimals: 18,
          hash: '0x86cc39e9f575667b56871274f2f0a3cc43b9eb88',
          name: 'Opensea Traders',
          symbol: 'OST',
        },
        {
          decimals: 18,
          hash: '0x809826cceab68c387726af962713b64cb5cb3cca',
          name: 'NucleusVision',
          symbol: 'nCash',
        },
        {
          decimals: 18,
          hash: '0x7e9e431a0b8c4d532c745b1043c7fa29a48d4fba',
          name: 'eosDAC Community Owned EOS Block Producer ERC20 Tokens',
          symbol: 'eosDAC',
        },
        {
          decimals: 18,
          hash: '0x2c31b10ca416b82cec4c5e93c615ca851213d48d',
          name: 'Force DAO',
          symbol: 'FORCE',
        },
        {
          decimals: 18,
          hash: '0x29a5c1db7321c5c9eae57f9366ee8eef00ca11fb',
          name: 'SHKOOBY INU',
          symbol: 'SHKOOBY',
        },
        {
          decimals: 9,
          hash: '0x27e4a6ded8cdec86cdefe55f56b8ca1e2a4f6584',
          name: 'ChatGPT',
          symbol: 'AI',
        },
        {
          decimals: 18,
          hash: '0x27702a26126e0b3702af63ee09ac4d1a084ef628',
          name: 'aleph.im v2',
          symbol: 'ALEPH',
        },
        {
          decimals: 18,
          hash: '0x2630997aab62fa1030a8b975e1aa2dc573b18a13',
          name: 'HYPE Token',
          symbol: 'HYPE',
        },
        {
          decimals: 18,
          hash: '0x2604fa406be957e542beb89e6754fcde6815e83f',
          name: 'Playkey Token',
          symbol: 'PKT',
        },
        {
          decimals: 18,
          hash: '0x24f4f266fbd133db5b4c6906df292506b695bee5',
          name: 'MEDSToken',
          symbol: 'MEDS',
        },
        {
          decimals: 18,
          hash: '0x4d829f8c92a6691c56300d020c9e0db984cfe2ba',
          name: 'CoinCrowd',
          symbol: 'XCC',
        },
        {
          decimals: 18,
          hash: '0x4c218ac55d53e9de63214f7dde5b4db2a5d48ed3',
          name: 'Oyster Akoya',
          symbol: 'AKYE',
        },
      ] as any,
    })

    tokenPriceList.forEach(tokenPrice => {
      expect(tokenPrice).toEqual({
        usdPrice: expect.any(Number),
        token: {
          decimals: expect.any(Number),
          hash: expect.any(String),
          name: expect.any(String),
          symbol: expect.any(String),
        },
      })
    })
  })

  it('Should return the BRL currency ratio', async () => {
    const ratio = await moralisEDSEthereum.getCurrencyRatio('BRL')

    expect(ratio).toEqual(expect.any(Number))
  })

  it('Should return EUR currency ratio', async () => {
    const ratio = await moralisEDSEthereum.getCurrencyRatio('EUR')

    expect(ratio).toEqual(expect.any(Number))
  })

  it("Should return the token's price history", async () => {
    const tokenPriceHistory = await moralisEDSEthereum.getTokenPriceHistory({
      token: BSEthereumHelper.getNativeAsset(service.network),
      limit: 24,
      type: 'hour',
    })

    tokenPriceHistory.forEach(tokenPrice => {
      expect(tokenPrice).toEqual({
        usdPrice: expect.any(Number),
        timestamp: expect.any(Number),
        token: BSEthereumHelper.getNativeAsset(service.network),
      })
    })
  })
})
