const { ethers, getNamedAccounts } = require("hardhat")
const { getWeth } = require("./getWeth")

async function main() {
  const { deployer } = await getNamedAccounts()

  // 1. Get Weth ERC20
  const ethAmount = ethers.utils.parseEther("1")
  const wethAmount = await getWeth(ethAmount)

  // 2. Lend Weth on LendingPool
  // 2.1 Call ILendingPoolAddressesProvider => Get LendingPool Address
  const lendingPool = await getLendingPool(deployer)
  console.log(`LendingPool address: ${lendingPool.address}`)
  // 2.2 Approve LendingPool to spend our Weth
  const wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" // MAIN Net address (forked main net)
  await approveErc20(
    "Weth",
    wethAddress,
    lendingPool.address,
    wethAmount,
    deployer
  )

  // 2.3 Deposit
  console.log("---")
  console.log("Depositing Weth on LendingPool...")
  await lendingPool.deposit(wethAddress, wethAmount, deployer, 0)
  console.log(
    `${ethers.utils.formatEther(
      wethAmount
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
  await borrowDai(lendingPool, daiAddress, amountDaiToBorrowInWei, deployer)
  await getBorrowUserData(lendingPool, deployer)

  // 4. Repay DAI
  const amountDaiToRepay = amountDaiToBorrowInWei
  // 4.1 Approve LendingPool to spend our DAI
  await approveErc20(
    "DAI",
    daiAddress,
    lendingPool.address,
    amountDaiToRepay,
    deployer
  )
  // 4.2 Repay
  await repayDai(lendingPool, daiAddress, amountDaiToRepay, deployer)
  await getBorrowUserData(lendingPool, deployer)
}

async function repayDai(lendingPool, asset, amount, account) {
  console.log("---")
  console.log("Repaying DAI...")
  let trx = await lendingPool.repay(
    asset,
    amount,
    1, // interestRateMode:  1 for Stable, 2 for Variable
    account // onBehalfOf
  )
  await trx.wait(1)
  console.log(`You repaid ${ethers.utils.formatEther(amount)} DAI`)
}

async function borrowDai(
  lendingPool,
  daiAddress,
  amountDaiToBorrowInWei,
  account
) {
  console.log("---")
  console.log("Borrowing DAI...")
  let trx = await lendingPool.borrow(
    daiAddress,
    amountDaiToBorrowInWei,
    1, // interestRateMode:  1 for Stable, 2 for Variable
    0, // referralCode
    account // onBehalfOf
  )

  await trx.wait(1)
  console.log(
    `You borrowed ${ethers.utils.formatEther(amountDaiToBorrowInWei)} DAI`
  )
}

async function getEthUdstPrice() {
  const ethUsdtPriceFeed = await ethers.getContractAt(
    "AggregatorV3Interface",
    "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419" // main net address
  )

  let decimals = await ethUsdtPriceFeed.decimals()
  decimals = parseInt(decimals)

  const ethUsdtPrice = (await ethUsdtPriceFeed.latestRoundData())[1]
  console.log(
    `1 ETH currently worths ${ethers.utils.formatUnits(
      ethUsdtPrice,
      decimals
    )} USDT`
  )

  return ethUsdtPrice
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
  // ETH/USDT Price
  console.log("Getting ETH/USDT Price from ChainLink Pricefeeds...")
  const ethUsdtPrice = await getEthUdstPrice()

  // LendingPool User Data
  console.log("Getting User Data from LendingPool...")
  const {
    totalCollateralETH,
    totalDebtETH,
    availableBorrowsETH,
  } = await lendingPool.getUserAccountData(account)

  console.log(
    `--> Your Collateral is currently ${ethers.utils.formatEther(
      totalCollateralETH
    )} of ETH worth`
  )
  console.log(
    `--> You have borrowed ${ethers.utils.formatEther(
      totalDebtETH
    )} of ETH worth`
  )
  console.log(
    `--> You can borrow ${ethers.utils.formatEther(
      availableBorrowsETH
    )} of ETH worth`
  )

  // LendingPool Collateral in USDT Value
  const collateralUsdtValue = totalCollateralETH.mul(ethUsdtPrice).div(10 ** 8)
  console.log(
    `--> Your Collateral is currently ${ethers.utils.formatEther(
      collateralUsdtValue
    )} of USDT worth`
  )

  return { availableBorrowsETH, totalDebtETH }
}

async function approveErc20(
  erc20Symbol,
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
    `Lending Pool approved for ${ethers.utils.formatEther(
      amountToSpend
    )} ${erc20Symbol}`
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
  const lendingPool_Address = await iLendingPoolAddressesProvider.getLendingPool()

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
