// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract SmartVault is Ownable {
    IERC20 public immutable stableToken; // WGBD
    address public seedNode;

    uint256 public totalDeposits;
    uint256 public totalProfits;
    uint256 public currentDistributionId;

    uint256 public investmentReserve;
    uint256 public productReserve;
    uint256 public redemptionReserve;

    struct UserInfo {
        uint256 amount;
        uint256 depositTime;
        uint256 claimedDistribution;
        uint256 recommitCount;
        uint256 eligibleQuarter;
        uint256 committedQuarters;
        uint256 unlockQuarter;
    }

    struct Redemption {
        address user;
        uint256 amount;
        uint256 requestQuarter;
        bool fulfilled;
    }

    Redemption[] public redemptionQueue;
    mapping(address => uint256[]) public userRedemptionIds;
    mapping(address => UserInfo) public users;
    mapping(address => bool) public hasLockedRedemption;
    mapping(uint256 => uint256) public distributionProfits;

    event Deposited(address indexed user, uint256 amount, uint256 committedQuarters);
    event Recommitted(address indexed user, uint256 newQuartersCommitted);
    event ProfitAdded(address indexed from, uint256 amount);
    event Distributed(uint256 id, uint256 totalProfit);
    event Claimed(address indexed user, uint256 reward);
    event Withdrawn(address indexed user, uint256 amount);
    event CapitalAllocated(uint256 investment, uint256 products, uint256 redemptions);
    event CapitalSpent(address indexed target, uint256 amount, string purpose);

    modifier onlySeed() {
        require(msg.sender == seedNode, "Not authorized");
        _;
    }

    constructor(address initialOwner, address _stableToken, address _seedNode) Ownable(initialOwner) {
        require(_stableToken != address(0), "Invalid stable token");
        require(_seedNode != address(0), "Invalid seed node");
        stableToken = IERC20(_stableToken);
        seedNode = _seedNode;
    }

    function deposit(uint256 amount, uint256 committedQuarters) external {
        require(amount > 0, "Zero amount");
        require(committedQuarters >= 1, "Minimum 1 quarter commitment");

        stableToken.transferFrom(msg.sender, address(this), amount);

        UserInfo storage user = users[msg.sender];

        if (user.amount == 0) {
            user.depositTime = block.timestamp;
            user.committedQuarters = committedQuarters;
            user.eligibleQuarter = computeEligibilityQuarter(block.timestamp, committedQuarters);
            user.unlockQuarter = getQuarter(block.timestamp) + committedQuarters;
        }

        user.amount += amount;
        totalDeposits += amount;
        hasLockedRedemption[msg.sender] = true;

        emit Deposited(msg.sender, amount, committedQuarters);
    }

    function recommit(uint256 additionalQuarters) external {
        UserInfo storage user = users[msg.sender];
        require(block.timestamp >= user.depositTime + (user.committedQuarters * 90 days), "Still locked");

        user.depositTime = block.timestamp;
        user.recommitCount += 1;
        user.committedQuarters = additionalQuarters;
        user.eligibleQuarter = computeEligibilityQuarter(block.timestamp, additionalQuarters);
        user.unlockQuarter = getQuarter(block.timestamp) + additionalQuarters;

        emit Recommitted(msg.sender, additionalQuarters);
    }

    function requestRedemption() external {
        UserInfo storage user = users[msg.sender];
        require(user.amount > 0, "Nothing to redeem");
        require(getQuarter(block.timestamp) >= user.unlockQuarter, "Still locked");

        uint256 amount = user.amount;
        user.amount = 0;
        totalDeposits -= amount;

        redemptionQueue.push(Redemption({
            user: msg.sender,
            amount: amount,
            requestQuarter: getQuarter(block.timestamp),
            fulfilled: false
        }));

        userRedemptionIds[msg.sender].push(redemptionQueue.length - 1);
        hasLockedRedemption[msg.sender] = false;
    }

    function getOutstandingRedemptions() external view returns (Redemption[] memory) {
        uint256 count;
        for (uint256 i = 0; i < redemptionQueue.length; i++) {
            if (!redemptionQueue[i].fulfilled) count++;
        }

        Redemption[] memory pending = new Redemption[](count);
        uint256 j;
        for (uint256 i = 0; i < redemptionQueue.length; i++) {
            if (!redemptionQueue[i].fulfilled) {
                pending[j++] = redemptionQueue[i];
            }
        }

        return pending;
    }



    function addProfit(uint256 amount) external {
        require(amount > 0, "Zero profit");
        stableToken.transferFrom(msg.sender, address(this), amount);
        totalProfits += amount;

        emit ProfitAdded(msg.sender, amount);
    }

    function processRedemptions() public onlySeed {
        for (uint256 i = 0; i < redemptionQueue.length; i++) {
            Redemption storage r = redemptionQueue[i];
            if (!r.fulfilled && stableToken.balanceOf(address(this)) >= r.amount) {
                r.fulfilled = true;
                redemptionReserve -= r.amount;
                stableToken.transfer(r.user, r.amount);
                emit Withdrawn(r.user, r.amount);
            }
        }
    }


    function distribute() external onlySeed {
        require(totalProfits > 0, "No profits available");
        distributionProfits[++currentDistributionId] = totalProfits;
        emit Distributed(currentDistributionId, totalProfits);
        totalProfits = 0;
    }

    function distributeTo(address userAddr) public onlySeed {
        UserInfo storage user = users[userAddr];
        if (user.amount == 0) return;
        if (getQuarter(block.timestamp) < user.eligibleQuarter) return;
        if (currentDistributionId <= user.claimedDistribution) return;

        uint256 reward;
        for (uint256 i = user.claimedDistribution + 1; i <= currentDistributionId; i++) {
            uint256 profit = distributionProfits[i];
            uint256 multiplier = getMultiplier(user.depositTime, user.committedQuarters);
            reward += (user.amount * multiplier * profit) / (totalDeposits * 100);
        }

        user.claimedDistribution = currentDistributionId;
        if (reward > 0) {
            stableToken.transfer(userAddr, reward);
            emit Claimed(userAddr, reward);
        }
    }

    function batchDistribute(address[] calldata userList) external onlySeed {
        for (uint256 i = 0; i < userList.length; i++) {
            distributeTo(userList[i]);
        }
    }

    function allocateCapital(uint256 forInvestment, uint256 forProducts, uint256 forRedemptions) external onlyOwner {
        uint256 total = forInvestment + forProducts + forRedemptions;
        require(total <= stableToken.balanceOf(address(this)), "Overallocated");

        investmentReserve = forInvestment;
        productReserve = forProducts;
        redemptionReserve = forRedemptions;

        emit CapitalAllocated(forInvestment, forProducts, forRedemptions);
    }

    function spendCapital(address to, uint256 amount, string calldata purpose) external onlyOwner {
        require(to != address(0), "Invalid target");
        require(amount <= investmentReserve, "Insufficient capital");

        investmentReserve -= amount;
        stableToken.transfer(to, amount);

        emit CapitalSpent(to, amount, purpose);
    }

    // --- Helpers ---

    function getMultiplier(uint256 depositTime, uint256 committedQuarters) public view returns (uint256) {
        uint256 depositQ = getQuarter(depositTime);
        uint256 nowQ = getQuarter(block.timestamp);
        uint256 held = nowQ > depositQ ? nowQ - depositQ : 0;

        // Base multipliers based on committed quarters
        uint256 baseMultiplier;
        if (committedQuarters >= 6) {
            baseMultiplier = 200;
        } else if (committedQuarters >= 4) {
            baseMultiplier = 150;
        
        } else {
            baseMultiplier = 125;
        }

        // Apply full multiplier only if user actually held their deposit at least the committed duration
        if (held >= committedQuarters) {
            return baseMultiplier;
        }

        // Otherwise, scale proportionally to how long they actually held it (minimum 100%)
        uint256 scaled = 100 + ((baseMultiplier - 100) * held) / committedQuarters;
        return scaled > baseMultiplier ? baseMultiplier : scaled;
    }


    function computeEligibilityQuarter(uint256 timestamp, uint256 committedQuarters) public pure returns (uint256) {
        uint256 quarter = getQuarter(timestamp);
        uint256 startOfQ = getQuarterStart(timestamp);
        uint256 daysIntoQuarter = (timestamp - startOfQ) / 1 days;

        uint256 graceWindow = committedQuarters >= 3 ? 20 : 0;

        return daysIntoQuarter <= graceWindow ? quarter : quarter + 1;
    }


    function getQuarter(uint256 ts) public pure returns (uint256) {
        uint256 year = 1970 + (ts / 31556926);
        uint256 month = (ts / 2592000) % 12 + 1;
        uint256 quarter = (month - 1) / 3 + 1;
        return year * 4 + quarter;
    }

    function getQuarterStart(uint256 ts) public pure returns (uint256) {
        uint256 year = 1970 + (ts / 31556926);
        uint256 month = (ts / 2592000) % 12 + 1;
        uint256 quarterStartMonth = ((month - 1) / 3) * 3 + 1;
        return toTimestamp(year, quarterStartMonth, 1);
    }

    function toTimestamp(uint256 year, uint256 month, uint256 day) internal pure returns (uint256) {
        return (year - 1970) * 365 days + (month - 1) * 30 days + (day - 1) * 1 days;
    }
}

