import global from '../common/global';

export default {
  methods: {
    $mpGetNameByUrl(...params) {
      return global.getItem('getNameByUrlHandler')(...params);
    }
  }
};
