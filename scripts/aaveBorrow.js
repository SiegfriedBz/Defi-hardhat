const { ethers, getNamedAccounts } = require("hardhat")
const { getWeth } = require("./getWeth")

async function main() {
  const { deployer } = await getNamedAccounts()
  // 1. Send ETH to GET WETH ERC20
  const ethAmount = ethers.utils.parseEther("0.001")
  const wethAmount = await getWeth(ethAmount)
  // 2. Get the LendingPool contract from the LendingPoolProviderAddress contract
  // 2.1 Call ILendingPoolAddressesProvider => LendingPool Address
  const lendingPool = await getLendingPool(deployer)
  console.log(`LendingPool address: ${lendingPool.address}`)
  // 2.2 Approve Lending Pool to spend our Weth
  const wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" // MAIN Net address (forked main net)
  await approveErc20(wethAddress, lendingPool.address, wethAmount, deployer)
  // 2.3 Deposit on LendingPool
  await lendingPool.deposit(wethAddress, wethAmount, deployer, 0)
  console.log(
    `${ethers.utils.formatEther(
      wethAmount
    )} WEth deposited on Aave LendingPool.`
  )
}

async function approveErc20(
  erc20Address,
  spenderAddress,
  amountToSpend,
  account
) {
  const iErc20 = await ethers.getContractAt("IERC20", erc20Address, account)
  const trx = await iErc20.approve(spenderAddress, amountToSpend)
  await trx.wait(1)
  console.log(
    `Lending Pool approved for ${ethers.utils.formatEther(amountToSpend)} WEth`
  )
}

async function getLendingPool(account) {
  // Aave doc : main net ILendingPoolAddressesProvider address + interface
  const iLendingPoolAddressesProvider = await ethers.getContractAt(
    "ILendingPoolAddressesProvider",
    "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
    account
  )
  // Get LendingPool contract address
  const lendingPool_Address =
    await iLendingPoolAddressesProvider.getLendingPool()

  // Get ILendingPool contract
  const lendingPool = await ethers.getContractAt(
    "ILendingPool",
    lendingPool_Address,
    account
  )
  return lendingPool
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.log(error)
    process.exit(1)
  })
