import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments, network } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  const SHA1Digest = await deploy('SHA1Digest', {
    from: deployer,
    args: [],
    log: true,
  })
  if (!SHA1Digest.newlyDeployed) {
    return
  }
  await deploy('SHA256Digest', {
    from: deployer,
    args: [],
    log: true,
  })

  if (network.tags.test) {
    await deploy('DummyDigest', {
      from: deployer,
      args: [],
      log: true,
    })
  }
}

func.tags = ['dnssec-digests']

export default func
