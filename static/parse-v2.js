/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil; tab-width: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
/*
 * Copyright 2014, Art Compiler LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

function assert(b, str) {
  if (!b) throw str;
}

function print(str) {
  console.log(str)
}

function log(str) {
  console.log(str)
}

// ast module

var ast = (function () {
  var _ = exports._;
  var ASSERT = true;
  var assert = function (val, str) {
    if ( !this.ASSERT ) {
      return;
    }
    if ( str === void 0 ) {
      str = "failed!";
    }
    if (!val) {
      alert("assert: " + str);
    }
  }

  var Ast = function() { }

  Ast.prototype = {
    intern: intern,
    node: node,
    dump: dump,
    dumpAll: dumpAll,
    poolToJSON: poolToJSON,
    number: number,
    string: string,
    name: name,
    funcApp: funcApp,
    funcApp2: funcApp2,
    call: call,
    binaryExpr: binaryExpr,
    unaryExpr: unaryExpr,
    prefixExpr: prefixExpr,
    letDefn: letDefn,
    caseExpr: caseExpr,
    ofClause: ofClause,
    exprs: exprs,
    program: program,
    pop: pop,
    reset: reset,
    topNode: topNode,
    peek: peek,
    push: push,
    mod: mod,
    add: add,
    sub: sub,
    mul: mul,
    div: div,
    pow: pow,
    concat: concat,
    orelse: orelse,
    andalso: andalso,
    eq: eq,
    ne: ne,
    lt: lt,
    gt: gt,
    le: le,
    ge: ge,
    neg: neg,
    list: list,
    bool: bool,
  };

  return new Ast;

  // private implementation

  function reset(ctx) {
    ctx.state.nodePool = ["unused"];
    ctx.state.nodeStack = [];
    ctx.state.nodeMap = {};
  }

  function push(ctx, node) {
    if (_.isNumber(node)) {   // if already interned
      ctx.state.nodeStack.push(node);
    } else {
      ctx.state.nodeStack.push(intern(ctx, node));
    }
  }

  function topNode(ctx) {
    var nodeStack = ctx.state.nodeStack;
    return nodeStack[nodeStack.length-1];
  }

  function pop(ctx) {
    var nodeStack = ctx.state.nodeStack;
    return nodeStack.pop();
  }

  function peek(ctx) {
    var nodeStack = ctx.state.nodeStack;
    //log("nodeStack="+nodeStack);
    return nodeStack[nodeStack.length-1];
  }

  // deep
  function intern(ctx, n) {
    var nodeMap = ctx.state.nodeMap;
    var nodePool = ctx.state.nodePool;
    var op = n.op;
    var args = "";
    var args_nids = [ ];
    var count = n.args.length;
    for (var i = 0; i < count; i++) {
      if (typeof n.args[i] === "object") {
        n.args[i] = intern(ctx, n.args[i]);
      }
      args += n.args[i];
    }
    var key = op+count+args;
    var nid = nodeMap[key];
    if (nid === void 0) {
      nodePool.push({op: op, args: n.args});
      nid = nodePool.length - 1;
      nodeMap[key] = nid;
    }
    return nid;
  }

  function node(ctx, nid) {
    var n = ctx.state.nodePool[nid];
    if (!n) {
      return {};
    }
    var args = [];
    switch (n.op) {
    case "NUM":
    case "STR":
    case "IDENT":
      args[0] = n.args[0];
      break;
    default:
      for (var i=0; i < n.args.length; i++) {
        args[i] = node(ctx, n.args[i]);
      }
      break;
    }
    return {
      op: n.op,
      args: args,
    };
  }

  function dumpAll(ctx) {
    var nodePool = ctx.state.nodePool;
    var s = "\n{"
    for (var i=1; i < nodePool.length; i++) {
      var n = nodePool[i];
      s = s + "\n  " + i+": "+dump(n) + ",";
    }
    s += "\n  root: " + (nodePool.length-1);
    s += "\n}\n";
    return s;
  }

  function poolToJSON(ctx) {
    var nodePool = ctx.state.nodePool;
    var obj = { };
    for (var i=1; i < nodePool.length; i++) {
      var n = nodePool[i];
      obj[i] = nodeToJSON(n);
    }
    obj.root = (nodePool.length-1);
    return obj;
  }

  function nodeToJSON(n) {
    if (typeof n === "object") {
      var obj = {};
      obj["op"] = n.op;
      obj["args"] = [];
      for (var i=0; i < n.args.length; i++) {
        obj["args"][i] = nodeToJSON(n.args[i]);
      }
    } else if (typeof n === "string") {
      var obj = n;
    } else {
      var obj = n;
    }
    return obj;
  }

  function dump(n) {
    if (typeof n === "object") {
      switch (n.op) {
      case "NUM":
        var s = n.args[0];
        break;
      case "STR":
        var s = "\""+n.args[0]+"\"";
        break;
      default:
        if (!n.args) {
          s += "<invalid>";
        } else {
          var s = "{ op: \"" + n.op + "\", args: [ ";
          for (var i=0; i < n.args.length; i++) {
            if (i > 0) {
              s += " , ";
            }
            s += dump(n.args[i]);
          }
          s += " ] }";
        }
        break;
      }
    } else if (typeof n === "string") {
      var s = "\""+n+"\"";
    } else {
      var s = n;
    }
    return s;
  }

  function bool(ctx, val) {
    if (val) {
      var b = true;
    } else {
      var b = false;
    }
    push(ctx, {op: "BOOL", args: [b]});
  }

  function number(ctx, str) {
    assert(typeof str === "string" || typeof str === "number");
    push(ctx, {op: "NUM", args: [String(str)]});
  }

  function string(ctx, str) {
    push(ctx, {op: "STR", args: [str]});
  }

  function name(ctx, str) {
    push(ctx, {op: "IDENT", args: [str]});
  }

  // interpret a nid in the current environment

  function fold(ctx, def, args) {
    env.enterEnv(ctx, def.name);
    var lexicon = def.env.lexicon;
    // setup inner environment record (lexicon)
    for (var id in lexicon) {
      if (!id) continue;
      var word = lexicon[id];
      word.val = args[args.length-1-word.offset]  // offsets are from end of args
      env.addWord(ctx, id, word);
    }
    // in line function body at call site
    folder.fold(ctx, def.nid);
    env.exitEnv(ctx);
  }

  function funcApp(ctx, argc) {
//    var underscore = ast.intern(ctx, {op: "IDENT", args: ["_"]}); 
    var args = [];
    while (argc--) {
      var elt = pop(ctx);
//      if (elt === underscore) {
//        args.push(0);
//      } else {
        args.push(elt);
//      }
    }
    var nameId = pop(ctx);
    var e = node(ctx, nameId).args;
    if (!e) {
      return;
    }
    var name = e[0];
    var def = env.findWord(ctx, name);
    // FIXME need to allow forward references
    if (!def) {
      throw "def not found for " + JSON.stringify(name);
    }

    // If recursive call, then this callee does not have a nid yet.
    if (def.nid) {
      // recursion guard
      if (ctx.state.nodeStack.length > 380) {
        //return;  // just stop recursing
        throw new Error("runaway recursion");
      }
      // we have a user def, so fold it.
      //fold(ctx, def, args);

      // We have a user def so create a call node that gets folded bottom up.
      args.push(nameId);
      push(ctx, {op: "CALL", args: args});
    } else if (def.nid === 0) {  // defer folding
      args.push(nameId);
      push(ctx, {op: "RECURSE", args: args});
    } else {
      if (def.val) {
        push(ctx, def.val);
      } else {
        push(ctx, {op: def.name, args: args});
      }
    }
  }

  function call(ctx, argc) {
    var underscore = ast.intern(ctx, {op: "IDENT", args: ["_"]}); 
    var args = [];
    while (argc--) {
      var elt = pop(ctx);
      if (elt === underscore) {
        args.push(0);
      } else {
        args.push(elt);
      }
    }
    var nameId = pop(ctx);
    var e = node(ctx, nameId).args;
    if (!e) {
      return;
    }
    var name = e[0];
    var def = env.findWord(ctx, name);
    // FIXME need to allow forward references
    if (!def) {
      throw "def not found for " + JSON.stringify(name);
    }

    // If recursive call, then this callee does not have a nid yet.
    if (def.nid) {
      // recursion guard
      if (ctx.state.nodeStack.length > 380) {
        //return;  // just stop recursing
        throw new Error("runaway recursion");
      }
      // we have a user def, so fold it.
      fold(ctx, def, args);
    } else if (def.nid === 0) {  // defer folding
      args.push(nameId);
      push(ctx, {op: "RECURSE", args: args});
    } else {
      if (def.val) {
        push(ctx, def.val);
      } else {
        push(ctx, {op: def.name, args: args});
      }
    }
  }

  // calling primitives
  function funcApp2(ctx, argc) {
    var args = [];
    while (argc--) {
      var elt = pop(ctx);
      args.push(elt);
    }
    var nameId = pop(ctx);
    var e = node(ctx, nameId).args;
    if (!e) {
      return;
    }
    var name = e[0];
    push(ctx, {op: name, args: args});
  }

  function list(ctx) {
    var args = [pop(ctx)];
    push(ctx, {op: "LIST", args: args});
  }

  function binaryExpr(ctx, name) {
    //log("ast.binaryExpr() name="+name);
    var args = [];
    // args are in the order produced by the parser
    args.push(pop(ctx)); 
    args.push(pop(ctx));
    push(ctx, {op: name, args: args.reverse()});
  }

  function unaryExpr(ctx, name) {
    //log("ast.unaryExpr() name="+name);
    var args = [];
    args.push(pop(ctx));
    push(ctx, {op: name, args: args});
  }

  function prefixExpr(ctx, name) {
    //log("ast.prefixExpr() name="+name);
    var args = [];
    args.push(pop(ctx));
    push(ctx, {op: name, args: args});
  }

  function neg(ctx) {
    //log("ast.neg()");
    var v1 = +node(ctx, pop(ctx)).args[0];
    number(ctx, -1*v1);
  }

  function add(ctx) {
    log("ast.add()");
    var n2 = node(ctx, pop(ctx));
    var n1 = node(ctx, pop(ctx));
    var v2 = n2.args[0];
    var v1 = n1.args[0];
    if (n1.op !== "NUM" || n2.op !== "NUM") {
      push(ctx, {op: "ADD", args: [n1, n2]});
    } else {
      number(ctx, +v1 + +v2);
    }
  }

  function sub(ctx) {
    //log("ast.sub()");
    var n1 = node(ctx, pop(ctx));
    var n2 = node(ctx, pop(ctx));
    var v2 = n2.args[0];
    var v1 = n1.args[0];
    if (n1.op !== "NUM" || n2.op !== "NUM") {
      push(ctx, {op: "SUB", args: [n1, n2]});
    } else {
      number(ctx, +v1 - +v2);
    }
  }

  function mul(ctx) {
    //log("ast.mul()");
    var n2 = node(ctx, pop(ctx));
    var n1 = node(ctx, pop(ctx));
    var v2 = n2.args[0];
    var v1 = n1.args[0];
    if (n1.op === undefined) {
      n1 = n1.args[0];
    }
    if (n2.op === undefined) {
      n2 = n2.args[0];
    }
    if (n1.op !== "NUM" || n2.op !== "NUM") {
      push(ctx, {op: "MUL", args: [n2, n1]});
    } else {
      number(ctx, +v1 * +v2);
    }
  }

  function div(ctx) {
    //log("ast.div()");
    var n1 = node(ctx, pop(ctx));
    var n2 = node(ctx, pop(ctx));
    var v2 = n2.args[0];
    var v1 = n1.args[0];
    if (n1.op !== "NUM" || n2.op !== "NUM") {
      push(ctx, {op: "DIV", args: [n1, n2]});
    } else {
      number(ctx, +v1 / +v2);
    }
  }

  function mod(ctx) {
    var n1 = node(ctx, pop(ctx));
    var n2 = node(ctx, pop(ctx));
    var v2 = n2.args[0];
    var v1 = n1.args[0];
    if (n1.op !== "NUM" || n2.op !== "NUM") {
      push(ctx, {op: "MOD", args: [n1, n2]});
    } else {
      number(ctx, +v1 % +v2);
    }
  }

  function pow(ctx) {
    var n1 = node(ctx, pop(ctx));
    var n2 = node(ctx, pop(ctx));
    var v1 = n1.args[0];
    var v2 = n2.args[0];
    if (n1.op !== "NUM" || n2.op !== "NUM") {
      push(ctx, {op: "POW", args: [n1, n2]});
    } else {
      number(ctx, Math.pow(+v1, +v2));
    }
  }

  function concat(ctx) {
    var n1 = node(ctx, pop(ctx));
    var n2 = node(ctx, pop(ctx));
    var v1 = n1.args[0];
    var v2 = n2.args[0];
    if ((n1.op !== "STR" && n1.op !== "NUM") || (n2.op !== "STR" && n2.op !== "NUM")) {
      push(ctx, {op: "CONCAT", args: [n1, n2]});
    } else {
      string(ctx, ""+v1+v2);
    }
  }

  function orelse(ctx) {
    var v2 = +node(ctx, pop(ctx)).args[0];
    var v1 = +node(ctx, pop(ctx)).args[0];
    throw "not implemented";
  }

  function andalso(ctx) {
    var v2 = +node(ctx, pop(ctx)).args[0];
    var v1 = +node(ctx, pop(ctx)).args[0];
    throw "not implemented";
  }

  function eq(ctx) {
    var v2 = node(ctx, pop(ctx)).args[0];
    var v1 = node(ctx, pop(ctx)).args[0];
    bool(ctx, v1==v2);
  }

  function ne(ctx) {
    var v2 = +node(ctx, pop(ctx)).args[0];
    var v1 = +node(ctx, pop(ctx)).args[0];
    bool(ctx, v1!=v2);
  }

  function lt(ctx) {
    var v2 = +node(ctx, pop(ctx)).args[0];
    var v1 = +node(ctx, pop(ctx)).args[0];
    bool(ctx, v1<v2);
  }

  function gt(ctx) {
    var v2 = +node(ctx, pop(ctx)).args[0];
    var v1 = +node(ctx, pop(ctx)).args[0];
    bool(ctx, v1>v2);
  }

  function le(ctx) {
    var v2 = +node(ctx, pop(ctx)).args[0];
    var v1 = +node(ctx, pop(ctx)).args[0];
    bool(ctx, v1<=v2);
  }

  function ge(ctx) {
    var v2 = +node(ctx, pop(ctx)).args[0];
    var v1 = +node(ctx, pop(ctx)).args[0];
    bool(ctx, v1>=v2);
  }
  function caseExpr(ctx, n) {
    var args = [];
    for (var i = n; i > 0; i--) {
      args.push(pop(ctx))  // of
    }
    args.push(pop(ctx))  // exprs
    push(ctx, {op: "CASE", args: args});
  }
  function ofClause(ctx) {
    var args = [];
    args.push(pop(ctx));
    args.push(pop(ctx));
    push(ctx, {op: "OF", args: args});
  }
  function exprs(ctx, n) {
    var args = [];
    for (var i = n; i > 0; i--) {
      var elt = pop(ctx);
      if (elt !== void 0) {
        args.push(elt);
      }
    }
    if (args.length > 1) {
      push(ctx, {op: "EXPRS", args: args.reverse()});
    } else {
      push(ctx, args[0]);
    }
  }
  function letDefn(ctx) {
    pop(ctx)  // name
    pop(ctx)  // body
    for (var i = 0; i < ctx.state.paramc; i++) {
      pop(ctx) // params
    }
  }
  function program(ctx) {
    var args = [];
    args.push(pop(ctx));
    push(ctx, {op: "PROG", args: args});
  }
})();

// The following code for StreamString was copied from CodeMirror.

exports.StringStream = (function () {

  // The character stream used by a mode's parser.
  function StringStream(string, tabSize) {
    this.pos = this.start = 0;
    this.string = string;
    this.tabSize = tabSize || 8;
  }

  StringStream.prototype = {
    eol: function() {return this.pos >= this.string.length;},
    sol: function() {return this.pos == 0;},
    peek: function() {return this.string.charAt(this.pos) || undefined;},
    next: function() {
      if (this.pos < this.string.length)
        return this.string.charAt(this.pos++);
    },
    eat: function(match) {
      var ch = this.string.charAt(this.pos);
      if (typeof match == "string") {
        var ok = ch == match;
      } else {
        var ok = ch && (match.test ? match.test(ch) : match(ch));
      }
      if (ok) {++this.pos; return ch;}
    },
    eatWhile: function(match) {
      var start = this.pos;
      while (this.eat(match)){}
      return this.pos > start;
    },
    eatSpace: function() {
      var start = this.pos;
      while (/[\s\u00a0]/.test(this.string.charAt(this.pos))) ++this.pos;
      return this.pos > start;
    },
    skipToEnd: function() {this.pos = this.string.length;},
    skipTo: function(ch) {
      var found = this.string.indexOf(ch, this.pos);
      if (found > -1) {this.pos = found; return true;}
    },
    backUp: function(n) {this.pos -= n;},
    column: function() {return countColumn(this.string, this.start, this.tabSize);},
    indentation: function() {return countColumn(this.string, null, this.tabSize);},
    match: function(pattern, consume, caseInsensitive) {
      if (typeof pattern == "string") {
        var cased = function(str) {return caseInsensitive ? str.toLowerCase() : str;};
        if (cased(this.string).indexOf(cased(pattern), this.pos) == this.pos) {
          if (consume !== false) this.pos += pattern.length;
          return true;
        }
      } else {
        var match = this.string.slice(this.pos).match(pattern);
        if (match && match.index > 0) return null;
        if (match && consume !== false) this.pos += match[0].length;
        return match;
      }
    },
    current: function(){return this.string.slice(this.start, this.pos);}
  }

  return StringStream;

})();

// env

var env = (function () {
  return {
    findWord: findWord,
    addWord: addWord,
    enterEnv: enterEnv,
    exitEnv: exitEnv,
  };

  // private functions

  function findWord(ctx, lexeme) {
    var env = ctx.state.env;
    for (var i = env.length-1; i >= 0; i--) {
      var word = env[i].lexicon[lexeme];
      if (word) {
        return word;
      }
    }
    return null;
  }

  function addWord(ctx, lexeme, entry) {
    exports.topEnv(ctx).lexicon[lexeme] = entry;
    return null;
  }

  function enterEnv(ctx, name) {
    ctx.state.env.push({name: name, lexicon: {}});
  }

  function exitEnv(ctx) {
    ctx.state.env.pop();
  }

})();

var scanTime = 0;
var scanCount = 0;
exports.scanTime = function () {
  return scanTime;
};
exports.scanCount = function () {
  return scanCount;
};


var parseTime = 0;

exports.parseTime = function () {
  return parseTime;
};

var parseCount = 0;
exports.parseCount = function () {
  return parseCount;
};


// parser
exports.parser = (function () {
  var globalLexicon = exports.globalLexicon;
  var _ = exports._;
  function assert(b, str) {
    if (!b) {
      alert(str);
    }
  }

  var TK_IDENT  = 0x01;
  var TK_NUM  = 0x02;
  var TK_STR  = 0x03;
  var TK_EQUAL  = 0x04;
  var TK_IF   = 0x05;
  var TK_THEN   = 0x06;
  var TK_ELSE   = 0x07;
  var TK_RETURN = 0x08;
  var TK_IS   = 0x09;
  var TK_POSTOP = 0x0A;
  var TK_PREOP  = 0x0B;
  var TK_FUN  = 0x0C;
  var TK_VAL  = 0x0D;
  var TK_BINOP  = 0x0E;
  var TK_CASE   = 0x0F;
  var TK_OF   = 0x10;
  var TK_END  = 0x11;
  var TK_LET  = 0x12;
  var TK_OR   = 0x13;
  var TK_BOOL   = 0x14;

  var TK_LEFTPAREN  = 0xA1;
  var TK_RIGHTPAREN   = 0xA2;
  var TK_LEFTBRACKET  = 0xA3;
  var TK_RIGHTBRACKET = 0xA4;
  var TK_LEFTBRACE  = 0xA5;
  var TK_RIGHTBRACE   = 0xA6;
  var TK_PLUS     = 0xA7;
  var TK_MINUS    = 0xA8;
  var TK_DOT      = 0xA9;
  var TK_COLON    = 0xAA;
  var TK_COMMA    = 0xAB;
  var TK_BACKQUOTE  = 0xAC;
  var TK_COMMENT    = 0xAD;

  function eat(ctx, tk) {
    //log("eat() tk="+tk);
    var nextToken = next(ctx);
    if (nextToken !== tk) {
      throw new Error("syntax error: expecting " + tk + " found " + nextToken);
    }
  }

  function match(ctx, tk) {
    if (peek(ctx) === tk) {
      return true;
    } else {
      return false;
    }
  }

  function next(ctx) {
    var tk = peek(ctx);
    ctx.state.nextToken = -1;
    scanCount++;
    return tk;
  }

  function peek(ctx) {
    var tk;
    var nextToken = ctx.state.nextToken;
    if (nextToken < 0) {
      var t0 = new Date();
      tk = ctx.scan.start();
      var t1 = new Date();
      scanTime += (t1-t0);
      ctx.state.nextToken = tk;
    } else {
      tk = nextToken;
    }
    return tk;
  }

  // Parsing functions -- each parsing function consumes a single token and
  // returns a continuation function for parsing the rest of the string.

  function bool(ctx, cc) {
    eat(ctx, TK_BOOL);
    cc.cls = "number";
    ast.bool(ctx, lexeme==="true");
    return cc;
  }

  function number(ctx, cc) {
    eat(ctx, TK_NUM);
    cc.cls = "number";
    ast.number(ctx, lexeme);
    return cc;
  }

  function string(ctx, cc) {
    eat(ctx, TK_STR);
    cc.cls = "string";
    ast.string(ctx, lexeme.substring(1,lexeme.length-1)) // strip quotes;
    return cc;
  }

  function ident(ctx, cc) {
    eat(ctx, TK_IDENT);
    ast.name(ctx, lexeme);
    cc.cls = "ident";
    return cc;
  }

  function name(ctx, cc) {
    eat(ctx, TK_IDENT);
    ast.name(ctx, lexeme);
    var word = env.findWord(ctx, lexeme);
    if (word) {
      cc.cls = word.cls;
    } else {
      cc.cls = "comment";
    }
    assert(cc, "name");
    return cc;
  }

  function record(ctx, cc) {
    eat(ctx, TK_LEFTBRACE);
    var ret = function(ctx) {
      return bindings(ctx, function (ctx) {
        eat(ctx, TK_RIGHTBRACE);
        cc.cls = "punc";
        return cc;
      })
    }
    ret.cls = "punc";
    return ret;
  }

  function bindings(ctx, cc) {
    if (match(ctx, TK_RIGHTBRACE)) {
      return cc;
    }
    return binding(ctx, function (ctx) {
      if (match(ctx, TK_DOT)) {
        eat(ctx, TK_DOT);
        var ret = function (ctx) {
          return bindings(ctx, cc);
        }
        ret.cls = "punc";
        return ret;
      }
      return cc;
    })
  }

  function binding(ctx, cc) {
    return ident(ctx, function(ctx) {
      eat(ctx, TK_EQUAL);
      var ret = function(ctx) {
        return expr(ctx, cc);
      }
      ret.cls = "punc";
      return ret;
    })
  }

  function parenExpr(ctx, cc) {
    eat(ctx, TK_LEFTPAREN);
    var ret = function(ctx) {
      return condExpr(ctx, function (ctx) {
        eat(ctx, TK_RIGHTPAREN);
        cc.cls = "punc";
        return cc;
      })
    }
    ret.cls = "punc";
    return ret;
  }

  function list(ctx, cc) {
    eat(ctx, TK_LEFTBRACKET);
    var ret = function(ctx) {
      return exprsStart(ctx, function (ctx) {
        eat(ctx, TK_RIGHTBRACKET);
        ast.list(ctx);
        cc.cls = "punc";
        return cc;
      })
    }
    ret.cls = "punc";
    return ret;
  }

  function primaryExpr(ctx, cc) {
    if (match(ctx, TK_NUM)) {
      return number(ctx, cc);
    } else if (match(ctx, TK_STR)) {
      return string(ctx, cc);
    } else if (match(ctx, TK_BOOL)) {
      return bool(ctx, cc);
    } else if (match(ctx, TK_LEFTBRACE)) {
      return record(ctx, cc);
    } else if (match(ctx, TK_LEFTPAREN)) {
      return parenExpr(ctx, cc);
    } else if (match(ctx, TK_LEFTBRACKET)) {
      return list(ctx, cc);
    }
    return name(ctx, cc);
  }

  function funcApp(ctx, cc) {
    return primaryExpr(ctx, function primaryExprCC(ctx) {
      var node = ast.node(ctx, ast.topNode(ctx));
      if (node.op==="IDENT") {
        var name = node.args[0];
        var word = env.findWord(ctx, name);
        if (word && word.cls === "function") {
          startArgs(word.length);
          return args(ctx, cc);
        }
      }
      return cc(ctx);
      function startArgs(len) {
        ctx.state.argcStack.push(ctx.state.argc);
        ctx.state.paramcStack.push(ctx.state.paramc);
        ctx.state.paramc = ctx.state.argc = len;
      }
    });
  }

  function args(ctx, cc) {
    if (match(ctx, TK_COMMA)) {
      eat(ctx, TK_COMMA);
      ast.funcApp(ctx, ctx.state.paramc - ctx.state.argc);
      finishArgs(ctx);
      cc.cls = "punc";
      return cc;
    }
    else
    if (ctx.state.argc === 0) {
      ast.funcApp(ctx, ctx.state.paramc);
      finishArgs();
      return cc(ctx);
    }
    return arg(ctx, function (ctx) {
      return args(ctx, cc);
    })
    function finishArgs() {
      ctx.state.argc = ctx.state.argcStack.pop();
      ctx.state.paramc = ctx.state.paramcStack.pop();
    }
  }

  function arg(ctx, cc) {
    ctx.state.argc--;
    return expr(ctx, cc);
  }

  function postfixExpr(ctx, cc) {
    //log("postfixExpr()");
    return funcApp(ctx, function (ctx) {
      //log("found funcApp");
      if (match(ctx, TK_POSTOP)) {
        eat(ctx, TK_POSTOP);
        cc.cls = "operator";
        ast.postfixExpr(ctx, lexeme);
        return cc;
      }
      return cc(ctx);
    })
  }

  function prefixExpr(ctx, cc) {
    //log("prefixExpr()");
    if (match(ctx, TK_MINUS)) {
      eat(ctx, TK_MINUS);
      var ret = function(ctx) {
        return postfixExpr(ctx, function (ctx) {
          ast.prefixExpr(ctx, "NEG");
          return cc;
        })
      }
      ret.cls = "number"   // use number because of convention
      return ret;
    }
    return postfixExpr(ctx, cc);
  }

  function getPrecedence(op) {
    return {
      "": 0
      , "OR": 1
      , "AND": 2
      , "EQ": 3
      , "NE": 3
      , "LT": 4
      , "GT": 4
      , "LE": 4
      , "GE": 4
      , "CONCAT": 5
      , "ADD": 5
      , "SUB": 5
      , "MUL": 6
      , "DIV": 6
      , "MOD": 6
      , "POW": 7
    }[op];
  }

  function binaryExpr(ctx, prevOp, cc) {
    return prefixExpr(ctx, function (ctx) {
      if (match(ctx, TK_BINOP)) {
        eat(ctx, TK_BINOP)
        var ret = function (ctx) {
          var op = env.findWord(ctx, lexeme).name
          if (getPrecedence(prevOp) < getPrecedence(op)) {
            return binaryExpr(ctx, op, function(ctx, prevOp) {
              // This continuation's purpose is to construct a right recursive
              // binary expression node. If the previous node is a binary node
              // with equal or higher precedence, then we get here from the left
              // recursive branch below and there is no way to know the current
              // operator unless it gets passed as an argument, which is what
              // prevOp is for.
              if (prevOp !== void 0) {
                op = prevOp
              }
              ast.binaryExpr(ctx, op)
              return cc(ctx)
            })
          } else {
            ast.binaryExpr(ctx, prevOp)
            return binaryExpr(ctx, op, function(ctx, prevOp) {
              if (prevOp !== void 0) {
                op = prevOp
              }
              return cc(ctx, op)
            })
          }
        }
        ret.cls = "operator"
        return ret
      }
      return cc(ctx)
    })
  }

  function relationalExpr(ctx, cc) {
    return binaryExpr(ctx, "", function (ctx) {
      return cc(ctx)
    })
  }

  function condExpr(ctx, cc) {
    //log("condExpr()")
    if (match(ctx, TK_CASE)) {
      return caseExpr(ctx, cc)
    }
    return relationalExpr(ctx, cc)
  }

  function caseExpr(ctx, cc) {
    //log("caseExpr()")
    eat(ctx, TK_CASE)
    var ret = function (ctx) {
      return expr(ctx, function (ctx) {
        startCounter(ctx)
        return ofClauses(ctx, function (ctx) {
          ast.caseExpr(ctx, ctx.state.exprc)
          stopCounter(ctx)
          eat(ctx, TK_END)
          cc.cls = "keyword"
          return cc
        })
      })
    }
    ret.cls = "keyword"
    return ret
  }

  function ofClauses(ctx, cc) {
    //log("ofClauses()")
    if (match(ctx, TK_OF)) {
      return ofClause(ctx, function (ctx) {
        countCounter(ctx)
        if (match(ctx, TK_OF)) {
          return ofClauses(ctx, cc)
        }
        return cc(ctx)
      })
    }
    return cc(ctx)
  }

  function ofClause (ctx, cc) {
    //log("ofClause()")
    eat(ctx, TK_OF)
    var ret = function (ctx) {
      return pattern(ctx, function (ctx) {
        eat(ctx, TK_EQUAL)
        var ret = function(ctx) {
          return exprsStart(ctx, function(ctx) {
            ast.ofClause(ctx)
            return cc(ctx)
          })
        }
        ret.cls = "punc"
        return ret
      })
    }
    ret.cls = "keyword"
    return ret
  }

  function pattern(ctx, cc) {
    // FIXME only matches number literals for now
    return primaryExpr(ctx, cc)
  }

  function thenClause(ctx, cc) {
    //log("thenClause()")
    eat(ctx, TK_THEN)
    var ret = function (ctx) {
      return exprsStart(ctx, function (ctx) {
        if (match(ctx, TK_ELSE)) {
          return elseClause(ctx, cc)
        } else {
          return cc(ctx)
        }
      })
    }
    ret.cls = "keyword"
    return ret
  }

  function elseClause(ctx, cc) {
    //log("elseClause()")
    eat(ctx, TK_ELSE)
    var ret = function (ctx) {
      return exprsStart(ctx, cc)
    }
    ret.cls = "keyword"
    return ret
  }

  function expr(ctx, cc) {
    //log("expr()")
    if (match(ctx, TK_LET)) {
      var ret = def(ctx, cc)
      //log("def() ret="+ret)
      return ret
    }
    var ret = condExpr(ctx, cc)
    //log("condExpr() ret="+ret)
    return ret
  }

  function emptyInput(ctx) {
    return peek(ctx) === 0
  }

  function emptyExpr(ctx) {
    return emptyInput(ctx)
      || match(ctx, TK_THEN)
      || match(ctx, TK_ELSE)
      || match(ctx, TK_OR)
      || match(ctx, TK_END)
      || match(ctx, TK_DOT)
  }

  function countCounter(ctx) {
    ctx.state.exprc++
  }

  function startCounter(ctx) {
    ctx.state.exprcStack.push(ctx.state.exprc)
    ctx.state.exprc = 0
  }

  function stopCounter(ctx) {
    ctx.state.exprc = ctx.state.exprcStack.pop()
  }

  function exprsStart(ctx, cc) {
    //log("exprsStart()")
    startCounter(ctx)
    return exprs(ctx, cc)
  }

  function exprsFinish(ctx, cc) {
    //log("exprsFinish()")
    ast.exprs(ctx, ctx.state.exprc)
    stopCounter(ctx)
    return cc(ctx)
  }

  function exprs(ctx, cc) {
    //log("exprs()")
    if (match(ctx, TK_DOT)) {   // second dot
      eat(ctx, TK_DOT)
      var ret = function(ctx) {
        return exprsFinish(ctx, cc)
      }
      ret.cls = "punc"
      return ret
    }

    return expr(ctx, function (ctx) {
      countCounter(ctx)
      if (match(ctx, TK_DOT)) {
        eat(ctx, TK_DOT)
        var ret = function (ctx) {
          if (emptyInput(ctx) || emptyExpr(ctx)) {
            return exprsFinish(ctx, cc)
          }
          return exprs(ctx, cc)
        }
        ret.cls = "punc"
        return ret
      }
      return exprsFinish(ctx, cc)
    })
  }

  function program(ctx, cc) {
    return exprsStart(ctx, function (ctx) {
      folder.fold(ctx, ast.pop(ctx))  // fold the exprs on top
      ast.program(ctx)
      assert(cc===null, "internal error, expecting null continuation")
      //print(ast.dumpAll(ctx));
      return cc
    })
  }

  function def(ctx, cc) {
    if (match(ctx, TK_LET)) {
      eat(ctx, TK_LET)
      var ret = function (ctx) {
        var ret = name(ctx, function (ctx) {
          var name = ast.node(ctx, ast.topNode(ctx)).args[0]
          // nid=0 means def not finished yet
          env.addWord(ctx, name, { tk: TK_IDENT, cls: "function", length: 0, nid: 0, name: name })
          ctx.state.paramc = 0
          env.enterEnv(ctx, name)  // FIXME need to link to outer env
          return params(ctx, function (ctx) {
            var func = env.findWord(ctx, topEnv(ctx).name)
            func.length = ctx.state.paramc
            func.env = topEnv(ctx)
            eat(ctx, TK_EQUAL)
            var ret = function(ctx) {
              return exprsStart(ctx, function (ctx) {
                var def = env.findWord(ctx, topEnv(ctx).name)
                def.nid = ast.peek(ctx)   // save node id for aliased code
                env.exitEnv(ctx)
                ast.letDefn(ctx)
                return cc
              })
            }
            ret.cls = "punc"
            return ret
          })
        })
        ret.cls = "handler"
        return ret
      }
      ret.cls = "keyword"
      return ret
    }
    return name(ctx, cc)
  }

  function params(ctx, cc) {
    //log("params()")
    if (match(ctx, TK_EQUAL)) {
      return cc
    }
    return function (ctx) {
      var ret = primaryExpr(ctx, function (ctx) {
        env.addWord(ctx, lexeme, { tk: TK_IDENT, cls: "val", offset: ctx.state.paramc })
        ctx.state.paramc++
        return params(ctx, cc)
      })
      ret.cls = "ident"
      return ret
    }
  }

  function param(ctx, cc) {
    //log("param()")
    return primaryExpr(ctx, function (ctx) {
      return cc
    })
  }

  // Drive the parser

  function topEnv(ctx) {
    return ctx.state.env[ctx.state.env.length-1]
  }

  exports.topEnv = topEnv

  var lastAST
  function parse(stream, state) {
    var ctx = {scan: scanner(stream), state: state}
    var cls
    try {
      var c;
      while ((c = stream.peek()) && (c===' ' || c==='\t')) {
        stream.next()
      }
      // if this is a blank line, treat it as a comment
      if (stream.peek()===void 0) {
        throw "comment"
      }
      // call the continuation and store the next continuation
      //log(">>parse() cc="+state.cc+"\n")
      if (state.cc === null) {
        next(ctx)
        return "comment"
      }
      var t0 = new Date;
      var lastCC = state.cc
      var cc = state.cc = state.cc(ctx, null)
      if (cc) {
        cls = cc.cls
      }
      if (cc === null && exports.doRecompile) {
        var thisAST = ast.poolToJSON(ctx)
        var lastAST = lastAST
        if (!_.isEqual(lastAST, thisAST)) {
          exports.gc.compileCode(thisAST)
        }
        lastAST = thisAST
      }
      var c;
      while ((c = stream.peek()) &&
           (c===' ' || c==='\t')) {
        stream.next()
      }
    } catch (x) {
      //console.log(x.stack);
      //console.log(ast.dumpAll(ctx));
      if (x instanceof Error) {
        next(ctx)
        cls = "error"
      } else if (x.indexOf("syntax error") === 0) {
        console.log("---------")
        console.log("exception caught!!!=")
        cls = "error"
        state.cc = null
      } else if (x === "comment") {
        //print("comment found")
        cls = x
      } else {
        //throw x
        next(ctx)
        cls = "error"
      }
      console.log(x)
    }
    var t1 = new Date;
    parseCount++
    parseTime += t1 - t0
    return cls
  }

  var lexeme = ""

  function scanner(stream) {

    var lexemeToToken = [ ]

    return {
      start: start ,
      stream: stream,
      lexeme: function () {
        return lexeme
      }
     }

    // begin private functions

    function start () {
      var c;
      lexeme = "";
      while (stream.peek() !== void 0) {
        switch ((c = stream.next().charCodeAt(0))) {
        case 32:  // space
        case 9:   // tab
        case 10:  // new line
        case 13:  // carriage return
          c = ' ';
          continue
        case 46:  // dot
          lexeme += String.fromCharCode(c);
          return TK_DOT
        case 44:  // comma
          lexeme += String.fromCharCode(c);
          return TK_COMMA
        case 58:  // colon
          lexeme += String.fromCharCode(c);
          return TK_COLON
        case 61:  // equal
          lexeme += String.fromCharCode(c);
          return TK_EQUAL
        case 40:  // left paren
          lexeme += String.fromCharCode(c);
          return TK_LEFTPAREN
        case 41:  // right paren
          lexeme += String.fromCharCode(c);
          return TK_RIGHTPAREN
        case 45:  // dash
          lexeme += String.fromCharCode(c);
          return TK_MINUS
        case 91:  // left bracket
          lexeme += String.fromCharCode(c);
          return TK_LEFTBRACKET
        case 93:  // right bracket
          lexeme += String.fromCharCode(c);
          return TK_RIGHTBRACKET
        case 123: // left brace
          lexeme += String.fromCharCode(c);
          return TK_LEFTBRACE
        case 125: // right brace
          lexeme += String.fromCharCode(c);
          return TK_RIGHTBRACE
        case 34:  // double quote
        case 39:  // single quote
          return string(c)

        case 96:  // backquote
        case 47:  // slash
        case 92:  // backslash
        case 33:  // !
        case 124: // |
          comment(c)
          throw "comment"

        case 94:  // caret
        case 44:  // comma
        case 42:  // asterisk
          lexeme += String.fromCharCode(c);
          return c; // char code is the token id
        default:
          if ((c >= 'A'.charCodeAt(0) && c <= 'Z'.charCodeAt(0)) ||
            (c >= 'a'.charCodeAt(0) && c <= 'z'.charCodeAt(0)) ||
            (c === '_'.charCodeAt(0))) {
            return ident(c);
          } else if (c >= '0'.charCodeAt(0) && c <= '9'.charCodeAt(0)) {
            //lex += String.fromCharCode(c);
            //c = src.charCodeAt(curIndex++);
            //return TK_NUM;
            return number(c);
          } else {
            assert( false, "scan.start(): c="+c);
            return 0;
          }
        }
      }

      return 0;
    }

    function number(c) {
      while (c >= '0'.charCodeAt(0) && c <= '9'.charCodeAt(0)) {
        lexeme += String.fromCharCode(c);
        var s;
        c = (s = stream.next()) ? s.charCodeAt(0) : 0
      }

      if (c) {
        stream.backUp(1);
      }  // otherwise, we are at the end of stream
      return TK_NUM;
    }

    function string(c) {
      var quoteChar = c
      lexeme += String.fromCharCode(c)
      c = (s = stream.next()) ? s.charCodeAt(0) : 0

      while (c !== quoteChar && c !== 0) {
        lexeme += String.fromCharCode(c);
        var s;
        c = (s = stream.next()) ? s.charCodeAt(0) : 0
      }

      if (c) {
        lexeme += String.fromCharCode(c)
        return TK_STR;
      } else {
        return 0
      }
    }

    function comment(c) {
      var quoteChar = c
      c = (s = stream.next()) ? s.charCodeAt(0) : 0

      while (c !== quoteChar && c != 10 && c!= 13 && c !== 0) {
        var s;
        c = (s = stream.next()) ? s.charCodeAt(0) : 0
      }

      return TK_COMMENT
    }

    function ident(c) {
      while ((c >= 'A'.charCodeAt(0) && c <= 'Z'.charCodeAt(0)) ||
           (c >= 'a'.charCodeAt(0) && c <= 'z'.charCodeAt(0)) ||
           (c === '-'.charCodeAt(0)) ||
           (c === '@'.charCodeAt(0)) ||
           (c === '+'.charCodeAt(0)) ||
           (c === '#'.charCodeAt(0)) ||
           (c === ':'.charCodeAt(0)) ||
           (c === '_'.charCodeAt(0)) ||
           (c === '~'.charCodeAt(0)) ||
           (c >= '0'.charCodeAt(0) && c <= '9'.charCodeAt(0)))
      {
        lexeme += String.fromCharCode(c);
        c = stream.peek() ? stream.next().charCodeAt(0) : 0
      }

      if (c) {
        stream.backUp(1);
      }  // otherwise, we are at the end of stream

      //log("ident() lexeme="+lexeme)
      var tk = TK_IDENT
      if (globalLexicon[lexeme]) {
        tk = globalLexicon[lexeme].tk
      }
      return tk;
    }
  }

  var parser = {
    token: function(stream, state) {
      return parse(stream, state)
    },

    startState: function() {
      return {
        cc: program,   // top level parsing function
        argc: 0,
        argcStack: [0],
        paramc: 0,
        paramcStack: [0],
        exprc: 0,
        exprcStack: [0],
        env: [ {name: "global", lexicon: globalLexicon } ],
        nodeStack: [],
        nodePool: ["unused"],
        nodeMap: {},
        nextToken: -1,
      }
    },

    parse: parse,
    program: program,
  }

  exports.startState = parser.startState
  exports.parse = parser.parse

  return parser
})(); // end parser

var foldTime = 0

exports.foldTime = function () {
  return foldTime
}

var folder = function() {
  var _ = exports._;

  var table = {
    "PROG" : program,
    "EXPRS" : exprs,
    "RECURSE" : recurse,
    "IDENT" : ident,
    "BOOL" : bool,
    "NUM" : num,
    "STR" : str,
    "PARENS" : unaryExpr,
    "MAP": map,
    "CALL" : call,
    "MUL": mul,
    "DIV": div,
    "SUB": sub,
    "ADD": add,
    "POW": pow,
    "MOD": mod,
    "CONCAT": concat,
    "OR": orelse,
    "AND": andalso,
    "NE": ne,
    "EQ": eq,
    "LT": lt,
    "GT": gt,
    "LE": le,
    "GE": ge,
    "NEG": neg,
    "LIST": list,
    "CASE": caseExpr,
    "OF": ofClause,
  };

  var canvasWidth = 0;
  var canvasHeight = 0;

  return {
    fold: fold,
  };

  // CONTROL FLOW ENDS HERE

  var nodePool;
  var ctx;

  function fold(cx, nid) {
    ctx = cx;
    nodePool = ctx.state.nodePool;
    var t0 = new Date;
    visit(nid);
    var t1 = new Date;
    foldTime += (t1-t0);
  }

  function visit(nid) {
    var node = nodePool[nid];
    if (node == null) {
      return null;
    }
    if (node.op === void 0) {
      return [ ]  // clean up stubs;
    } else if (isFunction(table[node.op])) {
      var ret = table[node.op](node);
      return ret;
    }
    funcApp2(node);
  }

  function isArray(v) {
    return _.isArray(v);
  }

  function isObject(v) {
    return _isObjet(v);
  }

  function isString(v) {
    return _.isString(v);
  }

  function isPrimitive(v) {
    return _.isNull(v) || _.isString(v) || _.isNumber(v) || _.isBoolean(v);
  }

  function isFunction(v) {
    return _.isFunction(v);
  }

  // BEGIN VISITOR METHODS

  var edgesNode;

  function program(node) {
    visit(node.args[0]);
    ast.program(ctx);
  }

  function caseExpr(node) {
    visit(node.args[node.args.length-1]);
    var expr = ast.pop(ctx);
    for (var i = node.args.length-2; i >= 0; i--) {
      var ofNode = ctx.state.nodePool[node.args[i]];
      var patternNode = ofNode.args[1];
      visit(patternNode);
      var pattern = ast.pop(ctx);
      if (expr === pattern) {
        visit(ofNode.args[0]);
        return;
      }
    }
  }

  function ofClause(node) {
    for (var i = 0; i < node.args.length; i++) {
      visit(node.args[i]);
    }
    ast.ofClause(ctx);
  }

  function list(node) {
    visit(node.args[0]);
    ast.list(ctx)
  }

  function exprs(node) {
    for (var i = 0; i < node.args.length; i++) {
      visit(node.args[i]);
    }
    ast.exprs(ctx, node.args.length);
  }

  function recurse(node) {
    for (var i = node.args.length-1; i >= 0; i--) {
      visit(node.args[i]);
    }
    ast.call(ctx, node.args.length-1) // func name is the +1
  }

  function map(node) {
    ast.name(ctx, "map");
    for (var i = node.args.length-1; i >= 0; i--) {
      visit(node.args[i]);
    }
    ast.funcApp(ctx, node.args.length);
  }

  function call(node) {
    for (var i = node.args.length-1; i >= 0; i--) {
      visit(node.args[i]);
    }
    ast.call(ctx, node.args.length-1);
  }

  function funcApp2(node) {
    ast.name(ctx, node.op);
    for (var i = node.args.length-1; i >= 0; i--) {
      visit(node.args[i]);
    }
    ast.funcApp2(ctx, node.args.length);
  }

  function neg(node) {
    visit(node.args[0]);
    ast.neg(ctx);
  }

  function unaryExpr(node) {
    visit(node.args[0]);
    ast.unaryExpr(ctx, node.op);
  }

  function visitArgs(args) {
    for (var i = args.length - 1; i >= 0; i--) {
      visit(args[i]);
    }
  }

  function add(node) {
    visit(node.args[1]);
    visit(node.args[0]);
    ast.add(ctx);
  }

  function sub(node) {
    visit(node.args[1]);
    visit(node.args[0]);
    ast.sub(ctx);
  }

  function mul(node) {
    visit(node.args[1]);
    visit(node.args[0]);
    ast.mul(ctx);
  }

  function div(node) {
    visit(node.args[1]);
    visit(node.args[0]);
    ast.div(ctx);
  }

  function pow(node) {
    visit(node.args[1]);
    visit(node.args[0]);
    ast.pow(ctx);
  }

  function concat(node) {
    visit(node.args[1]);
    visit(node.args[0]);
    ast.concat(ctx);
  }

  function mod(node) {
    visit(node.args[1]);
    visit(node.args[0]);
    ast.mod(ctx);
  }

  function orelse(node) {
    visit(node.args[1]);
    visit(node.args[0]);
    ast.orelse(ctx);
  }

  function andalso(node) {
    visit(node.args[1]);
    visit(node.args[0]);
    ast.andalso(ctx);
  }

  function eq(node) {
    visit(node.args[1]);
    visit(node.args[0]);
    ast.eq(ctx);
  }

  function ne(node) {
    visit(node.args[1]);
    visit(node.args[0]);
    ast.ne(ctx);
  }

  function lt(node) {
    visit(node.args[1]);
    visit(node.args[0]);
    ast.lt(ctx);
  }

  function gt(node) {
    visit(node.args[1]);
    visit(node.args[0]);
    ast.gt(ctx);
  }

  function le(node) {
    visit(node.args[1]);
    visit(node.args[0]);
    ast.le(ctx);
  }

  function ge(node) {
    visit(node.args[1]);
    visit(node.args[0]);
    ast.ge(ctx);
  }

  // when folding identifiers we encounter three cases:
  // -- the identifier is a function name, so we create a funcApp node
  // -- the identifier has a value, so we replace it with the value
  // -- the identifier is a reference to a local without a value, so we keep the identifier

  function ident(node) {
    var name = node.args[0];
    var word = env.findWord(ctx, name);
    if (word) {
      if (word.cls==="val") {
        if (word.val) {
          ast.push(ctx, word.val);
          visit(ast.pop(ctx));      // reduce the val expr
        } else if (word.name) {
          ast.push(ctx, {op: word.name, args: []});  // create a node from the word entry
        } else {
          ast.push(ctx, node);  // push the original node to be resolved later.
        }
      } else {
        ast.push(ctx, node);
      }
// FIXME need to implement this
//      else
//      if (word.cls==="function") {
//        assert(false, "implement forward references to functions")
//      }
    } else {
      //assert(false, "unresolved ident "+name);
      ast.push(ctx, node);
    }
  }

  function num(node) {
    ast.number(ctx, node.args[0]);
  }

  function str(node) {
    ast.string(ctx, node.args[0]);
  }

  function bool(node) {
    ast.bool(ctx, node.args[0]);
  }

  function stub(node) {
    return "";
  }
}();