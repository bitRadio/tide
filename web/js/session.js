(function() {

      
  $(function() {

    $("#login-form").submit(function(evt) {
      evt.preventDefault();
    })[0].onsubmit = function(evt) {
        alert("DOM submit handler called");
      };

    $("#login-button").click(function(evt) {
     var form = $("#login-form");
     if (form[0].checkValidity())
       form.submit();
    });

    var jqxhr = $.get( "session", function(data) {
      alert( "success", data);
    })
      .done(function(data) {
        page();
        return REPLIT.luarepl.sandbox.connect();
      })
      .fail(function(err) {
        return page("/login");
      })
      .always(function(data) {
        console.log( "finished", data );
      });
  });

}).call(this);