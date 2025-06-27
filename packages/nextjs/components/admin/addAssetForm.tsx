const { writeAsync: addAsset } = useScaffoldContractWrite({
  contractName: "assetStore",
  functionName: "addAsset",
  args: [...userInputs],
});
