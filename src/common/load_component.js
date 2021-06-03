// 加载微模块自定义组件
import { loaderContext } from '@xes/dh-boston-launcher/dist/loader.esm.js';
import global from './global';
class LoadComponent {
  constructor() {
    this.bostonContext = loaderContext;
    this.bostonURI = global.getItem('bostonLoaderUrl') || 'https://b.xes1v1.com';
    this.isInit = false;
  }

  init() {
    if (!this.isInit) {
      this.bostonContext.init(this.bostonURI, false);
      this.isInit = true;
    }
    return this;
  }

  async importComp(libaryName) {
    if (libaryName) {
      try {
        let importRes = await loaderContext.import(libaryName);
        return importRes;
      } catch(e) {
        throw new Error(e.message);
      }
    }
  }
}
export default new LoadComponent();