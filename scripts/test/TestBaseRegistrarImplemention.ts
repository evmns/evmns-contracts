import { HardhatRuntimeEnvironment } from 'hardhat/types/runtime'
import { labelhash } from '../utils/labelhash'

const hre = require('hardhat')
const { getNamedAccounts, deployments, network, ethers } = hre
const { deploy } = deployments
import Web3 from 'web3'

async function main() {
  const { deployer } = await getNamedAccounts()
  // 为了调试合约，您需要在这里创建或获取合约实例
  // 例如，您可以使用 ethers.js 的 ContractFactory：
  var baseRegistrarImplementation = await ethers.getContract(
    'BaseRegistrarImplementation',
    deployer,
  )

  var nameWrapper = await ethers.getContract('NameWrapper', deployer)

  console.log(
    'baseRegistrarImplementation:' + baseRegistrarImplementation.address,
  )
  const name = '10002.evm'
  const label = labelhash('10002')
  const to = '0x2c8aF87F2875283FdC136ccfF5b0DF4D45A65F39'
  console.log(name + '_labelhash:' + label)

  var tx = await baseRegistrarImplementation[
    'transferFrom(address,address,uint256)'
  ](deployer, to, label, { gasLimit: 500000 })
  console.log('blockhash:' + tx.blockHash)

  tx = await baseRegistrarImplementation[
    'transferFrom(address,address,uint256)'
  ](nameWrapper.address, deployer, label, { gasLimit: 500000 })
  console.log('blockhash:' + tx.blockHash)

  tx = await baseRegistrarImplementation[
    'transferFrom(address,address,uint256)'
  ](nameWrapper.address, to, label, { gasLimit: 500000 })
  console.log('blockhash:' + tx.blockHash)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
