const res = await fetch("https://globalfiat.brantley-global.com", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ amount: 2000 }) // $20.00
});
