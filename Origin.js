class Observer {
  constructor(data) {
    this.data = data;
    this.walk();
  }
  walk() {
    Object.keys(this.data).forEach((key) => {
      this.defineReactive(this.data, key, this.data[key]);
    });
  }
  defineReactive(data, key, value) {
    const dep = new Dep();
    Object.defineProperty(data, key, {
      get() {
        // console.log(`用户在获取${key}属性`);
        if (Dep.target) {
          //是否是渲染到页面的?有target,就是用到页面上;
          dep.depend(Dep.target); //添加watcher
        }
        return value;
      },
      set(newValue) {
        // console.log(`正在修改${key}属性`);
        value = newValue;
        dep.notify();
      },
    });
  }
}

class Origin {
  //创建一个Origin的类;
  constructor({ el, data }) {
    this.el = document.querySelector(el); //找到这个节点;
    //接受节点和数据两个参数;
    this.$el = el; // 将 el 对象保存到Origin实例的 $el 属性上
    this.$data = data(); // 将 data 对象保存到Origin实例的 $data 属性上
    new Observer(this.$data); //创建一个对象属性值变化的监听实例子,并把数据传给它;
    Object.keys(this.$data).forEach((key) => {
      this.proxy(key); //把数据里面的每一个属性都传给代理函数;
    });
    new Compiler(this.$el, this.$data); //创建一个渲染数据的实例,并把节点和数据都传给它;
  }
  proxy(key) {
    //接收代理数据;
    Object.defineProperty(this, key, {
      //调用监听定义属性的方法,把key定义到这个代理身上去;
      get() {
        return this.$data[key]; //当这个key被访问时,返回那个传入的对象的属性;
      },
      set(newValue) {
        this.$data[key] = newValue; //当这个key被修改时,那个修改的值,赋值给$data中对应的数据;
      },
    });
  }
}

// 渲染节点
class Compiler {
  //创建一个渲染数据的类
  constructor(el, data) {
    //接收来自classVue()中的数据和元素节点;
    this.el = document.querySelector(el); //找到这个节点;
    // console.log("el", this.el);
    this.data = data; //将这个节点保存到自己身上;
    this.compile(); //调用合成方法;
  }
  compile() {
    function nodeToString(node) {
      var tmpNode = document.createElement("div");
      tmpNode.appendChild(node.cloneNode(true));
      var str = tmpNode.innerHTML;
      return str;
    }
    const node = this.el.children; //拿到这个节点,做一个赋值;
    // console.log("节点", node);
    // console.log(Array.from(node));
    Array.from(node).forEach((item, index) => {
      // console.log(item.innerText);
      if (/\{(.*)\}/.test(item.innerText)) {
        //通过正则去匹配到这个带花括号的位置;
        const key = RegExp.$1.trim(); //拿到里面的字符串,也就是对象的属性名;
        const render = () => {
          // console.log("HTML-DOM-TEXT-元素", OLD_AST_DOM_TREE_HTML);
          item.innerText = this.data[key]; //做渲染,会触发set方法;
          const OLD_AST_DOM_TREE_HTML = nodeToString(this.el);
          const AST = ASTDEAL(
            OLD_AST_DOM_TREE_HTML,
            this.data.countOne,
            this.data.countTwo,
            this.data.countThree
          );
          console.log("HTML-DOM-AST-树", AST);
        };
        new Watcher(render); //创建一个watcher的实例对象;
      }
    });
    // this.el.innerHTML = `
    // <div style="color:red">${this.data.countOne}</div>
    // <div style="color:blue">${this.data.countTwo}</div>
    // <div style="color:orange">${this.data.countThree}</div>
    // <div style="color:orange">19</div>
    // `;
  }
}

class Watcher {
  //创建一个监听者的类;
  constructor(cb) {
    //接受一个来自class Compiler中的渲染函数;
    this.cb = cb; //保存
    Dep.target = this; //把这个监听者加到Dep身上;
    this.update(); //调用更新函数;
    Dep.target = null; //更新完成后,把dep身上的watcher清掉;
  }
  update() {
    this.cb(); //调用渲染函数
  }
}

