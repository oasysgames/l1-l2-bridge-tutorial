import fs from "fs";
import { Contract, EventLog } from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export const loadContract = async (
  hre: HardhatRuntimeEnvironment,
  name: string
): Promise<Contract> => {
  const { deployments, ethers } = hre;
  const bL2OutputOracle = await deployments.get(name);
  return await ethers.getContractAt(name, bL2OutputOracle.address);
};

export const assertAddresses = (addresses: string): string[] => {
  const addressList = addresses.split(",");
  if (addressList.length < 1) {
    throw new Error("No num provided");
  }
  for (const addr of addressList) {
    assertAddresse(addr);
  }
  return addressList;
};

export const assertAddresse = (address: string): string => {
  // Checks if the address has the correct length and hex characters
  const re = /^(0x)[0-9a-fA-F]{40}$/;
  if (!re.test(address)) {
    throw new Error(`${address} is not a valid address`);
  }
  return address;
};

export function writeJsonToFile(jsonObj: any, filePath: string) {
  const jsonString = JSON.stringify(jsonObj, null);

  // ファイルに書き込む
  fs.writeFileSync(filePath, jsonString, "utf8");
}

export function splitArray<T>(array: T[]): [T[], T[]] {
  const middle = Math.ceil(array.length / 2);
  const firstHalf = array.slice(0, middle);
  const secondHalf = array.slice(middle);
  return [firstHalf, secondHalf];
}

export const findEventByName = (
  events: EventLog[],
  ename: string
): EventLog => {
  const e = events.find((e: EventLog) => e.eventName === ename);
  if (!e) throw new Error("No event found");
  return e;
};

export const findEventBySignature = (
  events: EventLog[],
  esig: string
): EventLog => {
  const e = events.find((e: EventLog) => e.eventSignature === esig);
  if (!e) throw new Error("No event found");
  return e;
};
