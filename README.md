# ChainGuard: Transparent Supply Chain & Anti-Counterfeiting DApp

**Course:** Blockchain Technology (CSE4444), Assignment 2
**Student:** Harshit Gupta (230905412)

## Problem

Counterfeit medicines, electronics and luxury goods cost consumers money and sometimes their health. Paper records and central databases can be forged or edited. ChainGuard stores a product's origin and every custody transfer on the Ethereum blockchain, so anyone can check a product ID and see an unalterable history. An ID that was never registered is shown as a possible counterfeit.

## Roles

| Role | Can do |
|---|---|
| Admin (deployer) | Assign or revoke roles |
| Manufacturer | Register products |
| Distributor / Retailer | Receive and transfer products |
| Retailer | Mark a product as sold |
| Anyone | Verify a product, report it as suspicious |

## Project structure

```
contracts/ChainGuard.sol
frontend/index.html, style.css, app.js, config.js
tests/test-cases.md
screenshots/
README.md
```

## How to run

1. **Ganache**: start a workspace (RPC `http://127.0.0.1:7545`). Note the chain ID (1337 or 5777).
2. **MetaMask**: add a custom network with that RPC URL and chain ID. Import 4 Ganache accounts using their private keys: Admin, Manufacturer, Distributor, Retailer. Never commit these keys.
3. **Remix** (https://remix.ethereum.org): create `ChainGuard.sol`, paste the contract, compile with Solidity 0.8.20 or newer.
4. In *Deploy & Run*, choose **Dev - Ganache Provider** or **Injected Provider - MetaMask** (with the Admin account selected), then deploy.
5. Copy the deployed address into `CONTRACT_ADDRESS` in `frontend/config.js`. Set `EXPECTED_CHAIN_ID` to your Ganache chain ID.
6. Serve the frontend over HTTP (MetaMask does not inject on `file://` in some browsers):
   ```
   cd frontend
   python -m http.server 8000
   ```
   Open http://localhost:8000.

## Connecting MetaMask and using the DApp

1. Click **Connect MetaMask** and approve. Your address and role badge appear.
2. As **Admin**, assign the Manufacturer, Distributor and Retailer roles to the three other accounts.
3. Switch MetaMask to the **Manufacturer** account, reload, and register product `101`.
4. Transfer `101` to the Distributor, then (as Distributor) to the Retailer, then (as Retailer) mark it sold.
5. Enter `101` in the verify box (any account) to see the stamp and custody timeline.

## Deployment details

- Network: `Ganache local (chain ID ____ )`
- Contract address: `0x____________________`
- Deployer (admin): `0x____________________`

## Test cases and observed results

Fill the "Observed" column from your own runs. Details are in `tests/test-cases.md`.

| # | Type | Action (account) | Expected | Observed |
|---|---|---|---|---|
| 1 | Valid | Admin assigns Manufacturer role | Success, `RoleAssigned` event | |
| 2 | Valid | Manufacturer registers ID 101 | Success, history has "Factory" | |
| 3 | Valid | Manufacturer transfers 101 to Distributor | Success, new checkpoint | |
| 4 | Valid | Retailer marks 101 sold | Success, status Sold | |
| 5 | Valid | Anyone verifies 101 | Green "Verified" stamp, timeline | |
| 6 | Invalid | Manufacturer registers 101 again | Revert "Duplicate product ID" | |
| 7 | Invalid | Register with empty name | Revert "Name is empty" | |
| 8 | Invalid | Register with ID 0 | Revert "ID must be non-zero" | |
| 9 | Invalid | Transfer to account with no role | Revert "Receiver not authorised" | |
| 10 | Invalid | Transfer an ID that does not exist | Revert "Product not registered" | |
| 11 | Invalid | Transfer a sold product | Revert "Product already sold" | |
| 12 | Invalid | Verify ID 999 | Red "Not registered" stamp | |
| 13 | Unauthorised | Non-admin calls Assign role | Revert "Not admin" | |
| 14 | Unauthorised | Distributor calls Register product | Revert "Caller does not have required role" | |
| 15 | Unauthorised | Account not holding 101 transfers it | Revert "Not current holder" | |
| 16 | Unauthorised | Distributor calls Mark as sold | Revert "Caller does not have required role" | |

## Screenshots to include (`screenshots/`)

- [ ] Smart contract compilation (Remix)
- [ ] Smart contract deployment (Remix, showing the address)
- [ ] MetaMask wallet connection
- [ ] Successful transaction (UI status bar + MetaMask/Ganache)
- [ ] Failed transaction (UI status bar showing the revert reason)
- [ ] Blockchain data in the UI (verify stamp, timeline, activity list)

## Security notes

- No private keys, seed phrases or credentials are stored in this repository.
- Role checks use modifiers and `require` statements on every state-changing function.
