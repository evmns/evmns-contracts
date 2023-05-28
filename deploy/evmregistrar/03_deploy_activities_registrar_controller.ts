import { Interface } from 'ethers/lib/utils'
import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const { makeInterfaceId } = require('@openzeppelin/test-helpers')

function computeInterfaceId(iface: Interface) {
  return makeInterfaceId.ERC165(
    Object.values(iface.functions).map((frag) => frag.format('sighash')),
  )
}

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments, network } = hre
  const { deploy } = deployments
  const { deployer, owner } = await getNamedAccounts()

  const registry = await ethers.getContract('EVMNSRegistry', owner)
  const registrar = await ethers.getContract(
    'BaseRegistrarImplementation',
    owner,
  )
  const priceOracle = await ethers.getContract(
    'ExponentialPremiumPriceOracle',
    owner,
  )
  const reverseRegistrar = await ethers.getContract('ReverseRegistrar', owner)
  const nameWrapper = await ethers.getContract('NameWrapper', owner)

  const whitelist: any[] = [[deployer, 2, 20]]
  const limied: any[] = [
    ['10003', '0x6cE10Ef7705D0420d8A264cF92ee33910DE555BC'],
  ]

  const activitiesDeployArgs = {
    from: deployer,
    args: [
      registrar.address,
      priceOracle.address,
      5,
      259200,
      reverseRegistrar.address,
      nameWrapper.address,
      registry.address,
      whitelist,
      limied,
    ],
    log: true,
  }
  const activitiesController = await deploy(
    'ActivitiesRegistrarController',
    activitiesDeployArgs,
  )
  if (!activitiesController.newlyDeployed) return

  if (owner !== deployer) {
    const c = await ethers.getContract(
      'ActivitiesRegistrarController',
      deployer,
    )
    const tx = await c.transferOwnership(owner)
    console.log(
      `Transferring ownership of ActivitiesRegistrarController to ${owner} (tx: ${tx.hash})...`,
    )
    await tx.wait()
  }

  const tx1 = await nameWrapper.setController(
    activitiesController.address,
    true,
  )
  console.log(
    `Adding ActivitiesRegistrarController as a controller of NameWrapper (tx: ${tx1.hash})...`,
  )
  await tx1.wait()

  const tx2 = await reverseRegistrar.setController(
    activitiesController.address,
    true,
  )
  console.log(
    `Adding ActivitiesRegistrarController as a controller of ReverseRegistrar (tx: ${tx2.hash})...`,
  )
  await tx2.wait()
}

func.tags = ['ethregistrar', 'ActivitiesRegistrarController']
func.dependencies = [
  'EVMNSRegistry',
  'BaseRegistrarImplementation',
  'ExponentialPremiumPriceOracle',
  'ReverseRegistrar',
  'NameWrapper',
]

export default func