class Dep {
  //创建一个dpe类;
  constructor() {
    this.subs = []; //创建一个数组;
  }
  depend(watcher) {
    this.subs.push(watcher); //接收传入的watcher,把它push到数组当中;
  }
  // 通知 watcher 调用 update 方法
  notify() {
    this.subs.forEach((watcher) => {
      //遍历这个数组,让这些watcher都调用更新函数;
      watcher.update();
    });
  }
}
function ASTDEAL(HTML, RPScountOne, RPScountTwo, RPScountThree) {
  const ncname = `[a-zA-Z_][\\-\\.0-9_a-zA-Z]*`; // abc-aaa
  const qnameCapture = `((?:${ncname}\\:)?${ncname})`; // <aaa:asdads>
  const startTagOpen = new RegExp(`^<${qnameCapture}`); // 标签开头的正则 捕获的内容是标签名
  const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`); // 匹配标签结尾的 </div>
  const attribute =
    /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/; // 匹配属性的
  const startTagClose = /^\s*(\/?)>/; // 匹配标签结束的 >  <div>
  const defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g;
  const AST = parseHTML(HTML);
  function parseHTML(html) {
    let root = null; // ast语法树的树根
    let currentParent; // 标识当前父亲是谁
    let stack = [];
    const ELEMENT_TYPE = 1;
    const TEXT_TYPE = 3;
    function createASTElement(tagName, attrs) {
      return {
        tag: tagName,
        type: ELEMENT_TYPE,
        children: [],
        attrs,
        parent: null,
      };
    }

    function start(tagName, attrs) {
      // 遇到开始标签 就创建一个ast元素s
      let element = createASTElement(tagName, attrs);
      if (!root) {
        root = element;
      }
      currentParent = element; // 把当前元素标记成父ast树
      stack.push(element); // 将开始标签存放到栈中
    }

    function chars(text) {
      text = text.replace(/\s/g, "");
      if (text) {
        currentParent.children.push({
          text,
          type: TEXT_TYPE,
        });
      }
    }

    function end(tagName) {
      let element = stack.pop(); // 拿到的是ast对象
      //标识当前这个p是属于这个div的儿子的
      currentParent = stack[stack.length - 1];
      if (currentParent) {
        element.parent = currentParent;
        currentParent.children.push(element); // 实现一个树的父子关系
      }
    }
    // 不停的去解析html字符串
    while (html) {
      let textEnd = html.indexOf("<");
      if (textEnd == 0) {
        // 如果当前索引为0 肯定是一个标签 开始标签 结束标签
        let startTagMatch = parseStartTag(); // 通过这个方法获取到匹配的结果 tagName,attrs
        if (startTagMatch) {
          start(startTagMatch.tagName, startTagMatch.attrs); // 1解析开始标签
          continue; // 如果开始标签匹配完毕后 继续下一次 匹配
        }
        let endTagMatch = html.match(endTag);
        if (endTagMatch) {
          advance(endTagMatch[0].length);
          end(endTagMatch[1]); // 2解析结束标签
          continue;
        }
      }
      let text;
      if (textEnd >= 0) {
        text = html.substring(0, textEnd);
      }
      if (text) {
        advance(text.length);
        chars(text); // 3解析文本
      }
    }

    function advance(n) {
      html = html.substring(n);
    }

    function parseStartTag() {
      let start = html.match(startTagOpen);
      if (start) {
        const match = {
          tagName: start[1],
          attrs: [],
        };
        advance(start[0].length); // 将标签删除
        let end, attr;
        while (
          !(end = html.match(startTagClose)) &&
          (attr = html.match(attribute))
        ) {
          // 将属性进行解析
          advance(attr[0].length); // 将属性去掉
          match.attrs.push({
            name: attr[1],
            value: attr[3] || attr[4] || attr[5],
          });
        }
        if (end) {
          // 去掉开始标签的 >
          advance(end[0].length);
          return match;
        }
      }
    }
    return root;
  }
  // console.log("HTML转换成AST", AST);
  const ASTARRY = [];
  ASTARRY.push(AST);
  // console.log(ASTARRY);
  function DeepView(data) {
    for (let i = 0; i < data.length; i++) {
      // console.log(data[i]);
      if (data[i] != null && data[i].text == "{countOne}") {
        data[i].text = RPScountOne;
      }
      if (data[i] != null && data[i].text == "{countTwo}") {
        data[i].text = RPScountTwo;
      }
      if (data[i] != null && data[i].text == "{countThree}") {
        data[i].text = RPScountThree;
      }
      if (data[i].children != null) {
        DeepView(data[i].children);
      }
    }
  }
  ASTARRY.map((item) => {
    if (item.children != null) {
      DeepView(item.children);
    }
  });
  return ASTARRY;
}
