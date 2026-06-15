import { discoverLeadsWithGemini } from '../lib/services/gemini';

async function testLinkedInSearch() {
  console.log("Searching for LinkedIn leads...");
  const leads = await discoverLeadsWithGemini();
  console.log(JSON.stringify(leads, null, 2));
}

testLinkedInSearch().catch(console.error);
