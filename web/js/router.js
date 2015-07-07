(function() {
  var loc, replace_base;

  $(function() {
    var first_load;
    page('/', function(ctx, next) {
      if (!ctx.init)
        return REPLIT.OpenPage('workspace');
    });
    page('/about', function() {
      return REPLIT.OpenPage('about');
    });
    page('/help', function() {
      return REPLIT.OpenPage('help');
    });
    page('/login', REPLIT.showLoginPage, function(ctx, next) {
      return REPLIT.OpenPage('login');
    });

    first_load = true;
    page('/:name/:num?/:page_name?', function(context) {
      var base, name, num, page_name, _ref;
      if (!first_load) {
        return window.location.reload();
      } else {
        _ref = context.params, name = _ref.name, num = _ref.num, page_name = _ref.page_name;
        if (num && !num.match(/\d+/)) {
          page_name = num;
          num = null;
        }
        first_load = false;
        base = "/" + name;
        if (num) {
          base += "/" + num;
        }
        Router.change_base(base, false);
        if (page_name) {
          return page("/" + page_name);
        } else {
          return REPLIT.OpenPage('workspace');
        }
      }
    });
    REPLIT.luarepl.sandbox.connect();
    return page();
  });

  loc = window.location;

  replace_base = function(href, old_base, new_base) {
    href = href.replace(old_base, '');
    if (href[0] === '/') {
      href = href.substr(1);
    }
    href = new_base + "/" + href;
    return '/' + href.split('/').filter(function(p) {
      return !!p;
    }).join('/');
  };

  window.Router = {
    base: '/',
    navigate: function(path, context) {
      if (loc.pathname !== path) {
        return page(path);
      }
    },
    change_base: function(path, navigate) {
      var old_base;
      if (navigate == null) {
        navigate = true;
      }
      if (path === this.base) {
        return;
      }
      old_base = this.base;
      this.base = path;
      $('a').each(function() {
        var href;
        href = $(this).attr('href');
        if (href[0] === '/') {
          return $(this).attr('href', replace_base(href, old_base, path));
        }
      });
      page.base(this.base);
      if (navigate) {
        return page(this.base);
      }
    }
  };

}).call(this);
