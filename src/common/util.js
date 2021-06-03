import { configSchema, isLayout, isInput, isDataContainer, isInteraction, isLogic } from 'sailfish-ui';

function convertUnderscore(s) {
  return s.replace(/_+([a-zA-Z0-9])/g, (val, p1) => p1.toUpperCase());
}

function convertCamelCase(s) {
  return s.replace(/[A-Z]/g, (val) => '_' + val.toLowerCase());
}

export const toCamelCase = (obj) => {
  if (!!obj && typeof obj === 'object') {
    if (obj instanceof Array) {
      let newObj = [];
      obj.forEach((elem) => {
        newObj.push(toCamelCase(elem));
      });
      return newObj;
    } else {
      let newObj = {};
      Object.keys(obj).forEach(key => {
        let newKey = convertUnderscore(key);
        newObj[newKey] = toCamelCase(obj[key]);
      });
      return newObj;
    }
  } else {
    return obj;
  }
};

export const toUnderscore = (obj) => {
  if (!!obj && typeof obj === 'object') {
    if (obj instanceof Array) {
      let newObj = [];
      obj.forEach((elem) => {
        newObj.push(toUnderscore(elem));
      });
      return newObj;
    } else {
      let newObj = {};
      Object.keys(obj).forEach(key => {
        let newKey = convertCamelCase(key);
        newObj[newKey] = toUnderscore(obj[key]);
      });
      return newObj;
    }
  } else {
    return obj;
  }
};


function convertComponent(config, schema) {
  if (schema['__index']) {
    let newObj = [];
    config.forEach(elem => {
      if (schema['__index'].$childSchema) {
        newObj.push(convertComponent(elem, schema['__index'].$childSchema));
      } else {
        newObj.push(configToCamelCase(elem));
      }
    });
    return newObj;
  } else {
    let newObj = {};
    Object.keys(config).forEach(key => {
      if (schema[key]) {
        let newKey = convertUnderscore(key);
        if (schema[key].$childSchema) {
          newObj[newKey] = convertComponent(config[key], schema[key].$childSchema);
        } else {
          newObj[newKey] = configToCamelCase(config[key]);
        }
      } else if (schema['*']) {
        let newKey = convertUnderscore(key);
        newObj[newKey] = configToCamelCase(config[key]);
      } else {
        newObj[key] = configToCamelCase(config[key]);
      }
    });
    return newObj;
  }
}

export function configToCamelCase(obj) {
  if (!!obj && typeof obj === 'object') {
    if (obj instanceof Array) {
      let newObj = [];
      obj.forEach((elem) => {
        newObj.push(configToCamelCase(elem));
      });
      return newObj;
    } else {
      let newObj = {};
      if (isLayout(obj)) {
        newObj = convertComponent(obj, configSchema.layout);
      } else if (isInput(obj)) {
        newObj = convertComponent(obj, configSchema.input);
      } else if (isDataContainer(obj)) {
        newObj = convertComponent(obj, configSchema.container);
      } else if (isInteraction(obj)) {
        newObj = convertComponent(obj, configSchema.interaction);
      } else if (isLogic(obj)) {
        newObj = convertComponent(obj, configSchema.logic);
      } else {
        Object.keys(obj).forEach(key => {
          newObj[key] = configToCamelCase(obj[key]);
        });
      }
      return newObj;
    }
  } else {
    return obj;
  }
}
