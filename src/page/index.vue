<template>
  <div
    v-loading="loading"
    style="width: 100%; height: 100%;"
  >
    <catalyst-render
      v-if="!loading"
      :page-title="pageTitle"
      :business-config="businessConfig"
      :initiate-model="initiateModel"
      :custom-components-list="customComponentsList"
      @dialogShow="exportDialogShow"
      @dockerShow="exportDockerShow"
      @confirm="exportConfirm"
      @cancel="exportCancel"
    >
      <template #dialog>
        <slot name="dialog" />
      </template>
      <template #docker>
        <slot name="docker" />
      </template>
    </catalyst-render>
  </div>
</template>

<script>
import SailfishRender from '../render/index';
// import loadComponent from '../common/load_component';
// import { typeComponents, isCatalystComponent } from 'sailfish-ui';
export default {
  name: 'SailfishPage',
  components: {
    SailfishRender
  },
	/**
	 * @param pageTitle 页面标题
	 * @param businessConfig 页面JSON配置
	 * @param initiateModel 页面数据模型
	 * **/
  props: {
    pageTitle: {
      type: String,
      default: ''
    },
    businessConfig: {
      type: Object,
      default: null
    },
    initiateModel: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      loading: true,
      customComponentsList: {}
    };
  },
  watch: {
    businessConfig(newConfig) {
      this.loading = true;
      this.loadCustomComponent(newConfig).then(() => {
        this.$nextTick(() => {
          this.loading = false;
        });
      }).catch((e) => {
        this.$nextTick(() => {
          this.loading = false;
        });
        throw new Error(e.message);
      });
    }
  },
  methods: {
    exportDialogShow(...params) {
      this.$emit('dialogShow', ...params);
    },
    exportDockerShow(...params) {
      this.$emit('dockerShow', ...params);
    },
    exportConfirm(...params) {
      this.$emit('confirm', ...params);
    },
    exportCancel(...params) {
      this.$emit('cancel', ...params);
    },
    async loadCustomComponent(newConfig) {
      if (newConfig.content) {
				return Promise.resolve()
				// 临时屏蔽加载自定义组件逻辑
        // for (let i = 0; i<newConfig.content.length; i++) {
        //   if (newConfig.content[i].type && !isCatalystComponent(newConfig.content[i])) {\
        //     if (!typeComponents[newConfig.content[i].type]) {
        //       try {
        //         let versionMap = newConfig.content[i].version.includes('v') ? newConfig.content[i].version.replace('v', '') : newConfig.content[i].version;
        //         let libaryName = `${newConfig.content[i].type}@${versionMap}/custom_component`;
        //         let res = await loadComponent.init().importComp(libaryName);
        //         if (!this.customComponentsList[newConfig.content[i].type] && res ) {
        //           this.customComponentsList[newConfig.content[i].type] = res;
        //         }
        //       } catch(e) {
        //         let msg = `自定义组件加载失败: ${e.message}`;
        //         this.$message.error(msg);
        //         throw new Error(`Boston loader error: ${e.message}`);
        //       }
        //     }
        //   }
        // }
      }
    }
  }
};
</script>
