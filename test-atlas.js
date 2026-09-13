import dns from "dns/promises";

try {
  const srv = await dns.resolveSrv("_mongodb._tcp.cluster0.af2ph.mongodb.net");
  console.log("SRV:", srv);

  const txt = await dns.resolveTxt("cluster0.af2ph.mongodb.net");
  console.log("TXT:", txt);
} catch (err) {
  console.error(err);
}