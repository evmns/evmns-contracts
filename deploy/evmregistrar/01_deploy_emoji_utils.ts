import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { ethers } from 'hardhat'
import Web3 from 'web3'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments, network } = hre
  const { deploy } = deployments
  const { deployer, owner } = await getNamedAccounts()

  if (network.name === 'mainnet') {
    return true
  }

  const emojiUtils = await deploy('EmojiUtils', {
    from: deployer,
    log: true,
  })
  if (!emojiUtils.newlyDeployed) return

  if (owner !== deployer) {
    const c = await ethers.getContract('EmojiUtils', deployer)
    const tx = await c.transferOwnership(owner)
    console.log(
      `Transferring ownership of EmojiUtils to ${owner} (tx: ${tx.hash})...`,
    )
    await tx.wait()
  }
}

func.id = 'price-oracle'
func.tags = ['EmojiUtils']
func.dependencies = ['registry']

export default func
