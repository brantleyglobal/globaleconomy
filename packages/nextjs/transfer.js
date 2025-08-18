export async function onRequestPost({ request, env }) {
  const transferdb = env.DB_TRANSFERS;

  // Step 1: Check Authorization header
  const authHeader = request.headers.get("Authorization"); 
  const expectedToken = `Bearer ${env.API_SECRET}`;

  if (authHeader !== expectedToken) {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Step 2: Proceed with insert if authorized
  try {
    const body = await request.json();

    const {
      contractaddress,
      txhash,
      signature,
      sender,
      recipient,
      smartwallet,
      token,
      amount,
      calldata,
      receipthash,
      status,
      chainstatus,
      queuedat,
      processedat,
      retrycount = 0,
      priority = 0,
      notes = null,
      timestamp,
    } = body;

    const stmt = transferdb.prepare(`
      INSERT INTO transfers (
        contractaddress, sender, recipient, token, amount,
        timestamp, txhash, signature, calldata, status,
        chainstatus, queuedat, processedat, priority,
        retrycount, notes, receipthash, smartwallet
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    await stmt.bind(
      contractaddress,
      sender,
      recipient,
      token,
      amount,
      timestamp ? new Date(timestamp).toISOString() : new Date().toISOString(),
      txhash,
      signature,
      calldata ?? null,
      status,
      chainstatus,
      new Date(queuedat).toISOString(),
      processedat ? new Date(processedat).toISOString() : null,
      priority,
      retrycount,
      notes ?? null,
      receipthash,
      smartwallet
    ).run();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Insert Error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
