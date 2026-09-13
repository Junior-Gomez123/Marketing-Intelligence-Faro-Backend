import dns from "dns";

console.log("Antes:", dns.getServers());

dns.setServers(["1.1.1.1", "8.8.8.8"]);

console.log("Después:", dns.getServers());

dns.resolveSrv(
  "_mongodb._tcp.cluster0.af2ph.mongodb.net",
  (err, records) => {
    console.log("Error:", err);
    console.log("Records:", records);
  }
);
