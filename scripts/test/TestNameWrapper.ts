import { HardhatRuntimeEnvironment } from 'hardhat/types/runtime'
import { labelhash } from '../utils/labelhash'
import { namehash } from '../utils/namehash'

const hre = require('hardhat')
const { getNamedAccounts, deployments, network, ethers } = hre
const { deploy } = deployments

async function main() {
  const { deployer } = await getNamedAccounts()
  // 为了调试合约，您需要在这里创建或获取合约实例
  // 例如，您可以使用 ethers.js 的 ContractFactory：
  const NameWrapper = await ethers.getContract('NameWrapper', deployer)

  console.log('NameWrapperAddress:' + NameWrapper.address)

  const label = '1994'
  const name = label + '.evm'

  const namehashstr = namehash(name)
  const to = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'

  var tx = await NameWrapper.safeTransferFrom(
    deployer,
    to,
    namehashstr,
    1,
    '0x',
  )
  await tx.wait()
  console.log('blockhash:' + tx)
}
async function waitSeconds(sec: number) {
  await new Promise((resolve) => setTimeout(resolve, sec * 1000))
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
