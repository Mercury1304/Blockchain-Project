# ChainGuard Test Script

Accounts used (Ganache): **A0** Admin, **A1** Manufacturer, **A2** Distributor, **A3** Retailer, **A4** Outsider (no role).

Run in this order. Take a screenshot of the status bar (and MetaMask popup for failures) after each step.

## Setup (valid)

| Step | Account | Action | Expected |
|---|---|---|---|
| S1 | A0 | Assign role: A1 as Manufacturer | Success |
| S2 | A0 | Assign role: A2 as Distributor | Success |
| S3 | A0 | Assign role: A3 as Retailer | Success |

## Valid inputs

| Step | Account | Action | Expected |
|---|---|---|---|
| V1 | A1 | Register ID 101, "Paracetamol 500mg", batch "B-2026-07" | Success |
| V2 | A1 | Transfer 101 to A2, location "Mumbai warehouse" | Success |
| V3 | A2 | Transfer 101 to A3, location "Bengaluru store" | Success |
| V4 | A3 | Mark 101 as sold | Success |
| V5 | A4 | Verify 101 | Green stamp, 4 checkpoints |
| V6 | A4 | Report 101 as suspicious | Success, stamp turns amber |

## Invalid inputs

| Step | Account | Action | Expected revert |
|---|---|---|---|
| I1 | A1 | Register ID 101 again | Duplicate product ID |
| I2 | A1 | Register ID 102 with empty name | Name is empty |
| I3 | A1 | Register ID 0 | ID must be non-zero |
| I4 | A1 | Register 103, then transfer to A4 | Receiver not authorised |
| I5 | A1 | Transfer ID 999 | Product not registered |
| I6 | A3 | Transfer 101 (already sold) to A2 | Not current holder or Product already sold |
| I7 | A4 | Verify ID 999 | Red "Not registered" stamp (no transaction) |
| I8 | A4 | Report 101 a second time | Already reported |

## Unauthorised callers

| Step | Account | Action | Expected revert |
|---|---|---|---|
| U1 | A4 | Assign role to self | Not admin |
| U2 | A2 | Register ID 104 | Caller does not have required role |
| U3 | A2 | Transfer 103 (held by A1) | Not current holder |
| U4 | A2 | Mark 103 as sold | Caller does not have required role |

Record results in the README table.
