export async function analyzeWithPageSpeed(url: string) {
  const key = process.env.PAGESPEED_API_KEY;
  if (!key) {
    console.warn("PAGESPEED_API_KEY missing. Skipping real PageSpeed audit.");
    return null;
  }

  try {
    const apiEndpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${key}&strategy=mobile`;
    const res = await fetch(apiEndpoint);
    
    if (!res.ok) {
      throw new Error(`PageSpeed API returned ${res.status}`);
    }

    const data = await res.json();
    
    // Lighthouse performance score is 0 to 1
    const score = data?.lighthouseResult?.categories?.performance?.score;
    
    return {
      mobile_score: score ? Math.round(score * 100) : 0,
      speed_score: score ? Math.round(score * 100) : 0
    };
  } catch (error) {
    console.error("PageSpeed API Error:", error);
    return null;
  }
}
