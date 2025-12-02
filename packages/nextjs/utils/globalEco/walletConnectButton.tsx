import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/20/solid";

declare global {
  interface EthereumProvider {
    isMetaMask?: boolean;
    request: (args: { method: string; params?: any[] }) => Promise<any>;
    on?: (event: string, handler: (...args: any[]) => void) => void;
  }

  interface Window {
    ethereum?: EthereumProvider | any;
    xfi?: any;
    brave?: any;
    trustwallet?: any;
  }

}

interface BitcoinWallet {
  address: string;
  connect: () => Promise<string>;
  sendTransaction: (to: string, amount: number) => Promise<string>;
}

type WalletConnectButtonProps = {
  onConnect?: (account: string | null) => void;
  isOpen?: boolean;
  onClose?: () => void;
};

export const WalletConnectButton = ({ onConnect }: WalletConnectButtonProps) => {
  const [account, setAccount] = useState<string | null>(null);
  const [isWalletAvailable, setIsWalletAvailable] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [walletName, setWalletName] = useState<string>("");
  const [isMetaMask, setIsMetaMask] = useState(false);
  const [isBrave, setIsBrave] = useState(false);
  const [isCoinbase, setIsCoinbase] = useState(false);
  const [isTrust, setIsTrust] = useState(false);
  const [selectedChain, setSelectedChain] = useState<"ethereum" | "bitcoin">("ethereum");
  const [btcWallet, setBtcWallet] = useState<BitcoinWallet | null>(null);
  const [btcAddress, setBtcAddress] = useState<string | null>(null);
  const [isMultiChainWallet, setIsMultiChainWallet] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const isMobile = typeof window !== "undefined" && /Mobi|Android/i.test(navigator.userAgent);
  const toggleSubmenu = (menu: string) => {
    setOpenSubmenu(prev => (prev === menu ? null : menu));
  };

  const connectBitcoinWallet = async (): Promise<BitcoinWallet> => {
    const wallet: BitcoinWallet = {
      address: "bc1qexampleaddress123",
      connect: async () => "bc1qexampleaddress123",
      sendTransaction: async (to, amount) => {
        console.log(`Sending ${amount} sats to ${to}`);
        return "txid123";
      },
    };

    return wallet;
  };

  useEffect(() => {
    const ethereum = window.ethereum;
    const xdefi = window.xfi;

    if (!ethereum && !xdefi) {
      setIsWalletAvailable(false);
      return;
    }

    // Detect Ethereum-based wallets
    if (ethereum?.isMetaMask) {
      setWalletName("MetaMask");
      setIsMetaMask(true);
      setIsMultiChainWallet(false);
    } else if (ethereum?.isCoinbaseWallet) {
      setWalletName("Coinbase Wallet");
      setIsCoinbase(true);
      setIsMultiChainWallet(false);
    } else if (ethereum?.isBraveWallet) {
      setWalletName("Brave Wallet");
      setIsBrave(true);
      setIsMultiChainWallet(false);
    } else if (ethereum) {
      setWalletName("Injected Wallet");
      setIsTrust(true);
      setIsMultiChainWallet(true); // Trust Wallet or similar
    }

    // Detect XDEFI Wallet
    if (xdefi) {
      setWalletName("XDEFI Wallet");
      setIsMultiChainWallet(true);
      setIsWalletAvailable(true);
    }

    // Get current account
    ethereum.request({ method: "eth_accounts" }).then((accounts: string[]) => {
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        onConnect?.(accounts[0]);
      }
    });

    // Listen for account changes
    ethereum.on?.("accountsChanged", (accounts: string[]) => {
      const newAccount = accounts.length > 0 ? accounts[0] : null;
      setAccount(newAccount);
      onConnect?.(newAccount);
    });
  }, [onConnect]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const connectWallet = async () => {
    if (selectedChain === "ethereum") {
      const ethereum = window.ethereum;
      if (!ethereum) return;

      try {
        const accounts = await ethereum.request({ method: "eth_requestAccounts" });
        setAccount(accounts[0]);
        onConnect?.(accounts[0]);
        setMenuOpen(false);
      } catch (err) {
        console.error("Wallet connection failed:", err);
      }
    } else if (selectedChain === "bitcoin") {
      const wallet = await connectBitcoinWallet();
      setBtcWallet(wallet);
      setBtcAddress(wallet.address);
      onConnect?.(wallet.address);
      setMenuOpen(false);
    }

  };

  useEffect(() => {
    if (selectedChain === "ethereum") {
      setBtcWallet(null);
      setBtcAddress(null);
    } else if (selectedChain === "bitcoin") {
      setAccount(null);
    }
    console.log(window.xfi?.bitcoin);

  }, [selectedChain]);

  useEffect(() => {
    const autoConnect = async () => {
      if (selectedChain === "ethereum" && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
          if (accounts.length > 0) {
            setAccount(accounts[0]);
            onConnect?.(accounts[0]);
          }
        } catch (err) {
          console.error("Ethereum auto-connect failed:", err);
        }
      } else if (selectedChain === "bitcoin") {
        try {
          const wallet = await connectBitcoinWallet();
          setBtcWallet(wallet);
          setBtcAddress(wallet.address);
          onConnect?.(wallet.address);
        } catch (err) {
          console.error("Bitcoin auto-connect failed:", err);
        }
      }
    };

    autoConnect();
  }, [selectedChain]);

  const disconnectWallet = () => {
    if (selectedChain === "ethereum") {
      setAccount(null);
    } else if (selectedChain === "bitcoin") {
      setBtcWallet(null);
      setBtcAddress(null);
    }
    onConnect?.(null);
    setMenuOpen(false);
  };

  if (!isWalletAvailable) {
    return (
      <div className="relative inline-flex items-center space-x-2 mr-8">
        {/* Install Wallet Button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 px-3 py-1.5 
                  bg-white/10 backdrop-blur-md rounded-full 
                  shadow-md hover:bg-white/20 transition">
          {/* Circle Wallet Icon */}
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shadow-inner">
            <img src="/logo.png" alt="Wallet" className="w-7 h-7" />
          </div>

          {/* Label */}
          <span className="text-xs font-medium">INSTALL WALLET</span>

          {/* Chevron */}
          <ChevronDownIcon className="w-4 h-4 ml-1 text-green animate-pulse" />
        </button>
        {/* Dropdown Menu */}
        {menuOpen && (
          <div className="absolute top-12 left-0 bg-black/80 text-xs text-white rounded shadow-md z-50 w-56">
            {/* Mobile-only notice */}
            {isMobile && !account && (
              <div className="bg-yellow-900 text-yellow-100 text-xs rounded px-4 py-2 mb-2">
                Use MetaMask Mobile or desktop browser for blockchain transactions and crypto address related functionality 
              </div>
            )}
            {/* Browser Wallets */}
            <button
              onClick={() => toggleSubmenu("browser")}
              className="w-full flex justify-between items-center px-4 py-2 text-left text-white hover:bg-white/5 focus:outline-none focus:ring-0 active:bg-white/10"
            >
              <span>Browser Wallets</span>
              <span className="ml-2 text-white">{openSubmenu === "browser" ? "▾" : "▸"}</span>
            </button>

            {openSubmenu === "browser" && (
              <div className="pl-4">
                <a href="https://metamask.io/download.html" target="_blank" rel="noopener noreferrer" className="block px-4 py-2 hover:bg-white/5">MetaMask</a>
                <a href="https://brave.com/wallet/" target="_blank" rel="noopener noreferrer" className="block px-4 py-2 hover:bg-white/5">Brave Wallet</a>
                {/*<a href="https://www.coinbase.com/wallet/articles/getting-started-extension" target="_blank" rel="noopener noreferrer" className="block px-4 py-2 hover:bg-white/5">Coinbase Wallet</a>*/}
                <a href="https://trustwallet.com/browser-extension" target="_blank" rel="noopener noreferrer" className="block px-4 py-2 hover:bg-white/5">Trust Wallet</a>
                <a href="https://www.xdefi.io/" target="_blank" rel="noopener noreferrer" className="block px-4 py-2 hover:bg-white/5">XDEFI Wallet</a>
              </div>
            )}

            {/* Mobile Wallets */}
            <button
              onClick={() => toggleSubmenu("mobile")}
              className="w-full flex justify-between items-center px-4 py-2 text-left hover:bg-white/5"
            >
              <span>Mobile Wallets</span>
              <span className="ml-2 text-white">{openSubmenu === "browser" ? "▾" : "▸"}</span>
            </button>
            {openSubmenu === "mobile" && (
              <div className="pl-4">
                <a href="https://trustwallet.com/" target="_blank" rel="noopener noreferrer" className="block px-4 py-2 hover:bg-white/5">Trust Wallet</a>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative inline-flex items-center space-x-2 mr-8" ref={dropdownRef}>
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center gap-2 px-3 py-1.5 
          bg-white/10 backdrop-blur-md rounded-full 
          shadow-md hover:bg-white/20 transition">
        {/* Circle Wallet Icon */}
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shadow-inner">
          <img src="/logo.png" alt="Wallet" className="w-7 h-7" />
        </div>

        {/* Address Display or Connect Prompt */}
        {(selectedChain === "ethereum" && account) ? (
          <span className="text-xs text-white font-medium drop-shadow-sm">
            {selectedChain === "ethereum"
              ? `${walletName}: ${account?.slice(0, 6)}...${account?.slice(-4)}`
              : `Bitcoin: ${btcAddress?.slice(0, 6)}...${btcAddress?.slice(-4)}`}
          </span>
        ) : (
          <span className="text-xs text-white font-medium drop-shadow-sm">
            CONNECT WALLET
          </span>
        )}
      </button>
      {/* Dropdown */}
      {menuOpen && (
        <div className="absolute top-12 left-0 bg-black/80 text-xs text-white rounded shadow-md z-50 w-48">
          {!account && (
            <>
              {isMetaMask && (
                <button onClick={connectWallet} className="w-full px-4 py-2 hover:bg-white/5">
                  Connect with MetaMask
                </button>
              )}
              {isBrave && (
                <button onClick={connectWallet} className="w-full px-4 py-2 hover:bg-white/5">
                  Connect with Brave Wallet
                </button>
              )}
              {isCoinbase && (
                <button onClick={connectWallet} className="w-full px-4 py-2 hover:bg-white/5">
                  Connect with Coinbase Wallet
                </button>
              )}
              {isTrust && (
                <button onClick={connectWallet} className="w-full px-4 py-2 hover:bg-white/5">
                  Connect with Trust Wallet
                </button>
              )}
            </>
          )}
          {(account || btcAddress) && isMultiChainWallet && (
            <div className="px-4 py-2 border-t border-white/10">
              <span className="block text-white mb-1">Select Network:</span>
              <button
                onClick={() => {
                  setSelectedChain("ethereum");
                  setMenuOpen(false);
                }}
                className={`w-full px-4 py-2 text-left hover:bg-white/5 ${
                  selectedChain === "ethereum" ? "bg-white/10" : ""
                }`}
              >
                EVM
              </button>
              {/*<button
                onClick={() => {
                  setSelectedChain("bitcoin");
                  setMenuOpen(false);
                }}
                className={`w-full px-4 py-2 text-left hover:bg-white/5 ${
                  selectedChain === "bitcoin" ? "bg-white/10" : ""
                }`}
              >
                Bitcoin
              </button>*/}
            </div>
          )}
          {(account || btcAddress) && (
            <button onClick={disconnectWallet} className="w-full px-4 py-2 hover:bg-white/5">
              DISCONNECT WALLET
            </button>
          )}
        </div>
      )}
    </div>
  );
};
