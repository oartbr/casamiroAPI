const axios = require('axios');
const cheerio = require('cheerio');

class Scraper {
  constructor(url) {
    this.url = url;
    this.items = [];
    this.vendor = {};
  }

  async readUrl() {
    const { data } = await axios.get(this.url);
    const $ = cheerio.load(data);
    this.$ = $;
    return this;
  }

  getTotal() {
    let total = 0;
    this.items.forEach((item) => {
      total += item.totalPrice;
    });
    this.total = total;
  }
}

module.exports = { Scraper };
