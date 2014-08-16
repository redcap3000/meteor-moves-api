// properly uses moment to format the timestamp...
gmapsMarkers = [],infoWindows = [],activityPaths = [];
Meteor.startup(function(){
  /*
    Assumes use of gmaps, intializes the arrays for info windows and activity paths that may be used globably by others
  */
  
  placeNavMarker = function(lat,lng,title,infoHTML,theId) {
    if(typeof lat != "undefined" && typeof lng != "undefined"){
        var location = new google.maps.LatLng(lat,lng);
        if(typeof title == 'undefined'){
          title = 'untitled';
        }
        // Setup google maps marker with image and shape
        var image = new google.maps.MarkerImage('http://labs.google.com/ridefinder/images/mm_20_orange.png', new google.maps.Size(12, 20),new google.maps.Point(0,0), new google.maps.Point(6, 20)),
        shadow = new google.maps.MarkerImage('http://labs.google.com/ridefinder/images/mm_20_shadow.png', new google.maps.Size(22, 20), new google.maps.Point(0,0),new google.maps.Point(6, 20)),
        shape = {coord: [4,0,0,4,0,7,3,11,4,19,7,19,8,11,11,7,11,4,7,0], type: 'poly'};
        // create marker with global 'map'
        var new_marker = new google.maps.Marker({ _id: theId, position: location, map: map, shadow: shadow, shape:shape, icon:image, 'title': title, flat:true });
        if(typeof infoHTML != "undefined" && infoHTML){
        // create optional infowindow  
          var infoWindow = new google.maps.InfoWindow({
            content: infoHTML
          });
          infoWindow._id = theId;
          // add info window to global 'infoWindows'
          infoWindows.push(infoWindow);
          // google maps click event
          google.maps.event.addListener(new_marker, 'click', function() {
            closeInfoWindows();
            infoWindow.open(map,new_marker);
          });
        }
        // add created marker to global gmapsMarkers
        gmapsMarkers.push(new_marker);
    }else{
        return false;
    }
  };
});
Template.moves_map_editor.events = {
    "click .updateLegend":function(evt,tmpl){
      // update with user defined colors!
        var the_user_settings = user_settings.findOne();
        user_settings.update(the_user_settings._id,
         {"$set" :{ colors:     [{color: tmpl.find("#cyclingColor").value,key:"cycling"},
                                {color:tmpl.find("#walkingColor").value,key:"walking"},
                                {color:tmpl.find("#transportColor").value,key:"transport"}]
                  }});
        // if this is true then refresh page, try meteor reconnect?
        window.location.replace((!_.isUndefined( window.location.pathName ) ? window.location.pathName : ""));
    }
};

Template.moves_segments.destroyed = function(){
    var the_id = this.data._id;
    // so you must subtract the totals ...
 
    if(!_.isUndefined( activityPaths ) ){
        var newPaths = [],newMarkers = [],newInfoWindows = [];
        gmapsMarkers.filter(function(arr){
            if(!_.isUndefined(arr._id) && arr._id == the_id)
                arr.setMap(null);
            else
                newMarkers.push(arr);
        });
        activityPaths.filter(function(arr){
            if(!_.isUndefined(arr._id) && arr._id == the_id)
                arr.setMap(null);
            else
                newPaths.push(arr);
        });
        
        infoWindows.filter(function(arr){
            if(!_.isUndefined(arr._id) && arr._id == the_id)
                arr.setMap(null);
            else
                newInfoWindows.push(arr);
        });
        activityPaths = newPaths,
        gmapsMarkers = newMarkers,
        infoWindows = newInfoWindows;
    }
};

Template.moves.getStorylines = function(){
  return user_activities.find();
};

