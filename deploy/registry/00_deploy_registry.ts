import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import * as net from 'net'
import { getSigner } from '@nomiclabs/hardhat-ethers/internal/helpers'

const ZERO_HASH =
  '0x0000000000000000000000000000000000000000000000000000000000000000'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments, network } = hre
  const { deploy, run } = deployments
  const { deployer, owner } = await getNamedAccounts()

  if (network.name == 'hardhat' || network.name == 'localhost') {
    const ac_deployer = await ethers.getSigner(deployer)
    await ac_deployer.sendTransaction({
      to: owner,
      value: ethers.utils.parseEther('100'),
    })
  }

  if (network.tags.legacy) {
    const contract = await deploy('LegacyEVMNSRegistry', {
      from: deployer,
      args: [],
      log: true,
      contract: await deployments.getArtifact('EVMNSRegistry'),
    })

    const legacyRegistry = await ethers.getContract('LegacyEVMNSRegistry')

    const rootTx = await legacyRegistry
      .connect(await ethers.getSigner(deployer))
      .setOwner(ZERO_HASH, owner)
    console.log(`Setting owner of root node to owner (tx: ${rootTx.hash})`)
    await rootTx.wait()

    console.log('Running legacy registry scripts...')
    await run('legacy-registry-names', {
      deletePreviousDeployments: false,
      resetMemory: false,
    })

    const revertRootTx = await legacyRegistry
      .connect(await ethers.getSigner(owner))
      .setOwner(ZERO_HASH, '0x0000000000000000000000000000000000000000')
    console.log(`Unsetting owner of root node (tx: ${rootTx.hash})`)
    await revertRootTx.wait()

    await deploy('EVMNSRegistry', {
      from: deployer,
      args: [contract.address],
      log: true,
      contract: await deployments.getArtifact('EVMNSRegistryWithFallback'),
    })
  } else {
    const registry = await deploy('EVMNSRegistry', {
      from: deployer,
      args: [],
      log: true,
    })
    if (!registry.newlyDeployed) return
  }

  if (!network.tags.use_root) {
    const registry = await ethers.getContract('EVMNSRegistry')
    const rootOwner = await registry.owner(ZERO_HASH)
    switch (rootOwner) {
      case deployer:
        const tx = await registry.setOwner(ZERO_HASH, owner, { from: deployer })
        console.log(
          `Setting final owner of root node on registry (tx:${tx.hash})...`,
        )
        await tx.wait()
        break
      case owner:
        break
      default:
        console.log(
          `WARNING: EVMNS registry root is owned by ${rootOwner}; cannot transfer to owner`,
        )
    }
  }

  return true
}

func.id = 'ens'
func.tags = ['registry', 'EVMNSRegistry']

export default func
