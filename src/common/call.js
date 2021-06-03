function isPromise(obj) {
  return !!obj && (typeof obj === 'object' || typeof obj === 'function') && typeof obj.then === 'function';
}

/**
 * 函数Promise包装器
 * originalFunction可以是形如以下几种签名：
 *    (...params, success, fail) => void
 *    (...params) => Promise
 * 将上述几种异步函数做兼容，使后续的异步处理一致化
 * @param {Function} originalFunction
 */
export default function (originalFunction) {
  return function (...params) {
    return new Promise((resolve, reject) => {
      let ret = originalFunction.call(this, ...params, success, fail);
      if (isPromise(ret)) {
        ret.then(success).catch(fail);
      }

      let successCalled = false;
      function success(data) {
        if (successCalled) {
          return;
        }
        successCalled = true;
        resolve(data);
      }
      let errorCalled = false;
      function fail(error) {
        if (errorCalled) {
          return;
        }
        errorCalled = true;
        reject(error);
      }
    });
  };
}
