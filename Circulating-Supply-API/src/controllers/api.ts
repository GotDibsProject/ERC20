import { Application, Request, Response } from "express";
import { BigNumber, ethers } from "ethers";
import fetch from 'node-fetch';

// You must put your API KEY of ether scan here.
const key: string = "CIANIPEHWQPCMY19IWUMQAXAC84Y3F9MU7";
// You must put your token addres here.
const tokenAddress: string = "0xca5ad03ce960c0ef8954999cc3b0983c68c7ba8a";

const api: string = `https://api.etherscan.io/api?module=stats&action=tokensupply&contractaddress=${tokenAddress}&apikey=${key}`;

// Put the list of addresses that will be subtracted from the total supply.
// Now there are only the burned tokens.
// Example: total supply - balanceOf(addressToSub)
const addressToSub: [string] = [
  "0x000000000000000000000000000000000000dead"
]

const getTotal = async () => {
  return call(api);
}

const getTotalToSubstract = async (addresses: [string]) => {
  const list: BigNumber[] = await Promise.all(
    addresses.map(async (x) => {
      let endpoint = getBalanceEndpoint(x);
      let response = await call(endpoint);
      let balance = BigNumber.from(response.result);
      console.log(`${x} balance ${balance.toString()}`);

      return balance;
    })
  );

  return list.reduce((previous: BigNumber, current: BigNumber) => {
    return previous.add(current);
  });

}

const getBalanceEndpoint = (address: string) => {
  return `https://api.etherscan.io/api?module=account&action=tokenbalance&contractaddress=${tokenAddress}&address=${address}&tag=latest&apikey=${key}`;
}

const call = async (endpoint: string) => {
  try {
    // 👇️ const response: Response
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error! status: ${response.status}`);
    }
    const result = (await response.json());

    return result;
  } catch (error) {
    if (error instanceof Error) {
      console.log('error message: ', error.message);
      return error.message;
    } else {
      console.log('unexpected error: ', error);
      return 'An unexpected error occurred';
    }
  }
}

export const loadApiEndpoints = (app: Application): void => {
  app.get("/circulating-supply", async (req: Request, res: Response) => {
    let totalSupply = BigNumber.from((await getTotal()).result);

    let totalToSubstract = await getTotalToSubstract(addressToSub);

    let circulatingSupply = totalSupply.sub(totalToSubstract)

    return res.status(200).send(ethers.utils.formatEther(circulatingSupply));
  });
};
