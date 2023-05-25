import { HardhatRuntimeEnvironment } from 'hardhat/types/runtime'

const hre = require('hardhat')
const { getNamedAccounts, deployments, network, ethers } = hre
const { deploy } = deployments
interface Whitelist {
  [key: string]: string
}
async function main() {
  const { deployer } = await getNamedAccounts()
  var owner = deployer
  // 为了调试合约，您需要在这里创建或获取合约实例
  // 例如，您可以使用 ethers.js 的 ContractFactory：
  const ActivitiesRegistrarController = await ethers.getContract(
    'ActivitiesRegistrarController',
    deployer,
  )
  const publicResolver = await ethers.getContract('PublicResolver', deployer)
  const duration = 3600 * 24 * 365
  const name = '10006'
  const rentPrice = await ActivitiesRegistrarController.rentPrice(
    name,
    duration,
  )
  const pushPrice = (rentPrice.base * 1.05) / 1e18
  console.log('price:', pushPrice.toString())

  const valid = await ActivitiesRegistrarController.valid(name)
  console.log('valid:', valid)

  const available = await ActivitiesRegistrarController.availableWithOwner(
    name,
    owner,
  )

  console.log('available:', available)

  if (!available) {
    console.log('Name:' + name + '  is unavailable')
    return
  }

  var secret =
    '0x0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF'
  var resolver = publicResolver.address

  const commitment = await ActivitiesRegistrarController.makeCommitment(
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
  await ActivitiesRegistrarController.commit(commitment)
  console.log('commiting:' + name)
  await waitSeconds(6)

  console.log('registering:' + name)
  const res = await ActivitiesRegistrarController.register(
    name,
    owner,
    duration,
    secret,
    resolver,
    [],
    false,
    0,
    { value: ethers.utils.parseEther('10') },
  )
  // 还可以使用 console.log 和 debugger 语句打印和暂停调试器
  console.log(res)

  debugger // 调试器将在此停止，等待您继续
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
