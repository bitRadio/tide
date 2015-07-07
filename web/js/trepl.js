(function() {
   var $;
   $ = jQuery;

   imgTemplate = [
         "<img> </img>"
   ].join("\n");

   chartTemplate = [
      "<div>",
         "<svg></svg>",
      "</div>"
   ].join("\n");

   var ab2string = function(ab) {
      var arr = new Uint8Array(ab);
      var ret = [];
      for (i=0; i<arr.length; i++) {
         ret.push(String.fromCharCode(arr[i]));
      }
      return ret.join('');
   };

   $.extend(REPLIT, {
      Init: function() {
         this.luarepl = new LUAREPL({
            input: $.proxy(this.InputCallback, this),
            output: $.proxy(this.OutputCallback, this),
            result: $.proxy(this.ResultCallback, this),
            error: $.proxy(this.ErrorCallback, this),
            load: $.proxy(this.LoadCallback, this),
            save: $.proxy(this.SaveCallback, this),
            histo: $.proxy(this.SetHistory, this),
            image: $.proxy(this.displayImage, this),
            chart: $.proxy(this.drawChart, this),
            chart3d: $.proxy(this.drawChart3d, this),
            timeout: {
               time: 3000,
               callback: (function(_this) {
                  return function() {
                     var a;
                     if (a = confirm('The program is taking too long to finish. Do you want to stop it?')) {
                        var url = String.prototype.concat(location.protocol, "//", location.hostname, ":", REPLIT.cport, "/kill?sessionid=", REPLIT.sessionid);
                        var xhr = new XMLHttpRequest();
                        xhr.open('GET', url, true);
                        xhr.onreadystatechange = function() {
                           if (xhr.readyState == 4) {
                              _this.luarepl.sandbox.connect();
                              if (_this.jqconsole.state === 2) 
                                 _this.jqconsole.AbortPrompt();
                              _this.jqconsole.Reset();
                              _this.StartPrompt();
                           }
                        }
                        xhr.withCredentials = true;
                        xhr.send();
                     }
                     return a;
                  };
               })(this)
            }
         });
         this.hint = {
            idx: 0,
            words: [],
            last: function() {
               return this.words[this.idx];
            },
            next: function() {
               this.idx = (this.idx+1) % this.words.length;
               return this.last();
            },
            set: function(wlst, token) {
               this.words = wlst;
               this.words.push(token);
               this.idx = this.words.length-1;
            }
         };
         var header = 'Torch7 Scientific computing for Lua\n';
         this.jqconsole = this.$consoleContainer.jqconsole(header, 'th> ');
         this.$console = this.$consoleContainer.find('.jqconsole');
         this.jqconsole.RegisterMatching('{', '}', 'brace');
         this.jqconsole.RegisterMatching('(', ')', 'paran');
         this.jqconsole.RegisterMatching('[', ']', 'bracket');
         this.jqconsole.RegisterShortcut('Z', (function(_this) {
            return function() {
               _this.jqconsole.AbortPrompt();
               return _this.StartPrompt();
            };
         })(this));
         this.jqconsole.RegisterShortcut('A', (function(_this) {
            return function() {
               return _this.jqconsole.MoveToStart();
            };
         })(this));
         this.jqconsole.RegisterShortcut('E', (function(_this) {
            return function() {
               return _this.jqconsole.MoveToEnd();
            };
         })(this));
         this.jqconsole.RegisterShortcut('H', (function(_this) {
            return function() {
               return Router.navigate('/help');
            };
         })(this));         
         this.jqconsole.RegisterShortcut('K', (function(_this) {
            return function() {
               var jq = _this.jqconsole;
               if (jq.state !== 1) {
                  jq.ClearPromptText(true);
               }
               jq.state = 1;
               jq.input_queue = [];
               jq.input_callback = null;
               jq.multiline_callback = null;
               jq.$prompt.detach();
               jq.$input_container.detach();
               jq.$console.html('');
               jq.$prompt.appendTo(jq.$console);
               jq.$input_container.appendTo(jq.$container);
               jq.Write(jq.header, 'jqconsole-header');
               return _this.StartPrompt();
            };
         })(this));
         this.jqconsole.RegisterShortcut('D', (function(_this) {
            return function() {
               if (_this.jqconsole.state === 0) {
                  _this.jqconsole.input_callback = _this.luarepl.ctrlCmd;
                  return _this.jqconsole._HandleEnter(false);
               }
            }
         })(this));
         this.jqconsole.RegisterShortcut('X', (function(_this) {
            return function() {
               _this.luarepl.sandbox.ws.close();
               $('html').empty();
               window.close();
            };
         })(this));
         this.jqconsole._Indent = (function(_this, foo) {
            return function() {
               var jq = _this.jqconsole;
               var txt = jq.GetPromptText(true).split('\n');
               var wrd = txt[txt.length-1];
               if (wrd.length === jq.GetColumn()) {
                  var token = wrd.match(/\S+/g);
                  if (!token) {
                     return;
                  }
                  if (token.length>2 && (/^\.\w+/).test(token[token.length-2])) {
                     var idx = wrd.indexOf(token[token.length-2]);
                     token = wrd.substr(idx);                     
                  }else {
                     token = token[token.length-1];
                  }
                  if (token === wrd.substr(-token.length)) {
                     if (token !== _this.hint.last()) {
                        _this.hint.set(_this.luarepl.getCompletions(token, _this.hint), token);
                     }
                     txt = jq.GetPromptText();
                     txt = txt.substr(0, txt.length-token.length) + _this.hint.next();
                     jq.SetPromptText(txt);
                     jq.MoveToEnd();
                  }
               }
            };
         })(this, this.jqconsole._Indent);         
         this.$editor = this.$editorContainer.find('#editor-widget');
         this.editor = ace.edit('editor-widget');
         this.editor.setFontSize(14);
         this.editor.setBehavioursEnabled(true);
         this.editor.setTheme('ace/theme/tomorrow_night');
         this.editor.getSession().setMode('ace/mode/lua');
         this.editor.getSession().setUseSoftTabs(true);
         this.editor.getSession().setTabSize(3);
         this.editor.renderer.setHScrollBarAlwaysVisible(false);
         this.$run.click((function(_this) {
            return function() {
               if (_this.jqconsole.state === 2) {
                  _this.jqconsole.AbortPrompt();
                  var cmd = {data:REPLIT.editor.getSession().getValue(), save:false};
                  return _this.Evaluate(cmd);
               }
            };
         })(this));
         this.editor.commands.addCommand({
            name: 'run',
            bindKey: {
               win: 'Ctrl-Return',
               mac: 'Command-Return',
               sebder: 'editor'
            },
            exec: (function(_this) {
               return function() {
                  _this.$run.click();
                  return setTimeout((function() {
                     return _this.editor.focus();
                  }), 0);
               };
            })(this)
         });

         this.LogIn = 'fail';
         this.StartPrompt();
      },
      isEditorCmd: function(cmd) {
         return (/\.(load|save|exit)\s+\S+/).test(cmd) || 
            (/\.(exit)/).test(cmd);
      },
      loadSaveRequest: function(cmd) {
         var txt = cmd.match(/\S+/g);
         if (txt[0] === '.load') {
            return this.luarepl.rawEval('load', txt[1]);
         }
         if (txt[0] === '.save') {
            var text = this.editor.getSession().toString();
            return this.luarepl.rawEval('save', {name:txt[1], text:text});
         }
         if (txt[0] === '.exit') {
            var url = String.prototype.concat(location.protocol, "//", location.hostname, ":", REPLIT.cport, "/exit?sessionid=", REPLIT.sessionid);
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.onreadystatechange = function() {
               if (xhr.readyState == 4) {
                  $('html').empty();
                  window.close();
               }
            }
            xhr.withCredentials = true;
            xhr.send();
         }   
         return this.ErrorCallback("wrong comment");
      },
      LoadCallback: function(result) {
         if (result) {
            this.editor.getSession().setValue(result);
            this.jqconsole.Write('ok\n', 'output');
         }
         this.StartPrompt();
      },
      SaveCallback: function(msg) {
         if (msg) {
            msg = msg+'\n';
            this.jqconsole.Write(msg, 'output');
         }
         this.StartPrompt();
      },
      ResultCallback: function(result) {
         if (result) {
            this.jqconsole.Write(result, 'result');
         }
         this.StartPrompt();
         return this.$this.trigger('result', [result]);
      },
      ErrorCallback: function(error) {
         if (typeof error === 'object') {
            error = error.message;
         }
         if (error[-1] !== '\n') {
            error = error + '\n';
         }
         this.jqconsole.Write(String(error), 'error');
         this.StartPrompt();
         return this.$this.trigger('error', [error]);
      },
      OutputCallback: function(output, cls) {
         if (output) {
            this.jqconsole.Write(output, cls);
            this.$this.trigger('output', [output]);
            return void 0;
         }
      },
      InputCallback: function(callback) {
         this.jqconsole.Input((function(_this) {
            return function(result) {
               var e;
               try {
                  callback(result);
                  return _this.$this.trigger('input', [result]);
               } catch (_error) {
                  e = _error;
                  return _this.ErrorCallback(e);
               }
            };
         })(this));
         this.$this.trigger('input_request', [callback]);
         return void 0;
      },
      Evaluate: function(command) {
         if (command) {
            if (this.isEditorCmd(command) === true) {
               this.loadSaveRequest(command);
            } else {
               this.luarepl["eval"](command);
            }
            //return this.$this.trigger('eval', [command]);
         } else {
            return this.StartPrompt();
         }
      },
      StartPrompt: function() {
         return this.jqconsole.Prompt(true, $.proxy(this.Evaluate, this), this.luarepl.checkLineEnd, true);
      },
      SetHistory: function(data) {
         //this.jqconsole.Focus();
         return this.jqconsole.SetHistory(data.split('\n'));
      },
      displayImage: function(obj) {
         var el = $("#" + obj.id);
         var width=obj.width>150 ? obj.width : 150;
         var height=obj.height+5;
         if (Math.max(obj.width, obj.height)>400) {
            width=400; 
            height=400;
         }
         if (el.length) {
            el.data('panel').close();
         }
         var img = $(imgTemplate)
            .attr('src', 'data:image/jpeg;base64,' + ab2string(obj.image))
            .css('width', obj.width).css('height',obj.height);

         var jsP = $.jsPanel({
            selector: "#panel-container",
            id: obj.id,
            position: "center",
            size: { width:width, height:height },
            overflow: 'auto',
            resizable: { 
               maxWidth: $('#panel-container').width(),
               maxHeight: $('#panel-container').height()
            },
            theme:    "success",
            controls:  { maximize: "disable" },
            content: img,
            title: "id:" + obj.id + " " + obj.legend
         });
         el = $("#" + obj.id);
         el.data('panel', jsP);
      },
      drawChart: function(obj) {
      },
      drawChart3d: function(obj) {
      }
   });
   $(function() { 
      return REPLIT.Init();
   });
}).call(this);
