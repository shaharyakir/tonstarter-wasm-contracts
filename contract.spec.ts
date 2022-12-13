import { expect } from "chai";
import fs from "fs";
import {
  Address,
  beginCell,
  Cell,
  CellMessage,
  CommonMessageInfo,
  contractAddress,
  InternalMessage,
} from "ton";
import { compileContract } from "ton-compiler";
import {
  SmartContract,
  StackEntryNumber,
  stackNumber,
} from "@ton-community/tx-emulator"; // TODO docs
import BN from "bn.js";

const createSmartContract = (code: Cell, data: Cell) => {
  // TODO docs
  const contract = SmartContract.fromState({
    address: contractAddress({
      workchain: 0,
      initialCode: code,
      initialData: data,
    }),
    accountState: {
      type: "active",
      code,
      data,
    },
    balance: new BN(0),
  });

  return contract;
};

async function compileToCell(entryPoint: string): Promise<Cell> {
  const result = await compileContract({
    files: [entryPoint], // TODO docs
    stdlib: true,
    version: "v2022.10",
  });
  if (result.ok) {
    return Cell.fromBoc(result.output)[0]; // TODO docs
  } else {
    throw new Error(result.log); // TODO docs
  }
}

describe("Contract", async () => {
  let contract: SmartContract;

  beforeEach(async () => {
    contract = createSmartContract(
      await compileToCell("contract.fc"),
      beginCell().storeUint(0, 64).endCell()
    );
  });

  async function getCounter(): Promise<BN> {
    const res = await contract.runGetMethod("counter");
    return (res.stack[0] as StackEntryNumber).value;
  }

  it("gets the counter", async () => {
    const num = await getCounter();
    expect(num.toString()).to.eq("0");
  });

  it("increments the counter", async () => {
    const logs = await contract.sendMessage(
      new InternalMessage({
        to: contract.getAddress(),
        value: new BN(0.1),
        from: new Address(0, Buffer.alloc(32)),
        body: new CommonMessageInfo({
          body: new CellMessage(beginCell().storeUint(1, 32).endCell()),
        }),
        bounce: true,
      }),
      { mutateAccount: true }
    );

    console.log(logs.debugLogs);

    const num = await getCounter();
    expect(num.toString()).to.eq("1");
  });
});
