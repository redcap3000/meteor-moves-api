Package.describe({
  summary: "Simple yet powerful interfaces to the Moves App API."
});

Package.on_use(function(api){
  api.add_files("server.js","server");
});
