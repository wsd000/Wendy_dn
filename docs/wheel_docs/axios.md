# axios(异步请求封装)
## 功能解析(Analysis)
- 针对服务器的运行状况做第一次拦截操作，所有对服务器的请求先访问 `/GetMaintenanceState` 判断服务器的运行状态
``` md
- 正在维护：跳转到维护页面并显示维护信息
- 正在运行：发起请求
```
- 针对需要token验证的接口做第二次拦截操作，一般在用户登陆成功后会返回标识Token
``` md
用户登录请求接口`/Login`，并将`access_token`和`refresh_token`保存在localStorage。
每次请求时携带在请求头Authorization中。
```
- token过期重新刷新机制
``` md
- access_token 过期，用 refresh_token 重新请求刷新token
- 请求失败 refresh_token 过期则跳转到登录页面
- 请求成功存储新的token再次发起请求
```
::: warning
- 为了减轻服务器的压力，发起请求的时候先获取服务器状态储存在 localStorage，10分钟内如果再有请求，不再获取状态。
- 需要封装localStorageGet方法，超过10分钟返回false
- 需要封装localStorageSet方法，储存maintenance字段同时，储存时间戳
:::
## 部分功能函数封装(capsulation)
### 检查请求前缀
``` js
function getUrl(url) {
  if (url.indexOf(baseUrl) === 0) {
    return url;
  }
  url = url.replace(/^\//, '');
  url = baseUrl + '/' + url;
  return url;
}
```
### 获取服务器维护状态
``` js
function checkMaintenance() {
  let status = {};
  // 获取完整的url
  let url = getUrl('/GetMaintenanceState');
  return axios({
    url,
    method: 'get'
  }).then(res => {
    if (res.data.IsSuccess) {
      status = {
        IsRun: res.data.Value.IsRun, // 服务器是否运行
        errMsg: res.data.Value.MaintenanceMsg // 维护时的信息
      };
      // 存储服务器状态
      localStorage.setItem('maintenance', JSON.stringify(status))
      // 传递获取的结果
      return Promise.resolve(status);
    }
  })
  .catch((err) => {
    // 返回错误信息
    return Promise.reject(err.response.data);
  });
}
```
### 刷新token
``` js
function getRefreshToken() {
  let url = getUrl('/Token');
  // 登录时已经获取token储存在localStorage中
  let token = JSON.parse(localStorage.getItem('token'));
  return axios({
    url,
    method: 'post',
    data: 'grant_type=refresh_token&refresh_token=' + token.refresh_token,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      // 开发者密钥
      Authorization: 'Basic xxxxxxxxxxx'
    }
  }).then(res => {
    if (res.data.IsSuccess) {
      var token_temp = {
        access_token: res.data.access_token,
        refresh_token: res.data.refresh_token
      };
      // 存储新的token信息
      localStorage.setItem('token', JSON.stringify(token_temp));
      // 将access_token储存在session中
      sessionStorage.setItem('access_token', res.data.access_token);
      return Promise.resolve();
    }
  })
  .catch(() => {
    return Promise.reject();
  });
}
```
## 完整代码
``` js
import axios from 'axios';
import Router from 'vue-router'

// 请求前缀
let baseUrl='https://app.bdia.com.cn/service/';
/* 是否有请求正在刷新token */
window.isRefreshing = false;
/* 被挂起的请求List */
let refreshSubscribers = [];
/* 将请求都push到请求List中 */
function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb);
}
/* 重新请求(挂起的请求List中的请求得到新的token之后会自执行,用新的token去请求数据) */
function onRrefreshed (token) {
  refreshSubscribers.map(cb => cb(token));
}

// 设置拦截器
const instance = axios.create();
// request 拦截器：
instance.interceptors.request.use(
  config => {
    // 获取储存中本地的服务器维护状态
    let maintenance = localStorage.getItem('maintenance');
    // 如果本地不存在maintenance（初次访问）或 超过10分钟，重新获取(服务器状态)
    if (!maintenance) {
      return checkMaintenance()
        .then(res => {
          // 服务器运行中
          if (res.IsRun) {
            // 获取session中的access_token
            let access_token = sessionStorage.getItem('access_token');
            // 如果不存在字段，则跳转到登录页面
            if (!access_token) {
              // 携带当前页面路由，以在登录页面完成登录后返回当前页面
              Router.replace({
                path: '/login',
                query: { redirect: Router.currentRoute.fullPath }
              });
              // 终止请求
              return Promise.reject();
            } else {
              // 配置header_token
              config.headers.Authorization = `bearer ${access_token}`;
            }
            config.headers['Content-Type'] = 'application/json;charset=UTF-8';
            // 这一步就是允许发送请求
            return config;
          } else {
            // 如果服务器正在维护，跳转到维护页面，显示维护信息
            Router.push({
              path: '/maintenance',
              query: { redirect: res.errMsg }
            });
            // 终止请求
            return Promise.reject();
          }
        })
        .catch((err) => {
          // 获取服务器运行状态失败,返回错误信息
          return Promise.reject(err);
        });
    } else {
      // 本地存在 maintenance
      if (maintenance.IsRun) {
        let access_token = sessionStorage.getItem('access_token');
        if (!access_token) {
          Router.replace({
            path: '/login',
            query: { redirect: router.currentRoute.fullPath }
          });
          // 终止这个请求
          return Promise.reject();
        } else {
          config.headers.Authorization = `bearer ${access_token}`;
        }
        config.headers['Content-Type'] = 'application/json;charset=UTF-8';
        return config;
      } else {
        // 跳转维护页面
        Router.push({
          path: '/maintenance',
          query: { redirect: maintenance.errMsg }
        });
        // 终止这个请求
        return Promise.reject();
      }
    }
  },
  err => {
    // err为错误对象，但是在我的项目中，除非网络问题才会出现
    return Promise.reject(err);
  }
);

// response 拦截器：
instance.interceptors.response.use(
    response => {
        // 使响应结果省略data字段
        return response.data;
    },
    err => {
      // access_token不存在或过期
      if (err.response.status == 503) {
        if(!window.isRefreshing){
          /*将刷新标志置为true*/
          window.isRefreshing = true;
          // 刷新token
          getRefreshToken()
            .then(() => {
              /*将刷新标志置为false*/
              window.isRefreshing = false
              // 重新设置token并执行挂起的请求
              let access_token = sessionStorage.getItem('access_token');
              /*执行数组里的函数,重新发起被挂起的请求*/
              onRrefreshed(access_token);
              /*执行onRefreshed函数后清空数组中保存的请求*/
              refreshSubscribers = [];
            })
            .catch(() => {
              // refreshtoken 获取失败就只能到登录页面
              Router.replace({
                path: '/login',
                query: { redirect: Router.currentRoute.fullPath }
              });
              return Promise.reject();
            });
        }
        // 将请求挂起
        let retry = new Promise((resolve, reject) => {
          /*把请求(token)=>{....}都push到一个数组中*/
          subscribeTokenRefresh((token) => {
            config.headers.Authorization = 'Bearer ' + token
            /*将请求挂起*/
            resolve(instance(err.config).then(res => {
              return Promise.resolve(res);
            }))
          })
        })
        return retry
      }
      // refresh_token不存在或过期
      if (err.response.status == 501) {
        Router.replace({
          path: '/login',
          query: { redirect: Router.currentRoute.fullPath }
        });
        return Promise.reject();
      }
      // 其他的错误码，直接返回错误信息
      return Promise.reject(err.response);
    }
);

export default {
  get (url, params = {}) {
    return new Promise((resolve, reject) => {
      axiosApi.get(url, {
        params
      }).then(response => {
        resolve(response)
      }).catch(error => {
        reject(error)
      })
    })
  },
  post (url, params = {}) {
    return new Promise((resolve, reject) => {
      axiosApi({
        url: url,
        method: 'POST',
        data: params,
        transformRequest: [function (data) {
          let ret = ''
          for (let i in data) {
            ret += encodeURIComponent(i) + '=' + encodeURIComponent(data[i]) + '&'
          }
          return ret
        }]
      }).then(res => {
        resolve(res)
      }).catch(err => {
        reject(err)
      })
    })
  },
  put (url, params = {}) {
    return new Promise((resolve, reject) => {
      axiosApi.put(url, params, {
      }).then(response => {
        resolve(response)
      }).catch(err => {
        reject(err)
      })
    })
  },
  delete (url, params = {}) {
    return new Promise((resolve, reject) => {
      axiosApi.delete(url, {
        data: params
      }).then(res => {
        resolve(res)
      }).catch(err => {
        reject(err)
      })
    })
  },
  all (queryAll) {
    return Promise.all(queryAll)
  }
}

```