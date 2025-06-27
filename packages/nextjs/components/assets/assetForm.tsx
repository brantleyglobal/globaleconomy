// components/storefront/AddAssetForm.tsx
"use client";
import { useState } from "react";
import { useScaffoldWriteContract } from "~~/hooks/globalDEX";

export const AddAssetForm: React.FC = () => {
  const [form, setForm] = useState({
    name: "",
    priceUSD: "",
    metadataCID: "",
    baseDays: "",
    perUnitDelay: "",
  });

  const { writeContractAsync, isMining } = useScaffoldWriteContract({
  contractName: "assetStore",
});


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const submit = async () => {
    try {
      await writeContractAsync({
        functionName: "addAsset",
        args: [
          form.name,
          BigInt(form.priceUSD),
          form.metadataCID,
          BigInt(form.baseDays),
          BigInt(form.perUnitDelay),
        ],
      });
      setForm({ name: "", priceUSD: "", metadataCID: "", baseDays: "", perUnitDelay: "" });
    } catch (err) {
      console.error("Failed to add asset:", err);
    }
  };


  return (
    <div className="max-w-2xl space-y-4">
      <h2 className="text-xl font-semibold">Add New Asset</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input className="input input-bordered" name="name" placeholder="Asset name" value={form.name} onChange={handleChange} />
        <input className="input input-bordered" name="priceUSD" placeholder="Price in USD" value={form.priceUSD} onChange={handleChange} />
        <input className="input input-bordered" name="metadataCID" placeholder="IPFS CID" value={form.metadataCID} onChange={handleChange} />
        <input className="input input-bordered" name="baseDays" placeholder="Base Days" value={form.baseDays} onChange={handleChange} />
        <input className="input input-bordered" name="perUnitDelay" placeholder="Delay per Extra Unit" value={form.perUnitDelay} onChange={handleChange} />
      </div>
      <button className="btn btn-primary" disabled={isMining} onClick={submit}>
        {isMining ? "Submitting..." : "Submit Asset"}
      </button>

    </div>
  );
};
