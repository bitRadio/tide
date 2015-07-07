(function() {
  var $, ALLOWED_IN_MODAL, ANIMATION_DURATION, FIRST_LOAD, KEY_ESCAPE, PAGES,
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  $ = jQuery;

  ANIMATION_DURATION = 150;

  KEY_ESCAPE = 27;

  FIRST_LOAD = true;

  PAGES = {
    workspace: {
      id: 'content-workspace',
      min_width: 500,
      width: 1000,
      max_width: 3000,
      display: 'block',
      path: '/'
    },
    login: {
      id: 'content-login',
      min_width: 500,
      width: 500,
      max_width: 500,
      display: 'flex',
      path: '/login'
    },
    help: {
      id: 'content-help',
      min_width: 1000,
      width: 1000,
      max_width: 1400,
      display: 'block',
      path: '/help'
    },
    about: {
      id: 'content-about',
      min_width: 600,
      max_width: 600,
      width: 600,
      display: 'block',
      path: '/about'
    },
    DEFAULT: 'workspace'
  };

  ALLOWED_IN_MODAL = ['help', 'about', 'login'];

  $.extend(REPLIT, {
    PAGES: PAGES,
    modal: false,
    Modal: function(_at_modal) {
      this.modal = _at_modal;
    },
    page_stack: [],
    changing_page: false,
    OpenPage: function(page_name, callback) {
      var current_page, done, index, lang_name, new_title, outerWidth, page;
      if (callback == null) {
        callback = $.noop;
      }
      if (this.modal && __indexOf.call(ALLOWED_IN_MODAL, page_name) < 0) {
        return;
      }
      page = PAGES[page_name];
      current_page = this.page_stack[this.page_stack.length - 1];
/*      if (current_page === "login") {
        return;
      }*/

      if (!page || current_page === page_name) {
        return this.changing_page = false;
      } else if (this.changing_page) {
        $('.page').stop(true, true);
        this.$container.stop(true, true);
        this.changing_page = false;
        return this.OpenPage(page_name);
      } else {
        this.changing_page = true;
        if (page_name !== 'workspace') {
          new_title = page.$elem.find('.content-title').hide().text();
          REPLIT.changeTitle(new_title);
        } else {
          $('#panel-container').show();
          $('#jsPanel-min-container').show();
          REPLIT.changeTitle("Lua/Torch7 Repl");
        }
        this.min_content_width = page.min_width;
        this.max_content_width = page.max_width;
        if (FIRST_LOAD && page_name === 'workspace') {
          FIRST_LOAD = false;
          page.width = document.documentElement.clientWidth - this.DEFAULT_CONTENT_PADDING;
        }
        this.content_padding = document.documentElement.clientWidth - page.width;
        index = this.page_stack.indexOf(page_name);
        if (index > -1) {
          this.page_stack.splice(index, 1);
        }
        this.page_stack.push(page_name);
        outerWidth = page.width;
        if (page_name !== 'workspace') {
          outerWidth += 2 * this.RESIZER_WIDTH;
        }
        done = (function(_this) {
          return function() {
            _this.changing_page = false;
            /*page.$elem.css({
                  display: page.display,
            });*/
            page.$elem.focus();
            return callback();
          };
        })(this);
        if (current_page) {
          PAGES[current_page].width = $('.page:visible').width();
          if (current_page === 'workspace') {
            PAGES[current_page].width += 2 * this.RESIZER_WIDTH;
            $('#panel-container').hide();
            $('#jsPanel-min-container').hide();
          }
          return PAGES[current_page].$elem.fadeOut(ANIMATION_DURATION, (function(_this) {
            return function() {

              return _this.$container.animate({
                width: outerWidth
              }, ANIMATION_DURATION, function() {
                page.$elem.css({
                  width: page.width,
                  display: page.display,
                  opacity: 0
                });
                _this.OnResize();
                return page.$elem.animate({
                  opacity: 1
                }, ANIMATION_DURATION, done);
              });
            };
          })(this));
        } else {
          this.$container.css({
            width: outerWidth
          });
          page.$elem.css({
            width: page.width,
            display: page.display
          });
          this.OnResize();
          return done();
        }
      }
    },
    showLoginPage: function(ctx, next) {

      var page = PAGES['login'];
      var css = {};
      css["justify-content"]='center';
      css["align-items"]='center';
      css["flex-direction"]='column';
      page.$elem.css(css);
      return next();
    },
    CloseLastPage: function() {
      var closed_page;
      if (this.changing_page) {
        return;
      }
      if (this.page_stack.length <= 1) {
        return Router.navigate('/');
      } else {
        closed_page = this.page_stack[this.page_stack.length - 1];
        Router.navigate(PAGES[this.page_stack[this.page_stack.length - 2]].path);
        this.page_stack.splice(this.page_stack.indexOf(closed_page), 1);
        return;
      }
    }
  });

  $(function() {
    var $body, name, settings;
    for (name in PAGES) {
      settings = PAGES[name];
      settings.$elem = $("#" + settings.id);
    }
    $body = $('body');
    $body.delegate('.page-close', 'click', function() {
      return REPLIT.CloseLastPage();
    });
    $(window).keydown(function(e) {
      var vsb = $('.page:visible')
      if (e.which === KEY_ESCAPE && vsb &&
            vsb[0].id !== 'content-workspace' && vsb[0].id !== 'content-login') {
        return REPLIT.CloseLastPage();
      }
    });

  });

}).call(this);
