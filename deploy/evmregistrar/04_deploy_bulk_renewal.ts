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
  const { deployer } = await getNamedAccounts()

  const registry = await ethers.getContract('EVMNSRegistry')
  const controller = await ethers.getContract('EVMRegistrarController')

  const bulkRenewal = await deploy('StaticBulkRenewal', {
    from: deployer,
    args: [controller.address],
    log: true,
  })
  if (!bulkRenewal.newlyDeployed) return
  // Only attempt to make resolver etc changes directly on testnets
  if (network.name === 'mainnet') return

  const artifact = await deployments.getArtifact('IBulkRenewal')
  const interfaceId = computeInterfaceId(new Interface(artifact.abi))
  const provider = new ethers.providers.StaticJsonRpcProvider(
    ethers.provider.connection.url,
    {
      ...ethers.provider.network,
      ensAddress: registry.address,
    },
  )
  const resolver = await provider.getResolver('evm')
  if (resolver === null) {
    console.log(
      'No resolver set for .evm; not setting interface for BulkRenewal',
    )
    return
  }
  const resolverContract = await ethers.getContractAt(
    'PublicResolver',
    resolver.address,
  )
  const tx = await resolverContract.setInterface(
    ethers.utils.namehash('evm'),
    interfaceId,
    bulkRenewal.address,
  )
  console.log(
    `Setting BulkRenewal interface ID ${interfaceId} on .evm resolver (tx: ${tx.hash})...`,
  )
  await tx.wait()
  return true
}

func.id = 'bulk-renewal'
func.tags = ['BulkRenewal']
func.dependencies = ['registry']

export default func
