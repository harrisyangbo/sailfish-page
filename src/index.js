import mpUI from '@xes/dh-component-vue-mp-ui';
import '@xes/dh-component-vue-mp-ui/dist/dh_component_vue_mp_ui.min.css';
import renderComponent from './page/index.vue';
import global from './common/global';
import ElementUI from 'element-ui';
import configConvert from './compatibility/convert';

export { configConvert };

export default {
  install(Vue, {
    hasPermit = () => true, // 权限接口
    getNameByUrl = () => '', // 页面名称
    formInputComponents = {}, // 表单输入/展示自定义组件
    tableFieldComponents = {}, // 表格自定义组件
    logicComponents = {}, // 逻辑自定义组件
    bostonLoaderUrl = 'https://b.xes1v1.com'
  } = {}) {
    global.setItem('getNameByUrlHandler', getNameByUrl);
    global.setItem('bostonLoaderUrl', bostonLoaderUrl);
    Vue.use(ElementUI);
    Vue.use(mpUI, {
      hasPermit,
      formInputComponents,
      tableFieldComponents,
      logicComponents
    });
    Vue.component('catalyst-page', renderComponent);
  },
};
