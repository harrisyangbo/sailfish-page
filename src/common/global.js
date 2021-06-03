const cache = {
  getNameByUrlHandler() {
    return '';
  }
};

export default {
  getItem(key) {
    return cache[key];
  },
  setItem(key, item) {
    cache[key] = item;
  }
};
