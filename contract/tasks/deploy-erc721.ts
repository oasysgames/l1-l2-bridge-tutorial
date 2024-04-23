import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment, HardhatEthersHelpers } from "hardhat/types";
import * as types from "hardhat/internal/core/params/argumentTypes";
import { EventLog } from "ethers";
import { findEventBySignature } from "./util";

task("deploy721", "Deploy ERC721 contract")
  .addParam("name", "name of the token", undefined, types.string, false)
  .addParam("symbol", "the symbol of the token", undefined, types.string, false)
  .addParam("l1Token", "address of L1 token", undefined, types.string, true)
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;

    if (hre.network.name !== "l1" && hre.network.name !== "l2") {
      throw new Error("This task can only be executed on l1 or l2");
    }
    if (hre.network.name === "l2" && !taskArgs.l1Token) {
      throw new Error("l1Token is required on L2");
    }

    const isL1 = hre.network.name === "l1";
    await deploy721(
      ethers,
      isL1,
      taskArgs.name,
      taskArgs.symbol,
      taskArgs.l1Token
    );
  });

const deploy721 = async (
  ethers: HardhatEthersHelpers,
  isL1: boolean,
  tokenName: string,
  symbol: string,
  l1Token?: string
): Promise<void> => {
  const address = isL1
    ? "0x5200000000000000000000000000000000000005"
    : "0x4200000000000000000000000000000000000017";
  const contractName = isL1
    ? "L1StandardERC721Factory"
    : "L2StandardERC721Factory";
  const eventSig = isL1
    ? "ERC721Created(string,address)"
    : "OptimismMintableERC721Created(address,address,address)";
  const factory = await ethers.getContractAt(contractName, address);

  const baseURI = "";
  const tx = isL1
    ? await factory.createStandardERC721(tokenName, symbol, baseURI)
    : await factory.createOptimismMintableERC721(l1Token, tokenName, symbol);
  console.log(
    `deploying ${tokenName} with symbol ${symbol}, tx: ${tx.hash}...`
  );

  const receipt = await tx.wait();
  const e = findEventBySignature(receipt!.logs as EventLog[], eventSig);
  const [l2Address, l1Address] = factory.interface.decodeEventLog(
    eventSig,
    e.data,
    e.topics
  );
  console.log(`deployed at: ${isL1 ? l1Address : l2Address}`);
};
