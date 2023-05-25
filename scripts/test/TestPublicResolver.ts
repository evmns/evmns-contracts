import { HardhatRuntimeEnvironment } from 'hardhat/types/runtime'
import { namehash } from '../utils/namehash'
import { labelhash } from '../utils/labelhash'
import { formatsByCoinType, formatsByName } from '@ensdomains/address-encoder'

const hre = require('hardhat')
const { getNamedAccounts, deployments, network, ethers } = hre
const { deploy } = deployments

async function main() {
  const { deployer } = await getNamedAccounts()
  // 为了调试合约，您需要在这里创建或获取合约实例
  // 例如，您可以使用 ethers.js 的 ContractFactory：
  const publicResolver = await ethers.getContract('PublicResolver', deployer)

  const label = '999'
  const name = label + '.evm'
  const node = namehash(name)
  const cointype = 194
  const a = formatsByName['EOS']
  console.log('coinType:' + a.coinType)
  const decodestr = a.decoder(
    'EOS7hctUrtLvTBR2W1aHbTpDV7py5DGSvsqXasr3eSY9vmjonJCpE',
  )
  //const btc = formatsByCoinType[0].encoder(Buffer.from('a9148e5a071252f017f0249ece0bd5b7a5c2891f15d787','hex'))

  var res = await mutilcalls(
    [
      ['addr(bytes32,uint256)', node, cointype],
      ['text', node, 'key1'],
    ],
    publicResolver,
  )
  console.log('muticall1:')
  console.log(res)

  await mutilcallsSet(
    [
      ['setAddr(bytes32,uint256,bytes)', node, cointype, decodestr],
      ['setText', node, 'key1', 'v3'],
    ],
    publicResolver,
  )
  res = await mutilcalls(
    [
      ['addr(bytes32,uint256)', node, cointype],
      ['text', node, 'key1'],
    ],
    publicResolver,
  )
  console.log('muticall2:')
  console.log(res)

  console.log('test_reverse_sets')
  const reverseName = remove0x(deployer) + '.addr.reverse'
  const reverseNode = namehash(reverseName)
  console.log('test_reverseName:' + reverseName)
  console.log('test_reverseNode:' + reverseNode)
  await mutilcallsSet([['setName', reverseNode, name]], publicResolver)
  console.log('test_reverse_calls')

  res = await mutilcalls([['name', reverseNode]], publicResolver)
  console.log('test_reverse_call:')
  console.log(res)
}
async function mutilcallsSet(args: any, publicResolver: any) {
  var getData = []
  for (let key in args) {
    var arr = args[key]
    const type = arr.shift()
    getData.push(publicResolver.interface.encodeFunctionData(type, arr))
  }
  await publicResolver.multicall(getData)
}
async function mutilcalls(args: any[], publicResolver: any) {
  var getData: any = []
  var types: any[] = []
  for (let key in args) {
    var arr = args[key]
    const type = arr.shift()
    types[key] = type
    getData.push(publicResolver.interface.encodeFunctionData(type, arr))
  }
  const results = await publicResolver.callStatic.multicall(getData)
  const res: string[] = []
  results.forEach(function (result: string, key: any) {
    const type = types[key]
    const [response] = publicResolver.interface.decodeFunctionResult(
      type,
      result,
    )
    res.push(response)
  })
  return res
}
async function waitSeconds(sec: number) {
  await new Promise((resolve) => setTimeout(resolve, sec * 1000))
}
function remove0x(hexString: string): string {
  if (hexString.startsWith('0x')) {
    return hexString.substr(2)
  } else {
    return hexString
  }
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
