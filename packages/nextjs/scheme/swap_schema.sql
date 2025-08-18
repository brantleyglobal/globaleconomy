-- Swaps
CREATE TABLE Swaps (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  contractaddress TEXT,
  useraddress TEXT NOT NULL,
  exchangerate REAL NOT NULL,
  direction TEXT NOT NULL,
  amountin REAL NOT NULL,
  amountout REAL NOT NULL,
  txhash TEXT NOT NULL,
  signature TEXT NOT NULL,
  calldata TEXT,
  status TEXT NOT NULL,
  chainstatus INTEGER NOT NULL,
  timestamp TEXT NOT NULL,
  queuedat TEXT NOT NULL,
  processedat TEXT,
  priority INTEGER NOT NULL,
  retrycount INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  smartwallet TEXT NOT NULL
);