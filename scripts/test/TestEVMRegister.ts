import { HardhatRuntimeEnvironment } from 'hardhat/types/runtime'

const hre = require('hardhat')
const { getNamedAccounts, deployments, network, ethers } = hre
const { deploy } = deployments

async function main() {
  const { deployer } = await getNamedAccounts()
  var owner = deployer
  // 为了调试合约，您需要在这里创建或获取合约实例
  // 例如，您可以使用 ethers.js 的 ContractFactory：
  const EVMRegistrarController = await ethers.getContract(
    'EVMRegistrarController',
    deployer,
  )
  const publicResolver = await ethers.getContract('PublicResolver', deployer)

  const name = '19912'
  const duration = 3600 * 24 * 365
  var rentPrice = await EVMRegistrarController.rentPrice(name, duration)
  var pushPrice = rentPrice.base * 1.05
  console.log('price:', (pushPrice / 1e18).toString())

  const valid = await EVMRegistrarController.valid(name)
  console.log('valid:', valid)

  const available = await EVMRegistrarController.available(name)

  console.log('available:', available)

  if (!available) {
    console.log('Name:' + name + '  is unavailable')
    return
  }
  var secret =
    '0x0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF'
  var resolver = publicResolver.address
  console.log('owner:' + owner)
  const commitment = await EVMRegistrarController.makeCommitment(
    name,
    owner,
    duration,
    secret,
    resolver,
    [],
    0,
    0,
  )
  console.log('commitment:', commitment)
  await EVMRegistrarController.commit(commitment)
  await waitSeconds(6)

  const res = await EVMRegistrarController.register(
    name,
    owner,
    duration,
    secret,
    resolver,
    [],
    false,
    0,
    { value: pushPrice.toString() },
  )
  // 还可以使用 console.log 和 debugger 语句打印和暂停调试器
  console.log(res)
  console.log('controller:' + EVMRegistrarController.address)
  debugger // 调试器将在此停止，等待您继续
}
async function waitSeconds(sec: number) {
  let count = 0
  await new Promise((resolve) => {
    const interval = setInterval(() => {
      count += 1
      console.log(`Elapsed time: ${count} seconds`)
      if (count >= sec) {
        clearInterval(interval)
        resolve(null)
      }
    }, 1000)
  })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
