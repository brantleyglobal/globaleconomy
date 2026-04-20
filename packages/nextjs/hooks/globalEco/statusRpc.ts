//statusRpc.ts

import {useEffect, useState } from "react";

export function useRpcStatus(interval = 5000) {
    const [rpcUp, setRpcUp] = useState<boolean | null>(null);


    useEffect(() => {
        const check = async () => {
            try {
                const res = await fetch("https://rpc.brantley-global.com",{
                    method: "POST",
                    headers: { "Content-Type": "application/json"},
                    body: JSON.stringify({
                        jsonrpc: "2.0",
                        id: 1,
                        method: "eth_blockNumber",
                        params: []
                    })
                }); //check if correct to call this way
                const data = await res.json();
                setRpcUp(Boolean(data.result));
            } catch {
                setRpcUp(false);
            }
        }

        check();
        const id = setInterval(check, interval);
        return () => clearInterval(id);
    },[interval]);

    return rpcUp;
}