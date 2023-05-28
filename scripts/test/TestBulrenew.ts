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
  var NameWrapper = await ethers.getContract('NameWrapper', deployer)
  const EVMNSRegistry = await ethers.getContract('EVMNSRegistry', deployer)
  const bulkRenewal = await ethers.getContract('StaticBulkRenewal', deployer)
  console.log('deployer:' + deployer)
  console.log(
    '.eth_resolver:' +
      (await EVMNSRegistry.resolver(
        '0x508b635792ccd7149e70e60de9be8731ce05ec4242c91d20e497968774e30bd1',
      )),
  )
  const duration = 365 * 24 * 3600

  var label = '19912'
  var name = label + '.evm'
  var label2 = '19913'
  var name2 = label2 + '.evm'
  const price =
    ethers.BigNumber.from(
      await bulkRenewal.rentPrice([label, label2], duration),
    ) * 1.05
  console.log('price:' + (price / 1e18).toString())

  console.log(
    'begin，' +
      name +
      '_expireDate:' +
      (await getExpire(name, NameWrapper)) +
      ' || ' +
      name2 +
      '_expireDate:' +
      (await getExpire(name2, NameWrapper)),
  )

  for (var i = 0; i < 5; i++) {
    const tx = await bulkRenewal.renewAll([label, label2], duration, {
      value: (price * 1.05).toString(),
    })
    console.log(
      name +
        '_expireDate:' +
        (await getExpire(name, NameWrapper)) +
        ' || ' +
        name2 +
        '_expireDate:' +
        (await getExpire(name2, NameWrapper)),
    )
  }
}
async function getExpire(
  name: string,
  nameWrapper: { getData: (arg0: string) => any },
) {
  var resdata = await nameWrapper.getData(namehash(name))
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
  return formattedDate
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
