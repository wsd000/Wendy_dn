const path = require('path');

module.exports = {
  title: 'wendy日常录',  // 设置网站标题
  keywords: '前端开发',
  description : '日常笔记',
  repo: 'https://github.com/wsd000/Wendy_dn.git',  //仓库地址
  base: '/Wendy_dn/',  // 配合部署项目
  head: [
    ['link', { rel: 'shortcut icon', type: "image/x-icon", href: '/favicon.png' }]
  ],
  configureWebpack: {
    resolve: {
      alias: {
        '@vuepress': path.join(__dirname, './public/img'),
      }
    }
  },
  themeConfig: {  //主题配置
    logo: '/img/logo.png',
    nav: [  //导航栏
      { text: 'Home', link: '/' },
      { text: 'Notes', link: '/notes_docs/js' },
      { text: 'Framework', link: '/framework_docs/' },
      { text: 'Wheel', link: '/wheel_docs/axios' },
      { text: 'Tool', link: '/tool_docs/' },
      { text: 'KL_Timer', link: '/KL_docs/'},
      { text: 'github', link: 'https://github.com/zeroonbush/blog.git' }
    ],
    sidebar: {  //侧边拦
      '/notes_docs/': [
        {
          title: '随记', //侧边栏名称
          collapsable: false, // 是否可折叠
          children: [
            'css',
            'js',
            'applet'
          ]
        }
      ],
      '/wheel_docs/': [
        {
          title: '常用组件', //侧边栏名称
          collapsable: false, // 是否可折叠
          children: [
            'axios',
            'scroll'
          ]
        }
      ]
    },
    sidebarDepth: 3
  }
}