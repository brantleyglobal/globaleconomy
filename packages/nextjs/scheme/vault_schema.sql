-- Vault
CREATE TABLE Vault (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  contractaddress TEXT,
  useraddress TEXT NOT NULL,
  depositamount REAL NOT NULL,
  paymentmethod TEXT NOT NULL,
  depositstarttime TEXT NOT NULL,
  committedquarters REAL NOT NULL,
  ispending INTEGER NOT NULL,
  isclosed INTEGER NOT NULL,
  txhash TEXT NOT NULL,
  signature TEXT NOT NULL,
  calldata TEXT,
  status TEXT NOT NULL,
  chainstatus INTEGER,
  timestamp TEXT NOT NULL,
  queuedat TEXT NOT NULL,
  processedat TEXT,
  retrycount INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  receipthash TEXT NOT NULL,
  smartwallet TEXT NOT NULL
);