Template.moves_segments.rendered = function(evt,tmpl){
  //console.log('rendering!');
  if(typeof this.data != "undefined"){
  var activity = this.data;
  if(!_.isUndefined(activity.place_name ) && typeof map != "undefined"){
    var the_place = (!_.isUndefined( activity.place_name ) ? activity.place_name : 'Untitled');
    var summary_data = "<table style='min-width:5em;'><tr><th colspan='2'>" + (activity.place_name != null && activity.place_name ? activity.place_name : "Untitled") + "<br/>"+ activity.date + "</th></tr>";
    if(typeof activity.summary != "undefined" && activity.summary.length > 0){
     var humanSecond = function(sec){return moment.duration(sec,"seconds").humanize();};
     activity.summary.filter(
       function(obj){
        summary_data += "<tr><td>" + obj.activity + "&nbsp;" + (typeof obj.steps != "undefined" && obj.steps > 0 ? obj.steps +"&nbsp;steps" : "") + " in "+ humanSecond(obj.duration) +".&nbsp;"+Math.round((obj.distance * 0.000621371192)*100)/100+"mi. " +( typeof obj.calories != "undefined" ? obj.calories +"&nbsp;calories." : "")+ "&nbsp;"  + "</td></tr>";
      });
    }
    if(typeof activity.place_loc != "undefined" && typeof activity.place_loc[0] != "undefined" && typeof activity.place_loc[1] != "undefined"){
      placeNavMarker(activity.place_loc[0],activity.place_loc[1],activity.place_name,summary_data + "</table>",activity._id);
    }
  }
  // trackPoints : [   { lat,lon,time}  ]
  activityCoordinates = [];
  var distance = activity.distance;
  distance *= 0.000621371192;
  distance = Math.round(distance*100)/100;
  var lineColor = activity.activity;
  //var the_user_settings = user_settings.findOne();
    // REFACTOR!!
  if(typeof the_user_settings != "undefined" && the_user_settings && typeof the_user_settings != "undefined" && lineColor){
    var colors = the_user_settings.colors;
    if(colors ){
      if(typeof colors[1] != "undefined" && typeof colors[0] != "undefined" && typeof colors[2] != "undefined"){
        lineColor = (lineColor == "walking" ? colors[1].color : ( lineColor == "cycling" ? colors[0].color : ( lineColor == "transport" ? colors[2].color : "#FF0000" ) ) );
      }else{
        lineColor = (lineColor == "walking" ? "red" : ( lineColor == "cycling" ? "blue" : ( lineColor == "transport" ? "green" : "#FF0000" ) ) );
      }
    }else{
      lineColor = (lineColor == "walking" ? "red" : ( lineColor == "cycling" ? "blue" : ( lineColor == "transport" ? "green" : "#FF0000" ) ) );
    }
  }else{
      lineColor = (lineColor == "walking" ? "red" : ( lineColor == "cycling" ? "blue" : ( lineColor == "transport" ? "green" : "#FF0000" ) ) );
  }
  var pointCount = activity.trackPoints.length - 1;
  var halfWay = parseInt(pointCount/2);

  activity.trackPoints.filter(function(point,i){
      activityCoordinates.push(new google.maps.LatLng(point[0],point[1]) );
  });

  var lineOpacity = (activity.activity == 'cycling' ? .35 : (activity.activity == "walking" ? .5: .6  ));
  var lineWeight = (activity.activity != 'transport'? ((activity.calories / distance) / (distance/pointCount))   : (distance/activity.calories));
  /*
      GMAPS POLYLINE DEFINITION
  */
  var activityPath = new google.maps.Polyline({
      path: activityCoordinates, geodesic: true,
      strokeColor: lineColor,strokeOpacity:  lineOpacity,strokeWeights:   lineWeight
    });
    // for destroying in the array?
   var the_id = activity._id
  activityPath._id = the_id;
  activityPath.setMap(map);
    /*
  google.maps.event.addListener(activityPath, "click", function() {
      // hide all lines except the one clicked when clicked?
      if(!_.isUndefined( activityPaths )){
          activityPaths.filter(function(arr){
              if(arr._id !== the_id)
                  return arr.setVisible(false);
              else{
                  // open info window set up another listner to fire when mouse exits path ? or double clicks ?
                  google.maps.event.addListener(arr,"click",function(){ arr.setVisible(false); toggleActivityPaths(); } );
              }
          });
      }
      // hide all other markers not realted ?
      toggleMarkers(the_id);
  });*/
  activityPaths.push(activityPath);
    return true;
  }else{
    console.log('no data');
  }
  return false;
};