const { ScraperRS } = require('./scraperRS');

class SelectStateScraper {
  constructor(url) {
    const { host } = new URL(url);
    const parts = host.split('/');

    this.url = url;
    // eslint-disable-next-line prefer-destructuring
    this.origin = parts[2];

    return this;
  }

  async select() {
    try {
      this.notaData = new ScraperRS(this.url);
    } catch (err) {
      throw new Error(`Invalid URL or state not supported: ${err.message}`);
    }
    return this.notaData;
  }
}

module.exports = { SelectStateScraper };
