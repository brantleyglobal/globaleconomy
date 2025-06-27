// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
}

interface IStableSwapGateway {
    function lockRedemption(address user) external;
}

contract AssetPurchase {
    address public admin;

    enum Status { Pending, InProgress, Completed, Cancelled }

    struct Asset {
        string name;
        uint256 priceInUSD; // e.g., $100 = 100e6
        string metadataCID;
        bool active;
        uint256 baseDays;
        uint256 perUnitDelay;
    }

    struct Purchase {
        address buyer;
        address tokenUsed;
        uint256 assetId;
        uint256 quantity;
        uint256 depositAmount;
        uint256 escrowAmount;
        uint256 purchaseTime;
        uint256 deliveryDeadline;
        string progressCID;
        string completionCID;
        Status status;
        uint256 proposedExtension;
        bool extensionPending;
    }

    address public feeRecipient;
    uint256 public constant FEE_BASIS_POINTS = 5; // 0.005% = 5 / 1,000,000
    uint256 public constant BASIS_POINT_DIVISOR = 1_000_000;

    uint256 public nextAssetId;
    uint256 public nextPurchaseId;

    mapping(uint256 => Asset) public assets;
    mapping(uint256 => Purchase) public purchases;
    mapping(address => uint256) public stableTokenToRate; // token → micro USD

    IStableSwapGateway public redemptionGateway;

    event AssetAdded(uint256 id, string name);
    event Purchased(uint256 indexed purchaseId, address indexed buyer, uint256 assetId);
    event ProgressUploaded(uint256 id, string cid);
    event CompletionUploaded(uint256 id, string cid);
    event EscrowReleased(uint256 id);
    event Refunded(uint256 id);
    event ExtensionProposed(uint256 id, uint256 duration);
    event ExtensionApproved(uint256 id, uint256 newDeadline);
    event RedemptionLocked(address user);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    constructor() {
        admin = msg.sender;
        feeRecipient = msg.sender; // or a treasury/multisig wallet

    }

    function setRate(address token, uint256 rate) external onlyAdmin {
        stableTokenToRate[token] = rate;
    }

    function setRedemptionGateway(address gateway) external onlyAdmin {
        require(gateway != address(0), "Invalid gateway");
        redemptionGateway = IStableSwapGateway(gateway);
    }

    function addAsset(
        string calldata name,
        uint256 usdPrice,
        string calldata cid,
        uint256 baseDays,
        uint256 delayPerUnit
    ) external onlyAdmin {
        assets[nextAssetId] = Asset(name, usdPrice, cid, true, baseDays, delayPerUnit);
        emit AssetAdded(nextAssetId, name);
        nextAssetId++;
    }

    function purchase(uint256 assetId, uint256 quantity, address token) external {
        Asset memory a = assets[assetId];
        require(a.active, "Asset inactive");
        require(quantity > 0, "Invalid quantity");

        uint256 rate = stableTokenToRate[token];
        require(rate > 0, "Rate not set");

        uint256 totalUSD = a.priceInUSD * quantity;
        uint256 totalToken = (totalUSD * 1e18) / rate;
        uint256 deposit = totalToken / 2;
        uint256 escrow = totalToken - deposit;

        uint256 feeAmount = (totalToken * FEE_BASIS_POINTS) / BASIS_POINT_DIVISOR;
        uint256 netAmount = totalToken - feeAmount;


        IERC20(token).transferFrom(msg.sender, address(this), netAmount);
        IERC20(token).transferFrom(msg.sender, feeRecipient, feeAmount);


        uint256 delay = a.baseDays + a.perUnitDelay * (quantity - 1);
        uint256 deadline = block.timestamp + delay * 1 days;

        purchases[nextPurchaseId] = Purchase(
            msg.sender,
            token,
            assetId,
            quantity,
            deposit,
            escrow,
            block.timestamp,
            deadline,
            "",
            "",
            Status.InProgress,
            0,
            false
        );

        emit Purchased(nextPurchaseId, msg.sender, assetId);

        if (address(redemptionGateway) != address(0)) {
            redemptionGateway.lockRedemption(msg.sender);
            emit RedemptionLocked(msg.sender);
        }

        nextPurchaseId++;
    }

    function uploadProgress(uint256 id, string calldata cid) external onlyAdmin {
        Purchase storage p = purchases[id];
        require(p.status == Status.InProgress, "Not active");
        p.progressCID = cid;
        emit ProgressUploaded(id, cid);
    }

    function uploadCompletion(uint256 id, string calldata cid) external onlyAdmin {
        Purchase storage p = purchases[id];
        require(p.status == Status.InProgress, "Not active");
        p.completionCID = cid;
        emit CompletionUploaded(id, cid);
    }

    function releaseEscrow(uint256 id) external onlyAdmin {
        Purchase storage p = purchases[id];
        require(p.status == Status.InProgress, "Not active");
        require(bytes(p.completionCID).length > 0, "No final proof");

        p.status = Status.Completed;
        IERC20(p.tokenUsed).transfer(admin, p.escrowAmount);
        emit EscrowReleased(id);
    }

    function autoRefund(uint256 id) external {
        Purchase storage p = purchases[id];
        require(p.status == Status.InProgress, "Not active");
        require(block.timestamp > p.deliveryDeadline, "Not expired");
        require(bytes(p.completionCID).length == 0, "Already fulfilled");

        p.status = Status.Cancelled;
        IERC20(p.tokenUsed).transfer(p.buyer, p.escrowAmount);
        emit Refunded(id);
    }

    function proposeExtension(uint256 id, uint256 extraDays) external onlyAdmin {
        Purchase storage p = purchases[id];
        require(p.status == Status.InProgress, "Not active");
        require(!p.extensionPending, "Already proposed");

        p.proposedExtension = extraDays;
        p.extensionPending = true;
        emit ExtensionProposed(id, extraDays);
    }

    function approveExtension(uint256 id) external {
        Purchase storage p = purchases[id];
        require(msg.sender == p.buyer, "Not buyer");
        require(p.extensionPending, "No proposal");

        p.deliveryDeadline += p.proposedExtension * 1 days;
        p.extensionPending = false;
        p.proposedExtension = 0;

        emit ExtensionApproved(id, p.deliveryDeadline);
    }

    function cancelPurchase(uint256 id) external {
        Purchase storage p = purchases[id];
        require(msg.sender == p.buyer, "Not buyer");
        require(p.status == Status.InProgress, "Invalid status");
        require(block.timestamp < p.purchaseTime + 5 days, "Window expired");

        p.status = Status.Cancelled;
        uint256 totalRefund = p.depositAmount + p.escrowAmount;
        IERC20(p.tokenUsed).transfer(p.buyer, totalRefund);
        emit Refunded(id);
    }
}
