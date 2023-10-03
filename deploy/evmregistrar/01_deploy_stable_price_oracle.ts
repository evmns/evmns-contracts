import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { ethers } from 'hardhat'
import Web3 from 'web3'

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
  if (!dummyOracle.newlyDeployed) return
  const oracle = await ethers.getContract('DummyOracle', deployer)
  const web3 = new Web3(process.env.PRC_URL ?? '')
  const oracleAddress = web3.eth.accounts.privateKeyToAccount(
    process.env.ORACLE_KEY ?? '0',
  ).address
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
      [
        '9512937595130',
        '3170979198380',
        '475646879760',
        '158548959920',
        '31709791985',
      ], //300,100,15,5,1
      // [0, 0, '3170979198380', '1585489599190', '158548959919'],//0,0,100,50,5
    ],
    log: true,
  })
}

func.id = 'price-oracle'
func.tags = ['evmregistrar', 'StablePriceOracle', 'DummyOracle']
func.dependencies = ['registry']

export default func
