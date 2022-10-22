const { ethers, getNamedAccounts } = require("hardhat")
const { getWeth } = require("./getWeth")

async function main() {
  const { deployer } = await getNamedAccounts()
  // 1. Get Weth ERC20
  const ethAmount = ethers.utils.parseEther("0.1")
  const WethAmount = await getWeth(ethAmount)
  // 2. Lend Weth on LendingPool
  // 2.1 Call ILendingPoolAddressesProvider => Get LendingPool Address
  const lendingPool = await getLendingPool(deployer)
  console.log(`LendingPool address: ${lendingPool.address}`)
  // 2.2 Approve LendingPool to spend our Weth
  const WethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" // MAIN Net address (forked main net)
  await approveErc20(WethAddress, lendingPool.address, WethAmount, deployer)
  // 2.3 Deposit
  console.log("---")
  console.log("Depositing Weth on LendingPool...")
  await lendingPool.deposit(WethAddress, WethAmount, deployer, 0)
  console.log(
    `${ethers.utils.formatEther(
      WethAmount
    )} Weth deposited on Aave LendingPool.`
  )
  // 3. Borrow DAI
  const { availableBorrowsETH, totalDebtETH } = await getBorrowUserData(
    lendingPool,
    deployer
  )
  const daiEthPrice = await getDaiEthPrice()
  const amountDaiToBorrow =
    availableBorrowsETH.div(daiEthPrice).toNumber() * 0.95
  console.log(`You can borrow ${amountDaiToBorrow} DAI`)

  const amountDaiToBorrowInWei = ethers.utils.parseEther(
    amountDaiToBorrow.toString()
  )
  console.log(`You can borrow ${amountDaiToBorrowInWei} DAI (in wei)`)
  const daiAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F" // MAIN Net address (forked main net)
  await borrowDai(daiAddress, lendingPool, amountDaiToBorrowInWei, deployer)
  await getBorrowUserData(lendingPool, deployer)

  // 4. Repay DAI
}

async function borrowDai(
  daiAddress,
  lendingPool,
  amountDaiToBorrowInWei,
  account
) {
  console.log("---")
  console.log("Borrowing DAI...")
  let trx = await lendingPool.borrow(
    daiAddress,
    amountDaiToBorrowInWei,
    1, // uint256 interestRateMode:  1 for Stable, 2 for Variable
    0,
    account
  )
  await trx.wait(1)
  console.log("You borrowed DAI")
}

async function getDaiEthPrice() {
  const daiEthPriceFeed = await ethers.getContractAt(
    "AggregatorV3Interface",
    "0x773616E4d11A78F511299002da57A0a94577F1f4" // main net address
  )
  console.log("---")
  console.log("Getting Dai/Eth Price...")
  let decimals = await daiEthPriceFeed.decimals()
  decimals = parseInt(decimals)

  const daiEthPrice = (await daiEthPriceFeed.latestRoundData())[1]

  console.log(
    `1 Dai currently worths ${ethers.utils.formatUnits(
      daiEthPrice,
      decimals
    )} ETH`
  )
  return daiEthPrice
}

async function getBorrowUserData(lendingPool, account) {
  console.log("---")
  console.log("Borrow User Data...")
  const { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
    await lendingPool.getUserAccountData(account)

  console.log(
    `You deposited ${ethers.utils.formatEther(totalCollateralETH)} of ETH worth`
  )
  console.log(
    `You have borrowed ${ethers.utils.formatEther(totalDebtETH)} of ETH worth`
  )
  console.log(
    `You can borrow ${ethers.utils.formatEther(
      availableBorrowsETH
    )} of ETH worth`
  )

  return { availableBorrowsETH, totalDebtETH }
}

async function approveErc20(
  erc20Address,
  spenderAddress,
  amountToSpend,
  account
) {
  console.log("---")
  console.log("Approving ERC20 to be spent on your behalf...")
  const iErc20 = await ethers.getContractAt("IERC20", erc20Address, account)
  const trx = await iErc20.approve(spenderAddress, amountToSpend)
  await trx.wait(1)
  console.log(
    `Lending Pool approved for ${ethers.utils.formatEther(amountToSpend)} Weth`
  )
}

async function getLendingPool(account) {
  // Aave doc : main net ILendingPoolAddressesProvider address + interface
  console.log("---")
  console.log("Getting LendingPool address and contract...")
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
  console.log("You have LendingPool contract")
  return lendingPool
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.log(error)
    process.exit(1)
  })
