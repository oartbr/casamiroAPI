/* eslint-disable class-methods-use-this */
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const { Scraper } = require('./scraper');

dayjs.extend(customParseFormat);

class ScraperRS extends Scraper {
  async readNota(existingNota) {
    this.getGeneralInfo();
    this.vendor = await this.getVendor();
    this.nf = existingNota.id;
    this.id = existingNota._id;

    this.getItems();
    this.getTotal();
    return this;
  }

  getItems() {
    this.$('tr').each((index, element) => {
      const item = {
        product: this.getProductName(this.$(element).find('.txtTit').text().trim()),
        code: this.getProductCode(this.$(element).find('.RCod').text().trim()),
        quantity: this.getQuantity(this.$(element).find('.Rqtd').text().trim()),
        unitPrice: this.getUnitPrice(this.$(element).find('.RvlUnit').text().trim()),
        totalPrice: this.getTotalPrice(this.$(element).find('.valor').text().trim()),
        purchaseDate: this.purchaseDate,
        notaId: this.id,
        vendor: this.CNPJ,
      };

      this.items.push(item);
    });
  }

  getVendor() {
    this.vendor = {
      name: this.$('#conteudo .txtTopo').text(),
      CNPJ: this.getCNPJ(this.$('#conteudo div.text:first').text()),
      address: this.getAddress(this.$('#conteudo div.text:last()').text()),
    };
    return this.vendor;
  }

  getCNPJ(text) {
    const cnpjRegex = /CNPJ:\s*([\d./-]+)/;
    const match = text.match(cnpjRegex);
    if (match) {
      const [, cnpj] = match;
      this.CNPJ = cnpj;
    } else {
      this.CNPJ = null;
    }
    return this.CNPJ;
  }

  getAddress(text) {
    const addressRegex = /([^\n]+)\n\s*,\n\s*([\d]+)\n\s*,\n\s*\n\s*,\n\s*([^\n]+)\n\s*,\n\s*([^\n]+)\n\s*,\n\s*([^\n]+)/;
    const match = text.match(addressRegex);
    if (match) {
      this.address = {
        street: match[1].trim(),
        number: match[2].trim(),
        neighborhood: match[3].trim(),
        city: match[4].trim(),
        state: match[5].trim(),
      };
      return this.address;
    }
    return null;
  }

  getGeneralInfo() {
    const info = this.$('#infos li').text();
    const infos = info.split('\n');
    const emissao = infos[0].split('Emissão: ');
    this.purchaseDate = dayjs(emissao[1], 'DD/MM/YYYY HH:mm:ss').toDate();
    return this.purchaseDate;
  }

  getProductCode(text) {
    const codeRegex = /Código:\s*([\d]+)/;
    const match = text.match(codeRegex);
    if (match) {
      const [, accessKey] = match;
      return accessKey;
    }
    return null;
  }

  getProductName(text) {
    const productNameRegex = /^[^\n]+/;
    const match = text.match(productNameRegex);
    if (match) {
      return match[0].trim();
    }
    return null;
  }

  getQuantity(text) {
    const quantityRegex = /Qtde\.:(\d+(?:,\d+)?)/;
    const match = text.match(quantityRegex);
    if (match) {
      return parseFloat(match[1].replace(',', '.'));
    }
    return null;
  }

  getUnitPrice(text) {
    const unitPriceRegex = /Vl\. Unit\.:\s*(\d+(?:,\d+)?)/;
    const match = text.match(unitPriceRegex);
    if (match) {
      return parseFloat(match[1].replace(',', '.'));
    }
    return null;
  }

  getTotalPrice(text) {
    return parseFloat(text.replace(',', '.'));
  }
}

module.exports = { ScraperRS };
