import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { ethers } from 'hardhat'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments, network } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  if (network.name === 'mainnet') {
    return true
  }

  const dummyOracle = await deploy('DummyOracle', {
    from: deployer,
    args: ['100000000', deployer],
    log: true,
  })
  const oracle = await ethers.getContract('DummyOracle', deployer)
  const oracleAddress = '0x2c8aF87F2875283FdC136ccfF5b0DF4D45A65F39'
  if ((await oracle.getOwner()) != oracleAddress) {
    const tx = await oracle.setOwner(oracleAddress)
    console.log(
      `Transferring owner of DummyOracle to owner:${oracleAddress} (tx: ${tx.hash})...`,
    )
  }
  await deploy('StablePriceOracle', {
    from: deployer,
    args: [
      dummyOracle.address,
      [0, 0, '3170979198380', '1585489599190', '158548959919'],
    ],
    log: true,
  })
}

func.id = 'price-oracle'
func.tags = ['evmregistrar', 'StablePriceOracle', 'DummyOracle']
func.dependencies = ['registry']

export default func
