
async function probe() {
  console.log('--- Probing Image Sources ---');
  const q = 'photosynthesis diagram';

  // 1. DuckDuckGo Search Probe
  try {
    const pageResp = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(q)}&iax=images&ia=images`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    });
    const html = await pageResp.text();
    const vqdMatch = html.match(/vqd=([0-9-]+)/) || html.match(/vqd="([^"]+)"/);
    console.log('DDG vqd match:', vqdMatch ? vqdMatch[1] : 'none');
    if (vqdMatch) {
      const vqd = vqdMatch[1];
      const imgApiUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(q)}&vqd=${vqd}&f=,,,&p=1`;
      const imgResp = await fetch(imgApiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://duckduckgo.com/',
        }
      });
      if (imgResp.ok) {
        const data = await imgResp.json();
        console.log('DDG images found count:', data.results?.length);
        if (data.results?.length > 0) {
          const first = data.results[0];
          console.log('DDG Image 1:', { title: first.title, image: first.image, source: first.source, url: first.url });
        }
      } else {
        console.log('DDG img status:', imgResp.status);
      }
    }
  } catch (e) {
    console.log('DDG error:', e.message);
  }

  // 2. Openverse Probe
  try {
    const ovResp = await fetch(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&page_size=3`, {
      headers: { 'User-Agent': 'GraphicalAITutor/2.0' }
    });
    console.log('Openverse status:', ovResp.status);
    if (ovResp.ok) {
      const ovData = await ovResp.json();
      console.log('Openverse results count:', ovData.results?.length);
      if (ovData.results?.length > 0) {
        const item = ovData.results[0];
        console.log('Openverse sample:', { title: item.title, url: item.url, thumbnail: item.thumbnail, foreign_landing_url: item.foreign_landing_url });
      }
    }
  } catch (e) {
    console.log('Openverse error:', e.message);
  }

  // 3. Wikipedia Summary Probe
  try {
    const wikiResp = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/Photosynthesis`, {
      headers: { 'User-Agent': 'GraphicalAITutor/2.0' }
    });
    console.log('Wikipedia status:', wikiResp.status);
    if (wikiResp.ok) {
      const wData = await wikiResp.json();
      console.log('Wikipedia title:', wData.title, 'thumbnail:', wData.thumbnail?.source ? 'YES' : 'NO');
    }
  } catch (e) {
    console.log('Wikipedia error:', e.message);
  }
}

probe();
