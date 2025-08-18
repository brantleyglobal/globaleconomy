-- Transfers
CREATE TABLE Transfers (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  contractaddress TEXT,
  sender TEXT NOT NULL,
  recipient TEXT NOT NULL,
  token TEXT NOT NULL,
  amount REAL NOT NULL,
  timestamp TEXT NOT NULL,
  txhash TEXT NOT NULL,
  signature TEXT NOT NULL,
  calldata TEXT,
  status TEXT NOT NULL,
  chainstatus INTEGER NOT NULL,
  queuedat TEXT NOT NULL,
  processedat TEXT,
  priority INTEGER NOT NULL,
  retrycount INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  receipthash TEXT NOT NULL,
  smartwallet TEXT NOT NULL
);