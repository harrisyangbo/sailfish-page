/**
 * 将原始的businessConfig转换成方便模版使用的数据格式
 */
import { isInput, isDataContainer, isInteraction, isLogic } from 'sailfish-ui';
import typer from '@xes/dh-module-type';
import guid from './common/guid';
import cloneDeep from 'lodash.clonedeep';

function makeLayout(layout, getComponentById = () => ({})) {
  const rootLayout = {
    type: 'row',
    children: []
  };
  if (typer.getType(layout) === typer.EnumType.bArray && layout.length > 0) {
    layout.forEach(elem => {
      parse(elem);
    });
  }

  function parse(idOrLayout, parentLayout = rootLayout) {
    const typeOfElem = typer.getType(idOrLayout);
    if (typeOfElem === typer.EnumType.bString) {
      parentLayout.children.push(getComponentById(idOrLayout));
    } else if (typeOfElem === typer.EnumType.bObject) {
      parentLayout.children.push(idOrLayout);
      if (typer.getType(idOrLayout.children) === typer.EnumType.bArray && idOrLayout.children.length > 0) {
        const arr = idOrLayout.children;
        idOrLayout.children = [];
        arr.forEach(elem => {
          parse(elem, idOrLayout);
        });
      }
    }
  }

  return rootLayout;
}

function makeContent(content) {
  const componentDictionary = {};
  const logicComponents = [];
  const dataModel = {};
  if (typer.getType(content) === typer.EnumType.bArray && content.length > 0) {
    content.forEach(comp => {
      Object.defineProperty(comp, '__parent', {
        value: null,
        writable: false,
        enumerable: false,
        configurable: false
      });
      complementComponentId(comp);
    });
    content.forEach(comp => {
      generateDataModel(comp, dataModel);
    });
    content.forEach(comp => {
      parseComponent(comp);
    });
  }

  /**
   * 补全component_id字段，并且建立parent关联关系
   */
  function complementComponentId(component) {
    if (!component.component_id) {
      component.component_id = guid();
    }
    // 如果该组件是表格组件，则数据字段中的交互类型也要补全component_id
    if (component.type === 'table') {
      component.columns.forEach(col => {
        if (col.field && isInteraction(col.field) && !col.field.component_id) {
          col.field.component_id = guid();
        }
        if (typer.getType(col.fields) === typer.EnumType.bArray && col.fields.length > 0) {
          col.fields.forEach(f => {
            if (f && isInteraction(f) && !f.component_id) {
              f.component_id = guid();
            }
          });
        }
      });
    }
    // block组件的场景需要处理子组件
    if (component.type === 'block') {
      const typeOfChildren = typer.getType(component.children);
      if (typeOfChildren === typer.EnumType.bArray && component.children.length > 0) {
        // 有子节点
        component.children.forEach(comp => {
          // 有子组件的化，将父组件的id进行关联
          Object.defineProperty(comp, '__parent', {
            value: component.component_id,
            writable: false,
            enumerable: false,
            configurable: false
          });
          complementComponentId(comp);
        });
      } else if (typeOfChildren === typer.EnumType.bObject) {
        // 当block子组件是一个嵌套block的时候，说明绑定的key_name的数据是数组类型，需要循环遍历所有的子组件补全component_id
        let comp = component.children;
        Object.defineProperty(comp, '__parent', {
          value: component.component_id,
          writable: false,
          enumerable: false,
          configurable: false
        });
        complementComponentId(comp);
      }
    }
  }

  /**
   * 整理出响应数据实体
   */
  function generateDataModel(component, parentModel) {
    // 创建双向绑定的数据实体
    if (isInput(component) || isDataContainer(component)) {
      if (typer.getType(component.key_name) === typer.EnumType.bArray) {
        component.key_name.forEach((p, i) => {
          let v = null;
          if (component.default_value !== undefined && component.default_value !== null) {
            v = component.default_value[i];
          }
          if (parentModel[p] !== undefined && parentModel[p] !== null && parentModel[p] !== v) {
            throw new Error(`key_name[${p}]重复定义了`);
          }
          parentModel[p] = v;
          // if (component.default_value !== undefined && component.default_value !== null) {
          //   parentModel[p] = component.default_value[i];
          // } else {
          //   parentModel[p] = null;
          // }
        });
      } else {
        let v = null;
        if (component.default_value !== undefined && component.default_value !== null) {
          v = component.default_value;
        }
        if (parentModel[component.key_name] !== undefined && parentModel[component.key_name] !== null && parentModel[component.key_name] !== v) {
          throw new Error(`key_name[${component.key_name}]重复定义了`);
        }
        parentModel[component.key_name] = v;
        // if (component.default_value !== undefined && component.default_value !== null) {
        //   parentModel[component.key_name] = component.default_value;
        // } else {
        //   parentModel[component.key_name] = null;
        // }
      }
    }
    // block组件的场景需要处理子组件
    if (component.type === 'block') {
      const typeOfChildren = typer.getType(component.children);
      if (typeOfChildren === typer.EnumType.bArray && component.children.length > 0) {
        if (!parentModel[component.key_name]) {
          parentModel[component.key_name] = {};
        }
        let currentModel = parentModel[component.key_name];
        // 有子节点
        component.children.forEach(comp => {
          generateDataModel(comp, currentModel);
        });
      }
    }
  }

  /**
   * 将组件整理到字典结构中，方便之后合并到布局配置
   */
  function parseComponent(component) {
    // component_id重复检测
    if (componentDictionary[component.component_id]) {
      throw new Error(`配置的组件中存在重复的component_id: ${component.component_id}`);
    }
    // 如果是逻辑组件，则额外保存；其它组件则保存在全局组件字典
    if (isLogic(component)) {
      logicComponents.push(component);
    } else {
      componentDictionary[component.component_id] = component;
    }
    // block组件的场景需要处理子组件
    if (component.type === 'block') {
      const typeOfChildren = typer.getType(component.children);
      if (typeOfChildren === typer.EnumType.bArray && component.children.length > 0) {
        // 有子节点
        component.children.forEach(comp => {
          parseComponent(comp);
        });
      } else if (typeOfChildren === typer.EnumType.bObject) {
        // 当block子组件是一个嵌套block的时候，说明绑定的key_name的数据是数组类型
        parseComponent(component.children);
      }
    }
  }

  return  { componentDictionary, logicComponents, dataModel };
}


export default {
  make(originalBusinessConfig) {
    let businessConfig = cloneDeep(originalBusinessConfig);
    let { componentDictionary, logicComponents, dataModel } = makeContent(businessConfig.content);
    let finalConfig = makeLayout(businessConfig.layout, componentId => {
      let comps = getComp(componentId);
      for (let i = comps.length - 1; i > 0; --i) {
        let o = comps[i - 1];
        comps[i - 1] = Object.assign({}, o);
        if (comps[i].type === 'block' && comps[i].key_name === '__index') {
          comps[i - 1].children = comps[i];
        } else {
          comps[i - 1].children = [ comps[i] ];
        }
      }
      return comps[0];

      function getComp(componentId, comps = []) {
        let comp = componentDictionary[componentId];
        if (comp) {
          comps.unshift(comp);
          if (comp.__parent) {
            return getComp(comp.__parent, comps);
          } else {
            return comps;
          }
        } else {
          throw new Error(`布局配置中配置了无效组件[${componentId}]`);
        }
      }
    });
    // 最后将逻辑组件追加到根布局容器末尾
    if (logicComponents.length > 0) {
      finalConfig.children.push(...logicComponents);
    }
    return { businessConfig: finalConfig, dataModel };
  }
};
