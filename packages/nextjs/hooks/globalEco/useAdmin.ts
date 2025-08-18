import { useAccount } from "wagmi";

const ADMIN_WALLET = "0xA6d2B0570c54E9bB4Ea3d5C9f8055fE67F9bE788".toLowerCase();

export function useIsAdmin() {
  const { address } = useAccount();
  return address?.toLowerCase() === ADMIN_WALLET;
}
