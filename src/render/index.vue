<script>
import _pickBy from 'lodash.pickby';
import typer from '@xes/dh-module-type';
import { typeComponents, getProperty, setProperty, validator, isInput, isDataContainer, isInteraction, isLayout, isLogic } from 'sailfish-ui';
import templateMixin from '../mixin/sailfish_template';
import callPromisify from '../common/call';
import authMixin from '../mixin/auth';
import TemplateAnalyzer from '@xes/fe-template-analyzer';

export default {
  name: 'SailfishRender',
  render(createElement) {
    let children = [];
    if (!!this.pageTitle && (!this.businessConfig || !this.businessConfig.tabs)) {
      children.push(createElement('header', {
        'class': 'list-title'
      }, [this.pageTitle]));
    }
    if (this.componentTree && this.dataModel) {
      children.push(createElement('div', {
        'class': 'list-template'
      }, [
        createElement('el-form', {
          props: {
            model: this.dataModel
          }
        }, this.renderComponentTree(createElement, [ this.componentTree ], this.dataModel))
      ]));
    }
    if (this.showDialog) {
      // 渲染对话框
      children.push(createElement('el-dialog', {
        props: {
          title: this.dialogOrDrawerTitle,
          visible: this.showDialog,
          appendToBody: true
        },
        on: {
          'update:visible': (val) => {
            this.showDialog = val;
          }
        }
      }, this.$slots.dialog));
    }
    if (this.showDrawer) {
      const that = this;
      // 渲染滑层
      children.push(createElement('dh-drawer', {
        props: {
          size: '82%',
          beforeClose(close) {
            if (that.$data.$mpDrawerContentChanged) {
              this.$confirm('当前页面内容已做更改，关闭后将不会对修改内容做保存，是否确认关闭？', '', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
              }).then(() => {
                that.$mpSetDrawerContentChanged(false);
                close();
              }).catch(() => {});
            } else {
              that.$mpSetDrawerContentChanged(false);
              close();
            }
          },
          destroyOnClose: true,
          title: this.dialogOrDrawerTitle,
          visible: this.showDrawer,
          direction: 'rtl'
        },
        on: {
          'update:visible': (val) => {
            this.showDrawer = val;
          }
        }
      }, this.$slots.docker));
    }
    return createElement('div', {'class': 'list-template-box'}, children);
  },
  mixins: [
    templateMixin,
    authMixin
  ],
  props: {
    pageTitle: {
      type: String,
      default: ''
    },
    customComponentsList: {
      type: Object,
      default: () => {
        return {};
      }
    }
  },
  inject: {
    $mpRenderTab: {
      default: () => null
    },
    $mpMatchKeyword: {
      default: () => null
    }
  },
  data() {
    return {
      showDialog: false,
      showDrawer: false,
      currentDialogOrDrawerUri: '',
    };
  },
  computed: {
    dialogOrDrawerTitle() {
      if (this.currentDialogOrDrawerUri) {
        let title = '';
        if (this.$mpGetNameByUrl) {
          title = this.$mpGetNameByUrl(this.currentDialogOrDrawerUri);
        }
        return title ? title : '';
      } else {
        return '';
      }
    }
  },
  methods: {
    querySearch(obj, keyName) {
      if (this.$mpMatchKeyword) {
        callPromisify(this.$mpMatchKeyword)(obj.uri, {
          [keyName]: obj.inputContent
        }).then(data => {
          obj.returnMatchResult(data);
        }).catch(error => {
          this.$message.error(error.message);
        });
      } else {
        this.$message.error('没有注入关键字模糊匹配的方法');
      }
    },
    renderComponentTree(createElement, componentNodes, contextModel, parentNode = null) {
      let layoutHeaderSlot = false;
      let parentComponentId = '';
      if (parentNode) {
        // 判断如果父组件是行布局组件，并且是否开启了头部插槽。如果layoutHeaderSlot为true，则将componentNodes中的第一个组件(表单块、表单组件、交互组件)放到头部插槽
        if (parentNode.type === 'row') {
          layoutHeaderSlot = parentNode.foldable && !parentNode.label;
        }
        // 如果父组件带有componentId，则当前子组件的componentId会拼接上父组件的componentId
        if (parentNode.__uniqueComponentId) {
          parentComponentId = `${parentNode.__uniqueComponentId}`;
        }
      }

      const childrenComponents = [];
      componentNodes.forEach((componentNode, index) => {
        let slotName = 'default';
        if (index === 0 && layoutHeaderSlot) {
          slotName = 'header';
        }
        if (componentNode.componentId) {
          // 父子componentId拼接起来，作为子组件的唯一componentId，保存在__uniqueComponentId属性上作为传递给ui组件的值
          componentNode.__uniqueComponentId = !parentComponentId ? componentNode.componentId : `${parentComponentId}.${componentNode.componentId}`;
        }
        // 组装组件属性对象
        const props = _pickBy(componentNode, (value, key) => ![ 'type', 'keyName', 'children' ].includes(key));
        props.componentId = componentNode.__uniqueComponentId;
        if (isLayout(componentNode)) {
          // 布局组件
          // 如果有子组件，则需要递归渲染子组件
          if (typer.getType(componentNode.children) === typer.EnumType.bArray && componentNode.children.length > 0) {
            childrenComponents.push(createElement(typeComponents[componentNode.type], {
              props
            }, this.renderComponentTree(createElement, componentNode.children, contextModel, componentNode)));
          } else {
            childrenComponents.push(createElement(typeComponents[componentNode.type], {
              props
            }));
          }
        } else if (componentNode.type === 'block') {
          // 表单块组件
          const blockComp = this.renderBlock(createElement, componentNode, contextModel, slotName);
          if (blockComp) {
            childrenComponents.push(blockComp);
          }
        } else if (isInput(componentNode)) {
          // 表单组件
          const inputComp = this.renderInput(createElement, componentNode, contextModel, slotName);
          if (inputComp) {
            childrenComponents.push(inputComp);
          }
        } else if (componentNode.type === 'table') {
          // 表格组件
          const tableComp = this.renderTable(createElement, componentNode, contextModel);
          if (tableComp) {
            childrenComponents.push(tableComp);
          }
        } else if (isInteraction(componentNode)) {
          // 交互组件
          const interactionComp = this.renderInteraction(createElement, componentNode);
          if (interactionComp) {
            childrenComponents.push(interactionComp);
          }
        } else if (isLogic(componentNode)) {
          // 逻辑组件
          const logicComp = this.renderLogic(createElement, componentNode);
          if (logicComp) {
            childrenComponents.push(logicComp);
          }
        } else {
          // 其它组件
          childrenComponents.push(createElement(typeComponents[componentNode.type], {
            props
          }));
        }
      });
      return childrenComponents;
    },
    renderInput(createElement, componentNode, contextModel, slotName = 'default') {
      let node = null;
      // 组装组件属性对象
      const props = _pickBy(componentNode, (value, key) => ![ 'type', 'keyName', 'children' ].includes(key));
      props.componentId = componentNode.__uniqueComponentId;
      // 处理readOnly 中的模板语法
      if (typeof componentNode.readOnly === 'string') {
        let isTempArr = componentNode.readOnly.match(/\{\{[\s\S]*\}\}/g);
        if (isTempArr && isTempArr.length > 0) {
          let templateAnalyzer = new TemplateAnalyzer(componentNode.readOnly, '{{', '}}');
          let readOnly = templateAnalyzer.result(this.scriptContext) || false;
          props.readOnly = readOnly;
        }
      }
      // 处理disabled 中的模板语法
      if (typeof componentNode.disabled === 'string') {
        let isTempArr = componentNode.disabled.match(/\{\{[\s\S]*\}\}/g);
        if (isTempArr && isTempArr.length > 0) {
          let templateAnalyzer = new TemplateAnalyzer(componentNode.disabled, '{{', '}}');
          let disabled = templateAnalyzer.result(this.scriptContext) || false;
          props.disabled = disabled;
        }
      }
      // 处理label 中的模板语法
      if (componentNode.label && componentNode.label !== '') {
        let isTempArr = componentNode.label.match(/\{\{[\s\S]*\}\}/g);
        if (isTempArr && isTempArr.length > 0) {
          let templateAnalyzer = new TemplateAnalyzer(componentNode.label, '{{', '}}');
          let res = templateAnalyzer.result(this.scriptContext);
          if (typeof res === 'string') {
            res = res.replace(/\'/g, '').replace(/\"/g, '');
          }
          let label = res || componentNode.label;
          props.label = label;
        }
      }
      // 表单组件
      const keyName = componentNode.keyName;
      // 默认值
      const defaultValue = componentNode.defaultValue;
      // 处理key_name
      const typeOfKeyName = typer.getType(keyName);
      // 该表单项是否属于编辑内容的范围，如果是的话，需要在关闭时提示doubleCheck
      const editContent = componentNode.editContent;
      if (typeOfKeyName === typer.EnumType.bArray) {
        props.value = keyName.map((k, i) => (typer.isNullOrUndefined(contextModel[k]) && !typer.isNullOrUndefined(defaultValue)) ? defaultValue[i] : contextModel[k]);
      } else {
        props.value = (typer.isNullOrUndefined(contextModel[keyName]) && !typer.isNullOrUndefined(defaultValue)) ? defaultValue : contextModel[keyName];
      }
      // 获取grid宽度
      let grid = componentNode.grid;
      if (typer.getType(grid) !== typer.EnumType.bNumber) {
        grid = 6;
      }

      let on = {
        input: (newVal) => {
          if (typeOfKeyName === typer.EnumType.bArray) {
            keyName.forEach((k, i) => {
              contextModel[k] = newVal[i];
            });
          } else {
            contextModel[keyName] = newVal;
          }
          if (editContent && this.$data.$mpStartWatchInputChange) {
            if (this.$mpSetDrawerContentChangedOfParent) {
              console.log('input value is edited! newVal: ', newVal);
              this.$mpSetDrawerContentChangedOfParent(true);
            }
          }
        }
      };
      // 如果是keyword组件，需要绑定匹配事件
      if (componentNode.type === 'keyword' || componentNode.type === 'text') {
        on.querySearch = (obj) => {
          this.querySearch(obj, componentNode.keyName);
        };
      }
      // 如果是reveal组件，传入context
      if (componentNode.type === 'reveal') {
        props.context = this.scriptContext;
      }
      if (componentNode.type !== 'hidden') {
        node = createElement('dh-authority-item', {
          props: {
            showCondition: componentNode.showCondition,
            noRenderWhenNoShow: componentNode.noRenderWhenNoShow,
            authorityCode: componentNode.authorityCode,
            context: this.scriptContext
          },
          slot: slotName
        }, [createElement('cl-col', {
          props: {
            span: grid
          }
        }, [ createElement(typeComponents[componentNode.type], {
          props,
          on
        }) ])]);
      }
      return node;
    },
    renderTable(createElement, componentNode, contextModel) {
      let node = null;
      // 组装组件属性对象
      const props = _pickBy(componentNode, (value, key) => ![ 'type', 'keyName', 'children' ].includes(key));
      props.componentId = componentNode.__uniqueComponentId;
      // 表格组件
      const keyName = componentNode.keyName;
      props.context = this.scriptContext;
      props.columns = componentNode.columns;
      props.tableData = contextModel[keyName];
      props.loading = props.tableData === null;
      const on = {};
      if (componentNode.pageIndex) {
        props.currentPage = getProperty(this.dataModel, componentNode.pageIndex);
        on['update:currentPage'] = (val) => {
          setProperty(this.dataModel, componentNode.pageIndex, val);
        };
      } else {
        props.currentPage = 1;
      }
      if (componentNode.totalCount) {
        props.total = getProperty(this.dataModel, componentNode.totalCount);
        on['update:total'] = (val) => {
          setProperty(this.dataModel, componentNode.totalCount, val);
        };
      } else {
        props.total = 0;
      }
      if (componentNode.pageSize) {
        props.pageSize = getProperty(this.dataModel, componentNode.pageSize);
        on['update:pageSize'] = (val) => {
          setProperty(this.dataModel, componentNode.pageSize, val);
        };
      } else {
        props.pageSize = 10;
      }
      if (componentNode.orderBy && componentNode.order) {
        on['sort-change'] = ({field, order}) => {
          setProperty(this.dataModel, componentNode.orderBy, field.keyName);
          setProperty(this.dataModel, componentNode.order, order);
        };
      }
      if (componentNode.selection) {
        props.selection = true;
        let entitiesKeyPath = componentNode.selection;
        on['selection-change'] = (selection) => {
          setProperty(this.dataModel, entitiesKeyPath, selection);
        };
      }

      let tables = [ createElement(typeComponents[componentNode.type], {
        props,
        on
      }) ];
      node = createElement('dh-authority-item', {
        props: {
          showCondition: componentNode.showCondition,
          noRenderWhenNoShow: componentNode.noRenderWhenNoShow,
          authorityCode: componentNode.authorityCode,
          context: this.scriptContext
        }
      }, tables);
      return node;
    },
    renderBlock(createElement, componentNode, contextModel, slotName = 'default') {
      let node = null;
      // 组装组件属性对象
      const props = _pickBy(componentNode, (value, key) => ![ 'type', 'keyName', 'children' ].includes(key));
      props.componentId = componentNode.__uniqueComponentId;
      // 获取下一级双向绑定数据上下文
      const nextContextModel = contextModel[componentNode.keyName];
      props.value = nextContextModel;
      // 设置权限校验上下文
      let context = this.scriptContext;
      if (typer.getType(contextModel) === typer.EnumType.bArray) {
        context = {
          ...this.scriptContext,
          $row: nextContextModel
        };
      }
      // 判断children类型
      const typeOfChildren = typer.getType(componentNode.children);
      if (typeOfChildren === typer.EnumType.bArray) {
        // 此情况是nextContextModel是对象的场景，需要逐个属性渲染
        if (componentNode.children.length > 0) {
          // let blocks = [createElement(typeComponents[componentNode.type], {
          //   props
          // }, this.renderComponentTree(createElement, componentNode.children, nextContextModel, componentNode))];
          node = createElement('dh-authority-item', {
            props: {
              showCondition: componentNode.showCondition,
              noRenderWhenNoShow: componentNode.noRenderWhenNoShow,
              authorityCode: componentNode.authorityCode,
              context
            },
            slot: slotName
          }, this.renderComponentTree(createElement, componentNode.children, nextContextModel, componentNode));
        }
      } else if (typeOfChildren === typer.EnumType.bObject) {
        // 此情况是nextContextModel是数组的场景，需要循环渲染
        const typeOfNextContextModel = typer.getType(nextContextModel);
        if (typeOfNextContextModel === typer.EnumType.bArray && nextContextModel.length > 0) {
          // let blocks = [createElement(typeComponents[componentNode.type], {
          //   props
          // }, this.renderComponentTree(createElement, nextContextModel.map((m, i) => {
          //   return Object.assign({}, componentNode.children, {
          //     'componentId': `${componentNode.children.componentId}#${i}`,
          //     'keyName': i
          //   });
          // }), nextContextModel, componentNode))];
          node = createElement('dh-authority-item', {
            props: {
              showCondition: componentNode.showCondition,
              noRenderWhenNoShow: componentNode.noRenderWhenNoShow,
              authorityCode: componentNode.authorityCode,
              context
            },
            slot: slotName
          }, this.renderComponentTree(createElement, nextContextModel.map((m, i) => {
            return Object.assign({}, componentNode.children, {
              'componentId': `${componentNode.children.componentId}#${i}`,
              'keyName': i
            });
          }), nextContextModel, componentNode));
        }
      }
      return node;
    },
    renderInteraction(createElement, componentNode, slotName = 'default') {
      let node = null;
      // 组装组件属性对象
      const props = _pickBy(componentNode, (value, key) => ![ 'type'].includes(key));
      props.componentId = componentNode.__uniqueComponentId;
      props.context = this.scriptContext;
      node = createElement('dh-authority-item', {
        props: {
          showCondition: componentNode.showCondition,
          noRenderWhenNoShow: componentNode.noRenderWhenNoShow,
          authorityCode: componentNode.authorityCode,
          context: this.scriptContext
        },
        slot: slotName
      }, [
        createElement(typeComponents[componentNode.type], {
          props
        })
      ]);
      return node;
    },
    renderLogic(createElement, componentNode) {
      let node = null;
      // 组装组件属性对象
      const props = _pickBy(componentNode, (value, key) => ![ 'type' ].includes(key));
      props.componentId = componentNode.__uniqueComponentId;
      // props.context = this.scriptContext;  // logic组件的context需要在运行时动态设置，不要在渲染时固定设置好。因为logic组件是通用的，调用者可能是不同的trigger，需要根据不同的trigger设置不同的上下文
      // 如果是dialog或者docker逻辑组件，需要绑定事件
      let on = {};
      if (componentNode.type === 'dialog') {
        on['showDialog'] = this.handleShowDialog;
      } else if (componentNode.type === 'docker') {
        on['showDocker'] = this.handleShowDocker;
      } else if (componentNode.type === 'confirm') {
        on['confirm'] = this.handleConfirm;
      } else if (componentNode.type === 'cancel') {
        on['cancel'] = this.handleCancel;
      }
      node = createElement(typeComponents[componentNode.type], {
        props,
        on
      });
      return node;
    },
    handleShowDialog(uri, params, confirm, cancel) {
      this.currentDialogOrDrawerUri = uri;
      this.showDialog = true;
      this.$emit('dialogShow', {
        uri,
        params,
        success: (params) => {
          this.showDialog = false;
          confirm(params);
        },
        fail: () => {
          this.showDialog = false;
          cancel();
        }
      });
    },
    handleShowDocker(uri, params, confirm, cancel) {
      this.currentDialogOrDrawerUri = uri;
      this.showDrawer = true;
      this.$emit('dockerShow', {
        uri,
        params,
        success: (params) => {
          this.showDrawer = false;
          confirm(params);
        },
        fail: () => {
          this.showDrawer = false;
          cancel();
        }
      });
    },
    handleConfirm(params, next, breakDown) {
      if (this.$mpSetDrawerContentChangedOfParent) {
        this.$mpSetDrawerContentChangedOfParent(false);
      }
      this.$emit('confirm', {
        params,
        success: next,
        fail: breakDown
      });
    },
    handleCancel(params, next, breakDown) {
      if (this.$mpSetDrawerContentChangedOfParent) {
        this.$mpSetDrawerContentChangedOfParent(false);
      }
      this.$emit('cancel', {
        params,
        success: next,
        fail: breakDown
      });
    }
  }
};
</script>

<style scoped>
.list-title {
  height: 32px;
  line-height: 20px;
  list-style: none;
  font-size: 16px;
  font-weight: 500;
  color: #000000;
}
.list-template {
  background: #ffffff;
  padding: 16px 12px;
  height: calc(100% - 32px);
  overflow-y: auto;
  box-sizing: border-box;
  -webkit-box-sizing: border-box;
}
.list-template-box {
  height: 100%;
}
</style>
