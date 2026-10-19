// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ChainGuard - transparent supply chain and anti-counterfeiting registry
/// @notice Manufacturers register products, handlers pass them along, anyone can verify.
contract ChainGuard {
    enum Role { None, Manufacturer, Distributor, Retailer }
    enum Status { InSupplyChain, Sold }

    struct Product {
        string name;
        string batch;
        address manufacturer;
        address currentOwner;
        Status status;
        uint256 flags;   // number of consumer reports
        bool exists;
    }

    struct Checkpoint {
        address handler;
        string location;
        uint256 time;
    }

    address public owner;
    uint256 public productCount;

    mapping(address => Role) public roles;
    mapping(uint256 => Product) private products;
    mapping(uint256 => Checkpoint[]) private history;
    mapping(uint256 => mapping(address => bool)) private hasFlagged;

    event RoleAssigned(address indexed account, Role role);
    event ProductRegistered(uint256 indexed id, address indexed manufacturer, string name);
    event ProductTransferred(uint256 indexed id, address indexed from, address indexed to, string location);
    event ProductSold(uint256 indexed id, address indexed retailer);
    event ProductFlagged(uint256 indexed id, address indexed reporter);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not admin");
        _;
    }

    modifier onlyRole(Role r) {
        require(roles[msg.sender] == r, "Caller does not have required role");
        _;
    }

    modifier productExists(uint256 id) {
        require(products[id].exists, "Product not registered");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Admin grants or revokes (Role.None) a role.
    function assignRole(address account, Role role) external onlyOwner {
        require(account != address(0), "Zero address");
        roles[account] = role;
        emit RoleAssigned(account, role);
    }

    /// @notice Manufacturer registers a new product with a unique ID.
    function registerProduct(uint256 id, string calldata name, string calldata batch)
        external
        onlyRole(Role.Manufacturer)
    {
        require(id != 0, "ID must be non-zero");
        require(!products[id].exists, "Duplicate product ID");
        require(bytes(name).length > 0, "Name is empty");

        products[id] = Product(name, batch, msg.sender, msg.sender, Status.InSupplyChain, 0, true);
        history[id].push(Checkpoint(msg.sender, "Factory", block.timestamp));
        productCount++;
        emit ProductRegistered(id, msg.sender, name);
    }

    /// @notice Current holder hands the product to an authorised receiver.
    function transferProduct(uint256 id, address to, string calldata location)
        external
        productExists(id)
    {
        Product storage p = products[id];
        require(p.currentOwner == msg.sender, "Not current holder");
        require(p.status == Status.InSupplyChain, "Product already sold");
        require(to != address(0) && to != msg.sender, "Invalid receiver");
        require(roles[to] == Role.Distributor || roles[to] == Role.Retailer, "Receiver not authorised");
        require(bytes(location).length > 0, "Location is empty");

        p.currentOwner = to;
        history[id].push(Checkpoint(to, location, block.timestamp));
        emit ProductTransferred(id, msg.sender, to, location);
    }

    /// @notice Retailer holding the product marks it as sold to a consumer.
    function markSold(uint256 id) external productExists(id) onlyRole(Role.Retailer) {
        Product storage p = products[id];
        require(p.currentOwner == msg.sender, "Not current holder");
        require(p.status == Status.InSupplyChain, "Product already sold");

        p.status = Status.Sold;
        history[id].push(Checkpoint(msg.sender, "Sold to consumer", block.timestamp));
        emit ProductSold(id, msg.sender);
    }

    /// @notice Any account can report a product once.
    function reportSuspicious(uint256 id) external productExists(id) {
        require(!hasFlagged[id][msg.sender], "Already reported");
        hasFlagged[id][msg.sender] = true;
        products[id].flags++;
        emit ProductFlagged(id, msg.sender);
    }

    /// @notice Public check. Returns exists=false for unknown (possibly counterfeit) IDs.
    function verifyProduct(uint256 id)
        external
        view
        returns (
            bool exists,
            string memory name,
            string memory batch,
            address manufacturer,
            address currentOwner,
            Status status,
            uint256 flags
        )
    {
        Product storage p = products[id];
        return (p.exists, p.name, p.batch, p.manufacturer, p.currentOwner, p.status, p.flags);
    }

    function getHistory(uint256 id)
        external
        view
        productExists(id)
        returns (Checkpoint[] memory)
    {
        return history[id];
    }
}
