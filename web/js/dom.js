(function() {
   var $, ANIMATION_DURATION, CONSOLE_HIDDEN, DEFAULT_CONTENT_PADDING, DEFAULT_SPLIT, DEFAULT_TITLE, EDITOR_HIDDEN, FOOTER_HEIGHT, HEADER_HEIGHT, MAX_PROGRESS_DURATION, MIN_PROGRESS_DURATION, PROGRESS_ANIMATION_DURATION, RESIZER_WIDTH, SNAP_THRESHOLD, TITLE_ANIMATION_DURATION;
   DEFAULT_CONTENT_PADDING = 200;
   FOOTER_HEIGHT = 30;
   HEADER_HEIGHT = 61;
   RESIZER_WIDTH = 8;
   DEFAULT_SPLIT = 0.5;
   CONSOLE_HIDDEN = 1;
   EDITOR_HIDDEN = 0;
   SNAP_THRESHOLD = 0.05;
   ANIMATION_DURATION = 700;
   MIN_PROGRESS_DURATION = 1;
   MAX_PROGRESS_DURATION = 1500;
   PROGRESS_ANIMATION_DURATION = 2000;
   TITLE_ANIMATION_DURATION = 300;
   DEFAULT_TITLE = 'Online Interpreter';
   $ = jQuery;
   $.fn.disableSelection = function() {
      return this.each(function() {
         var $this;
         $this = $(this);
         $this.attr('unselectable', 'on');
         $this.css({
            '-moz-user-select': 'none',
            '-webkit-user-select': 'none',
            'user-select': 'none'
         });
         return $this.each(function() {
            return this.onselectstart = function() {
               return false;
            };
         });
      });
   };
   $.fn.enableSelection = function() {
      return this.each(function() {
         var $this;
         $this = $(this);
         $this.attr('unselectable', '');
         $this.css({
            '-moz-user-select': '',
            '-webkit-user-select': '',
            'user-select': ''
         });
         return $this.each(function() {
            return this.onselectstart = null;
         });
      });
   };
   $.extend(REPLIT, {
      RESIZER_WIDTH: RESIZER_WIDTH,
      CONSOLE_HIDDEN: CONSOLE_HIDDEN,
      EDITOR_HIDDEN: EDITOR_HIDDEN,
      DEFAULT_CONTENT_PADDING: DEFAULT_CONTENT_PADDING,
      split_ratio: REPLIT.ISMOBILE ? EDITOR_HIDDEN : DEFAULT_SPLIT,
      min_content_width: 500,
      max_content_width: 3000,
      content_padding: DEFAULT_CONTENT_PADDING,
      last_progress_ratio: 0,
      InitDOM: function() {
         var mobile_timer;
         this.$doc_elem = $('html');
         this.$container = $('#main');
         this.$panels = $('#panel-container');
         this.$editorContainer = $('#editor');
         this.$consoleContainer = $('#console');
         //this.$page = $('#content-workspace');
         //this.$page_elem = $('.page');
         this.$resizer = {
            l: $('#resize-left'),
            c: $('#resize-center'),
            r: $('#resize-right')
         };
         this.$unhider = {
            editor: $('#unhide-right'),
            console: $('#unhide-left')
         };
         this.$run = $('#editor-run');
         this.$editorContainer.mouseleave((function(_this) {
            return function() {
               return _this.$run.fadeIn('fast');
            };
         })(this));
         this.$editorContainer.mousemove((function(_this) {
            return function() {
               if (_this.$run.is(':hidden')) {
                  return _this.$run.fadeIn('fast');
               }
            };
         })(this));
         this.$editorContainer.keydown((function(_this) {
            return function() {
               return _this.$run.fadeOut('fast');
            };
         })(this));
         this.InitSideResizers();
         this.InitCenterResizer();
         this.InitUnhider();
         this.OnResize();
         mobile_timer = null;
         return $(window).bind('resize', (function(_this) {
            return function() {
               var cb;
               if (_this.ISMOBILE) {
                  mobile_timer = clearTimeout(mobile_timer);
                  cb = function() {
                     var width;
                     width = document.documentElement.clientWidth;
                     REPLIT.min_content_width = width - 2 * RESIZER_WIDTH;
                     return _this.OnResize();
                  };
                  return mobile_timer = setTimeout((function() {
                     return _this.OnResize();
                  }), 300);
               } else {
                  return _this.OnResize();
               }
            };
         })(this));
      },
      MakePageVisible: function() {
         var outerWidth = document.documentElement.clientWidth - this.DEFAULT_CONTENT_PADDING;      
         this.$container.css({
            width: outerWidth
         });
         this.$page_elem.css({
            width: outerWidth,
            display: 'block'
         });
         this.OnResize();
         //return done();
      },
      InitSideResizers: function() {
         var $body, $elem, resizer_lr_release, _, _ref;
         $body = $('body');
         _ref = this.$resizer;
         for (_ in _ref) {
            $elem = _ref[_];
            $elem.mousedown(function(e) {
               if (e.button !== 0) {
                  return e.stopImmediatePropagation();
               } else {
                  return $body.disableSelection();
               }
            });
         }
         this.$resizer.l.mousedown((function(_this) {
            return function(e) {
               return $body.bind('mousemove.side_resizer', function(e) {
                  _this.content_padding = (e.pageX - (RESIZER_WIDTH / 2)) * 2;
                  if (_this.content_padding / $body.width() < SNAP_THRESHOLD) {
                     _this.content_padding = 0;
                  }
                  return _this.OnResize();
               });
            };
         })(this));
         this.$resizer.r.mousedown((function(_this) {
            return function(e) {
               return $body.bind('mousemove.side_resizer', function(e) {
                  _this.content_padding = ($body.width() - e.pageX - (RESIZER_WIDTH / 2)) * 2;
                  if (_this.content_padding / $body.width() < SNAP_THRESHOLD) {
                     _this.content_padding = 0;
                  }
                  return _this.OnResize();
               });
            };
         })(this));
         resizer_lr_release = function() {
            $body.enableSelection();
            return $body.unbind('mousemove.side_resizer');
         };
         this.$resizer.l.mouseup(resizer_lr_release);
         this.$resizer.r.mouseup(resizer_lr_release);
         return $body.mouseup(resizer_lr_release);
      },
      InitCenterResizer: function() {
         var resizer_c_release;
         resizer_c_release = (function(_this) {
            return function() {
               _this.$container.enableSelection();
               return _this.$container.unbind('mousemove.center_resizer');
            };
         })(this);
         this.$resizer.c.mousedown((function(_this) {
            return function(e) {
               return _this.$container.bind('mousemove.center_resizer', function(e) {
                  var left;
                  left = e.pageX - (_this.content_padding / 2) + (RESIZER_WIDTH / 2);
                  _this.split_ratio = left / _this.$container.width();
                  if (_this.split_ratio > CONSOLE_HIDDEN - SNAP_THRESHOLD) {
                     _this.split_ratio = CONSOLE_HIDDEN;
                     resizer_c_release();
                  } else if (_this.split_ratio < EDITOR_HIDDEN + SNAP_THRESHOLD) {
                     _this.split_ratio = EDITOR_HIDDEN;
                     resizer_c_release();
                  }
                  return _this.OnResize();
               });
            };
         })(this));
         this.$resizer.c.mouseup(resizer_c_release);
         this.$container.mouseup(resizer_c_release);
         return this.$container.mouseleave(resizer_c_release);
      },
      InitUnhider: function() {
         var bindUnhiderClick, getUnhider;
         getUnhider = (function(_this) {
            return function() {
               var side, _ref;
               if ((_ref = _this.split_ratio) !== CONSOLE_HIDDEN && _ref !== EDITOR_HIDDEN) {
                  return $([]);
               }
               side = _this.split_ratio === CONSOLE_HIDDEN ? 'console' : 'editor';
               return _this.$unhider[side];
            };
         })(this);
         $('body').mousemove((function(_this) {
            return function() {
               var unhider;
               unhider = getUnhider();
               if (unhider.is(':hidden')) {
                  return unhider.fadeIn('fast');
               }
            };
         })(this));
         this.$container.keydown((function(_this) {
            return function() {
               var unhider;
               unhider = getUnhider();
               if (unhider.is(':visible')) {
                  return unhider.fadeOut('fast');
               }
            };
         })(this));
         bindUnhiderClick = (function(_this) {
            return function($elem, $elemtoShow) {
               return $elem.click(function(e) {
                  $elem.hide();
                  _this.split_ratio = DEFAULT_SPLIT;
                  $elemtoShow.show();
                  _this.$resizer.c.show();
                  return _this.OnResize();
               });
            };
         })(this);
         bindUnhiderClick(this.$unhider.editor, this.$editorContainer);
         return bindUnhiderClick(this.$unhider.console, this.$consoleContainer);
      },
      OnResize: function() {
         var documentHeight, documentWidth, height, innerWidth, width;
         documentWidth = document.documentElement.clientWidth;
         documentHeight = document.documentElement.clientHeight;
         height = documentHeight - HEADER_HEIGHT - FOOTER_HEIGHT;
         width = documentWidth - this.content_padding;
         innerWidth = width - 2 * RESIZER_WIDTH;
         if (innerWidth < this.min_content_width) {
            innerWidth = this.min_content_width;
         } else if (innerWidth > this.max_content_width) {
            innerWidth = this.max_content_width;
         }
         width = innerWidth + 2 * RESIZER_WIDTH;
         
         this.$panels.css({
            width: documentWidth,
            height: documentHeight - FOOTER_HEIGHT
         });
         this.$container.css({
            width: width,
            height: height
         });
         $('.page:visible').css({
            width: innerWidth
         });
         if ($('.page:visible').is('#content-workspace')) {
            return this.ResizeWorkspace(innerWidth, height);
         }
      },
      ResizeWorkspace: function(innerWidth, height) {
         var console_hpadding, console_vpadding, console_width, editor_hpadding, editor_vpadding, editor_width, _ref;
         editor_width = Math.floor(this.split_ratio * innerWidth);
         console_width = innerWidth - editor_width;
         if ((_ref = this.split_ratio) !== CONSOLE_HIDDEN && _ref !== EDITOR_HIDDEN) {
            editor_width -= RESIZER_WIDTH / 2;
            console_width -= RESIZER_WIDTH / 2;
         }
         this.$resizer.c.css({
            left: editor_width
         });
         this.$editorContainer.css({
            width: editor_width,
            height: height
         });
         this.$consoleContainer.css({
            width: console_width,
            height: height
         });
         if (this.split_ratio === CONSOLE_HIDDEN) {
            this.$consoleContainer.hide();
            this.$resizer.c.hide();
            this.$unhider.console.show();
         } else if (this.split_ratio === EDITOR_HIDDEN) {
            this.$editorContainer.hide();
            this.$resizer.c.hide();
            this.$unhider.editor.show();
         }
         console_hpadding = this.$console.innerWidth() - this.$console.width();
         console_vpadding = this.$console.innerHeight() - this.$console.height();
         editor_hpadding = this.$editor.innerWidth() - this.$editor.width();
         editor_vpadding = this.$editor.innerHeight() - this.$editor.height();
         this.$editor.css('width', this.$editorContainer.innerWidth() - editor_hpadding);
         this.$editor.css('height', this.$editorContainer.innerHeight() - editor_vpadding);
         return this.editor.resize();
         /*
         if (!this.ISMOBILE) {
            return this.editor.resize();
         }*/
      },
      changeTitle: function(title) {
         var $title, curr_title;
         $title = $('#title');
         curr_title = $title.text().trim();
         if (!title || curr_title === title) {
            return;
         }
         document.title = "tide - " + title;
         if (curr_title !== '' && curr_title !== DEFAULT_TITLE) {
            return $title.fadeOut(TITLE_ANIMATION_DURATION, function() {
               $title.text(title);
               return $title.fadeIn(TITLE_ANIMATION_DURATION);
            });
         } else {
            return $title.text(title);
         }
      },
      getCookie: function(name) {
         var value = "; " + document.cookie;
         var parts = value.split("; " + name + "=");
         if (parts.length == 2) return parts.pop().split(";").shift();
      }
   });
   $(function() {
      REPLIT.InitDOM();
      $.jsPanel.defaults.draggable.containment = "parent";
      $.jsPanel.defaults.draggable.opacity = 0.8;
      $.jsPanel.defaults.size = 'auto';
      
      $("#jsPanel-min-container").css('bottom', FOOTER_HEIGHT);
      $('body').on("jspanelminimized", function(evt, id) {
         $('body').hide().show(0);
      });


   });
}).call(this);