import { HardhatRuntimeEnvironment } from 'hardhat/types/runtime'
import { labelhash } from '../utils/labelhash'
const hre = require('hardhat')
const { getNamedAccounts, deployments, network, ethers } = hre
const { deploy } = deployments

import { namehash } from '../utils/namehash'
import packet from 'dns-packet'

async function main() {
  const { deployer } = await getNamedAccounts()
  // 为了调试合约，您需要在这里创建或获取合约实例
  // 例如，您可以使用 ethers.js 的 ContractFactory：
  var reverseRegistrar = await ethers.getContract('ReverseRegistrar', deployer)
  var label = '19912'
  var name = label + '.evm'
  const labels = name.split(name)

  const tx = await reverseRegistrar.setName(name)
  console.log(tx)
}

async function getName(contracts: any, address: string) {
  const reverseNode = `${address.toLowerCase().substring(2)}.addr.reverse`
  var data = contracts.interface.encodeFunctionData('reverse(bytes)', [
    hexEncodeName(reverseNode),
  ])

  if (data === null) return
  const universalResolver = await contracts?.getUniversalResolver()!
  const result = contracts.interface.decodeFunctionResult(
    'reverse(bytes)',
    data,
  )
  return {
    name: result['0'],
    match: result['1'].toLowerCase() === address.toLowerCase(),
    reverseResolverAddress: result['2'],
    resolverAddress: result['3'],
  }
}
function hexEncodeName(name: string) {
  return `0x${packet.name.encode(name).toString('hex')}`
}

function hexDecodeName(hex: string) {
  return packet.name.decode(Buffer.from(hex.slice(2), 'hex')).toString()
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
