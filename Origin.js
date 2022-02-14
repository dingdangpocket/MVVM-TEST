

class Observer {
    constructor(data) {
        this.data = data
        this.walk();
    }
    walk() {
        Object.keys(this.data).forEach(key => {
            this.defineReactive(this.data, key, this.data[key])
        })
    }

    defineReactive(data, key, value) {
        const dep = new Dep();
        Object.defineProperty(data, key, {
            get() {
                console.log(`用户在获取${key}属性`);
                if (Dep.target) {//是否是渲染到页面的?有target,就是用到页面上;
                    dep.depend(Dep.target);//添加watcher
                }
                return value;
            },
            set(newValue) {
                console.log(`正在修改${key}属性`);
                value = newValue
                dep.notify();
            }
        })
    }
}

class Vue {//创建一个Vue的类;
    constructor({ el, data }) {//接受节点和数据两个参数;
        this.$el = el; // 将 el 对象保存到 Vue 实例的 $el 属性上
        this.$data = data(); // 将 data 对象保存到 Vue 实例的 $data 属性上
        new Observer(this.$data);//创建一个对象属性值变化的监听实例子,并把数据传给它;
        Object.keys(this.$data).forEach(key => {
            this.proxy(key);//把数据里面的每一个属性都传给代理函数;
        })
        new Compiler(this.$el, this.$data);//创建一个渲染数据的实例,并把节点和数据都传给它;
    }
    proxy(key) {//接收代理数据;
        Object.defineProperty(this, key, {//调用监听定义属性的方法,把key定义到这个代理身上去;
            get() {
                return this.$data[key];//当这个key被访问时,我们返回那个传入的对象的属性;
            },
            set(newValue) {
                this.$data[key] = newValue;//当这个key被修改时,我们那个修改的值,赋值给$data中对应的数据;
            }
        })
    }
}


// 渲染节点
class Compiler {//创建一个渲染数据的类
    constructor(el, data) {//接收来自classVue()中的数据和元素节点;
        this.el = document.querySelector(el);//找到这个节点;
        this.data = data;//将这个节点保存到自己身上;
        this.compile();//调用合成方法;
    }
    compile() {
        const node = this.el.children;//拿到这个节点,做一个赋值;
        Array.from(node).forEach((item,index)=>{
            if (/\{\{(.*)\}\}/.test(item.innerText)) {//通过正则去匹配到这个带花括号的位置;
                const key = RegExp.$1.trim();//拿到里面的字符串,也就是对象的属性名;
                const render = () => {//创建一个函数为watcher;
                    // 触发数据的 get 方法
                    item.innerText = this.data[key];//做渲染,也就是会触发set方法;
                }
                new Watcher(render);//创建一个watcher的实例对象;
            }
        })
    }
}


class Watcher {//创建一个监听者的类;
    constructor(cb) {//接受一个来自class Compiler中的渲染函数; 
        this.cb = cb;//保存
        Dep.target = this;//把这个监听者加到Dep身上;
        this.update();//调用更新函数;
        Dep.target = null;//更新完成后,把dep身上的watcher清掉;
    }
    update() {
        this.cb();//调用渲染函数
    }
}


class Dep {//创建一个dpe类;
    constructor() {
        this.subs = [];//创建一个数组;
    }
    depend(watcher) {
        this.subs.push(watcher)//接收传入的watcher,把它push到数组当中;
    }
    // 通知 watcher 调用 update 方法
    notify() {
        this.subs.forEach(watcher => {//遍历这个数组,让这些watcher都调用更新函数;
            watcher.update();
        })
    }
}