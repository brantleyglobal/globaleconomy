export async function ensureGlobalChain(provider: any) {
  const target = CHAINS.global;
  const current = await provider.request({ method: "eth_chainId" });

  if (normalizeChainId(current) !== normalizeChainId(target.chainId)) {
    await switchOrAddChain(provider, target);
  }
}