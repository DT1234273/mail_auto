import { promises as dns } from 'dns';
async function test() {
  try {
     const mx = await dns.resolveMx("torontolanguageacademy.ca");
     console.log("MX for torontolanguageacademy.ca:", mx);
  } catch (e) {
     console.error("Error syd:", e);
  }
}
test();
