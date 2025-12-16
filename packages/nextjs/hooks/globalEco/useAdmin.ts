import { useAccount } from "wagmi";

const ADMIN_WALLET = "0x1166579617240592e8a7c87bc389549eab8de047".toLowerCase();

export function useIsAdmin() {
  const { address } = useAccount();
  return address?.toLowerCase() === ADMIN_WALLET;
}
