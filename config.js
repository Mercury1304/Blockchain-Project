// Paste the address printed by Remix after deployment.
const CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000";

// Ganache default chain ID is 1337 (some versions use 5777). Set to 0 to skip the network check.
const EXPECTED_CHAIN_ID = 1337;

const ABI = [
  "function owner() view returns (address)",
  "function productCount() view returns (uint256)",
  "function roles(address) view returns (uint8)",
  "function assignRole(address account, uint8 role)",
  "function registerProduct(uint256 id, string name, string batch)",
  "function transferProduct(uint256 id, address to, string location)",
  "function markSold(uint256 id)",
  "function reportSuspicious(uint256 id)",
  "function verifyProduct(uint256 id) view returns (bool exists, string name, string batch, address manufacturer, address currentOwner, uint8 status, uint256 flags)",
  "function getHistory(uint256 id) view returns (tuple(address handler, string location, uint256 time)[])",
  "event RoleAssigned(address indexed account, uint8 role)",
  "event ProductRegistered(uint256 indexed id, address indexed manufacturer, string name)",
  "event ProductTransferred(uint256 indexed id, address indexed from, address indexed to, string location)",
  "event ProductSold(uint256 indexed id, address indexed retailer)",
  "event ProductFlagged(uint256 indexed id, address indexed reporter)"
];
