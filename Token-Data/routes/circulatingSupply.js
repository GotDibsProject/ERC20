const fetch = require('node-fetch');
const express = require('express');
const ethers = require('ethers');

const app = express.Router();

// You must put your API KEY of ether scan here.
const key = "CIANIPEHWQPCMY19IWUMQAXAC84Y3F9MU7";
// You must put your token addres here.
const tokenAddress = "0xca5ad03ce960c0ef8954999cc3b0983c68c7ba8a";

const api = `https://api.etherscan.io/api?module=stats&action=tokensupply&contractaddress=${tokenAddress}&apikey=${key}`;

// Put the list of addresses that will be subtracted from the total supply.
// Now there are only the burned tokens.
// Example: total supply - balanceOf(addressToSub)
const addressToSub = [
    "0x000000000000000000000000000000000000dead"
]

const getTotal = async () => {
    return call(api);
}

const getTotalToSubstract = async (addresses) => {
    const list = await Promise.all(
        addresses.map(async (x) => {
            let endpoint = getBalanceEndpoint(x);
            let response = await call(endpoint);
            let balance = ethers.BigNumber.from(response.result);
            console.log(`${x} balance ${balance.toString()}`);

            return balance;
        })
    );

    return list.reduce((previous, current) => {
        return previous.add(current);
    });

}

const getBalanceEndpoint = (address) => {
    return `https://api.etherscan.io/api?module=account&action=tokenbalance&contractaddress=${tokenAddress}&address=${address}&tag=latest&apikey=${key}`;
}

const call = async (endpoint) => {
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

app.get("/circulating-supply", async (req, res) => {
    let totalSupply = ethers.BigNumber.from((await getTotal()).result);

    let totalToSubstract = await getTotalToSubstract(addressToSub);

    let circulatingSupply = totalSupply.sub(totalToSubstract)

    return res.status(200).send(ethers.utils.formatEther(circulatingSupply));
});

module.exports = app