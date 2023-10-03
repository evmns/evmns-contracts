import { Interface } from 'ethers/lib/utils'
import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { emojilist } from '../../scripts/utils/emoji220'

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
  const priceOracle = await ethers.getContract('StablePriceOracle', owner)
  const emojiUtils = await ethers.getContract('EmojiUtils', owner)

  const reverseRegistrar = await ethers.getContract('ReverseRegistrar', owner)
  const nameWrapper = await ethers.getContract('NameWrapper', owner)

  const launcheddate = new Date('2023/09/15 15:00:00')
  const launchedtime = Math.floor(launcheddate.getTime() / 1000)
  const allow12registertime = Math.floor(
    new Date('2023-12-31T23:59:59Z').getTime() / 1000,
  )
  const earningAccount = process.env.EARNING_ACCOUNT

  const deployArgs = {
    from: deployer,
    args: [
      registrar.address,
      priceOracle.address,
      emojiUtils.address,
      1,
      86400,
      reverseRegistrar.address,
      nameWrapper.address,
      registry.address,
      launchedtime,
      allow12registertime,
      earningAccount,
    ],
    log: true,
  }
  const controller = await deploy('EVMRegistrarController', deployArgs)
  if (!controller.newlyDeployed) return

  if (owner !== deployer) {
    const c = await ethers.getContract('EVMRegistrarController', deployer)
    const tx = await c.transferOwnership(owner)
    console.log(
      `Transferring ownership of EVMRegistrarController to ${owner} (tx: ${tx.hash})...`,
    )
    await tx.wait()
  }

  // Only attempt to make controller etc changes directly on testnets
  if (network.name === 'mainnet') return

  console.log(
    'WRAPPER OWNER',
    await nameWrapper.owner(),
    await nameWrapper.signer.getAddress(),
  )
  const tx1 = await nameWrapper.setController(controller.address, true)
  console.log(
    `Adding EVMRegistrarController as a controller of NameWrapper (tx: ${tx1.hash})...`,
  )
  await tx1.wait()

  const tx2 = await reverseRegistrar.setController(controller.address, true)
  console.log(
    `Adding EVMRegistrarController as a controller of ReverseRegistrar (tx: ${tx2.hash})...`,
  )
  await tx2.wait()

  const artifact = await deployments.getArtifact('IEVMRegistrarController')
  const interfaceId = computeInterfaceId(new Interface(artifact.abi))
  const provider = new ethers.providers.StaticJsonRpcProvider(
    ethers.provider.connection.url,
    {
      ...ethers.provider.network,
      ensAddress: (await ethers.getContract('EVMNSRegistry')).address,
    },
  )

  const resolver = await provider.getResolver('evm')
  if (resolver === null) {
    console.log(
      'No resolver set for .evm; not setting interface for ETH Registrar Controller',
    )
    return
  }
  const resolverContract = await ethers.getContractAt(
    'PublicResolver',
    resolver.address,
  )
  const tx3 = await resolverContract.setInterface(
    ethers.utils.namehash('evm'),
    interfaceId,
    controller.address,
  )
  console.log(
    `Setting EVMRegistrarController interface ID ${interfaceId} on .eth resolver (tx: ${tx3.hash})...`,
  )
  await tx3.wait()

  /*  for (const emoji of emojis){

  }*/
}

func.tags = ['evmregistrar', 'EVMRegistrarController']
func.dependencies = [
  'EVMNSRegistry',
  'BaseRegistrarImplementation',
  'StablePriceOracle',
  'ReverseRegistrar',
  'NameWrapper',
  'EmojiUtils',
]

export default func
