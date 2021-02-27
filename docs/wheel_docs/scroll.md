# scroll(移动端滚动组件封装)
## 组件说明(Analysis)
基于better-scroll的近一步封装，适用于vue框架。方便集成轮播图、分页加载、下拉刷新、滚动锚点展示（类似于电话簿）等功能模块。解决移动端对于滚动功能的兼容问题
## 完整代码(complete code)
### Template
``` js
<template>
  <!--父容器-->
  <div ref="wrapper" class="scroll">
    <!-- 上拉加载-下拉刷新 -->
    <div class="scroll_contant" v-if="pullDownRefresh||pullUpLoad">
      <div class="pulldown-wrapper" v-if="pullDownRefresh">
        <div v-show="beforePullDown">
          <span>Pull Down and refresh</span>
        </div>
        <div v-show="!beforePullDown">
          <div v-show="isPullingDown">
            <img width="24" height="24" src="./loading.gif">
          </div>
          <div v-show="!isPullingDown"><span>Refresh success</span></div>
        </div>
      </div>
      <!--子容器插槽-->
      <slot></slot>
      <div class="pullup-wrapper" v-if="pullUpLoad&&hasMore">
          <img width="24" height="24" src="./loading.gif">
      </div>
    </div>
    <!--简单滚动子容器插槽-->
    <slot v-if="!pullDownRefresh&&!pullUpLoad&&!slider"></slot>
    <!-- 轮播图 -->
    <div class="slider-group" ref="sliderGroup" v-if="slider">
      <!--子容器插槽-->
      <slot></slot>
    </div>
    <div class="dots" v-if="slider">
      <span class="dot" :key="index" :class="{active: currentPageIndex === index }" v-for="(item, index) in dots" ></span>
    </div>
  </div>
</template>
```
### Css
``` js
<style scoped lang="scss">
  .scroll{
    position: relative;
    height: 100%;
    overflow: hidden;
  }
  .pulldown-wrapper{
    position: absolute;
    width: 100%;
    padding: 2%;
    box-sizing: border-box;
    transform: translateY(-100%) translateZ(0);
    text-align: center;
    color: #999;
  }
  .pullup-wrapper{
    text-align :center;
    padding : 5% 0px;
  }
  // 轮播图
  .slider-group{
    position: relative;
    overflow: hidden;
    white-space: nowrap;
    .slider-item{
      float: left;
      box-sizing: border-box;
      overflow: hidden;
      text-align: center;
      a{
        display: block;
        width: 100%;
        overflow: hidden;
        text-decoration: none;
      }
      img{
        display: block;
        width: 100%;
      }
    }
  }
  .dots{
    position: absolute;
    right: 0;
    left: 0;
    bottom: 12px;
    /*主要解决 dots 在某些浏览器下不能显示的问题*/
    transform: translateZ(1px);
    text-align: center;
    font-size: 0;
    .dot{
      display: inline-block;
      margin: 0 4px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #fff;
      &.active{
        width: 20px;
        border-radius: 5px;
        background: #000;
      }
    }
  }
</style>
```
### Script
``` js
<script type="text/ecmascript-6">
  // 引入第三方插件
  import BScroll from 'better-scroll'
  // 刷新效果停留时间
  const TIME_BOUNCE = 800
  const TIME_STOP = 600
  export default {
    data() {
      return {
        isPullUpLoad: false,
        beforePullDown: true,
        isPullingDown: false,
        dots: [],
        currentPageIndex: 0
      }
    },
    props: {
      slider : {
        // 轮播图
        type : Boolean,
        default : false
      },
      // 循环
      loop: {
        type: Boolean,
        default: true
      },
      // 自动播放
      autoPlay: {
        type: Boolean,
        default: true
      },
      // 间歇时间
      interval: {
        type: Number,
        default: 4000
      },
      hasMore : {
        // 是否还有数据
        type : Boolean,
        default : false
      },
      data: {
        // 数据
        type: Array,
        default: null
      },
      // 属性设置
      startX : {
        // 横轴方向内容区初始化位置,动态加载数据（数据延迟会造成回弹,导致设置失效）
        type : Number,
        default : 0
      },
      startY : {
        // 纵轴方向内容区初始化位置,动态加载数据（数据延迟会造成回弹,导致设置失效）
        type : Number,
        default : 0
      },
      scrollX : {
        // 开启横轴滚动,若设置了eventPassthrough,该配置无效
        type : Boolean,
        default : false
      },
      scrollY : {
        // 开启纵轴滚动,若设置了eventPassthrough,该配置无效
        type : Boolean,
        default : true
      },
      freeScroll : {
        // 开启双向滚动,若设置了eventPassthrough,该配置无效
        type : Boolean,
        default : false
      },
      eventPassthrough : {
        // 开启双向滚动,某个方向模拟滚动的时候，希望在另一个方向保留原生的滚动
        type : String,
        default : ''
      },
      click : {
        // 默认会阻止浏览器的原生click事件。(a标签)
        // 当设置为 true，better-scroll 会派发一个 click 事件
        type : Boolean,
        default : false,
      },
      dblclick : {
        // v1.12.0+支持该属性
        // 派发双击点击事件。
        // 当配置成 true 的时候，默认2次点击的延时为 300 ms，
        // 如果配置成对象可以修改 delay
        // {delay: 300}
        type : Boolean | Object,
        default : false,
      },
      tap : {
        // 因为 better-scroll 会阻止原生的 click 事件，我们可以设置 tap 为 true，
        // 它会在某个dom区域被点击的时候派发一个 tap 事件（自定义点击事件）
        // element.addEventListener('tap', doSomething, false);
        // 如果 tap 设置为字符串, 那么这个字符串就作为自定义事件名称。
        // 如 tap: 'myCustomTapEvent'。
        // element.addEventListener('myCustomTapEvent', doSomething, false)
        type : Boolean | String,
        default : false
      },
      bounce : {
        // 当滚动超过边缘的时候会有一小段回弹动画。设置为 true 则开启动画。
        // {top: true, bottom: true, left: true, right: true}
        type : Boolean | String,
        default : true
      },
      momentum : {
        // 快速滑动一段距离的时候，会根据滑动的距离和时间计算出动量，
        // 并生成滚动动画。设置为 true 则开启动画。
        type : Boolean | String,
        default : true
      },
      probeType : {
        // 当 probeType 为 1 的时候，会非实时（屏幕滑动超过一定时间后）派发scroll 事件；
        // 当 probeType 为 2 的时候，会在屏幕滑动的过程中实时的派发 scroll 事件；
        // 当 probeType 为 3 的时候，不仅在屏幕滑动的过程中，而且在 momentum 滚动动画运行过程中实时派发 scroll 事件。
        // 如果没有设置该值，其默认值为 0，即不派发 scroll 事件。
        type : Number,
        default : 1
      },
      // preventDefaultException: {
      //   // better-scroll的实现会阻止原生的滚动，这样也同时阻止了一些原生组件的默认行为
      //   // 默认值表示input、textarea、button、select 这些元素的默认行为都不会被阻止。
      //   // key 是 DOM 元素的属性值，value 可以是一个正则表达式
      //   // 还可以设置className 例：{className:/(^|\s)test(\s|$)/}
      //   type : Object,
      //   default : { tagName: /^(INPUT|TEXTAREA|BUTTON|SELECT)$/}
      // },
      observeDOM: {
        // (v1.5.3+)支持该属性
        // 是否开启自动调用 refresh 方法重新计算来保证滚动的正确性
        type : Boolean,
        default : true
      },
      stopPropagation: {
        // (v1.9.0+)支持该属性
        // 是否阻止事件冒泡。多用在嵌套 scroll 的场景。
        type : Boolean,
        default : true
      },
      scrollbar : {
        // 是否开启滚动条
        // {fade: true,interactive: false // 1.8.0 新增}
        // fade 为 true 表示当滚动停止的时候滚动条是否需要渐隐
        // interactive 表示滚动条是否可以交互
        type : Boolean | Object,
        default : false
      },
      pullDownRefresh: {
        // 是否开启下拉刷新
        // {threshold: 50,stop: 20}
        // 可以配置顶部下拉的距离（threshold） 来决定刷新时机以及回弹停留的距离（stop）。
        // 当下拉刷新数据加载完毕后，需要执行 finishPullDown 方法
        type : Boolean | Object,
        default : false
      },
      pullUpLoad: {
        // 是否开启上拉加载功能
        // {threshold: 50}
        // 可以配置离（threshold）来决定开始加载的时机。
        // 当上拉加载数据加载完毕后，需要执行 finishPullUp 方法。
        type : Boolean | Object,
        default : false
      },
      mouseWheel: {
        // (v1.8.0+)支持该属性
        // 用于 PC 端的鼠标滚轮，默认为 false。
        // 当设置为 true 或者是一个 Object 的时候，可以开启鼠标滚轮
        // {speed: 20,invert: false,easeTime: 300}
        // speed 表示鼠标滚轮滚动的速度
        // invert 为 true 表示滚轮滚动和时机滚动方向相反
        // easeTime 表示滚动动画的缓动时长
        type : Boolean | Object,
        default : false
      },
      zoom: {
        // (v1.11.0+)支持该属性
        // 这个配置用于对滚动内容的缩放，默认为 false。
        // 当设置为 true 或者是一个 Object 的时候，可以开启缩放
        // {start: 1,min: 1,max: 4}
        // start 表示开始的缩放比例
        // min 表示最小缩放比例
        // max 表示最大缩放比例。
        type : Boolean | Object,
        default : false
      },
      // 是否开启一些事件的监听
      isScroll: {
        // 是否监听滚动事件
        type: Boolean,
        default: false
      },
      beforeScroll: {
        // 是否监听滚动开始之前事件
        type: Boolean,
        default: false
      },
      startScroll: {
        // 是否监听滚动开始事件
        type: Boolean,
        default: false
      },
      endScroll: {
        // 是否监听滚动结束事件
        type: Boolean,
        default: false
      },
      touchEnd: {
        // 是否监听鼠标手指离开
        type: Boolean,
        default: false
      },
      flickScroll: {
        // 是否监听轻拂事件
        type: Boolean,
        default: false
      },
      refreshFinish: {
        // 是否监听刷新完成事件
        type: Boolean,
        default: false
      },
      refreshDelay: {
        // 刷新延迟时间
        type: Number,
        default: 20
      },
      destoryScroll: {
        // 是否监听destory方法调用完成事件
        type: Boolean,
        default: false
      },
      zoomStart: {
        // 是否监听缩放开始事件
        type: Boolean,
        default: false
      },
      zoomEnd: {
        // 是否监听缩放结束事件
        type: Boolean,
        default: false
      }
    },
    mounted () {
      // 延迟20ms保证dom正确挂载后，betterScroll可以正确初始化
      setTimeout(() => {
        if(this.slider){
          // 设置容器的宽度
          this._setSliderWidth()
          this._initDots()
          if (this.autoPlay) {
            this._play()
          }
        }
        this._initScroll()
      }, 20)

      if(this.slider){
        window.addEventListener('resize', () => {
          if (!this.scroll || !this.scroll.enabled) {
            return
          }
          clearTimeout(this.resizeTimer)
          // Timeout 60 是为了做 防抖，
          // 因为 resize 事件通常会触发多次，我们在最后一次 resize 事件结束后，
          // 延时 60ms 执行函数内部逻辑。
          this.resizeTimer = setTimeout(() => {
            // isInTransition BetterScroll 内置的属性
            // 用来判断 sxroll是否是处于滚动动画的过程中，开启了cs3 过度动画效果时需要判断
            if (this.scroll.isInTransition) {
              this._onScrollEnd()
            } else {
              if (this.autoPlay) {
                this._play()
              }
            }
            this.refresh()
          }, 60)
        })
      }
    },
    methods: {
      // betterScroll初始化
      _initScroll () {
        // 判断是否可以找到组件
        if (!this.$refs.wrapper) {
          return
        }
        this.scroll = new BScroll(this.$refs.wrapper, {
          startX : this.startX,
          startY : this.startY,
          scrollX : this.slider?true:this.scrollX,
          scrollY : this.slider?false:this.scrollY,
          freeScroll : this.freeScroll,
          eventPassthrough : this.eventPassthrough,
          click : this.slider?true:this.click,
          dblclick : this.dblclick,
          tap : this.tap,
          bounce : this.bounce,
          momentum :this.slider?false:this.momentum,
          probeType : this.probeType,
          // preventDefaultException : this.preventDefaultException,
          observeDOM : this.observeDOM,
          stopPropagation : this.stopPropagation,
          scrollbar : this.scrollbar,
          pullDownRefresh : this.pullDownRefresh,
          pullUpLoad : this.pullUpLoad,
          mouseWheel : this.mouseWheel,
          zoom : this.zoom,
          snap: this.slider?{loop: this.loop,threshold: 0.3,speed: 400}:false
        })
        // 设置监听事件
        if (this.isScroll) {
          // 参数：{Object} {x, y} 滚动的实时坐标
          // 触发时机：滚动过程中，具体时机取决于选项中的 probeType
          this.scroll.on('scroll', (pos) => {
            console.log(pos.y,pos.x)
            this.$emit('scroll', pos)
          })
        }
        if (this.beforeScroll || this.slider) {
          // 参数：无
          // 触发时机：滚动开始之前
          this.scroll.on('beforeScrollStart', () => {
            if(this.beforeScroll){
              this.$emit('beforeScroll')
            }
            // 手指停留在轮播图时间超过设置的intetval(一直没有touchend)，
            // 还是会触发自动播放
            if(this.slider){
              if (this.autoPlay) {
                clearTimeout(this.timer)
              }
            }
          })
        }
        if (this.startScroll) {
          // 参数：无
          // 触发时机：滚动开始时
          this.scroll.on('scrollStart', () => {
            this.$emit('startScroll')
          })
        }
        if (this.endScroll || this.slider) {
          // 参数：{Object} {x, y} 滚动结束的位置坐标
          // 触发时机：滚动结束
          this.scroll.on('scrollEnd', (pos) => {
            console.log(pos.y,pos.x)
            if(this.endScroll){
              this.$emit('endScroll', pos)
            }
            if(this.slider){
              this._onScrollEnd()
            }
          })
        }
        if (this.touchEnd || this.slider) {
          // 参数：{Object} {x, y} 位置坐标
          // 触发时机：鼠标/手指离开
          this.scroll.on('touchEnd', (pos) => {
            console.log(pos.y,pos.x)
            if(this.touchEnd){
              this.$emit('touchEnd', pos)
            }
            if(this.slider){
              if (this.autoPlay) {
                this._play()
              }
            }
          })
        }
        if (this.flickScroll) {
          // 参数：无
          // 触发时机：轻拂时
          this.scroll.on('flick', () => {
            this.$emit('flickScroll')
          })
        }
        if (this.refreshFinish) {
          this.scroll.on('refresh', () => {
            this.$emit('refreshFinish')
          })
        }
        if (this.destoryScroll) {
          this.scroll.on('destroy', () => {
            this.$emit('destoryScroll')
          })
        }
        if (this.pullDownRefresh) {
          this.scroll.on('pullingDown', ()=>{
            this.pullingDownHandler();
          })
        }
        if (this.pullUpLoad) {
          this.scroll.on('pullingUp',()=>{
            this.pullingUpHandler();
          })
        }
        if (this.zoomStart) {
          this.scroll.on('zoomStart', () => {
            this.$emit('zoomStart')
          })
        }
        if (this.zoomEnd) {
          this.scroll.on('zoomEnd', () => {
            this.$emit('zoomEnd')
          })
        }
      },
      // 下拉刷新
      pullingDownHandler() {
        this.beforePullDown = false
        this.isPullingDown = true
        this.$emit('pullingDown');
      },
      // 上拉加载
      pullingUpHandler() {
        this.isPullUpLoad = true;
        this.$emit('pullingUp');
      },
      // 下拉刷新完成事件
      async finishPullDown() {
        await new Promise(resolve => {
          setTimeout(() => {
            this.scroll.finishPullDown()
            resolve()
          }, TIME_STOP)
        })
        setTimeout(() => {
          this.beforePullDown = true
          this.scroll.refresh()
        }, TIME_BOUNCE)
      },
      // 状态更新
      stateUpdate(){
        // 正在刷新
        if(this.isPullingDown){
          this.isPullingDown = false;
          this.finishPullDown();
          return false
        }
        // 正在加载数据
        if(this.isPullUpLoad){
          this.scroll.finishPullUp();
          this.refresh();
          this.isPullUpLoad = false;
          return false
        }
        // 普通数据变化更新
        setTimeout(() => {
          this.refresh()
        }, this.refreshDelay)
      },
      // 基础方法
      disable () {
        // 禁用betterScroll
        this.scroll && this.scroll.disable()
      },
      enable () {
        // 启用betterScroll
        this.scroll && this.scroll.enable()
      },
      refresh () {
        // 刷新betterScroll
        if(this.scroll){
          this.scroll.refresh()
          if (this.slider) {
            this._setSliderWidth(true)
          }
        }
      },
      scrollTo () {
        // 滚动到指定的位置（x,y,time,easing）
        this.scroll && this.scroll.scrollTo.apply(this.scroll, arguments)
      },
      scrollToElement () {
        // 滚动到指定的目标元素
        // el 滚动到的目标元素, 如果是字符串，则内部会尝试调用 querySelector 转换成 DOM 对象。
        // time 滚动动画执行的时长（单位 ms）
        // {Number | Boolean} offsetX 相对于目标元素的横轴偏移量，
            // 如果设置为 true，则滚到目标元素的中心位置
        // {Number | Boolean} offsetY 相对于目标元素的纵轴偏移量，
            // 如果设置为 true，则滚到目标元素的中心位置
        // {Object} easing 缓动函数，一般不建议修改，如果想修改，参考源码中的 ease.js 里的写法
        this.scroll && this.scroll.scrollToElement.apply(this.scroll, arguments)
      },
      // 添加class
      addClass (el, className) {
        el.classList.add(className)
      },
      // 轮播图设置宽度
      _setSliderWidth (isResize) {
        this.children = this.$refs.sliderGroup.children

        let width = 0
        let sliderWidth = this.$refs.wrapper.clientWidth
        for (let i = 0; i < this.children.length; i++) {
          let child = this.children[i]
          this.addClass(child, 'slider-item')

          child.style.width = sliderWidth + 'px'
          width += sliderWidth
        }
        // 循环添加头尾
        if (this.loop && !isResize) {
          width += 2 * sliderWidth
        }
        this.$refs.sliderGroup.style.width = width + 'px'
      },
      _onScrollEnd () {
        // 获取当前页面信息
        let pageIndex = this.scroll.getCurrentPage().pageX
        this.currentPageIndex = pageIndex
        if (this.autoPlay) {
          // 在每次滚动结束时触发
          this._play()
        }
      },
      _initDots () {
        this.dots = new Array(this.children.length)
      },
      // 滚动到下一张
      _play () {
        // 清除计数器，让动画重新计时
        // 防止手动触发滚动会出现连续滚动两次的情况
        clearTimeout(this.timer)
        this.timer = setTimeout(() => {
          this.scroll.next()
        }, this.interval)
      }
    },
    watch: {
      data:{
        // 下拉刷新的动作可能无法监听到数据的变化
        // 需要在父组件强制执行stateUpdate方法来完成效果
        handler(newName, oldName){
          this.stateUpdate()
        },
        deep: true
        // 代表在wacth里声明了data这个方法之后立即先去执行handler方法
        // immediate: true
      }
    }
  }
</script>
``` 
## 引用示例(quote example)
### 简单滚动
``` js
// 插件默认开放垂直滚动（默认带回弹动画效果）
<template>
  <div class="scrollContainer">
    <scroll>
      <ul class="list">
        <li class="item" v-for="(item, index) in list">{{item}}</li>
      </ul>
    </scroll>
  </div>
</template>
<script>
import Scroll from '@/components/scroll/scroll1'
export default {
  name:'bSTest',
  data() {
    return {
      list:[1,2,3,4,4,5,46,57,6,8879,8,9,0,9324,3,3,5,345,4,65,7,6,879,8,9,0,324,3,5,46,5,7]
    };
  },
  components:{Scroll}
};
</script>
<style lang="scss" scoped>
  .scrollContainer{
    height: 500px;
  }
</style>
```
### 上拉加载-下拉树新
``` js
<template>
  <div class="scrollContainer">
    <scroll ref="scroll" 
      :data="list" 
      :pullDownRefresh="true" 
      @pullingDown="pullingDown" 
      :pullUpLoad="true" 
      @pullingUp="pullingUp"
    >
      <ul>
        <li class="item" v-for="(item, index) in list">
          {{item}}
        </li>
      </ul>
    </scroll>
  </div>
</template>
<script>
  import Scroll from '@/components/scroll/scroll1'
  export default {
    name:'bSTest',
    data() {
      return {
        list:[1,2,3,4,4,5,46,57,6,8879,8,9,0,9324,3,3]
      };
    },
    methods: {
      //组件会监听list的修改刷新scroll插件
      pullingDown(){
        this.list = [1,2,3,4,4,5,46,57,6,8879,8,9,0,9324,3,3,5,345,4,65,7,6,879,8]
      },
      pullingUp(){
        this.list = [1,2,3,4,4,5,46,57,6,8879,8,9,0,9324,3,3,5,345]
      }
    },
    components:{Scroll}
  };
</script>
<style lang="scss" scoped>
  .scrollContainer{
    height: 500px
  }
</style>
```
### 轮播图(swiper)
``` js
// 插件默认开放垂直滚动（默认带回弹动画效果）
<template>
  <div class="scrollContainer">
    <div v-if="recommends.length" class="slider-wrapper">
      <scroll ref="scroll" :slider="true">
        <div v-for="(item,index) in recommends" :key="index">
          <a :href="item.linkUrl"><img :src="item.picUrl"></a>
        </div>    
      </scroll>
    </div>
  </div>
</template>
<script>
import Scroll from '@/components/scroll/scroll1'
export default {
  name:'bSTest',
  data() {
    return {
      recommends:[]
    };
  },
  mounted() {
    this.recommends = [
      {
        linkUrl:'https://www.baidu.com',
        picUrl:'xxx.png'
      },
      {
        linkUrl:'https://www.baidu.com',
        picUrl:'xxx.png'
      },
      {
        linkUrl:'https://www.baidu.com',
        picUrl:'xxx.png'
      }
    ]
  },
  components:{Scroll,Test}
};
</script>
<style lang="scss" scoped>
 .scrollContainer{
    height: 100%;
    width: 100%;
  }
  .slider-wrapper{
    width: 80%;
    margin: 0 auto;
    min-height: 20%;
  }
</style>
```