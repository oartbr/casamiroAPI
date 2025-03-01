/* eslint-disable no-plusplus */
class CodeGenerator {
  constructor(length, type = 'string', prefix = '') {
    this.length = length;
    this.type = type;
    this.prefix = prefix;
    this.chars = this.type === 'string' ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789' : '0123456789';

    this.collection = [];
    this.new();
  }

  new() {
    this.code = '';

    for (let i = 0; i < this.length; i++) {
      const randomIndex = Math.floor(Math.random() * this.chars.length);
      this.code += this.chars.charAt(randomIndex);
    }
    this.code = this.prefix + this.code;
    return this.code;
  }

  create(quantity) {
    for (let i = 0; i < quantity; i++) {
      this.new();
      if (this.collection[this.code]) {
        i--;
      } else {
        this.addToCollection();
      }
    }
    return this.collection;
  }

  addToCollection() {
    this.collection.push(this.code);
  }
}

module.exports = CodeGenerator;
