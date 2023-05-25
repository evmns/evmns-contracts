import { HardhatRuntimeEnvironment } from 'hardhat/types/runtime'
import { labelhash } from '../utils/labelhash'
const hre = require('hardhat')
const { getNamedAccounts, deployments, network, ethers } = hre
const { deploy } = deployments

import { namehash } from '../utils/namehash'

async function main() {
  const { deployer } = await getNamedAccounts()
  // 为了调试合约，您需要在这里创建或获取合约实例
  // 例如，您可以使用 ethers.js 的 ContractFactory：
  const ENSRegistry = await ethers.getContract('ENSRegistry', deployer)
  const DummyOracle = await ethers.getContract('DummyOracle', deployer)
  var NameWrapper = await ethers.getContract('NameWrapper', deployer)
  const EVMRegistrarController = await ethers.getContract(
    'EVMRegistrarController',
    deployer,
  )
  console.log('deployer:' + deployer)
  var label = '19912'
  var name = label + '.evm'
  const labels = name.split('.')
  console.log('lastestPrice:' + (await DummyOracle.latestAnswer()))
  console.log(name + '_owner:' + (await ENSRegistry.owner(namehash(name))))
  console.log(name + '_ownerOf:' + (await NameWrapper.ownerOf(namehash(name))))
  var resdata = await NameWrapper.getData(namehash(name))
  console.log(name + '_nameData:' + resdata)
  var date = new Date(resdata[2] * 1000)
  var formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1)
    .toString()
    .padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date
    .getHours()
    .toString()
    .padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date
    .getSeconds()
    .toString()
    .padStart(2, '0')}`
  console.log(name + '_expireDate:' + formattedDate)
  await EVMRegistrarController.renew(label, 3600 * 24 * 365, {
    value: ethers.utils.parseEther('10'),
  })
  resdata = await NameWrapper.getData(namehash(name))
  console.log(name + '_nameData:' + resdata)
  date = new Date(resdata[2] * 1000)
  formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1)
    .toString()
    .padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date
    .getHours()
    .toString()
    .padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date
    .getSeconds()
    .toString()
    .padStart(2, '0')}`
  console.log(name + '_expireDate:' + formattedDate)
  /*var tx = await NameWrapper.unwrap(bytes32 parentNode,bytes32 labelhash,address controller

  var tx = await ENSRegistry.setOwner(namehash(name),deployer,{gasLimit:50000});
  console.log(tx.blockHash)*/
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
