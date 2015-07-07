(function() {
  var BASE_PATH, EventEmitter, LUAREPL, Loader, SANDBOX_SRC, Sandbox, UA, script_element, workerSupported,
    __slice = [].slice,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __hasProp = {}.hasOwnProperty;

  EventEmitter = (function() {
    function EventEmitter() {
      this.listeners = {};
    }

    EventEmitter.prototype.makeArray = function(obj) {
      if (Object.prototype.toString.call(obj) !== '[object Array]') {
        obj = [obj];
      }
      return obj;
    };

    EventEmitter.prototype.on = function(types, fn) {
      var type, _i, _len, _results;
      if (typeof fn !== 'function') {
        return;
      }
      types = this.makeArray(types);
      _results = [];
      for (_i = 0, _len = types.length; _i < _len; _i++) {
        type = types[_i];
        if (this.listeners[type] == null) {
          _results.push(this.listeners[type] = [fn]);
        } else {
          _results.push(this.listeners[type].push(fn));
        }
      }
      return _results;
    };

    EventEmitter.prototype.off = function(types, fn) {
      var i, listeners, type, _i, _len, _results;
      types = this.makeArray(types);
      _results = [];
      for (_i = 0, _len = types.length; _i < _len; _i++) {
        type = types[_i];
        listeners = this.listeners[type];
        if (listeners == null) {
          continue;
        }
        if (fn != null) {
          i = listeners.indexOf(fn);
          if (i > -1) {
            _results.push(listeners.splice(i, 1));
          } else {
            _results.push(void 0);
          }
        } else {
          _results.push(this.listeners[type] = []);
        }
      }
      return _results;
    };

    EventEmitter.prototype.fire = function(type, args) {
      var f, fn, listeners, _i, _len, _ref, _results;
      args = this.makeArray(args);
      listeners = this.listeners[type];
      if (listeners == null) {
        return;
      }
      args.push(type);
      _ref = (function() {
        var _j, _len, _results1;
        _results1 = [];
        for (_j = 0, _len = listeners.length; _j < _len; _j++) {
          f = listeners[_j];
          _results1.push(f);
        }
        return _results1;
      })();
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        fn = _ref[_i];
        _results.push(fn.apply(this, args));
      }
      return _results;
    };

    EventEmitter.prototype.once = function(types, fn) {
      var cb, type, _i, _len, _results;
      types = this.makeArray(types);
      cb = (function(_this) {
        return function() {
          var args, type, _i, _len;
          args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
          for (_i = 0, _len = types.length; _i < _len; _i++) {
            type = types[_i];
            _this.off(type, cb);
          }
          return fn.apply(null, args);
        };
      })(this);
      _results = [];
      for (_i = 0, _len = types.length; _i < _len; _i++) {
        type = types[_i];
        _results.push(this.on(type, cb));
      }
      return _results;
    };

    return EventEmitter;

  })();

  Sandbox = (function(_super) {
    __extends(Sandbox, _super);

    function Sandbox(listeners) {
      var fn, path, type;
      if (listeners == null) {
        listeners = {};
      }
      this.onmsg = __bind(this.onmsg, this);
      for (type in listeners) {
        fn = listeners[type];
        if (typeof fn === 'function') {
          listeners[type] = [fn];
        }
      }
      this.listeners = listeners;
    }

    Sandbox.prototype.connect = function() {
      var prefix = "ws";
      if (location.protocol === 'https:') {
        prefix = "wss"
      }
      var url = prefix.concat("://", location.hostname, ":", Number(location.port), "/wsserver.lua");
      this.ws = new WebSocket(url);

      this.ws.binaryType = 'arraybuffer';
      this.ws.onopen = function(evt) {
      };
      this.ws.onmessage = this.onmsg;
      this.ws.onclose = function(evt) { 
        /*$('html').empty();
        window.close();*/
      };
      this.ws.onerror = function(evt) {
        console.log("socket error", evt);
      };
    };

    Sandbox.prototype.onmsg = function(event) {
      var e, msg;
      try {
        //msg = JSON.parse(event.data.toString());
        msg = msgpack.decode(event.data)
        return this.fire(msg.type, [msg.data]);
      } catch (_error) {
        console.log("on message error", _error);
        e = _error;
      }
    };

    Sandbox.prototype.post = function(msgObj) {
      var msgStr;
      msgStr = JSON.stringify(msgObj);
      return this.ws.send(msgStr);
    };

    return Sandbox;

  })(EventEmitter);

  UA = (function() {
    var UA_REGEXS, ua, ua_regex;
    UA_REGEXS = {
      firefox_3: /firefox\/3/i,
      opera: /opera/i,
      chrome: /chrome/i
    };
    for (ua in UA_REGEXS) {
      ua_regex = UA_REGEXS[ua];
      if (ua_regex.test(window.navigator.userAgent)) {
        return ua;
      }
    }
  })();

  LUAREPL = (function(_super) {
    __extends(LUAREPL, _super);

    function LUAREPL(_arg) {
      var baseScripts, db, load, error, input, output, progress, result, _ref;
      _ref = _arg != null ? _arg : {}, histo=_ref.histo, chart=_ref.chart, image=_ref.image, save = _ref.save, load = _ref.load, result = _ref.result, error = _ref.error, input = _ref.input, output = _ref.output, this.timeout = _ref.timeout;
      this.rawEval = __bind(this.rawEval, this);
      this.ctrlCmd = __bind(this.ctrlCmd, this);
      this.getCompletions = __bind(this.getCompletions, this);
      this["eval"] = __bind(this["eval"], this);
      this.checkLineEnd = __bind(this.checkLineEnd, this);
      this.off = __bind(this.off, this);
      this.on = __bind(this.on, this);
      LUAREPL.__super__.constructor.call(this);

      this.on('input', input);
      this.sandbox = new Sandbox({
        output: output,
        input: (function(_this) {
          return function() {
            return _this.fire('input', function(data) {
              return _this.sandbox.post({
                type: 'write',
                data: data+"\n"
              });
            });
          };
        })(this),
        error: error,
        result: result,
        load: load,
        save: save,
        histo: histo,
        image: image,
        chart: chart,
        login: (function(_this) {
          return function() {
            page('/login');
          };
        })(this),        
        start: (function(_this) {
          return function(data) {
            REPLIT.LogIn = 'pass';
            REPLIT.sessionid = data.sessionid;
            REPLIT.cport = data.cport;
            page("/");
            _this.rawEval('session', true);
          };
        })(this)
      });
      
      $("#login-form").submit(function(evt) {        
        REPLIT.luarepl.sandbox.post({
          type: 'login',
          data: {user:$("input:text").val(), pass:$("input:password").val()}
        });
        return false;
      });      

    }

    LUAREPL.prototype.on = function(types, fn) {
      var type, _i, _len, _results;
      types = this.makeArray(types);
      _results = [];
      for (_i = 0, _len = types.length; _i < _len; _i++) {
        type = types[_i];
        if (type === 'input') {
          _results.push(LUAREPL.__super__.on.call(this, 'input', fn));
        } else {
          _results.push(this.sandbox.on(type, fn));
        }
      }
      return _results;
    };

    LUAREPL.prototype.off = function(types, fn) {
      var type, _i, _len, _results;
      types = this.makeArray(types);
      _results = [];
      for (_i = 0, _len = types.length; _i < _len; _i++) {
        type = types[_i];
        if (type === 'input') {
          _results.push(LUAREPL.__super__.off.call(this, 'input', fn));
        } else {
          _results.push(this.sandbox.off(type, fn));
        }
      }
      return _results;
    };

    LUAREPL.prototype.checkLineEnd = function(command, callback) {
      if (/\n\s*$/.test(command)) {
        return callback(false);
      } else {
        this.sandbox.once('indent', callback);
        return this.sandbox.post({
          type: 'indent',
          data: command
        });
      }
    };

    LUAREPL.prototype["eval"] = function(command, callback) {
      var bind, cb, listener, t, unbind;
      if (this.timeout != null && this.timeout.time && this.timeout.callback) {
        t = null;
        cb = (function(_this) {
          return function() {
            var a;
            _this.sandbox.fire('timeout');
            a = _this.timeout.callback();
            if (!a) {
              return t = setTimeout(cb, _this.timeout.time);
            } else {
              return unbind();
            }
          };
        })(this);
        t = setTimeout(cb, this.timeout.time);
        listener = (function(_this) {
          return function() {
            var args, type, _i;
            args = 2 <= arguments.length ? __slice.call(arguments, 0, _i = arguments.length - 1) : (_i = 0, []), type = arguments[_i++];
            clearTimeout(t);
            if (type === 'input') {
              _this.once('recieved_input', function() {
                return t = setTimeout(cb, _this.timeout.time);
              });
              return bind();
            }
          };
        })(this);
        bind = (function(_this) {
          return function() {
            return _this.once(['result', 'error', 'input'], listener);
          };
        })(this);
        unbind = (function(_this) {
          return function() {
            return _this.off(['result', 'error', 'input'], listener);
          };
        })(this);
        bind();
      }
      if (typeof callback === 'function') {
        this.once(['result', 'error'], (function(_this) {
          return function() {
            var args, type, _i;
            args = 2 <= arguments.length ? __slice.call(arguments, 0, _i = arguments.length - 1) : (_i = 0, []), type = arguments[_i++];
            if (type === 'error') {
              return callback(args[0], null);
            } else {
              return callback(null, args[0]);
            }
          };
        })(this));
      }
      return this.sandbox.post({
        type: 'eval',
        data: command
      });
    };

    LUAREPL.prototype.rawEval = function(type, data) {
      return this.sandbox.post({
        type: type,
        data: data
      });
    };

    LUAREPL.prototype.ctrlCmd = function(cmd) {
      return this.sandbox.post({
        type: 'ctrl',
        data: cmd
      });
    };

    LUAREPL.prototype.getCompletions = function(token, hint) {
      this.once(['hint'], (function(_token, _hint) {
        return function(data) {
          if (_hint.last()!==_token)
            return;
          return _hint.set(data, _token);
        };
      })(token, hint));
      this.sandbox.post({type:'hint', data:token});
      return [];
    };

    return LUAREPL;

  })(EventEmitter);

  LUAREPL.prototype.__test__ = (function() {
    function __test__() {}

    return __test__;

  })();

  LUAREPL.prototype.__test__.prototype.EventEmitter = EventEmitter;

  LUAREPL.prototype.__test__.prototype.Sandbox = Sandbox;

  this.LUAREPL = LUAREPL;

}).call(this);
