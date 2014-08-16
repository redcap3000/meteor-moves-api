Package.describe({
  summary: "Simple yet powerful interfaces to the Moves App API."
});

Package.on_use(function(api){
  api.use(["underscore","templating"],"client");
  api.add_files("server.js","server");
  //api.add_files("both.js",["server","client"]);
  api.add_files(["templates.html","client.js"],"client");
});