-- Purchases
CREATE TABLE Purchases (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  contractaddress TEXT,
  useraddress TEXT NOT NULL,
  asset TEXT NOT NULL,
  amount REAL NOT NULL,
  quantity INTEGER NOT NULL,
  paymentmethod TEXT NOT NULL,
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
  smartwallet TEXT NOT NULL,
  escrowcall TEXT NOT NULL
);